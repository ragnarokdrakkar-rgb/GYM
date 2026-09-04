// ============== PROFIL SISTEM ==============
function getActiveProfile(){return localStorage.getItem('wt_profile')||'cut';}
function setActiveProfile(p){localStorage.setItem('wt_profile',p);}
// 5/3/1 Training Max-i (90% 1RM) — uporabnik vnese 1RM
function get531TMs(){try{return JSON.parse(localStorage.getItem('wt_531tm')||'{}');}catch{return {};}}
function save531TMs(t){localStorage.setItem('wt_531tm',JSON.stringify(t));}
// Koliko ciklov 5/3/1 je bilo opravljenih (za progresijo TM)
function get531CycleOffset(){return parseInt(localStorage.getItem('wt_531offset')||'0');}
function set531CycleOffset(n){localStorage.setItem('wt_531offset',String(n));}

// Cut/Bulk je faza, ne drug seznam vaj. Program ostane uporabnikov, faza pa
// določa tedenske cilje. 5/3/1 se vklopi samo na posamezni vaji v builderju.
const PHASE_PLANS_V16={
  cut:{
    label:'Cut',eyebrow:'OHRANJANJE',summary:'Manj utrujenosti, jasen fokus na ohranjanju moči.',
    weeks:PROG_CUT.weeks.map(w=>({...w}))
  },
  bulk:{
    label:'Bulk',eyebrow:'RAST',summary:'Več delovnih serij in prostora za postopno napredovanje.',
    weeks:[
      {reps:'6–10',rpe:'RPE 7–8',sM:4,sA:3,pill:'bl',rb:'rh',dl:false,label:'Osnova'},
      {reps:'8–12',rpe:'RPE 8',sM:4,sA:4,pill:'gr',rb:'rm',dl:false,label:'Volumen'},
      {reps:'6–10',rpe:'RPE 8–9',sM:5,sA:4,pill:'am',rb:'rh',dl:false,label:'Napredek'},
      {reps:'8–10',rpe:'RPE 6',sM:3,sA:3,pill:'gr',rb:'rl',dl:true,label:'Deload'}
    ]
  }
};
function cloneProgramV16(value){return JSON.parse(JSON.stringify(value));}
function buildPhaseProgramV16(profile=getActiveProfile()){
  const phase=profile==='bulk'?'bulk':'cut';
  const base=cloneProgramV16(PROG_CUT);
  base.phase=phase;base.is531=false;base.weeks=cloneProgramV16(PHASE_PLANS_V16[phase].weeks);
  return base;
}
function infer531LiftV16(name){
  const n=String(name||'').toLowerCase();
  if(/deadlift/.test(n))return 'deadlift';
  if(/squat/.test(n))return 'squat';
  if(/overhead|\bohp\b|military/.test(n))return 'ohp';
  if(/bench/.test(n))return 'bench';
  return '';
}
function programUses531V16(){
  const all=typeof getDayLists==='function'?getDayLists():null;
  return !!(all&&Object.values(all).some(list=>Array.isArray(list)&&list.some(e=>e?.progMode==='531')));
}

let PROG=buildPhaseProgramV16();

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
async function switchProfile(p){
  p=p==='bulk'?'bulk':'cut';
  if(stRun||localStorage.getItem(LS_SESS)){toast('Najprej zaključi aktivno sesijo. Faza med treningom je zaklenjena.','err');return false;}
  const cur=getActiveProfile();
  if(p===cur){toast('Faza '+(p==='bulk'?'Bulk':'Cut')+' je že aktivna.','ok');return false;}
  const accepted=await uiConfirm(
    `Preklopim na ${p==='bulk'?'Bulk':'Cut'}?\n\n`+
    'Tvoje izbrane vaje, njihov vrstni red in zgodovina ostanejo enaki. Spremenijo se samo tedenski cilji setov, ponovitev in RPE.'
  );
  if(!accepted)return false;
  setActiveProfile(p);
  PROG=buildPhaseProgramV16(p);
  initProfileUI();
  toast('Faza '+(p==='bulk'?'Bulk':'Cut')+' je aktivna. Vaje so ostale enake.','ok');
  return true;
}

function initProfileUI(){
  const prof=getActiveProfile();
  const phase=PHASE_PLANS_V16[prof]||PHASE_PLANS_V16.cut;
  document.documentElement.dataset.phase=prof;
  document.body?.setAttribute('data-phase',prof);
  const status=document.getElementById('profile-status');
  if(status)status.innerHTML=`<strong>${phase.label}</strong><span>${phase.summary}</span>`;
  const cutBtn=document.getElementById('prof-cut-btn');
  const bulkBtn=document.getElementById('prof-bulk-btn');
  if(cutBtn&&bulkBtn){
    cutBtn.classList.toggle('active',prof==='cut');
    bulkBtn.classList.toggle('active',prof==='bulk');
    cutBtn.setAttribute('aria-pressed',prof==='cut'?'true':'false');
    bulkBtn.setAttribute('aria-pressed',prof==='bulk'?'true':'false');
  }
  const ed=document.getElementById('tm-editor');
  if(ed&&!programUses531V16())ed.classList.remove('open');
  // Napolni TM inpute
  const tms=get531TMs();
  ['bench','squat','deadlift','ohp'].forEach(l=>{
    const inp=document.getElementById('tm-'+l);
    if(inp&&tms[l])inp.value=tms[l];
  });
  render531Current();
  renderPhaseHubV16();
}

function toggle531EditorV16(){
  const editor=document.getElementById('tm-editor');if(!editor)return;
  editor.classList.toggle('open');
  document.getElementById('tm-editor-toggle')?.setAttribute('aria-expanded',editor.classList.contains('open')?'true':'false');
}
function renderPhaseHubV16(){
  const hub=document.getElementById('phase-hub-v16');if(!hub)return;
  const prof=getActiveProfile(),phase=PHASE_PLANS_V16[prof]||PHASE_PLANS_V16.cut;
  hub.dataset.phase=prof;
  hub.querySelectorAll('[data-phase-choice]').forEach(button=>{
    const active=button.dataset.phaseChoice===prof;
    button.classList.toggle('active',active);button.setAttribute('aria-pressed',active?'true':'false');
  });
  const eyebrow=hub.querySelector('[data-phase-eyebrow]');if(eyebrow)eyebrow.textContent=phase.eyebrow;
  const title=hub.querySelector('[data-phase-title]');if(title)title.textContent=phase.label+' faza';
  const text=hub.querySelector('[data-phase-summary]');if(text)text.textContent=phase.summary;
  const mode=hub.querySelector('[data-phase-mode]');if(mode)mode.textContent=programUses531V16()?'5/3/1 na izbranih vajah':'Pametna progresija';
  const cutLabels=['Moč','Kontrola','Volumen','Deload'];
  document.querySelectorAll('.wt').forEach((button,index)=>{
    const plan=phase.weeks[index],label=prof==='bulk'?(plan?.label||`Teden ${index+1}`):cutLabels[index];
    button.innerHTML=`Teden ${index+1}<br>${label}`;
    button.classList.toggle('deload',!!plan?.dl);
  });
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

