'use strict';
/* Shopping assistant: checks the closet against a menswear essentials list, spots imbalances (lots of ties but no
   formal shoes, many tops but few trousers…) and ranks what to buy next by how many of your own pieces it would go with.
   Each pick can go straight to the Wishlist collection or to an online shop search. Pure rules; an optional Gemini question. */

NAV.splice(NAV.indexOf('collections')+1,0,'shop');
const mc=(i,...cs)=>cs.includes((i.colors||[])[0]);
const tx=(i,re)=>re.test(txtOf(i));
// id, group, importance 1–3, category + main colour + name used to judge what it would pair with, test for "already owned"
const ESSENTIALS=[
 ['teeWhite','tops',3,'tshirts','white','white t-shirt',i=>inCat(i,'tshirts')&&mc(i,'white')&&!tx(i,/jersey|graphic/)],
 ['teeDark','tops',3,'tshirts','navy','plain navy t-shirt',i=>inCat(i,'tshirts')&&mc(i,'black','navy','grey')&&!tx(i,/jersey|graphic/)],
 ['polo','tops',2,'knitwear','navy','polo shirt',i=>tx(i,/\bpolo\b(?! ralph)|polo shirt|knit polo/)&&!tx(i,/sweater|crest sweater|coat|blazer|boots|tie|jacket/)],
 ['shirtWhite','tops',3,'shirts','white','white oxford shirt',i=>inCat(i,'shirts')&&(i.colors||[]).every(c=>c==='white')&&mc(i,'white')&&!tx(i,/camp|print|stripe|zip/)],
 ['shirtBlue','tops',3,'shirts','blue','light blue oxford shirt',i=>inCat(i,'shirts')&&mc(i,'blue','white')&&tx(i,/blue/)],
 ['shirtLinen','tops',1,'shirts','beige','linen shirt',i=>inCat(i,'shirts')&&tx(i,/linen/)],
 ['knitNeutral','tops',3,'knitwear','navy','navy crew-neck sweater',i=>inCat(i,'knitwear')&&mc(i,'navy','grey','black','beige','white')&&tx(i,/sweater|crew|cable|v-neck|jumper|pullover/)&&!tx(i,/vest|waistcoat|track|polo crest/)],
 ['hoodie','tops',1,'hoodies','grey','grey hoodie',i=>inCat(i,'hoodies')&&mc(i,'grey','black','navy')],
 ['jeansDark','bottoms',3,'jeans','navy','dark indigo straight jeans',i=>inCat(i,'jeans')&&mc(i,'navy','blue')&&!tx(i,/light|bleach|baggy|cargo|tinted|vintage/)],
 ['jeansBlack','bottoms',2,'jeans','black','black slim jeans',i=>inCat(i,'jeans')&&mc(i,'black')],
 ['chinos','bottoms',3,'casualpants','beige','beige chinos',i=>(inCat(i,'pants')||inCat(i,'casualpants'))&&!inCat(i,'jeans')&&!inCat(i,'trackpants')&&!inCat(i,'tailored')&&mc(i,'beige','navy','olive','white')&&!tx(i,/carpenter|cargo|corduroy|cow/)],
 ['trousersGrey','bottoms',2,'tailored','grey','grey wool trousers',i=>inCat(i,'tailored')&&mc(i,'grey','black')],
 ['trousersNavy','bottoms',2,'tailored','navy','navy tailored trousers',i=>inCat(i,'tailored')&&mc(i,'navy')],
 ['shorts','bottoms',1,'shorts','beige','chino shorts',i=>inCat(i,'shorts')],
 ['blazerNavy','outer',3,'blazers','navy','navy blazer',i=>inCat(i,'blazers')&&mc(i,'navy')],
 ['coat','outer',3,'coats','beige','camel overcoat',i=>inCat(i,'coats')],
 ['lightJacket','outer',2,'jackets','olive','light jacket (harrington / overshirt)',i=>inCat(i,'jackets')&&!inCat(i,'puffers')&&!inCat(i,'vests')],
 ['denimJacket','outer',1,'denimjk','blue','denim trucker jacket',i=>inCat(i,'denimjk')],
 ['puffer','outer',1,'puffers','black','puffer jacket',i=>inCat(i,'puffers')],
 ['sneakerWhite','shoes',3,'sneakers','white','white leather minimal sneakers',i=>inCat(i,'sneakers')&&mc(i,'white')&&(i.colors||[]).every(c=>['white','grey','beige','black'].includes(c))&&!tx(i,/runner|9060|mesh|flame/)],
 ['loafers','shoes',2,'loafers','brown','brown leather loafers',i=>inCat(i,'loafers')],
 ['boots','shoes',2,'boots','brown','brown suede chelsea boots',i=>inCat(i,'boots')&&mc(i,'brown','beige')],
 ['formalShoes','shoes',2,'formal','black','black leather derby shoes',i=>inCat(i,'formal')||tx(i,/derby|oxford shoe|brogue/)],
 ['beltBrown','acc',3,'belts','brown','brown leather belt',i=>inCat(i,'belts')&&mc(i,'brown','beige')],
 ['beltBlack','acc',2,'belts','black','black leather belt',i=>inCat(i,'belts')&&mc(i,'black')&&!tx(i,/western|horse/)],
 ['watch','acc',3,'watches','grey','classic watch',i=>inCat(i,'watches')],
 ['sunglasses','acc',2,'glasses','black','classic sunglasses',i=>inCat(i,'glasses')],
 ['tieNavy','acc',1,'ties','navy','navy tie',i=>inCat(i,'ties')&&mc(i,'navy')],
 ['bag','acc',2,'bags','brown','leather weekend bag / backpack',i=>inCat(i,'bags')],
 ['scarf','acc',1,'scarves','grey','wool scarf',i=>inCat(i,'scarves')&&!tx(i,/bandana|silk/)]];
const SHOP_ICO={tshirts:'👕',shirts:'👔',knitwear:'🧶',hoodies:'👕',jeans:'👖',casualpants:'👖',tailored:'👖',shorts:'🩳',blazers:'🧥',coats:'🧥',jackets:'🧥',denimjk:'🧥',puffers:'🧥',
 sneakers:'👟',loafers:'👞',boots:'🥾',formal:'👞',belts:'🪢',watches:'⌚',glasses:'🕶️',ties:'👔',bags:'👜',scarves:'🧣'};
const SHOP_GROUPS=[['tops','👕'],['bottoms','👖'],['outer','🧥'],['shoes','👞'],['acc','⌚']];

function shopAnalysis(){const skip=new Set(st.settings.shopSkip||[]);
 const ess=ESSENTIALS.map(([id,g,imp,cat,col,en,test])=>{const owned=st.items.filter(test),fake={id:'ess_'+id,category:cat,name:en,colors:[col],brand:''};
  const pairs=owned.length?0:st.items.filter(x=>slotOf(x)!==slotOf(fake)&&vibePair(fake,x)>=.15&&(!(x.colors||[])[0]||pairScore(col,x.colors[0]).s>=.8)).length;
  return {id,g,imp,cat,col,en,owned,pairs,skip:skip.has(id),score:imp+pairs/15}});
 const n=s=>st.items.filter(i=>slotOf(i)===s).length,cnt={top:n('top'),bottom:n('bottom'),outer:n('outer'),shoes:n('shoes'),tie:n('tie'),blazer:st.items.filter(i=>inCat(i,'blazers')).length};
 const tips=[],missing=id=>!ess.find(e=>e.id===id).owned.length;
 if(cnt.bottom&&cnt.top/cnt.bottom>2.2)tips.push({k:'shBottoms',v:{t:cnt.top,b:cnt.bottom}});
 if(cnt.shoes<4)tips.push({k:'shShoes',v:{n:cnt.shoes}});
 if(cnt.tie>=3&&missing('formalShoes'))tips.push({k:'shTiesShoes',v:{n:cnt.tie}});
 if(cnt.blazer>=2&&missing('trousersGrey')&&missing('trousersNavy'))tips.push({k:'shBlazerTrousers',v:{n:cnt.blazer}});
 if(!st.items.some(i=>slotOf(i)==='bottom'&&mc(i,'navy','black','grey')))tips.push({k:'shDarkBottom'});
 if(missing('coat')&&missing('puffer'))tips.push({k:'shWinter'});
 const picks=ess.filter(e=>!e.owned.length&&!e.skip).sort((a,b)=>b.score-a.score);
 const have=ess.filter(e=>e.owned.length).length;
 return {ess,picks,tips,cnt,have,total:ess.length}}

function renderShop(){const a=shopAnalysis(),pct=Math.round(a.have/a.total*100);
 const pickCard=(e,i)=>`<div class="sh-pick" data-id="${e.id}"><span class="sh-rank">${i+1}</span><div class="sh-ico">${SHOP_ICO[e.cat]||SHOP_GROUPS.find(g=>g[0]===e.g)[1]}</div>
  <div class="sh-b"><b>${esc(t('es_'+e.id))}</b><span>${t('shWhy_'+e.imp)}${e.pairs?` · ${t('shPairs',{n:e.pairs})}`:''}</span></div>
  <div class="sh-acts"><button class="btn sm" data-wish>${ic('plus',13)} ${t('wishlist')}</button><button class="btn ghost sm" data-find>🔎 ${t('shFind')}</button><button class="icon-btn" data-skip title="${t('shSkip')}">✕</button></div></div>`;
 $('#view').innerHTML=`<div class="page"><div class="page-h"><div><h1>${t('shop')}</h1><p class="muted">${t('shSub')}</p></div></div>
  <div class="sh-top"><div class="sh-ring" style="--p:${pct}"><b>${pct}%</b><small>${t('shEss')}</small></div>
   <div class="sh-bal">${[['top','👕'],['bottom','👖'],['outer','🧥'],['shoes','👞']].map(([s,e])=>`<div><span>${e} ${t('shSlot_'+s)}</span><i style="width:${Math.min(100,a.cnt[s]*4)}%"></i><b>${a.cnt[s]}</b></div>`).join('')}</div></div>
  ${a.tips.length?`<div class="sh-tips">${a.tips.map(x=>`<div class="sh-tip">💡 ${esc(t(x.k,x.v))}</div>`).join('')}</div>`:''}
  <h3 class="msec">${t('shNext')} <span class="muted sm">${t('shNextSub')}</span></h3>
  ${a.picks.length?`<div class="sh-picks">${a.picks.slice(0,8).map(pickCard).join('')}</div>`:`<p class="muted">${t('shAllSet')}</p>`}
  <div class="sh-ask"><b>${t('shAsk')}</b><div class="adv-in"><input id="shQ" placeholder="${t('shAskPh')}"><button class="btn sm" id="shGo">${t('advSend')}</button></div><div id="shAns"></div></div>
  <h3 class="msec" style="margin-top:30px">${t('shList')} <span class="muted sm">${a.have} / ${a.total}</span></h3>
  <div class="sh-groups">${SHOP_GROUPS.map(([g,emo])=>`<div class="sh-g"><h4>${emo} ${t('shG_'+g)}</h4>${a.ess.filter(e=>e.g===g).map(e=>`<div class="sh-row ${e.owned.length?'ok':e.skip?'skip':''}" data-id="${e.id}">
   <span class="sh-ck">${e.owned.length?'✓':e.skip?'–':''}</span><span class="sh-n">${esc(t('es_'+e.id))}</span>
   ${e.owned.length?`<span class="sh-own">${e.owned.slice(0,3).map(i=>`<img src="${i.img}" title="${esc(i.name||'')}" alt="">`).join('')}</span>`:e.skip?`<button class="link" data-unskip>${t('shUnskip')}</button>`:`<button class="link" data-wish>+ ${t('wishlist')}</button>`}</div>`).join('')}</div>`).join('')}</div></div>`;
 const v=$('#view');
 v.querySelector('.page').onclick=async e=>{const row=e.target.closest('[data-id]');if(!row)return;const ess=a.ess.find(x=>x.id===row.dataset.id),name=t('es_'+ess.id);
  if(e.target.closest('[data-wish]')){const list=await loadCols(),w=list.find(c=>c.name===t('wishlist'))||list[0];
   if(w.entries.some(x=>x.kind==='wish'&&x.name===name))return toast(t('shInWish'));w.entries.push({id:uid(),kind:'wish',name,brand:'',price:'',url:'',img:'',notes:t('shWhy_'+ess.imp)});await saveCols();toast(t('shAddedWish',{c:w.name}))}
  else if(e.target.closest('[data-find]'))window.open('https://www.google.com/search?tbm=shop&q='+encodeURIComponent(ess.en+' men'),'_blank','noopener');
  else if(e.target.closest('[data-skip]')){st.settings.shopSkip=[...new Set([...(st.settings.shopSkip||[]),ess.id])];await saveMeta();renderShop()}
  else if(e.target.closest('[data-unskip]')){st.settings.shopSkip=(st.settings.shopSkip||[]).filter(x=>x!==ess.id);await saveMeta();renderShop()}};
 const ask=async()=>{const q=$('#shQ').value.trim();if(!q)return;if(!gemKey.get()&&!await askGeminiKey())return;const box=$('#shAns');
  box.insertAdjacentHTML('beforeend',`<div class="adv-q"><p class="me">${esc(q)}</p><p class="ans">…</p></div>`);const ans=box.lastElementChild.querySelector('.ans');$('#shQ').value='';
  try{ans.textContent=await askShopAI(q,a)}catch(err){ans.textContent='⚠ '+err.message}};
 $('#shGo').onclick=ask;$('#shQ').onkeydown=e=>{if(e.key==='Enter')ask()}}
VIEWS.shop=renderShop;

async function askShopAI(q,a){const closet=st.items.map(i=>`- ${i.name||catName(i.category)} (${catName(i.category)}${i.brand?', '+i.brand:''}${(i.colors||[]).length?', '+i.colors.join('/'):''})`).join('\n');
 const prompt=`You are a menswear shopping advisor. This is the user's whole closet:\n${closet}\n\nEssentials they don't have yet: ${a.picks.map(e=>e.en).join(', ')||'none'}.\n\n`+
  `Question: ${q}\n\nAnswer in ${lang==='ar'?'Egyptian Arabic':'English'}, briefly (max ~140 words). Recommend specific pieces to buy (type, colour, fit, material) that fit their existing style and pair with pieces they own (name them). No links.`;
 const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':gemKey.get()},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})}).catch(()=>{throw new Error(t('gkNet'))});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(r.status===429?t('gkQuota'):(j.error?.message||r.statusText));
 return (j.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('').trim()||'…'}

const ES_EN={teeWhite:'White T-shirt',teeDark:'Plain navy / black T-shirt',polo:'Polo shirt',shirtWhite:'White Oxford shirt',shirtBlue:'Light blue Oxford shirt',shirtLinen:'Linen shirt',knitNeutral:'Navy or grey crew-neck sweater',hoodie:'Plain grey hoodie',
 jeansDark:'Dark indigo straight jeans',jeansBlack:'Black slim jeans',chinos:'Beige or navy chinos',trousersGrey:'Grey wool trousers',trousersNavy:'Navy tailored trousers',shorts:'Chino shorts',
 blazerNavy:'Navy blazer',coat:'Overcoat (camel / navy)',lightJacket:'Light jacket',denimJacket:'Denim jacket',puffer:'Puffer jacket',
 sneakerWhite:'White leather sneakers',loafers:'Brown leather loafers',boots:'Brown suede Chelsea boots',formalShoes:'Black leather Derby / Oxford shoes',
 beltBrown:'Brown leather belt',beltBlack:'Black leather belt',watch:'Classic watch',sunglasses:'Sunglasses',tieNavy:'Navy tie',bag:'Leather bag / backpack',scarf:'Wool scarf'};
const ES_AR={teeWhite:'تيشيرت أبيض سادة',teeDark:'تيشيرت كحلي أو أسود سادة',polo:'قميص بولو',shirtWhite:'قميص أكسفورد أبيض',shirtBlue:'قميص أكسفورد لبني',shirtLinen:'قميص كتان',knitNeutral:'بلوفر كحلي أو رمادي رقبة مدورة',hoodie:'هودي رمادي سادة',
 jeansDark:'جينز غامق مستقيم',jeansBlack:'جينز أسود سليم',chinos:'شينو بيج أو كحلي',trousersGrey:'بنطلون صوف رمادي',trousersNavy:'بنطلون كحلي متفصّل',shorts:'شورت شينو',
 blazerNavy:'بليزر كحلي',coat:'بالطو (كامل أو كحلي)',lightJacket:'جاكيت خفيف',denimJacket:'جاكيت جينز',puffer:'جاكيت بافر',
 sneakerWhite:'كوتشي جلد أبيض بسيط',loafers:'لوفر جلد بني',boots:'بوت تشيلسي شامواه بني',formalShoes:'جزمة رسمي جلد أسود (ديربي / أكسفورد)',
 beltBrown:'حزام جلد بني',beltBlack:'حزام جلد أسود',watch:'ساعة كلاسيك',sunglasses:'نضارة شمس',tieNavy:'كرافتة كحلي',bag:'شنطة جلد / باك باك',scarf:'سكارف صوف'};
for(const k in ES_EN){S.en['es_'+k]=ES_EN[k];S.ar['es_'+k]=ES_AR[k]}
Object.assign(S.en,{shop:'Shopping assistant',shSub:'What’s missing from your closet, and what to buy next',shEss:'essentials',shSlot_top:'Tops',shSlot_bottom:'Bottoms',shSlot_outer:'Outerwear',shSlot_shoes:'Shoes',
 shNext:'Buy next',shNextSub:'— ranked by how much it adds to what you own',shWhy_3:'A core basic',shWhy_2:'Very useful',shWhy_1:'Nice to have',shPairs:'goes with {n} of your pieces',
 shFind:'Shop',shSkip:'Not for me',shUnskip:'Show again',shAllSet:'You have every essential — nice.',shList:'Essentials checklist',
 shG_tops:'Tops',shG_bottoms:'Trousers',shG_outer:'Outerwear',shG_shoes:'Shoes',shG_acc:'Accessories',shInWish:'Already in your wishlist',shAddedWish:'Added to {c}',
 shAsk:'Ask the shopping assistant',shAskPh:'e.g. What 3 pieces would add the most outfits for winter?',
 shBottoms:'You have {t} tops but only {b} trousers — a new pair of trousers adds the most new outfits.',shShoes:'Only {n} pairs of shoes — shoes change a whole look, a couple more go a long way.',
 shTiesShoes:'You own {n} ties but no formal shoes — black or brown Derbies would let you wear them properly.',shBlazerTrousers:'{n} blazers but no tailored grey or navy trousers to wear them with.',
 shDarkBottom:'No dark trousers (navy, black, grey) — they anchor most outfits.',shWinter:'No coat or puffer for real winter days.'});
Object.assign(S.ar,{shop:'مساعد الشراء',shSub:'إيه الناقص في دولابك، وتشتري إيه بعد كده',shEss:'من الأساسيات',shSlot_top:'التوبات',shSlot_bottom:'البناطيل',shSlot_outer:'الجواكت',shSlot_shoes:'الجزم',
 shNext:'اشتري الأول',shNextSub:'— مترتبة حسب قد إيه هتضيف للي عندك',shWhy_3:'أساسي جدًا',shWhy_2:'مفيد جدًا',shWhy_1:'حلو لو موجود',shPairs:'تمشي مع {n} من قطعك',
 shFind:'دوّر عليها',shSkip:'مش عايزها',shUnskip:'رجّعها',shAllSet:'عندك كل الأساسيات — جامد.',shList:'قايمة الأساسيات',
 shG_tops:'التوبات',shG_bottoms:'البناطيل',shG_outer:'الجواكت والبالطوهات',shG_shoes:'الجزم',shG_acc:'الإكسسوارات',shInWish:'موجودة في الويش ليست أصلًا',shAddedWish:'اتضافت لـ {c}',
 shAsk:'اسأل مساعد الشراء',shAskPh:'مثلًا: أنهي 3 قطع تزود أوتفيتاتي في الشتا أكتر حاجة؟',
 shBottoms:'عندك {t} توب و{b} بنطلون بس — بنطلون جديد هيعمل أكتر عدد أوتفيتات جديدة.',shShoes:'عندك {n} جزم بس — الجزمة بتغير اللوك كله، كام واحدة كمان هيفرقوا كتير.',
 shTiesShoes:'عندك {n} كرافتات ومفيش جزمة رسمي — ديربي أسود أو بني هيخليك تلبسهم صح.',shBlazerTrousers:'عندك {n} بليزر ومفيش بنطلون متفصّل رمادي أو كحلي تلبسهم معاه.',
 shDarkBottom:'مفيش بنطلون غامق (كحلي، أسود، رمادي) — ده أساس أغلب الأوتفيتات.',shWinter:'مفيش بالطو أو بافر للأيام الساقعة بجد.'});
document.head.insertAdjacentHTML('beforeend',`<style>
.sh-top{display:flex;gap:22px;align-items:center;border:1px solid var(--line);border-radius:20px;padding:18px 20px;margin-bottom:16px;background:var(--panel);flex-wrap:wrap}
.sh-ring{--p:0;width:112px;height:112px;border-radius:50%;flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;
 background:radial-gradient(closest-side,var(--panel) 80%,transparent 81% 100%),conic-gradient(#c9a227 calc(var(--p)*1%),var(--line) 0)}
.sh-ring b{font-size:24px}.sh-ring small{font-size:11px;color:var(--muted)}
.sh-bal{flex:1;min-width:220px;display:flex;flex-direction:column;gap:9px}.sh-bal div{display:grid;grid-template-columns:110px 1fr 30px;align-items:center;gap:10px;font-size:13px}
.sh-bal i{height:7px;border-radius:7px;background:var(--ink);display:block;min-width:4px}.sh-bal b{text-align:end}
.sh-tips{display:flex;flex-direction:column;gap:8px;margin-bottom:26px}.sh-tip{background:var(--card);border-radius:14px;padding:11px 14px;font-size:13.5px;line-height:1.55}
.sh-picks{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:12px}
.sh-pick{display:flex;align-items:center;gap:12px;border:1px solid var(--line);border-radius:18px;padding:12px 14px;background:var(--bg);position:relative;flex-wrap:wrap}
.sh-rank{position:absolute;top:-8px;inset-inline-start:-8px;width:24px;height:24px;border-radius:50%;background:#c9a227;color:#111;font-size:12px;font-weight:800;display:grid;place-items:center}
.sh-ico{width:46px;height:46px;border-radius:14px;background:var(--card);display:grid;place-items:center;font-size:22px;flex:none}
.sh-b{flex:1;min-width:150px;display:flex;flex-direction:column;gap:2px}.sh-b b{font-size:14px}.sh-b span{font-size:12px;color:var(--muted)}
.sh-acts{display:flex;gap:6px;align-items:center}
.sh-ask{margin-top:22px;border:1px solid var(--line);border-radius:18px;padding:14px 16px}
.sh-groups{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.sh-g{border:1px solid var(--line);border-radius:18px;padding:12px 14px}.sh-g h4{margin:0 0 8px;font-size:14px}
.sh-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);font-size:13px;min-height:40px}.sh-row:last-child{border-bottom:0}
.sh-ck{width:20px;height:20px;border-radius:50%;border:1.5px solid var(--line);display:grid;place-items:center;font-size:11px;flex:none}
.sh-row.ok .sh-ck{background:#2f8f4e;border-color:#2f8f4e;color:#fff}.sh-row.skip{opacity:.5}
.sh-n{flex:1}.sh-row.ok .sh-n{color:var(--muted)}.sh-own{display:flex;gap:2px}.sh-own img{width:28px;height:34px;object-fit:contain}
@media (max-width:760px){.sh-picks{grid-template-columns:1fr}.sh-acts{width:100%}.sh-acts .btn{flex:1;justify-content:center}.sh-top{padding:14px}.sh-ring{width:92px;height:92px}}
</style>`);
