'use strict';
/* Color harmony and garment knowledge shared by the outfit panel, the stylist and the calendar.
   Pure rules, no storage and no network: everything here works offline. */

/* n:1 = true neutral, n:.5 = earthy colour that behaves almost like a neutral; h = hue in degrees */
const CMETA={black:{n:1},white:{n:1},grey:{n:1},beige:{n:1,h:40},brown:{n:1,h:25},navy:{n:1,h:225},
 blue:{h:215},green:{h:130},olive:{n:.5,h:70},red:{h:0},burgundy:{n:.5,h:345},pink:{h:330},purple:{h:275},yellow:{h:50},orange:{h:28}};
const CLASSIC=new Set(['brown|navy','beige|navy','navy|white','beige|olive','burgundy|navy','burgundy|grey','beige|green','blue|brown','black|white',
 'beige|white','beige|blue','brown|olive','brown|green','grey|navy','blue|grey','brown|white','beige|brown','green|navy','burgundy|beige','olive|white']);
const pairKey=(a,b)=>[a,b].sort().join('|');
const hueDist=(a,b)=>{const d=Math.abs(a-b)%360;return d>180?360-d:d};
const colorName=id=>{const c=COLORS.find(x=>x[0]===id);return c?c[lang==='ar'?3:2]:id};
const colorHex=id=>(COLORS.find(x=>x[0]===id)||[])[1]||'#999';

function pairScore(a,b){
 if(a===b)return {s:.82,why:'tonal'};
 if(CLASSIC.has(pairKey(a,b)))return {s:1,why:'classic'};
 const A=CMETA[a]||{},B=CMETA[b]||{};
 if(A.n===1||B.n===1)return {s:.9,why:'neutral'};
 const d=hueDist(A.h??0,B.h??0);
 if(d<45)return {s:.85,why:'analogous'};
 if(d>150)return {s:.68,why:'complementary'};
 if(d>100)return {s:.55,why:'bold'};
 return {s:A.n||B.n?.62:.4,why:'clash'}}

/* harmony of a set of items, using each item's first (main) colour */
function harmony(items){
 const main=[...new Set(items.map(i=>(i.colors||[])[0]).filter(Boolean))];
 const palette=[...new Set(items.flatMap(i=>i.colors||[]))].slice(0,7);
 const reasons=[];
 if(main.length<2){return {score:main.length?88:0,label:main.length?'excellent':'unknown',palette,reasons:main.length?[{k:'cTonal',v:{a:colorName(main[0])}}]:[]}}
 const accents=main.reduce((s,c)=>s+(CMETA[c]?.n===1?0:CMETA[c]?.n===.5?.5:1),0);
 let sum=0,n=0;const seen=new Set();
 for(let i=0;i<main.length;i++)for(let j=i+1;j<main.length;j++){const p=pairScore(main[i],main[j]);sum+=p.s;n++;
  const key=p.why+pairKey(main[i],main[j]);if(seen.has(key))continue;seen.add(key);
  if(p.why==='classic')reasons.push({k:'cClassic',v:{a:colorName(main[i]),b:colorName(main[j])},good:1});
  else if(p.why==='clash')reasons.push({k:'cClash',v:{a:colorName(main[i]),b:colorName(main[j])},bad:1});
  else if(p.why==='complementary')reasons.push({k:'cBold',v:{a:colorName(main[i]),b:colorName(main[j])}});
  else if(p.why==='analogous')reasons.push({k:'cAnalog',v:{a:colorName(main[i]),b:colorName(main[j])},good:1})}
 let score=sum/n*100;
 if(accents===0){score=Math.max(score,92);reasons.unshift({k:'cNeutral',good:1})}
 else if(accents>2){score-=12*(accents-2);reasons.push({k:'cTooMany',bad:1})}
 else if(accents<=1)reasons.push({k:'cOneAccent',good:1});
 score=Math.max(0,Math.min(100,Math.round(score)));
 return {score,label:score>=85?'excellent':score>=72?'good':score>=58?'bold':'clash',palette,reasons:reasons.slice(0,4)}}
const harmonyText=r=>t(r.k,r.v);

/* ---- garments ---- */
const SLOT_OF={jackets:'outer',coats:'outer',blazers:'outer',tshirts:'top',shirts:'top',knitwear:'top',hoodies:'top',
 pants:'bottom',jeans:'bottom',shorts:'bottom',dresses:'dress',shoes:'shoes',sneakers:'shoes',loafers:'shoes',boots:'shoes',formal:'shoes',sandals:'shoes',
 bags:'bag',belts:'belt',watches:'watch',ties:'tie',glasses:'glasses',hats:'hat',scarves:'scarf',jewelry:'jewelry',accessories:'acc'};
const slotOf=it=>SLOT_OF[it.category]||SLOT_OF[parentOf(it.category)]||'other';
const FORMALITY={tshirts:1.5,hoodies:1,shirts:3.2,knitwear:2.9,blazers:4.2,coats:3.6,jackets:2.4,pants:3.1,jeans:2,tailored:3.8,casualpants:2.6,trackpants:1,shorts:1,dresses:3,
 shoes:2.5,sneakers:1.8,boots:2.9,loafers:3.6,formal:4.8,sandals:1,ties:4.5,belts:3,watches:3.2,bags:2.6,glasses:2,hats:1.6,scarves:2.8,jewelry:2.6,accessories:2.6};
const WARMTH={tshirts:1,shirts:1.5,knitwear:3,hoodies:2.6,jackets:3,puffers:4.2,vests:2,trackjk:2,coats:4.6,blazers:2.2,pants:2,jeans:2,shorts:0,dresses:1.5,
 sneakers:1.5,loafers:1.4,formal:1.5,boots:3.2,sandals:0,scarves:3.5,hats:2,ties:1,belts:1,watches:1,bags:1,glasses:1,jewelry:1,accessories:1};
const txtOf=it=>`${it.name||''} ${it.brand||''} ${(it.materials||[]).join(' ')}`.toLowerCase();
function formalityOf(it){let f=FORMALITY[it.category]??FORMALITY[parentOf(it.category)]??2.5;const s=txtOf(it);
 if(/track|jersey|hoodie|graphic|racing|cargo|varsity|bomber|puffer|m&m|stwd|carpenter|cow print/.test(s))f-=.6;
 if(/tailored|pleated|trouser|oxford|dress shirt|cashmere|silk|camel|double-breasted|chelsea|penny/.test(s))f+=.4;
 if(/western|cowboy|bandana|bolo/.test(s))f-=.3;
 return Math.max(.5,Math.min(5,f))}
function warmthOf(it){let w=WARMTH[it.category]??WARMTH[parentOf(it.category)]??1.5;const s=txtOf(it);
 if(/puffer|shearling|wool|cashmere|fleece|corduroy|knit/.test(s))w+=.8;
 if(/linen|short-sleeve|short sleeve|camp|mesh|jersey|tee/.test(s))w-=.7;
 return w}

/* manual weather: id, label key, temperature hint, matching seasons */
const WEATHER=[['hot','30°+',['summer']],['warm','20–29°',['spring','summer']],['mild','13–19°',['spring','autumn']],['cold','5–12°',['autumn','winter']],['freezing','< 5°',['winter']]];
const OCCASIONS=[['casual',2],['smart',3],['business',3.8],['formal',4.6],['evening',3.3],['sport',1.2],['travel',2]];
const STYLES=['classic','oldMoney','preppy','vintage','minimalist','smartCasual','businessCasual','formal','streetwear'];
const occTarget=id=>(OCCASIONS.find(o=>o[0]===id)||OCCASIONS[0])[1];

/* how strongly a piece fits a style (0..1), from its category, name, brand and colours */
const STYLE_RULES={
 classic:{cats:['blazers','shirts','coats','loafers','boots','formal','watches','ties','belts'],kw:/oxford|chelsea|trench|blazer|white shirt|double-breasted/,col:['navy','white','beige','brown','grey','black']},
 oldMoney:{cats:['knitwear','blazers','loafers','coats','watches'],kw:/cashmere|cable|camel|polo ralph lauren|cricket|penny|moccasin|quarter-zip|suede|wells/,col:['beige','navy','white','brown','olive','burgundy']},
 preppy:{cats:['knitwear','shirts','blazers','ties','loafers'],kw:/cricket|varsity|rltc|polo|oxford|stripe|crest|v-neck|sweater vest|gant/,col:['navy','white','green','burgundy','yellow']},
 vintage:{cats:['jackets','hats','boots','jewelry','scarves'],kw:/western|cowboy|bolo|bandana|corduroy|suede|vintage|retro|denim trucker|fair isle|chevrolet|corvette/,col:['brown','beige','olive','burgundy']},
 minimalist:{cats:['tshirts','pants','coats','sneakers'],kw:/plain|basic|tailored|cos|white|black/,col:['black','white','grey','beige','navy']},
 smartCasual:{cats:['shirts','knitwear','pants','loafers','jackets','sneakers'],kw:/overshirt|suede|chino|trouser|knit|polo/,col:['beige','navy','olive','brown','white']},
 businessCasual:{cats:['blazers','shirts','pants','loafers','knitwear','belts','watches'],kw:/blazer|oxford|trouser|tailored|cardigan/,col:['navy','grey','white','beige','blue']},
 formal:{cats:['blazers','ties','formal','shirts','watches','belts'],kw:/dress shirt|tie|tailored|double-breasted|oxford|derby|black leather/,col:['black','navy','white','grey']},
 streetwear:{cats:['hoodies','tshirts','sneakers','jeans','jackets','hats'],kw:/jersey|graphic|cargo|track|stwd|racing|baggy|puffer|nike|adidas|new balance|vans|jordan/,col:['black','white','red','green']}};
function styleAffinity(it,style){const r=STYLE_RULES[style];if(!r)return 0;let s=0;
 if(r.cats.includes(it.category)||r.cats.includes(parentOf(it.category)))s+=.45;
 if(r.kw.test(txtOf(it)))s+=.4;
 if((it.colors||[]).some(c=>r.col.includes(c)))s+=.15;
 return Math.min(1,s)}

/* ---- wear history comes from the calendar (days marked as worn) ---- */
function wornMap(){const m={};
 for(const [day,p] of Object.entries(st.plans||{})){if(!p||typeof p!=='object'||!p.worn||!p.outfit)continue;
  const b=st.boards.find(x=>x.id===p.outfit);if(!b)continue;
  for(const id of new Set(b.elements.filter(e=>e.kind==='item').map(e=>e.itemId))){const w=m[id]||(m[id]={n:0,last:''});w.n++;if(day>w.last)w.last=day}}
 return m}
const daysSince=d=>d?Math.round((Date.now()-new Date(d+'T12:00').getTime())/864e5):Infinity;

Object.assign(S.en,{cTonal:'Tonal look built on {a}',cClassic:'{a} + {b} is a classic pairing',cClash:'{a} and {b} may clash',cBold:'{a} and {b} contrast boldly',
 cAnalog:'{a} and {b} sit close on the colour wheel',cNeutral:'All-neutral palette — timeless and easy',cTooMany:'Too many accent colours competing',cOneAccent:'One accent colour against neutrals',
 hExcellent:'Excellent harmony',hGood:'Good harmony',hBold:'Bold contrast',hClash:'Colours clash',hUnknown:'No colours set',
 occ_casual:'Casual',occ_smart:'Smart casual',occ_business:'Business',occ_formal:'Formal',occ_evening:'Evening / date',occ_sport:'Sport',occ_travel:'Travel',
 w_hot:'Hot',w_warm:'Warm',w_mild:'Mild',w_cold:'Cold',w_freezing:'Freezing',
 st_classic:'Classic',st_oldMoney:'Old Money',st_preppy:'Preppy',st_vintage:'Vintage',st_minimalist:'Minimalist',st_smartCasual:'Smart Casual',st_businessCasual:'Business Casual',st_formal:'Formal',st_streetwear:'Streetwear'});
Object.assign(S.ar,{cTonal:'لوك تونال مبني على {a}',cClassic:'{a} مع {b} توليفة كلاسيك',cClash:'{a} و{b} ممكن يتخانقوا',cBold:'{a} و{b} تباين جريء',
 cAnalog:'{a} و{b} ألوان قريبة من بعض',cNeutral:'باليت محايدة بالكامل — كلاسيك وسهلة',cTooMany:'ألوان قوية كتير مع بعض',cOneAccent:'لون واحد قوي مع ألوان محايدة',
 hExcellent:'تناسق ممتاز',hGood:'تناسق كويس',hBold:'تباين جريء',hClash:'الألوان مش متناسقة',hUnknown:'مفيش ألوان متسجلة',
 occ_casual:'كاجوال',occ_smart:'سمارت كاجوال',occ_business:'شغل',occ_formal:'رسمي',occ_evening:'سهرة / خروجة',occ_sport:'رياضة',occ_travel:'سفر',
 w_hot:'حر',w_warm:'دافي',w_mild:'معتدل',w_cold:'برد',w_freezing:'برد جدًا',
 st_classic:'كلاسيك',st_oldMoney:'Old Money',st_preppy:'Preppy',st_vintage:'فينتدج',st_minimalist:'مينيمال',st_smartCasual:'سمارت كاجوال',st_businessCasual:'بيزنس كاجوال',st_formal:'رسمي',st_streetwear:'ستريت وير'});
const hLabel=l=>t('h'+l[0].toUpperCase()+l.slice(1));
const paletteHTML=pal=>`<span class="pal">${pal.map(c=>`<i style="background:${colorHex(c)}" title="${esc(colorName(c))}"></i>`).join('')}</span>`;
document.head.insertAdjacentHTML('beforeend',`<style>
.pal{display:inline-flex;gap:4px;vertical-align:middle}.pal i{width:16px;height:16px;border-radius:50%;border:1px solid rgba(128,128,128,.35);display:block}
.hbar{height:6px;border-radius:6px;background:var(--card);overflow:hidden}.hbar i{display:block;height:100%;background:var(--ink);border-radius:6px}
.reasons{margin:8px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px;font-size:12.5px;color:var(--ink2)}
.reasons li{display:flex;gap:7px;align-items:flex-start;line-height:1.45}.reasons li::before{content:'•';color:var(--muted)}
.reasons li.good::before{content:'✓';color:#2f8f4e}.reasons li.bad::before{content:'!';color:var(--danger);font-weight:700}
</style>`);
