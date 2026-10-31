'use strict';
/* Phone layout (iPhone and other narrow screens): two-row top bar with a scrollable tab strip,
   the closet sidebar becomes a slide-in drawer, windows open as bottom sheets, and hover-only controls stay visible on touch. */
const isPhone=()=>matchMedia('(max-width:760px)').matches;
HOOKS.closetTools.push(()=>`<button class="btn ghost m-only" id="mSide">${ic('filter',15)} ${t('mFilters')}</button>`);
HOOKS.loaded.push(where=>{if(where!=='closet')return;const closet=$('.closet'),side=$('#side');if(!closet||!side)return;
 let bd=$('.m-backdrop',closet);if(!bd){bd=document.createElement('div');bd.className='m-backdrop';closet.appendChild(bd)}
 const close=()=>closet.classList.remove('side-open');
 $('#mSide').onclick=()=>closet.classList.add('side-open');bd.onclick=close});
// picking a category on a phone closes the drawer so the pieces are visible right away (capture: the sidebar re-renders itself on click)
document.addEventListener('click',e=>{if(isPhone()&&e.target.closest('#side .cat'))setTimeout(()=>$('.closet')?.classList.remove('side-open'),150)},true);
if(!ICON.filter)ICON.filter='<path d="M4 6h16M7 12h10M10 18h4"/>';

/* bottom tab bar (phone): the four main places plus "More" for the rest */
const M_TABS=[['closet','mtCloset'],['outfits','mtOutfits'],['stylist','mtStylist'],['moods','mtMoods']];
Object.assign(ICON,{mtCloset:'<path d="M12 6.5a2 2 0 1 1 2-2"/><path d="M12 6.5V8L3.5 14.5A1.5 1.5 0 0 0 4.4 17h15.2a1.5 1.5 0 0 0 .9-2.5L12 8"/>',
 mtOutfits:'<path d="M8 3l-5 3 2 4 3-1.5V21h8V8.5l3 1.5 2-4-5-3a4 4 0 0 1-8 0z"/>',mtStylist:'<path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3z"/><path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
 mtMoods:'<rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="6" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/>',
 mtMore:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'});
function renderTabs(){let bar=$('#mTabs');if(!bar){bar=document.createElement('nav');bar.id='mTabs';$('main#view').after(bar);
  bar.onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;if(b.dataset.v==='more')openMore();else setView(b.dataset.v)}}
 const cur=st.view==='editor'?st.ed?.from:st.view,inMore=!M_TABS.some(x=>x[0]===cur);
 document.body.classList.toggle('in-editor',st.view==='editor');
 bar.innerHTML=M_TABS.map(([v,icn])=>`<button data-v="${v}" class="${cur===v?'on':''}">${ic(icn,22)}<span>${t(v)}</span></button>`).join('')+
  `<button data-v="more" class="${inMore?'on':''}">${ic('mtMore',22)}<span>${t('mMore')}</span></button>`}
function openMore(){const rest=[...NAV.filter(v=>!M_TABS.some(x=>x[0]===v)),...(window.MORE_EXTRA||[])];
 const md=modal(`<h2>${t('mMore')}</h2><div class="m-more">${rest.map(v=>`<button data-v="${v}" class="${st.view===v?'on':''}"><span>${t(v)}</span>${ic('chevR',16,'rtl-flip')}</button>`).join('')}
  <button data-x="lang"><span>${lang==='ar'?'English':'عربي'}</span>${ic('chevR',16,'rtl-flip')}</button><button data-x="set"><span>${t('settings')}</span>${ic('chevR',16,'rtl-flip')}</button></div>`);
 md.onclick=e=>{const b=e.target.closest('[data-v],[data-x]');if(!b)return;closeModal();
  if(b.dataset.v)setView(b.dataset.v);else $(b.dataset.x==='lang'?'#langBtn':'#setBtn')?.click()}}
const _renderNav=renderNav;
renderNav=function(){_renderNav();renderTabs()};
// closet toolbar on a phone: search on top, the rest in one swipeable row, "Add" as a floating button
HOOKS.loaded.push(where=>{if(where!=='closet'||!isPhone())return;const tool=$('.ctool');if(!tool||$('.m-row',tool))return;
 const row=document.createElement('div');row.className='m-row';['#webBtn','#mSide','#sort','#bulkBtn','#impBtn'].forEach(s=>{const n=$(s,tool);if(n)row.appendChild(n)});tool.appendChild(row)});

document.head.insertAdjacentHTML('beforeend',`<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Fits">
<link rel="apple-touch-icon" href="icon-180.png"><link rel="manifest" href="manifest.json"><meta name="theme-color" content="#121212">
<style>
.m-only{display:none}
.top{padding-top:env(safe-area-inset-top)}
@media (hover:none){.bact{opacity:1}.card:hover .card-img{transform:none}}
@media (max-width:760px){
 body{font-size:15px}
 .m-only{display:inline-flex}
 .top{height:auto;flex-wrap:wrap;gap:8px 10px;padding:calc(8px + env(safe-area-inset-top)) 12px 8px}
 .brand .word{font-size:20px}.logo{width:32px;height:32px}
 .top-actions{margin-inline-start:auto}
 .top-actions #langBtn{display:none}
 #nav{order:3;flex:1 1 100%;overflow-x:auto;scrollbar-width:none;margin:0 -12px;padding:0 12px}
 #nav::-webkit-scrollbar{display:none}
 #nav .nav-b{white-space:nowrap;padding:7px 13px;flex:none}
 .prof-chip{max-width:130px}
 .closet{position:relative}
 #syncBtn{display:none}
 .side{display:block;position:fixed;top:0;bottom:0;inset-inline-start:0;width:min(84vw,320px);z-index:96;transform:translateX(-105%);transition:transform .22s ease;box-shadow:var(--shadow);padding-top:calc(20px + env(safe-area-inset-top))}
 [dir=rtl] .side{transform:translateX(105%)}
 .closet.side-open .side{transform:none}
 .m-backdrop{display:none;position:fixed;inset:0;z-index:95;background:rgba(0,0,0,.4)}
 .closet.side-open .m-backdrop{display:block}
 .cmain{padding:12px 12px calc(80px + env(safe-area-inset-bottom))}
 .ctool{flex-wrap:wrap;gap:8px}
 .ctool .search{flex:1 1 100%;max-width:none;order:-1}
 .ctool .sp{display:none}
 .ctool .btn{padding:8px 12px}
 main#view,.closet{min-width:0;max-width:100vw}
 .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
 .card-img img{padding:10px}
 .csec{margin-top:18px}
 #modal-root .ov{padding:0;place-items:end stretch}
 .md,.md.wide,.md.xwide{width:100%;max-height:92dvh;border-radius:20px 20px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom))}
 .item-md{gap:14px}
 .im-img{max-height:52dvh;margin:0 auto;width:auto;aspect-ratio:4/5}
 .form-grid{grid-template-columns:1fr}
 .md-f{flex-wrap:wrap}
 .md-f .btn{flex:1 1 auto;justify-content:center}
 .md-f .sp{display:none}
 .imp-opts{grid-template-columns:1fr}
 .editor{flex-direction:column}
 .ed-l{width:auto;order:2;height:36dvh;border-inline-end:0;border-top:1px solid var(--line);padding:10px}
 .ed-items{grid-template-columns:repeat(4,1fr)}
 .ed-top{flex-wrap:wrap}
 .selbar{height:auto;flex-wrap:wrap;padding:6px 10px;gap:6px}
 .cal{gap:4px}.day{padding:3px;border-radius:8px}.day .dl{display:none}.cal-nav h2{min-width:0;font-size:16px}
 #profiles{padding:calc(24px + env(safe-area-inset-top)) 16px 24px}
 #profiles h1{font-size:24px;margin-bottom:24px}
 .pf-grid{gap:18px}.pf{width:110px}.pf-av{width:96px;height:96px}
 .pf-foot{flex-wrap:wrap;margin-top:26px}
 #toast{bottom:calc(20px + env(safe-area-inset-bottom));max-width:calc(100vw - 32px);text-align:center}
 #bulkBar{bottom:calc(84px + env(safe-area-inset-bottom));max-height:45dvh;overflow:auto}
 /* ---- refined phone look ---- */
 .top{flex-wrap:nowrap;border-bottom:0;padding:calc(10px + env(safe-area-inset-top)) 16px 6px;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
 #nav{display:none}
 .top-actions #setBtn{display:none}
 #mTabs{display:flex;flex:none;justify-content:space-around;padding:6px 6px calc(6px + env(safe-area-inset-bottom));border-top:1px solid var(--line);
  background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);z-index:60}
 #mTabs button{flex:1;border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 0 2px;color:var(--muted);font-size:10.5px;font-weight:600;letter-spacing:.01em}
 #mTabs button.on{color:var(--ink)}#mTabs button.on .i{stroke-width:2.2}
 #mTabs button.on span{position:relative}#mTabs button.on span::after{content:'';position:absolute;left:50%;bottom:-6px;width:4px;height:4px;margin-left:-2px;border-radius:50%;background:#c9a227}
 body.in-editor #mTabs{display:none}
 .cmain{padding:6px 16px 28px}
 .ctool{display:flex;flex-direction:column;align-items:stretch;gap:10px}
 .ctool{min-width:0;max-width:100%;flex-wrap:nowrap}.ctool>*{min-width:0}.ctool .search{flex:none;background:var(--card);border:1px solid var(--line)}
 .cmain{overflow-x:hidden}
 #dupBtn{display:none}
 .m-row{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding:0 16px 2px}.m-row::-webkit-scrollbar{display:none}
 .m-row>*{flex:none}.m-row .btn,.m-row .sel{padding:7px 13px;font-size:12.5px;font-weight:500;border-color:var(--line);background:var(--bg);color:var(--ink2);border-radius:999px}
 #addBtn{position:fixed;inset-inline-end:18px;bottom:calc(86px + env(safe-area-inset-bottom));width:56px;height:56px;border-radius:50%;padding:0;justify-content:center;font-size:0;gap:0;z-index:50;
  box-shadow:0 10px 26px rgba(0,0,0,.28);background:linear-gradient(160deg,#fcfaf7,#e9dfd2);color:#151515;border:0}
 #addBtn .i{width:24px;height:24px}
 .stats{margin:12px 2px 0;font-size:12px;letter-spacing:.02em}
 .csec{margin-top:26px}
 .csec h3,.page-h h1,.md h2{font-family:'Playfair Display','Amiri',serif;font-weight:400;letter-spacing:0}
 .csec h3{font-size:22px;margin-bottom:14px}.csec h3 span{font-family:var(--font);font-size:12px}
 .page{padding:8px 16px 32px}.page-h{flex-wrap:wrap;gap:12px;margin-bottom:18px}.page-h h1{font-size:32px;line-height:1.1}
 .page-h>div:last-child:not(:first-child){width:100%;flex-wrap:wrap}
 .grid{gap:12px}
 .card-img{border-radius:18px}
 .card .card-b b,.card b{font-weight:600;font-size:13px}
 .sty-ctl{padding:14px 14px 4px;border-radius:20px}
 .sty-ctl .chips{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 -14px;padding:0 14px 4px}.sty-ctl .chips::-webkit-scrollbar{display:none}
 .sty-ctl .chip{flex:none}.sty-ctl{min-width:0;overflow:hidden}.sty-ctl>*{min-width:0}
 .sty-go{flex-wrap:wrap}.sty-go .muted{flex:1 1 100%}
 .page{overflow-x:hidden}
 .sres-grid{grid-template-columns:1fr;gap:16px}.sres{border-radius:22px}
 .bgrid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px}
 .of-bar{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 -16px 16px;padding:0 16px}.of-bar>*{flex:none}
 .ed-add{grid-template-columns:repeat(4,1fr)}
 .m-more{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:16px;overflow:hidden}
 .m-more button{display:flex;justify-content:space-between;align-items:center;border:0;border-bottom:1px solid var(--line);background:var(--bg);padding:15px 16px;font-size:15px;text-align:start}
 .m-more button:last-child{border-bottom:0}.m-more button.on{font-weight:700}
 .mgrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
 .mcard .md{width:auto;padding:0;max-height:none;border-radius:0}/* the card's date line shares the window class "md" */
}
@media (min-width:761px){#mTabs{display:none}}
</style>`);
Object.assign(S.en,{mFilters:'Categories',mMore:'More'});
Object.assign(S.ar,{mFilters:'الأقسام',mMore:'المزيد'});
