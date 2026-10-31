'use strict';
/* "Wear it": lays chosen pieces out head-to-toe as if worn — hat, then the jacket with the top over it, tie and belt,
   trousers under the top's hem, shoes at the bottom, and small accessories at the sides.
   Used by the stylist cards, the outfit editor (re-arranges the real pieces) and moodboards (adds the look as one picture). */

const INNER_TOP=['shirts','tshirts'];
// entries: [{it, src}] → [{e, x, y, w, h, z}] fitted inside box B
async function dressUp(entries,B={x:0,y:0,w:1000,h:1000}){
 const by={};entries.forEach(e=>{const s=slotOf(e.it);(by[s]=by[s]||[]).push(e)});
 const dim=async(e,w)=>{let r=1;try{const im=await loadImg(e.src);r=im.naturalWidth/im.naturalHeight||1}catch(err){}return {e,w,h:w/r}};
 const out=[],put=(d,cx,y,z)=>{out.push({...d,x:cx-d.w/2,y,z});return d},extra=[];
 const first=s=>{const l=by[s]||[];l.slice(1).forEach(x=>extra.push(x));return l[0]};
 let y=0;
 const hat=first('hat');if(hat){const d=put(await dim(hat,.34),0,y,9);y+=d.h*.82}
 const ty=y;let torsoH=0,legTop=ty,legEnd=ty;
 const dress=first('dress');
 if(dress&&!by.top){const d=put(await dim(dress,.56),0,ty,2);torsoH=d.h*.45;legEnd=ty+d.h;legTop=ty+d.h*.42}
 else{
  const outer=first('outer');let o=null;if(outer)o=put(await dim(outer,.7),0,ty,1);
  // shirt / tee underneath, knit or hoodie over it
  const tops=(by.top||[]).slice().sort((a,b)=>(INNER_TOP.includes(b.it.category)?1:0)-(INNER_TOP.includes(a.it.category)?1:0));
  tops.slice(2).forEach(x=>extra.push(x));let tH=0;
  for(let i=0;i<Math.min(2,tops.length);i++){const d=put(await dim(tops[i],(o?.5:.54)+i*.02),0,ty+(o?o.h*.03:0)+i*.015,3+i);tH=Math.max(tH,d.h+(o?o.h*.03:0))}
  torsoH=Math.max(tH,o?o.h*.9:0);
  const tie=first('tie');if(tie&&tops.length)put(await dim(tie,.085),0,ty+tH*.08,6);else if(tie)extra.push(tie);
  legTop=ty+(tH?tH*.84:torsoH*.85);legEnd=legTop;
  const bottom=first('bottom');if(bottom){const d=put(await dim(bottom,.44),0,legTop,2);legEnd=legTop+d.h}
  const belt=first('belt');if(belt&&bottom){const d=await dim(belt,.4);put(d,0,legTop-d.h*.25,7)}else if(belt)extra.push(belt)}
 const shoes=first('shoes');if(shoes){const d=await dim(shoes,.36);put(d,0,legEnd-d.h*.3,8)}
 const scarf=first('scarf');if(scarf)put(await dim(scarf,.3),0,ty-.02,7);
 // the sides: small things next to where they're worn, then anything left over
 const L=-.52,R=.54,side=[['glasses',R,.04,.22],['jewelry',L,ty+.02,.12],['watch',L,ty+torsoH*.62,.15],['bag',R,legTop,.32]];
 for(const [s,cx,yy,w] of side){const e=first(s);if(e)put(await dim(e,w),cx,yy,10)}
 for(const s of Object.keys(by))if(!['hat','dress','outer','top','tie','bottom','belt','shoes','scarf','glasses','jewelry','watch','bag'].includes(s))extra.push(...by[s]);
 let ly=ty+torsoH,ry=legTop+.45,k=0;for(const e of extra){const d=await dim(e,.2),left=k++%2===0;put(d,left?L:R,left?ly:ry,10);if(left)ly+=d.h+.03;else ry+=d.h+.03}
 if(!out.length)return [];
 const x0=Math.min(...out.map(o=>o.x)),x1=Math.max(...out.map(o=>o.x+o.w)),y0=Math.min(...out.map(o=>o.y)),y1=Math.max(...out.map(o=>o.y+o.h));
 const s=Math.min(B.w/(x1-x0),B.h/(y1-y0)),ox=B.x+(B.w-(x1-x0)*s)/2,oy=B.y+(B.h-(y1-y0)*s)/2;
 return out.map(o=>({e:o.e,x:ox+(o.x-x0)*s,y:oy+(o.y-y0)*s,w:o.w*s,h:o.h*s,z:o.z}))}

// a small HTML preview (stylist cards)
async function dressPreviewHTML(items){const L=await dressUp(items.map(it=>({it,src:it.img})));
 return `<div class="dress">${L.map(o=>`<img src="${o.e.src}" alt="" style="left:${o.x/10}%;top:${o.y/10}%;width:${o.w/10}%;height:${o.h/10}%;z-index:${o.z}">`).join('')}</div>`}
// one flat picture of the look (moodboards)
async function dressImage(entries,H=1100){const L=await dressUp(entries,{x:0,y:0,w:H,h:H});if(!L.length)return null;
 const x0=Math.min(...L.map(o=>o.x)),x1=Math.max(...L.map(o=>o.x+o.w)),pad=10,c=mkCanvas(Math.ceil(x1-x0)+pad*2,H+pad*2),ctx=c.getContext('2d');
 for(const o of L.slice().sort((a,b)=>a.z-b.z)){try{ctx.drawImage(await loadImg(o.e.src),o.x-x0+pad,o.y+pad,o.w,o.h)}catch(err){}}
 return c}

/* editor button: pick which pieces, then wear them */
function openDressUp(){const b=board(),els=b.elements.filter(e=>e.kind==='item'&&itemById(e.itemId)),seen=new Set(),list=els.filter(e=>!seen.has(e.itemId)&&seen.add(e.itemId));
 if(!list.length){toast(t('duNone'));return}
 const md=modal(`<h2>${t('duTitle')}</h2><p class="muted sm" style="margin:-8px 0 14px">${t(b.type==='outfit'?'duSubOutfit':'duSubMood')}</p>
  <div class="pick-grid du-grid">${list.map(e=>{const it=itemById(e.itemId);return `<button class="pick on" data-id="${e.id}"><img src="${elSrc(e)}" alt="" style="object-fit:contain;padding:6px"><span>${esc(it.name||catName(it.category))}</span><i class="du-ck">✓</i></button>`}).join('')}</div>
  <div class="md-f"><button class="btn ghost" data-close>${t('cancel')}</button><span class="sp"></span><button class="btn" id="duGo">👔 ${t('duGo')}</button></div>`,{wide:true});
 $('.du-grid',md).onclick=e=>{const p=e.target.closest('.pick');if(p)p.classList.toggle('on')};
 $('#duGo',md).onclick=async()=>{const pick=$$('.du-grid .pick.on',md).map(p=>b.elements.find(x=>x.id===p.dataset.id));if(!pick.length)return;
  closeModal();const entries=pick.map(e=>({it:itemById(e.itemId),src:elSrc(e),el:e}));
  if(b.type==='outfit'){// re-arrange the real pieces so they stay editable
   const L=await dressUp(entries,{x:b.W*.06,y:b.H*.03,w:b.W*.88,h:b.H*.94});
   for(const o of L)Object.assign(o.e.el,{x:o.x,y:o.y,w:o.w,h:o.h,z:o.z,r:0,crop:undefined});
   renderStage();renderSelbar();commit()}
  else{const c=await dressImage(entries);if(!c)return;const src=c.toDataURL('image/webp',.9),m={id:uid(),src};st.media[m.id]=m;await DB.put('media',m);
   const h=b.H*.86;addEl({kind:'image',mediaId:m.id,h,w:h*c.width/c.height})}
  toast(t('duDone'))}}
HOOKS.loaded.push(where=>{if(where!=='editor')return;const add=$('.ed-add');if(!add||$('#addDress'))return;
 add.insertAdjacentHTML('beforeend',`<button class="btn ghost sm" id="addDress">${ic('hanger',17)}${t('duBtn')}</button>`);$('#addDress').onclick=openDressUp});
ICON.hanger=ICON.hanger||'<path d="M12 7a2 2 0 1 1 2-2"/><path d="M12 7v2L3 16a1.5 1.5 0 0 0 1 3h16a1.5 1.5 0 0 0 1-3l-9-7"/>';

Object.assign(S.en,{duBtn:'Wear it',duTitle:'Wear these as one outfit',duSubOutfit:'The pieces will be arranged head to toe, as if worn.',duSubMood:'Adds a head-to-toe picture of the look to the board.',
 duGo:'Dress me',duNone:'Add some pieces from your closet first.',duDone:'Outfit dressed head to toe',wornView:'Worn',flatView:'Flat lay'});
Object.assign(S.ar,{duBtn:'لبّسني',duTitle:'البس القطع دي كطقم واحد',duSubOutfit:'القطع هتترتب من الراس للرجل كأنها ملبوسة.',duSubMood:'هيضيف صورة للطقم ملبوس من الراس للرجل على البورد.',
 duGo:'لبّسني',duNone:'ضيف قطع من دولابك الأول.',duDone:'الطقم اتلبس من الراس للرجل',wornView:'ملبوس',flatView:'مفروش'});
document.head.insertAdjacentHTML('beforeend',`<style>
.dress{position:relative;width:100%;aspect-ratio:1;background:var(--card)}
.dress img{position:absolute;object-fit:contain;pointer-events:none}
.du-grid .pick{position:relative;opacity:.45}.du-grid .pick.on{opacity:1;outline:2px solid var(--ink);outline-offset:-2px}
.du-ck{position:absolute;top:6px;inset-inline-end:6px;width:22px;height:22px;border-radius:50%;background:var(--ink);color:var(--bg);font-style:normal;font-size:12px;display:none;place-items:center}
.du-grid .pick.on .du-ck{display:grid}
.sres .view-tg{position:absolute;top:10px;inset-inline-end:10px;z-index:20;display:flex;background:var(--bg);border-radius:999px;padding:3px;box-shadow:0 2px 10px rgba(0,0,0,.12)}
.sres .view-tg button{border:0;background:none;font:inherit;font-size:11.5px;padding:5px 10px;border-radius:999px;color:var(--muted);cursor:pointer}.sres .view-tg button.on{background:var(--ink);color:var(--bg)}
.sres{position:relative}
</style>`);
