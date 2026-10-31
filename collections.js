'use strict';
/* Collections: named lists in any order — a wishlist of things to buy, capsule wardrobes, "summer trip", etc.
   An entry is either a closet piece {kind:'item',itemId} or something you don't own yet {kind:'wish',name,brand,price,url,img,notes,got}.
   Saved per profile in meta {id:'collections', data:[{id,name,emoji,entries:[…]}]}. Also: drag-to-reorder helper and the closet's "My order" sort. */

NAV.splice(NAV.indexOf('moods')+1,0,'collections');
let COLS=null;
async function loadCols(){if(COLS&&COLS.pid===curProf?.id)return COLS.list;const m=(await DB.all('meta')).find(x=>x.id==='collections');
 const list=m?.data||[];if(!list.length)list.push({id:uid(),name:t('wishlist'),emoji:'✨',entries:[]});COLS={pid:curProf?.id,list};return list}
const saveCols=()=>DB.put('meta',{id:'collections',data:COLS.list});
HOOKS.loaded.push(()=>{if(COLS&&COLS.pid!==curProf?.id)COLS=null});
st.col=null;

/* ---- drag to reorder: works with mouse and touch (drag by the ≡ handle) ---- */
function sortable(box,sel,onDone){box.addEventListener('pointerdown',e=>{const h=e.target.closest('.drag-h');if(!h||!box.contains(h))return;const el=h.closest(sel);if(!el)return;
 e.preventDefault();try{h.setPointerCapture(e.pointerId)}catch(err){}el.classList.add('dragging');
 const mv=m=>{const over=document.elementFromPoint(m.clientX,m.clientY)?.closest(sel);if(!over||over===el||over.parentNode!==el.parentNode)return;
  const r=over.getBoundingClientRect(),after=(r.width>r.height*1.6?m.clientY>r.top+r.height/2:(m.clientY>r.bottom-6||(m.clientY>r.top&&m.clientX>r.left+r.width/2)));
  over.parentNode.insertBefore(el,after?over.nextSibling:over)};
 const up=()=>{h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);el.classList.remove('dragging');
  h.addEventListener('click',ev=>{ev.stopPropagation();ev.preventDefault()},{capture:true,once:true}); // the drag isn't a tap on the piece
  onDone([...el.parentNode.querySelectorAll(':scope > '+sel)].map(x=>x.dataset.id),el.parentNode)};
 h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up)})}
const dragH=()=>`<span class="drag-h" title="${t('dragMe')}">⠿</span>`;

/* ---- collections page ---- */
async function renderCollections(){const list=await loadCols();let c=list.find(x=>x.id===st.col)||list[0];st.col=c.id;
 const eImg=e=>e.kind==='item'?itemById(e.itemId)?.img:e.img,eName=e=>e.kind==='item'?(itemById(e.itemId)?.name||catName(itemById(e.itemId)?.category||'')):e.name;
 const total=c.entries.filter(e=>e.kind==='wish'&&!e.got).reduce((s,e)=>s+(parseFloat(e.price)||0),0);
 $('#view').innerHTML=`<div class="page"><div class="page-h"><div><h1>${t('collections')}</h1><p class="muted">${t('colSub')}</p></div>
  <button class="btn ghost" id="colNew">${ic('plus',15)} ${t('colNew')}</button></div>
  <div class="col-tabs" id="colTabs">${list.map(x=>`<button class="col-tab ${x===c?'on':''}" data-id="${x.id}">${dragH()}<span>${esc(x.emoji||'•')} ${esc(x.name)}</span><small>${x.entries.length}</small></button>`).join('')}</div>
  <div class="col-head"><div><h2>${esc(c.emoji||'')} ${esc(c.name)}</h2>${total?`<span class="muted sm">${t('colTotal',{n:total.toLocaleString()})}</span>`:''}</div><span class="sp"></span>
   <button class="btn ghost sm" id="colAddItem">${ic('plus',14)} ${t('colAddCloset')}</button><button class="btn sm" id="colAddWish">${ic('plus',14)} ${t('colAddWish')}</button>
   <button class="icon-btn" id="colEdit" title="${t('edit')}">${ic('text',16)}</button></div>
  ${c.entries.length?`<div class="col-grid" id="colGrid">${c.entries.map(e=>{const img=eImg(e);return `<div class="col-e ${e.got?'got':''}" data-id="${e.id}">${dragH()}
   <div class="col-img">${img?`<img src="${img}" alt="" loading="lazy">`:'<span>?</span>'}</div>
   <div class="col-m"><b>${esc(eName(e)||'—')}</b><span>${esc(e.kind==='item'?t('colOwned'):[e.brand,e.price&&(e.price+'')].filter(Boolean).join(' · ')||t('colWish'))}</span></div>
   ${e.kind==='wish'?`<span class="col-badge">${e.got?'✓ '+t('colGot'):t('colWish')}</span>`:''}</div>`}).join('')}</div>
   <p class="muted sm col-hint">${t('colHint')}</p>`
  :`<div class="empty"><div class="big">${esc(c.emoji||'✨')}</div><p>${t('colEmpty')}</p></div>`}</div>`;
 $('#colNew').onclick=()=>editCol(null);$('#colEdit').onclick=()=>editCol(c);
 $('#colTabs').onclick=e=>{if(e.target.closest('.drag-h'))return;const b=e.target.closest('[data-id]');if(b){st.col=b.dataset.id;renderCollections()}};
 sortable($('#colTabs'),'.col-tab',async ids=>{COLS.list.sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id));await saveCols()});
 $('#colAddItem').onclick=()=>pickForCol(c);$('#colAddWish').onclick=()=>editWish(c,null);
 const g=$('#colGrid');if(!g)return;
 sortable(g,'.col-e',async ids=>{c.entries.sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id));await saveCols()});
 g.onclick=e=>{if(e.target.closest('.drag-h'))return;const el=e.target.closest('.col-e');if(!el)return;const en=c.entries.find(x=>x.id===el.dataset.id);
  if(en.kind==='item'){if(itemById(en.itemId))entryMenu(c,en);}else editWish(c,en)}}
VIEWS.collections=renderCollections;

function editCol(c){const isNew=!c;const md=modal(`<h2>${isNew?t('colNew'):t('colEditT')}</h2>
  <div class="form-grid" style="grid-template-columns:90px 1fr"><label class="fld"><span>${t('colEmoji')}</span><input id="ceE" maxlength="4" value="${esc(c?.emoji||'✨')}"></label>
  <label class="fld"><span>${t('colName')}</span><input id="ceN" value="${esc(c?.name||'')}" placeholder="${t('colNamePh')}"></label></div>
  <div class="md-f">${!isNew&&COLS.list.length>1?`<button class="btn ghost danger" id="ceDel">${ic('trash',14)} ${t('delete')}</button>`:''}<span class="sp"></span><button class="btn ghost" data-close>${t('cancel')}</button><button class="btn" id="ceOk">${t('save')}</button></div>`);
 $('#ceN',md).focus();
 $('#ceOk',md).onclick=async()=>{const name=$('#ceN',md).value.trim();if(!name)return $('#ceN',md).focus();const emoji=$('#ceE',md).value.trim();
  if(isNew){const n={id:uid(),name,emoji,entries:[]};COLS.list.push(n);st.col=n.id}else Object.assign(c,{name,emoji});await saveCols();closeModal();renderCollections()};
 if($('#ceDel',md))$('#ceDel',md).onclick=async()=>{if(!await askConfirm(t('confirmDelBoard',{n:c.name})))return;COLS.list=COLS.list.filter(x=>x!==c);st.col=null;await saveCols();renderCollections()}}
function pickForCol(c){const have=new Set(c.entries.filter(e=>e.kind==='item').map(e=>e.itemId)),sel=new Set();
 const md=modal(`<h2>${t('colAddCloset')}</h2><div class="search sm" style="max-width:none;margin-bottom:12px">${ic('search',15)}<input id="pcQ" placeholder="${t('search')}"></div>
  <div class="pick-grid du-grid" id="pcGrid"></div><div class="md-f"><button class="btn ghost" data-close>${t('cancel')}</button><button class="btn" id="pcOk">${t('add')}</button></div>`,{wide:true});
 const draw=()=>{const q=$('#pcQ',md).value.trim().toLowerCase();$('#pcGrid',md).innerHTML=st.items.filter(i=>!have.has(i.id)&&(!q||[i.name,i.brand,catName(i.category)].join(' ').toLowerCase().includes(q)))
  .map(i=>`<button class="pick ${sel.has(i.id)?'on':''}" data-id="${i.id}"><img src="${i.img}" alt="" style="object-fit:contain;padding:6px"><span>${esc(i.name||catName(i.category))}</span><i class="du-ck">✓</i></button>`).join('')};
 draw();$('#pcQ',md).oninput=draw;
 $('#pcGrid',md).onclick=e=>{const p=e.target.closest('.pick');if(!p)return;const id=p.dataset.id;sel.has(id)?sel.delete(id):sel.add(id);p.classList.toggle('on')};
 $('#pcOk',md).onclick=async()=>{for(const id of sel)c.entries.push({id:uid(),kind:'item',itemId:id});await saveCols();closeModal();toast(t('colAdded',{n:sel.size}));renderCollections()}}
function entryMenu(c,en){const it=itemById(en.itemId);const md=modal(`<h2>${esc(it.name||catName(it.category))}</h2>
  <div class="md-f"><button class="btn ghost danger" id="emRm">${t('colRemove')}</button><span class="sp"></span><button class="btn ghost" id="emOpen">${t('colOpenPiece')}</button><button class="btn" data-close>${t('close')}</button></div>`);
 $('#emRm',md).onclick=async()=>{c.entries=c.entries.filter(x=>x!==en);await saveCols();closeModal();renderCollections()};
 $('#emOpen',md).onclick=()=>{closeModal();if(st.items.includes(it))openItem(it.id);else toast(t('archiveV'))}}
function editWish(c,en){const isNew=!en,d={img:en?.img||''};
 const md=modal(`<h2>${isNew?t('colAddWish'):t('colEditWish')}</h2><div class="wish-f"><button type="button" class="wish-ph" id="wPh">${d.img?`<img src="${d.img}" alt="">`:`${ic('image',22)}<span>${t('colPhoto')}</span>`}</button>
  <div><label class="fld"><span>${t('colName')}</span><input id="wN" value="${esc(en?.name||'')}" placeholder="${t('colWishPh')}"></label>
  <div class="form-grid"><label class="fld"><span>${t('brand')}</span><input id="wB" list="brandList" value="${esc(en?.brand||'')}">${brandDatalist()}</label><label class="fld"><span>${t('colPrice')}</span><input id="wP" inputmode="decimal" value="${esc(en?.price||'')}"></label></div>
  <label class="fld"><span>${t('colLink')}</span><input id="wU" type="url" placeholder="https://…" value="${esc(en?.url||'')}"></label>
  <label class="fld"><span>${t('notes')}</span><textarea id="wT" rows="2">${esc(en?.notes||'')}</textarea></label>
  ${!isNew?`<label class="ck"><input type="checkbox" id="wG" ${en.got?'checked':''}> ${t('colGotIt')}</label>`:''}
  ${en?.url?`<p class="sm"><a href="${esc(en.url)}" target="_blank" rel="noopener">${t('colOpenLink')} ↗</a></p>`:''}</div></div>
  <p class="muted sm" id="wMsg"></p>
  <div class="md-f">${!isNew?`<button class="btn ghost danger" id="wDel">${t('colRemove')}</button>`:''}<span class="sp"></span><button class="btn ghost" data-close>${t('cancel')}</button><button class="btn" id="wOk">${t('save')}</button></div>`,{wide:true});
 $('#wPh',md).onclick=async()=>{const[f]=await pickFiles({multiple:false});if(!f)return;$('#wMsg',md).textContent=t('processing',{i:1,n:1});
  try{const p=await processFile(f);d.img=p.img;$('#wPh',md).innerHTML=`<img src="${d.img}" alt="">`}catch(err){console.warn(err)}$('#wMsg',md).textContent=''};
 $('#wOk',md).onclick=async()=>{const name=$('#wN',md).value.trim();if(!name&&!d.img)return $('#wN',md).focus();
  const url=$('#wU',md).value.trim(),rec={name,brand:$('#wB',md).value.trim(),price:$('#wP',md).value.trim(),url:/^https?:\/\//i.test(url)?url:'',notes:$('#wT',md).value.trim(),img:d.img,got:!!$('#wG',md)?.checked};
  if(isNew)c.entries.push({id:uid(),kind:'wish',...rec});else Object.assign(en,rec);await saveCols();closeModal();renderCollections()};
 if($('#wDel',md))$('#wDel',md).onclick=async()=>{c.entries=c.entries.filter(x=>x!==en);await saveCols();closeModal();renderCollections()}}

// piece window: add this piece to a collection
HOOKS.itemExtrasHTML.push(()=>`<button class="btn ghost sm" id="toCol" style="margin-top:10px;margin-inline-start:6px">${ic('plus',13)} ${t('colAddTo')}</button>`);
HOOKS.itemExtrasWire.push((md,it)=>{$('#toCol',md).onclick=async e=>{const list=await loadCols();let m=$('#colMenu',md);if(m){m.remove();return}
 e.currentTarget.insertAdjacentHTML('afterend',`<div id="colMenu" class="chips" style="margin-top:8px">${list.map(c=>`<button class="chip ${c.entries.some(x=>x.itemId===it.id)?'on':''}" data-c="${c.id}">${esc(c.emoji||'')} ${esc(c.name)}</button>`).join('')}</div>`);
 $('#colMenu',md).onclick=async ev=>{const b=ev.target.closest('[data-c]');if(!b)return;const c=list.find(x=>x.id===b.dataset.c),ex=c.entries.find(x=>x.itemId===it.id);
  if(ex)c.entries=c.entries.filter(x=>x!==ex);else c.entries.push({id:uid(),kind:'item',itemId:it.id});b.classList.toggle('on',!ex);await saveCols();toast(ex?t('colRemoved'):t('colAdded',{n:1}))}}});

/* ---- closet: "My order" sort, rearranged by dragging inside each section ---- */
SORTS.custom=(a,b)=>(a.order??-a.created/1e13)-(b.order??-b.created/1e13)||b.created-a.created;
HOOKS.loaded.push(where=>{if(where!=='closet')return;const g=$('#grid');if(!g)return;
 g.classList.toggle('reorder',st.f.sort==='custom'&&!window.BULK?.on);
 if(st.f.sort==='custom'&&!g.dataset.sortable){g.dataset.sortable=1;
  sortable(g,'.card',async ids=>{const list=ids.map(itemById).filter(Boolean);list.forEach((it,i)=>it.order=i);await Promise.all(list.map(it=>DB.put('items',it)))})}});
HOOKS.cardBadges.push(()=>st.view==='closet'&&st.f.sort==='custom'&&!window.BULK?.on?dragH():'');
const _renderGridCol=renderGrid;
renderGrid=function(){_renderGridCol();const g=$('#grid');if(g)g.classList.toggle('reorder',st.f.sort==='custom'&&!window.BULK?.on)};
// switching to "My order" needs the drag wiring, so re-render the closet
document.addEventListener('change',e=>{if(e.target.id==='sort'&&st.view==='closet'){st.f.sort=e.target.value;renderCloset()}},true);

Object.assign(S.en,{collections:'Collections',colSub:'Wishlist, capsules, trips — any list, in your order',wishlist:'Wishlist',colNew:'New collection',colEditT:'Edit collection',colEmoji:'Icon',colName:'Name',colNamePh:'e.g. Summer capsule',
 colAddCloset:'Add from closet',colAddWish:'Add something to buy',colEditWish:'Edit',colOwned:'In your closet',colWish:'To buy',colGot:'Got it',colGotIt:'I bought it',colTotal:'Still to buy: {n}',
 colEmpty:'Empty for now. Add pieces from your closet or things you want to buy.',colHint:'Drag ⠿ to change the order.',colAdded:'Added {n}',colRemoved:'Removed',colRemove:'Remove from list',colOpenPiece:'Open piece',
 colPhoto:'Photo',colWishPh:'e.g. Brown suede loafers',colPrice:'Price',colLink:'Link',colOpenLink:'Open link',colAddTo:'Add to collection',dragMe:'Drag to reorder',sortCustom:'My order'});
Object.assign(S.ar,{collections:'الكوليكشنز',colSub:'الويش ليست، كبسولات، سفريات — أي ليستة وبالترتيب اللي يعجبك',wishlist:'الويش ليست',colNew:'كوليكشن جديد',colEditT:'تعديل الكوليكشن',colEmoji:'أيقونة',colName:'الاسم',colNamePh:'مثلًا: كبسولة الصيف',
 colAddCloset:'ضيف من دولابي',colAddWish:'ضيف حاجة عايز أشتريها',colEditWish:'تعديل',colOwned:'في دولابك',colWish:'هشتريها',colGot:'اشتريتها',colGotIt:'اشتريتها خلاص',colTotal:'لسه هتشتري بـ: {n}',
 colEmpty:'فاضي دلوقتي. ضيف قطع من دولابك أو حاجات عايز تشتريها.',colHint:'اسحب ⠿ عشان تغير الترتيب.',colAdded:'اتضاف {n}',colRemoved:'اتشال',colRemove:'شيلها من الليستة',colOpenPiece:'افتح القطعة',
 colPhoto:'صورة',colWishPh:'مثلًا: لوفر شامواه بني',colPrice:'السعر',colLink:'اللينك',colOpenLink:'افتح اللينك',colAddTo:'ضيف لكوليكشن',dragMe:'اسحب لتغيير الترتيب',sortCustom:'ترتيبي'});
document.head.insertAdjacentHTML('beforeend',`<style>
.drag-h{cursor:grab;touch-action:none;user-select:none;color:var(--muted);font-size:16px;line-height:1;padding:4px 6px;border-radius:8px}.drag-h:hover{background:var(--card);color:var(--ink)}
.dragging{opacity:.55;transform:scale(.97);transition:transform .1s}
.col-tabs{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding-bottom:4px;margin-bottom:22px}.col-tabs::-webkit-scrollbar{display:none}
.col-tab{flex:none;display:flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--bg);border-radius:999px;padding:5px 14px 5px 6px;font-weight:600}
.col-tab small{color:var(--muted);font-weight:500}.col-tab.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}.col-tab.on .drag-h,.col-tab.on small{color:inherit;opacity:.6}
.col-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:16px}.col-head h2{margin:0;font-size:22px}.col-head .sp{flex:1}
.col-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px}
.col-e{position:relative;border:1px solid var(--line);border-radius:18px;background:var(--bg);overflow:hidden;cursor:pointer;display:flex;flex-direction:column}
.col-e .drag-h{position:absolute;top:8px;inset-inline-start:8px;z-index:2;background:var(--bg);box-shadow:0 1px 4px rgba(0,0,0,.15)}
.col-img{aspect-ratio:4/5;background:var(--card);display:grid;place-items:center;position:relative}.col-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:14px}
.col-m{padding:10px 12px 12px;display:flex;flex-direction:column;gap:2px}.col-m b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.col-m span{font-size:11.5px;color:var(--muted)}
.col-badge{position:absolute;top:10px;inset-inline-end:10px;background:#c9a227;color:#111;border-radius:999px;padding:2px 9px;font-size:10.5px;font-weight:700}
.col-e.got .col-img{opacity:.5}.col-e.got .col-badge{background:#2f8f4e;color:#fff}
.col-hint{margin-top:14px}
.wish-f{display:grid;grid-template-columns:200px 1fr;gap:18px}
.wish-ph{aspect-ratio:4/5;border:1.5px dashed var(--line);border-radius:16px;background:var(--card);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--muted);position:relative;overflow:hidden}
.wish-ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:10px}
.ck{display:flex;gap:8px;align-items:center;font-size:13.5px;margin:4px 0 10px}
#grid.reorder .card{position:relative}#grid.reorder .card .drag-h{position:absolute;top:8px;inset-inline-end:8px;z-index:3;background:var(--bg);box-shadow:0 1px 4px rgba(0,0,0,.18)}
@media (max-width:760px){.wish-f{grid-template-columns:1fr}.wish-ph{max-width:180px;margin:0 auto;width:100%}.col-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}
</style>`);
