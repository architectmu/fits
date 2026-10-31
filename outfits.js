'use strict';
/* Outfits: details panel in the editor (style, occasion, seasons, rating, favourite, archive, notes, photos),
   colour harmony, alternatives for a piece, automatic flat-lay layout, and the Outfits page with filters. */

const outfitItems=b=>[...new Set((b?.elements||[]).filter(e=>e.kind==='item').map(e=>e.itemId))].map(itemById).filter(Boolean);
const stars=(n,cls='')=>`<span class="stars ${cls}">${[1,2,3,4,5].map(i=>`<i data-r="${i}" class="${i<=n?'on':''}">★</i>`).join('')}</span>`;

/* ---- automatic flat-lay: places pieces on the 1000×1000 outfit canvas by slot ---- */
async function layoutOutfit(items){
 const by={};items.forEach(it=>{const s=slotOf(it);(by[s]=by[s]||[]).push(it)});
 const hasOuter=!!by.outer;
 const boxes={outer:[40,50,410,560],top:hasOuter?[300,50,380,470]:[140,40,430,500],dress:[200,40,420,820],
  bottom:hasOuter?[320,500,340,470]:[170,520,370,450],shoes:[660,780,300,180]};
 const acc=[];const els=[];let z=1;
 const place=async(it,[bx,by_,bw,bh],zz)=>{const img=await loadImg(it.img),r=img.naturalWidth/img.naturalHeight;let w=bw,h=w/r;if(h>bh){h=bh;w=h*r}
  els.push({id:uid(),kind:'item',itemId:it.id,x:bx+(bw-w)/2,y:by_+(bh-h)/2,w,h,r:0,flip:false,z:zz})};
 for(const [slot,zz] of [['outer',2],['top',3],['dress',3],['bottom',2],['shoes',4]]){const list=by[slot];if(!list)continue;
  await place(list[0],boxes[slot],zz);list.slice(1).forEach(x=>acc.push(x))}
 for(const s of Object.keys(by))if(!boxes[s])acc.push(...by[s]);
 const col=[[700,50,260,150],[700,215,260,150],[700,380,260,150],[700,545,260,150],[40,640,220,150],[40,810,220,150]];
 for(let i=0;i<acc.length;i++){const b=col[i]||[60+((i-col.length)%4)*220,860,200,120];await place(acc[i],b,5+z++)}
 return els}
async function newOutfitFromItems(items,meta={}){
 const[W,H,bg]=SIZES.outfit,n=st.boards.filter(b=>b.type==='outfit').length+1;
 const els=meta.worn?(await dressUp(items.map(it=>({it,src:it.img})),{x:W*.06,y:H*.03,w:W*.88,h:H*.94})).map(o=>({id:uid(),kind:'item',itemId:o.e.it.id,x:o.x,y:o.y,w:o.w,h:o.h,r:0,flip:false,z:o.z}))
  :await layoutOutfit(items);
 const b={id:uid(),type:'outfit',name:meta.name||`${t('untitledOutfit')} ${n}`,W,H,bg,elements:els,thumb:'',
  style:meta.style||'',occasion:meta.occasion||'',seasons:meta.seasons||[],notes:meta.notes||'',rating:meta.rating||0,fav:!!meta.fav,archived:false,photos:[],
  created:Date.now(),updated:Date.now()};
 st.boards.push(b);await saveBoard(b);return b}

/* ---- alternatives: same slot, close in colour and formality ---- */
function alternativesFor(item,context=[]){
 const slot=slotOf(item),f=formalityOf(item),ctxCols=context.filter(c=>c.id!==item.id).map(c=>(c.colors||[])[0]).filter(Boolean),mc=(item.colors||[])[0];
 return st.items.filter(x=>x.id!==item.id&&slotOf(x)===slot).map(x=>{const xc=(x.colors||[])[0];
  const colorFit=ctxCols.length&&xc?ctxCols.reduce((s,c)=>s+pairScore(xc,c).s,0)/ctxCols.length:.6;
  const score=.35*(xc&&xc===mc?1:colorFit)+.35*(1-Math.min(1,Math.abs(formalityOf(x)-f)/3))+.2*(x.category===item.category?1:0)+.1*colorFit;
  return {x,score}}).sort((a,b)=>b.score-a.score).slice(0,8)}
function openAlternatives(item,onPick){
 const ctx=st.ed?outfitItems(board()):[],alts=alternativesFor(item,ctx);
 const md=modal(`<h2>${t('altTitle',{n:esc(item.name||catName(item.category))})}</h2>
  ${alts.length?`<div class="pick-grid">${alts.map(({x,score})=>`<button class="pick" data-id="${x.id}"><img src="${x.img}" alt="" style="object-fit:contain;padding:6px"><span>${esc(x.name||catName(x.category))}</span><small class="muted">${esc(x.brand||'')} · ${Math.round(score*100)}%</small></button>`).join('')}</div>`:`<p class="muted">${t('altNone')}</p>`}
  <div class="md-f"><button class="btn ghost" data-close>${t('close')}</button></div>`,{wide:true});
 md.onclick=e=>{const p=e.target.closest('.pick');if(!p)return;closeModal();onPick(itemById(p.dataset.id))}}
async function replaceInBoard(b,oldId,neu){
 for(const e of b.elements)if(e.kind==='item'&&e.itemId===oldId){const img=await loadImg(neu.img),r=img.naturalWidth/img.naturalHeight,cx=e.x+e.w/2,cy=e.y+e.h/2;
  e.itemId=neu.id;e.pi=0;e.w=e.h*r;e.x=cx-e.w/2;e.y=cy-e.h/2}}

/* ---- editor side panel (outfits only) ---- */
function outfitPanelHTML(b){
 return `<aside class="ed-r" id="edR">
  <div class="ep-row"><b>${t('details')}</b><span class="sp"></span>
   <button class="icon-btn ${b.fav?'on':''}" id="opFav" title="${t('favorites')}">${ic('heart',17)}</button>
   <button class="btn ghost sm" id="opArch">${b.archived?t('unarchive'):t('archive')}</button></div>
  <div class="fld"><span>${t('rating')}</span><div id="opRate">${stars(b.rating||0,'big')}</div></div>
  <div class="form-grid"><label class="fld"><span>${t('style')}</span><select id="opStyle"><option value="">—</option>${STYLES.map(s=>`<option value="${s}" ${b.style===s?'selected':''}>${t('st_'+s)}</option>`).join('')}</select></label>
  <label class="fld"><span>${t('occasion')}</span><select id="opOcc"><option value="">—</option>${OCCASIONS.map(o=>`<option value="${o[0]}" ${b.occasion===o[0]?'selected':''}>${t('occ_'+o[0])}</option>`).join('')}</select></label></div>
  <div class="fld"><span>${t('seasons')}</span><div class="chips" id="opSea"></div></div>
  <div class="fld"><span>${t('palette')}</span><div id="opHarm"></div></div>
  <div class="fld"><span>${t('piecesN',{n:outfitItems(b).length})}</span><div id="opItems" class="op-items"></div></div>
  <label class="fld"><span>${t('notes')}</span><textarea id="opNotes" rows="3">${esc(b.notes||'')}</textarea></label>
  <div class="fld"><span>${t('outfitPhotos')}</span><div class="op-photos" id="opPhotos"></div></div>
  <p class="muted sm">${t('createdOn',{d:new Intl.DateTimeFormat(lang==='ar'?'ar-EG':'en',{dateStyle:'medium'}).format(b.created||Date.now())})}</p></aside>`}
function renderOutfitLive(){const b=st.ed&&board();if(!b||b.type!=='outfit'||!$('#edR'))return;const items=outfitItems(b),h=harmony(items);
 $('#opHarm').innerHTML=items.length?`<div class="ep-row">${paletteHTML(h.palette)}<span class="sp"></span><b class="sm">${hLabel(h.label)} · ${h.score}</b></div>
  <div class="hbar"><i style="width:${h.score}%"></i></div><ul class="reasons">${h.reasons.map(r=>`<li class="${r.good?'good':r.bad?'bad':''}">${esc(harmonyText(r))}</li>`).join('')}</ul>`:`<p class="muted sm">${t('addPiecesFirst')}</p>`;
 $('#opItems').innerHTML=items.map(it=>`<div class="op-it" data-id="${it.id}"><img src="${it.img}" alt=""><span><b>${esc(it.name||catName(it.category))}</b><small>${esc(it.brand||catPath(it.category))}</small></span>
  <button class="btn ghost sm" data-alt title="${t('alternatives')}">${ic('redo',13)}</button></div>`).join('');
 $('#edR .fld span').textContent; const lbl=$('#opItems').previousElementSibling;if(lbl)lbl.textContent=t('piecesN',{n:items.length})}
function renderOutfitPhotos(b){$('#opPhotos').innerHTML=(b.photos||[]).map(id=>st.media[id]?`<div class="opp"><img src="${st.media[id].src}" alt=""><button data-rm="${id}">×</button></div>`:'').join('')+
 `<button class="opp add" id="opAddPh">${ic('plus',18)}</button>`}
HOOKS.loaded.push(async where=>{if(where!=='editor')return;const b=board();if(!b||b.type!=='outfit')return;
 $('.editor').insertAdjacentHTML('beforeend',outfitPanelHTML(b));const P=$('#edR');
 const set=(k,v)=>{b[k]=v;scheduleSave()};
 const seas=new Set(b.seasons||[]);toggleChips($('#opSea'),SEASONS,seas);$('#opSea').addEventListener('click',()=>set('seasons',[...seas]));
 $('#opStyle').onchange=e=>set('style',e.target.value);$('#opOcc').onchange=e=>set('occasion',e.target.value);
 $('#opNotes').onchange=e=>set('notes',e.target.value.trim());
 $('#opRate').onclick=e=>{const r=e.target.dataset.r;if(!r)return;const v=+r===b.rating?0:+r;set('rating',v);$('#opRate').innerHTML=stars(v,'big')};
 $('#opFav').onclick=e=>{set('fav',!b.fav);e.currentTarget.classList.toggle('on',b.fav)};
 $('#opArch').onclick=e=>{set('archived',!b.archived);e.currentTarget.textContent=b.archived?t('unarchive'):t('archive')};
 $('#opItems').onclick=e=>{const row=e.target.closest('.op-it');if(!row)return;const it=itemById(row.dataset.id);
  if(e.target.closest('[data-alt]'))openAlternatives(it,async neu=>{await replaceInBoard(b,it.id,neu);renderStage();renderEdItems();commit();toast(t('replaced'))})};
 renderOutfitPhotos(b);
 $('#opPhotos').onclick=async e=>{const rm=e.target.dataset.rm;
  if(rm){b.photos=(b.photos||[]).filter(x=>x!==rm);if(!st.boards.some(x=>x.elements.some(y=>y.mediaId===rm)||(x!==b&&(x.photos||[]).includes(rm)))){delete st.media[rm];await DB.del('media',rm)}set('photos',b.photos);renderOutfitPhotos(b)}
  else if(e.target.closest('#opAddPh')){for(const f of (await pickFiles()).filter(isImg)){const src=downscale(await fileToImg(f),1400).toDataURL('image/webp',.86),m={id:uid(),src};st.media[m.id]=m;await DB.put('media',m);b.photos=[...(b.photos||[]),m.id]}set('photos',b.photos);renderOutfitPhotos(b)}};
 renderOutfitLive()});
HOOKS.editorChange.push(renderOutfitLive);

/* ---- Outfits page ---- */
st.of={tab:'all',occ:'',style:'',sort:'recent'};
function renderOutfits(){const o=st.of,all=st.boards.filter(b=>b.type==='outfit');
 let list=all.filter(b=>o.tab==='archived'?b.archived:!b.archived&&(o.tab!=='fav'||b.fav)).filter(b=>(!o.occ||b.occasion===o.occ)&&(!o.style||b.style===o.style));
 list.sort({recent:(a,b)=>b.updated-a.updated,rating:(a,b)=>(b.rating||0)-(a.rating||0)||b.updated-a.updated,name:(a,b)=>a.name.localeCompare(b.name)}[o.sort]);
 const fmt=new Intl.DateTimeFormat(lang==='ar'?'ar-EG':'en',{day:'numeric',month:'short'});
 const cnt={all:all.filter(b=>!b.archived).length,fav:all.filter(b=>b.fav&&!b.archived).length,archived:all.filter(b=>b.archived).length};
 $('#view').innerHTML=`<div class="page"><div class="page-h"><div><h1>${t('outfits')}</h1><p class="muted">${t('nBoards',{n:cnt.all})}</p></div>
  <div style="display:flex;gap:8px"><button class="btn ghost" id="toStylist">✨ ${t('stylist')}</button><button class="btn" id="newB">${ic('plus',16)} ${t('newOutfit')}</button></div></div>
  <div class="of-bar"><div class="seg" id="ofTab">${['all','fav','archived'].map(k=>`<button data-k="${k}" class="${o.tab===k?'on':''}">${t('of_'+k)} <small>${cnt[k]}</small></button>`).join('')}</div>
   <select class="sel" id="ofOcc"><option value="">${t('anyOccasion')}</option>${OCCASIONS.map(x=>`<option value="${x[0]}" ${o.occ===x[0]?'selected':''}>${t('occ_'+x[0])}</option>`).join('')}</select>
   <select class="sel" id="ofStyle"><option value="">${t('anyStyle')}</option>${STYLES.map(s=>`<option value="${s}" ${o.style===s?'selected':''}>${t('st_'+s)}</option>`).join('')}</select>
   <span class="sp"></span><select class="sel" id="ofSort">${['recent','rating','name'].map(s=>`<option value="${s}" ${o.sort===s?'selected':''}>${t('ofs_'+s)}</option>`).join('')}</select></div>
  ${list.length?`<div class="bgrid outfit">${list.map(b=>`<div class="bcard ${b.archived?'arch':''}" data-id="${b.id}"><div class="bthumb">${b.thumb?`<img src="${b.thumb}" alt="">`:''}</div>
   ${b.fav?`<span class="bfav">${ic('heart',15)}</span>`:''}
   <div class="bmeta"><b>${esc(b.name)}</b><span>${fmt.format(b.updated)}</span></div>
   <div class="bsub">${b.rating?stars(b.rating):''}${b.occasion?`<span>${t('occ_'+b.occasion)}</span>`:''}${b.style?`<span>${t('st_'+b.style)}</span>`:''}</div>
   <div class="bact"><button data-act="fav" title="${t('favorites')}">${ic('heart',15)}</button><button data-act="arch" title="${b.archived?t('unarchive'):t('archive')}">${ic(b.archived?'upload':'down',15)}</button>
   <button data-act="dup" title="${t('duplicate')}">${ic('copy',15)}</button><button data-act="del" title="${t('delete')}">${ic('trash',15)}</button></div></div>`).join('')}</div>`
  :all.length?`<div class="empty"><p>${t('noMatchOutfits')}</p></div>`:emptyState(t('emptyOutfits'),t('emptyOutfitsSub'),`<button class="btn ghost" id="emptySty">✨ ${t('stylist')}</button>`)}</div>`;
 const rer=()=>renderOutfits();
 $('#newB').onclick=()=>newBoard('outfit');$('#toStylist').onclick=()=>setView('stylist');if($('#emptySty'))$('#emptySty').onclick=()=>setView('stylist');
 $('#ofTab').onclick=e=>{const k=e.target.closest('[data-k]')?.dataset.k;if(k){o.tab=k;rer()}};
 $('#ofOcc').onchange=e=>{o.occ=e.target.value;rer()};$('#ofStyle').onchange=e=>{o.style=e.target.value;rer()};$('#ofSort').onchange=e=>{o.sort=e.target.value;rer()};
 $('.bgrid')?.addEventListener('click',async e=>{const c=e.target.closest('.bcard');if(!c)return;const b=st.boards.find(x=>x.id===c.dataset.id),act=e.target.closest('[data-act]')?.dataset.act;
  if(act==='fav'){b.fav=!b.fav;await DB.put('boards',b);rer()}
  else if(act==='arch'){b.archived=!b.archived;await DB.put('boards',b);toast(b.archived?t('archivedT'):t('unarchivedT'));rer()}
  else if(act==='dup'){const n=JSON.parse(JSON.stringify(b));Object.assign(n,{id:uid(),name:`${b.name} (${t('copy')})`,created:Date.now(),updated:Date.now(),archived:false});n.elements.forEach(x=>x.id=uid());st.boards.push(n);await DB.put('boards',n);rer()}
  else if(act==='del'){if(await askConfirm(t('confirmDelBoard',{n:b.name}))){await deleteBoard(b);rer()}}
  else openEditor(b.id)})}
VIEWS.outfits=renderOutfits;

Object.assign(S.en,{details:'Details',rating:'Rating',style:'Style',occasion:'Occasion',palette:'Colours',piecesN:'Pieces ({n})',outfitPhotos:'Photos of you wearing it',
 createdOn:'Created {d}',archive:'Archive',unarchive:'Unarchive',alternatives:'Alternatives',altTitle:'Alternatives for {n}',altNone:'No other pieces of this type in your closet.',
 replaced:'Piece replaced',addPiecesFirst:'Add pieces to see the colour harmony.',of_all:'All',of_fav:'Favourites',of_archived:'Archived',anyOccasion:'Any occasion',anyStyle:'Any style',
 ofs_recent:'Recent',ofs_rating:'Top rated',ofs_name:'Name',noMatchOutfits:'No outfits match these filters',archivedT:'Outfit archived',unarchivedT:'Outfit restored'});
Object.assign(S.ar,{details:'التفاصيل',rating:'التقييم',style:'الستايل',occasion:'المناسبة',palette:'الألوان',piecesN:'القطع ({n})',outfitPhotos:'صورك وإنت لابسه',
 createdOn:'اتعمل {d}',archive:'أرشفة',unarchive:'إلغاء الأرشفة',alternatives:'بدائل',altTitle:'بدائل لـ {n}',altNone:'مفيش قطع تانية من النوع ده في دولابك.',
 replaced:'القطعة اتبدلت',addPiecesFirst:'ضيف قطع عشان تشوف تناسق الألوان.',of_all:'الكل',of_fav:'المفضلة',of_archived:'الأرشيف',anyOccasion:'أي مناسبة',anyStyle:'أي ستايل',
 ofs_recent:'الأحدث',ofs_rating:'الأعلى تقييمًا',ofs_name:'الاسم',noMatchOutfits:'مفيش أوتفيتات مطابقة للفلاتر دي',archivedT:'الأوتفيت اتأرشف',unarchivedT:'الأوتفيت رجع'});

document.head.insertAdjacentHTML('beforeend',`<style>
.ed-r{width:300px;flex:none;border-inline-start:1px solid var(--line);background:var(--panel);overflow:auto;padding:16px}
.ep-row{display:flex;align-items:center;gap:6px;margin-bottom:12px}.ep-row .sp{flex:1}
.stars{display:inline-flex;gap:1px;color:var(--line);font-size:13px;letter-spacing:1px}.stars i{font-style:normal;cursor:pointer}.stars i.on{color:#c9a227}
.stars.big{font-size:22px}
.op-items{display:flex;flex-direction:column;gap:6px}
.op-it{display:flex;align-items:center;gap:8px;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:5px}
.op-it img{width:40px;height:46px;object-fit:contain;background:var(--card);border-radius:7px;flex:none}
.op-it span{flex:1;min-width:0;display:flex;flex-direction:column}.op-it b{font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.op-it small{color:var(--muted);font-size:11px}
.op-photos{display:flex;flex-wrap:wrap;gap:6px}.opp{width:64px;height:80px;border-radius:9px;overflow:hidden;position:relative;background:var(--card);border:0;padding:0}
.opp img{width:100%;height:100%;object-fit:cover}.opp button{position:absolute;top:3px;inset-inline-end:3px;width:20px;height:20px;border-radius:50%;border:0;background:rgba(0,0,0,.6);color:#fff;line-height:1;padding:0}
.opp.add{border:1.5px dashed var(--line);background:none;color:var(--muted);display:grid;place-items:center}
.of-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:20px}.of-bar .sp{flex:1}.seg small{opacity:.55;margin-inline-start:3px}
.bsub{display:flex;gap:8px;align-items:center;padding:3px 4px 0;font-size:11.5px;color:var(--muted);flex-wrap:wrap}
.bfav{position:absolute;top:10px;inset-inline-start:10px;color:#d9534f}.bfav svg{fill:currentColor}
.bcard.arch .bthumb{opacity:.55}
@media (max-width:1100px){.ed-r{display:none}}
</style>`);
