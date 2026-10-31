'use strict';
/* Outfit advisor: looks at an outfit (stylist suggestion, outfit or moodboard) and says what's missing or off —
   a piece that fights the rest, a colour that clashes, a missing belt, shoes or watch, too many accessories —
   each with a one-tap fix from your own closet. A free question can go to Gemini (text) when a Gemini key is saved. */

const ACC_SLOTS=['belt','watch','tie','glasses','hat','scarf','jewelry','bag','acc','other'];
const nm=it=>it.name||catName(it.category);
// best piece from the closet for a slot, judged against the rest of the outfit
function bestFor(slot,others,exclude=[],test=()=>true){const cols=others.map(i=>(i.colors||[])[0]).filter(Boolean),core=others.filter(i=>!ACC_SLOTS.includes(slotOf(i)));
 const fs=core.map(formalityOf),mean=fs.length?fs.reduce((a,b)=>a+b,0)/fs.length:2.5;
 return st.items.filter(x=>slotOf(x)===slot&&!exclude.includes(x)&&!others.includes(x)&&test(x)).map(x=>{const c=(x.colors||[])[0];
  return {x,s:1.6*vibeWith(x,others)+(c&&cols.length?cols.reduce((s,k)=>s+pairScore(c,k).s,0)/cols.length:.6)-.25*Math.abs(formalityOf(x)-mean)}}).sort((a,b)=>b.s-a.s)[0]}
function adviseOutfit(items,ctx={}){const tips=[],has=s=>items.find(i=>slotOf(i)===s),others=it=>items.filter(i=>i!==it);
 const top=has('top'),bottom=has('bottom'),shoes=has('shoes'),dress=has('dress'),outer=has('outer'),core=items.filter(i=>!ACC_SLOTS.includes(slotOf(i)));
 const add=(slot,k,test)=>{const b=bestFor(slot,items,[],test);if(b)tips.push({k,v:{n:nm(b.x)},act:{t:'add',to:b.x},kind:'add'});return b};
 const swap=(it,k,extra={})=>{const b=bestFor(slotOf(it),others(it),[it]);if(b&&b.s>(bestScore(it)+.15))tips.push({k,v:{a:nm(it),b:nm(b.x),...extra},act:{t:'swap',from:it,to:b.x},kind:'swap'});else if(ACC_SLOTS.includes(slotOf(it)))tips.push({k:'adRemove',v:{a:nm(it)},act:{t:'rm',from:it},kind:'rm'})};
 const bestScore=it=>{const o=others(it),cols=o.map(i=>(i.colors||[])[0]).filter(Boolean),c=(it.colors||[])[0];return 1.6*vibeWith(it,o)+(c&&cols.length?cols.reduce((s,k)=>s+pairScore(c,k).s,0)/cols.length:.6)};
 // 1. the basics
 if(!dress&&!top)add('top','adNeedTop');if(!dress&&!bottom)add('bottom','adNeedBottom');if(!shoes)add('shoes','adNeedShoes');
 if(ctx.weather&&['cold','freezing'].includes(ctx.weather)&&!outer)add('outer','adNeedOuter');
 // 2. belt and tie rules first (a belt on track pants is the belt's fault, not the trousers')
 const belt=has('belt'),tie=has('tie'),meanF=core.length?core.map(formalityOf).reduce((a,b)=>a+b,0)/core.length:2.5,flagged=new Set();
 if(belt&&!beltable(bottom)){flagged.add(belt);tips.push({k:'adBeltNo',v:{a:nm(belt),b:bottom?nm(bottom):'—'},act:{t:'rm',from:belt},kind:'rm'})}
 if(tie&&top&&top.category!=='shirts'){flagged.add(tie);tips.push({k:'adTieNo',v:{a:nm(tie)},act:{t:'rm',from:tie},kind:'rm'})}
 // 3. style: the piece that fights the rest — judged against the main pieces' style, accessories first
 const rest=items.filter(i=>!flagged.has(i));
 if(rest.length>1){const vb=vibeSet(rest),lead=vibeSet(core.filter(i=>!flagged.has(i))).lead||vb.lead;
  if(vb.min<-.15){const off=rest.filter(i=>!mainVibes(i).includes(lead)&&mainVibes(i).length),pool=off.length?off:rest;
   const worst=pool.slice().sort((a,b)=>(vibeWith(a,rest.filter(x=>x!==a))-(ACC_SLOTS.includes(slotOf(a))?.3:0))-(vibeWith(b,rest.filter(x=>x!==b))-(ACC_SLOTS.includes(slotOf(b))?.3:0)))[0];
   swap(worst,'adVibe',{v:t('vb_'+(mainVibes(worst)[0]||'street')),l:t('vb_'+lead)})}}
 // 3. colour
 const h=harmony(items);if(h.label==='clash'||h.reasons.some(r=>r.k==='cTooMany')){const coloured=items.filter(i=>(i.colors||[])[0]);
  const worst=coloured.sort((a,b)=>colorFitOf(a,others(a))-colorFitOf(b,others(b)))[0];if(worst&&!tips.some(x=>x.act?.from===worst))swap(worst,'adColor',{c:colorName(worst.colors[0])})}
 // 4. formality spread
 if(core.length>2){const fs=core.map(formalityOf),mean=fs.reduce((a,b)=>a+b,0)/fs.length,far=core.slice().sort((a,b)=>Math.abs(formalityOf(b)-mean)-Math.abs(formalityOf(a)-mean))[0];
  if(Math.abs(formalityOf(far)-mean)>1.5&&!tips.some(x=>x.act?.from===far))swap(far,formalityOf(far)>mean?'adTooFormal':'adTooCasual')}
 // 5. missing belt / tie
 if(!belt&&beltable(bottom)&&meanF>=2.2)add('belt','adBelt',x=>vibeWith(x,items)>(Object.keys(vibeOf(x)).includes('western')?.35:-.05));
 if(!tie&&top?.category==='shirts'&&outer?.category==='blazers'&&meanF>=3.3)add('tie','adTie');
 // 6. finishing touches
 if(!has('watch'))add('watch','adWatch');
 const acc=items.filter(i=>ACC_SLOTS.includes(slotOf(i)));
 if(acc.length>5){const least=acc.slice().sort((a,b)=>vibeWith(a,others(a))-vibeWith(b,others(b)))[0];tips.push({k:'adTooMany',v:{a:nm(least)},act:{t:'rm',from:least},kind:'rm'})}
 else if(tips.length<2){for(const s of ['glasses','jewelry','hat','bag','scarf']){if(has(s))continue;const b=bestFor(s,items,[],x=>vibeWith(x,items)>=.35);
  if(b){tips.push({k:'adExtra',v:{n:nm(b.x)},act:{t:'add',to:b.x},kind:'extra'});break}}}
 const vb=vibeSet(items),score=Math.round(Math.max(0,Math.min(100,(h.score*.5+Math.max(0,(vb.mean+.2)/1.1)*100*.5)-tips.filter(x=>x.kind!=='extra').length*6)));
 return {score,tips,lead:vb.lead,h}}
const colorFitOf=(it,o)=>{const c=(it.colors||[])[0],cols=o.map(i=>(i.colors||[])[0]).filter(Boolean);return c&&cols.length?cols.reduce((s,k)=>s+pairScore(c,k).s,0)/cols.length:.8};

/* ---- the advisor window. apply(act) changes the outfit and returns the new list of pieces ---- */
function openAdvisor(items,apply,ctx={}){let cur=items.slice();const qa=[];
 const draw=()=>{const a=adviseOutfit(cur,ctx),md=$('#modal-root .md');
  md.innerHTML=`<div class="adv-h"><div><span class="mg-k">${t('advTitle')}</span><h2>${a.tips.filter(x=>x.kind!=='extra').length?t('advSome'):t('advGood')}</h2></div>
   <div class="adv-score"><b>${a.score}</b><small>/100</small></div></div>
   <div class="adv-pieces">${cur.map(i=>`<img src="${i.img}" title="${esc(nm(i))}" alt="">`).join('')}</div>
   ${a.lead?`<p class="muted sm" style="margin:0 0 12px">${t('advLead',{v:t('vb_'+a.lead)})} · ${hLabel(a.h.label)}</p>`:''}
   <div class="adv-tips">${a.tips.length?a.tips.map((x,i)=>`<div class="adv-tip k-${x.kind}">${x.act?.to?`<img src="${x.act.to.img}" alt="">`:x.act?.from?`<img src="${x.act.from.img}" alt="" class="faded">`:''}
    <p>${esc(t(x.k,x.v))}</p>${x.act&&apply?`<button class="btn sm" data-ap="${i}">${t(x.act.t==='rm'?'advRemove':x.act.t==='swap'?'advSwap':'advAdd')}</button>`:''}</div>`).join('')
    :`<div class="adv-tip k-ok"><p>✓ ${t('advNothing')}</p></div>`}</div>
   <div class="adv-ask"><b class="sm">${t('advAsk')}</b>${qa.map(q=>`<div class="adv-q"><p class="me">${esc(q.q)}</p><p class="ans">${q.a==null?'…':esc(q.a)}</p></div>`).join('')}
    <div class="adv-in"><input id="advQ" placeholder="${t('advAskPh')}"><button class="btn sm" id="advGo">${t('advSend')}</button></div>
    <p class="muted sm" style="margin:6px 0 0">${gemKey.get()?t('advAiOn'):`${t('advAiOff')} <button class="link" id="advKey">🔑 ${t('gkTitle')}</button>`}</p></div>
   <div class="md-f"><span class="sp"></span><button class="btn" data-close>${t('done')}</button></div>`;
  md.onclick=async e=>{const b=e.target.closest('[data-ap]');if(b){const x=a.tips[+b.dataset.ap];b.disabled=true;cur=await apply(x.act)||cur;draw();return}
   if(e.target.closest('#advKey')){await askGeminiKey();draw();return}
   if(e.target.closest('#advGo'))ask()};
  const inp=$('#advQ',md);inp.onkeydown=e=>{if(e.key==='Enter')ask()}};
 const ask=async()=>{const q=$('#advQ')?.value.trim();if(!q)return;if(!gemKey.get()){if(!await askGeminiKey())return}
  const e={q,a:null};qa.push(e);draw();try{e.a=await askStylistAI(cur,q)}catch(err){e.a='⚠ '+err.message}draw();$('#advQ')?.focus()};
 modal('',{wide:true});$('#modal-root .md').classList.add('adv');draw()}

async function askStylistAI(items,q){const line=i=>`- ${nm(i)} (${catName(i.category)}${i.brand?', '+i.brand:''}${(i.colors||[]).length?', '+i.colors.join('/'):''})`;
 const closet=st.items.filter(i=>!items.includes(i)).map(line).join('\n');
 const prompt=`You are a sharp, friendly menswear stylist. The user is building this outfit:\n${items.map(line).join('\n')}\n\nThe rest of their closet:\n${closet}\n\n`+
  `Question: ${q}\n\nAnswer in ${lang==='ar'?'Egyptian Arabic':'English'}, briefly (max ~120 words). Only suggest pieces from their closet, using the exact names above. Be concrete: which piece to swap, add or remove and why.`;
 let r;try{r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':gemKey.get()},
  body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})})}catch(e){throw new Error(t('gkNet'))}
 const j=await r.json().catch(()=>({}));if(!r.ok){if(r.status===400||r.status===401||r.status===403)throw new Error(j.error?.message?.includes('API key')?t('gkBadKey'):(j.error?.message||r.statusText));if(r.status===429)throw new Error(t('gkQuota'));throw new Error(j.error?.message||r.statusText)}
 return (j.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('').trim()||'…'}

/* ---- editor: advisor and "save moodboard as outfit" ---- */
async function advisorForBoard(){const b=board(),items=outfitItems(b);if(!items.length){toast(t('duNone'));return}
 openAdvisor(items,async act=>{
  if(act.t==='add'){const{w,h}=await sizeFor(act.to.img,b.type==='outfit'?300:280,400);addEl({kind:'item',itemId:act.to.id,w,h})}
  else if(act.t==='swap'){await replaceInBoard(b,act.from.id,act.to);renderStage();renderEdItems();commit()}
  else if(act.t==='rm'){b.elements=b.elements.filter(e=>e.itemId!==act.from.id);st.ed.sel=null;renderStage();renderSelbar();renderEdItems();commit()}
  toast(t('advApplied'));return outfitItems(b)})}
async function moodToOutfit(){const b=board(),items=outfitItems(b);if(!items.length){toast(t('duNone'));return}
 const o=await newOutfitFromItems(items,{name:b.name,worn:true});toast(t('mtoDone'));
 if(await askConfirm(t('mtoOpen'))){await leaveEditor();st.view='outfits';openEditor(o.id)}}
HOOKS.loaded.push(where=>{if(where!=='editor')return;const add=$('.ed-add');if(!add||$('#addAdv'))return;const b=board();
 add.insertAdjacentHTML('beforeend',`<button class="btn ghost sm" id="addAdv">💬<span>${t('advBtn')}</span></button>${b.type==='mood'?`<button class="btn ghost sm" id="toOutfit">${ic('mtOutfits',17)}<span>${t('mtoBtn')}</span></button>`:''}`);
 $('#addAdv').onclick=advisorForBoard;if($('#toOutfit'))$('#toOutfit').onclick=moodToOutfit});

Object.assign(S.en,{advBtn:'Advisor',advTitle:'Outfit advisor',advSome:'A few things to look at',advGood:'This works',advLead:'Reads {v}',advNothing:'Nothing missing — the pieces sit well together.',
 advAdd:'Add',advSwap:'Swap',advRemove:'Remove',advApplied:'Done',advAsk:'Ask anything about this outfit',advAskPh:'e.g. What shoes would make it smarter?',advSend:'Ask',
 advAiOn:'Answers come from Gemini, using only your closet.',advAiOff:'Free questions need a Gemini key.',
 adNeedTop:'No top yet — {n} would work.',adNeedBottom:'No trousers yet — try {n}.',adNeedShoes:'No shoes yet — {n} fits this.',adNeedOuter:'It’s cold: add {n} on top.',
 adVibe:'{a} reads {v} while the rest is {l} — swap it for {b}.',adColor:'The {c} of {a} fights the other colours — {b} sits better.',
 adTooFormal:'{a} is dressier than the rest — {b} matches the level.',adTooCasual:'{a} is more casual than the rest — {b} lifts it.',
 adRemove:'{a} doesn’t suit this look — leave it out.',adBeltNo:'{b} has no belt loops — drop {a}.',adBelt:'Add a belt: {n} goes with the shoes and the look.',
 adTieNo:'A tie needs a collared shirt — drop {a}.',adTie:'Shirt and blazer: {n} would finish it.',adWatch:'Finish with a watch: {n}.',adTooMany:'Too many accessories — drop {a}.',adExtra:'Optional touch: {n}.',
 mtoBtn:'To outfit',mtoDone:'Saved in your Outfits',mtoOpen:'Open the new outfit now?'});
Object.assign(S.ar,{advBtn:'المستشار',advTitle:'مستشار الأوتفيت',advSome:'في كام حاجة تتظبط',advGood:'الأوتفيت ماشي',advLead:'الستايل الغالب: {v}',advNothing:'مفيش حاجة ناقصة — القطع راكبة على بعض.',
 advAdd:'ضيف',advSwap:'بدّل',advRemove:'شيل',advApplied:'تمام',advAsk:'اسأل أي حاجة عن الأوتفيت ده',advAskPh:'مثلًا: أنهي جزمة تخليه أشيك؟',advSend:'اسأل',
 advAiOn:'الإجابات من Gemini، ومن قطع دولابك بس.',advAiOff:'الأسئلة الحرة محتاجة مفتاح Gemini.',
 adNeedTop:'مفيش توب — {n} هيمشي.',adNeedBottom:'مفيش بنطلون — جرّب {n}.',adNeedShoes:'مفيش جزمة — {n} مناسبة.',adNeedOuter:'الجو برد: ضيف {n} فوق.',
 adVibe:'{a} ستايلها {v} والباقي {l} — بدّلها بـ {b}.',adColor:'لون {c} في {a} مش راكب مع الباقي — {b} أنسب.',
 adTooFormal:'{a} رسمية أكتر من الباقي — {b} على نفس المستوى.',adTooCasual:'{a} كاجوال أكتر من الباقي — {b} هتعليه.',
 adRemove:'{a} مش لايقة على اللوك ده — شيلها.',adBeltNo:'{b} ملوش مكان حزام — شيل {a}.',adBelt:'ضيف حزام: {n} لايق مع الجزمة واللوك.',
 adTieNo:'الكرافتة محتاجة قميص بياقة — شيل {a}.',adTie:'قميص وبليزر: {n} هتكمّله.',adWatch:'كمّل بساعة: {n}.',adTooMany:'إكسسوارات كتير — شيل {a}.',adExtra:'لمسة اختيارية: {n}.',
 mtoBtn:'حوّله لأوتفيت',mtoDone:'اتحفظ في الأوتفيتات',mtoOpen:'تفتح الأوتفيت الجديد دلوقتي؟'});
document.head.insertAdjacentHTML('beforeend',`<style>
.md.adv{max-width:620px}
.adv-h{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.adv-h h2{margin:2px 0 10px}
.adv-score{background:var(--ink);color:var(--bg);border-radius:16px;padding:8px 14px;text-align:center;line-height:1}.adv-score b{font-size:26px}.adv-score small{opacity:.6}
.adv-pieces{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:8px}.adv-pieces img{width:54px;height:64px;object-fit:contain;background:var(--card);border-radius:10px;flex:none;padding:4px}
.adv-tips{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.adv-tip{display:flex;align-items:center;gap:12px;border:1px solid var(--line);border-radius:14px;padding:8px 10px;background:var(--bg)}
.adv-tip img{width:46px;height:54px;object-fit:contain;background:var(--card);border-radius:9px;flex:none;padding:3px}.adv-tip img.faded{opacity:.5}
.adv-tip p{margin:0;flex:1;font-size:13.5px;line-height:1.5}.adv-tip.k-extra{border-style:dashed}.adv-tip.k-ok{background:var(--card);border:0}
.adv-ask{border-top:1px solid var(--line);padding-top:14px}
.adv-q{margin:10px 0}.adv-q p{margin:0 0 6px;padding:8px 12px;border-radius:14px;font-size:13.5px;line-height:1.55;white-space:pre-wrap;max-width:88%}
.adv-q .me{background:var(--ink);color:var(--bg);margin-inline-start:auto;width:fit-content}.adv-q .ans{background:var(--card)}
.adv-in{display:flex;gap:8px;margin-top:8px}.adv-in input{flex:1;border:1px solid var(--line);border-radius:999px;padding:9px 14px;background:var(--bg);outline:none;min-width:0}
.ed-add .btn span{white-space:nowrap}
</style>`);
