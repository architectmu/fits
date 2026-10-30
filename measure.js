'use strict';
/* My measurements: dated body measurements (stored in cm / kg, shown in metric or imperial) and fit notes per brand.
   Saved per profile in the meta store as {id:'measure', data:{entries:[{id,date,v:{field:number}}], shoe:[{date,v}], brands:[...]}}. */

NAV.push('fit');
const MFIELDS=[['height','cm'],['weight','kg'],['chest','cm'],['waist','cm'],['shoulders','cm'],['sleeve','cm'],['neck','cm'],['inseam','cm'],['outseam','cm'],['thigh','cm']];
const FITS=['trueSize','slim','regular','oversized','long','short','tight','loose'];
const FIT_SCOPES=['all','tops','bottoms','outerwear','shoes'];
let MEAS=null,MEAS_FOR=null;
async function loadMeasure(){if(MEAS&&MEAS_FOR===curProf?.id)return MEAS;
 const m=(await DB.all('meta')).find(x=>x.id==='measure');MEAS=Object.assign({entries:[],brands:[]},m?.data);MEAS_FOR=curProf?.id;return MEAS}
const saveMeasure=()=>DB.put('meta',{id:'measure',data:MEAS});
const imperial=()=>lsGet('fits-units')==='imperial';
const toShow=(v,u)=>v==null||v===''?'':imperial()?(u==='kg'?v*2.20462:v/2.54):v;
const fromShow=(v,u)=>imperial()?(u==='kg'?v/2.20462:v*2.54):v;
const unitLabel=u=>imperial()?(u==='kg'?'lb':'in'):u;
const fmtNum=n=>n===''||n==null?'—':(Math.round(n*10)/10).toLocaleString(lang==='ar'?'ar-EG':'en');
const fmtDate=d=>new Intl.DateTimeFormat(lang==='ar'?'ar-EG':'en',{dateStyle:'medium'}).format(new Date(d+'T12:00'));

function latest(field){const es=MEAS.entries.filter(e=>e.v[field]!=null&&e.v[field]!=='').sort((a,b)=>b.date.localeCompare(a.date));return {cur:es[0],prev:es[1]}}
async function renderFit(){await loadMeasure();
 const sorted=MEAS.entries.slice().sort((a,b)=>b.date.localeCompare(a.date));
 const card=([f,u])=>{const {cur,prev}=latest(f);const v=cur?.v[f],d=cur&&prev?v-prev.v[f]:0;
  return `<div class="mcard"><span class="ml">${t('m_'+f)}</span><b>${fmtNum(toShow(v,u))}<small>${v!=null?unitLabel(u):''}</small></b>
   <span class="md ${d>0?'up':d<0?'down':''}">${d?`${d>0?'▲':'▼'} ${fmtNum(Math.abs(toShow(d,u)))}`:cur?fmtDate(cur.date):t('notSet')}</span></div>`};
 const shoe=latest('shoe');
 const brandCount=b=>st.items.filter(i=>(i.brand||'').toLowerCase()===b.toLowerCase()).length;
 $('#view').innerHTML=`<div class="page"><div class="page-h"><div><h1>${t('fit')}</h1><p class="muted">${t('fitSub')}</p></div>
  <div style="display:flex;gap:8px;align-items:center"><div class="seg" id="mUnits"><button data-u="metric" class="${imperial()?'':'on'}">cm · kg</button><button data-u="imperial" class="${imperial()?'on':''}">in · lb</button></div>
  <button class="btn" id="mUpdate">${ic('plus',15)} ${t('updateMeasure')}</button></div></div>
  <div class="mgrid">${MFIELDS.map(card).join('')}<div class="mcard"><span class="ml">${t('m_shoe')}</span><b>${esc(shoe.cur?.v.shoe||'—')}</b><span class="md">${shoe.cur?fmtDate(shoe.cur.date):t('notSet')}</span></div></div>
  <h3 class="msec">${t('brandFit')} <span class="muted sm">${t('brandFitSub')}</span></h3>
  <div class="bfit">${MEAS.brands.map(b=>`<div class="bf" data-id="${b.id}"><div class="bf-h"><b>${esc(b.brand)}</b><span class="fitb">${t('fit_'+b.fit)}</span></div>
   <div class="muted sm">${t('scope_'+b.scope)}${b.size?` · ${t('size')}: <b>${esc(b.size)}</b>`:''}${brandCount(b.brand)?` · ${t('nItems',{n:brandCount(b.brand)})}`:''}</div>
   ${b.notes?`<p>${esc(b.notes)}</p>`:''}<div class="bf-a"><button class="btn ghost sm" data-edit="${b.id}">${t('edit')}</button><button class="btn ghost sm danger" data-del="${b.id}">${ic('trash',13)}</button></div></div>`).join('')}
   <button class="bf add" id="bfAdd">${ic('plus',20)}<span>${t('addBrandFit')}</span></button></div>
  <h3 class="msec">${t('mHistory')}</h3>
  ${sorted.length?`<div class="mtable-wrap"><table class="mtable"><thead><tr><th>${t('date')}</th>${MFIELDS.map(([f,u])=>`<th>${t('m_'+f)} <small>${unitLabel(u)}</small></th>`).join('')}<th>${t('m_shoe')}</th><th></th></tr></thead>
   <tbody>${sorted.map(e=>`<tr><td>${fmtDate(e.date)}</td>${MFIELDS.map(([f,u])=>`<td>${e.v[f]!=null&&e.v[f]!==''?fmtNum(toShow(e.v[f],u)):''}</td>`).join('')}<td>${esc(e.v.shoe||'')}</td>
   <td><button class="icon-btn" data-edit-e="${e.id}">${ic('text',14)}</button><button class="icon-btn" data-del-e="${e.id}">${ic('trash',14)}</button></td></tr>`).join('')}</tbody></table></div>`
   :`<p class="muted">${t('noMeasures')}</p>`}</div>`;
 $('#mUnits').onclick=e=>{const u=e.target.closest('[data-u]')?.dataset.u;if(!u)return;lsSet('fits-units',u);renderFit()};
 $('#mUpdate').onclick=()=>editEntry(null);$('#bfAdd').onclick=()=>editBrand(null);
 $('.bfit').onclick=async e=>{const ed=e.target.closest('[data-edit]')?.dataset.edit,del=e.target.closest('[data-del]')?.dataset.del;
  if(ed)editBrand(MEAS.brands.find(b=>b.id===ed));
  if(del){const b=MEAS.brands.find(x=>x.id===del);if(!await askConfirm(t('confirmDelBoard',{n:b.brand})))return;MEAS.brands=MEAS.brands.filter(x=>x.id!==del);await saveMeasure();renderFit()}};
 $('.mtable')?.addEventListener('click',async e=>{const ed=e.target.closest('[data-edit-e]')?.dataset.editE,del=e.target.closest('[data-del-e]')?.dataset.delE;
  if(ed)editEntry(MEAS.entries.find(x=>x.id===ed));
  if(del){if(!await askConfirm(t('confirmDelEntry')))return;MEAS.entries=MEAS.entries.filter(x=>x.id!==del);await saveMeasure();renderFit()}})}

function editEntry(entry){const isNew=!entry,base=isNew?{}:entry.v,pre=f=>isNew?latest(f).cur?.v[f]:base[f];
 const md=modal(`<h2>${isNew?t('updateMeasure'):t('editMeasure')}</h2>
  <label class="fld"><span>${t('date')}</span><input type="date" id="meDate" value="${entry?.date||ymd(new Date())}" max="${ymd(new Date())}"></label>
  <div class="mform">${MFIELDS.map(([f,u])=>{const v=pre(f);return `<label class="fld"><span>${t('m_'+f)} (${unitLabel(u)})</span><input type="number" step="0.1" min="0" data-f="${f}" data-u="${u}" value="${v!=null&&v!==''?Math.round(toShow(v,u)*10)/10:''}"></label>`}).join('')}
  <label class="fld"><span>${t('m_shoe')}</span><input data-f="shoe" placeholder="43 EU" value="${esc(pre('shoe')||'')}"></label></div>
  <p class="muted sm" id="meErr"></p>
  <div class="md-f"><button class="btn ghost" data-close>${t('cancel')}</button><button class="btn" id="meSave">${t('save')}</button></div>`,{wide:true});
 $('#meSave',md).onclick=async()=>{const date=$('#meDate',md).value,v={};let bad='';
  if(!date||date>ymd(new Date()))bad=t('badDate');
  $$('[data-f]',md).forEach(inp=>{const f=inp.dataset.f,raw=inp.value.trim();if(!raw)return;
   if(f==='shoe'){v.shoe=raw.slice(0,20);return}
   const n=parseFloat(raw);if(!isFinite(n)||n<=0||n>(inp.dataset.u==='kg'?(imperial()?900:400):(imperial()?120:300))){bad=t('badValue',{f:t('m_'+f)});return}
   v[f]=Math.round(fromShow(n,inp.dataset.u)*10)/10});
  if(!bad&&!Object.keys(v).length)bad=t('enterOne');
  if(bad){$('#meErr',md).textContent=bad;$('#meErr',md).style.color='var(--danger)';return}
  if(isNew)MEAS.entries.push({id:uid(),date,v});else Object.assign(entry,{date,v});
  await saveMeasure();closeModal();toast(t('saved'));renderFit()}}
function editBrand(b){const isNew=!b,brands=[...new Set(st.items.map(i=>i.brand).filter(Boolean))].sort();
 const md=modal(`<h2>${isNew?t('addBrandFit'):t('editBrandFit')}</h2>
  <div class="form-grid"><label class="fld"><span>${t('brand')}</span><input id="bfBrand" list="bfList" value="${esc(b?.brand||'')}"><datalist id="bfList">${brands.map(x=>`<option value="${esc(x)}">`).join('')}</datalist></label>
  <label class="fld"><span>${t('appliesTo')}</span><select id="bfScope">${FIT_SCOPES.map(s=>`<option value="${s}" ${b?.scope===s?'selected':''}>${t('scope_'+s)}</option>`).join('')}</select></label>
  <label class="fld"><span>${t('size')}</span><input id="bfSize" placeholder="M / 32 / 43" value="${esc(b?.size||'')}"></label>
  <label class="fld"><span>${t('fitLabel')}</span><select id="bfFit">${FITS.map(f=>`<option value="${f}" ${b?.fit===f?'selected':''}>${t('fit_'+f)}</option>`).join('')}</select></label></div>
  <label class="fld"><span>${t('notes')}</span><textarea id="bfNotes" rows="2" placeholder="${t('fitNotesPh')}">${esc(b?.notes||'')}</textarea></label>
  <div class="md-f"><button class="btn ghost" data-close>${t('cancel')}</button><button class="btn" id="bfSave">${t('save')}</button></div>`);
 $('#bfSave',md).onclick=async()=>{const brand=$('#bfBrand',md).value.trim();if(!brand){$('#bfBrand',md).focus();return}
  const rec={id:b?.id||uid(),brand,scope:$('#bfScope',md).value,size:$('#bfSize',md).value.trim().slice(0,20),fit:$('#bfFit',md).value,notes:$('#bfNotes',md).value.trim()};
  if(isNew)MEAS.brands.push(rec);else Object.assign(b,rec);await saveMeasure();closeModal();toast(t('saved'));renderFit()}}
/* show the brand fit note inside a piece's window when one exists for its brand */
HOOKS.itemExtrasHTML.push(it=>{if(!MEAS||MEAS_FOR!==curProf?.id||!it.brand)return '';const notes=MEAS.brands.filter(b=>b.brand.toLowerCase()===it.brand.toLowerCase());
 return notes.length?`<div class="fitnote">${notes.map(b=>`<b>${esc(b.brand)}</b> · ${t('scope_'+b.scope)}: ${b.size?esc(b.size)+' · ':''}${t('fit_'+b.fit)}${b.notes?` — ${esc(b.notes)}`:''}`).join('<br>')}</div>`:''});
HOOKS.loaded.push(w=>{if(w==='closet')loadMeasure()});
VIEWS.fit=renderFit;

Object.assign(S.en,{fit:'My measurements',fitSub:'Body measurements over time, and how each brand fits you',updateMeasure:'Update measurements',editMeasure:'Edit measurements',
 m_height:'Height',m_weight:'Weight',m_chest:'Chest',m_waist:'Waist',m_shoulders:'Shoulders',m_sleeve:'Sleeve length',m_neck:'Neck',m_inseam:'Inseam',m_outseam:'Outseam',m_thigh:'Thigh',m_shoe:'Shoe size',
 notSet:'Not set',brandFit:'Fit by brand',brandFitSub:'— your size and how it fits',addBrandFit:'Add brand fit',editBrandFit:'Edit brand fit',appliesTo:'Applies to',fitLabel:'Fit',
 scope_all:'Everything',scope_tops:'Tops',scope_bottoms:'Bottoms',scope_outerwear:'Outerwear',scope_shoes:'Shoes',
 fit_trueSize:'True to size',fit_slim:'Slim fit',fit_regular:'Regular fit',fit_oversized:'Oversized',fit_long:'Runs long',fit_short:'Runs short',fit_tight:'Runs tight',fit_loose:'Runs loose',
 fitNotesPh:'e.g. size down in knitwear; sleeves are long',mHistory:'History',date:'Date',noMeasures:'No measurements yet — add your first set.',
 confirmDelEntry:'Delete this set of measurements?',badDate:'Pick a date that isn’t in the future.',badValue:'Check the value for {f}.',enterOne:'Enter at least one measurement.'});
Object.assign(S.ar,{fit:'مقاساتي',fitSub:'مقاسات جسمك على مدار الوقت، ومقاسك في كل براند',updateMeasure:'تحديث المقاسات',editMeasure:'تعديل المقاسات',
 m_height:'الطول',m_weight:'الوزن',m_chest:'الصدر',m_waist:'الوسط',m_shoulders:'الأكتاف',m_sleeve:'طول الكم',m_neck:'الرقبة',m_inseam:'طول الرجل من جوه',m_outseam:'طول البنطلون من بره',m_thigh:'الفخذ',m_shoe:'مقاس الجزمة',
 notSet:'مش متسجل',brandFit:'مقاسك حسب البراند',brandFitSub:'— المقاس اللي بتلبسه وقصّته عليك',addBrandFit:'ضيف براند',editBrandFit:'تعديل البراند',appliesTo:'ينطبق على',fitLabel:'القصّة',
 scope_all:'كل حاجة',scope_tops:'التوبات',scope_bottoms:'البناطيل',scope_outerwear:'الجواكت والمعاطف',scope_shoes:'الجزم',
 fit_trueSize:'مقاسه مظبوط',fit_slim:'سليم فيت',fit_regular:'ريجولار فيت',fit_oversized:'أوفر سايز',fit_long:'طويل شوية',fit_short:'قصير شوية',fit_tight:'ضيق شوية',fit_loose:'واسع شوية',
 fitNotesPh:'مثلًا: التريكو بنزل مقاس؛ الكم طويل',mHistory:'السجل',date:'التاريخ',noMeasures:'لسه مفيش مقاسات — ضيف أول مرة.',
 confirmDelEntry:'تحذف المقاسات دي؟',badDate:'اختار تاريخ مش في المستقبل.',badValue:'راجع قيمة {f}.',enterOne:'اكتب مقاس واحد على الأقل.'});

document.head.insertAdjacentHTML('beforeend',`<style>
.mgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:34px}
.mcard{border:1px solid var(--line);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:4px;background:var(--bg)}
.mcard .ml{font-size:12px;color:var(--muted);font-weight:600}.mcard b{font-size:24px;letter-spacing:-.02em;font-weight:700}.mcard b small{font-size:12px;color:var(--muted);margin-inline-start:4px;font-weight:500}
.mcard .md{font-size:11.5px;color:var(--muted)}.mcard .md.up{color:#b4651a}.mcard .md.down{color:#2f8f4e}
.msec{font-size:17px;margin:0 0 14px;display:flex;gap:8px;align-items:baseline}
.bfit{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-bottom:34px}
.bf{border:1px solid var(--line);border-radius:16px;padding:14px 16px;background:var(--bg);display:flex;flex-direction:column;gap:6px}.bf p{margin:0;font-size:13px;line-height:1.5;color:var(--ink2)}
.bf-h{display:flex;justify-content:space-between;align-items:center;gap:8px}.fitb{font-size:11.5px;background:var(--card);border-radius:999px;padding:3px 9px}
.bf-a{display:flex;gap:6px;margin-top:auto}.bf.add{border-style:dashed;align-items:center;justify-content:center;color:var(--muted);cursor:pointer;min-height:120px;font:inherit}.bf.add:hover{border-color:var(--ink);color:var(--ink)}
.mtable-wrap{overflow:auto;border:1px solid var(--line);border-radius:14px}.mtable{border-collapse:collapse;width:100%;font-size:13px}
.mtable th,.mtable td{padding:9px 12px;border-bottom:1px solid var(--line);text-align:start;white-space:nowrap}.mtable th{font-size:11.5px;color:var(--muted);font-weight:600;background:var(--panel)}
.mtable th small{font-weight:400}.mtable tr:last-child td{border-bottom:0}
.mform{display:grid;grid-template-columns:repeat(3,1fr);gap:0 12px}
.fitnote{margin-top:10px;font-size:12.5px;background:var(--card);border-radius:10px;padding:8px 12px;line-height:1.6}
@media (max-width:820px){.mform{grid-template-columns:1fr 1fr}}
</style>`);
