'use strict';
/* Calendar: month & week views, events with dress codes, planned vs. worn, wear history.
   A day is stored in st.plans[yyyy-mm-dd] = {outfit, worn, events:[{id,title,time,dress}]};
   older plans were just an outfit id string and are upgraded on first touch. */

function planAt(key,create){let p=st.plans[key];
 if(typeof p==='string')p=st.plans[key]={outfit:p,worn:false,events:[]};
 if(!p&&create)p=st.plans[key]={outfit:null,worn:false,events:[]};
 if(p&&!p.events)p.events=[];return p||null}
function tidyPlan(key){const p=st.plans[key];if(p&&typeof p==='object'&&!p.outfit&&!p.worn&&!(p.events||[]).length)delete st.plans[key]}
st.cal={mode:'month',anchor:null};
const calLoc=()=>lang==='ar'?'ar-EG':'en',weekStart=()=>lang==='ar'?6:1;
const dayLabel=key=>new Intl.DateTimeFormat(calLoc(),{weekday:'long',day:'numeric',month:'long'}).format(new Date(key+'T12:00'));
const boardOf=p=>p&&p.outfit?st.boards.find(b=>b.id===p.outfit):null;

function dayCell(key,d,today,big){const p=planAt(key),b=boardOf(p),ev=p?.events||[];
 return `<button class="day ${big?'wk':''} ${key===today?'today':''} ${key<today?'past':''} ${p?.worn?'worn':''}" data-d="${key}">
  <span class="dn">${d}</span>${p?.worn?`<span class="wornb" title="${t('worn')}">✓</span>`:''}
  ${b?`${b.thumb?`<img src="${b.thumb}" alt="">`:''}<span class="dl">${esc(b.name)}</span>`:big?`<span class="dplus">${ic('plus',18)}</span>`:''}
  ${ev.slice(0,big?6:2).map(e=>`<span class="evc">${e.time?`<em>${esc(e.time)}</em> `:''}${esc(e.title)}</span>`).join('')}${!big&&ev.length>2?`<span class="evc more">+${ev.length-2}</span>`:''}</button>`}

function renderCalendar(){const now=new Date(),today=ymd(now),c=st.cal;
 if(!c.anchor)c.anchor=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 Object.keys(st.plans).forEach(k=>planAt(k));
 const loc=calLoc(),sd=weekStart(),wdf=new Intl.DateTimeFormat(loc,{weekday:'short'});
 const wds=[...Array(7)].map((_,i)=>wdf.format(new Date(2024,0,7+((sd+i)%7))));
 let body='',title='',range=[];
 if(c.mode==='month'){const y=c.anchor.getFullYear(),mo=c.anchor.getMonth(),offset=(new Date(y,mo,1).getDay()-sd+7)%7,days=new Date(y,mo+1,0).getDate();
  title=new Intl.DateTimeFormat(loc,{month:'long',year:'numeric'}).format(c.anchor);
  let cells='';for(let i=0;i<offset;i++)cells+='<div class="day blank"></div>';
  for(let d=1;d<=days;d++){const key=ymd(new Date(y,mo,d));range.push(key);cells+=dayCell(key,d,today,false)}
  body=`<div class="cal">${wds.map(w=>`<div class="wd">${w}</div>`).join('')}${cells}</div>`}
 else{const a=c.anchor,start=new Date(a.getFullYear(),a.getMonth(),a.getDate()-((a.getDay()-sd+7)%7));
  const days=[...Array(7)].map((_,i)=>new Date(start.getFullYear(),start.getMonth(),start.getDate()+i));range=days.map(ymd);
  const f=new Intl.DateTimeFormat(loc,{day:'numeric',month:'short'});title=`${f.format(days[0])} – ${f.format(days[6])}`;
  body=`<div class="cal week">${wds.map(w=>`<div class="wd">${w}</div>`).join('')}${days.map(d=>dayCell(ymd(d),d.getDate(),today,true)).join('')}</div>`}
 const ps=range.map(k=>st.plans[k]).filter(Boolean),planned=ps.filter(p=>p.outfit).length,worn=ps.filter(p=>p.worn).length,evs=ps.reduce((s,p)=>s+(p.events||[]).length,0);
 $('#view').innerHTML=`<div class="page"><div class="cal-wrap"><div class="page-h"><div><h1>${t('planner')}</h1><p class="muted">${t('calStats',{p:planned,w:worn,e:evs})}</p></div>
  <div class="cal-nav"><div class="seg" id="calMode"><button data-m="month" class="${c.mode==='month'?'on':''}">${t('month')}</button><button data-m="week" class="${c.mode==='week'?'on':''}">${t('week')}</button></div>
  <button class="btn ghost sm" id="calToday">${t('todayBtn')}</button>
  <button class="icon-btn" id="pm">${ic('chevL',20,'rtl-flip')}</button><h2>${title}</h2><button class="icon-btn" id="nm">${ic('chevR',20,'rtl-flip')}</button>
  <button class="btn ghost sm" id="calHist">${t('history')}</button></div></div>${body}</div></div>`;
 const shift=n=>{const a=c.anchor;c.anchor=c.mode==='month'?new Date(a.getFullYear(),a.getMonth()+n,1):new Date(a.getFullYear(),a.getMonth(),a.getDate()+7*n);renderCalendar()};
 $('#pm').onclick=()=>shift(-1);$('#nm').onclick=()=>shift(1);$('#calToday').onclick=()=>{c.anchor=null;renderCalendar()};
 $('#calMode').onclick=e=>{const m=e.target.closest('[data-m]')?.dataset.m;if(m){c.mode=m;renderCalendar()}};
 $('#calHist').onclick=openHistory;
 $('.cal').onclick=e=>{const d=e.target.closest('.day[data-d]');if(d)openDay(d.dataset.d)}}
VIEWS.planner=renderCalendar;

async function savePlans(key){if(key)tidyPlan(key);await saveMeta()}
function openDay(key){const p=planAt(key,true),b=boardOf(p),outs=st.boards.filter(x=>x.type==='outfit'&&!x.archived).sort((a,z)=>z.updated-a.updated);
 const md=modal(`<h2>${esc(dayLabel(key))}</h2><div class="dm">
  <div><h4>${t('outfit')}</h4>
   ${b?`<div class="dm-cur">${b.thumb?`<img src="${b.thumb}" alt="">`:''}<div><b>${esc(b.name)}</b>
    <div class="dm-acts"><button class="btn ghost sm" id="dmOpen">${t('edit')}</button><button class="btn ghost sm" id="dmChange">${t('change')}</button><button class="btn ghost sm danger" id="dmRemove">${t('removePlan')}</button></div>
    <label class="check"><input type="checkbox" id="dmWorn" ${p.worn?'checked':''}> ${t('iWoreIt')}</label></div></div>`
   :`<p class="muted sm">${t('noOutfitDay')}</p><div class="dm-acts"><button class="btn sm" id="dmChange">${t('chooseOutfit')}</button><button class="btn ghost sm" id="dmAsk">✨ ${t('askStylist')}</button></div>`}
   <div class="pick-grid" id="dmPick" hidden>${outs.length?outs.map(x=>`<button class="pick ${x.id===p.outfit?'on':''}" data-id="${x.id}">${x.thumb?`<img src="${x.thumb}" alt="">`:'<div class="ph"></div>'}<span>${esc(x.name)}</span></button>`).join(''):`<p class="muted">${t('noOutfitsYet')}</p>`}</div></div>
  <div><h4>${t('events')}</h4><div id="dmEvents"></div>
   <div class="dm-add"><input class="txt-in" id="evTitle" placeholder="${t('eventPh')}"><input class="txt-in" id="evTime" type="time">
   <select class="sel" id="evDress"><option value="">${t('dressCode')}</option>${OCCASIONS.map(o=>`<option value="${o[0]}">${t('occ_'+o[0])}</option>`).join('')}</select>
   <button class="btn sm" id="evAdd">${t('add')}</button></div></div></div>
  <div class="md-f"><button class="btn ghost" data-close>${t('close')}</button></div>`,{wide:true});
 const drawEv=()=>{$('#dmEvents',md).innerHTML=p.events.length?p.events.slice().sort((a,z)=>(a.time||'').localeCompare(z.time||'')).map(e=>`<div class="ev-row"><span>${e.time?`<b>${esc(e.time)}</b> · `:''}${esc(e.title)}${e.dress?` <em class="dress">${t('occ_'+e.dress)}</em>`:''}</span><button class="icon-btn" data-rm="${e.id}">${ic('trash',14)}</button></div>`).join(''):`<p class="muted sm">${t('noEvents')}</p>`};drawEv();
 $('#dmEvents',md).onclick=async e=>{const id=e.target.closest('[data-rm]')?.dataset.rm;if(!id)return;p.events=p.events.filter(x=>x.id!==id);await savePlans();drawEv();renderCalendar()};
 $('#evAdd',md).onclick=async()=>{const title=$('#evTitle',md).value.trim();if(!title)return $('#evTitle',md).focus();
  p.events.push({id:uid(),title,time:$('#evTime',md).value,dress:$('#evDress',md).value});await savePlans();$('#evTitle',md).value='';drawEv();renderCalendar()};
 $('#dmChange',md).onclick=()=>{$('#dmPick',md).hidden=!$('#dmPick',md).hidden};
 $('#dmPick',md).onclick=async e=>{const x=e.target.closest('.pick');if(!x)return;p.outfit=x.dataset.id;await savePlans();closeModal();renderCalendar();openDay(key)};
 if($('#dmRemove',md))$('#dmRemove',md).onclick=async()=>{p.outfit=null;p.worn=false;await savePlans(key);closeModal();renderCalendar()};
 if($('#dmOpen',md))$('#dmOpen',md).onclick=()=>{closeModal();st.view='planner';openEditor(b.id)};
 if($('#dmWorn',md))$('#dmWorn',md).onchange=async e=>{p.worn=e.target.checked;await savePlans();renderCalendar();toast(p.worn?t('markedWorn'):t('unmarkedWorn'))};
 if($('#dmAsk',md))$('#dmAsk',md).onclick=()=>{const dress=p.events.find(x=>x.dress)?.dress;closeModal();if(window.stylistFor)stylistFor({date:key,occ:dress})}}

function openHistory(){const today=ymd(new Date());
 const rows=Object.keys(st.plans).filter(k=>k<=today).sort().reverse().map(k=>[k,planAt(k)]).filter(([,p])=>p.outfit||p.worn);
 const worn=rows.filter(([,p])=>p.worn).length;
 modal(`<h2>${t('history')}</h2><p class="muted">${rows.length?t('histSummary',{w:worn,n:rows.length}):t('histEmpty')}</p>
  <div class="hist">${rows.map(([k,p])=>{const b=boardOf(p);return `<div class="hist-row">${b?.thumb?`<img src="${b.thumb}" alt="">`:'<div class="ph"></div>'}
   <div><b>${esc(b?b.name:t('deletedOutfit'))}</b><small>${esc(dayLabel(k))}</small></div><span class="hb ${p.worn?'on':''}">${p.worn?t('worn'):t('plannedOnly')}</span></div>`}).join('')}</div>
  <div class="md-f"><button class="btn ghost" data-close>${t('close')}</button></div>`,{wide:true})}

Object.assign(S.en,{month:'Month',week:'Week',todayBtn:'Today',history:'History',calStats:'{p} planned · {w} worn · {e} events',outfit:'Outfit',events:'Events',change:'Change',
 iWoreIt:'I actually wore this',noOutfitDay:'No outfit planned for this day.',chooseOutfit:'Choose outfit',askStylist:'Ask the stylist',eventPh:'Event, e.g. Wedding',dressCode:'Dress code',
 noEvents:'No events.',markedWorn:'Marked as worn',unmarkedWorn:'No longer marked as worn',worn:'Worn',plannedOnly:'Planned only',histSummary:'Wore {w} of {n} planned days',
 histEmpty:'Nothing planned or worn yet.',deletedOutfit:'Deleted outfit'});
Object.assign(S.ar,{month:'شهر',week:'أسبوع',todayBtn:'النهارده',history:'السجل',calStats:'{p} متخطط · {w} اتلبس · {e} مناسبة',outfit:'الأوتفيت',events:'المناسبات',change:'تغيير',
 iWoreIt:'لبسته فعلًا',noOutfitDay:'مفيش أوتفيت متخطط لليوم ده.',chooseOutfit:'اختار أوتفيت',askStylist:'اسأل الستايليست',eventPh:'مناسبة، مثلًا فرح',dressCode:'الدريس كود',
 noEvents:'مفيش مناسبات.',markedWorn:'اتسجل إنه اتلبس',unmarkedWorn:'اتشال تسجيل اللبس',worn:'اتلبس',plannedOnly:'متخطط بس',histSummary:'لبست {w} من {n} يوم متخطط',
 histEmpty:'لسه مفيش حاجة متخططة أو ملبوسة.',deletedOutfit:'أوتفيت محذوف'});

document.head.insertAdjacentHTML('beforeend',`<style>
.cal-nav{flex-wrap:wrap}.cal-nav h2{min-width:150px}
.day{position:relative}.day.worn{border-color:#2f8f4e}.wornb{position:absolute;top:6px;inset-inline-end:6px;width:18px;height:18px;border-radius:50%;background:#2f8f4e;color:#fff;font-size:11px;display:grid;place-items:center}
.evc{font-size:10.5px;background:var(--card);border-radius:6px;padding:1px 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink2);flex:none}
.evc em{font-style:normal;color:var(--muted)}.evc.more{color:var(--muted)}
.cal.week .day{aspect-ratio:auto;min-height:340px}.cal.week .day img{flex:none;height:170px}
.dplus{flex:1;display:grid;place-items:center;color:var(--line)}.day.wk:hover .dplus{color:var(--muted)}
.dm{display:grid;grid-template-columns:1.2fr 1fr;gap:24px}.dm h4{margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.dm-cur{display:flex;gap:14px}.dm-cur img{width:140px;height:140px;object-fit:cover;border-radius:12px;border:1px solid var(--line)}.dm-cur b{font-size:15px}
.dm-acts{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}#dmPick{margin-top:12px;max-height:40vh}
.ev-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--line);font-size:13.5px}
.dress{font-style:normal;font-size:11px;background:var(--card);border-radius:6px;padding:1px 6px;color:var(--ink2)}
.dm-add{display:grid;grid-template-columns:1fr 90px;gap:6px;margin-top:10px}.dm-add .sel{border-radius:10px}
.hist{display:flex;flex-direction:column;gap:8px;max-height:60vh;overflow:auto}
.hist-row{display:flex;align-items:center;gap:12px;border:1px solid var(--line);border-radius:12px;padding:6px}
.hist-row img,.hist-row .ph{width:56px;height:56px;border-radius:9px;object-fit:cover;background:var(--card)}.hist-row div{flex:1;display:flex;flex-direction:column}.hist-row small{color:var(--muted)}
.hb{font-size:11.5px;padding:3px 9px;border-radius:999px;background:var(--card);color:var(--muted)}.hb.on{background:#2f8f4e;color:#fff}
@media (max-width:820px){.dm{grid-template-columns:1fr}}
</style>`);
