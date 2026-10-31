'use strict';
/* Find a piece's photo online instead of photographing it: search Google Images by name, copy the closest photo,
   and paste it here (or paste its link / drop it). The photo then goes through the normal "add items" flow (cut-out, category…). */

HOOKS.closetTools.push(()=>`<button class="btn ghost" id="webBtn">🔎 ${t('wsBtn')}</button>`);
HOOKS.loaded.push(where=>{if(where!=='closet')return;const b=$('#webBtn');if(!b)return;b.onclick=openWebSearch;
 const row=$('.ctool .m-row');if(row)row.prepend(b)});

function openWebSearch(){const files=[];let q='';
 const md=modal(`<h2>🔎 ${t('wsTitle')}</h2><p class="muted sm" style="margin:-8px 0 14px">${t('wsSub')}</p>
  <div class="ws-q"><input id="wsQ" placeholder="${t('wsPh')}" autocomplete="off"><button class="btn" id="wsGo">${t('wsSearch')}</button></div>
  <ol class="ws-steps"><li>${t('wsStep1')}</li><li>${t('wsStep2')}</li><li>${t('wsStep3')}</li></ol>
  <div class="ws-drop" id="wsDrop"><button class="btn" id="wsPaste">📋 ${t('wsPaste')}</button><span class="muted sm">${t('wsOr')}</span>
   <div class="ws-url"><input id="wsUrl" placeholder="${t('wsUrlPh')}" autocomplete="off"><button class="btn ghost sm" id="wsUrlGo">${t('add')}</button></div></div>
  <p class="sm" id="wsMsg"></p><div class="ws-got" id="wsGot"></div>
  <div class="md-f"><button class="btn ghost" data-close>${t('cancel')}</button><span class="sp"></span><button class="btn" id="wsNext" disabled>${t('wsNext')}</button></div>`,{wide:true});
 const msg=(s,bad)=>{const m=$('#wsMsg',md);m.textContent=s;m.style.color=bad?'var(--danger)':'var(--muted)'};
 const name=()=>($('#wsQ',md).value.trim()||q||'piece').replace(/[\\/:*?"<>|]+/g,' ');
 const take=blob=>{if(!blob||!/^image\//.test(blob.type)){msg(t('wsNoImg'),true);return}
  const f=new File([blob],`${name()}.${(blob.type.split('/')[1]||'png').replace('jpeg','jpg')}`,{type:blob.type});files.push(f);
  $('#wsGot',md).insertAdjacentHTML('beforeend',`<img src="${URL.createObjectURL(f)}" alt="">`);$('#wsNext',md).disabled=false;msg(t('wsGotIt',{n:files.length}))};
 const go=()=>{q=$('#wsQ',md).value.trim();if(!q)return $('#wsQ',md).focus();window.open('https://www.google.com/search?tbm=isch&q='+encodeURIComponent(q),'_blank','noopener')};
 $('#wsGo',md).onclick=go;$('#wsQ',md).onkeydown=e=>{if(e.key==='Enter')go()};$('#wsQ',md).focus();
 $('#wsPaste',md).onclick=async()=>{try{const items=await navigator.clipboard.read();for(const it of items){const ty=it.types.find(x=>x.startsWith('image/'));if(ty){take(await it.getType(ty));return}}
   const txt=await navigator.clipboard.readText?.();if(txt&&/^https?:\/\//.test(txt.trim())){$('#wsUrl',md).value=txt.trim();return fromUrl()}msg(t('wsNoImg'),true)}
  catch(e){msg(t('wsPasteKey'),true)}};
 const fromUrl=async()=>{const u=$('#wsUrl',md).value.trim();if(!/^https?:\/\//i.test(u))return msg(t('wsBadUrl'),true);msg(t('processing',{i:1,n:1}));
  try{const r=await fetch(u,{mode:'cors'});if(!r.ok)throw 0;take(await r.blob());$('#wsUrl',md).value=''}catch(e){msg(t('wsUrlBlocked'),true)}};
 $('#wsUrlGo',md).onclick=fromUrl;
 // Ctrl+V anywhere in the window, or drop a picture on it
 const onPaste=e=>{const f=[...(e.clipboardData?.files||[])].find(x=>x.type.startsWith('image/'));if(f){e.preventDefault();take(f)}};document.addEventListener('paste',onPaste);
 $('#modal-root').onclose=()=>document.removeEventListener('paste',onPaste);
 const drop=$('#wsDrop',md);drop.ondragover=e=>{e.preventDefault();drop.classList.add('on')};drop.ondragleave=()=>drop.classList.remove('on');
 drop.ondrop=e=>{e.preventDefault();e.stopPropagation();drop.classList.remove('on');document.body.classList.remove('dragging');[...e.dataTransfer.files].filter(f=>f.type.startsWith('image/')).forEach(take)};
 $('#wsNext',md).onclick=()=>{document.removeEventListener('paste',onPaste);$('#modal-root').onclose=null;closeModal();openAddModal(files)}}

Object.assign(S.en,{wsBtn:'Find online',wsTitle:'Find the photo online',wsSub:'No need to photograph it — search by name, copy the closest photo and paste it here.',wsPh:'Name and brand, e.g. Polo Ralph Lauren cable knit cream',
 wsSearch:'Search photos',wsStep1:'Search, and open the photo that looks most like your piece (a plain-background shop photo works best).',
 wsStep2:'Long-press it (phone) or right-click it (computer) → Copy image.',wsStep3:'Come back here and press Paste. Add as many as you like, then Next.',
 wsPaste:'Paste photo',wsOr:'or paste the photo’s link',wsUrlPh:'https://…jpg',wsNext:'Next — add to closet',wsGotIt:'{n} photo(s) ready',wsNoImg:'No photo on the clipboard — copy the image first.',
 wsPasteKey:'Press Ctrl+V (or long-press here → Paste) to paste the copied photo.',wsBadUrl:'That isn’t a link.',wsUrlBlocked:'That site won’t share the photo by link — copy the image itself and press Paste instead.'});
Object.assign(S.ar,{wsBtn:'دوّر أونلاين',wsTitle:'هات صورة القطعة من النت',wsSub:'من غير ما تصورها — دوّر باسمها، انسخ أقرب صورة، والصقها هنا.',wsPh:'الاسم والبراند، مثلًا: Polo Ralph Lauren cable knit cream',
 wsSearch:'دوّر على صور',wsStep1:'دوّر، وافتح الصورة اللي شبه قطعتك أكتر (صورة المحل بخلفية سادة أحسن).',
 wsStep2:'اضغط عليها ضغطة طويلة (موبايل) أو كليك يمين (كمبيوتر) ← Copy image / نسخ الصورة.',wsStep3:'ارجع هنا ودوس لصق. ضيف أي عدد، وبعدين التالي.',
 wsPaste:'الصق الصورة',wsOr:'أو الصق لينك الصورة',wsUrlPh:'https://…jpg',wsNext:'التالي — ضيفها للدولاب',wsGotIt:'{n} صورة جاهزة',wsNoImg:'مفيش صورة منسوخة — انسخ الصورة الأول.',
 wsPasteKey:'دوس Ctrl+V (أو اضغط ضغطة طويلة هنا ← لصق) عشان تلصق الصورة.',wsBadUrl:'ده مش لينك.',wsUrlBlocked:'الموقع ده مش بيسمح بالصورة باللينك — انسخ الصورة نفسها ودوس لصق.'});
document.head.insertAdjacentHTML('beforeend',`<style>
.ws-q{display:flex;gap:8px}.ws-q input{flex:1;min-width:0;border:1px solid var(--line);border-radius:999px;padding:10px 16px;background:var(--bg);outline:none}
.ws-steps{margin:14px 0;padding-inline-start:20px;font-size:13px;line-height:1.6;color:var(--ink2);display:flex;flex-direction:column;gap:4px}
.ws-drop{border:1.5px dashed var(--line);border-radius:16px;padding:18px;display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center}.ws-drop.on{border-color:var(--ink);background:var(--card)}
.ws-url{display:flex;gap:6px;width:100%;max-width:420px}.ws-url input{flex:1;min-width:0;border:1px solid var(--line);border-radius:999px;padding:7px 12px;background:var(--bg);outline:none;font-size:12.5px}
.ws-got{display:flex;gap:8px;flex-wrap:wrap}.ws-got img{width:72px;height:88px;object-fit:contain;background:var(--card);border-radius:10px;padding:4px}
</style>`);
