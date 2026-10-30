'use strict';
/* Full backup of every profile in one file, and restoring it (e.g. when moving to another browser or computer).
   File shape: {app:'fits-desktop-all', version:1, date, profiles:[{profile, stores:{items,boards,media,meta}}]} */
const BK_STORES=['items','boards','media','meta'];
async function collectAll(){const cur=curProf,out=[];
 for(const p of profiles){await DB.open(dbNameFor(p.id));const stores={};for(const s of BK_STORES)stores[s]=await DB.all(s);out.push({profile:p,stores})}
 if(cur)await DB.open(dbNameFor(cur.id));else{DB.db?.close();DB.db=null}
 return {app:'fits-desktop-all',version:1,date:new Date().toISOString(),profiles:out}}
async function exportAll(){const data=await collectAll(),a=document.createElement('a');
 a.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));a.download=`fits-all-profiles-${ymd(new Date())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);
 toast(t('bkSaved',{n:data.profiles.length}))}
async function restoreAll(){const[f]=await pickFiles({multiple:false,accept:'.json,application/json'});if(!f)return;
 let data;try{data=JSON.parse(await f.text())}catch(e){return toast(t('badFile'))}
 // a single-profile backup goes into the profile with the same id (or the main one)
 if(data.app==='fits-desktop'){const p=data.profile||{id:'main',name:t('me')};data={profiles:[{profile:{photo:'',color:PCOLORS[0],created:Date.now(),...p},stores:{items:data.items||[],boards:data.boards||[],media:data.media||[],
  meta:[{id:'plans',data:data.plans||{}},{id:'settings',data:data.settings||{}}]}}]}}
 else if(data.app!=='fits-desktop-all'||!Array.isArray(data.profiles))return toast(t('badFile'));
 const cur=curProf;let n=0;
 for(const {profile,stores} of data.profiles){if(!profile?.id)continue;await PDB.put(profile);await DB.open(dbNameFor(profile.id));
  for(const s of BK_STORES)for(const r of stores?.[s]||[])await DB.put(s,r);n++}
 profiles=await loadProfiles();
 if(cur){await DB.open(dbNameFor(cur.id));await loadAll();render()}else{DB.db?.close();DB.db=null}
 if(pickerOpen())showPicker();toast(t('bkRestored',{n}))}
Object.assign(S.en,{bkAll:'Back up all profiles',bkRestore:'Restore from backup',bkSaved:'Saved a backup of {n} profiles',bkRestored:'Restored {n} profiles'});
Object.assign(S.ar,{bkAll:'نسخة احتياطية لكل اليوزرز',bkRestore:'استرجاع من نسخة احتياطية',bkSaved:'اتحفظت نسخة لـ {n} يوزر',bkRestored:'اتسترجع {n} يوزر'});
