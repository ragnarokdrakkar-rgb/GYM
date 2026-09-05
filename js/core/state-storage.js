let cw=0,cd=0,TM={},stInt=null,stStart=null,stRun=false,bwChart=null,strengthChart=null,swOpen={},activeLift=0,sessStart=null,restMode='train';

// Failed writes remain available to retry/export, but are never reported as saved.
const pendingStorageWrites=new Map();
const STORAGE_JOURNAL_KEY='wt_storage_journal_v18';
let storageRecoveryError=false;
function storageHasPendingWrites(){return pendingStorageWrites.size>0||storageRecoveryError;}
function refreshStorageStatus(state='saved'){
  const failed=storageHasPendingWrites();
  window.__WT_STORAGE_ERROR__=failed;
  const banner=typeof document!=='undefined'?document.getElementById('storage-error-banner'):null;
  if(banner)banner.hidden=!failed;
  if(typeof window.markSaveStateV15==='function')window.markSaveStateV15(failed?'error':state);
}
function readStorageRaw(k){return pendingStorageWrites.has(k)?pendingStorageWrites.get(k):localStorage.getItem(k);}
function ls(k){try{return JSON.parse(readStorageRaw(k)||'{}');}catch{return {};}}
function safeSetRaw(k,v){
  try{
    refreshStorageStatus('saving');
    localStorage.setItem(k,String(v));
    if(localStorage.getItem(k)!==String(v))throw new Error('StorageVerificationError');
    pendingStorageWrites.delete(k);
    refreshStorageStatus();
    return true;
  }catch(e){
    pendingStorageWrites.set(k,String(v));
    refreshStorageStatus('error');
    if(!window._lssWarned){
      window._lssWarned=true;
      try{
        const msg=(e&&e.name==='QuotaExceededError')
          ? '⚠️ POMNILNIK JE POLN! Podatki se ne shranjujejo. Takoj odpri Nastavitve → Izvoz.'
          : '⚠️ Shranjevanje ne deluje. Podatki se lahko izgubijo ob zaprtju aplikacije.';
        if(typeof toast==='function')toast(msg,'err');
        else alert(msg);
      }catch(_){}
      setTimeout(()=>{window._lssWarned=false;},30000);
    }
    return false;
  }
}
function safeRemoveRaw(k){
  try{
    localStorage.removeItem(k);
    pendingStorageWrites.delete(k);
    refreshStorageStatus();
    return true;
  }catch(e){
    pendingStorageWrites.set(k,null);
    refreshStorageStatus('error');
    return false;
  }
}
function lss(k,v){
  return safeSetRaw(k,JSON.stringify(v));
}
function retryPendingStorageWrites(){
  if(storageRecoveryError&&!recoverStorageJournal())return false;
  for(const [key,value] of [...pendingStorageWrites]){
    if(value===null)safeRemoveRaw(key);else safeSetRaw(key,value);
  }
  refreshStorageStatus();
  return !storageHasPendingWrites();
}
function restoreStorageEntries(entries){
  // Free newly created keys before putting the originals back (quota failures).
  entries.filter(([,value])=>value===null).forEach(([key])=>localStorage.removeItem(key));
  entries.filter(([,value])=>value!==null).forEach(([key,value])=>localStorage.setItem(key,value));
}
function recoverStorageJournal(){
  try{
    const raw=localStorage.getItem(STORAGE_JOURNAL_KEY);
    if(raw){
      const entries=JSON.parse(raw);
      if(!Array.isArray(entries)||entries.some(e=>!Array.isArray(e)||!/^wt_[\w]+$/.test(e[0])||e[0]===STORAGE_JOURNAL_KEY||(e[1]!==null&&typeof e[1]!=='string')))throw new Error('Invalid recovery journal');
      restoreStorageEntries(entries);
      localStorage.removeItem(STORAGE_JOURNAL_KEY);
    }
    storageRecoveryError=false;return true;
  }catch(error){storageRecoveryError=true;return false;}
}
function commitStorageBatch(changes){
  if(storageHasPendingWrites())throw new Error('Najprej ponovno shrani čakajoče vnose.');
  const entries=[...changes];
  const before=entries.map(([key])=>[key,localStorage.getItem(key)]);
  let journalWritten=false;
  try{
    // The durable undo journal is acknowledged before any active data changes.
    localStorage.setItem(STORAGE_JOURNAL_KEY,JSON.stringify(before));
    journalWritten=true;
    entries.filter(([,value])=>value===null).forEach(([key])=>localStorage.removeItem(key));
    entries.filter(([,value])=>value!==null).forEach(([key,value])=>{
      localStorage.setItem(key,String(value));
      if(localStorage.getItem(key)!==String(value))throw new Error('StorageVerificationError');
    });
    localStorage.removeItem(STORAGE_JOURNAL_KEY);
    refreshStorageStatus();return true;
  }catch(error){
    if(journalWritten){
      try{restoreStorageEntries(before);localStorage.removeItem(STORAGE_JOURNAL_KEY);}
      catch(rollbackError){storageRecoveryError=true;}
    }
    refreshStorageStatus('error');
    throw new Error(storageRecoveryError?'Obnova ni dokončana. Ne zapri aplikacije; uporabi Ponovi shranjevanje.':'Zapis ni uspel. Prejšnji podatki so ostali ohranjeni.');
  }
}
recoverStorageJournal();
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>refreshStorageStatus());
function lsa(k){try{return JSON.parse(readStorageRaw(k)||'[]');}catch{return [];}}
function getSets(){return ls(LS.sets);}function saveSets(d){return lss(LS.sets,d);}
function getPRs(){return ls(LS.pr);}function savePRs(d){return lss(LS.pr,d);}
function getNotes(){return ls(LS.notes);}function saveNotes(d){return lss(LS.notes,d);}
function getBW(){return ls(LS.bw);}function saveBW(d){return lss(LS.bw,d);}
function getCyc(){const d=ls(LS.cycle);return{num:d.num||1,startDates:d.startDates||{'1':new Date().toISOString().split('T')[0]}};}
function saveCyc(d){return lss(LS.cycle,d);}
function getMeas(){return ls(LS.meas);}function saveMeas(d){return lss(LS.meas,d);}
function getGym(){const d=ls(LS.gym);return{bar:d.bar||20,plates:d.plates||[1.25,2.5,5,10,20,25]};}
function saveGym(d){return lss(LS.gym,d);}
function getSessions(){return lsa(LS.sessions);}function saveSessions(d){return lss(LS.sessions,d);}
function getCyNotes(){return ls(LS.cynotes);}function saveCyNotes(d){return lss(LS.cynotes,d);}
function getRestPlan(){return ls(LS.restplan);}function saveRestPlan(d){return lss(LS.restplan,d);}
function getSetCounts(){return ls(LS.setcounts);}function saveSetCounts(d){return lss(LS.setcounts,d);}
function getPainData(){return ls(LS.pain);}function savePainData(d){return lss(LS.pain,d);}
