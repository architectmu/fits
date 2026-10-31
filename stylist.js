'use strict';
/* Local stylist: builds outfits only from pieces in this closet, using rules (formality, weather, season,
   colour harmony, freshness, learned likes/rejections). No network needed. A future AI provider can replace
   or refine generate() — the UI only depends on its result shape: [{items, score, harmony, reasons}]. */

NAV.splice(NAV.indexOf('outfits')+1,0,'stylist');
st.sty={occ:'casual',weather:'mild',style:'',anchor:null,date:null,results:null,error:null};
const PREFS=()=>st.settings.prefs||(st.settings.prefs={item:{},rejected:[]});
const CORE=['outer','top','bottom','shoes'];
const sig=items=>items.filter(i=>CORE.includes(slotOf(i))||slotOf(i)==='dress').map(i=>i.id).sort().join('|');

function learnedScores(){const s={...PREFS().item};
 for(const b of st.boards){if(b.type!=='outfit')continue;const d=(b.rating>=4?.12:b.rating&&b.rating<=2?-.12:0)+(b.fav?.05:0);if(!d)continue;
  for(const it of outfitItems(b))s[it.id]=(s[it.id]||0)+d}
 return s}
function plannedNear(date){const ids=new Set();if(!date)return ids;const d0=new Date(date+'T12:00');
 for(let k=-3;k<=3;k++){if(!k)continue;const key=ymd(new Date(d0.getFullYear(),d0.getMonth(),d0.getDate()+k)),p=st.plans[key];
  const b=p&&typeof p==='object'?st.boards.find(x=>x.id===p.outfit):typeof p==='string'?st.boards.find(x=>x.id===p):null;
  if(b)outfitItems(b).forEach(i=>ids.add(i.id))}
 return ids}

function eligible(it,ctx){const s=slotOf(it),W=ctx.weather,nm=txtOf(it),cold=W==='cold'||W==='freezing';
 if(s==='outer'){if(W==='hot'&&!(it.category==='blazers'&&ctx.target>=3.8))return false;
  if(W==='warm'&&!(it.category==='blazers'||/denim|overshirt|suede|linen/.test(nm)))return false;
  if(it.category==='coats'&&!cold)return false;if(/puffer|shearling|parka/.test(nm)&&!cold)return false}
 if(it.category==='shorts'&&!(W==='hot'||W==='warm'))return false;
 if((it.category==='knitwear'||it.category==='hoodies')&&W==='hot')return false;
 if(it.category==='sandals'&&!(W==='hot'||W==='warm'))return false;
 if(it.category==='boots'&&W==='hot')return false;
 if(s==='scarf'&&!cold&&!/silk|bandana/.test(nm))return false;
 if(it.seasons?.length&&!it.seasons.some(x=>ctx.seasons.includes(x)))return false;
 if(['outer','top','bottom','shoes','dress'].includes(s)&&Math.abs(formalityOf(it)-ctx.target)>1.8)return false;
 return true}
function itemScore(it,ctx){const worn=ctx.worn[it.id];let s=1-Math.abs(formalityOf(it)-ctx.target)/2.5;
 if(ctx.style)s+=.5*styleAffinity(it,ctx.style);
 s+=(ctx.learned[it.id]||0)+(it.fav?.08:0);
 if(worn){const d=daysSince(worn.last);if(d<=2)s-=.6;else if(d<=6)s-=.3;else if(d<=13)s-=.1}
 if(ctx.near.has(it.id))s-=.3;
 return s}
const wpick=(arr,temp=3)=>{if(!arr.length)return null;const w=arr.map(a=>Math.exp(a.s*temp)),tot=w.reduce((a,b)=>a+b,0);let r=Math.random()*tot;
 for(let i=0;i<arr.length;i++){r-=w[i];if(r<=0)return arr[i].it}return arr[arr.length-1].it};

function buildContext(){const o=st.sty,W=WEATHER.find(w=>w[0]===o.weather)||WEATHER[2];
 const ctx={occ:o.occ,target:occTarget(o.occ),weather:o.weather,seasons:W[2],style:o.style,worn:wornMap(),learned:learnedScores(),near:plannedNear(o.date||ymd(new Date())),
  anchor:o.anchor?itemById(o.anchor):null,rejected:new Set(PREFS().rejected)};
 ctx.pool={};for(const it of st.items){const s=slotOf(it);if(it.id!==ctx.anchor?.id&&!eligible(it,ctx))continue;
  (ctx.pool[s]=ctx.pool[s]||[]).push({it,s:itemScore(it,ctx)})}
 Object.values(ctx.pool).forEach(a=>a.sort((x,y)=>y.s-x.s));return ctx}

// a belt needs belt loops: no track pants, joggers, shorts or dresses
const beltable=b=>b&&!['trackpants','shorts'].includes(b.category)&&!/track|jogger|elastic|drawstring|sweat/.test(txtOf(b));
function pickAccessories(core,ctx){const acc=[],cols=core.map(i=>(i.colors||[])[0]).filter(Boolean),
 // accessories must suit the outfit's style; a "loud" one (cowboy hat, western belt) needs a clearly matching outfit
 best=slot=>{const c=(ctx.pool[slot]||[]).filter(x=>x.it.id!==ctx.anchor?.id);if(!c.length)return null;
  return c.map(x=>{const xc=(x.it.colors||[])[0],h=xc&&cols.length?cols.reduce((s,c2)=>s+pairScore(xc,c2).s,0)/cols.length:.6,v=vibeWith(x.it,core),
   loud=Object.keys(vibeOf(x.it)).some(k=>['western','sport','resort'].includes(k));return {it:x.it,s:x.s*.5+h+1.4*v,v,loud}})
   .filter(x=>x.v>=(x.loud?.35:-.05)).sort((a,b)=>b.s-a.s).slice(0,3)};
 const W=ctx.weather,bottom=core.find(i=>slotOf(i)==='bottom'),top=core.find(i=>slotOf(i)==='top'),shoes=core.find(i=>slotOf(i)==='shoes'),outer=core.find(i=>slotOf(i)==='outer');
 const add=(slot,cond,p=1)=>{if(!cond||Math.random()>p)return;const c=best(slot);if(c?.length)acc.push(wpick(c,4))};
 if(beltable(bottom)&&ctx.target>=2.2){const belts=best('belt');if(belts?.length){const sc=(shoes?.colors||[])[0];
  const match=belts.find(b=>(b.it.colors||[]).some(c=>c===sc||(['brown','beige'].includes(c)&&['brown','beige'].includes(sc))))||belts[0];acc.push(match.it)}}
 add('tie',ctx.target>=3.4&&top?.category==='shirts'&&(outer?.category==='blazers'||['tailored'].includes(bottom?.category)));
 add('watch',true,.85);
 add('glasses',(W==='hot'||W==='warm')&&ctx.target<3.6,.5);
 add('hat',ctx.style==='vintage'||((W==='cold'||W==='freezing')&&ctx.target<3),.45);
 add('scarf',W==='cold'||W==='freezing',.5);
 add('jewelry',ctx.target<4.4,.3);
 add('bag',ctx.occ==='travel'||ctx.occ==='business',.5);
 if(ctx.anchor&&!CORE.includes(slotOf(ctx.anchor))&&slotOf(ctx.anchor)!=='dress'&&!acc.includes(ctx.anchor)){const i=acc.findIndex(a=>slotOf(a)===slotOf(ctx.anchor));if(i>=0)acc.splice(i,1);acc.push(ctx.anchor)}
 return acc}

function scoreOutfit(items,ctx){const core=items.filter(i=>CORE.includes(slotOf(i))||slotOf(i)==='dress');
 const h=harmony(items),fs=core.map(formalityOf),mean=fs.reduce((a,b)=>a+b,0)/fs.length,sd=Math.sqrt(fs.reduce((a,b)=>a+(b-mean)**2,0)/fs.length);
 const base=core.reduce((s,i)=>s+itemScore(i,ctx),0)/core.length,coherence=Math.max(0,1-sd/1.5)*Math.max(0,1-Math.abs(mean-ctx.target)/2);
 const vb=vibeSet(items),vibeFit=Math.max(0,Math.min(1,(vb.mean+.2)/1.1));
 let total=.32*Math.max(0,Math.min(1,base))+.3*h.score/100+.13*coherence+.25*vibeFit;
 if(vb.min<-.45)total-=.45;else if(vb.min<-.15)total-=.12; // two pieces that fight (track suit + western belt) sink the outfit
 if(ctx.rejected.has(sig(items)))total-=1;
 return {score:Math.round(Math.max(0,Math.min(1,total))*100),harmony:h,coherence,mean,vibe:vb}}
function explain(items,res,ctx){const r=[],outer=items.find(i=>slotOf(i)==='outer');
 if(ctx.anchor)r.push({k:'rAnchor',v:{n:ctx.anchor.name||catName(ctx.anchor.category)},good:1});
 if(res.coherence>.6)r.push({k:'rFormal',v:{o:t('occ_'+ctx.occ)},good:1});else if(Math.abs(res.mean-ctx.target)>1)r.push({k:'rOffFormal',v:{o:t('occ_'+ctx.occ)},bad:1});
 if(outer&&(ctx.weather==='cold'||ctx.weather==='freezing'))r.push({k:'rLayer',v:{n:outer.name||catName(outer.category)},good:1});
 else if(!outer&&(ctx.weather==='hot'||ctx.weather==='warm'))r.push({k:'rLight',good:1});
 const vb=res.vibe||vibeSet(items);
 if(vb.min<-.15&&vb.worst)r.push({k:'rVibeMix',v:{a:vb.worst[0].name||catName(vb.worst[0].category),b:vb.worst[1].name||catName(vb.worst[1].category)},bad:1});
 else if(vb.lead&&vb.mean>.45)r.push({k:'rVibe',v:{v:t('vb_'+vb.lead)},good:1});
 r.push(...res.harmony.reasons.slice(0,2));
 if(ctx.style){const a=items.reduce((s,i)=>s+styleAffinity(i,ctx.style),0)/items.length;if(a>.45)r.push({k:'rStyle',v:{s:t('st_'+ctx.style)},good:1})}
 const recent=items.filter(i=>ctx.worn[i.id]&&daysSince(ctx.worn[i.id].last)<=6);
 if(recent.length)r.push({k:'rRecent',v:{n:recent.map(i=>i.name||catName(i.category)).join('، ')},bad:1});
 else if(Object.keys(ctx.worn).length)r.push({k:'rFresh',good:1});
 return r.slice(0,6)}

function generate(n=6){const ctx=buildContext(),P=ctx.pool,A=ctx.anchor,aSlot=A&&slotOf(A);
 const missing=['top','bottom','shoes'].filter(s=>!(P[s]?.length)&&!(s!=='shoes'&&P.dress?.length));
 if(missing.length&&!(aSlot==='dress'&&!missing.includes('shoes')))return {error:'missing',slots:missing,ctx};
 const needOuter={hot:ctx.target>=3.8?.35:0,warm:.25,mild:.65,cold:1,freezing:1}[ctx.weather];
 const seen=new Map();
 // each round leans toward one style "theme" so the suggestions cover the closet's different looks, not just the biggest group
 const themes=VIBES.filter(v=>['top','shoes'].every(s=>(P[s]||[]).some(x=>(vibeOf(x.it)[v]||0)>=.5)));
 for(let k=0;k<700;k++){const core=[],theme=A?null:themes[k%Math.max(1,themes.length)];
  // each piece is chosen knowing the ones already picked, so the outfit keeps one style (anchor first, then a random lead piece)
  const pick=slot=>{if(A&&aSlot===slot)return A;const c=(P[slot]||[]).slice(0,16);if(!c.length)return null;
   const chosen=A?[A,A,...core]:core; // the anchor (even a hat or belt) sets the tone, so it counts twice
   const th=x=>theme?.9*(vibeOf(x.it)[theme]||0):0;
   return wpick(c.map(x=>({it:x.it,s:x.s+th(x)+(chosen.length?1.8*vibeWith(x.it,chosen):0)})))};
  const useDress=(P.dress?.length&&Math.random()<.3)||aSlot==='dress';
  const order=useDress?['dress','shoes']:(Math.random()<.5?['top','bottom','shoes']:['bottom','top','shoes']);
  if(aSlot&&order.includes(aSlot)){order.splice(order.indexOf(aSlot),1);order.unshift(aSlot)}
  let ok=true;for(const s of order){const x=pick(s);if(!x){ok=false;break}core.push(x)}if(!ok)continue;
  if(aSlot==='outer'||(P.outer?.length&&Math.random()<needOuter)){const o=pick('outer');if(o)core.push(o)}
  if(A&&!core.includes(A)&&CORE.includes(aSlot))continue;
  const items=[...core,...pickAccessories(core,ctx)],key=sig(items);
  const res=scoreOutfit(items,ctx);if(!seen.has(key)||seen.get(key).score<res.score)seen.set(key,{items,...res})}
 const ranked=[...seen.values()].sort((a,b)=>b.score-a.score),out=[],shoeUse={};
 const clean=ranked.filter(r=>r.vibe.min>=-.45).length>=n;
 const leadUse={},maxLead=themes.length>=3?2:3;
 for(const r of ranked){if(out.length>=n)break;if(clean&&r.vibe.min<-.45)continue;if(!A&&(leadUse[r.vibe.lead]||0)>=maxLead)continue;const tp=r.items.find(i=>slotOf(i)==='top'),bt=r.items.find(i=>slotOf(i)==='bottom'),sh=r.items.find(i=>slotOf(i)==='shoes');
  if(out.some(o=>o.items.includes(tp)&&o.items.includes(bt)))continue;if(sh&&(shoeUse[sh.id]||0)>=2)continue;if(bt&&(shoeUse['b'+bt.id]||0)>=2)continue;if(bt)shoeUse['b'+bt.id]=(shoeUse['b'+bt.id]||0)+1;shoeUse[sh?.id]=(shoeUse[sh?.id]||0)+1;leadUse[r.vibe.lead]=(leadUse[r.vibe.lead]||0)+1;out.push(r)}
 for(const r of ranked){if(out.length>=n)break;if(!out.includes(r)&&!(clean&&r.vibe.min<-.45)&&!out.some(o=>sig(o.items)===sig(r.items)))out.push(r)}
 out.forEach(o=>o.reasons=explain(o.items,o,ctx));
 return {results:out,ctx}}

/* swap one piece of a generated outfit for the next good option in that slot */
function swapPiece(res,itemId){const ctx=buildContext(),old=itemById(itemId),slot=slotOf(old),pool=(ctx.pool[slot]||[]).map(x=>x.it).filter(x=>!res.items.includes(x));
 if(!pool.length)return false;const others=res.items.filter(i=>i!==old),cols=others.map(i=>(i.colors||[])[0]).filter(Boolean);
 const ranked=pool.map(it=>{const c=(it.colors||[])[0];return {it,s:itemScore(it,ctx)+1.5*vibeWith(it,others)+(c&&cols.length?cols.reduce((s,x)=>s+pairScore(c,x).s,0)/cols.length:.5)}}).sort((a,b)=>b.s-a.s);
 res.cursor=((res.cursor||0)+1)%Math.min(ranked.length,6);const neu=ranked[res.cursor].it;
 res.items=res.items.map(i=>i===old?neu:i);Object.assign(res,scoreOutfit(res.items,ctx));res.reasons=explain(res.items,res,ctx);res.saved=null;return true}

/* ---- UI ---- */
function flatLay(items){const by=s=>items.filter(i=>slotOf(i)===s);const main=[...by('outer'),...by('top'),...by('dress'),...by('bottom')],side=[...by('shoes'),...items.filter(i=>!['outer','top','dress','bottom','shoes'].includes(slotOf(i)))];
 const img=i=>`<button class="fl-i" data-swap="${i.id}" title="${esc((i.name||catName(i.category))+' — '+t('clickSwap'))}"><img src="${i.img}" alt=""></button>`;
 return `<div class="fl"><div class="fl-main">${main.map(img).join('')}</div><div class="fl-side">${side.map(img).join('')}</div></div>`}
function resultCard(r,i){const worn=r.view==='worn'&&r.wornHTML;
 return `<div class="sres" data-i="${i}"><div class="view-tg"><button data-view="flat" class="${worn?'':'on'}">${t('flatView')}</button><button data-view="worn" class="${worn?'on':''}">👔 ${t('wornView')}</button></div>
 ${worn?r.wornHTML:flatLay(r.items)}
 <div class="sr-body"><div class="ep-row"><b class="sr-score">${r.score}%</b><span class="muted sm">${hLabel(r.harmony.label)}</span><span class="sp"></span>${paletteHTML(r.harmony.palette)}</div>
 <div class="hbar"><i style="width:${r.score}%"></i></div>
 <ul class="reasons">${r.reasons.map(x=>`<li class="${x.good?'good':x.bad?'bad':''}">${esc(t(x.k,x.v))}</li>`).join('')}</ul>
 <p class="muted sm sr-items">${r.items.map(x=>esc(x.name||catName(x.category))).join(' · ')}</p>
 <div class="sr-acts">${r.saved?`<button class="btn sm" data-act="open">${t('openOutfit')}</button>`:`<button class="btn sm" data-act="save">♥ ${t('saveOutfit')}</button>`}
 <button class="btn ghost sm" data-act="plan">${ic('chevR',13,'rtl-flip')} ${st.sty.date?t('planOn',{d:dayLabel(st.sty.date)}):t('planIt')}</button>
 <span class="sp"></span><button class="btn ghost sm" data-act="reject" title="${t('notForMe')}">👎</button></div></div></div>`}

function renderStylist(){const o=st.sty,A=o.anchor&&itemById(o.anchor);if(o.anchor&&!A)o.anchor=null;
 const chips=(list,cur,attr,lbl)=>list.map(v=>`<button class="chip ${cur===v?'on':''}" data-${attr}="${v}">${lbl(v)}</button>`).join('');
 $('#view').innerHTML=`<div class="page"><div class="page-h"><div><h1>${t('stylist')}</h1><p class="muted">${t('stylistSub')}</p></div>
  ${o.date?`<div class="sty-date">${t('stylingFor',{d:esc(dayLabel(o.date))})} <button class="link" id="styNoDate">×</button></div>`:''}</div>
  <div class="sty-ctl">
   <div class="fg"><h4>${t('occasion')}</h4><div class="chips">${chips(OCCASIONS.map(x=>x[0]),o.occ,'occ',v=>t('occ_'+v))}</div></div>
   <div class="fg"><h4>${t('weather')}</h4><div class="chips">${WEATHER.map(w=>`<button class="chip ${o.weather===w[0]?'on':''}" data-w="${w[0]}">${t('w_'+w[0])} <small>${w[1]}</small></button>`).join('')}</div></div>
   <div class="fg"><h4>${t('style')}</h4><div class="chips"><button class="chip ${!o.style?'on':''}" data-sty="">${t('anyStyle')}</button>${chips(STYLES,o.style,'sty',v=>t('st_'+v))}</div></div>
   <div class="fg"><h4>${t('buildAround')}</h4>${A?`<div class="anchor"><img src="${A.img}" alt=""><span><b>${esc(A.name||catName(A.category))}</b><small>${esc(A.brand||catPath(A.category))}</small></span><button class="btn ghost sm" id="styAnchorX">×</button></div>`
    :`<button class="btn ghost sm" id="styAnchor">${ic('plus',14)} ${t('pickPiece')}</button>`}</div>
   <div class="sty-go"><button class="btn" id="styGo">✨ ${o.results?t('regenerate'):t('generate')}</button><span class="muted sm">${t('ownedOnly')}</span></div></div>
  <div id="styOut">${stylistOutHTML()}</div></div>`;
 const v=$('#view');
 v.querySelector('.sty-ctl').onclick=e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.occ!==undefined)o.occ=b.dataset.occ;else if(b.dataset.w)o.weather=b.dataset.w;else if(b.dataset.sty!==undefined)o.style=b.dataset.sty;
  else if(b.id==='styAnchor')return pickAnchor();else if(b.id==='styAnchorX')o.anchor=null;else if(b.id==='styGo')return runStylist();else return;
  o.results=null;renderStylist()};
 if($('#styNoDate'))$('#styNoDate').onclick=()=>{o.date=null;renderStylist()};
 $('#styOut').onclick=onResultClick}
function stylistOutHTML(){const o=st.sty;
 if(!st.items.length)return emptyState(t('emptyTitle'),t('emptySub'));
 if(o.error)return `<div class="empty"><h2>${t('cantBuild')}</h2><p>${t('missingSlots',{s:o.error.map(s=>t('slot_'+s)).join('، ')})}</p></div>`;
 if(!o.results)return `<div class="empty"><div class="big">✨</div><p>${t('pressGenerate')}</p></div>`;
 return `<div class="sres-grid">${o.results.map(resultCard).join('')}</div>`}
function runStylist(){const o=st.sty,g=generate();o.error=g.error?g.slots:null;o.results=g.results||null;renderStylist()}
async function onResultClick(e){const card=e.target.closest('.sres');if(!card)return;const r=st.sty.results[+card.dataset.i];
 const vw=e.target.closest('[data-view]')?.dataset.view;
 if(vw){r.view=vw;if(vw==='worn'&&!r.wornHTML)r.wornHTML=await dressPreviewHTML(r.items);card.outerHTML=resultCard(r,+card.dataset.i);return}
 const sw=e.target.closest('[data-swap]');
 if(sw){if(!swapPiece(r,sw.dataset.swap))toast(t('noSwap'));r.wornHTML=null;r.view='flat';card.outerHTML=resultCard(r,+card.dataset.i);return}
 const act=e.target.closest('[data-act]')?.dataset.act;if(!act)return;
 if(act==='save'){await saveResult(r);toast(t('outfitSaved'));card.outerHTML=resultCard(r,+card.dataset.i)}
 else if(act==='open'){st.view='outfits';openEditor(r.saved)}
 else if(act==='plan'){let d=st.sty.date;if(!d){d=await askDate();if(!d)return}
  if(!r.saved)await saveResult(r);const p=planAt(d,true);p.outfit=r.saved;await saveMeta();toast(t('plannedFor',{d:dayLabel(d)}));card.outerHTML=resultCard(r,+card.dataset.i)}
 else if(act==='reject'){const P=PREFS();P.rejected=[...new Set([...P.rejected,sig(r.items)])].slice(-300);
  r.items.forEach(i=>P.item[i.id]=Math.max(-.5,(P.item[i.id]||0)-.04));await saveMeta();
  st.sty.results.splice(+card.dataset.i,1);$('#styOut').innerHTML=stylistOutHTML();toast(t('rejectedT'))}}
async function saveResult(r){const o=st.sty,P=PREFS();
 const b=await newOutfitFromItems(r.items,{name:`${t('occ_'+o.occ)}${o.style?' · '+t('st_'+o.style):''} · ${new Intl.DateTimeFormat(calLoc(),{day:'numeric',month:'short'}).format(o.date?new Date(o.date+'T12:00'):new Date())}`,
  occasion:o.occ,style:o.style,seasons:(WEATHER.find(w=>w[0]===o.weather)||[])[2]||[],worn:r.view==='worn'});
 r.items.forEach(i=>P.item[i.id]=Math.min(.5,(P.item[i.id]||0)+.04));await saveMeta();r.saved=b.id;return b}
function askDate(){return new Promise(res=>{const tm=new Date();tm.setDate(tm.getDate()+1);
 const md=modal(`<h2>${t('planIt')}</h2><input type="date" class="txt-in" id="pdIn" style="width:100%" value="${ymd(tm)}"><div class="md-f"><button class="btn ghost" data-close>${t('cancel')}</button><button class="btn" id="pdOk">${t('ok')}</button></div>`);
 $('#modal-root').onclose=()=>res(null);$('#pdOk',md).onclick=()=>{const v=$('#pdIn',md).value;$('#modal-root').onclose=null;closeModal();res(v||null)}})}
function pickAnchor(){const md=modal(`<h2>${t('buildAround')}</h2><div class="search sm" style="max-width:none;margin-bottom:12px">${ic('search',15)}<input id="paQ" placeholder="${t('search')}"></div><div class="pick-grid" id="paGrid"></div>
  <div class="md-f"><button class="btn ghost" data-close>${t('close')}</button></div>`,{wide:true});
 const draw=()=>{const q=$('#paQ',md).value.trim().toLowerCase();$('#paGrid',md).innerHTML=st.items.filter(i=>!q||[i.name,i.brand,catName(i.category)].join(' ').toLowerCase().includes(q))
  .map(i=>`<button class="pick" data-id="${i.id}"><img src="${i.img}" alt="" style="object-fit:contain;padding:6px"><span>${esc(i.name||catName(i.category))}</span></button>`).join('')};
 draw();$('#paQ',md).oninput=draw;$('#paQ',md).focus();
 $('#paGrid',md).onclick=e=>{const p=e.target.closest('.pick');if(!p)return;st.sty.anchor=p.dataset.id;st.sty.results=null;closeModal();runStylist()}}
/* entry points from other screens */
window.stylistFor=({date=null,occ=null,anchor=null}={})=>{const o=st.sty;o.date=date;if(occ)o.occ=occ;o.anchor=anchor;o.results=null;st.view='stylist';render();runStylist()};
HOOKS.itemExtrasHTML.push(it=>`<button class="btn ghost sm" id="styThis" style="margin-top:10px">✨ ${t('styleThis')}</button>`);
HOOKS.itemExtrasWire.push((md,it)=>{$('#styThis',md).onclick=()=>{closeModal();stylistFor({anchor:it.id})}});
VIEWS.stylist=renderStylist;

Object.assign(S.en,{stylist:'Stylist',stylistSub:'Complete outfits from pieces you actually own',weather:'Weather',buildAround:'Build around a piece',pickPiece:'Choose a piece',
 generate:'Generate outfits',regenerate:'New suggestions',ownedOnly:'Uses only items in your closet.',pressGenerate:'Pick the occasion and weather, then generate.',
 cantBuild:'Not enough pieces for this',missingSlots:'Nothing suitable in: {s}. Try another weather or occasion, or add pieces.',slot_top:'tops',slot_bottom:'bottoms',slot_shoes:'shoes',
 clickSwap:'click to swap',saveOutfit:'Save',openOutfit:'Open outfit',planIt:'Plan for a day',planOn:'Plan for {d}',notForMe:'Not for me',outfitSaved:'Saved to Outfits',
 plannedFor:'Planned for {d}',rejectedT:'Got it — I’ll suggest less like that',noSwap:'No other suitable piece for that slot',stylingFor:'Styling for {d}',styleThis:'Style this piece',
 rAnchor:'Built around {n}',rFormal:'Formality fits {o}',rOffFormal:'A bit off for {o}',rLayer:'{n} adds warmth for the cold',rLight:'Light layers for warm weather',
 rStyle:'Leans {s}',rRecent:'Worn recently: {n}',rFresh:'Pieces you haven’t worn lately'});
Object.assign(S.ar,{stylist:'الستايليست',stylistSub:'أوتفيتات كاملة من القطع اللي عندك فعلًا',weather:'الجو',buildAround:'ابني حوالين قطعة',pickPiece:'اختار قطعة',
 generate:'اقترح أوتفيتات',regenerate:'اقتراحات جديدة',ownedOnly:'بيستخدم القطع اللي في دولابك بس.',pressGenerate:'اختار المناسبة والجو ودوس اقترح.',
 cantBuild:'القطع مش كفاية للاختيار ده',missingSlots:'مفيش حاجة مناسبة في: {s}. جرّب جو أو مناسبة تانية، أو ضيف قطع.',slot_top:'التوبات',slot_bottom:'البناطيل',slot_shoes:'الجزم',
 clickSwap:'اضغط للتبديل',saveOutfit:'احفظ',openOutfit:'افتح الأوتفيت',planIt:'خطط ليوم',planOn:'خطط ليوم {d}',notForMe:'مش عاجبني',outfitSaved:'اتحفظ في الأوتفيتات',
 plannedFor:'اتخطط ليوم {d}',rejectedT:'تمام — هقلل من الاقتراحات اللي زي دي',noSwap:'مفيش قطعة تانية مناسبة للمكان ده',stylingFor:'بنستايل ليوم {d}',styleThis:'ستايل القطعة دي',
 rAnchor:'مبني حوالين {n}',rFormal:'الرسمية مناسبة لـ{o}',rOffFormal:'مش مظبوط أوي لـ{o}',rLayer:'{n} بيدفي في البرد',rLight:'طبقات خفيفة للجو الدافي',
 rStyle:'مايل لستايل {s}',rRecent:'اتلبس قريب: {n}',rFresh:'قطع ما لبستهاش من فترة'});

document.head.insertAdjacentHTML('beforeend',`<style>
.sty-ctl{border:1px solid var(--line);border-radius:18px;padding:18px 18px 8px;margin-bottom:24px;display:grid;grid-template-columns:1fr 1fr;gap:4px 28px;background:var(--panel)}
.sty-ctl .fg h4{padding:0}.sty-ctl .chips{padding:0}.chip small{opacity:.6}
.sty-go{grid-column:1/-1;display:flex;align-items:center;gap:14px;padding:6px 0 10px}
.anchor{display:flex;align-items:center;gap:10px;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:6px;max-width:360px}
.anchor img{width:44px;height:52px;object-fit:contain;background:var(--card);border-radius:8px}.anchor span{flex:1;display:flex;flex-direction:column;min-width:0}.anchor small{color:var(--muted);font-size:11.5px}
.sty-date{background:var(--card);border-radius:999px;padding:6px 6px 6px 14px;font-size:13px;display:flex;align-items:center;gap:4px}
.sres-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}
.sres{border:1px solid var(--line);border-radius:18px;overflow:hidden;background:var(--bg);display:flex;flex-direction:column}
.fl{display:grid;grid-template-columns:1.6fr 1fr;gap:4px;background:var(--card);padding:10px;min-height:300px}
.fl-main,.fl-side{display:flex;flex-direction:column;gap:4px}.fl-i{flex:1;min-height:0;border:0;background:none;padding:2px;border-radius:10px;cursor:pointer;display:grid;place-items:center}
.fl-i:hover{background:rgba(128,128,128,.12)}.fl-i img{max-width:100%;max-height:150px;object-fit:contain}.fl-side .fl-i img{max-height:80px}
.sr-body{padding:14px 16px 16px;display:flex;flex-direction:column;gap:8px;flex:1}.sr-score{font-size:20px;letter-spacing:-.02em}
.sr-items{margin:0;line-height:1.5}.sr-acts{display:flex;gap:6px;align-items:center;margin-top:auto;flex-wrap:wrap}.sr-acts .sp{flex:1}
@media (max-width:820px){.sty-ctl{grid-template-columns:1fr}}
</style>`);
