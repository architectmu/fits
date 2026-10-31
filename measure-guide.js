'use strict';
/* How to measure: tap a measurement card (or the ⓘ next to a field) to see a white body figure with that
   measurement marked, step-by-step instructions, and what it usually means for your size. */

// left half of the figure (x<100); mirrored for the right half. viewBox 0 0 200 440
const BODY_HALF='M93 60C92 71 88 77 80 80L60 84C50 86 45 94 44 106L38 190L32 268C30 280 30 296 36 302C42 304 46 296 45 286L48 268L54 196L60 128L64 130C64 160 68 186 70 204C66 222 64 236 64 246L68 330L72 410L62 424L93 424L92 410L94 330L99 262L100 258';
function bodySVG(mark){const half=`<path d="${BODY_HALF}L100 60Z"/>`,line=`<path d="${BODY_HALF}" fill="none"/>`;
 return `<svg class="mg-body" viewBox="0 0 200 440" aria-hidden="true">
  <g class="mg-fill">${half}<g transform="translate(200 0) scale(-1 1)">${half}</g><ellipse cx="100" cy="38" rx="20" ry="25"/></g>
  <g class="mg-line">${line}<g transform="translate(200 0) scale(-1 1)">${line}</g><ellipse cx="100" cy="38" rx="20" ry="25" fill="none"/></g>
  <g class="mg-mark">${MG_MARKS[mark]||''}</g></svg>`}
const ring=(cx,cy,rx,ry)=>`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke-dasharray="4 3"/><circle cx="${cx+rx}" cy="${cy}" r="3" class="dot"/>`;
const arrow=(pts)=>`<polyline points="${pts}" fill="none" marker-start="url(#mgA)" marker-end="url(#mgA)"/>`;
const MG_DEFS='<defs><marker id="mgA" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ah"/></marker></defs>';
const MG_MARKS={
 height:MG_DEFS+arrow('186,13 186,424')+'<line x1="170" y1="13" x2="194" y2="13"/><line x1="170" y1="424" x2="194" y2="424"/>',
 weight:'<rect x="56" y="424" width="88" height="12" rx="4"/><text x="100" y="434" text-anchor="middle" class="tx">kg</text>',
 chest:ring(100,122,38,6),waist:ring(100,200,31,5),neck:ring(100,72,11,4),thigh:ring(118,272,17,4),
 shoulders:MG_DEFS+arrow('53,86 147,86')+'<circle cx="53" cy="86" r="3" class="dot"/><circle cx="147" cy="86" r="3" class="dot"/>',
 sleeve:MG_DEFS+arrow('147,86 156,106 162,190 168,268'),
 inseam:MG_DEFS+arrow('103,264 107,410'),
 outseam:MG_DEFS+arrow('131,202 136,246 132,330 128,410'),
 shoe:MG_DEFS+arrow('106,430 138,430')};
// general men's size from a body measurement in cm (most high-street brands; always check the brand's own chart)
const MG_SIZES={chest:[[91,'XS'],[97,'S'],[104,'M'],[112,'L'],[120,'XL'],[128,'XXL'],[999,'3XL']],
 waist:[[76,'XS · 28'],[81,'S · 30'],[89,'M · 32'],[97,'L · 34–36'],[105,'XL · 38'],[113,'XXL · 40'],[999,'3XL · 42+']],
 neck:[[37,'XS · 36–37'],[39,'S · 38'],[41,'M · 39–40'],[43,'L · 41–42'],[45,'XL · 43–44'],[999,'XXL · 45+']],
 inseam:[[74,'Short · L28–29'],[80,'Regular · L30–31'],[85,'Long · L32–33'],[999,'Extra long · L34+']]};
const sizeFromCm=(f,v)=>v&&MG_SIZES[f]?.find(([max])=>v<max)?.[1];

function openMeasureGuide(f){const u=(MFIELDS.find(x=>x[0]===f)||[,'cm'])[1],cur=MEAS&&latest(f).cur?.v[f];const sz=sizeFromCm(f,cur);
 const steps=String(t('mgSteps_'+f)).split('|');
 const md=modal(`<div class="mg"><div class="mg-fig">${bodySVG(f)}</div><div class="mg-txt">
  <span class="mg-k">${t('mgHow')}</span><h2>${t('m_'+f)}</h2>
  <ol>${steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>
  ${t('mgFor_'+f)!=='mgFor_'+f?`<p class="mg-for"><b>${t('mgUsedFor')}</b> ${esc(t('mgFor_'+f))}</p>`:''}
  ${cur!=null?`<div class="mg-you"><span>${t('mgYours')}</span><b>${fmtNum(toShow(cur,u))} ${unitLabel(u)}</b>${sz?`<span>${t('mgUsually')} <b>${esc(sz)}</b></span>`:''}</div>`:''}
  ${MG_SIZES[f]?`<details class="mg-tbl"><summary>${t('mgChart')}</summary><table>${MG_SIZES[f].map(([max,s],i,a)=>`<tr class="${s===sz?'on':''}"><td>${esc(s)}</td><td>${i?Math.round(toShow(a[i-1][0],'cm')):'<'}${max<999?' – '+Math.round(toShow(max,'cm')):'+'} ${unitLabel('cm')}</td></tr>`).join('')}</table><p class="muted sm">${t('mgChartNote')}</p></details>`:''}
  <p class="mg-tips">${t('mgTips')}</p>
 </div></div><div class="md-f"><button class="btn ghost" data-close>${t('close')}</button><span class="sp"></span><button class="btn" id="mgUpd">${t('updateMeasure')}</button></div>`,{wide:true});
 $('#mgUpd',md).onclick=()=>{closeModal();editEntry(null)}}
function openMeasureOverview(){const all=[...MFIELDS.map(x=>x[0]),'shoe'];
 const md=modal(`<h2>${t('mgOverview')}</h2><p class="muted sm" style="margin:-8px 0 14px">${t('mgTips')}</p>
  <div class="mg-list">${all.map(f=>`<button class="mg-item" data-f="${f}">${bodySVG(f)}<span>${t('m_'+f)}</span></button>`).join('')}</div>
  <div class="md-f"><button class="btn ghost" data-close>${t('close')}</button></div>`,{wide:true});
 $('.mg-list',md).onclick=e=>{const b=e.target.closest('[data-f]');if(b)openMeasureGuide(b.dataset.f)}}

// cards and form fields open the guide
const _renderFit=renderFit;
renderFit=async function(){await _renderFit();const all=[...MFIELDS.map(x=>x[0]),'shoe'];
 $$('.mgrid .mcard').forEach((c,i)=>{c.dataset.f=all[i];c.classList.add('tap');c.insertAdjacentHTML('beforeend',`<span class="mg-i">${t('mgHowShort')} ›</span>`)});
 $('.mgrid').onclick=e=>{const c=e.target.closest('.mcard');if(c)openMeasureGuide(c.dataset.f)};
 $('#mUpdate').insertAdjacentHTML('beforebegin',`<button class="btn ghost" id="mGuide">📏 ${t('mgOverview')}</button>`);$('#mGuide').onclick=openMeasureOverview};
VIEWS.fit=renderFit;
const _editEntry=editEntry;
editEntry=function(entry){_editEntry(entry);const md=$('#modal-root .md');if(!md)return;
 $$('.mform .fld',md).forEach(l=>{const f=$('[data-f]',l)?.dataset.f;if(!f)return;const s=$('span',l);s.insertAdjacentHTML('beforeend',` <button type="button" class="mg-q" data-g="${f}" title="${t('mgHowShort')}">?</button>`)});
 md.addEventListener('click',e=>{const q=e.target.closest('.mg-q');if(!q)return;e.preventDefault();showGuideInline(md,q.dataset.g)})};
// inside the form, show the figure in place (opening another window would close the form)
function showGuideInline(md,f){let box=$('.mg-inline',md);if(!box){box=document.createElement('div');box.className='mg-inline';$('.mform',md).before(box)}
 if(box.dataset.f===f){box.remove();return}box.dataset.f=f;
 box.innerHTML=`${bodySVG(f)}<div><b>${t('m_'+f)}</b><ol>${String(t('mgSteps_'+f)).split('|').map(s=>`<li>${esc(s)}</li>`).join('')}</ol></div>`}

Object.assign(S.en,{mgHow:'How to measure',mgHowShort:'How to measure',mgOverview:'How to measure',mgUsedFor:'Used for:',mgYours:'Yours',mgUsually:'usually size',
 mgChart:'General size chart',mgChartNote:'A general guide for most brands — always check the brand’s own chart.',
 mgTips:'Use a soft tape measure, wear thin clothes or none, stand straight and relaxed, and keep the tape snug but not tight and level with the floor. Measure twice.',
 mgSteps_height:'Stand barefoot with your back and heels against a wall.|Look straight ahead and put a book flat on top of your head, touching the wall.|Mark where it touches and measure from the floor to the mark.',
 mgSteps_weight:'Weigh yourself in the morning, before eating, in light clothes.|Use the same scale each time so changes are real.',
 mgSteps_chest:'Raise your arms a little and wrap the tape around the fullest part of your chest, under your armpits and across your shoulder blades.|Lower your arms and breathe out normally.|Keep the tape level all the way round and read it.',
 mgSteps_waist:'Find your natural waist — just above your belly button, the narrowest point.|Wrap the tape around, keeping one finger under it.|Don’t pull your stomach in.|For trousers, also measure where you actually wear them.',
 mgSteps_shoulders:'Measure across your back from the edge of one shoulder to the other.|Start and end at the bony point where the shoulder meets the arm.|Easiest with someone helping.',
 mgSteps_sleeve:'Let your arm hang with a slight bend.|Measure from the shoulder point, down the outside of the arm and over the elbow, to your wrist bone.',
 mgSteps_neck:'Wrap the tape around the base of your neck, where a shirt collar sits.|Keep one finger under the tape for comfort.',
 mgSteps_inseam:'Wear shoes you’d wear with the trousers, stand straight.|Measure from the crotch down the inside of the leg to where you want the hem (around the ankle bone).|Or measure the inseam of trousers that fit you well.',
 mgSteps_outseam:'Measure from your waist, down the outside of the leg, to where you want the hem.',
 mgSteps_thigh:'Stand with weight on both feet.|Wrap the tape around the fullest part of the thigh, just below the crotch.',
 mgSteps_shoe:'Stand on paper in the evening (feet are largest then) and mark your heel and longest toe.|Measure between the marks in cm — that’s your foot length.|Match it to the brand’s chart; leave about 1 cm extra.',
 mgFor_chest:'shirts, T-shirts, knitwear, jackets and blazers (S / M / L or 38 / 40 / 42).',mgFor_waist:'trousers and jeans (W30, W32…) and belts.',
 mgFor_shoulders:'the fit of blazers, coats and shirts — the most important for jackets.',mgFor_sleeve:'shirts and jackets — the cuff should end at the wrist bone.',
 mgFor_neck:'dress shirt collar size (39 / 40 / 15.5″).',mgFor_inseam:'trouser length (L30, L32…).',mgFor_outseam:'total trouser length.',mgFor_thigh:'slim jeans and trousers.',
 mgFor_height:'jacket length and trouser length (short / regular / long).',mgFor_shoe:'shoes and sneakers — sizes differ between brands.'});
Object.assign(S.ar,{mgHow:'ازاي تقيس',mgHowShort:'ازاي أقيس',mgOverview:'ازاي أقيس مقاساتي',mgUsedFor:'بيتستخدم في:',mgYours:'مقاسك',mgUsually:'غالبًا مقاس',
 mgChart:'جدول مقاسات عام',mgChartNote:'دليل عام لأغلب البراندات — دايمًا بص على جدول البراند نفسه.',
 mgTips:'استخدم شريط قياس قماش (متر خياطة)، والبس هدوم خفيفة أو من غير، واقف مفرود ومرتاح، وخلي الشريط ملزوق بس مش مشدود ومستوي مع الأرض. قيس مرتين.',
 mgSteps_height:'اقف حافي وضهرك وكعبك لازقين في الحيطة.|بص قدامك وحط كتاب فوق راسك لازق في الحيطة.|علّم مكانه وقيس من الأرض للعلامة.',
 mgSteps_weight:'اتوزن الصبح قبل الأكل وبهدوم خفيفة.|استخدم نفس الميزان كل مرة عشان الفرق يبقى حقيقي.',
 mgSteps_chest:'ارفع دراعاتك شوية ولف الشريط حوالين أعرض حتة في صدرك، تحت الباط ومن ورا على لوحي الكتف.|نزّل دراعاتك وخد نفسك عادي.|خلي الشريط مستوي من كل ناحية واقرا الرقم.',
 mgSteps_waist:'حدد وسطك الطبيعي — فوق السُرّة بشوية، أضيق حتة.|لف الشريط وسيب صباع تحته.|ما تشفطش بطنك.|للبناطيل كمان قيس المكان اللي بتلبس فيه البنطلون فعلًا.',
 mgSteps_shoulders:'قيس من ورا من طرف الكتف للطرف التاني.|ابدأ واخلص عند العضمة اللي الكتف بيقابل فيها الدراع.|أسهل لو حد ساعدك.',
 mgSteps_sleeve:'سيب دراعك نازل ومثني ثنية خفيفة.|قيس من طرف الكتف، على الجنب اللي بره من الدراع وفوق الكوع، لحد عضمة الرسغ.',
 mgSteps_neck:'لف الشريط حوالين قاعدة رقبتك، مكان ياقة القميص.|سيب صباع تحت الشريط عشان الراحة.',
 mgSteps_inseam:'البس جزمة من اللي بتلبسها مع البنطلون واقف مفرود.|قيس من بين الرجلين على الجنب اللي جوه لحد المكان اللي عايز البنطلون يخلص عنده (عند عضمة الكاحل تقريبًا).|أو قيس الخياطة الداخلية لبنطلون مقاسه مظبوط عليك.',
 mgSteps_outseam:'قيس من وسطك، على الجنب اللي بره من الرجل، لحد المكان اللي عايز البنطلون يخلص عنده.',
 mgSteps_thigh:'اقف وتقلك على الرجلين.|لف الشريط حوالين أعرض حتة في الفخد، تحت بين الرجلين على طول.',
 mgSteps_shoe:'اقف على ورقة بالليل (الرجل بتبقى أكبر) وعلّم عند الكعب وأطول صباع.|قيس المسافة بالسنتي — ده طول رجلك.|قارنه بجدول البراند وسيب حوالي 1 سم زيادة.',
 mgFor_chest:'القمصان والتيشيرتات والتريكو والجواكت والبليزرات (S / M / L أو 48 / 50 / 52).',mgFor_waist:'البناطيل والجينز (W30، W32…) والأحزمة.',
 mgFor_shoulders:'قعدة البليزر والبالطو والقميص — أهم مقاس في الجواكت.',mgFor_sleeve:'القمصان والجواكت — الكم المفروض يخلص عند عضمة الرسغ.',
 mgFor_neck:'مقاس ياقة القميص الرسمي (39 / 40 / 41).',mgFor_inseam:'طول البنطلون (L30، L32…).',mgFor_outseam:'طول البنطلون كله.',mgFor_thigh:'الجينز والبناطيل السليم.',
 mgFor_height:'طول الجاكت والبنطلون (قصير / عادي / طويل).',mgFor_shoe:'الجزم والكوتشيات — المقاسات بتفرق من براند للتاني.'});
document.head.insertAdjacentHTML('beforeend',`<style>
.mcard.tap{cursor:pointer;transition:border-color .15s,transform .15s}.mcard.tap:hover{border-color:var(--ink)}
.mg-i{font-size:11px;color:var(--muted);margin-top:2px}.mcard.tap:hover .mg-i{color:var(--ink)}
.mg{display:grid;grid-template-columns:minmax(180px,250px) 1fr;gap:24px;align-items:start}
.mg-fig{background:linear-gradient(160deg,#2a2a2c,#151516);border-radius:18px;padding:18px 10px;display:grid;place-items:center}
.mg-body{width:100%;max-height:440px}
.mg-fill{fill:#fbfaf7}.mg-line{stroke:#c9c4bb;stroke-width:1.2}
.mg-mark{stroke:#d4a72c;stroke-width:3;stroke-linecap:round}.mg-mark .dot{fill:#d4a72c;stroke:none}.mg-mark .ah{fill:#d4a72c;stroke:none}
.mg-mark rect{fill:#d4a72c;stroke:none}.mg-mark .tx{fill:#111;stroke:none;font-size:9px;font-weight:700}
.mg-k{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}.mg-txt h2{margin:2px 0 12px}
.mg-txt ol{margin:0 0 14px;padding-inline-start:20px;display:flex;flex-direction:column;gap:8px;line-height:1.55;font-size:14px}
.mg-for{font-size:13px;line-height:1.6;margin:0 0 12px;color:var(--ink2)}
.mg-you{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:baseline;background:var(--card);border-radius:12px;padding:10px 14px;margin-bottom:12px;font-size:13px}.mg-you>b{font-size:18px}
.mg-tbl{margin-bottom:12px;font-size:13px}.mg-tbl summary{cursor:pointer;font-weight:600;padding:4px 0}.mg-tbl table{border-collapse:collapse;width:100%;margin-top:6px}
.mg-tbl td{padding:6px 10px;border-bottom:1px solid var(--line)}.mg-tbl tr.on td{background:var(--ink);color:var(--bg);font-weight:700}
.mg-tips{font-size:12px;color:var(--muted);line-height:1.6;margin:0}
.mg-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:10px}
.mg-item{border:1px solid var(--line);border-radius:14px;background:linear-gradient(160deg,#2a2a2c,#151516);padding:10px 6px 8px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;font:inherit}
.mg-item svg{height:150px;width:auto}.mg-item span{color:#f3f1ec;font-size:12.5px;font-weight:600}.mg-item:hover{border-color:#d4a72c}
.mg-q{width:18px;height:18px;border-radius:50%;border:1px solid var(--line);background:var(--card);font-size:11px;line-height:1;padding:0;cursor:pointer;margin-inline-start:4px;color:var(--ink)}
.mg-inline{display:grid;grid-template-columns:110px 1fr;gap:14px;align-items:start;background:var(--card);border-radius:14px;padding:12px;margin-bottom:12px;font-size:13px}
.mg-inline svg{width:100%;background:linear-gradient(160deg,#2a2a2c,#151516);border-radius:10px;padding:6px 0}.mg-inline ol{margin:6px 0 0;padding-inline-start:18px;line-height:1.5}
@media (max-width:760px){.mg{grid-template-columns:1fr;gap:14px}.mg-fig{max-width:220px;margin:0 auto;width:100%}.mg-body{max-height:300px}}
</style>`);
