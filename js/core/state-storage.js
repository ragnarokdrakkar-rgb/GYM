let cw=0,cd=0,TM={},stInt=null,stStart=null,stRun=false,bwChart=null,strengthChart=null,swOpen={},activeLift=0,sessStart=null,restMode='train';

function ls(k){try{return JSON.parse(localStorage.getItem(k)||'{}');}catch{return {};}}
function lss(k,v){
  try{localStorage.setItem(k,JSON.stringify(v));return true;}
  catch(e){
    // Kritično: shranjevanje ni uspelo (poln localStorage ali zasebni način)
    if(!window._lssWarned){
      window._lssWarned=true;
      try{
        const msg=(e&&e.name==='QuotaExceededError')
          ? '⚠️ POMNILNIK POLN! Podatki se NE shranjujejo. Nujno: Tools → Export backup, nato počisti stare podatke.'
          : '⚠️ Shranjevanje ne deluje (zasebni način?). Podatki bodo izgubljeni ob zaprtju!';
        if(typeof toast==='function')toast(msg,'err');
        else alert(msg);
      }catch(_){}
      // Reset opozorila čez 30s, da lahko spet opozori
      setTimeout(()=>{window._lssWarned=false;},30000);
    }
    return false;
  }
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
