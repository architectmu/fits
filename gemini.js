'use strict';
/* Gemini "studio photo": redraws a piece as a clean product shot in the style of a reference photo (ties for now).
   The key lives in localStorage (shared by all profiles). The new photo becomes the cover; the old cover moves into the extra photos. */
const GEM_MODEL='gemini-2.5-flash-image',GEM_KEY='fits-gemini-key';
const STUDIO={
 ties:{ref:()=>TIE_REF,ratio:'4:5',skip:/bolo/i,
  prompt:'Image 1 is a style reference. Image 2 is my own tie. Create a new studio product photo of the tie from image 2 in exactly the same style, framing and pose as image 1: '+
   'the full tie laid flat and perfectly vertical, front view, the narrow tail end folded behind at the top like image 1, centered, on a pure white seamless background, soft even studio lighting, sharp fabric texture. '+
   'Keep the exact colors, stripe directions and widths, pattern, crests, logos and fabric of the tie in image 2. Do not copy the pattern of image 1, and do not invent new details. Output only the photo.'}};
const gemKey={get(){try{return localStorage.getItem(GEM_KEY)||''}catch(e){return''}},
 set(v){try{v?localStorage.setItem(GEM_KEY,v):localStorage.removeItem(GEM_KEY)}catch(e){}}};
const canStudio=it=>{const s=STUDIO[it?.category];return !!s&&!(s.skip&&s.skip.test(it.name||''))};
window.canStudio=canStudio;

// own overlay so it can open on top of the item window without closing it
function askGeminiKey(){return new Promise(res=>{const ov=document.createElement('div');ov.className='gk-ov';
 ov.innerHTML=`<div class="md"><h2>${t('gkTitle')}</h2><p class="muted sm" style="line-height:1.6">${t('gkHelp')} <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a></p>
  <input class="txt-in" id="gkIn" style="width:100%" placeholder="AIza…" value="${esc(gemKey.get())}" autocomplete="off" spellcheck="false">
  <div class="md-f">${gemKey.get()?`<button class="btn ghost danger" id="gkDel">${t('gkRemove')}</button><span class="sp"></span>`:''}<button class="btn ghost" id="gkNo">${t('cancel')}</button><button class="btn" id="gkOk">${t('save')}</button></div></div>`;
 document.body.appendChild(ov);const inp=$('#gkIn',ov);inp.focus();
 const done=v=>{ov.remove();res(v)};
 $('#gkNo',ov).onclick=()=>done(null);ov.onmousedown=e=>{if(e.target===ov)done(null)};
 $('#gkDel',ov)&&($('#gkDel',ov).onclick=()=>{gemKey.set('');toast(t('gkRemoved'));done(null)});
 const ok=()=>{const v=inp.value.trim();if(!v)return inp.focus();gemKey.set(v);done(v)};$('#gkOk',ov).onclick=ok;inp.onkeydown=e=>{if(e.key==='Enter')ok();if(e.key==='Escape')done(null)}})}
window.askGeminiKey=askGeminiKey;

const dataPart=src=>{const m=/^data:([^;]+);base64,(.*)$/.exec(src);return {inline_data:{mime_type:m[1],data:m[2]}}};
// transparent cut-outs are flattened on white so Gemini sees the piece, not a black box
async function photoForGemini(src){const im=await loadImg(src),s=Math.min(1,1024/Math.max(im.naturalWidth||im.width,im.naturalHeight||im.height)),
  w=Math.round((im.naturalWidth||im.width)*s),h=Math.round((im.naturalHeight||im.height)*s),c=mkCanvas(w,h),x=c.getContext('2d');
 x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(im,0,0,w,h);return c.toDataURL('image/jpeg',.92)}
class GemError extends Error{constructor(msg,code){super(msg);this.code=code}}
async function gemini(parts,ratio){const key=gemKey.get();
 let r;try{r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEM_MODEL}:generateContent`,{method:'POST',
  headers:{'Content-Type':'application/json','x-goog-api-key':key},
  body:JSON.stringify({contents:[{parts}],generationConfig:{responseModalities:['IMAGE'],...(ratio?{imageConfig:{aspectRatio:ratio}}:{})}})})}
 catch(e){throw new GemError(t('gkNet'),'net')}
 const j=await r.json().catch(()=>({}));
 if(!r.ok){const m=j.error?.message||r.statusText,st=j.error?.status||'';
  if(/API key not valid|API_KEY_INVALID/i.test(m)||r.status===401)throw new GemError(t('gkBadKey'),'key');
  // the free tier gives image models a quota of 0, so this really means "billing is off"
  if((r.status===429||st==='RESOURCE_EXHAUSTED')&&/limit: 0\b|free_tier/i.test(m))throw new GemError(t('gkBilling'),'billing');
  if(r.status===429||st==='RESOURCE_EXHAUSTED')throw new GemError(t('gkQuota'),'quota');
  if(r.status===403||/billing/i.test(m))throw new GemError(t('gkBilling'),'billing');
  throw new GemError(m,'api')}
 const parts2=j.candidates?.[0]?.content?.parts||[],img=parts2.find(p=>p.inlineData||p.inline_data);
 if(!img)throw new GemError(t('gkNoImg',{why:j.candidates?.[0]?.finishReason||j.promptFeedback?.blockReason||'?'}),'empty');
 const d=img.inlineData||img.inline_data;return `data:${d.mimeType||d.mime_type||'image/png'};base64,${d.data}`}

// item → {img (cut out), orig (Gemini's photo on white)}; asks for the key first time / when the saved one is rejected
async function studioPhoto(it,src){const s=STUDIO[it.category];if(!s)throw new GemError(t('gkOnlyTies'),'cat');
 if(!gemKey.get()&&!await askGeminiKey())throw new GemError(t('gkNeedKey'),'nokey');
 const parts=[dataPart(s.ref()),dataPart(await photoForGemini(src||it.orig||it.img)),{text:s.prompt}];
 let raw;try{raw=await gemini(parts,s.ratio)}
 catch(e){if(e.code!=='key')throw e;toast(e.message);if(!await askGeminiKey())throw e;raw=await gemini(parts,s.ratio)}
 const c=downscale(await loadImg(raw),1100);
 return {orig:c.toDataURL('image/webp',.9),img:(await cutout(c)).toDataURL('image/webp',.9)}}
window.studioPhoto=studioPhoto;

// bulk: one by one, with a progress window that can be stopped; finished pieces are saved as they come
async function studioBulk(list){const todo=list.filter(canStudio);
 if(!todo.length)return toast(t('gkNoneOk'));
 if(!gemKey.get()&&!await askGeminiKey())return;
 const md=modal(`<h2>✨ ${t('studioBtn')}</h2><p id="gbMsg" style="margin:0 0 6px"></p><div class="gb-bar"><i id="gbBar"></i></div><p class="muted sm" id="gbSub" style="margin:8px 0 0"></p>
  <div class="md-f"><button class="btn ghost" id="gbStop">${t('gkStop')}</button></div>`),root=$('#modal-root');root.dataset.busy=1;
 let stop=false,ok=0;const failed=[];$('#gbStop',md).onclick=e=>{stop=true;e.currentTarget.disabled=true};
 aiStatus=s=>{const m=$('#gbSub',md);if(m)m.textContent=s};
 for(const [i,it] of todo.entries()){if(stop)break;
  $('#gbMsg',md).textContent=t('gkProgress',{i:i+1,n:todo.length,name:it.name||catName(it.category)});$('#gbBar',md).style.width=`${i/todo.length*100}%`;$('#gbSub',md).textContent='';
  try{const p=await studioPhoto(it);
   it.gallery=[{img:it.img,orig:it.orig||it.img},...(it.gallery||[])].slice(0,MAX_PHOTOS-1);Object.assign(it,p);await DB.put('items',it);ok++}
  catch(e){console.warn('studio photo failed',it.name,e);failed.push(it.name||it.id);if(['key','nokey','quota','billing','net'].includes(e.code)){toast(e.message);break}}}
 delete root.dataset.busy;closeModal();renderCloset();
 const skipped=list.length-todo.length;
 toast(t('gkDone',{n:ok})+(failed.length?' · '+t('gkFailed',{n:failed.length}):'')+(skipped?' · '+t('gkSkipped',{n:skipped}):''))}
window.studioBulk=studioBulk;

/* Photos edited elsewhere (e.g. on gemini.google.com) back onto their pieces: each file is cut out, matched to a selected piece
   (by the number at the start of its name = the export order, then by words of the name, then by main color), checked by the user, and applied as the new cover */
// 4×8 grid of average colors of the visible (non-transparent) pixels of a cut-out, stretched to its own box
async function looks(src){const im=await loadImg(src),c=mkCanvas(4,8),x=c.getContext('2d');x.drawImage(im,0,0,4,8);
 const d=x.getImageData(0,0,4,8).data,out=[];for(let i=0;i<d.length;i+=4){const a=d[i+3]/255;out.push(d[i]*a,d[i+1]*a,d[i+2]*a)}return out}
const fpDist=(a,b)=>a.reduce((s,v,i)=>s+(v-b[i])**2,0);
async function replaceFromFiles(list){const files=(await pickFiles()).filter(isImg);if(!files.length)return;
 const studio=list.filter(canStudio),pool=(studio.length?studio:list).slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
 const md=modal(`<h2>${t('rpTitle')}</h2><p class="muted sm" id="rpMsg"></p><div class="gb-bar"><i id="rpBar"></i></div>`),root=$('#modal-root');root.dataset.busy=1;
 aiStatus=s=>{const m=$('#rpMsg',md);if(m)m.textContent=s};const rows=[];
 try{for(const [i,f] of files.entries()){$('#rpMsg',md).textContent=t('rpWorking',{i:i+1,n:files.length});$('#rpBar',md).style.width=`${i/files.length*100}%`;
  rows.push({f,...await processFile(f)})}}
 finally{delete root.dataset.busy}
 const used=new Set(),words=s=>String(s||'').toLowerCase().split(/[^a-z0-9؀-ۿ]+/).filter(w=>w.length>2&&!/^(tie|jpg|png|webp|gemini|generated|image)$/.test(w));
 for(const r of rows){const num=+(/^(\d{1,2})(?!\d)/.exec(r.f.name)||[])[1];let it=num&&pool[num-1];
  if(!it||used.has(it.id)){const fw=words(r.f.name);let best=0;for(const p of pool){if(used.has(p.id))continue;const s=words(p.name).filter(w=>fw.includes(w)).length;if(s>best){best=s;it=p}}if(!best)it=null}
  r.id=it?.id||'';if(it)used.add(it.id)}
 // still unmatched (e.g. "Gemini_Generated_Image_….png"): closest-looking piece left, by a small grid of average colors
 for(const r of rows.filter(r=>!r.id)){const fp=await looks(r.img);let best=null,bd=Infinity;
  for(const p of pool){if(used.has(p.id))continue;const d=fpDist(fp,await looks(p.img));if(d<bd){bd=d;best=p}}
  if(best){r.id=best.id;used.add(best.id)}}
 const opts=sel=>`<option value="">${t('rpSkip')}</option>`+pool.map(p=>`<option value="${p.id}" ${p.id===sel?'selected':''}>${esc(p.name||catName(p.category))}</option>`).join('');
 const md2=modal(`<h2>${t('rpTitle')}</h2><p class="muted sm">${t('rpCheck')}</p><div class="rp-list">${rows.map((r,i)=>`<div class="rp-row" data-i="${i}">
   <img src="${r.img}" alt=""><span class="rp-arrow">→</span><img class="rp-old" src="${itemById(r.id)?.img||''}" alt=""><select class="sel sm">${opts(r.id)}</select></div>`).join('')}</div>
  <div class="md-f"><button class="btn ghost" data-close>${t('cancel')}</button><button class="btn" id="rpGo">${t('rpApply')}</button></div>`,{wide:true});
 md2.onchange=e=>{const row=e.target.closest('.rp-row');if(!row)return;const r=rows[+row.dataset.i];r.id=e.target.value;$('.rp-old',row).src=itemById(r.id)?.img||''};
 $('#rpGo',md2).onclick=async()=>{const pick=rows.filter(r=>r.id);if(new Set(pick.map(r=>r.id)).size<pick.length)return toast(t('rpDup'));
  for(const r of pick){const it=itemById(r.id);it.gallery=[{img:it.img,orig:it.orig||it.img},...(it.gallery||[])].slice(0,MAX_PHOTOS-1);Object.assign(it,{img:r.img,orig:r.orig});await DB.put('items',it)}
  closeModal();renderCloset();toast(t('gkDone',{n:pick.length}))}}
window.replaceFromFiles=replaceFromFiles;

document.head.insertAdjacentHTML('beforeend',`<style>
.rp-list{display:flex;flex-direction:column;gap:8px;max-height:60vh;overflow:auto;margin:10px 0}.rp-row{display:flex;align-items:center;gap:10px}
.rp-row img{width:64px;height:80px;object-fit:contain;background:var(--card);border-radius:8px;padding:4px}.rp-row .rp-old{opacity:.7}.rp-row select{flex:1;min-width:0}.rp-arrow{color:var(--muted)}</style>`);
document.head.insertAdjacentHTML('beforeend',`<style>
.gk-ov{position:fixed;inset:0;background:rgba(10,10,10,.38);display:grid;place-items:center;z-index:130;padding:24px}
.gb-bar{height:6px;border-radius:9px;background:var(--line);overflow:hidden}.gb-bar i{display:block;height:100%;background:var(--fg,#111);transition:width .3s}
</style>`);
Object.assign(S.en,{studioBtn:'Studio photo (Gemini)',studioWorking:'Gemini is redrawing the photo…',studioPreview:'New photo added as the cover — press Save to keep it',
 gkTitle:'Gemini API key',gkHelp:'Used only from this computer to restyle photos. Create a free key with your Google account at',gkRemove:'Remove key',gkRemoved:'Gemini key removed',gkKey:'Gemini key',
 gkNet:'Could not reach Gemini — check the internet connection',gkBadKey:'Gemini rejected the API key',gkQuota:'Gemini limit reached — try again later',gkBilling:'Image generation needs billing enabled in Google AI Studio',
 gkNoImg:'Gemini returned no image ({why})',gkOnlyTies:'Studio photos are available for ties for now',gkNeedKey:'A Gemini key is needed',gkNoneOk:'No ties selected (bolo ties are skipped)',
 gkStop:'Stop after this one',gkProgress:'{i} / {n} — {name}',gkDone:'{n} photos updated',gkFailed:'{n} failed',gkSkipped:'{n} skipped',
 rpBtn:'Replace photos from files',rpTitle:'Replace photos',rpWorking:'Cutting out photo {i} of {n}…',rpCheck:'Check that each new photo points to the right piece. The old photo stays as an extra photo.',
 rpSkip:'— skip —',rpApply:'Use these photos',rpDup:'Two photos point to the same piece'});
Object.assign(S.ar,{studioBtn:'صورة ستوديو (جيميناي)',studioWorking:'جيميناي بيعيد رسم الصورة…',studioPreview:'الصورة الجديدة اتحطت غلاف — دوس حفظ عشان تتثبت',
 gkTitle:'مفتاح Gemini API',gkHelp:'بيتستخدم من الجهاز ده بس لتعديل الصور. اعمل مفتاح مجاني بحساب جوجل من',gkRemove:'امسح المفتاح',gkRemoved:'اتمسح مفتاح جيميناي',gkKey:'مفتاح جيميناي',
 gkNet:'مش قادر يوصل لجيميناي — شوف النت',gkBadKey:'جيميناي رفض المفتاح',gkQuota:'وصلت للحد بتاع جيميناي — جرب بعدين',gkBilling:'توليد الصور محتاج تفعيل الفوترة في Google AI Studio',
 gkNoImg:'جيميناي مرجعش صورة ({why})',gkOnlyTies:'صور الستوديو متاحة للجرافتات بس دلوقتي',gkNeedKey:'محتاج مفتاح جيميناي',gkNoneOk:'مفيش جرافتات متحددة (جرافتة البولو بتتعدى)',
 gkStop:'وقف بعد دي',gkProgress:'{i} / {n} — {name}',gkDone:'اتعدل {n} صورة',gkFailed:'{n} فشلوا',gkSkipped:'{n} اتعدوا',
 rpBtn:'استبدال الصور من ملفات',rpTitle:'استبدال الصور',rpWorking:'بيقص الخلفية للصورة {i} من {n}…',rpCheck:'اتأكد إن كل صورة جديدة رايحة للقطعة الصح. الصورة القديمة بتفضل صورة إضافية.',
 rpSkip:'— تجاهل —',rpApply:'استخدم الصور دي',rpDup:'فيه صورتين رايحين لنفس القطعة'});
