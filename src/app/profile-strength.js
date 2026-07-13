// ============== PROFIL SISTEM ==============
function getActiveProfile(){return localStorage.getItem('wt_profile')||'cut';}
function setActiveProfile(p){localStorage.setItem('wt_profile',p);}
// 5/3/1 Training Max-i (90% 1RM) — uporabnik vnese 1RM
function get531TMs(){try{return JSON.parse(localStorage.getItem('wt_531tm')||'{}');}catch{return {};}}
function save531TMs(t){localStorage.setItem('wt_531tm',JSON.stringify(t));}
// Koliko ciklov 5/3/1 je bilo opravljenih (za progresijo TM)
function get531CycleOffset(){return parseInt(localStorage.getItem('wt_531offset')||'0');}
function set531CycleOffset(n){localStorage.setItem('wt_531offset',String(n));}

// PROG je aktivni program glede na profil
let PROG = getActiveProfile()==='bulk' ? PROG_BULK : PROG_CUT;

// Trenutni Training Max za dvig (z upoštevanjem progresije ciklov)
function getCurrentTM(lift){
  const tms=get531TMs();
  const base=parseFloat(tms[lift]);
  if(!base||isNaN(base))return null;
  const offset=get531CycleOffset();
  const inc=(lift==='bench'||lift==='ohp')?2.5:5;
  return base+offset*inc;
}
function roundToPlate(kg){return Math.round(kg/2.5)*2.5;}
// 5/3/1 prescription za glavni dvig
function get531Prescription(lift,weekIdx){
  const tm=getCurrentTM(lift);
  if(!tm)return null;
  const w=W531[weekIdx];if(!w)return null;
  return w.pct.map((p,i)=>({pct:Math.round(p*100),kg:roundToPlate(tm*p),reps:w.reps[i]}));
}
// BBB prescription
function getBBBPrescription(lift,sets,reps){
  const tm=getCurrentTM(lift);
  if(!tm)return null;
  return {kg:roundToPlate(tm*0.5),sets:sets||5,reps:reps||10};
}

// === PREKLOP PROFILA ===
function switchProfile(p){
  if(stRun||localStorage.getItem(LS_SESS)){toast('Najprej zaključi aktivno sesijo. Profil med treningom je zaklenjen.','err');return;}
  const cur=getActiveProfile();
  if(p===cur){toast('Že aktiven: '+(p==='bulk'?'Bulk':'Cut'),'ok');return;}
  if(p==='bulk'){
    const tms=get531TMs();
    const has=['bench','squat','deadlift','ohp'].every(l=>tms[l]);
    if(!has){
      setActiveProfile('bulk');
      PROG=PROG_BULK;
      initProfileUI();
      toast('Bulk aktiven — vnesi 1RM-je spodaj','ok');
      // Odpri TM editor in scroll
      const ed=document.getElementById('tm-editor');if(ed)ed.style.display='block';
      return;
    }
  }
  setActiveProfile(p);
  PROG = p==='bulk'?PROG_BULK:PROG_CUT;
  // Reset day/week na varno
  cw=0;cd=0;
  localStorage.setItem('wt_last_week','0');localStorage.setItem('wt_last_day','0');
  initProfileUI();
  toast('✓ Preklopljeno na '+(p==='bulk'?'Bulk (5/3/1)':'Cut'),'ok');
}

function initProfileUI(){
  const prof=getActiveProfile();
  const status=document.getElementById('profile-status');
  if(status)status.innerHTML=prof==='bulk'?'Aktivno: <span style="color:var(--green-text);">Bulk — 5/3/1 BBB</span>':'Aktivno: <span style="color:var(--blue-text);">Cut — 5-dnevni PPL</span>';
  const cutBtn=document.getElementById('prof-cut-btn');
  const bulkBtn=document.getElementById('prof-bulk-btn');
  if(cutBtn&&bulkBtn){
    const active='background:var(--green-bg);border-color:var(--green);color:var(--green-text);';
    const inactive='background:var(--bg3);';
    cutBtn.style.cssText=prof==='cut'?active:inactive;
    bulkBtn.style.cssText=prof==='bulk'?active:inactive;
  }
  const ed=document.getElementById('tm-editor');
  if(ed)ed.style.display=prof==='bulk'?'block':'none';
  // Napolni TM inpute
  const tms=get531TMs();
  ['bench','squat','deadlift','ohp'].forEach(l=>{
    const inp=document.getElementById('tm-'+l);
    if(inp&&tms[l])inp.value=tms[l];
  });
  render531Current();
}

function save531FromInputs(){
  const tms=get531TMs();
  let any=false;
  ['bench','squat','deadlift','ohp'].forEach(l=>{
    const inp=document.getElementById('tm-'+l);
    if(inp&&inp.value){
      // Vnos je 1RM, shranimo TM = 90% (zaokroženo)
      const oneRM=parseFloat(inp.value);
      if(oneRM>0){tms[l]=roundToPlate(oneRM*0.9);any=true;}
    }
  });
  if(!any){toast('Vnesi vsaj en 1RM','err');return;}
  save531TMs(tms);
  render531Current();
  if(getActiveProfile()==='bulk')showDay(cd);
  toast('✓ Training Max-i shranjeni','ok');
}

function render531Current(){
  const el=document.getElementById('tm-current');if(!el)return;
  const tms=get531TMs();
  const offset=get531CycleOffset();
  const lifts=[['bench','Bench'],['squat','Squat'],['deadlift','DL'],['ohp','OHP']];
  const parts=lifts.filter(([k])=>tms[k]).map(([k,lbl])=>{
    const tm=getCurrentTM(k);
    return `${lbl} TM ${tm}kg`;
  });
  el.innerHTML=parts.length?`Trenutni TM (cikel ${offset+1}): ${parts.join(' · ')}`:'Ni vnesenih 1RM-jev.';
}

async function advance531Cycle(){
  if(!await uiConfirm('Zaključi cikel? TM se poveča: +2.5kg bench/OHP, +5kg squat/deadlift.'))return;
  set531CycleOffset(get531CycleOffset()+1);
  render531Current();
  if(getActiveProfile()==='bulk')showDay(cd);
  toast('✓ Nov cikel — TM povišan','ok');
}
async function reset531Cycle(){
  if(!await uiConfirm('Resetiraj progresijo ciklov na začetek (TM nazaj na osnovne 1RM)?'))return;
  set531CycleOffset(0);
  render531Current();
  if(getActiveProfile()==='bulk')showDay(cd);
  toast('↺ Cikli resetirani','ok');
}
// Per-vaja: {primary: [muscles], secondary: [muscles], category}
// Category: 'compound' (več mišic), 'isolation' (ena mišica)
const EX_MAP = {
  // Push A
  "Barbell bench press": {p:["Prsa"], s:["Tricepsi","Sprednji deltoid"], cat:"compound"},
  "Incline dumbbell press": {p:["Prsa"], s:["Tricepsi","Sprednji deltoid"], cat:"compound"},
  "Cable chest fly": {p:["Prsa"], s:[], cat:"isolation"},
  "Seated DB shoulder press": {p:["Ramena"], s:["Tricepsi"], cat:"compound"},
  "Lateral raises": {p:["Ramena"], s:[], cat:"isolation"},
  "Tricep pushdown — rope": {p:["Tricepsi"], s:[], cat:"isolation"},
  // Pull A
  "Weighted pull-ups": {p:["Hrbet"], s:["Bicepsi"], cat:"compound"},
  "Barbell row": {p:["Hrbet"], s:["Bicepsi","Zadnji deltoid"], cat:"compound"},
  "Seated cable row": {p:["Hrbet"], s:["Bicepsi"], cat:"compound"},
  "Face pulls": {p:["Zadnji deltoid"], s:["Hrbet"], cat:"isolation"},
  "Barbell curl": {p:["Bicepsi"], s:[], cat:"isolation"},
  "Hammer curl": {p:["Bicepsi"], s:[], cat:"isolation"},
  // Noge
  "Barbell squat": {p:["Kvadricepsi","Gluteusi"], s:["Hamstringi"], cat:"compound"},
  "Romanian deadlift": {p:["Hamstringi","Gluteusi"], s:["Hrbet"], cat:"compound"},
  "Leg press": {p:["Kvadricepsi","Gluteusi"], s:["Hamstringi"], cat:"compound"},
  "Leg curl — seated": {p:["Hamstringi"], s:[], cat:"isolation"},
  "Leg curl — lying": {p:["Hamstringi"], s:[], cat:"isolation"},
  "Leg extension": {p:["Kvadricepsi"], s:[], cat:"isolation"},
  "Standing calf raise": {p:["Mečni"], s:[], cat:"isolation"},
  // Push B
  "Overhead press — barbell": {p:["Ramena"], s:["Tricepsi"], cat:"compound"},
  "Dumbbell bench press": {p:["Prsa"], s:["Tricepsi","Sprednji deltoid"], cat:"compound"},
  "Arnold press": {p:["Ramena"], s:["Tricepsi"], cat:"compound"},
  "Cable lateral raise": {p:["Ramena"], s:[], cat:"isolation"},
  "Weighted dips": {p:["Prsa","Tricepsi"], s:[], cat:"compound"},
  "Overhead tricep extension": {p:["Tricepsi"], s:[], cat:"isolation"},
  // Pull B
  "Deadlift": {p:["Hrbet","Hamstringi","Gluteusi"], s:["Trapezius"], cat:"compound"},
  "Single-arm DB row": {p:["Hrbet"], s:["Bicepsi"], cat:"compound"},
  "Lat pulldown — close grip": {p:["Hrbet"], s:["Bicepsi"], cat:"compound"},
  "Reverse fly — machine": {p:["Zadnji deltoid"], s:[], cat:"isolation"},
  "Incline dumbbell curl": {p:["Bicepsi"], s:[], cat:"isolation"},
  "Cable curl 21s": {p:["Bicepsi"], s:[], cat:"isolation"},
  // Bulk 5/3/1 vaje
  "Deadlift": {p:["Hrbet","Hamstringi","Gluteusi"], s:["Trapezius"], cat:"compound"},
  "Barbell bench press — BBB": {p:["Prsa"], s:["Tricepsi","Sprednji deltoid"], cat:"compound"},
  "Barbell squat — BBB": {p:["Kvadricepsi","Gluteusi"], s:["Hamstringi"], cat:"compound"},
  "Overhead press — BBB": {p:["Ramena"], s:["Tricepsi"], cat:"compound"},
  "Deadlift — BBB": {p:["Hrbet","Hamstringi","Gluteusi"], s:["Trapezius"], cat:"compound"}
};

// Volume cilji per skupina (sets/teden, znanstveno priporočeno)
const VOL_TARGETS = {
  "Prsa": {min:10, max:20},
  "Hrbet": {min:10, max:20},
  "Kvadricepsi": {min:10, max:20},
  "Hamstringi": {min:8, max:16},
  "Gluteusi": {min:8, max:16},
  "Ramena": {min:8, max:16},
  "Sprednji deltoid": {min:0, max:8},
  "Zadnji deltoid": {min:6, max:12},
  "Bicepsi": {min:6, max:14},
  "Tricepsi": {min:6, max:14},
  "Mečni": {min:6, max:12},
  "Trapezius": {min:0, max:8}
};

// Strength tier ratios glede na BW (bench/squat/deadlift/OHP)
// Vir: ekvivalent classical strength standards (untrained → elite)
const STRENGTH_TIERS = {
  bench:    [{r:0.5,l:"Začetnik"},{r:0.75,l:"Novice"},{r:1.0,l:"Vmesni"},{r:1.5,l:"Napreden"},{r:2.0,l:"Elite"}],
  squat:    [{r:0.75,l:"Začetnik"},{r:1.25,l:"Novice"},{r:1.5,l:"Vmesni"},{r:2.0,l:"Napreden"},{r:2.5,l:"Elite"}],
  deadlift: [{r:1.0,l:"Začetnik"},{r:1.5,l:"Novice"},{r:1.75,l:"Vmesni"},{r:2.25,l:"Napreden"},{r:2.75,l:"Elite"}],
  ohp:      [{r:0.35,l:"Začetnik"},{r:0.55,l:"Novice"},{r:0.7,l:"Vmesni"},{r:1.0,l:"Napreden"},{r:1.3,l:"Elite"}]
};

// Kateri PROG vaje so "big lift"
const BIG_LIFTS = {
  bench:"Barbell bench press",
  squat:"Barbell squat",
  deadlift:"Deadlift",
  ohp:"Overhead press — barbell"
};

