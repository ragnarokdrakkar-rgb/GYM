initTheme();applyAllColors();initBWGoal();
if(isCompact())document.body.classList.add('compact-cards');
// Obnovi zadnji teden in dan
const _lastWeek=parseInt(localStorage.getItem('wt_last_week'));
const _lastDay=parseInt(localStorage.getItem('wt_last_day'));
if(!isNaN(_lastWeek)&&_lastWeek>=0&&_lastWeek<=3){cw=_lastWeek;document.querySelectorAll('.wt').forEach((t,i)=>t.classList.toggle('active',i===_lastWeek));}
const _initDay=(!isNaN(_lastDay)&&_lastDay>=0&&_lastDay<=4)?_lastDay:0;
try{const _av=document.getElementById('app-ver');if(_av)_av.textContent='v'+APP_VERSION;}catch(e){}
try{migrateSwaps();}catch(e){}
// Enkratna migracija: "Deadlift — capped..." → "Deadlift" (ohrani zgodovino, PR-je, red, swape)
try{
  if(!localStorage.getItem('wt_dl_renamed')){
    const OLDN='Deadlift — capped at 75% (≈140kg)',NEWN='Deadlift';
    const _as=getSets();let _ch=false;
    Object.keys(_as).forEach(k=>{(_as[k]||[]).forEach(s=>{if(s&&s.exName===OLDN){s.exName=NEWN;if(typeof exStableId==='function')s.exerciseId=exStableId(NEWN);_ch=true;}});});
    if(_ch)saveSets(_as);
    const _ord=getExOrderNames();Object.keys(_ord).forEach(di=>{const i=(_ord[di]||[]).indexOf(OLDN);if(i>=0){_ord[di][i]=NEWN;}});saveExOrderNames(_ord);
    const _sw=getExSwaps();Object.keys(_sw).forEach(k=>{if(k.endsWith('|'+OLDN)){const nk=k.replace('|'+OLDN,'|'+NEWN);if(_sw[nk]===undefined)_sw[nk]=_sw[k];delete _sw[k];}});saveExSwaps(_sw);
    try{const _rp=JSON.parse(localStorage.getItem('wt_rep_prs')||'{}');if(_rp[OLDN]){if(!_rp[NEWN])_rp[NEWN]=_rp[OLDN];else Object.keys(_rp[OLDN]).forEach(r=>{if((_rp[OLDN][r]||0)>(_rp[NEWN][r]||0))_rp[NEWN][r]=_rp[OLDN][r];});delete _rp[OLDN];localStorage.setItem('wt_rep_prs',JSON.stringify(_rp));}}catch(e){}
    try{const _cr=JSON.parse(localStorage.getItem('wt_custom_rest')||'{}');if(_cr[OLDN]!==undefined){if(_cr[NEWN]===undefined)_cr[NEWN]=_cr[OLDN];delete _cr[OLDN];localStorage.setItem('wt_custom_rest',JSON.stringify(_cr));}}catch(e){}
    const _prs=getPRs();let _pch=false;Object.keys(_prs).forEach(k=>{if(_prs[k]&&_prs[k].exName===OLDN){_prs[k].exName=NEWN;_pch=true;}});if(_pch)savePRs(_prs);
    localStorage.setItem('wt_dl_renamed','1');
  }
}catch(e){console.warn('DL rename migracija:',e);}
try{ensureDayLists();}catch(e){console.warn('ensureDayLists:',e);}
try{initProfileUI();}catch(e){console.warn('phase init:',e);}
showDay(_initDay);
try{initP1();}catch(e){console.warn('P1 init failed',e);}
// Obnovi morebiten aktivni session in rest timer
restoreSession();restoreTimer();
localStorage.removeItem('wt_ai_key');
setTimeout(maybeShowOnboarding,250);
setTimeout(()=>runSelfTestsV6(true).catch(e=>console.warn('V6 self-test:',e)),1200);

// Tedenski backup reminder ob startu
setTimeout(checkBackupReminder,2000);




