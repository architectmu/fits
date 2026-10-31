'use strict';
/* Archive: pieces taken out of the closet for now (sold, stored, lent, given away) without deleting them.
   An archived piece keeps it.archived={on:true,why,date}; it is held in st.archived instead of st.items, so the closet,
   stylist and editors don't offer it, while old outfits that use it still show it. Restore puts it back. */

const ARCH_WHY=['sold','stored','lent','donated','other'];
st.archived=[];
const _loadAllArch=loadAll;
loadAll=async function(){await _loadAllArch();st.archived=st.items.filter(i=>i.archived?.on);st.items=st.items.filter(i=>!i.archived?.on)};

async function archiveItems(list,why='stored'){const date=ymd(new Date());
 for(const it of list){it.archived={on:true,why,date};st.items=st.items.filter(i=>i!==it);if(!st.archived.includes(it))st.archived.push(it);await DB.put('items',it)}}
async function restoreItems(list){for(const it of list){delete it.archived;st.archived=st.archived.filter(i=>i!==it);if(!st.items.includes(it))st.items.push(it);await DB.put('items',it)}}
function askArchiveWhy(n){return new Promise(res=>{const md=modal(`<h2>${t('arTitle',{n})}</h2><p class="muted sm" style="margin:-8px 0 14px">${t('arSub')}</p>
  <div class="chips ar-why">${ARCH_WHY.map((w,i)=>`<button class="chip ${i===1?'on':''}" data-w="${w}">${t('arw_'+w)}</button>`).join('')}</div>
  <div class="md-f"><button class="btn ghost" data-close>${t('cancel')}</button><button class="btn" id="arOk">📦 ${t('arMove')}</button></div>`);
 $('#modal-root').onclose=()=>res(null);
 $('.ar-why',md).onclick=e=>{const b=e.target.closest('[data-w]');if(!b)return;$$('.ar-why .chip',md).forEach(x=>x.classList.toggle('on',x===b))};
 $('#arOk',md).onclick=()=>{const w=$('.ar-why .chip.on',md)?.dataset.w||'other';$('#modal-root').onclose=null;closeModal();res(w)}})}

// piece window: "Move to archive"
HOOKS.itemExtrasHTML.push(it=>`<button class="btn ghost sm" id="toArch" style="margin-top:10px">📦 ${t('arMove')}</button>`);
HOOKS.itemExtrasWire.push((md,it)=>{$('#toArch',md).onclick=async()=>{closeModal();const w=await askArchiveWhy(1);if(!w)return;await archiveItems([it],w);toast(t('arDone',{n:1}));renderCloset()}});
// selection bar: archive the selected pieces
const _drawBulkBarArch=drawBulkBar;
drawBulkBar=function(){_drawBulkBarArch();const del=$('#bulkBar [data-b="del"]');if(del&&!$('#bulkBar [data-b="arch"]'))del.insertAdjacentHTML('beforebegin',`<button class="btn ghost sm" data-b="arch" ${BULK.sel.size?'':'disabled'}>📦 ${t('arMove')}</button>`)};
const _onBulkClickArch=onBulkClick;
onBulkClick=async function(e){if(e.target.closest('button[data-b="arch"]')){const list=selItems();const w=await askArchiveWhy(list.length);if(!w)return;
  await archiveItems(list,w);toast(t('arDone',{n:list.length}));BULK.stop();return}return _onBulkClickArch(e)};
// closet sidebar link
HOOKS.sideGroups.push(items=>items&&st.archived.length?`<div class="fg"><button class="cat" id="goArch">📦 ${t('archiveV')}<span>${st.archived.length}</span></button></div>`:'');
HOOKS.loaded.push(where=>{if(where!=='closet')return;$('#side')?.addEventListener('click',e=>{if(e.target.closest('#goArch')){e.stopPropagation();setView('archive')}},true)});

function renderArchive(){const list=st.archived.slice().sort((a,b)=>(b.archived?.date||'').localeCompare(a.archived?.date||''));
 $('#view').innerHTML=`<div class="page"><div class="page-h"><div><h1>📦 ${t('archiveV')}</h1><p class="muted">${t('arPageSub')}</p></div>
  <button class="btn ghost" id="arBack">${ic('back',15,'rtl-flip')} ${t('closet')}</button></div>
  ${list.length?`<div class="grid ar-grid">${list.map(it=>`<div class="card" data-id="${it.id}"><div class="card-img"><img src="${it.img}" loading="lazy" alt=""></div>
   <span class="ar-tag">${t('arw_'+(it.archived?.why||'other'))}</span>
   <div class="card-meta"><b>${esc(it.name||catName(it.category))}</b><span>${esc([it.brand,it.archived?.date&&fmtDay(it.archived.date)].filter(Boolean).join(' · '))}&nbsp;</span></div>
   <div class="ar-acts"><button class="btn sm" data-r>${t('arRestore')}</button><button class="btn ghost sm danger" data-d title="${t('delete')}">${ic('trash',14)}</button></div></div>`).join('')}</div>`
  :`<div class="empty"><div class="big">📦</div><p>${t('arEmpty')}</p></div>`}</div>`;
 $('#arBack').onclick=()=>setView('closet');
 $('.ar-grid')?.addEventListener('click',async e=>{const c=e.target.closest('.card');if(!c)return;const it=st.archived.find(i=>i.id===c.dataset.id);
  if(e.target.closest('[data-r]')){await restoreItems([it]);toast(t('arRestored'));renderArchive()}
  else if(e.target.closest('[data-d]')){if(!await askConfirm(t('confirmDelItem')))return;st.archived=st.archived.filter(i=>i!==it);st.items.push(it);await deleteItem(it.id);renderArchive()}})}
const fmtDay=d=>new Intl.DateTimeFormat(lang==='ar'?'ar-EG':'en',{day:'numeric',month:'short',year:'numeric'}).format(new Date(d+'T12:00'));
VIEWS.archive=renderArchive;
(window.MORE_EXTRA=window.MORE_EXTRA||[]).push('archive');

Object.assign(S.en,{archive:'Archive',archiveV:'Archive',arMove:'Move to archive',arTitle:'Archive {n} piece(s)',arSub:'They leave your closet and suggestions, but nothing is deleted — you can bring them back any time.',
 arw_sold:'Sold',arw_stored:'Stored away',arw_lent:'Lent',arw_donated:'Given away',arw_other:'Other',arDone:'{n} moved to the archive',arRestore:'Back to closet',arRestored:'Back in your closet',
 arPageSub:'Pieces you took out of your closet. Old outfits still show them.',arEmpty:'Nothing archived. Open a piece and choose “Move to archive”.'});
Object.assign(S.ar,{archive:'الأرشيف',archiveV:'الأرشيف',arMove:'انقل للأرشيف',arTitle:'أرشفة {n} قطعة',arSub:'هتختفي من دولابك ومن الاقتراحات، بس مش هتتمسح — وترجعها وقت ما تحب.',
 arw_sold:'اتباعت',arw_stored:'متخزنة',arw_lent:'سلفتها',arw_donated:'اتبرعت بيها',arw_other:'سبب تاني',arDone:'{n} اتنقلت للأرشيف',arRestore:'رجّعها للدولاب',arRestored:'رجعت لدولابك',
 arPageSub:'القطع اللي شلتها من دولابك. الأوتفيتات القديمة لسه بتظهرها.',arEmpty:'مفيش حاجة في الأرشيف. افتح أي قطعة واختار «انقل للأرشيف».'});
document.head.insertAdjacentHTML('beforeend',`<style>
.ar-grid .card{position:relative}.ar-grid .card-img{opacity:.85}
.ar-tag{position:absolute;top:10px;inset-inline-start:10px;background:var(--bg);border-radius:999px;padding:3px 10px;font-size:11px;font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,.15)}
.ar-acts{display:flex;gap:6px;padding:6px 4px 2px}.ar-acts .btn:first-child{flex:1;justify-content:center}
</style>`);
