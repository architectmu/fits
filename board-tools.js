'use strict';
/* Extra canvas tools for outfits and moodboards: crop (halves or custom), snapping with guides while dragging,
   vertical flip, 90° turns, opacity, rounded corners, shadow, lock, centering on the canvas.
   Crop is stored as fractions of the full picture, e.crop={l,t,r,b}; the element box is always just the visible part. */
const hasCrop=e=>!!e.crop&&(e.crop.l||e.crop.t||e.crop.r||e.crop.b);
const CROP_PRESETS={left:{l:0,t:0,r:.5,b:0},right:{l:.5,t:0,r:0,b:0},top:{l:0,t:0,r:0,b:.5},bottom:{l:0,t:.5,r:0,b:0},none:{l:0,t:0,r:0,b:0}};

// re-crop keeping the picture where it is: work out the full picture's box, then cut the new window out of it
function applyCrop(e,c){const o=e.crop||CROP_PRESETS.none,FW=e.w/(1-o.l-o.r),FH=e.h/(1-o.t-o.b),X0=e.x-o.l*FW,Y0=e.y-o.t*FH;
 const n={l:Math.max(0,c.l),t:Math.max(0,c.t),r:Math.max(0,c.r),b:Math.max(0,c.b)};
 if(n.l+n.r>.9)n.r=.9-n.l;if(n.t+n.b>.9)n.b=.9-n.t;
 e.w=FW*(1-n.l-n.r);e.h=FH*(1-n.t-n.b);e.x=X0+n.l*FW;e.y=Y0+n.t*FH;e.crop=hasCrop({crop:n})?n:undefined}

// the picture inside a cropped element: full-size image shifted so only the window shows
function croppedImg(e,src){const c=e.crop,fw=100/(1-c.l-c.r),fh=100/(1-c.t-c.b);
 return `<img src="${src}" draggable="false" alt="" style="position:absolute;max-width:none;width:${fw}%;height:${fh}%;left:${-c.l*fw}%;top:${-c.t*fh}%">`}

/* ---- snapping while moving: edges and centres of the other pieces and of the canvas ---- */
function snapMove(e,b,free){clearGuides();if(free)return;const th=8/(st.ed.scale||1);
 const xs=[0,b.W/2,b.W],ys=[0,b.H/2,b.H];
 for(const o of b.elements)if(o!==e){xs.push(o.x,o.x+o.w/2,o.x+o.w);ys.push(o.y,o.y+o.h/2,o.y+o.h)}
 const best=(mine,targets)=>{let d=null;for(const m of mine)for(const t of targets){const dd=t-m;if(Math.abs(dd)<=th&&(d===null||Math.abs(dd)<Math.abs(d.v)))d={v:dd,at:t}}return d};
 const dx=best([e.x,e.x+e.w/2,e.x+e.w],xs),dy=best([e.y,e.y+e.h/2,e.y+e.h],ys);
 if(dx){e.x+=dx.v;guide('v',dx.at)}if(dy){e.y+=dy.v;guide('h',dy.at)}}
function guide(dir,at){const g=document.createElement('i');g.className='guide '+dir;g.style[dir==='v'?'left':'top']=at+'px';$('#stage')?.appendChild(g)}
const clearGuides=()=>$$('#stage .guide').forEach(g=>g.remove());

/* ---- toolbar ---- */
function boardToolsHTML(e){const img=e.kind==='item'||e.kind==='image',c=e.crop||CROP_PRESETS.none,pct=v=>Math.round(v*100);
 let h=`<span class="dv"></span>`;
 if(img)h+=`<button class="icon-btn ${st.ed.cropOpen||hasCrop(e)?'on':''}" data-a="crop" title="${t('btCrop')}">${ic('crop')}</button>`;
 if(e.kind!=='text')h+=`<button class="icon-btn ${e.flipV?'on':''}" data-a="flipV" title="${t('btFlipV')}">${ic('flip',18,'rot90')}</button>`;
 h+=`<button class="icon-btn" data-a="rot90" title="${t('btRot90')}">${ic('rotate')}</button>
  <button class="icon-btn" data-a="cx" title="${t('btCenterX')}">${ic('alignX')}</button><button class="icon-btn" data-a="cy" title="${t('btCenterY')}">${ic('alignY')}</button>
  <button class="icon-btn ${e.shadow?'on':''}" data-a="shadow" title="${t('btShadow')}">${ic('shadow')}</button>
  <button class="icon-btn ${e.lock?'on':''}" data-a="lock" title="${t(e.lock?'btUnlock':'btLock')}">${ic(e.lock?'lock':'unlock')}</button>
  <label class="bt-rng" title="${t('btOpacity')}">${ic('drop',15)}<input type="range" min="10" max="100" data-bt="op" value="${Math.round((e.op??1)*100)}"></label>`;
 if(e.kind==='note')h+=`<span class="dv"></span><span class="bt-notes">${NOTE_COLORS.map(c=>`<button data-note="${c}" class="${c===e.color?'on':''}" style="background:${c}"></button>`).join('')}</span>
  ${fontSelect(e.font||'hand')}<input type="number" data-p="size" min="8" max="400" value="${Math.round(e.size)}" title="${t('size')}">`;
 if(e.kind!=='text'&&e.kind!=='deco')h+=`<label class="bt-rng" title="${t('btRadius')}">${ic('corner',15)}<input type="range" min="0" max="50" data-bt="rad" value="${e.rad||0}"></label>`;
 if(img&&st.ed.cropOpen)h+=`<div class="bt-crop"><b>${t('btCrop')}</b>
  <button class="btn ghost sm" data-crop="left">◧ ${t('btLeftHalf')}</button><button class="btn ghost sm" data-crop="right">◨ ${t('btRightHalf')}</button>
  <button class="btn ghost sm" data-crop="top">⬒ ${t('btTopHalf')}</button><button class="btn ghost sm" data-crop="bottom">⬓ ${t('btBottomHalf')}</button>
  <span class="dv"></span>${['l','r','t','b'].map(k=>`<label class="bt-rng">${t('btSide_'+k)}<input type="range" min="0" max="90" data-cs="${k}" value="${pct(c[k])}"></label>`).join('')}
  <button class="btn ghost sm" data-crop="none">${t('btReset')}</button><button class="btn sm" data-a="crop">${t('done')}</button></div>`;
 return h}

// handles the toolbar's own controls; returns true when it dealt with the event
function boardToolsAction(a,e,b){
 if(a==='crop'){st.ed.cropOpen=!st.ed.cropOpen;return 'bar'}
 if(a==='flipV')e.flipV=!e.flipV;else if(a==='rot90')e.r=((e.r||0)+90)%360;else if(a==='shadow')e.shadow=!e.shadow;else if(a==='lock')e.lock=!e.lock;
 else if(a==='cx')e.x=b.W/2-e.w/2;else if(a==='cy')e.y=b.H/2-e.h/2;else return false;return true}
function boardToolsInput(t0,e){
 if(t0.dataset.bt==='op'){e.op=+t0.value/100;if(e.op>=1)delete e.op;return 'style'}
 if(t0.dataset.bt==='rad'){e.rad=+t0.value;if(!e.rad)delete e.rad;return 'inner'}
 if(t0.dataset.cs){const c={...(e.crop||CROP_PRESETS.none)};c[t0.dataset.cs]=+t0.value/100;applyCrop(e,c);return 'all'}
 return false}

/* ---- more fonts (Google Fonts): key -> [shown name, CSS family list]; Arabic text falls back to an Arabic face ---- */
const MORE_FONTS={
 bebas:['Bebas Neue',"'Bebas Neue','Cairo',sans-serif"],anton:['Anton',"'Anton','Cairo',sans-serif"],oswald:['Oswald',"'Oswald','Cairo',sans-serif"],
 montserrat:['Montserrat',"'Montserrat','Cairo',sans-serif"],poppins:['Poppins',"'Poppins','Tajawal',sans-serif"],archivo:['Archivo Black',"'Archivo Black','Cairo',sans-serif"],
 righteous:['Righteous',"'Righteous','Lalezar',sans-serif"],spacemono:['Space Mono',"'Space Mono',monospace"],
 abril:['Abril Fatface',"'Abril Fatface','Amiri',serif"],dmserif:['DM Serif Display',"'DM Serif Display','Amiri',serif"],cormorant:['Cormorant Garamond',"'Cormorant Garamond','Amiri',serif"],
 lobster:['Lobster',"'Lobster','Aref Ruqaa',cursive"],pacifico:['Pacifico',"'Pacifico','Aref Ruqaa',cursive"],dancing:['Dancing Script',"'Dancing Script','Aref Ruqaa',cursive"],
 vibes:['Great Vibes',"'Great Vibes','Aref Ruqaa',cursive"],satisfy:['Satisfy',"'Satisfy','Aref Ruqaa',cursive"],marker:['Permanent Marker',"'Permanent Marker','Marhey',cursive"],
 shadows:['Shadows Into Light',"'Shadows Into Light','Marhey',cursive"],indie:['Indie Flower',"'Indie Flower','Marhey',cursive"],kalam:['Kalam',"'Kalam','Marhey',cursive"],
 cairo:['Cairo — القاهرة',"'Cairo',sans-serif"],tajawal:['Tajawal — تجوال',"'Tajawal',sans-serif"],changa:['Changa — تشانجا',"'Changa',sans-serif"],
 elmessiri:['El Messiri — المسيري',"'El Messiri',sans-serif"],reemkufi:['Reem Kufi — ريم كوفي',"'Reem Kufi',sans-serif"],lalezar:['Lalezar — لاله زار',"'Lalezar',sans-serif"],
 rakkas:['Rakkas — رقاص',"'Rakkas',serif"],arefruqaa:['Aref Ruqaa — رقعة',"'Aref Ruqaa',serif"],marhey:['Marhey — مرحي',"'Marhey',cursive"],amiri:['Amiri — أميري',"'Amiri',serif"]};
for(const [k,[,fam]] of Object.entries(MORE_FONTS))FONTS[k]=fam;
document.head.insertAdjacentHTML('beforeend',`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${['Bebas Neue','Anton','Oswald:wght@400;700','Montserrat:wght@400;700','Poppins:wght@400;700','Archivo Black','Righteous','Space Mono:wght@400;700',
 'Abril Fatface','DM Serif Display','Cormorant Garamond:wght@400;700','Lobster','Pacifico','Dancing Script:wght@400;700','Great Vibes','Satisfy','Permanent Marker','Shadows Into Light','Indie Flower','Kalam:wght@400;700',
 'Cairo:wght@400;700','Tajawal:wght@400;700','Changa:wght@400;700','El Messiri:wght@400;700','Reem Kufi:wght@400;700','Lalezar','Rakkas','Aref Ruqaa:wght@400;700','Marhey:wght@400;700']
 .map(f=>'family='+f.replace(/ /g,'+')).join('&')}&display=swap">`);
const fontLabel=k=>MORE_FONTS[k]?.[0]||t('font'+k[0].toUpperCase()+k.slice(1));
const fontSelect=cur=>`<select data-p="font" class="bt-font" title="${t('font')}">${Object.keys(FONTS).map(k=>`<option value="${k}" ${cur===k?'selected':''} style="font-family:${FONTS[k].replace(/"/g,'&quot;')}">${esc(fontLabel(k))}</option>`).join('')}</select>`;

/* ---- moodboard decorations: sticky notes and pins / tape / clips ---- */
const NOTE_COLORS=['#fff176','#ffab91','#f8bbd0','#b3e5fc','#c5e1a5','#ffffff'];
const DECOS={
 pinRed:{w:46,h:62,svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 46 62"><ellipse cx="23" cy="58" rx="7" ry="2.5" fill="rgba(0,0,0,.25)"/><path d="M23 30v28" stroke="#9e9e9e" stroke-width="2.5" stroke-linecap="round"/><circle cx="23" cy="18" r="15" fill="#e53935"/><circle cx="17" cy="12" r="5" fill="#ff8a80"/></svg>'},
 pinBlue:{w:46,h:62,svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 46 62"><ellipse cx="23" cy="58" rx="7" ry="2.5" fill="rgba(0,0,0,.25)"/><path d="M23 30v28" stroke="#9e9e9e" stroke-width="2.5" stroke-linecap="round"/><circle cx="23" cy="18" r="15" fill="#1e88e5"/><circle cx="17" cy="12" r="5" fill="#90caf9"/></svg>'},
 pinGold:{w:46,h:62,svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 46 62"><ellipse cx="23" cy="58" rx="7" ry="2.5" fill="rgba(0,0,0,.25)"/><path d="M23 30v28" stroke="#9e9e9e" stroke-width="2.5" stroke-linecap="round"/><circle cx="23" cy="18" r="15" fill="#c9a227"/><circle cx="17" cy="12" r="5" fill="#f3e3a1"/></svg>'},
 tape:{w:150,h:44,svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 44"><path d="M6 4l138 2-4 6 5 6-5 7 5 7-4 6 3 4L6 40l4-6-5-6 5-7-5-7 4-6z" fill="rgba(245,236,205,.82)" stroke="rgba(0,0,0,.06)"/></svg>'},
 tapePink:{w:150,h:44,svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 44"><path d="M6 4l138 2-4 6 5 6-5 7 5 7-4 6 3 4L6 40l4-6-5-6 5-7-5-7 4-6z" fill="rgba(248,187,208,.8)" stroke="rgba(0,0,0,.06)"/></svg>'},
 clip:{w:40,h:96,svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 96"><path d="M28 30V14a8 8 0 0 0-16 0v58a12 12 0 0 0 24 0V22" fill="none" stroke="#8d8d8d" stroke-width="4" stroke-linecap="round"/></svg>'}};
// a pen sketch is stored as a deco whose "deco" is the drawing itself (an SVG data URL)
const decoSrc=k=>String(k).startsWith('data:')?k:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent((DECOS[k]||DECOS.pinRed).svg);
function noteInner(e){return `<div class="note" style="background:${e.color}"><div class="txt" dir="auto" style="font-size:${e.size}px;font-family:${FONTS[e.font||'hand']}">${esc(e.text)}</div></div>`}
function addNote(){const b=board();addEl({kind:'note',text:t('notePh'),color:NOTE_COLORS[0],size:Math.round(b.W/22),w:b.W/4,h:b.W/4,r:(Math.random()*6-3)})}
function openDecoPicker(btn){let m=$('#decoMenu');if(m){m.remove();return}
 m=document.createElement('div');m.id='decoMenu';m.innerHTML=Object.keys(DECOS).map(k=>`<button data-deco="${k}" title="${t('deco_'+k)}"><img src="${decoSrc(k)}" alt=""></button>`).join('');
 btn.after(m);m.onclick=ev=>{const k=ev.target.closest('[data-deco]')?.dataset.deco;if(!k)return;const d=DECOS[k],s=board().W/900;
  addEl({kind:'deco',deco:k,w:d.w*s*1.6,h:d.h*s*1.6,r:k.startsWith('tape')?(Math.random()*16-8):0});m.remove()}}
HOOKS.loaded.push(where=>{if(where!=='editor')return;const add=$('.ed-add');if(!add||$('#addNote'))return;
 add.insertAdjacentHTML('beforeend',`<button class="btn ghost sm" id="addNote">${ic('note',17)}${t('addNote')}</button><button class="btn ghost sm" id="addDeco">${ic('pin',17)}${t('addDeco')}</button>
  <button class="btn ghost sm" id="addPen">${ic('pen',17)}${t('addPen')}</button>`);
 $('#addNote').onclick=addNote;$('#addDeco').onclick=e=>openDecoPicker(e.currentTarget);$('#addPen').onclick=startDraw});

/* ---- pen: sketch freely on the board; everything drawn in one go becomes one movable piece ---- */
const PEN_COLORS=['#111111','#ffffff','#e53935','#1e88e5','#c9a227','#ec407a','#43a047'];
const PEN_TYPES={pen:{w:4,op:1},marker:{w:12,op:1},brush:{w:28,op:1},highlight:{w:30,op:.35}};
function startDraw(){if(st.ed.draw)return finishDraw();select(null);
 const D=st.ed.draw={strokes:[],color:st.ed.penColor||'#111111',type:st.ed.penType||'pen'};renderSelbar();mountDrawLayer();$('#addPen')?.classList.add('on')}
function mountDrawLayer(){const D=st.ed?.draw,stg=$('#stage');if(!D||!stg||$('#drawOv'))return;const b=board();
 stg.insertAdjacentHTML('beforeend',`<div id="drawOv"><svg viewBox="0 0 ${b.W} ${b.H}" width="100%" height="100%">${D.strokes.map(strokeSVG).join('')}</svg></div>`);
 const ov=$('#drawOv'),svg=$('svg',ov);
 ov.onpointerdown=ev=>{ev.stopPropagation();ev.preventDefault();ov.setPointerCapture(ev.pointerId);const p=PEN_TYPES[D.type],s={c:D.color,w:p.w*b.W/1000,op:p.op,pts:[toStage(ev)]};D.strokes.push(s);
  svg.insertAdjacentHTML('beforeend',strokeSVG(s));const path=svg.lastElementChild;
  ov.onpointermove=m=>{const q=toStage(m),l=s.pts[s.pts.length-1];if(Math.hypot(q.x-l.x,q.y-l.y)<1.5)return;s.pts.push(q);path.setAttribute('d',strokeD(s.pts))};
  ov.onpointerup=ov.onpointercancel=()=>{ov.onpointermove=null;if(s.pts.length===1)s.pts.push({x:s.pts[0].x+.1,y:s.pts[0].y});path.setAttribute('d',strokeD(s.pts));renderSelbar()}}}
// smooth line through the points (midpoint quadratic curves)
function strokeD(p){if(p.length<3)return `M${p[0].x} ${p[0].y}`+p.slice(1).map(q=>` L${q.x} ${q.y}`).join('');
 let d=`M${p[0].x} ${p[0].y}`;for(let i=1;i<p.length-1;i++){const mx=(p[i].x+p[i+1].x)/2,my=(p[i].y+p[i+1].y)/2;d+=` Q${p[i].x} ${p[i].y} ${mx} ${my}`}
 const l=p[p.length-1];return d+` L${l.x} ${l.y}`}
const strokeSVG=s=>`<path d="${strokeD(s.pts)}" fill="none" stroke="${s.c}" stroke-width="${s.w}" stroke-opacity="${s.op}" stroke-linecap="round" stroke-linejoin="round"/>`;
function finishDraw(){const D=st.ed?.draw;if(!D)return;st.ed.draw=null;$('#drawOv')?.remove();$('#addPen')?.classList.remove('on');
 if(D.strokes.length){const xs=[],ys=[];let mw=0;D.strokes.forEach(s=>{mw=Math.max(mw,s.w);s.pts.forEach(p=>{xs.push(p.x);ys.push(p.y)})});
  const x0=Math.min(...xs)-mw,y0=Math.min(...ys)-mw,w=Math.max(...xs)+mw-x0,h=Math.max(...ys)+mw-y0;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${h}" width="${Math.round(w)}" height="${Math.round(h)}">${D.strokes.map(strokeSVG).join('')}</svg>`;
  addEl({kind:'deco',deco:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),draw:1,w,h},{x:x0+w/2,y:y0+h/2})}
 else renderSelbar()}
function drawBarHTML(){const D=st.ed.draw;
 return `<b class="sm">✏️ ${t('penDrawing')}</b><span class="dv"></span>
  ${Object.keys(PEN_TYPES).map(k=>`<button class="btn ghost sm ${D.type===k?'on':''}" data-pt="${k}">${t('pen_'+k)}</button>`).join('')}<span class="dv"></span>
  <span class="bt-notes">${PEN_COLORS.map(c=>`<button data-pc="${c}" class="${c===D.color?'on':''}" style="background:${c}"></button>`).join('')}</span>
  <label class="colorpick" title="${t('color')}" style="background:${D.color}"><input type="color" data-pcc value="${D.color}"></label><span class="dv"></span>
  <button class="icon-btn" data-pu ${D.strokes.length?'':'disabled'} title="${t('undo')}">${ic('undo',18,'rtl-flip')}</button>
  <button class="btn ghost sm" data-px ${D.strokes.length?'':'disabled'}>${t('penClear')}</button><span class="sp" style="flex:1"></span>
  <button class="btn sm" data-pd>${t('done')}</button>`}
const _renderSelbar=renderSelbar;
renderSelbar=function(){const bar=$('#selbar');if(!st.ed?.draw||!bar)return _renderSelbar();const D=st.ed.draw;bar.innerHTML=drawBarHTML();
 const redraw=()=>{$('#drawOv')?.remove();mountDrawLayer();renderSelbar()};
 bar.onclick=ev=>{const g=k=>ev.target.closest(`[${k}]`);
  if(g('data-pt')){D.type=st.ed.penType=g('data-pt').dataset.pt;renderSelbar()}else if(g('data-pc')){D.color=st.ed.penColor=g('data-pc').dataset.pc;renderSelbar()}
  else if(g('data-pu')){D.strokes.pop();redraw()}else if(g('data-px')){D.strokes=[];redraw()}else if(g('data-pd'))finishDraw()};
 bar.oninput=ev=>{if(ev.target.dataset.pcc!==undefined){D.color=st.ed.penColor=ev.target.value;ev.target.parentNode.style.background=D.color}};bar.onchange=null};
const _renderStage=renderStage;
renderStage=function(){_renderStage();if(st.ed?.draw)mountDrawLayer()};

Object.assign(ICON,{
 note:'<path d="M4 4h16v11l-5 5H4z"/><path d="M15 20v-5h5"/>',pen:'<path d="M4 20l4-1L19 8l-3-3L5 16z"/><path d="M14 7l3 3"/>',pin:'<circle cx="12" cy="8" r="5"/><path d="M12 13v8"/>',
 crop:'<path d="M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14"/>',
 rotate:'<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
 alignX:'<path d="M12 3v18M7 8h10v8H7z"/>',alignY:'<path d="M3 12h18M8 7h8v10H8z"/>',
 shadow:'<rect x="3" y="3" width="13" height="13" rx="2"/><path d="M20 8v10a2 2 0 0 1-2 2H8"/>',
 lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',unlock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
 drop:'<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',corner:'<path d="M4 20V10a6 6 0 0 1 6-6h10"/>'});

document.head.insertAdjacentHTML('beforeend',`<style>
.selbar{height:auto;min-height:50px;flex-wrap:wrap;row-gap:6px;padding-block:6px}
.bt-rng{display:inline-flex;align-items:center;gap:5px;color:var(--muted);font-size:12px;padding:0 4px}.bt-rng input{width:74px}
.bt-crop{flex-basis:100%;display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;padding-top:6px;border-top:1px solid var(--line)}
.i.rot90{transform:rotate(90deg)}
/* a selected piece shares the class name "sel" with dropdowns; keep it see-through with just the outline and handles */
#stage .el.sel{background:none;border:0;border-radius:0;padding:0;box-shadow:none}
/* same story for the bottom-left handle "hd sw" vs the colour swatch ".el .sw": keep it a small round handle */
#stage .hd.sw{width:calc(13px * var(--inv));height:calc(13px * var(--inv));border-radius:50%}
.el.locked{cursor:default}.el.locked .hd{display:none!important}.el.locked.sel{outline-style:dashed}
.guide{position:absolute;z-index:99999;pointer-events:none;background:#ff3d7f}.guide.v{top:0;bottom:0;width:calc(1px * var(--inv))}.guide.h{left:0;right:0;height:calc(1px * var(--inv))}
.el-in{position:relative}
.note{width:100%;height:100%;padding:8% 9%;box-sizing:border-box;box-shadow:0 2px 3px rgba(0,0,0,.12),0 12px 22px rgba(0,0,0,.16);color:#2b2b2b;line-height:1.25;overflow:hidden}
.note::before{content:'';position:absolute;left:30%;right:30%;top:0;height:7%;background:rgba(0,0,0,.05)}
.k-deco .el-in img{object-fit:fill}
#drawOv{position:absolute;inset:0;z-index:99998;cursor:crosshair;touch-action:none}#drawOv svg{display:block}
#addPen.on{background:var(--ink);color:var(--bg)}
.ed-add{grid-template-columns:repeat(3,1fr);position:relative}
#decoMenu{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px;padding:8px;border:1px solid var(--line);border-radius:12px;background:var(--bg)}
#decoMenu button{width:54px;height:54px;border:1px solid var(--line);border-radius:10px;background:var(--card);display:grid;place-items:center;padding:6px}
#decoMenu button:hover{border-color:var(--ink)}#decoMenu img{max-width:100%;max-height:100%}
.bt-notes{display:inline-flex;gap:4px}.bt-notes button{width:20px;height:20px;border-radius:50%;border:1px solid rgba(128,128,128,.4);padding:0}.bt-notes button.on{box-shadow:0 0 0 2px var(--bg),0 0 0 3px var(--ink)}
</style>`);
Object.assign(S.en,{btCrop:'Crop',btFlipV:'Flip vertically',btRot90:'Turn 90°',btCenterX:'Centre left–right',btCenterY:'Centre top–bottom',btShadow:'Shadow',btLock:'Lock in place',btUnlock:'Unlock',
 btOpacity:'Opacity',btRadius:'Round corners',btLeftHalf:'Left half',btRightHalf:'Right half',btTopHalf:'Top half',btBottomHalf:'Bottom half',btReset:'Reset',
 btSide_l:'Left',btSide_r:'Right',btSide_t:'Top',btSide_b:'Bottom',addNote:'Note',addDeco:'Pins',notePh:'Double-click to write',
 pickPhoto:'Which photo do you want to use?',photo:'Photo',addPen:'Pen',penDrawing:'Drawing',pen_pen:'Pen',pen_marker:'Marker',pen_brush:'Brush',pen_highlight:'Highlighter',penClear:'Clear',deco_pinRed:'Red pin',deco_pinBlue:'Blue pin',deco_pinGold:'Gold pin',deco_tape:'Tape',deco_tapePink:'Pink tape',deco_clip:'Paper clip'});
Object.assign(S.ar,{btCrop:'قص',btFlipV:'قلب رأسي',btRot90:'لف 90°',btCenterX:'في النص بالعرض',btCenterY:'في النص بالطول',btShadow:'ظل',btLock:'تثبيت مكانها',btUnlock:'فك التثبيت',
 btOpacity:'الشفافية',btRadius:'تدوير الحواف',btLeftHalf:'النص الشمال',btRightHalf:'النص اليمين',btTopHalf:'النص اللي فوق',btBottomHalf:'النص اللي تحت',btReset:'رجّعها',
 btSide_l:'شمال',btSide_r:'يمين',btSide_t:'فوق',btSide_b:'تحت',addNote:'ورقة لاصقة',addDeco:'دبابيس',notePh:'دوس مرتين واكتب',
 pickPhoto:'عايز تحط أنهي صورة؟',photo:'صورة',addPen:'قلم',penDrawing:'بترسم',pen_pen:'قلم',pen_marker:'ماركر',pen_brush:'فرشاة',pen_highlight:'هايلايتر',penClear:'امسح الكل',deco_pinRed:'دبوس أحمر',deco_pinBlue:'دبوس أزرق',deco_pinGold:'دبوس دهبي',deco_tape:'شريط لاصق',deco_tapePink:'شريط لاصق بمبي',deco_clip:'مشبك ورق'});
