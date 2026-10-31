'use strict';
/* Style "DNA" of each piece: how sporty, street, western, preppy, tailored, rugged or resort it reads,
   from its category, name, brand and materials (or chosen by hand in the piece's window, saved as it.vibes).
   The stylist uses it so pieces that don't belong together (a western belt on a track suit) never meet. */

const VIBES=['sport','street','western','prep','tailored','rugged','resort'];
const VIBE_CAT={trackjk:{sport:1},trackpants:{sport:1},hoodies:{street:.7,sport:.4},tshirts:{street:.5,sport:.2},sneakers:{street:.6,sport:.4},
 blazers:{tailored:1,prep:.5},tailored:{tailored:1,prep:.4},coats:{tailored:.8,prep:.4},ties:{tailored:1,prep:.7},formal:{tailored:1},loafers:{prep:.8,tailored:.6},
 boots:{rugged:.6,tailored:.4,western:.3},knitwear:{prep:.8},shirts:{prep:.5,tailored:.4},jeans:{street:.5,rugged:.4,western:.2},casualpants:{rugged:.6,prep:.2},
 pants:{rugged:.4,street:.3},leatherjk:{rugged:.8,street:.3},denimjk:{rugged:.7,western:.3},bombers:{street:.6,prep:.3},puffers:{street:.8},vests:{prep:.5,rugged:.3},
 shorts:{resort:.6,sport:.3},sandals:{resort:1},hats:{street:.4},belts:{tailored:.4,prep:.4,rugged:.4},scarves:{prep:.4}};
const VIBE_KW={
 sport:[/track|jersey|football|racing|3-stripes|mesh|runner|curry|warriors|milan|duffle|champion|adidas|nike|puma/,1],
 street:[/stwd|baggy|cargo|graphic|vans|old skool|chuck|converse|puffer|m&m|corvette|chevrolet|9060/,.7],
 western:[/western|cowboy|bandana|bolo|thunderbird|horse|bronco|bootcut|cow print|cord collar|embroidered|turquoise|croc/,1.2],
 prep:[/cricket|cable|crest|rltc|oxford|polo ralph|varsity|fair isle|v-neck|sporty & rich|gant|quarter-zip|penny|moccasin|cardigan|striped tie|foulard|camel|signet/,.8],
 tailored:[/tailored|pleated|trouser|double-breasted|blazer|dress shirt|overcoat|chelsea|pinstripe|silver watch/,.8],
 rugged:[/suede|leather|corduroy|carpenter|shearling|aviator|denim|trucker|utility|parka|plaid|check/,.5],
 resort:[/camp|linen|short-sleeve|printed|flowy|crochet|hawai|resort/,.8]};
// how well two vibes sit together: 1 = same family, negative = they fight
const VK={sport:{street:.7,western:-1,prep:-.1,tailored:-.9,rugged:-.5,resort:.1},street:{western:-.35,prep:-.2,tailored:-.5,rugged:.4,resort:.2},
 western:{prep:-.3,tailored:-.2,rugged:.8,resort:.4},prep:{tailored:.7,rugged:.2,resort:.3},tailored:{rugged:.1,resort:-.2},rugged:{resort:.1}};
const vk=(a,b)=>a===b?1:VK[a]?.[b]??VK[b]?.[a]??0;

const _vibeCache=new Map();
function vibeOf(it){if(it.vibes?.length)return Object.fromEntries(it.vibes.map(v=>[v,1]));
 const key=it.id+'|'+it.category+'|'+txtOf(it);if(_vibeCache.has(key))return _vibeCache.get(key);
 // materials only speak for jackets and trousers (suede sneakers aren't "rugged")
 const sl=slotOf(it),v={...(VIBE_CAT[it.category]||VIBE_CAT[parentOf(it.category)]||{})},s=sl==='outer'||sl==='bottom'?txtOf(it):`${it.name||''} ${it.brand||''}`.toLowerCase();
 for(const [k,[re,w]] of Object.entries(VIBE_KW))if(re.test(s))v[k]=(v[k]||0)+w;
 const mx=Math.max(0,...Object.values(v));if(mx)for(const k in v){v[k]/=mx;if(v[k]<.2)delete v[k]}
 _vibeCache.set(key,v);return v}
const mainVibes=it=>Object.entries(vibeOf(it)).sort((a,b)=>b[1]-a[1]).filter(([,w])=>w>=.5).map(([k])=>k);
// -1..1: how well two pieces go together by style (pieces with no strong style, like a watch, count as easy)
function vibePair(a,b){const A=vibeOf(a),B=vibeOf(b);let s=0,n=0;
 for(const [x,wa] of Object.entries(A))for(const [y,wb] of Object.entries(B)){s+=wa*wb*vk(x,y);n+=wa*wb}
 return Math.min(1,(n?s/n:.3)+(sameSet(a,b)?.4:0))}
// two halves of a set (same brand and the same distinctive word, e.g. "monogram" track jacket + track pants)
const SET_SKIP=new Set(['jacket','pants','trousers','shirt','green','black','white','cream','brown','navy','light','dark','washed']);
function sameSet(a,b){if(!a.brand||a.brand!==b.brand||a.category===b.category)return false;
 const w=s=>new Set(String(s.name||'').toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>4&&!SET_SKIP.has(x)));const A=w(a);return [...w(b)].some(x=>A.has(x))}
function vibeWith(it,others){const o=others.filter(x=>x&&x!==it);if(!o.length)return 0;const ps=o.map(x=>vibePair(it,x));return Math.min(...ps)*.5+ps.reduce((a,b)=>a+b,0)/ps.length*.5}
function vibeSet(items){let min=1,sum=0,n=0,worst=null;
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const p=vibePair(items[i],items[j]);sum+=p;n++;if(p<min){min=p;worst=[items[i],items[j]]}}
 const tot={};items.forEach(it=>Object.entries(vibeOf(it)).forEach(([k,w])=>tot[k]=(tot[k]||0)+w));
 const lead=Object.entries(tot).sort((a,b)=>b[1]-a[1])[0]?.[0]||'';
 return {mean:n?sum/n:1,min:n?min:1,worst,lead}}

/* the piece's window: show its style and let it be corrected by hand */
HOOKS.itemExtrasHTML.push(it=>{const cur=new Set(it.vibes?.length?it.vibes:mainVibes(it));
 return `<div class="vibe-ed"><span class="muted sm">${t(it.vibes?.length?'vibeManual':'vibeAuto')}</span><div class="chips" id="vibeChips">${VIBES.map(v=>`<button class="chip ${cur.has(v)?'on':''}" data-v="${v}">${t('vb_'+v)}</button>`).join('')}</div></div>`});
HOOKS.itemExtrasWire.push((md,it)=>{const box=$('#vibeChips',md);if(!box)return;
 box.onclick=async e=>{const b=e.target.closest('[data-v]');if(!b)return;b.classList.toggle('on');
  it.vibes=[...box.querySelectorAll('.chip.on')].map(x=>x.dataset.v);if(!it.vibes.length)delete it.vibes;
  box.previousElementSibling.textContent=t(it.vibes?'vibeManual':'vibeAuto');await DB.put('items',it)}});

Object.assign(S.en,{vb_sport:'Sporty',vb_street:'Street',vb_western:'Western',vb_prep:'Preppy',vb_tailored:'Tailored',vb_rugged:'Rugged',vb_resort:'Resort',
 vibeAuto:'Style (detected — tap to correct)',vibeManual:'Style (set by you)',rVibe:'Consistent {v} look',rVibeMix:'{a} and {b} are different styles'});
Object.assign(S.ar,{vb_sport:'سبورت',vb_street:'ستريت',vb_western:'ويسترن',vb_prep:'بريبي',vb_tailored:'رسمي متفصّل',vb_rugged:'رجيد / خشن',vb_resort:'صيفي ريزورت',
 vibeAuto:'ستايل القطعة (متحدد تلقائي — دوس عشان تصححه)',vibeManual:'ستايل القطعة (إنت اللي محدده)',rVibe:'لوك {v} متناسق',rVibeMix:'{a} و{b} ستايلين مختلفين'});
document.head.insertAdjacentHTML('beforeend',`<style>.vibe-ed{margin-top:12px;display:flex;flex-direction:column;gap:6px}.vibe-ed .chips{padding:0}</style>`);
