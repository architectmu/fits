'use strict';
/* Closet tools: usage filters and sorts, bulk select & edit, duplicate finder. */

/* ---- usage filters (outfits + calendar wear history) ---- */
st.f.usage='';
const outfitUseCount=id=>st.boards.filter(b=>b.type==='outfit'&&b.elements.some(e=>e.itemId===id)).length;
HOOKS.itemFilter.push((it,f)=>{if(!f.usage)return true;const used=outfitUseCount(it.id);
 if(f.usage==='unused')return !used;if(f.usage==='used')return used>0;
 const w=wornMap()[it.id];if(f.usage==='never')return !w;if(f.usage==='stale')return !w||daysSince(w.last)>60;return true});
HOOKS.sideGroups.push((items,f)=>{if(!items)return !!f.usage;
 const opts=['used','unused','never','stale'];
 return `<div class="fg"><h4>${t('usage')}</h4><div class="chips">${opts.map(o=>`<button class="chip ${f.usage===o?'on':''}" data-usage="${o}">${t('use_'+o)}</button>`).join('')}</div></div>`});
/* sizes: searchable and filterable */
st.f.sizes=new Set();
HOOKS.itemSearchText.push(it=>it.size||'');
HOOKS.itemFilter.push((it,f)=>!f.sizes.size||f.sizes.has(it.size||''));
HOOKS.sideGroups.push((items,f)=>{if(!items)return f.sizes.size>0;const c={};items.forEach(i=>{if(i.size)c[i.size]=(c[i.size]||0)+1});const ks=Object.keys(c);
 if(!ks.length)return '';ks.sort((a,b)=>(parseFloat(a)||0)-(parseFloat(b)||0)||a.localeCompare(b));
 return `<div class="fg"><h4>${t('sizes')}</h4><div class="chips">${ks.map(s=>`<button class="chip ${f.sizes.has(s)?'on':''}" data-size="${esc(s)}">${esc(s)}<small>${c[s]}</small></button>`).join('')}</div></div>`});
Object.assign(SORTS,{used:(a,b)=>outfitUseCount(b.id)-outfitUseCount(a.id),worn:(a,b)=>{const m=wornMap();return (m[b.id]?.n||0)-(m[a.id]?.n||0)}});

/* ---- bulk select & edit ---- */
const BULK={on:false,sel:new Set(),
 toggle(id){this.sel.has(id)?this.sel.delete(id):this.sel.add(id);$(`.card[data-id="${id}"] .bsel`)?.classList.toggle('on',this.sel.has(id));drawBulkBar()},
 start(){this.on=true;this.sel.clear();renderCloset()},
 stop(){this.on=false;this.sel.clear();$('#bulkBar')?.remove();renderCloset()}};
window.BULK=BULK;
// leaving the closet (tabs or profile switch) ends selection mode
['nav','profBtn'].forEach(id=>document.getElementById(id).addEventListener('click',()=>{if(BULK.on){BULK.on=false;BULK.sel.clear();$('#bulkBar')?.remove()}},true));
HOOKS.cardBadges.push(it=>BULK.on?`<span class="bsel ${BULK.sel.has(it.id)?'on':''}">✓</span>`:'');
HOOKS.closetTools.push(()=>`<button class="btn ghost ${BULK.on?'on':''}" id="bulkBtn">${ic('copy',15)} ${BULK.on?t('done'):t('select')}</button><button class="btn ghost" id="dupBtn" title="${t('dupFind')}">${t('dupShort')}</button>`);
HOOKS.loaded.push(where=>{if(where!=='closet')return;
 $('#bulkBtn').onclick=()=>BULK.on?BULK.stop():BULK.start();$('#dupBtn').onclick=openDuplicates;
 $('#side').addEventListener('click',e=>{const u=e.target.closest('[data-usage]');if(u)st.f.usage=st.f.usage===u.dataset.usage?'':u.dataset.usage;
  const z=e.target.closest('[data-size]');if(z){const s=st.f.sizes,v=z.dataset.size;s.has(v)?s.delete(v):s.add(v)}
  if(e.target.closest('#clearF')){st.f.usage='';st.f.sizes.clear()}},true);
 $('.closet').classList.toggle('bulk',BULK.on);drawBulkBar()});
function drawBulkBar(){let bar=$('#bulkBar');if(!BULK.on){bar?.remove();return}
 if(!bar){bar=document.createElement('div');bar.id='bulkBar';document.body.appendChild(bar);bar.onclick=onBulkClick;bar.onchange=onBulkChange}
 const n=BULK.sel.size;
 bar.innerHTML=`<b>${t('nSelected',{n})}</b><button class="btn ghost sm" data-b="all">${t('selectAllShown')}</button><button class="btn ghost sm" data-b="none">${t('clearSel')}</button><span class="dv"></span>
  <select class="sel sm" data-b="cat" ${n?'':'disabled'}><option value="">${t('setCategory')}</option>${catOptions('')}</select>
  <select class="sel sm" data-b="season" ${n?'':'disabled'}><option value="">${t('addSeason')}</option>${SEASONS.map(s=>`<option value="${s[0]}">${esc(L(s))}</option>`).join('')}</select>
  <button class="btn ghost sm" data-b="brand" ${n?'':'disabled'}>${t('setBrand')}</button>
  <button class="btn ghost sm" data-b="size" ${n?'':'disabled'}>${t('setSize')}</button>
  <button class="btn ghost sm" data-b="fav" ${n?'':'disabled'}>♥ ${t('favorites')}</button>
  ${window.studioBulk&&selItems().some(canStudio)?`<button class="btn ghost sm" data-b="studio">✨ ${t('studioBtn')}</button><button class="btn ghost sm" data-b="gkey" title="${t('gkTitle')}">🔑</button>`:''}
  ${window.replaceFromFiles?`<button class="btn ghost sm" data-b="rphotos" ${n?'':'disabled'}>${ic('upload',13)} ${t('rpBtn')}</button>`:''}
  <button class="btn ghost sm" data-b="outfit" ${n?'':'disabled'}>${ic('plus',13)} ${t('makeOutfit')}</button>
  <button class="btn ghost sm danger" data-b="del" ${n?'':'disabled'}>${ic('trash',13)} ${t('delete')}</button>
  <span class="sp"></span><button class="btn sm" data-b="done">${t('done')}</button>`}
const selItems=()=>[...BULK.sel].map(itemById).filter(Boolean);
async function saveItems(list){for(const it of list)await DB.put('items',it)}
async function onBulkClick(e){const a=e.target.closest('button[data-b]')?.dataset.b;if(!a)return;const list=selItems();
 if(a==='all'){filtered().forEach(i=>BULK.sel.add(i.id));renderCloset();return}
 if(a==='none'){BULK.sel.clear();renderCloset();return}
 if(a==='done'){BULK.stop();return}
 if(a==='brand'){const v=await askText(t('setBrand'));if(v==null)return;list.forEach(i=>i.brand=v);await saveItems(list);toast(t('bulkDone',{n:list.length}));renderCloset();return}
 if(a==='size'){const v=await askText(t('setSize'));if(v==null)return;list.forEach(i=>i.size=v.slice(0,20));await saveItems(list);toast(t('bulkDone',{n:list.length}));renderCloset();return}
 if(a==='fav'){const on=!list.every(i=>i.fav);list.forEach(i=>i.fav=on);await saveItems(list);toast(t('bulkDone',{n:list.length}));renderCloset();return}
 if(a==='studio'){await studioBulk(list);drawBulkBar();return}
 if(a==='gkey'){await askGeminiKey();return}
 if(a==='rphotos'){await replaceFromFiles(list);drawBulkBar();return}
 if(a==='outfit'){const b=await newOutfitFromItems(list);BULK.on=false;BULK.sel.clear();$('#bulkBar')?.remove();st.view='outfits';openEditor(b.id);return}
 if(a==='del'){if(!await askConfirm(t('bulkDelConfirm',{n:list.length})))return;for(const it of list)await deleteItem(it.id);BULK.sel.clear();toast(t('bulkDone',{n:list.length}));renderCloset()}}
async function onBulkChange(e){const a=e.target.dataset.b,v=e.target.value;if(!v)return;const list=selItems();
 if(a==='cat')list.forEach(i=>i.category=v);
 if(a==='season')list.forEach(i=>i.seasons=[...new Set([...(i.seasons||[]),v])]);
 await saveItems(list);toast(t('bulkDone',{n:list.length}));renderCloset()}

/* ---- duplicate finder: perceptual hash of the cut-out photo + same garment slot ---- */
const hashCache=new Map();
async function dHash(it){const key=it.id+':'+it.img.length;if(hashCache.has(key))return hashCache.get(key);
 const img=await loadImg(it.img),c=mkCanvas(9,8),x=c.getContext('2d',{willReadFrequently:true});x.fillStyle='#fff';x.fillRect(0,0,9,8);x.drawImage(img,0,0,9,8);
 const d=x.getImageData(0,0,9,8).data,g=i=>d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11;let bits='';
 for(let y=0;y<8;y++)for(let xx=0;xx<8;xx++)bits+=g(y*9+xx)>g(y*9+xx+1)?'1':'0';
 hashCache.set(key,bits);return bits}
const hamming=(a,b)=>{let n=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])n++;return n};
async function findDuplicates(){const items=st.items,hs={};for(const it of items)hs[it.id]=await dHash(it);
 const ignore=new Set(st.settings.notDup||[]),parent={},find=x=>parent[x]===x?x:(parent[x]=find(parent[x]));items.forEach(i=>parent[i.id]=i.id);
 const why={};
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const a=items[i],b=items[j];if(slotOf(a)!==slotOf(b))continue;
  if(ignore.has([a.id,b.id].sort().join('|')))continue;
  const sameName=a.name&&a.name.trim().toLowerCase()===(b.name||'').trim().toLowerCase()&&(a.brand||'')===(b.brand||'');
  // the hash compares shape only, so a photo match also needs the same main colour (or no colours recorded)
  const dist=hamming(hs[a.id],hs[b.id]),ca=(a.colors||[])[0],cb=(b.colors||[])[0],sameColor=ca&&ca===cb,colorOk=sameColor||!ca||!cb;
  if(sameName||(dist<=6&&colorOk)||(dist<=10&&sameColor&&a.category===b.category)){parent[find(a.id)]=find(b.id);why[a.id]=why[b.id]=sameName?'name':dist<=6?'photo':'similar'}}
 const groups={};items.forEach(i=>{const r=find(i.id);(groups[r]=groups[r]||[]).push(i)});
 return Object.values(groups).filter(g=>g.length>1).map(g=>({items:g,why:why[g[0].id]}))}
async function openDuplicates(){const md=modal(`<h2>${t('dupFind')}</h2><p class="muted" id="dupMsg">${t('dupScanning')}</p><div id="dupList"></div>
  <div class="md-f"><button class="btn ghost" data-close>${t('close')}</button></div>`,{wide:true});
 const groups=await findDuplicates();const list=$('#dupList',md);if(!list)return;
 $('#dupMsg',md).textContent=groups.length?t('dupFound',{n:groups.length}):t('dupNone');
 list.innerHTML=groups.map((g,gi)=>`<div class="dup-g" data-g="${gi}"><div class="dup-h"><b>${t('dupWhy_'+g.why)}</b><span class="sp"></span><button class="btn ghost sm" data-ignore="${gi}">${t('notDup')}</button></div>
  <div class="dup-items">${g.items.map(it=>`<div class="dup-it"><img src="${it.img}" alt=""><b>${esc(it.name||catName(it.category))}</b><small>${esc(it.brand||'')} · ${esc(catPath(it.category))}</small>
  <div><button class="btn ghost sm" data-open="${it.id}">${t('edit')}</button><button class="btn ghost sm danger" data-del="${it.id}">${ic('trash',13)}</button></div></div>`).join('')}</div></div>`).join('');
 list.onclick=async e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.open){closeModal();openItem(b.dataset.open)}
  else if(b.dataset.del){const it=itemById(b.dataset.del);if(!await askConfirm(t('confirmDelItem')))return;await deleteItem(it.id);renderCloset();openDuplicates()}
  else if(b.dataset.ignore){const g=groups[+b.dataset.ignore],ids=g.items.map(i=>i.id),pairs=[];
   for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)pairs.push([ids[i],ids[j]].sort().join('|'));
   st.settings.notDup=[...new Set([...(st.settings.notDup||[]),...pairs])];await saveMeta();b.closest('.dup-g').remove()}}}

Object.assign(S.en,{sizes:'Sizes',setSize:'Set size'});Object.assign(S.ar,{sizes:'المقاسات',setSize:'غيّر المقاس'});
Object.assign(S.en,{usage:'Usage',use_used:'In outfits',use_unused:'Not in any outfit',use_never:'Never worn',use_stale:'Not worn in 60 days',sortUsed:'Most used in outfits',sortWorn:'Most worn',
 select:'Select',done:'Done',nSelected:'{n} selected',selectAllShown:'Select all shown',clearSel:'Clear',setCategory:'Set category…',addSeason:'Add season…',setBrand:'Set brand',
 makeOutfit:'Make outfit',bulkDone:'Updated {n} items',bulkDelConfirm:'Delete {n} items? They will also be removed from outfits.',
 dupFind:'Find duplicates',dupShort:'Duplicates',dupScanning:'Comparing photos…',dupFound:'{n} groups of possible duplicates',dupNone:'No duplicates found 👌',
 dupWhy_name:'Same name and brand',dupWhy_photo:'Almost identical photos',dupWhy_similar:'Very similar pieces',notDup:'Not duplicates'});
Object.assign(S.ar,{usage:'الاستخدام',use_used:'في أوتفيتات',use_unused:'مش في أي أوتفيت',use_never:'ما اتلبستش خالص',use_stale:'ما اتلبستش من 60 يوم',sortUsed:'الأكتر في الأوتفيتات',sortWorn:'الأكتر لبسًا',
 select:'تحديد',done:'خلصت',nSelected:'{n} متحدد',selectAllShown:'تحديد كل الظاهر',clearSel:'مسح',setCategory:'غيّر القسم…',addSeason:'ضيف موسم…',setBrand:'غيّر البراند',
 makeOutfit:'اعمل أوتفيت',bulkDone:'اتعدّل {n} قطعة',bulkDelConfirm:'تحذف {n} قطعة؟ هيتشالوا كمان من الأوتفيتات.',
 dupFind:'دوّر على المكرر',dupShort:'المكرر',dupScanning:'بقارن الصور…',dupFound:'{n} مجموعة ممكن تكون مكررة',dupNone:'مفيش قطع مكررة 👌',
 dupWhy_name:'نفس الاسم والبراند',dupWhy_photo:'صور شبه متطابقة',dupWhy_similar:'قطع شبه بعض جدًا',notDup:'مش مكررين'});

document.head.insertAdjacentHTML('beforeend',`<style>
.bsel{position:absolute;top:10px;inset-inline-start:10px;width:24px;height:24px;border-radius:50%;border:2px solid var(--line);background:var(--bg);color:transparent;display:grid;place-items:center;font-size:13px;font-weight:700}
.closet.bulk .card{cursor:pointer}.bsel.on{background:var(--ink);border-color:var(--ink);color:var(--bg)}.card:has(.bsel.on) .card-img{outline:2px solid var(--ink);outline-offset:2px}
#bulkBar{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:80;background:var(--bg);border:1px solid var(--line);box-shadow:0 12px 40px rgba(0,0,0,.18);border-radius:16px;padding:10px 14px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;max-width:calc(100vw - 32px)}
#bulkBar .dv{width:1px;height:22px;background:var(--line);margin:0 4px}#bulkBar .sp{flex:1;min-width:8px}.sel.sm{padding:5px 10px;font-size:12.5px}
.btn.on{background:var(--ink);color:var(--bg)}
.dup-g{border:1px solid var(--line);border-radius:14px;padding:12px;margin-bottom:12px}.dup-h{display:flex;align-items:center;margin-bottom:10px}.dup-h .sp{flex:1}
.dup-items{display:flex;gap:10px;flex-wrap:wrap}.dup-it{width:150px;display:flex;flex-direction:column;gap:3px}.dup-it img{width:150px;height:170px;object-fit:contain;background:var(--card);border-radius:10px;padding:8px}
.dup-it b{font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dup-it small{font-size:11px;color:var(--muted)}.dup-it div{display:flex;gap:4px;margin-top:3px}
</style>`);
