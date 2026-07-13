const LS={sets:'wt_s6',pr:'wt_p6',notes:'wt_n6',bw:'wt_bw6',cycle:'wt_c6',meas:'wt_m6',gym:'wt_g6',theme:'wt_th6',sessions:'wt_sess6',cynotes:'wt_cyn6',restplan:'wt_rp6',setcounts:'wt_sc6',pain:'wt_pain6'};
const REST_T={main:180,acc:90,iso:60,lat:45};
// Poljuben počitek per vaja (shranjen po imenu vaje)
function getCustomRest(){try{return JSON.parse(localStorage.getItem('wt_custom_rest')||'{}');}catch{return {};}}
function setCustomRestFor(key,secs){const r=getCustomRest();if(secs)r[key]=secs;else delete r[key];localStorage.setItem('wt_custom_rest',JSON.stringify(r));}
function restForEx(id,name,def){const r=getCustomRest();return r[id]||r[name]||def;}
function fmtRest(s){if(s%60===0)return (s/60)+' min';if(s>60)return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');return s+'s';}
let _restEditCtx=null;
// === Lastni potrditveni / vnosni modali (nadomestijo confirm/prompt) ===
let _confirmResolve=null,_promptResolve=null;
function uiConfirm(msg,okText){
  return new Promise(res=>{
    _confirmResolve=res;
    document.getElementById('confirm-msg').textContent=msg;
    document.getElementById('confirm-ok').textContent=okText||'Potrdi';
    document.getElementById('confirm-pop').classList.add('on');
  });
}
document.addEventListener('DOMContentLoaded',()=>{
  const cok=document.getElementById('confirm-ok'),ccn=document.getElementById('confirm-cancel');
  if(cok)cok.onclick=()=>{document.getElementById('confirm-pop').classList.remove('on');if(_confirmResolve){_confirmResolve(true);_confirmResolve=null;}};
  if(ccn)ccn.onclick=()=>{document.getElementById('confirm-pop').classList.remove('on');if(_confirmResolve){_confirmResolve(false);_confirmResolve=null;}};
  const pok=document.getElementById('prompt-ok'),pcn=document.getElementById('prompt-cancel');
  if(pok)pok.onclick=()=>{const v=document.getElementById('prompt-input').value;document.getElementById('prompt-pop').classList.remove('on');if(_promptResolve){_promptResolve(v);_promptResolve=null;}};
  if(pcn)pcn.onclick=()=>{document.getElementById('prompt-pop').classList.remove('on');if(_promptResolve){_promptResolve(null);_promptResolve=null;}};
});
function uiPrompt(msg,defVal){
  return new Promise(res=>{
    _promptResolve=res;
    document.getElementById('prompt-msg').textContent=msg;
    const inp=document.getElementById('prompt-input');
    inp.value=(defVal===undefined||defVal===null)?'':defVal;
    document.getElementById('prompt-pop').classList.add('on');
    setTimeout(()=>inp.focus(),50);
  });
}
// === FAB: skoči na aktivno vajo (gym mode) ===
function scrollToActiveEx(){
  const el=document.querySelector('.exc.active-ex')||
           (document.querySelector('tr.next-set')&&document.querySelector('tr.next-set').closest('.exc'))||
           document.querySelector('.exc:not(.col-done)')||
           document.querySelector('.exc');
  if(el)el.scrollIntoView({behavior:'smooth',block:'center'});
}
// === Kompaktne kartice: (i) razkrije opis/nasvet/bolečino ===
function toggleExInfo(key){
  const card=document.getElementById('ec-'+key);
  if(card)card.classList.toggle('show-info');
}
function isCompact(){return localStorage.getItem('wt_compact')==='1';}
function setCompactMode(on){
  localStorage.setItem('wt_compact',on?'1':'0');
  document.body.classList.toggle('compact-cards',!!on);
  const t=document.getElementById('compact-toggle');
  if(t)t.classList.toggle('on',!!on);
}
function toggleCompactSetting(){setCompactMode(!isCompact());}
function initDisplayUI(){
  const t=document.getElementById('compact-toggle');
  if(t)t.classList.toggle('on',isCompact());
}
function editRest(name,def,exKey,id){
  _restEditCtx={name,def,exKey,id};
  document.getElementById('rest-edit-title').textContent='⏱ Počitek — '+name;
  document.getElementById('rest-edit-input').value=restForEx(id,name,def);
  document.getElementById('rest-edit-pop').classList.add('on');
  setTimeout(()=>document.getElementById('rest-edit-input').focus(),50);
}
function closeRestEdit(){
  document.getElementById('rest-edit-pop').classList.remove('on');
  _restEditCtx=null;
}
function confirmRestEdit(){
  if(!_restEditCtx)return;
  const {name,def,exKey,id}=_restEditCtx;
  const v=document.getElementById('rest-edit-input').value;
  const n=parseInt(v);
  let sec;
  if(isNaN(n)||n<5){setCustomRestFor(id||name,0);sec=def;toast('↺ Vrnjen privzet počitek','ok');}
  else{sec=Math.min(900,n);setCustomRestFor(id||name,sec);toast('✓ Počitek: '+fmtRest(sec),'ok');}
  // Če za to vajo trenutno teče časomer, ga ponovno zaženi z NOVIM trajanjem
  let wasRunning=false;
  try{const t=JSON.parse(localStorage.getItem('wt_active_timer')||'null');wasRunning=!!(t&&exKey&&t.key===exKey);}catch(e){}
  closeRestEdit();
  showDay(cd);
  if(wasRunning&&exKey)startT(exKey,sec);
}
const WEEK_PCTS=[1.0,0.90,0.82,0.62];
const BARBELL_EX=["Barbell bench press","Barbell row","Barbell squat","Romanian deadlift","Overhead press — barbell","Barbell curl","Deadlift","Barbell bench press — BBB","Barbell squat — BBB","Overhead press — BBB","Deadlift — BBB"];
const MAIN_LIFTS=["Barbell bench press","Barbell squat","Deadlift","Overhead press — barbell","Weighted pull-ups","Barbell row"];
const APP_VERSION='6.0.2';
const DAY_NAMES=["Push A","Pull A","Noge","Push B","Pull B"];
const WEEK_DAYS=["Pon","Tor","Sre","Čet","Pet","Sob","Ned"];
const MEAS_FIELDS=["Prsa","Pas","Boki","L roka","D roka","L stegno","D stegno"];
