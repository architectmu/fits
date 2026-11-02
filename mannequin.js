'use strict';
/* Outfit canvas on a mannequin, and an "Add items" picker.
   New outfits show a mannequin behind the pieces (editor only — not part of the saved picture), and each piece added
   goes straight to where it's worn: hat on the head, top on the chest, trousers on the legs, shoes on the feet…
   The mannequin uses the body outline from the measuring guide (viewBox 200×440). */

const MQ_BOX={// slot: [centre x, y, width, height, which edge y is] in mannequin units
 hat:[100,30,60,40,'bottom'],glasses:[100,36,40,14,'center'],scarf:[100,62,56,50,'top'],tie:[100,72,20,90,'top'],
 outer:[100,72,124,170,'top'],top:[100,74,104,150,'top'],dress:[100,74,110,300,'top'],belt:[100,200,80,20,'center'],
 bottom:[100,194,88,226,'top'],shoes:[100,438,80,40,'bottom'],watch:[34,262,20,24,'center'],jewelry:[40,292,14,14,'center'],
 bag:[176,296,60,70,'center'],acc:[176,214,44,50,'center'],other:[176,214,44,50,'center']};
const MQ_Z={outer:2,bottom:3,top:4,dress:4,shoes:5,belt:6,tie:7,scarf:7,hat:8,glasses:9,watch:9,jewelry:9,bag:9,acc:9,other:9};
const mqOn=b=>b?.type==='outfit'&&!!b.manq;
const mqGeom=b=>{const s=b.H*.94/440;return {s,x0:b.W/2-100*s,y0:b.H*.03}};
// where a piece goes on the mannequin, fitted to its photo's shape
async function mqPlace(b,it,src){const g=mqGeom(b),[cx,y,w,h,a]=MQ_BOX[slotOf(it)]||MQ_BOX.other;let r=1;try{const im=await loadImg(src||it.img);r=im.naturalWidth/im.naturalHeight||1}catch(e){}
 let W=w*g.s,H=W/r;if(H>h*g.s){H=h*g.s;W=H*r}const X=g.x0+cx*g.s-W/2,Y=g.y0+y*g.s,top=a==='top'?Y:a==='bottom'?Y-H:Y-H/2;
 const same=b.elements.filter(e=>e.kind==='item'&&slotOf(itemById(e.itemId)||{})===slotOf(it)).length; // a second layer sits just above the first
 return {x:X,y:top,w:W,h:H,z:(MQ_Z[slotOf(it)]||9)*10+same}}
function mannequinSVG(b){const g=mqGeom(b),dark=lum(b.bg)<.45,half=`<path d="${BODY_HALF}L100 60Z"/>`,line=`<path d="${BODY_HALF}" fill="none"/>`;
 return `<svg class="manq" viewBox="0 0 200 440" style="left:${g.x0}px;top:${g.y0}px;width:${200*g.s}px;height:${440*g.s}px" aria-hidden="true">
  <g fill="${dark?'rgba(255,255,255,.07)':'rgba(0,0,0,.045)'}">${half}<g transform="translate(200 0) scale(-1 1)">${half}</g><ellipse cx="100" cy="38" rx="20" ry="25"/></g>
  <g stroke="${dark?'rgba(255,255,255,.16)':'rgba(0,0,0,.11)'}" stroke-width=".8" fill="none">${line}<g transform="translate(200 0) scale(-1 1)">${line}</g><ellipse cx="100" cy="38" rx="20" ry="25"/></g></svg>`}
const lum=hex=>{const m=/^#?([0-9a-f]{6})$/i.exec(hex||'');if(!m)return 1;const n=parseInt(m[1],16);return((n>>16&255)*.299+(n>>8&255)*.587+(n&255)*.114)/255};

// draw the mannequin behind the pieces whenever the canvas is drawn
const _renderStageMq=renderStage;
renderStage=function(){_renderStageMq();const b=st.ed&&board();if(mqOn(b))$('#stage').insertAdjacentHTML('afterbegin',mannequinSVG(b))};
// new outfits start on the mannequin
const _newBoardMq=newBoard;
newBoard=async function(type){if(type!=='outfit')return _newBoardMq(type);const[W,H,bg]=SIZES.outfit,n=st.boards.filter(b=>b.type==='outfit').length+1;
 const b={id:uid(),type,name:`${t('untitledOutfit')} ${n}`,W,H,bg,elements:[],thumb:'',manq:true,created:Date.now(),updated:Date.now()};
 st.boards.push(b);await DB.put('boards',b);openEditor(b.id)};
// a piece added to a mannequin outfit goes where it's worn
const _addItemElMq=addItemEl;
addItemEl=async function(itemId,at){const b=board(),it=itemById(itemId);if(!mqOn(b)||!it)return _addItemElMq(itemId,at);
 const ph=itemPhotos(it);let pi=0;if(ph.length>1){pi=await pickItemPhoto(it,ph);if(pi==null)return}
 await addOnMannequin(b,it,pi);renderStage();renderSelbar();renderEdItems();commit()};
async function addOnMannequin(b,it,pi=0){const p=await mqPlace(b,it,itemPhotos(it)[pi]);const e={id:uid(),kind:'item',itemId:it.id,...(pi?{pi}:{}),r:0,flip:false,...p};b.elements.push(e);st.ed.sel=e.id;return e}
// "Wear it" on a mannequin outfit snaps every piece back to its place
const _openDressUpMq=openDressUp;
openDressUp=async function(){const b=board();if(!mqOn(b))return _openDressUpMq();
 const els=b.elements.filter(e=>e.kind==='item'&&itemById(e.itemId));if(!els.length){toast(t('duNone'));return}
 const keep=b.elements.filter(e=>!els.includes(e));b.elements=keep;
 for(const e of els){const p=await mqPlace(b,itemById(e.itemId),elSrc(e));Object.assign(e,p,{r:0,crop:undefined});b.elements.push(e)}
 renderStage();renderSelbar();commit();toast(t('duDone'))};

/* ---- "Add items": a visual picker — tap pieces, then add them all ---- */
function openAddItems(){const b=board(),used=new Set(b.elements.map(e=>e.itemId)),sel=[],cats=allCats().filter(c=>!c.parent&&st.items.some(i=>inCat(i,c.id)));let cat='all';
 const md=modal(`<div class="ai-h"><h2>${t('aiTitle')}</h2><button class="icon-btn" data-close>✕</button></div>
  <div class="ai-cats" id="aiCats"></div><div class="ai-grid" id="aiGrid"></div>
  <div class="md-f ai-f"><span class="muted sm" id="aiN">${t('aiTap')}</span><span class="sp"></span><button class="btn" id="aiOk" disabled>${t('aiAdd',{n:0})}</button></div>`,{wide:true});
 md.classList.add('ai-md');
 const draw=()=>{$('#aiCats',md).innerHTML=[{id:'all',name:t('all')},...cats].map(c=>`<button class="chip ${cat===c.id?'on':''}" data-c="${c.id}">${esc(c.name)}</button>`).join('');
  $('#aiGrid',md).innerHTML=st.items.filter(i=>cat==='all'||inCat(i,cat)).sort((a,z)=>z.created-a.created).map(i=>`<button class="ai-it ${sel.includes(i.id)?'on':''} ${used.has(i.id)?'used':''}" data-id="${i.id}">
   <img src="${i.img}" alt="" loading="lazy"><span>${esc(i.name||catName(i.category))}</span><i>${sel.includes(i.id)?sel.indexOf(i.id)+1:'✓'}</i></button>`).join('')};
 const count=()=>{$('#aiOk',md).disabled=!sel.length;$('#aiOk',md).textContent=t('aiAdd',{n:sel.length});$('#aiN',md).textContent=sel.length?t('aiSel',{n:sel.length}):t('aiTap')};
 draw();
 $('#aiCats',md).onclick=e=>{const c=e.target.closest('[data-c]');if(c){cat=c.dataset.c;draw();$('#aiGrid',md).scrollTop=0}};
 $('#aiGrid',md).onclick=e=>{const p=e.target.closest('.ai-it');if(!p)return;const id=p.dataset.id,k=sel.indexOf(id);if(k>=0)sel.splice(k,1);else sel.push(id);
  $$('.ai-it',md).forEach(x=>{const j=sel.indexOf(x.dataset.id);x.classList.toggle('on',j>=0);$('i',x).textContent=j>=0?j+1:'✓'});count()};
 $('#aiOk',md).onclick=async()=>{closeModal();const list=sel.map(itemById).filter(Boolean);
  for(const it of list){if(mqOn(b))await addOnMannequin(b,it);else{const{w,h}=await sizeFor(it.img,b.type==='outfit'?300:280,400),z=b.elements.length?Math.max(...b.elements.map(e=>e.z))+1:1;
   const e={id:uid(),kind:'item',itemId:it.id,r:0,flip:false,z,w,h,x:b.W/2-w/2+(Math.random()-.5)*b.W*.4,y:b.H/2-h/2+(Math.random()-.5)*b.H*.3};b.elements.push(e);st.ed.sel=e.id}}
  renderStage();renderSelbar();renderEdItems();commit();toast(t('aiDone',{n:list.length}))}}

HOOKS.loaded.push(where=>{if(where!=='editor')return;const add=$('.ed-add'),b=board();if(!add||$('#addItems'))return;
 add.insertAdjacentHTML('afterbegin',`<button class="btn sm ai-btn" id="addItems">${ic('plus',17)}<span>${t('aiBtn')}</span></button>`);$('#addItems').onclick=openAddItems;
 if(b.type==='outfit'){add.insertAdjacentHTML('beforeend',`<button class="btn ghost sm ${b.manq?'on':''}" id="mqTg">${ic('mtCloset',17)}<span>${t('mqBtn')}</span></button>`);
  $('#mqTg').onclick=e=>{b.manq=!b.manq;e.currentTarget.classList.toggle('on',b.manq);renderStage();scheduleSave()}}});

Object.assign(S.en,{aiBtn:'Add items',aiTitle:'Add pieces',aiTap:'Tap the pieces you want',aiSel:'{n} selected',aiAdd:'Add ({n})',aiDone:'Added {n}',mqBtn:'Mannequin'});
Object.assign(S.ar,{aiBtn:'ضيف قطع',aiTitle:'ضيف قطع',aiTap:'دوس على القطع اللي عايزها',aiSel:'{n} مختارة',aiAdd:'ضيف ({n})',aiDone:'اتضاف {n}',mqBtn:'مانيكان'});
document.head.insertAdjacentHTML('beforeend',`<style>
#stage .manq{position:absolute;z-index:-99999;pointer-events:none}
.ed-add .ai-btn{grid-column:1/-1;flex-direction:row!important;padding:11px!important}
#mqTg.on{background:var(--ink);color:var(--bg)}
.md.ai-md{max-width:880px;display:flex;flex-direction:column;max-height:88dvh}
.ai-h{display:flex;align-items:center;justify-content:space-between}.ai-h h2{margin:0}
.ai-cats{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:12px 0 10px;flex:none}.ai-cats::-webkit-scrollbar{display:none}.ai-cats .chip{flex:none;padding:7px 14px}
.ai-grid{flex:1;min-height:0;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px 10px;align-content:start;padding:2px}
.ai-it{border:0;background:none;padding:4px 4px 8px;border-radius:14px;display:flex;flex-direction:column;gap:4px;position:relative;text-align:center}
.ai-it img{width:100%;aspect-ratio:4/5;object-fit:contain;padding:6px;transition:transform .12s}
.ai-it span{font-size:11.5px;color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ai-it i{position:absolute;top:6px;inset-inline-end:6px;width:24px;height:24px;border-radius:50%;border:1.5px solid var(--line);background:var(--bg);font-style:normal;font-size:12px;font-weight:700;display:grid;place-items:center;color:transparent}
.ai-it.on{background:var(--card)}.ai-it.on img{transform:scale(.94)}.ai-it.on i{background:var(--ink);border-color:var(--ink);color:var(--bg)}
.ai-it.used::after{content:'';position:absolute;top:12px;inset-inline-start:10px;width:7px;height:7px;border-radius:50%;background:var(--sel)}
.ai-f{flex:none}
@media (max-width:760px){
 .md.ai-md{max-height:92dvh;height:92dvh}.ai-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
 /* on a phone the picker replaces the cramped closet strip, leaving the canvas bigger */
 .ed-l>b,.ed-l>.search,.ed-l>#edCat,.ed-l>.ed-items{display:none}
 .ed-l{height:auto!important;padding:8px 10px calc(8px + env(safe-area-inset-bottom))!important}
 .editor,.ed-l,.ed-c,#wrap,#selbar,.ed-top{min-width:0;max-width:100vw}.ed-add{min-width:0}
 .ed-add{display:flex!important;overflow-x:auto;scrollbar-width:none;gap:6px}.ed-add::-webkit-scrollbar{display:none}
 .ed-add .btn{flex:none;min-width:70px}.ed-add .ai-btn{min-width:auto;padding:10px 16px!important}
 #decoMenu{position:fixed;bottom:90px;left:10px;right:10px;z-index:70}
}
</style>`);
