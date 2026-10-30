'use strict';
/* Cloud sync through Supabase: every device keeps its own IndexedDB (works offline) and mirrors it to one table.
   Table records(owner, pid, store, id, data, deleted, updated_at): pid = profile id ('_' for the profile list), store = items/boards/media/meta/profiles.
   Local writes are queued by key and pushed (latest local value wins); remote changes are pulled by updated_at and written straight into IndexedDB. */
const CLOUD={on:false,sb:null,user:null,since:'',queue:new Map(),flushT:null,pulling:false,pushing:false,pullT:null};
const SB_LIB='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm';
const cloudCfg=()=>window.FITS_CLOUD||{};
const cloudConfigured=()=>!!(cloudCfg().url&&cloudCfg().key);
const pidOf=name=>name==='fits-closet'?'main':name.replace(/^fits-closet-/,'');
const qKey=(pid,store,id)=>`${pid}\u0001${store}\u0001${id}`;
const lsJSON=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}};
const lsPut=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};

/* ---- raw IndexedDB access that never echoes back to the cloud ---- */
function rawOpen(pid){return new Promise((res,rej)=>{
 const r=pid==='_'?indexedDB.open('fits-profiles',1):indexedDB.open(dbNameFor(pid),1);
 r.onupgradeneeded=()=>{const d=r.result;if(pid==='_')d.createObjectStore('profiles',{keyPath:'id'});else['items','boards','media','meta'].forEach(s=>{if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:'id'})})};
 r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function rawRun(db,store,mode,fn){return new Promise((res,rej)=>{const tx=db.transaction(store,mode),q=fn(tx.objectStore(store));tx.oncomplete=()=>res(q&&q.result);tx.onerror=()=>rej(tx.error)})}

/* ---- queue: keys only, values are read from IndexedDB when pushed ---- */
function enqueue(pid,store,id,del=false){if(!CLOUD.on||id==null)return;CLOUD.queue.set(qKey(pid,store,id),{pid,store,id:String(id),del});saveQueue();scheduleFlush()}
const saveQueue=()=>lsPut('fits-cloud-queue',[...CLOUD.queue.values()]);
function scheduleFlush(ms=1500){clearTimeout(CLOUD.flushT);CLOUD.flushT=setTimeout(flush,ms);cloudBadge()}
async function flush(){if(!CLOUD.on||CLOUD.pushing||!CLOUD.queue.size)return;CLOUD.pushing=true;cloudBadge();
 try{const byPid={};for(const j of CLOUD.queue.values())(byPid[j.pid]=byPid[j.pid]||[]).push(j);
  // each batch remembers which queue entry it carried, so an edit made while uploading stays queued
  let batch=[],jobs=[],size=0;
  const send=async()=>{if(!batch.length)return;const {error}=await CLOUD.sb.from('records').upsert(batch,{onConflict:'owner,pid,store,id'});if(error)throw error;
   jobs.forEach(j=>{const k=qKey(j.pid,j.store,j.id);if(CLOUD.queue.get(k)===j)CLOUD.queue.delete(k)});saveQueue();cloudBadge();batch=[];jobs=[];size=0};
  for(const [pid,list] of Object.entries(byPid)){const db=await rawOpen(pid);
   try{for(const j of list){const store=pid==='_'?'profiles':j.store,v=j.del?undefined:await rawRun(db,store,'readonly',o=>o.get(j.id));
    const n=v?JSON.stringify(v).length:50;if(size+n>3e6)await send();
    batch.push({owner:CLOUD.user.id,pid,store:j.store,id:j.id,data:v??null,deleted:v===undefined});jobs.push(j);size+=n}}
   finally{db.close()}}
  await send()}
 catch(e){console.warn('cloud push failed',e);cloudBadge('error');CLOUD.pushing=false;scheduleFlush(15000);return}
 CLOUD.pushing=false;cloudBadge();if(CLOUD.queue.size)scheduleFlush(500)}

/* ---- pull: everything changed since the last pull on this device ---- */
async function pull({quiet=false}={}){if(!CLOUD.on||CLOUD.pulling)return 0;CLOUD.pulling=true;let n=0;const touched=new Set();
 try{for(;;){let q=CLOUD.sb.from('records').select('pid,store,id,data,deleted,updated_at').order('updated_at',{ascending:true}).limit(25);
   if(CLOUD.since)q=q.gt('updated_at',CLOUD.since);const {data,error}=await q;if(error)throw error;if(!data.length)break;
   const byPid={};data.forEach(r=>(byPid[r.pid]=byPid[r.pid]||[]).push(r));
   for(const [pid,rows] of Object.entries(byPid)){const db=await rawOpen(pid);
    try{for(const r of rows){if(CLOUD.queue.has(qKey(r.pid,r.store,r.id)))continue; // a local edit is waiting to go up: it wins
     const store=pid==='_'?'profiles':r.store;
     if(r.deleted)await rawRun(db,store,'readwrite',o=>o.delete(r.id));else await rawRun(db,store,'readwrite',o=>o.put(r.data));
     if(pid==='_'&&r.deleted)await new Promise(res=>{const d=indexedDB.deleteDatabase(dbNameFor(r.id));d.onsuccess=d.onerror=d.onblocked=res});
     touched.add(pid);n++}}
    finally{db.close()}}
   CLOUD.since=data[data.length-1].updated_at;lsPut(sinceKey(),CLOUD.since);if(!quiet)cloudBadge('pull',n)}}
 catch(e){console.warn('cloud pull failed',e);cloudBadge('error')}
 finally{CLOUD.pulling=false}
 if(touched.size)await refreshAfterPull(touched);cloudBadge();return n}
const sinceKey=()=>'fits-cloud-since-'+(CLOUD.user?.id||'');
async function refreshAfterPull(touched){
 if(touched.has('_')){profiles=await loadProfiles();if(curProf){curProf=profiles.find(p=>p.id===curProf.id)||null;updProfBtn()}if(pickerOpen()||!curProf)showPicker()}
 if(curProf&&touched.has(curProf.id)){
  // never pull the rug from under an open window or the outfit editor; try again shortly
  if($('#modal-root').children.length||st.view==='editor'){setTimeout(()=>refreshAfterPull(new Set([curProf.id])),4000);return}
  await loadAll();render()}}

/* ---- hook the app's storage so every local change is queued ---- */
const _open=DB.open,_put=DB.put,_del=DB.del,_pput=PDB.put,_pdel=PDB.del;
DB.open=function(name){DB.pid=pidOf(name);return _open.call(DB,name)};
DB.put=function(s,v){const r=_put.call(DB,s,v);if(DB.pid)r.then(()=>enqueue(DB.pid,s,v.id),()=>{});return r};
DB.del=function(s,id){const r=_del.call(DB,s,id);if(DB.pid)r.then(()=>enqueue(DB.pid,s,id,true),()=>{});return r};
PDB.put=function(p){const r=_pput.call(PDB,p);r.then(()=>enqueue('_','profiles',p.id),()=>{});return r};
PDB.del=function(id){const r=_pdel.call(PDB,id);r.then(()=>{enqueue('_','profiles',id,true);
 if(CLOUD.on)CLOUD.sb.from('records').update({deleted:true,data:null}).eq('pid',id).then(({error})=>error&&console.warn(error))},()=>{});return r};

// first device ever: send everything this browser already has
async function pushAllLocal(){const ps=await PDB.all();for(const p of ps){enqueue('_','profiles',p.id);const db=await rawOpen(p.id);
 try{for(const s of['items','boards','media','meta'])(await rawRun(db,s,'readonly',o=>o.getAllKeys())).forEach(id=>enqueue(p.id,s,id))}finally{db.close()}}}

/* ---- sign in ---- */
function loginScreen(msg=''){return new Promise(res=>{let el=$('#cloudLogin');if(!el){el=document.createElement('div');el.id='cloudLogin';document.body.appendChild(el)}
 el.innerHTML=`<form class="cl-box"><div class="pf-logo"><span class="logo">${ic('hanger',26)}</span><span class="word">Fits</span></div>
  <h1>${t('clTitle')}</h1><p class="muted sm">${t('clSub')}</p>
  <input class="txt-in" id="clEmail" type="email" autocomplete="username" placeholder="${t('clEmail')}" required>
  <input class="txt-in" id="clPass" type="password" autocomplete="current-password" placeholder="${t('clPass')}" minlength="6" required>
  <p class="cl-msg" id="clMsg">${esc(msg)}</p>
  <button class="btn" id="clIn" type="submit">${t('clSignIn')}</button><button class="btn ghost" id="clUp" type="button">${t('clSignUp')}</button>
  <button class="btn ghost sm" id="clLocal" type="button">${t('clLocal')}</button></form>`;
 el.hidden=false;const f=$('form',el),m=$('#clMsg',el),email=()=>$('#clEmail',el).value.trim(),pass=()=>$('#clPass',el).value;
 const go=async up=>{if(!f.reportValidity())return;m.textContent=t('clWorking');
  const {data,error}=up?await CLOUD.sb.auth.signUp({email:email(),password:pass()}):await CLOUD.sb.auth.signInWithPassword({email:email(),password:pass()});
  if(error){m.textContent=error.message;return}
  if(!data.session){m.textContent=t('clConfirm');return}
  el.hidden=true;res(data.session)};
 f.onsubmit=e=>{e.preventDefault();go(false)};$('#clUp',el).onclick=()=>go(true);
 $('#clLocal',el).onclick=()=>{el.hidden=true;res(null)}})}

/* called by boot() before the profile list is read */
async function cloudBoot(){if(!cloudConfigured())return;
 let lib;try{lib=await import(SB_LIB)}catch(e){console.warn('cloud lib failed',e);toast(t('clOffline'));return}
 CLOUD.sb=lib.createClient(cloudCfg().url,cloudCfg().key,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'fits-cloud-auth'}});
 let {data:{session}}=await CLOUD.sb.auth.getSession();
 if(!session)session=await loginScreen();if(!session)return;
 CLOUD.user=session.user;CLOUD.on=true;CLOUD.since=lsJSON(sinceKey(),'');
 lsJSON('fits-cloud-queue',[]).forEach(j=>CLOUD.queue.set(qKey(j.pid,j.store,j.id),j));
 const ov=cloudBusy(t('clSyncing'));
 try{const {count,error}=await CLOUD.sb.from('records').select('id',{count:'exact',head:true});if(error)throw error;
  if(!count)await pushAllLocal();else await pull({quiet:true})}
 catch(e){console.warn(e);toast(t('clOffline'))}
 finally{ov.remove()}
 flush();
 CLOUD.pullT=setInterval(()=>{if(document.visibilityState==='visible')pull()},45000);
 addEventListener('focus',()=>pull());document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pull();else flush()})}
window.cloudBoot=cloudBoot;
function cloudBusy(msg){const el=document.createElement('div');el.className='cl-busy';el.innerHTML=`<div class="cl-box"><div class="spin"></div><p>${esc(msg)}</p></div>`;document.body.appendChild(el);return el}

/* ---- status in the profile screen ---- */
function cloudBadge(state,n){const el=$('#cloudStat');if(!el)return;
 const pending=CLOUD.queue.size;el.dataset.s=state==='error'?'err':(pending||CLOUD.pushing||CLOUD.pulling)?'busy':'ok';
 el.querySelector('span').textContent=state==='error'?t('clErr'):pending?t('clPending',{n:pending}):t('clSynced')}
const _showPicker=showPicker;
showPicker=function(){_showPicker();const foot=$('#profiles .pf-foot');if(!foot)return;
 if(!cloudConfigured())return;
 const box=document.createElement('div');box.className='cl-foot';
 box.innerHTML=CLOUD.on?`<button class="btn ghost sm" id="cloudStat">☁ <span></span></button><span class="muted sm">${esc(CLOUD.user.email||'')}</span><button class="btn ghost sm" id="clOut">${t('clSignOut')}</button>`
  :`<button class="btn ghost sm" id="clLogin">☁ ${t('clSignIn')}</button>`;
 foot.after(box);cloudBadge();
 if($('#cloudStat'))$('#cloudStat').onclick=async()=>{await flush();await pull()};
 if($('#clOut'))$('#clOut').onclick=async()=>{if(CLOUD.queue.size){await flush()}await CLOUD.sb.auth.signOut();location.reload()};
 if($('#clLogin'))$('#clLogin').onclick=()=>location.reload()};

document.head.insertAdjacentHTML('beforeend',`<style>
#cloudLogin,.cl-busy{position:fixed;inset:0;z-index:200;background:var(--bg);display:grid;place-items:center;padding:16px}
#cloudLogin[hidden]{display:none}
.cl-busy{background:rgba(0,0,0,.45)}
.cl-box{width:min(380px,100%);display:flex;flex-direction:column;gap:10px;text-align:center;background:var(--bg);border-radius:18px;padding:24px}
.cl-box h1{margin:6px 0 0;font-size:22px}.cl-box .pf-logo{justify-content:center}.cl-box .txt-in{width:100%}
.cl-msg{min-height:1.2em;margin:0;font-size:13px;color:var(--danger)}
.cl-foot{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:12px}
#cloudStat[data-s=ok]{color:var(--ok,#3f7a4a)}#cloudStat[data-s=err]{color:var(--danger)}
.spin{width:28px;height:28px;border-radius:50%;border:3px solid var(--line);border-top-color:var(--ink);margin:0 auto;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
</style>`);
Object.assign(S.en,{clTitle:'Sign in to your closet',clSub:'Your closet syncs between your computer and your phone.',clEmail:'Email',clPass:'Password',clSignIn:'Sign in',clSignUp:'Create account',
 clLocal:'Use without syncing',clWorking:'One moment…',clConfirm:'Check your email to confirm the account, then sign in.',clOffline:'Could not reach the cloud — working offline',
 clSyncing:'Syncing your closet…',clErr:'Sync error — tap to retry',clPending:'{n} changes waiting',clSynced:'Synced',clSignOut:'Sign out'});
Object.assign(S.ar,{clTitle:'سجّل دخول لدولابك',clSub:'دولابك بيتزامن بين الكمبيوتر والموبايل.',clEmail:'الإيميل',clPass:'الباسورد',clSignIn:'دخول',clSignUp:'عمل حساب',
 clLocal:'استخدم من غير مزامنة',clWorking:'لحظة…',clConfirm:'افتح الإيميل وأكّد الحساب، وبعدين ادخل.',clOffline:'مش قادر يوصل للسحابة — شغال أوفلاين',
 clSyncing:'بيزامن دولابك…',clErr:'مشكلة في المزامنة — دوس للمحاولة',clPending:'{n} تعديل مستني',clSynced:'متزامن',clSignOut:'خروج'});
