let cw=0,cd=0,TM={},stInt=null,stStart=null,stRun=false,bwChart=null,strengthChart=null,swOpen={},activeLift=0,sessStart=null,restMode='train';

function ls(k){try{return JSON.parse(localStorage.getItem(k)||'{}');}catch{return {};}}
function safeSetRaw(k,v){
  try{
    if(typeof window.markSaveStateV15==='function')window.markSaveStateV15('saving');
    localStorage.setItem(k,String(v));
    if(typeof window.markSaveStateV15==='function')window.markSaveStateV15('saved');
    return true;
  }catch(e){
    if(typeof window.markSaveStateV15==='function')window.markSaveStateV15('error');
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
    if(typeof window.markSaveStateV15==='function')window.markSaveStateV15('saved');
    return true;
  }catch(e){
    if(typeof window.markSaveStateV15==='function')window.markSaveStateV15('error');
    return false;
  }
}
function lss(k,v){
  return safeSetRaw(k,JSON.stringify(v));
}
function lsa(k){try{return JSON.parse(localStorage.getItem(k)||'[]');}catch{return [];}}
function getSets(){return ls(LS.sets);}function saveSets(d){lss(LS.sets,d);}
function getPRs(){return ls(LS.pr);}function savePRs(d){lss(LS.pr,d);}
function getNotes(){return ls(LS.notes);}function saveNotes(d){lss(LS.notes,d);}
function getBW(){return ls(LS.bw);}function saveBW(d){lss(LS.bw,d);}
function getCyc(){const d=ls(LS.cycle);return{num:d.num||1,startDates:d.startDates||{'1':new Date().toISOString().split('T')[0]}};}
function saveCyc(d){lss(LS.cycle,d);}
function getMeas(){return ls(LS.meas);}function saveMeas(d){lss(LS.meas,d);}
function getGym(){const d=ls(LS.gym);return{bar:d.bar||20,plates:d.plates||[1.25,2.5,5,10,20,25]};}
function saveGym(d){lss(LS.gym,d);}
function getSessions(){return lsa(LS.sessions);}function saveSessions(d){lss(LS.sessions,d);}
function getCyNotes(){return ls(LS.cynotes);}function saveCyNotes(d){lss(LS.cynotes,d);}
function getRestPlan(){return ls(LS.restplan);}function saveRestPlan(d){lss(LS.restplan,d);}
function getSetCounts(){return ls(LS.setcounts);}function saveSetCounts(d){lss(LS.setcounts,d);}
function getPainData(){return ls(LS.pain);}function savePainData(d){lss(LS.pain,d);}
