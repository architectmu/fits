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
 #bulkBar{bottom:calc(10px + env(safe-area-inset-bottom));max-height:45dvh;overflow:auto}
}
</style>`);
Object.assign(S.en,{mFilters:'Categories'});
Object.assign(S.ar,{mFilters:'الأقسام'});
