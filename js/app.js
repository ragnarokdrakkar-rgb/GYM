function toggleTheme(){
  const html=document.documentElement,isDark=html.getAttribute('data-theme')==='dark';
  const next=isDark?'light':'dark';
  html.setAttribute('data-theme',next);
  document.getElementById('theme-btn').textContent=next==='dark'?'☀ Light':'🌙 Dark';
  localStorage.setItem(LS.theme,next);
  applyAllColors();
  if(bwChart)renderBW();if(strengthChart)renderStrengthChart();
}
// === BARVE PER SEGMENT (prosta izbira) ===
const COLOR_FAMILIES=[
  {k:'green',n:'Glavna (gumbi, poudarki, ✓)'},
  {k:'blue',n:'Info škatle / timer'},
  {k:'amber',n:'Deload / naslednja serija'},
  {k:'purple',n:'Posebno (drop seti, značke)'},
  {k:'red',n:'Opozorila / brisanje'},
];
const COLOR_DEFAULTS={green:'#1d9e75',blue:'#378add',amber:'#ef9f27',purple:'#7f77dd',red:'#e24b4a'};
function _h2r(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function _r2h(a){return '#'+a.map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join('');}
function _mix(a,b,t){return a.map((v,i)=>v+(b[i]-v)*t);}
function deriveShades(hex,isDark){
  const c=_h2r(hex);
  if(isDark)return [hex,_r2h(_mix(c,[26,28,32],0.58)),_r2h(_mix(c,[255,255,255],0.32))];
  return [hex,_r2h(_mix(c,[255,255,255],0.80)),_r2h(_mix(c,[0,0,0],0.40))];
}
function getStoredColors(){try{return JSON.parse(localStorage.getItem('wt_colors')||'{}');}catch{return {};}}
function applyAllColors(){
  const stored=getStoredColors();
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  const r=document.documentElement.style;
  COLOR_FAMILIES.forEach(f=>{
    if(stored[f.k]){
      const [g,bg,txt]=deriveShades(stored[f.k],isDark);
      r.setProperty('--'+f.k,g);r.setProperty('--'+f.k+'-bg',bg);r.setProperty('--'+f.k+'-text',txt);
    }
  });
}
function setColorFamily(k,hex){
  const stored=getStoredColors();stored[k]=hex;localStorage.setItem('wt_colors',JSON.stringify(stored));
  applyAllColors();
}
function resetColors(){
  localStorage.removeItem('wt_colors');
  const r=document.documentElement.style;
  COLOR_FAMILIES.forEach(f=>{r.removeProperty('--'+f.k);r.removeProperty('--'+f.k+'-bg');r.removeProperty('--'+f.k+'-text');});
  renderColorPickersInto();
  toast('↺ Barve ponastavljene','ok');
}
function renderColorPickers(){
  const stored=getStoredColors();
  return COLOR_FAMILIES.map(f=>{
    const val=stored[f.k]||COLOR_DEFAULTS[f.k];
    return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:11px;">
      <input type="color" value="${val}" onchange="setColorFamily('${f.k}',this.value)" style="width:48px;height:38px;border:none;border-radius:8px;background:none;cursor:pointer;padding:0;flex:none;">
      <span style="font-size:12.5px;color:var(--text2);">${f.n}</span>
    </div>`;
  }).join('')+`<button class="sb" onclick="resetColors()" style="background:var(--bg3);margin-top:6px;">↺ Ponastavi vse barve</button>`;
}
function renderColorPickersInto(){const el=document.getElementById('color-pickers');if(el)el.innerHTML=renderColorPickers();}
// Združljivost s starim klicem
function applyAccent(){applyAllColors();}

// === Hitre barvne teme (presети) ===
const COLOR_PRESETS={
  default:{n:'Privzeto',c:{green:'#1d9e75',blue:'#378add',amber:'#ef9f27',purple:'#7f77dd',red:'#e24b4a'}},
  fire:{n:'Ognjena',c:{green:'#ff5330',blue:'#ff9500',amber:'#ffb020',purple:'#ff2d55',red:'#ff3b30'}},
  ice:{n:'Ledena',c:{green:'#22a7ff',blue:'#00d4ff',amber:'#38bdf8',purple:'#6c8cff',red:'#ff5566'}},
  neon:{n:'Neon',c:{green:'#00e676',blue:'#00e5ff',amber:'#ffea00',purple:'#e040fb',red:'#ff1744'}},
  violet:{n:'Vijolična',c:{green:'#b14dff',blue:'#7c6cff',amber:'#ff9500',purple:'#d926ff',red:'#ff4081'}},
  gold:{n:'Zlata',c:{green:'#ffb300',blue:'#ff9500',amber:'#ffd54f',purple:'#ff7043',red:'#f4511e'}},
};
function applyColorPreset(key){
  if(key==='default'){resetColors();return;} // vrne točno originalne CSS barve
  const p=COLOR_PRESETS[key];if(!p)return;
  const stored=getStoredColors();
  Object.keys(p.c).forEach(k=>stored[k]=p.c[k]);
  localStorage.setItem('wt_colors',JSON.stringify(stored));
  applyAllColors();
  renderColorPickersInto();
  toast('✓ Tema: '+p.n,'ok');
}
function renderColorPresets(){
  return Object.keys(COLOR_PRESETS).map(k=>{
    const p=COLOR_PRESETS[k];
    const dots=Object.values(p.c).map(c=>`<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${c};margin-right:1px;"></span>`).join('');
    return `<button class="sb" onclick="applyColorPreset('${k}')" style="background:var(--bg3);display:inline-flex;align-items:center;gap:6px;">${dots}<span>${p.n}</span></button>`;
  }).join('');
}
function initTheme(){
  let t=localStorage.getItem(LS.theme)||'dark';
  // Migracija stare verzije, ki je shranila JSON niz z narekovaji.
  if(t==='"dark"'||t==='"light"'){try{t=JSON.parse(t);}catch(e){t='dark';}localStorage.setItem(LS.theme,t);}
  if(t!=='dark'&&t!=='light')t='dark';
  document.documentElement.setAttribute('data-theme',t);
  const btn=document.getElementById('theme-btn');if(btn)btn.textContent=t==='dark'?'☀ Light':'🌙 Dark';
}

function calcPlatesFor(targetKg){
  const gym=getGym(),bar=gym.bar,collars=getCollars();
  if(targetKg<=0||targetKg<bar+collars)return null;
  // Collars sta skupaj — odštejemo iz target preden delimo na 2
  let rem=Math.round((targetKg-bar-collars)/2*100)/100;
  const avail=[...gym.plates].sort((a,b)=>b-a);const used=[];
  for(const p of avail){while(rem>=p-0.001){rem=Math.round((rem-p)*100)/100;used.push(p);}}
  if(Math.abs(rem)>0.1)return null;
  if(used.length===0)return{each:collars>0?'Samo palica + collars':'Samo palica',total:bar+collars,bar,perSide:0};
  const grouped={};used.forEach(p=>grouped[p]=(grouped[p]||0)+1);
  const each=Object.entries(grouped).sort((a,b)=>parseFloat(b[0])-parseFloat(a[0])).map(([p,c])=>`${c}×${p}kg`).join('+');
  return{each,total:targetKg,bar,perSide:used.reduce((a,b)=>a+b,0),collars};
}

// Kratek format plošč za prikaz pod vsakim setom
function platesShort(kg){
  if(!kg||kg<=0)return {text:'',cls:''};
  const pl=calcPlatesFor(kg);
  if(!pl)return {text:'✗ ni možno',cls:'bad'};
  if(pl.perSide===0)return {text:'palica',cls:'ok'};
  const t=pl.each.split('+').map(p=>{
    const m=p.match(/^(\d+)×([\d.]+)kg$/);
    if(!m)return p;
    return m[1]==='1'?m[2]:`${m[1]}×${m[2]}`;
  }).join('+');
  return {text:t,cls:'ok'};
}

function showProgressPage(p){showPage(p||'gymlog');}
function setProgressNavActive(p){
  document.querySelectorAll('.progress-subnav button').forEach(b=>b.classList.toggle('active',b.dataset.progress===p));
}
function showPage(p){
  const page=document.getElementById('page-'+p);if(!page)return;
  document.querySelectorAll('.page').forEach(e=>e.classList.remove('active'));
  page.classList.add('active');
  const isProgress=['cycle','gymlog','bodyweight','body','stats'].includes(p);
  document.querySelectorAll('.nt').forEach(e=>e.classList.remove('active'));
  const nav=document.querySelector(`.nt[data-nav="${isProgress?'progress':p==='tools'?'tools':'workout'}"]`);if(nav)nav.classList.add('active');
  if(isProgress)setProgressNavActive(p);
  localStorage.setItem('wt_last_page',p);
  if(p==='bodyweight'){initBWGoal();renderBW();renderPhases();}
  if(p==='cycle')renderCycle();
  if(p==='body')renderMeas();
  if(p==='tools'){initProfileUI();initPlates();initAlarmUI();initCollarsUI();renderBackupList();initStepUI();renderCustomExList();renderColorPickersInto();initDisplayUI();const _cp=document.getElementById('color-presets');if(_cp)_cp.innerHTML=renderColorPresets();}
  if(p==='gymlog'){renderSessHist();renderWeeklySummary();renderTonnageChart();const _tc=document.getElementById('train-calendar');if(_tc)_tc.innerHTML=renderTrainCalendar();}
  if(p==='stats'){
    document.getElementById('vol-grp-view').innerHTML=renderVolumeView();
    document.getElementById('strength-ratios').innerHTML=renderStrengthRatios();
    renderE1RMChart();
  }
  window.scrollTo({top:0,behavior:'instant'});
}

// Get extra sets for an exercise key
function getExtraSets(exKey){const sc=getSetCounts();return sc[exKey]||0;}
function setExtraSets(exKey,val){const sc=getSetCounts();sc[exKey]=val;saveSetCounts(sc);}

function nsf(di,ei,wk,exKey){
  if(!PROG.days[di]||!PROG.days[di].ex[ei])return Math.max(1,4+getExtraSets(exKey));
  const base=wk.dl?3:(PROG.days[di].ex[ei].m?wk.sM:wk.sA);
  return Math.max(1,base+getExtraSets(exKey));
}

function sdk(c,w,d,e){return `c${c}w${w}d${d}e${e}`;}
function getPeakForExercise(cn,di,ei){
  const all=getSets();let peak=0;
  for(let w=0;w<4;w++){const key=sdk(cn,w,di,ei);if(all[key]){const sets=all[key].filter(s=>s.kg&&s.reps);if(sets.length>0)peak=Math.max(peak,...sets.map(s=>parseFloat(s.kg)||0));}}
  return peak;
}
function getWeek1Weight(cn,di,ei){
  const all=getSets(),key=sdk(cn,0,di,ei);
  if(!all[key])return 0;
  const sets=all[key].filter(s=>s.kg&&s.reps);
  return sets.length===0?0:Math.max(...sets.map(s=>parseFloat(s.kg)||0));
}
function allDone(di,ei){
  const wk=PROG.weeks[cw],exKey=sdk(getCyc().num,cw,di,ei),n=nsf(di,ei,wk,exKey),key=exKey;
  const all=getSets();if(!all[key])return false;
  return all[key].slice(0,n).every(s=>s.done);
}

// Ali so v danem dnevu (cikel cn, teden w) vse VIDNE vaje dokončane? (vsaj 1 vaja z done)
// Zgradi seznam vaj dneva ENAKO kot showDay (dedup + vrstni red + extras) — brez mutacije
// Dedupe po PRIKAZANEM imenu (upošteva zamenjave) — base ima prednost pred extra (base so prvi v seznamu)
function dedupeByDisplayName(list,di,c,w){
  const refKey=sdk(c,w,di,0); // swap lookup uporablja samo dan+ime (ne pozicije), zato je e0 dovolj
  const seen=new Set();
  return list.filter(e=>{
    const disp=getSwappedName(refKey,e.n,e.extra);
    const k=(disp||'').toLowerCase();
    if(seen.has(k))return false;
    seen.add(k);
    return true;
  });
}
// ====== V4 JEDRO: EN SEZNAM VAJ NA DAN (edini vir resnice), stabilni ID-ji ======
function _dlKey(){return 'wt_daylist_'+getActiveProfile();}
function _newExId(n){const slug=(n||'ex').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,24);return slug+'-'+Math.random().toString(36).slice(2,7);}
function getDayLists(){try{return JSON.parse(localStorage.getItem(_dlKey())||'null');}catch{return null;}}
function saveDayLists(all){localStorage.setItem(_dlKey(),JSON.stringify(all));}
// Prikazano ime vaje za (cikel,teden) — upošteva zgodovino preimenovanj (sw: [{n,c,w},...])
function dispNameForItem(it,c,w){
  let n=it.n0;
  if(Array.isArray(it.sw)){for(const s of it.sw){if(c>s.c||(c===s.c&&w>=s.w))n=s.n;}}
  return n;
}
// Seznam za prikaz: item + n=prikazano ime za trenutni teden
function getDayList(di){
  const all=getDayLists();
  const arr=(all&&all[di])?all[di]:null;
  if(!arr)return null;
  const c=getCyc().num;
  return arr.map(it=>({...it,n:dispNameForItem(it,c,cw)}));
}
// Seznam za POLJUBEN (cikel,teden) — za DataEditor in preglede preteklih tednov
function dayListFor(di,c,w){
  const all=getDayLists();
  const arr=all&&all[di];
  if(arr)return arr.map(it=>({...it,n:dispNameForItem(it,c,w)}));
  // legacy fallback
  const d=PROG.days[di];if(!d)return [];
  if(d._origEx===undefined)d._origEx=d.ex.slice();
  const origs=(d._origEx||d.ex).map(e=>({...e,extra:false}));
  const extras=getExtraExercises(di).map(e=>({...e,extra:true}));
  let mixed=applyExOrderByName(di,[...origs,...extras]);
  return dedupeByDisplayName(mixed,di,c,w);
}
// ENKRATNA migracija iz starih plasti (program+extras+vrstni red+zamenjave) v en seznam
function ensureDayLists(){
  if(getDayLists())return;
  const all={};
  const c=getCyc().num;
  const swaps=getExSwaps();
  for(let di=0;di<PROG.days.length;di++){
    const d=PROG.days[di];if(!d){all[di]=[];continue;}
    if(d._origEx===undefined)d._origEx=d.ex.slice();
    const origs=(d._origEx||[]).map(e=>({...e,extra:false}));
    const extras=getExtraExercises(di).map(e=>({...e,extra:true}));
    let mixed=[...origs,...extras];
    mixed=dedupeByDisplayName(mixed,di,c,cw);
    mixed=applyExOrderByName(di,mixed);
    all[di]=mixed.map(e=>{
      const it={id:_newExId(e.n),n0:e.n,m:!!e.m,r:e.r||90,rl:e.rl||'90s',d:e.d||'',tip:e.tip||'',extra:!!e.extra};
      const sw=swaps['d'+di+'|'+e.n];
      if(sw)it.sw=[typeof sw==='string'?{n:sw,c:1,w:0}:sw];
      return it;
    });
  }
  saveDayLists(all);
  // Počisti duhove: pozicijski ključi za dolžino seznama (nedosegljivi) — vsi cikli/tedni
  try{
    const allSets=getSets(),sc=getSetCounts(),hid=getHiddenEx(),pain=getPainData();let ch=false;
    for(let di=0;di<PROG.days.length;di++){
      const len=(all[di]||[]).length;
      for(let cc=1;cc<=c;cc++)for(let w=0;w<4;w++)for(let i=len;i<len+25;i++){
        const k=sdk(cc,w,di,i);
        if(allSets[k]!==undefined){delete allSets[k];ch=true;}
        if(sc[k]!==undefined){delete sc[k];ch=true;}
        if(hid[k]!==undefined){delete hid[k];ch=true;}
        if(pain[k]!==undefined){delete pain[k];ch=true;}
      }
    }
    if(ch){saveSets(allSets);saveSetCounts(sc);saveHiddenEx(hid);savePainData(pain);}
  }catch(e){}
  // Stare plasti so vgrajene v seznam — odstrani (da ne ustvarjajo duhov)
  localStorage.removeItem('wt_extra_ex');
  localStorage.removeItem('wt_ex_ordernames');
  localStorage.removeItem('wt_exswap');
}
// CENTRALNA PORAVNAVA: ob VSAKI spremembi seznama preslika pozicijske podatke (seti,
// dodatne serije, skrite oznake, bolečina, PR-ji) iz starega vrstnega reda ID-jev v novega.
// Deluje za poljubno permutacijo, vstavljanje in brisanje — brez izjem, brez duhov.
function reconcilePositions(di,oldIds,newIds){
  const cyc=getCyc();
  const allSets=getSets(),sc=getSetCounts(),hid=getHiddenEx(),pain=getPainData();
  for(let c=1;c<=cyc.num;c++){
    for(let w=0;w<4;w++){
      const bag={};
      oldIds.forEach((id,i)=>{const k=sdk(c,w,di,i);bag[id]={s:allSets[k],c:sc[k],h:hid[k],p:pain[k]};delete allSets[k];delete sc[k];delete hid[k];delete pain[k];});
      newIds.forEach((id,i)=>{const k=sdk(c,w,di,i);const b=bag[id];if(!b)return;
        if(b.s!==undefined)allSets[k]=b.s;
        if(b.c!==undefined)sc[k]=b.c;
        if(b.h!==undefined)hid[k]=b.h;
        if(b.p!==undefined)pain[k]=b.p;});
    }
  }
  saveSets(allSets);saveSetCounts(sc);saveHiddenEx(hid);savePainData(pain);
  const prs=getPRs();const pb={};
  oldIds.forEach((id,i)=>{const k='pr'+di+i;pb[id]=prs[k];delete prs[k];});
  newIds.forEach((id,i)=>{const k='pr'+di+i;if(pb[id]!==undefined)prs[k]=pb[id];});
  savePRs(prs);
}
// Edina pot za spremembo seznama: mutiraj + shrani + poravnaj podatke
function mutateDayList(di,fn){
  const all=getDayLists()||{};
  const arr=all[di]||[];
  const oldIds=arr.map(x=>x.id);
  fn(arr);
  all[di]=arr;
  saveDayLists(all);
  reconcilePositions(di,oldIds,arr.map(x=>x.id));
}
function buildDayExList(di){
  const L=getDayList(di);
  if(L)return L;
  // fallback (pred migracijo)
  const d=PROG.days[di];
  if(!d)return [];
  if(d._origEx===undefined)d._origEx=d.ex.slice();
  const origs=(d._origEx||d.ex).map(e=>({...e,extra:false}));
  const extras=getExtraExercises(di).map(e=>({...e,extra:true}));
  let mixed=[...origs,...extras];
  mixed=dedupeByDisplayName(mixed,di,getCyc().num,cw);
  mixed=applyExOrderByName(di,mixed);
  return mixed;
}

function isDayComplete(cn,w,di){
  const list=buildDayExList(di);
  if(list.length===0)return false;
  const all=getSets();
  const wk=PROG.weeks[w]||PROG.weeks[cw];
  let anyDone=false;
  for(let ei=0;ei<list.length;ei++){
    const k=sdk(cn,w,di,ei);
    if(getHiddenEx()[k])continue; // skrite ne štejejo
    const sets=all[k];
    if(!sets||sets.length===0)return false;
    // pričakovano št. serij — iz dejanske vaje na tej poziciji (ne iz mutiranega d.ex)
    const base=wk.dl?3:(list[ei].m?wk.sM:wk.sA);
    const n=Math.max(1,base+getExtraSets(k));
    const slice=sets.slice(0,n);
    if(slice.length===0||!slice.every(s=>s.done))return false;
    anyDone=true;
  }
  return anyDone;
}
// Ali so vsi dnevi tedna dokončani?
function isWeekComplete(cn,w){
  for(let di=0;di<PROG.days.length;di++){if(!isDayComplete(cn,w,di))return false;}
  return true;
}
// Posodobi barve tabov (zeleno = dokončano)
function updateTabColors(){
  const cn=getCyc().num;
  document.querySelectorAll('.wt').forEach((t,w)=>{
    t.classList.toggle('done',isWeekComplete(cn,w));
  });
  document.querySelectorAll('.dt').forEach((t,di)=>{
    t.classList.toggle('done',isDayComplete(cn,cw,di));
  });
}

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

function setWeek(w){if(stRun&&activeSessionContext&&w!==activeSessionContext.weekIdx){toast('Teden je med aktivno sesijo zaklenjen.','err');return;}cw=w;localStorage.setItem('wt_last_week',String(w));document.querySelectorAll('.wt').forEach((t,i)=>t.classList.toggle('active',i===w));showDay(cd);}

// Pomožna funkcija: aktivni ex array za dan (privzete + extra)
function getDayExercises(di){
  if(!PROG.days[di])return [];
  const extras=getExtraExercises(di);
  return [...PROG.days[di].ex, ...extras];
}

function showDay(idx){
  if(stRun&&activeSessionContext&&idx!==activeSessionContext.dayIdx){toast('Dan je med aktivno sesijo zaklenjen.','err');return;}
  cd=idx;
  localStorage.setItem('wt_last_day',String(idx));
  document.querySelectorAll('.dt').forEach((t,i)=>t.classList.toggle('active',i===idx));
  const d=PROG.days[idx],wk=PROG.weeks[cw],cyc=getCyc();
  // Shrani originalni seznam vaj ENKRAT (preden se d.ex kdaj prepiše z mixed)
  if(d._origEx===undefined)d._origEx=d.ex.slice();
  if(d._origLen===undefined)d._origLen=d._origEx.length;
  // Original vaje (vedno prisotne) + extra (uporabnikove) — vedno iz stabilnega vira
  let mixed=buildDayExList(idx);
  d.ex=mixed;
  const allEx=d.ex;
  const visIdx=allEx.map((_,i)=>i).filter(i=>!isExHidden(sdk(cyc.num,cw,idx,i)));
  const done=visIdx.filter(i=>allDone(idx,i)).length;
  const nk=`notes-c${cyc.num}w${cw}d${idx}`;
  const nv=getNotes()[nk]||'';
  let html=`<div class="day-title">${d.title}</div><div class="day-sub">${d.sub}</div><div class="tags">${d.tags.map(t=>`<span class="tag ${t.p?'tag-p':'tag-s'}">${t.t}</span>`).join('')}</div><div class="gym-target" id="gym-target">Gym mode: najprej začni session, potem logiraj naslednji set.</div>`;
  if(wk.dl){html+=`<div class="dbox">Deload teden — 60–65% teže iz tedna 1. Ustavi 4–5 pon. pred odpovedjo. Maks 3 serije.</div>`;}
  else{html+=`<div class="pg"><div class="pc"><div class="pn">${visIdx.length}</div><div class="pl-label">vaj</div></div><div class="pc"><div class="pn" id="ex-done">${done}</div><div class="pl-label">opravljenih</div></div><div class="pc"><div class="pn">${wk.reps}</div><div class="pl-label">ponovitve</div></div><div class="pc"><div class="pn">${wk.rpe}</div><div class="pl-label">intenzivnost</div></div></div>`;}
  html+=allEx.map((e,i)=>{
    const _ek=sdk(cyc.num,cw,idx,i);
    if(isExHidden(_ek))return '';
    return renderEx(e,i,idx,wk,cyc.num,!!e.extra);
  }).join('');
  // Koliko vaj je skritih za ta teden
  const cnHidden=Object.keys(getHiddenEx()).filter(k=>k.startsWith(`c${cyc.num}w${cw}d${idx}e`)).length;
  html+=`<div style="display:flex;gap:6px;margin-top:.75rem;flex-wrap:wrap;">
    <button class="sb" style="flex:1;background:var(--bg3);border:1px dashed var(--border2);" onclick="openAddExercise(${idx})">+ Dodaj vajo</button>
    ${cnHidden>0?`<button class="sb" style="flex:1;background:var(--bg3);border:1px solid var(--border2);color:var(--text3);" onclick="restoreHiddenWeek(${idx})">↩ Povrni ${cnHidden} odstranjenih</button>`:''}
  </div>`;
  document.getElementById('day-content').innerHTML=html;
  // Obnovi aktivni rest timer, če teče (re-render je uničil njegov UI)
  if(typeof restoreTimer==='function')restoreTimer();
  if(typeof updateTabColors==='function')updateTabColors();
  if(typeof refreshGymTarget==='function')refreshGymTarget();
  if(typeof renderTodayCard==='function')renderTodayCard();
}

// Vrstni red shranjen kot SEZNAM IMEN vaj per dan
function getExOrderNames(){try{return JSON.parse(localStorage.getItem('wt_ex_ordernames')||'{}');}catch{return {};}}
function saveExOrderNames(o){localStorage.setItem('wt_ex_ordernames',JSON.stringify(o));}

function applyExOrderByName(di,exArray){
  const orders=getExOrderNames();
  const order=orders[di];
  if(!order)return exArray;
  // Preuredi po imenu; vaje, ki niso v shranjenem vrstnem redu, gredo na konec
  const byName={};
  exArray.forEach(e=>{byName[e.n]=e;});
  const result=[];
  order.forEach(name=>{if(byName[name]){result.push(byName[name]);delete byName[name];}});
  // Dodaj preostale (nove, ki jih v shranjenem redu ni)
  exArray.forEach(e=>{if(byName[e.n]){result.push(e);delete byName[e.n];}});
  return result;
}

// Extra vaje — shranjene per dan, vidne v vseh ciklih in tednih
function getExtraExercises(di){
  try{const all=JSON.parse(localStorage.getItem('wt_extra_ex')||'{}');return all[di]||[];}
  catch{return [];}
}
function saveExtraExercises(di,arr){
  try{const all=JSON.parse(localStorage.getItem('wt_extra_ex')||'{}');
    all[di]=arr;localStorage.setItem('wt_extra_ex',JSON.stringify(all));
  }catch{}
}

// Popup za izbiro vaje iz baze
function openAddExercise(di){
  const popup=document.getElementById('add-ex-pop');
  popup.classList.add('on');
  popup.dataset.di=di;
  document.getElementById('add-ex-search').value='';
  renderAddExList('');
  setTimeout(()=>document.getElementById('add-ex-search').focus(),100);
}
function closeAddExercise(){document.getElementById('add-ex-pop').classList.remove('on');}

// ============== UREJEVALNIK PRETEKLIH PODATKOV ==============
function openDataEditor(){
  const cyc=getCyc();
  // Zagotovi _origLen za vse dni (da extra vaje pravilno ločimo)
  PROG.days.forEach(d=>{if(d._origLen===undefined)d._origLen=d.ex.length;});
  // Napolni cikle (1..trenutni)
  const cycSel=document.getElementById('de-cycle');
  cycSel.innerHTML='';
  for(let c=1;c<=cyc.num;c++){
    cycSel.innerHTML+=`<option value="${c}">Cikel ${c}</option>`;
  }
  cycSel.value=cyc.num;
  // Napolni dneve
  const daySel=document.getElementById('de-day');
  daySel.innerHTML=DAY_NAMES.map((n,i)=>`<option value="${i}">${n}</option>`).join('');
  daySel.value=cd;
  // Privzeti teden = trenutni
  document.getElementById('de-week').value=cw;
  renderDataEditor();
  document.getElementById('data-edit-pop').classList.add('on');
}
function closeDataEditor(){document.getElementById('data-edit-pop').classList.remove('on');}

function renderDataEditor(){
  const c=parseInt(document.getElementById('de-cycle').value);
  const w=parseInt(document.getElementById('de-week').value);
  const di=parseInt(document.getElementById('de-day').value);
  const el=document.getElementById('de-content');
  // Vaje tega dne v PRAVILNEM vrstnem redu (ujema exKey e0,e1... indekse).
  // d.ex vzdržuje showDay kot urejen mixed; dodamo morebitne manjkajoče extra.
  const mixed=dayListFor(di,c,w);
  const all=getSets();
  let html='';
  mixed.forEach((e,ei)=>{
    const key=sdk(c,w,di,ei);
    const sets=all[key]||[];
    const dispName=getSwappedName(key,e.n,e.extra);
    const hasData=sets.some(s=>s.kg||s.reps);
    html+=`<div style="background:var(--bg3);border-radius:8px;padding:8px;margin-bottom:8px;">
      <div style="font-size:13px;font-weight:600;margin-bottom:6px;color:${hasData?'var(--text)':'var(--text3)'};">${dispName}${e.extra?' <span style="font-size:10px;color:var(--blue-text);">+extra</span>':''}</div>`;
    if(sets.length===0){
      html+=`<div style="font-size:11px;color:var(--text3);">Ni setov.</div>`;
    } else {
      html+=`<table style="width:100%;font-size:12px;border-collapse:collapse;"><thead><tr style="color:var(--text3);font-size:10px;"><th style="text-align:left;padding:2px;">Set</th><th style="padding:2px;">Kg</th><th style="padding:2px;">Pon</th><th style="padding:2px;">✓</th></tr></thead><tbody>`;
      sets.forEach((s,si)=>{
        html+=`<tr>
          <td style="padding:2px;color:var(--text3);">${si+1}</td>
          <td style="padding:2px;"><input type="number" step="0.5" value="${s.kg||''}" id="de-${key}-${si}-kg" style="width:60px;padding:4px;background:var(--bg2);border:.5px solid var(--border);border-radius:4px;color:var(--text);text-align:center;font-size:12px;"></td>
          <td style="padding:2px;"><input type="number" value="${s.reps||''}" id="de-${key}-${si}-reps" style="width:50px;padding:4px;background:var(--bg2);border:.5px solid var(--border);border-radius:4px;color:var(--text);text-align:center;font-size:12px;"></td>
          <td style="padding:2px;text-align:center;"><input type="checkbox" ${s.done?'checked':''} id="de-${key}-${si}-done" style="width:16px;height:16px;"></td>
        </tr>`;
      });
      html+=`</tbody></table>`;
    }
    html+=`</div>`;
  });
  if(!html)html='<div style="font-size:12px;color:var(--text3);padding:1rem;text-align:center;">Ni vaj za ta dan.</div>';
  el.innerHTML=html;
  el.dataset.keys=JSON.stringify(mixed.map((e,ei)=>sdk(c,w,di,ei)));
}

function saveDataEditor(){
  const el=document.getElementById('de-content');
  const keys=JSON.parse(el.dataset.keys||'[]');
  const all=getSets();
  let changed=0;
  keys.forEach(key=>{
    if(!all[key])return;
    all[key].forEach((s,si)=>{
      const kgEl=document.getElementById(`de-${key}-${si}-kg`);
      const repsEl=document.getElementById(`de-${key}-${si}-reps`);
      const doneEl=document.getElementById(`de-${key}-${si}-done`);
      if(kgEl){
        const newKg=kgEl.value;
        const newReps=repsEl?repsEl.value:s.reps;
        const newDone=doneEl?doneEl.checked:s.done;
        if(String(s.kg)!==String(newKg)||String(s.reps)!==String(newReps)||s.done!==newDone){
          s.kg=newKg;s.reps=newReps;s.done=newDone;changed++;
        }
      }
    });
  });
  saveSets(all);
  toast(`✓ Shranjeno (${changed} sprememb)`,'ok');
  // Osveži prikaze
  if(typeof showDay==='function')showDay(cd);
}

function renderAddExList(query){
  const q=(query||'').toLowerCase().trim();
  const customs=getCustomExercises().map(c=>({n:c.n,m:c.muscle,c:c.cat,d:c.desc||'',custom:true}));
  const builtins=EXERCISE_DB.map(e=>({n:e.n,m:e.m,c:e.c,d:e.d,s:e.s,eq:e.eq,custom:false}));
  let all=[...customs,...builtins];
  if(q){all=all.filter(e=>e.n.toLowerCase().includes(q)||e.m.toLowerCase().includes(q)||(e.s&&e.s.toLowerCase().includes(q))||(e.eq&&e.eq.toLowerCase().includes(q)));}
  const list=document.getElementById('add-ex-list');
  if(all.length===0){list.innerHTML='<div style="color:var(--text3);font-size:12px;padding:.5rem;text-align:center;">Ni zadetkov.</div>';return;}
  list.innerHTML=all.slice(0,50).map(e=>{
    const star=e.custom?'⭐ ':'';
    const eqIcon={barbell:'🏋',dumbbell:'🔔',cable:'🔗',machine:'⚙',bodyweight:'🤸',other:''}[e.eq]||'';
    return `<div class="sw-item" onclick="confirmAddExercise('${e.n.replace(/'/g,"\\'")}','${e.m}',${e.custom||e.c==='compound'?1:0})">
      <div class="sw-item-name">${star}${eqIcon} ${e.n}</div>
      <div class="sw-item-note">${e.m}${e.s?' · '+e.s:''} · ${e.c==='compound'?'compound':'isolation'}</div>
    </div>`;
  }).join('');
}
function confirmAddExercise(name,muscle,isMain){
  const popup=document.getElementById('add-ex-pop');
  const di=parseInt(popup.dataset.di);
  if(isNaN(di))return;
  ensureDayLists();

  const all=getDayLists()||{};
  const arr=all[di]||[];
  const cN=getCyc().num;
  const wanted=String(name||'').trim().toLowerCase();
  const existingIdx=arr.findIndex(x=>{
    const shown=String(dispNameForItem(x,cN,cw)||'').trim().toLowerCase();
    const original=String(x.n0||'').trim().toLowerCase();
    return shown===wanted||original===wanted;
  });

  if(existingIdx>=0){
    const existing=arr[existingIdx];
    const exKey=sdk(cN,cw,di,existingIdx);
    const hidden=getHiddenEx();

    // Vaja je že v programu, vendar je bila odstranjena samo za ta teden.
    // Namesto napačnega opozorila jo ob izbiri preprosto povrni.
    if(hidden[exKey]){
      delete hidden[exKey];
      saveHiddenEx(hidden);
      closeAddExercise();
      showDay(di);
      toast('↩ Vaja povrnjena za ta teden','ok');
      return;
    }

    // Vaja je arhivirana v program builderju: ponovno jo aktiviraj.
    if(existing.programDisabled){
      existing.programDisabled=false;
      all[di]=arr;
      saveDayLists(all);
      closeAddExercise();
      showDay(di);
      toast('↩ Vaja ponovno aktivirana','ok');
      return;
    }

    toast('Ta vaja je že vidna na tem dnevu','err');
    return;
  }

  const db=EXERCISE_DB.find(x=>String(x.n).toLowerCase()===wanted);
  const custom=getCustomExercises().find(x=>String(x.n).toLowerCase()===wanted);
  const isCompound=(db&&db.c==='compound')||(custom&&custom.cat==='compound')||!!isMain;
  const desc=(db&&db.d)||(custom&&custom.desc)||`${muscle} — moja dodatna vaja`;
  const rest=isCompound?120:75;

  mutateDayList(di,list=>{
    list.push({id:_newExId(name),n0:name,m:!!isMain,r:rest,rl:rest+'s',d:desc,tip:'',extra:true,progMode:'auto'});
  });
  closeAddExercise();
  showDay(di);
  toast('✓ Vaja dodana','ok');
}
async function removeExtraExercise(di,localIdx){
  ensureDayLists();
  const arr=(getDayLists()||{})[di]||[];
  const extras=arr.filter(x=>x.extra);
  if(localIdx<0||localIdx>=extras.length){toast('Napaka pri odstranjevanju','err');return;}
  return removeExtraByName(di,extras[localIdx].n0);
}

// Zanesljivo briše po imenu — neodvisno od indeksov
async function removeExtraByName(di,name){
  if(!await uiConfirm(`Odstranim "${name}"? Vsi vneseni podatki bodo izgubljeni.`))return;
  ensureDayLists();
  const arr=(getDayLists()||{})[di]||[];
  const cN=getCyc().num;
  const it=arr.find(x=>x.extra&&(x.n0===name||dispNameForItem(x,cN,cw)===name));
  if(!it){toast('Vaja ni najdena','err');return;}
  mutateDayList(di,list=>{const i=list.findIndex(x=>x.id===it.id);if(i>=0)list.splice(i,1);});
  showDay(di);
  toast('✓ Odstranjena','ok');
}

// === VRSTNI RED VAJ — shranjen per dan (po imenih, glej applyExOrderByName) ===

function moveExUp(di,ei){
  if(ei===0){toast('Že na vrhu','err');return;}
  ensureDayLists();
  mutateDayList(di,list=>{if(ei>0&&ei<list.length)[list[ei-1],list[ei]]=[list[ei],list[ei-1]];});
  showDay(di);
}
function moveExDown(di,ei){
  ensureDayLists();
  const L=(getDayLists()||{})[di]||[];
  if(ei>=L.length-1){toast('Že na dnu','err');return;}
  mutateDayList(di,list=>{if(ei>=0&&ei<list.length-1)[list[ei],list[ei+1]]=[list[ei+1],list[ei]];});
  showDay(di);
}



// === P1 CORE: stable exercise IDs, gym mode, pain guard, session snapshots ===
function safeHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function slugifyP1(v){return String(v||'vaja').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'vaja';}
function exStableId(name){return 'ex_'+slugifyP1(name);}
function currentExerciseName(di,ei,key){const e=PROG.days[di]&&PROG.days[di].ex[ei];return getSwappedName(key,e?e.n:'Vaja',e&&e.extra);}
function getPain(key){const p=getPainData();return Number(p[key]&&p[key].level)||0;}
function setExPain(key,val,di,ei,cn){
  const level=Math.max(0,Math.min(10,parseInt(val)||0));
  const p=getPainData();
  if(level>0){p[key]={level,date:new Date().toISOString(),exerciseId:exStableId(currentExerciseName(di,ei,key)),exerciseName:currentExerciseName(di,ei,key),cycle:cn,week:cw+1,day:DAY_NAMES[di]};}
  else delete p[key];
  savePainData(p);
  const box=document.getElementById('pain-'+key);
  if(box){box.className='pain-box '+(level>=5?'danger':level>=3?'warn':'');const msg=box.querySelector('.pain-msg');if(msg)msg.textContent=painMessage(level,currentExerciseName(di,ei,key));}
  if(level>=5)toast('Bolečina 5+ — danes ne lovi PR-ja. Zamenjaj ali zmanjšaj.', 'err');
  else if(level>=3)toast('Bolečina 3–4 — zmanjšaj intenzivnost/volumen.', 'err');
  else if(level>0)toast('Bolečina zabeležena', 'ok');
}
function painMessage(level,name){
  if(level>=5)return '5+ / 10: stop za PR-je. Zamenjaj vajo ali zmanjšaj ROM/težo.';
  if(level>=3)return '3–4 / 10: ohrani tehniko, brez grinderjev, manj volumen/intenzivnost.';
  if(level>0)return '1–2 / 10: spremljaj. Če se stopnjuje, prekini težke sete.';
  if(/deadlift|rdl|romanian|squat|leg curl|hamstring|good morning|lunge|bulgarian|hip thrust/i.test(name||''))return '0 / 10: OK. Če se pojavi bolečina, jo zabeleži pred naslednjim setom.';
  return '0 / 10';
}
function renderPainBox(key,name,di,ei,cn){
  const level=getPain(key);
  const cls=level>=5?'danger':level>=3?'warn':'';
  const opts=Array.from({length:11},(_,i)=>`<option value="${i}" ${i===level?'selected':''}>${i}</option>`).join('');
  return `<div class="pain-box ${cls}" id="pain-${key}"><span>🩹 Bolečina</span><select onchange="setExPain('${key}',this.value,${di},${ei},${cn})">${opts}</select><span class="pain-msg">${safeHtml(painMessage(level,name))}</span></div>`;
}
function getGymMode(){return localStorage.getItem('wt_gym_mode')==='1';}
function setGymMode(on){
  localStorage.setItem('wt_gym_mode',on?'1':'0');
  document.documentElement.classList.toggle('gym-mode',!!on);document.body.classList.toggle('gym-mode',!!on);
  const b=document.getElementById('gym-mode-btn');if(b){b.classList.toggle('gym-on',!!on);b.textContent=on?'Izhod iz fokusa':'Gym mode';}
  refreshGymTarget();
}
function toggleGymMode(){setGymMode(!getGymMode());}
function isActiveGymEx(key){return localStorage.getItem('wt_active_ex')===key;}
function isExercisePending(key){
  const m=String(key).match(/^c(\d+)w(\d+)d(\d+)e(\d+)$/);if(!m)return false;
  const w=+m[2],di=+m[3],ei=+m[4],all=getSets();
  if(!PROG.days[di]||!PROG.days[di].ex[ei]||isExHidden(key))return false;
  const n=nsf(di,ei,PROG.weeks[w],key),sets=all[key]||[];
  return !sets.slice(0,n).every(s=>s&&s.done);
}
function visibleExerciseKeys(){return Array.from(document.querySelectorAll('#day-content .exc')).map(c=>c.id.replace(/^ec-/,''));}
function findNextPendingExerciseKey(){
  const cn=getCyc().num,di=cd,w=cw,all=getSets(),exs=(PROG.days[di]&&PROG.days[di].ex)||[];
  for(let ei=0;ei<exs.length;ei++){const key=sdk(cn,w,di,ei);if(isExHidden(key))continue;const n=nsf(di,ei,PROG.weeks[w],key),sets=all[key]||[];if(!sets.slice(0,n).every(s=>s&&s.done))return key;}
  return '';
}
function setGymFocus(key,scroll=true){
  if(!key)return;localStorage.setItem('wt_active_ex',key);
  document.querySelectorAll('.exc.active-ex').forEach(x=>x.classList.remove('active-ex'));
  const c=document.getElementById('ec-'+key);if(c)c.classList.add('active-ex');
  updateGymFocusBar(key);
  if(scroll&&c)setTimeout(()=>c.scrollIntoView({behavior:'smooth',block:'start'}),50);
}
function moveGymFocus(dir){
  const keys=visibleExerciseKeys();if(!keys.length)return;
  const cur=localStorage.getItem('wt_active_ex');let i=keys.indexOf(cur);if(i<0)i=0;
  i=Math.max(0,Math.min(keys.length-1,i+dir));setGymFocus(keys[i],true);
}
function updateGymFocusBar(key){
  const nameEl=document.getElementById('gym-focus-name'),metaEl=document.getElementById('gym-focus-meta');if(!nameEl||!metaEl)return;
  const m=String(key||'').match(/^c(\d+)w(\d+)d(\d+)e(\d+)$/);if(!m){nameEl.textContent='Trening zaključen';metaEl.textContent='Vse serije so opravljene';return;}
  const di=+m[3],ei=+m[4],name=currentExerciseName(di,ei,key),sets=(getSets()[key]||[]),n=nsf(di,ei,PROG.weeks[+m[2]],key),done=sets.slice(0,n).filter(x=>x&&x.done).length;
  nameEl.textContent=name;metaEl.textContent=`${done}/${n} serij · podrsaj ali uporabi puščici`;
}
function refreshGymTarget(){
  let next=localStorage.getItem('wt_active_ex');
  const onCurrentDay=next&&new RegExp(`^c${getCyc().num}w${cw}d${cd}e\\d+$`).test(next);
  if(!onCurrentDay||!isExercisePending(next))next=findNextPendingExerciseKey();
  if(next)setGymFocus(next,false);else{localStorage.removeItem('wt_active_ex');document.querySelectorAll('.exc.active-ex').forEach(x=>x.classList.remove('active-ex'));updateGymFocusBar('');}
  const gt=document.getElementById('gym-target');
  if(gt){
    if(!getGymMode())gt.textContent='Gym mode pokaže samo aktivno vajo, večje kontrole in naslednji set.';
    else if(next){const m=String(next).match(/d(\d+)e(\d+)$/),nm=m?currentExerciseName(+m[1],+m[2],next):'Naslednja vaja';gt.innerHTML=`🎯 Aktivno: <strong>${safeHtml(nm)}</strong>`;}
    else gt.textContent='Vse vaje za ta dan so zaključene.';
  }
}
function buildImmutableSessionRecord(start,end,durMin,ctx){
  const c=ctx||{};
  const cn=Number(c.cycle)||getCyc().num, w=Number.isInteger(c.weekIdx)?c.weekIdx:cw, di=Number.isInteger(c.dayIdx)?c.dayIdx:cd;
  const profile=c.profile||getActiveProfile();
  const snap=buildSessionSnapshot(cn,w,di);
  return {
    schemaVersion:4,
    id:'sess_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),
    date:start.toISOString().split('T')[0],
    startISO:start.toISOString(),endISO:end.toISOString(),
    dayName:DAY_NAMES[di],dayIdx:di,weekNum:w+1,weekIdx:w,cycle:cn,profile,
    startTime:start.toLocaleTimeString('sl-SI',{hour:'2-digit',minute:'2-digit'}),
    endTime:end.toLocaleTimeString('sl-SI',{hour:'2-digit',minute:'2-digit'}),
    durationMin:durMin,
    totals:snap.totals,
    exercises:snap.exercises,
    snapshotLocked:true
  };
}
function buildSessionSnapshot(cn,w,di){
  const all=getSets(),exs=(PROG.days[di]&&PROG.days[di].ex)||[];
  const exercises=[];let totalSets=0,totalDone=0,totalTonnage=0,maxPain=0;
  exs.forEach((e,ei)=>{
    const key=sdk(cn,w,di,ei); if(isExHidden(key))return;
    const name=getSwappedName(key,e.n,e.extra);
    const n=nsf(di,ei,PROG.weeks[w],key);
    const raw=(all[key]||[]).slice(0,n);
    const pain=getPain(key);maxPain=Math.max(maxPain,pain);
    const sets=raw.map((s,si)=>{
      const kg=parseFloat(s.kg)||0,reps=parseInt(s.reps)||0,vol=kg*reps;
      totalSets++; if(s.done)totalDone++; totalTonnage+=s.done?vol:0;
      return {set:si+1,kg:s.kg||'',reps:s.reps||'',rpe:s.rpe||null,done:!!s.done,drop:!!s.drop,note:s.note||'',volume:vol,exerciseId:s.exerciseId||exStableId(name),exName:s.exName||name};
    });
    exercises.push({key,exerciseId:exStableId(name),name,originalName:e.n||name,isExtra:!!e.extra,isMain:!!e.m,targetSets:n,targetReps:(PROG.weeks[w]||{}).reps||'',pain,sets});
  });
  return {exercises,totals:{sets:totalSets,doneSets:totalDone,tonnage:Math.round(totalTonnage),maxPain}};
}
function getSuggestedDayIndex(){
  const sessions=getSessions();if(!sessions.length)return 0;
  const last=sessions[0],i=DAY_NAMES.indexOf(last.dayName);return i<0?0:(i+1)%DAY_NAMES.length;
}
function getLastSessionForDay(di){return getSessions().find(x=>x.dayIdx===di||x.dayName===DAY_NAMES[di])||null;}
function getMainSuggestionForDay(di){
  const d=PROG.days[di];if(!d)return null;const ei=d.ex.findIndex(e=>e.m);if(ei<0)return null;
  const cn=getCyc().num,key=sdk(cn,cw,di,ei),name=currentExerciseName(di,ei,key);
  const sets=getSets()[key]||[];let kg=Math.max(0,...sets.map(x=>parseFloat(x.kg)||0));
  if(!kg){const last=getLastSession(di,ei,cn,cw);kg=last?parseFloat(last.kg)||0:0;}
  return {name,kg};
}
function renderTodayCard(){
  const el=document.getElementById('today-card');if(!el||!PROG.days[cd])return;
  const suggested=getSuggestedDayIndex(),last=getLastSessionForDay(cd),main=getMainSuggestionForDay(cd),isSuggested=suggested===cd;
  const lastTxt=last?`Zadnjič ${last.date}: ${last.durationMin||'?'} min`:'Ta trening še nima session zgodovine';
  const mainTxt=main&&main.kg?`${main.name}: izhodišče ${main.kg} kg`:main?main.name:'';
  el.innerHTML=`<div class="today-card-grid"><div><div class="today-eyebrow">${isSuggested?'Predlagan naslednji trening':'Izbran trening'}</div><div class="today-title">${safeHtml(PROG.days[cd].title)} · Teden ${cw+1}</div><div class="today-meta">${safeHtml(lastTxt)}${mainTxt?'<br>'+safeHtml(mainTxt):''}</div></div><button class="today-action" onclick="startTodayWorkout()">${stRun?'Nadaljuj':'Začni trening'}</button></div><div class="today-secondary"><span>Cikel ${getCyc().num} · ${getActiveProfile()==='bulk'?'Bulk 5/3/1':'Cut PPL'}</span>${!isSuggested?`<button class="sb" onclick="openSuggestedWorkout(${suggested})" style="padding:4px 9px;">Predlog: ${safeHtml(DAY_NAMES[suggested])}</button>`:''}</div>`;
}
function openSuggestedWorkout(di){showDay(di);renderTodayCard();}
function startTodayWorkout(){
  if(!stRun)toggleSess();setGymMode(true);refreshGymTarget();scrollToActiveEx();
}
function maybeShowOnboarding(){if(!localStorage.getItem('wt_onboarding_done'))document.getElementById('onboarding-pop')?.classList.add('on');}
function finishOnboarding(profile){
  localStorage.setItem('wt_onboarding_done','1');document.getElementById('onboarding-pop')?.classList.remove('on');
  if(profile&&profile!==getActiveProfile()){setActiveProfile(profile);PROG=profile==='bulk'?PROG_BULK:PROG_CUT;cw=0;cd=0;ensureDayLists();showDay(0);}
  if(profile==='bulk')toast('Bulk izbran — v Nastavitvah vnesi svoje 1RM-je.','ok');else toast('Program pripravljen. Začni prvi trening.','ok');
}
function initP1(){setGymMode(getGymMode());migrateSetExerciseIds();renderTodayCard();}
function migrateSetExerciseIds(){
  const all=getSets();let changed=false;
  Object.keys(all).forEach(k=>{const m=k.match(/^c(\d+)w(\d+)d(\d+)e(\d+)$/);if(!m)return;const di=+m[3],ei=+m[4];const e=PROG.days[di]&&PROG.days[di].ex[ei];const nm=e?e.n:'Vaja';(all[k]||[]).forEach(s=>{if(s&&!s.exerciseId){s.exerciseId=exStableId(s.exName||nm);changed=true;}});});
  if(changed)saveSets(all);
}
function plainImportedText(v,max=5000){return String(v??'').replace(/[<>\u0000]/g,'').slice(0,max);}
function sanitizeImported(value,depth=0){
  if(depth>12)return null;if(typeof value==='string')return plainImportedText(value);
  if(Array.isArray(value))return value.slice(0,50000).map(v=>sanitizeImported(v,depth+1));
  if(value&&typeof value==='object'){const out={};Object.entries(value).slice(0,50000).forEach(([k,v])=>{out[plainImportedText(k,180)]=sanitizeImported(v,depth+1);});return out;}
  return value;
}
function validateBackupP1(backup){
  if(!backup||typeof backup!=='object'||Array.isArray(backup))return {ok:false,msg:'Datoteka ni veljaven JSON objekt.'};
  if(!backup.sets||typeof backup.sets!=='object'||Array.isArray(backup.sets))return {ok:false,msg:'Backup ne vsebuje sets podatkov.'};
  if(backup.sessions!==undefined&&!Array.isArray(backup.sessions))return {ok:false,msg:'sessions mora biti seznam.'};
  if(Number(backup.schemaVersion||backup.version||1)>5)return {ok:false,msg:'Backup je iz novejše verzije aplikacije.'};
  let rows=0;
  for(const [k,v] of Object.entries(backup.sets)){
    if(!/^c\d+w\d+d\d+e\d+$/.test(k)||!Array.isArray(v))return {ok:false,msg:'Pokvarjen ključ setov: '+k};
    rows+=v.length;if(rows>250000)return {ok:false,msg:'Backup vsebuje nenormalno veliko setov.'};
    for(const set of v){if(!set||typeof set!=='object'||Array.isArray(set))return {ok:false,msg:'Neveljaven zapis seta.'};const kg=parseFloat(set.kg||0),reps=parseInt(set.reps||0);if(kg<0||kg>1500||reps<0||reps>1000)return {ok:false,msg:'Backup vsebuje nerealne kg ali ponovitve.'};}
  }
  if(Array.isArray(backup.sessions)&&backup.sessions.length>100000)return {ok:false,msg:'Preveč session zapisov.'};
  return {ok:true,msg:'OK'};
}
function backupSummaryP1(backup){
  const setKeys=backup.sets?Object.keys(backup.sets).length:0,setRows=backup.sets?Object.values(backup.sets).reduce((a,v)=>a+(Array.isArray(v)?v.length:0),0):0,sess=Array.isArray(backup.sessions)?backup.sessions.length:0,bw=backup.bw?Object.keys(backup.bw).length:0,pain=backup.pain?Object.keys(backup.pain).length:0,bd=backup.date?String(backup.date).split('T')[0]:'neznan datum',bv=backup.schemaVersion||backup.version||'?';
  return `Backup ${bd} · shema ${bv}\n${sess} sessionov · ${setKeys} vaj / ${setRows} setov · ${bw} meritev teže · ${pain} zapisov bolečine\n\nZamenjaj vse = popolna obnova. Združi = uvoženi zapisi dopolnijo trenutno bazo.`;
}
function mergeObj(current,incoming){return {...(current&&typeof current==='object'?current:{}),...(incoming&&typeof incoming==='object'?incoming:{})};}
function mergeSessions(current,incoming){
  const map=new Map();[...(current||[]),...(incoming||[])].forEach(x=>{if(!x||typeof x!=='object')return;const k=x.id||[x.date,x.dayName,x.startISO||x.startTime,x.durationMin].join('|');map.set(k,x);});
  return [...map.values()].sort((a,b)=>String(b.startISO||b.date||'').localeCompare(String(a.startISO||a.date||'')));
}
const MANAGED_LOCAL_KEYS=[...Object.values(LS),'wt_sugs6','wt_bwgoal','wt_alarm6','wt_collars_kg','wt_exswap','wt_extra_ex','wt_hidden_ex','wt_daylist_cut','wt_daylist_bulk','wt_ex_ordernames','wt_rep_prs','wt_phases','wt_profile','wt_531tm','wt_531offset','wt_goals','wt_daylog','wt_custom_ex','wt_kg_step','wt_reps_step','wt_colors','wt_custom_rest','wt_compact','wt_gym_mode','wt_active_ex','wt_active_timer'];
function clearManagedData(){MANAGED_LOCAL_KEYS.forEach(k=>localStorage.removeItem(k));}
async function restoreBackupObjectP1(rawBackup,opts={}){
  const checked=validateBackupP1(rawBackup);if(!checked.ok)throw new Error(checked.msg);
  const backup=sanitizeImported(rawBackup),mode=opts.mode||'replace';
  if(mode==='replace')clearManagedData();
  const putObj=(key,val,getter)=>{if(val===undefined)return;const next=mode==='merge'?mergeObj(getter(),val):val;lss(key,next);};
  putObj(LS.sets,backup.sets,getSets);putObj(LS.pr,backup.pr||{},getPRs);putObj(LS.notes,backup.notes||{},getNotes);putObj(LS.bw,backup.bw||{},getBW);putObj(LS.meas,backup.meas||{},getMeas);putObj(LS.gym,backup.gym||{},getGym);putObj(LS.pain,backup.pain||{},getPainData);putObj(LS.cynotes,backup.cynotes||{},getCyNotes);putObj(LS.restplan,backup.restplan||{},getRestPlan);putObj(LS.setcounts,backup.setcounts||{},getSetCounts);
  if(backup.cycle){const cur=getCyc(),inc=backup.cycle;saveCyc(mode==='merge'?{num:Math.max(cur.num||1,inc.num||1),startDates:mergeObj(cur.startDates,inc.startDates)}:inc);}
  if(mode==='merge')saveSessions(mergeSessions(getSessions(),backup.sessions||[]));else saveSessions(Array.isArray(backup.sessions)?backup.sessions:[]);
  const setRaw=(k,v,merge=false)=>{if(v===undefined)return;if(merge){let cur={};try{cur=JSON.parse(localStorage.getItem(k)||'{}');}catch(e){}localStorage.setItem(k,JSON.stringify(mergeObj(cur,v)));}else localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));};
  if(backup.bwgoal!==undefined)localStorage.setItem('wt_bwgoal',String(backup.bwgoal));
  let importedTheme=backup.theme;if(importedTheme==='"dark"'||importedTheme==='"light"'){try{importedTheme=JSON.parse(importedTheme);}catch(e){}}if(importedTheme==='dark'||importedTheme==='light')localStorage.setItem(LS.theme,importedTheme);
  if(backup.alarm)saveAlarmSettings(backup.alarm);if(backup.collars!==undefined)setCollars(backup.collars);
  setRaw('wt_exswap',backup.swaps,mode==='merge');setRaw('wt_extra_ex',backup.extra_ex,mode==='merge');setRaw('wt_hidden_ex',backup.hidden_ex,mode==='merge');setRaw('wt_ex_ordernames',backup.ex_ordernames,mode==='merge');setRaw('wt_rep_prs',backup.rep_prs,mode==='merge');
  if(backup.daylists){if(backup.daylists.cut)setRaw('wt_daylist_cut',backup.daylists.cut);if(backup.daylists.bulk)setRaw('wt_daylist_bulk',backup.daylists.bulk);}
  if(backup.phases)setRaw('wt_phases',backup.phases);if(backup.profile)setRaw('wt_profile',backup.profile);if(backup.tm531)setRaw('wt_531tm',backup.tm531);if(backup.offset531!==undefined)setRaw('wt_531offset',String(backup.offset531));if(backup.goals)setRaw('wt_goals',backup.goals);if(backup.daylog)setRaw('wt_daylog',backup.daylog,mode==='merge');if(backup.custom_ex)setRaw(CUST_KEY,backup.custom_ex);if(backup.kg_step)setRaw('wt_kg_step',String(backup.kg_step));if(backup.reps_step)setRaw('wt_reps_step',String(backup.reps_step));if(backup.sugs)setRaw('wt_sugs6',backup.sugs);if(backup.colors)setRaw('wt_colors',backup.colors);if(backup.custom_rest)setRaw('wt_custom_rest',backup.custom_rest);if(backup.compact!==undefined)setRaw('wt_compact',backup.compact?'1':'0');if(backup.gym_mode!==undefined)setRaw('wt_gym_mode',backup.gym_mode?'1':'0');
  if(opts.photos&&Array.isArray(backup.photos)&&backup.photos.length>0&&await uiConfirm(`Backup vsebuje ${backup.photos.length} fotografij. ${mode==='replace'?'Zamenjam':'Dodam'} tudi fotografije?`)){
    const db=await openPhotoDB();if(mode==='replace')await new Promise(res=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).clear();tx.oncomplete=res;});for(const p of backup.photos){if(p&&p.blob)await new Promise(res=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).add({date:p.date||new Date().toISOString(),blob:p.blob});tx.oncomplete=res;});}
  }
  PROG=getActiveProfile()==='bulk'?PROG_BULK:PROG_CUT;try{ensureDayLists();}catch(e){}initTheme();applyAllColors();initBWGoal();cw=0;cd=0;localStorage.setItem('wt_last_week','0');localStorage.setItem('wt_last_day','0');localStorage.removeItem('wt_active_ex');localStorage.removeItem('wt_active_timer');document.querySelectorAll('.wt').forEach((t,i)=>t.classList.toggle('active',i===0));showPage('workout');showDay(0);initP1();
}

/* =========================
   WORKOUT TRACKER V6 EXTENSION
   ========================= */
const V6_KEYS={
  settings:'wt_v6_settings',restLog:'wt_rest_log_v6',draft:'wt_session_draft_v6',
  metaCut:'wt_program_meta_cut',metaBulk:'wt_program_meta_bulk',lastExternal:'wt_last_external_backup_v6'
};
const V6_DEFAULTS={progression:true,smartRest:true,restWarning:true,rpeUp:8.5,rpeDown:9.5,completionUp:90,painStop:4};
function getV6Settings(){try{return {...V6_DEFAULTS,...JSON.parse(localStorage.getItem(V6_KEYS.settings)||'{}')};}catch{return {...V6_DEFAULTS};}}
function saveV6Settings(s){localStorage.setItem(V6_KEYS.settings,JSON.stringify({...V6_DEFAULTS,...s}));}
function toggleV6Setting(k){const s=getV6Settings();s[k]=!s[k];saveV6Settings(s);renderV6Settings();if(cd!==undefined)showDay(cd);}
function saveProgressionSettingsV6(){const s=getV6Settings();
  s.rpeUp=Math.max(6,Math.min(10,parseFloat(document.getElementById('v6-rpe-up')?.value)||8.5));
  s.rpeDown=Math.max(7,Math.min(10,parseFloat(document.getElementById('v6-rpe-down')?.value)||9.5));
  s.completionUp=Math.max(50,Math.min(100,parseInt(document.getElementById('v6-completion-up')?.value)||90));
  s.painStop=Math.max(1,Math.min(10,parseInt(document.getElementById('v6-pain-stop')?.value)||4));
  saveV6Settings(s);toast('✓ Pravila shranjena','ok');if(cd!==undefined)showDay(cd);
}
function renderV6Settings(){const s=getV6Settings();
  [['v6-prog-toggle','progression'],['v6-rest-toggle','smartRest'],['v6-rest-warn-toggle','restWarning']].forEach(([id,k])=>document.getElementById(id)?.classList.toggle('on',!!s[k]));
  const vals={'v6-rpe-up':s.rpeUp,'v6-rpe-down':s.rpeDown,'v6-completion-up':s.completionUp,'v6-pain-stop':s.painStop};Object.entries(vals).forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.value=v;});
  const log=getRestLogV6(),sum=document.getElementById('v6-rest-summary');if(sum){const last=log.slice(-20),avg=last.length?Math.round(last.reduce((a,b)=>a+(b.actualSec||0),0)/last.length):0;sum.textContent=last.length?`Zadnjih ${last.length} odmorov · povprečno ${fmtRest(avg)}`:'Po prvih setih bo prikazana statistika dejanskega počitka.';}
}

/* ---------- Program metadata and active days ---------- */
function programMetaKeyV6(profile){return profile==='bulk'?V6_KEYS.metaBulk:V6_KEYS.metaCut;}
function defaultProgramMetaV6(profile){const base=profile==='bulk'?PROG_BULK:PROG_CUT;return {version:1,days:base.days.map((d,i)=>({name:['Push A','Pull A','Noge','Push B','Pull B'][i]||`Dan ${i+1}`,title:d.title,sub:d.sub||'',active:true}))};}
function getProgramMetaV6(profile=getActiveProfile()){const def=defaultProgramMetaV6(profile);try{const raw=JSON.parse(localStorage.getItem(programMetaKeyV6(profile))||'null');if(!raw||!Array.isArray(raw.days))return def;return {version:1,days:raw.days.map((d,i)=>({...def.days[i],...d}))};}catch{return def;}}
function saveProgramMetaV6(meta,profile=getActiveProfile()){localStorage.setItem(programMetaKeyV6(profile),JSON.stringify(meta));}
function activeDayIndicesV6(){const m=getProgramMetaV6();return m.days.map((d,i)=>d.active===false?null:i).filter(i=>i!==null);}
function applyProgramStateV6(profile=getActiveProfile()){
  const base=profile==='bulk'?PROG_BULK:PROG_CUT,meta=getProgramMetaV6(profile);
  while(base.days.length<meta.days.length)base.days.push({title:`Dan ${base.days.length+1}`,sub:'',tags:[],ex:[]});
  meta.days.forEach((m,i)=>{if(!base.days[i])base.days[i]={title:m.title||`Dan ${i+1}`,sub:m.sub||'',tags:[],ex:[]};base.days[i].title=m.title||m.name||`Dan ${i+1}`;base.days[i].sub=m.sub||'';base.days[i].active=m.active!==false;if(!Array.isArray(base.days[i].tags))base.days[i].tags=[];if(!Array.isArray(base.days[i].ex))base.days[i].ex=[];});
  PROG=base;DAY_NAMES.length=meta.days.length;meta.days.forEach((m,i)=>DAY_NAMES[i]=m.name||`Dan ${i+1}`);
  try{const all=getDayLists();if(all){let ch=false;meta.days.forEach((_,i)=>{if(!Array.isArray(all[i])){all[i]=[];ch=true;}});if(ch)saveDayLists(all);}}catch(e){}
}
function renderDayTabsV6(){const tabs=document.querySelector('.dtabs');if(!tabs)return;const meta=getProgramMetaV6(),active=meta.days.filter(d=>d.active!==false).length||1;tabs.style.gridTemplateColumns=`repeat(${Math.min(active,7)},1fr)`;tabs.innerHTML=meta.days.map((d,i)=>`<div class="dt${i===cd?' active':''}${d.active===false?' v6-hidden-day':''}" onclick="showDay(${i})"><div class="dt-n">Dan ${i+1}</div><div class="dt-l">${safeHtml(d.name||`Dan ${i+1}`)}</div></div>`).join('');updateTabColors();}
const _isWeekCompleteV5=isWeekComplete;
isWeekComplete=function(cn,w){const ids=activeDayIndicesV6();if(!ids.length)return false;return ids.every(di=>isDayComplete(cn,w,di));};
getSuggestedDayIndex=function(){const active=activeDayIndicesV6();if(!active.length)return 0;const sessions=getSessions();if(!sessions.length)return active[0];const last=sessions[0],i=typeof last.dayIdx==='number'?last.dayIdx:DAY_NAMES.indexOf(last.dayName),pos=active.indexOf(i);return active[(pos<0?0:pos+1)%active.length];};

/* ---------- Program builder ---------- */
let v6BuilderDay=0;
async function openProgramBuilderV6(){if(stRun){toast('Program med aktivno sesijo ostane zaklenjen.','err');return;}await autoBackupToIDB();applyProgramStateV6();ensureDayLists();v6BuilderDay=activeDayIndicesV6()[0]??0;document.getElementById('v6-builder-pop').classList.add('on');renderProgramBuilderV6();}
function closeProgramBuilderV6(){document.getElementById('v6-builder-pop').classList.remove('on');applyProgramStateV6();renderDayTabsV6();showDay(activeDayIndicesV6().includes(cd)?cd:(activeDayIndicesV6()[0]||0));}
function renderProgramBuilderV6(){applyProgramStateV6();ensureDayLists();const meta=getProgramMetaV6(),prof=getActiveProfile();document.getElementById('v6-builder-profile').textContent=prof==='bulk'?'Bulk':'Cut';const days=document.getElementById('v6-builder-days');days.innerHTML=meta.days.map((d,i)=>`<button class="v6-builder-day${i===v6BuilderDay?' active':''}${d.active===false?' off':''}" onclick="v6BuilderDay=${i};renderProgramBuilderV6()">${safeHtml(d.name||`Dan ${i+1}`)}${d.active===false?' · off':''}</button>`).join('');renderProgramBuilderDayV6(v6BuilderDay);}
function renderProgramBuilderDayV6(di){const meta=getProgramMetaV6(),d=meta.days[di];if(!d)return;const all=getDayLists()||{},list=all[di]||[],opts=[...new Set([...EXERCISE_DB.map(x=>x.n),...getCustomExercises().map(x=>x.n)])].sort((a,b)=>a.localeCompare(b)).map(n=>`<option value="${safeHtml(n)}"></option>`).join('');
  const exHtml=list.map((it,i)=>{const nm=dispNameForItem(it,getCyc().num,cw),off=!!it.programDisabled;return `<div class="v6-ex-edit${off?' off':''}"><div class="v6-ex-edit-head"><div class="v6-ex-edit-name">${safeHtml(nm)}</div><button class="v6-mini-btn" onclick="moveBuilderExerciseV6(${di},${i},-1)">↑</button><button class="v6-mini-btn" onclick="moveBuilderExerciseV6(${di},${i},1)">↓</button><button class="v6-mini-btn" onclick="toggleBuilderExerciseV6(${di},${i})">${off?'↺':'×'}</button></div><div class="v6-builder-grid">
    <div class="v6-builder-field full"><label>Ime vaje</label><input value="${safeHtml(nm)}" onchange="updateBuilderExerciseV6(${di},${i},'name',this.value)"></div>
    <div class="v6-builder-field"><label>Vloga</label><select onchange="updateBuilderExerciseV6(${di},${i},'main',this.value)"><option value="0" ${!it.m?'selected':''}>Pomožna</option><option value="1" ${it.m?'selected':''}>Glavna</option></select></div>
    <div class="v6-builder-field"><label>Način progresije</label><select onchange="updateBuilderExerciseV6(${di},${i},'progMode',this.value)"><option value="auto" ${(it.progMode||'auto')==='auto'?'selected':''}>Pametno</option><option value="linear" ${it.progMode==='linear'?'selected':''}>Linearno</option><option value="double" ${it.progMode==='double'?'selected':''}>Double progression</option><option value="hold" ${it.progMode==='hold'?'selected':''}>Brez sprememb</option></select></div>
    <div class="v6-builder-field"><label>Ciljni seti</label><input type="number" min="1" max="12" value="${it.targetSets||''}" placeholder="program" onchange="updateBuilderExerciseV6(${di},${i},'targetSets',this.value)"></div>
    <div class="v6-builder-field"><label>Ciljne ponovitve</label><input value="${safeHtml(it.targetReps||'')}" placeholder="npr. 6–8" onchange="updateBuilderExerciseV6(${di},${i},'targetReps',this.value)"></div>
    <div class="v6-builder-field"><label>Ciljni RPE</label><input type="number" min="5" max="10" step="0.5" value="${it.targetRpe||''}" placeholder="8" onchange="updateBuilderExerciseV6(${di},${i},'targetRpe',this.value)"></div>
    <div class="v6-builder-field"><label>Počitek (sek)</label><input type="number" min="30" max="600" step="15" value="${it.r||90}" onchange="updateBuilderExerciseV6(${di},${i},'rest',this.value)"></div>
    <div class="v6-builder-field"><label>Korak kg</label><input type="number" min="0.25" max="20" step="0.25" value="${it.increment||''}" placeholder="samodejno" onchange="updateBuilderExerciseV6(${di},${i},'increment',this.value)"></div>
    <div class="v6-builder-field full"><label>Navodilo</label><textarea rows="2" onchange="updateBuilderExerciseV6(${di},${i},'desc',this.value)">${safeHtml(it.d||'')}</textarea></div>
  </div></div>`;}).join('');
  document.getElementById('v6-builder-content').innerHTML=`<div class="v6-builder-grid"><div class="v6-builder-field"><label>Ime dneva</label><input value="${safeHtml(d.name||'')}" onchange="updateProgramDayV6(${di},'name',this.value)"></div><div class="v6-builder-field"><label>Status</label><select onchange="updateProgramDayV6(${di},'active',this.value)"><option value="1" ${d.active!==false?'selected':''}>Aktiven</option><option value="0" ${d.active===false?'selected':''}>Arhiviran</option></select></div><div class="v6-builder-field full"><label>Naslov</label><input value="${safeHtml(d.title||'')}" onchange="updateProgramDayV6(${di},'title',this.value)"></div><div class="v6-builder-field full"><label>Opis dneva</label><input value="${safeHtml(d.sub||'')}" onchange="updateProgramDayV6(${di},'sub',this.value)"></div></div><div class="sl" style="margin-top:.5rem;">Vaje</div>${exHtml||'<div style="font-size:12px;color:var(--text3);padding:.5rem;">Dan je prazen.</div>'}<div class="v6-ex-edit"><div class="v6-builder-field"><label>Dodaj vajo</label><input id="v6-add-ex-name" list="v6-ex-options" placeholder="Vpiši ali izberi vajo"><datalist id="v6-ex-options">${opts}</datalist></div><div class="v6-builder-actions"><button class="sb" onclick="addBuilderExerciseV6(${di})">+ Dodaj vajo</button><button class="sb" onclick="duplicateProgramDayV6(${di})" style="background:var(--bg3);">Podvoji dan</button></div></div>`;
}
function updateProgramDayV6(di,field,value){const m=getProgramMetaV6();if(!m.days[di])return;if(field==='active')m.days[di].active=value==='1';else m.days[di][field]=plainImportedText(value,120);if(!m.days.some(d=>d.active!==false)){m.days[di].active=true;toast('Vsaj en dan mora ostati aktiven.','err');}saveProgramMetaV6(m);applyProgramStateV6();renderProgramBuilderV6();}
async function addProgramDayV6(){const m=getProgramMetaV6();if(m.days.length>=7){toast('Največ 7 programskih dni.','err');return;}m.days.push({name:`Dan ${m.days.length+1}`,title:`Nov trening ${m.days.length+1}`,sub:'',active:true});saveProgramMetaV6(m);applyProgramStateV6();const all=getDayLists()||{};all[m.days.length-1]=[];saveDayLists(all);v6BuilderDay=m.days.length-1;renderProgramBuilderV6();}
function updateBuilderExerciseV6(di,i,field,value){const all=getDayLists()||{},it=all[di]?.[i];if(!it)return;if(field==='name'){const n=plainImportedText(value,100);if(!n)return;const cur=dispNameForItem(it,getCyc().num,cw);if(n!==cur){it.sw=Array.isArray(it.sw)?it.sw.filter(s=>!(s.c===getCyc().num&&s.w===cw)):[];it.sw.push({n,c:getCyc().num,w:cw});}}
  else if(field==='main')it.m=value==='1';else if(field==='targetSets')it.targetSets=value?Math.max(1,Math.min(12,parseInt(value)||1)):undefined;else if(field==='targetRpe')it.targetRpe=value?Math.max(5,Math.min(10,parseFloat(value)||8)):undefined;else if(field==='rest')it.r=Math.max(30,Math.min(600,parseInt(value)||90));else if(field==='increment')it.increment=value?Math.max(.25,Math.min(20,parseFloat(value)||2.5)):undefined;else if(field==='desc')it.d=plainImportedText(value,1000);else it[field]=plainImportedText(value,80);saveDayLists(all);renderProgramBuilderV6();}
function moveBuilderExerciseV6(di,i,dir){const all=getDayLists()||{},arr=all[di]||[],j=i+dir;if(j<0||j>=arr.length)return;mutateDayList(di,l=>{[l[i],l[j]]=[l[j],l[i]];});renderProgramBuilderV6();}
function toggleBuilderExerciseV6(di,i){const all=getDayLists()||{},it=all[di]?.[i];if(!it)return;it.programDisabled=!it.programDisabled;saveDayLists(all);renderProgramBuilderV6();}
function addBuilderExerciseV6(di){const input=document.getElementById('v6-add-ex-name'),name=plainImportedText(input?.value.trim(),100);if(!name){toast('Vpiši ime vaje.','err');return;}const all=getDayLists()||{},arr=all[di]||[];if(arr.some(x=>dispNameForItem(x,getCyc().num,cw).toLowerCase()===name.toLowerCase())){toast('Vaja je že na tem dnevu.','err');return;}const db=EXERCISE_DB.find(x=>x.n===name),cu=getCustomExercises().find(x=>x.n===name);mutateDayList(di,l=>l.push({id:_newExId(name),n0:name,m:false,r:db?.c==='compound'||cu?.cat==='compound'?120:75,rl:'',d:db?.d||cu?.desc||'',tip:'',extra:true,progMode:'auto'}));renderProgramBuilderV6();}
async function duplicateProgramDayV6(di){const m=getProgramMetaV6();if(m.days.length>=7){toast('Največ 7 dni.','err');return;}const src=m.days[di],ni=m.days.length;m.days.push({...src,name:(src.name||`Dan ${di+1}`)+' kopija',title:(src.title||'Trening')+' — kopija',active:true});saveProgramMetaV6(m);applyProgramStateV6();const all=getDayLists()||{},srcList=all[di]||[];all[ni]=srcList.map(x=>({...JSON.parse(JSON.stringify(x)),id:_newExId(x.n0)}));saveDayLists(all);v6BuilderDay=ni;renderProgramBuilderV6();}

/* target sets/reps from builder */
const _nsfV5=nsf;
nsf=function(di,ei,wk,exKey){const e=PROG.days[di]?.ex?.[ei];if(e&&e.targetSets){const base=wk?.dl?Math.min(3,e.targetSets):e.targetSets;return Math.max(1,base+getExtraSets(exKey));}return _nsfV5(di,ei,wk,exKey);};
const _isExHiddenV5=isExHidden;
isExHidden=function(exKey){const m=String(exKey).match(/^c\d+w\d+d(\d+)e(\d+)$/);if(m){const e=PROG.days[+m[1]]?.ex?.[+m[2]];if(e?.programDisabled)return true;}return _isExHiddenV5(exKey);};

/* ---------- Exercise timeline + progression ---------- */
function parseRepRangeV6(v){const n=String(v||'').match(/(\d+)\D+(\d+)/);if(n)return {min:+n[1],max:+n[2]};const one=String(v||'').match(/\d+/);return one?{min:+one[0],max:+one[0]}:{min:5,max:10};}
function getRestLogV6(){try{return JSON.parse(localStorage.getItem(V6_KEYS.restLog)||'[]');}catch{return [];}}
function saveRestLogV6(v){localStorage.setItem(V6_KEYS.restLog,JSON.stringify(v.slice(-500)));}
function getExerciseTimelineV6(di,ei,name){const id=exStableId(name),out=[];getSessions().forEach(s=>{const ex=Array.isArray(s.exercises)?s.exercises.find(x=>x.exerciseId===id||x.name===name):null;if(!ex)return;const done=(ex.sets||[]).filter(x=>x.done&&Number(x.kg)>0&&Number(x.reps)>0);if(!done.length)return;const top=done.reduce((a,b)=>(Number(b.kg)*(1+Number(b.reps)/30))>(Number(a.kg)*(1+Number(a.reps)/30))?b:a),rpes=done.map(x=>Number(x.rpe)).filter(Boolean),notes=done.map(x=>x.note).filter(Boolean);const rest=getRestLogV6().filter(r=>r.exerciseId===id&&r.date===s.date);out.push({date:s.date,cycle:s.cycle,week:(s.weekIdx??((s.weekNum||1)-1)),sets:done,doneSets:done.length,targetSets:ex.targetSets||done.length,completion:(ex.targetSets||done.length)?done.length/(ex.targetSets||done.length):1,topKg:Number(top.kg),topReps:Number(top.reps),e1rm:Number(top.kg)*(1+Number(top.reps)/30),tonnage:done.reduce((a,x)=>a+Number(x.kg)*Number(x.reps),0),avgRpe:rpes.length?rpes.reduce((a,b)=>a+b,0)/rpes.length:0,maxRpe:rpes.length?Math.max(...rpes):0,pain:Number(ex.pain)||0,notes,avgRest:rest.length?rest.reduce((a,b)=>a+(b.actualSec||0),0)/rest.length:0});});
  if(!out.length){try{getExerciseHistory(di,ei,name).forEach(h=>out.push({date:h.date,cycle:h.c,week:h.w,sets:h.sets.map(x=>({...x,done:true})),doneSets:h.sets.length,targetSets:h.sets.length,completion:1,topKg:h.top.kg,topReps:h.top.reps,e1rm:h.e1rm,tonnage:h.totalVol,avgRpe:0,maxRpe:0,pain:0,notes:[],avgRest:0}));}catch(e){}}
  return out.sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.cycle-a.cycle||b.week-a.week);
}
function exerciseCategoryV6(e,name){if(e?.m)return 'main';const map=EX_MAP[name],db=EXERCISE_DB.find(x=>x.n===name);return (map?.cat||db?.c)==='compound'?'compound':'isolation';}
function defaultIncrementV6(e,name){if(e?.increment)return Number(e.increment);const cat=exerciseCategoryV6(e,name);if(cat==='isolation')return 1;return /squat|deadlift|leg press|romanian|rdl|hip thrust/i.test(name)?5:2.5;}
function roundStepV6(v,step){return Math.round(v/step)*step;}
function evaluateProgressionV6(history,cfg={}){if(!history.length)return {action:'none',label:'Najprej zabeleži trening',suggestedKg:0,reasons:['Ni zaključenih sessionov za to vajo.'],confidence:'nizka',stagnating:false};const s=getV6Settings(),last=history[0],prev=history[1],prev2=history[2],step=Number(cfg.increment)||2.5,mode=cfg.mode||'auto',reasons=[],base=last.topKg||0,range=parseRepRangeV6(cfg.targetReps),twoDrops=!!(prev&&prev2&&last.e1rm<prev.e1rm*.98&&prev.e1rm<prev2.e1rm*.98),flatHard=history.slice(0,3).length===3&&history.slice(0,3).every(x=>x.avgRpe>=9)&&Math.max(...history.slice(0,3).map(x=>x.e1rm))-Math.min(...history.slice(0,3).map(x=>x.e1rm))<3,repeatedPain=history.slice(0,2).length===2&&history.slice(0,2).every(x=>x.pain>=3);
  let action='hold',kg=base;
  if(mode==='hold'){reasons.push('V builderju je izbrano: brez samodejne spremembe.');}
  else if(last.pain>=s.painStop||repeatedPain){action='reduce';kg=roundStepV6(base*.9,step);reasons.push(last.pain>=s.painStop?`Bolečina ${last.pain}/10 presega varno mejo.`:'Bolečina se ponavlja na dveh treningih.');}
  else if(twoDrops){action='deload';kg=roundStepV6(base*.9,step);reasons.push('e1RM je padel dva treninga zapored.');}
  else if(last.completion<.75||last.maxRpe>=s.rpeDown){action='reduce';kg=Math.max(0,roundStepV6(base-step,step));reasons.push(last.completion<.75?'Opravljenih je manj kot 75% ciljnih setov.':`Najvišji RPE ${last.maxRpe.toFixed(1)} je previsok.`);}
  else if(mode==='linear'){action='increase';kg=roundStepV6(base+step,step);reasons.push(`Linearna progresija: +${step} kg po opravljenem treningu.`);}
  else if(mode==='double'){
    const avgReps=last.sets.reduce((a,x)=>a+Number(x.reps||0),0)/last.sets.length;
    if(last.completion>=.9&&avgReps>=range.max&&(!last.avgRpe||last.avgRpe<=s.rpeUp)){action='increase';kg=roundStepV6(base+step,step);reasons.push(`Dosežen zgornji rob ${range.max} ponovitev pri nadzorovanem RPE.`);}else{action='hold';reasons.push(`Najprej dvigni povprečje ponovitev proti ${range.max}.`);}
  } else if(last.completion>=s.completionUp/100&&(!last.avgRpe||last.avgRpe<=s.rpeUp)&&(!prev||last.e1rm>=prev.e1rm*.99)){action='increase';kg=roundStepV6(base+step,step);reasons.push(`${Math.round(last.completion*100)}% izvedba in povprečni RPE ${last.avgRpe?last.avgRpe.toFixed(1):'ni vnesen'}.`);reasons.push('e1RM je stabilen ali raste.');}
  else {action='hold';reasons.push(last.avgRpe>s.rpeUp?`Povprečni RPE ${last.avgRpe.toFixed(1)} je že visok.`:'Za povečanje manjka še en stabilen trening.');}
  if(last.avgRest&&last.avgRest<60&&exerciseCategoryV6(cfg.exercise,cfg.name)!=='isolation')reasons.push('Povprečni počitek je bil kratek; padec moči morda ni program.');
  return {action,label:{increase:`Povečaj na ${kg} kg`,hold:`Ohrani ${kg} kg`,reduce:`Zmanjšaj na ${kg} kg`,deload:`Deload okoli ${kg} kg`}[action],suggestedKg:kg,reasons,confidence:history.length>=3?'visoka':history.length===2?'srednja':'nizka',stagnating:twoDrops||flatHard||repeatedPain,last};
}
function isDeloadWeekIdx(w){return !!(PROG.weeks&&PROG.weeks[w]&&PROG.weeks[w].dl);}
function progressionForExerciseV6(di,ei,name){const e=PROG.days[di]?.ex?.[ei],hist=getExerciseTimelineV6(di,ei,name).filter(h=>!isDeloadWeekIdx(h.week));return evaluateProgressionV6(hist,{name,exercise:e,increment:defaultIncrementV6(e,name),mode:e?.progMode||'auto',targetReps:e?.targetReps||PROG.weeks[cw]?.reps});}
function renderProgressionCardV6(di,ei,name){if(!getV6Settings().progression)return '';const r=progressionForExerciseV6(di,ei,name);const cls=r.action==='none'?'':r.action;return `<div class="prog-v6 ${cls}"><div class="prog-v6-head"><span class="prog-v6-title">🧠 ${safeHtml(r.label)}</span><span class="v6-chip ${r.action==='increase'?'good':r.action==='hold'?'warn':r.action==='none'?'':'bad'}">${safeHtml(r.confidence)} zaupanje</span></div><div class="prog-v6-reasons">${r.reasons.slice(0,3).map(x=>`<div>• ${safeHtml(x)}</div>`).join('')}</div></div>`;}
smartCycleSuggestion=function(cn,di,ei,name){const r=progressionForExerciseV6(di,ei,name),cur=cycleExerciseMetrics(cn,di,ei),actionMap={increase:['su','+'+(r.suggestedKg-(cur.peak||r.last?.topKg||0))+'kg'],hold:['ss','Ohrani'],reduce:['sd2','Zmanjšaj'],deload:['sd2','Deload'],none:['ss','Brez podatkov']},a=actionMap[r.action]||actionMap.hold;return {skg:r.suggestedKg||0,sc:a[0],sl:a[1],reason:r.reasons.join(' '),...cur,trend:0};};

/* ---------- Quick logging and render wrapper ---------- */
function nextPendingSetIndexV6(key,di,ei){const a=getSets()[key]||[],wk=PROG.weeks[cw],n=Math.max(1,nsf(di,ei,wk,key));for(let i=0;i<n;i++)if(!a[i]?.done)return i;return n;}
function parseQuickSetV6(text){const s=String(text||'').trim().replace(',','.');let m=s.match(/^\s*(\d+(?:\.\d+)?)\s*(?:x|×|\s)\s*(\d+)\s*(?:@\s*(\d+(?:\.\d+)?))?\s*$/i);if(!m)m=s.match(/^\s*(\d+(?:\.\d+)?)\s+(\d+)\s+(\d+(?:\.\d+)?)\s*$/);return m?{kg:+m[1],reps:+m[2],rpe:m[3]?+m[3]:null}:null;}
async function quickLogSetV6(key,di,ei,cn){const inp=document.getElementById('v6q-'+key),p=parseQuickSetV6(inp?.value);if(!p){toast('Primer vnosa: 120x5@8','err');return;}let si=nextPendingSetIndexV6(key,di,ei),wk=PROG.weeks[cw],n=nsf(di,ei,wk,key);if(si>=n){addSet(key,di,ei,cn);si=n;}const isBarbell=BARBELL_EX.includes(PROG.days[di]?.ex?.[ei]?.n);await sv(key,si,'kg',String(p.kg),di,ei,cn,isBarbell?1:0);await sv(key,si,'reps',String(p.reps),di,ei,cn,0);if(p.rpe)setRpe(key,si,p.rpe,di,ei,cn);const cur=getSets()[key]?.[si];if(!cur?.done)tgSet(key,si,di,ei,cn);const fresh=document.getElementById('v6q-'+key);if(fresh)fresh.value='';}
function repeatPreviousSetV6(key,di,ei,cn){let all=getSets(),a=all[key]||[],si=nextPendingSetIndexV6(key,di,ei),wk=PROG.weeks[cw],n=nsf(di,ei,wk,key),prev=[...a.slice(0,Math.min(si,a.length))].reverse().find(x=>x.kg&&x.reps);if(!prev){toast('Ni prejšnjega seta.','err');return;}if(si>=n){addSet(key,di,ei,cn);all=getSets();a=all[key]||[];si=n;}a[si]={...a[si],kg:prev.kg,reps:prev.reps,rpe:prev.rpe||null,exName:prev.exName,exerciseId:prev.exerciseId};saveSets(all);showDay(di);toast('↺ Prejšnji set kopiran','ok');}
function copyWeightForwardV6(key,di,ei){const all=getSets(),a=all[key]||[],wk=PROG.weeks[cw],n=nsf(di,ei,wk,key),si=nextPendingSetIndexV6(key,di,ei),src=(si<n?a[si]?.kg:null)||[...a.slice(0,Math.min(si,n))].reverse().find(x=>x.kg)?.kg;if(!src){toast('Najprej vnesi težo.','err');return;}if(si>=n){toast('Vsi ciljni seti so že zaključeni.','ok');return;}for(let i=si;i<n;i++)if(!a[i]?.done){if(!a[i])a[i]={kg:'',reps:'',done:false};a[i].kg=src;}saveSets(all);showDay(di);toast(`↓ ${src} kg kopirano naprej`,'ok');}
function focusNextSetV6(key,si){setTimeout(()=>{const row=document.getElementById(`row-${key}-${si+1}`);const inp=row?.querySelector('.wi,.ri');if(inp){inp.focus();inp.select?.();}},120);}
const _renderExV5=renderEx;
renderEx=function(e,ei,di,wk,cn,isExtra){const wk2={...wk,reps:e.targetReps||wk.reps,rpe:e.targetRpe?`RPE ${e.targetRpe}`:wk.rpe};let html=_renderExV5(e,ei,di,wk2,cn,isExtra),key=sdk(cn,cw,di,ei),name=e.n;const prog=renderProgressionCardV6(di,ei,name),quick=`<div class="quick-log-v6"><input id="v6q-${key}" placeholder="120x5@8" onkeydown="if(event.key==='Enter')quickLogSetV6('${key}',${di},${ei},${cn})"><button class="primary" onclick="quickLogSetV6('${key}',${di},${ei},${cn})">Log set</button><button onclick="repeatPreviousSetV6('${key}',${di},${ei},${cn})">↺ set</button><button onclick="copyWeightForwardV6('${key}',${di},${ei})">↓ kg</button></div>`;html=html.replace('<table class="st">',prog+quick+'<table class="st">');html=html.replace(`<button class="txb" onclick="stopT('${key}')">X</button></div>`,`<button class="timer-v6-btn" onclick="adjustTimerV6(-30)">−30</button><button class="timer-v6-btn" onclick="pauseResumeTimerV6('${key}')" id="tp-${key}">Ⅱ</button><button class="timer-v6-btn" onclick="adjustTimerV6(30)">+30</button><button class="txb" onclick="stopT('${key}')">X</button><span class="timer-v6-meta" id="tm-${key}"></span></div>`);return html;};

/* ---------- Smart rest timer ---------- */
function smartRestFromMetaV6(meta){let sec=meta.defaultSec||90;if(!getV6Settings().smartRest)return sec;if(meta.drop)return 0;if(meta.warm)return 75;if(meta.category==='main')sec=Math.max(sec,180);else if(meta.category==='compound')sec=Math.max(sec,120);else sec=Math.max(60,Math.min(sec,105));if(meta.rpe>=9.5)sec+=60;else if(meta.rpe>=9)sec+=45;else if(meta.rpe>=8.5)sec+=30;if(meta.reps>=15&&meta.category==='isolation')sec=Math.max(45,sec-15);return Math.min(420,Math.round(sec/15)*15);}
function computeSmartRestV6(key,si,def){const m=String(key).match(/d(\d+)e(\d+)$/),di=m?+m[1]:cd,ei=m?+m[2]:0,e=PROG.days[di]?.ex?.[ei],name=currentExerciseName(di,ei,key),s=getSets()[key]?.[si]||{};return smartRestFromMetaV6({defaultSec:def||e?.r||90,category:exerciseCategoryV6(e,name),rpe:Number(s.rpe)||0,reps:Number(s.reps)||0,drop:!!s.drop,warm:!!s.warm});}
function timerDisplayV6(sec){return sec>=60?`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`:String(sec);}
function currentTimerV6(){try{return JSON.parse(localStorage.getItem(LS_TIMER)||'null');}catch{return null;}}
function saveTimerV6(t){localStorage.setItem(LS_TIMER,JSON.stringify(t));}
function logRestV6(t,reason){if(!t?.startedTs||t.logged)return;const actual=Math.max(0,Math.round(((t.paused?Date.now():Math.min(Date.now(),t.endTs))-t.startedTs)/1000));if(actual<3)return;const m=String(t.key).match(/d(\d+)e(\d+)$/),di=m?+m[1]:cd,ei=m?+m[2]:0,name=currentExerciseName(di,ei,t.key),log=getRestLogV6();log.push({id:t.id,date:new Date().toISOString().slice(0,10),ts:new Date().toISOString(),key:t.key,exerciseId:exStableId(name),exerciseName:name,plannedSec:t.plannedSec,actualSec:actual,reason});saveRestLogV6(log);}
function clearTimerIntervalsV6(){Object.keys(TM).forEach(k=>{if(TM[k])clearInterval(TM[k]);TM[k]=null;});}
function tickTimerV6(t){const bar=document.getElementById('tb-'+t.key),cnt=document.getElementById('tc-'+t.key),meta=document.getElementById('tm-'+t.key),pause=document.getElementById('tp-'+t.key);if(bar)bar.classList.add('on');if(pause)pause.textContent=t.paused?'▶':'Ⅱ';if(meta)meta.textContent=`plan ${fmtRest(t.plannedSec)}`;if(t.paused){if(cnt)cnt.textContent=timerDisplayV6(t.remainingSec||0);return;}const run=()=>{const cur=currentTimerV6();if(!cur||cur.id!==t.id)return;const rem=Math.max(0,Math.ceil((cur.endTs-Date.now())/1000));if(cnt)cnt.textContent=timerDisplayV6(rem);if(rem<=15&&rem>0&&getV6Settings().restWarning&&!cur.warned15){cur.warned15=true;saveTimerV6(cur);if(navigator.vibrate)navigator.vibrate(80);if(meta)meta.textContent='15 s do seta';}if(rem<=0){clearTimerIntervalsV6();localStorage.removeItem(LS_TIMER);cancelScheduledNotification();logRestV6(cur,'completed');alertEnd(cur.key);renderV6Settings();}};run();TM[t.key]=setInterval(run,250);}
startT=function(key,secs){clearTimerIntervalsV6();cancelScheduledNotification();const old=currentTimerV6();const t={id:'rest_'+Date.now(),key,endTs:Date.now()+secs*1000,startedTs:Date.now(),plannedSec:secs,remainingSec:secs,paused:false,warned15:false};saveTimerV6(t);scheduleNotification(secs);tickTimerV6(t);};
stopT=function(key){const t=currentTimerV6();if(t)logRestV6(t,'stopped');clearTimerIntervalsV6();localStorage.removeItem(LS_TIMER);cancelScheduledNotification();const b=document.getElementById('tb-'+key);if(b)b.classList.remove('on','flash');const c=document.getElementById('tc-'+key);if(c)c.textContent='—';renderV6Settings();};
function adjustTimerV6(delta){const t=currentTimerV6();if(!t)return;const now=Date.now();if(t.paused)t.remainingSec=Math.max(0,(t.remainingSec||0)+delta);else t.endTs=Math.max(now, t.endTs+delta*1000);t.plannedSec=Math.max(0,(t.plannedSec||0)+delta);saveTimerV6(t);cancelScheduledNotification();const rem=t.paused?t.remainingSec:Math.max(0,Math.ceil((t.endTs-now)/1000));if(!t.paused)scheduleNotification(rem);clearTimerIntervalsV6();tickTimerV6(t);}
function pauseResumeTimerV6(key){const t=currentTimerV6();if(!t||t.key!==key)return;if(t.paused){t.paused=false;t.startedTs=Date.now()-(Math.max(0,t.plannedSec-t.remainingSec)*1000);t.endTs=Date.now()+t.remainingSec*1000;saveTimerV6(t);scheduleNotification(t.remainingSec);}else{t.remainingSec=Math.max(0,Math.ceil((t.endTs-Date.now())/1000));t.paused=true;saveTimerV6(t);cancelScheduledNotification();}clearTimerIntervalsV6();tickTimerV6(t);}
restoreTimer=function(){if(window.v6RecoveryPending&&!stRun)return;const t=currentTimerV6();if(!t)return;if(!t.paused&&t.endTs<=Date.now()){localStorage.removeItem(LS_TIMER);return;}clearTimerIntervalsV6();setTimeout(()=>tickTimerV6(t),60);};

/* ---------- Wrap set logging, persistence and swipe ---------- */
function persistSessionDraftV6(){if(!stRun||!activeSessionContext)return;try{const c=activeSessionContext,snap=buildSessionSnapshot(c.cycle,c.weekIdx,c.dayIdx);localStorage.setItem(V6_KEYS.draft,JSON.stringify({updated:new Date().toISOString(),activeEx:localStorage.getItem('wt_active_ex')||'',totals:snap.totals}));}catch(e){}}
const _svV5=sv;sv=async function(...a){const r=await _svV5.apply(this,a);persistSessionDraftV6();return r;};
const _setRpeV5=setRpe;setRpe=function(...a){const r=_setRpeV5.apply(this,a);persistSessionDraftV6();return r;};
const _setExPainV5=setExPain;setExPain=function(...a){const r=_setExPainV5.apply(this,a);persistSessionDraftV6();return r;};
const _saveNotePopV5=saveNotePop;saveNotePop=function(...a){const r=_saveNotePopV5.apply(this,a);persistSessionDraftV6();return r;};
const _tgSetV5=tgSet;
tgSet=function(key,si,di,ei,cn){
  const before=!!getSets()[key]?.[si]?.done;

  if(!before){
    const timer=currentTimerV6();
    if(timer&&timer.key===key){
      logRestV6(timer,'next-set');
      clearTimerIntervalsV6();
      localStorage.removeItem(LS_TIMER);
      cancelScheduledNotification();

      try{
        const nativeApi=window.WTRestNotifications;
        if(nativeApi&&typeof nativeApi.cancel==='function'){
          Promise.resolve(nativeApi.cancel()).catch(()=>{});
        }
      }catch(error){}
    }
  }

  const startTimerOnce=startT;
  startT=function(){};

  try{
    _tgSetV5(key,si,di,ei,cn);
  }finally{
    startT=startTimerOnce;
  }

  const after=getSets()[key]?.[si];

  if(!before&&after?.done){
    if(!after.drop){
      const exercise=PROG.days[di]?.ex?.[ei];
      const name=currentExerciseName(di,ei,key);
      const defaultSeconds=restForEx(
        exercise?.id,
        name,
        exercise?.r||90
      );
      const smartSeconds=computeSmartRestV6(
        key,
        si,
        defaultSeconds
      );

      if(smartSeconds>0){
        startTimerOnce(key,smartSeconds);
      }
    }

    focusNextSetV6(key,si);

    if(typeof getGymMode==='function'&&getGymMode()){
      window.setTimeout(()=>{
        const api=window.WTFocusPatchV10;
        if(api&&typeof api.setFocus==='function'){
          api.setFocus(key,false);
        }
      },650);
    }
  }

  persistSessionDraftV6();
};
(function installSetSwipeV6(){const dc=document.getElementById('day-content');if(!dc||dc.dataset.v6Swipe)return;dc.dataset.v6Swipe='1';let sx=0,sy=0,row=null;dc.addEventListener('touchstart',e=>{const r=e.target.closest('tr[id^="row-"]');if(!r)return;const t=e.touches[0];sx=t.clientX;sy=t.clientY;row=r;},{passive:true});dc.addEventListener('touchend',e=>{if(!row)return;const r=row;row=null;const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.4)return;const m=r.id.match(/^row-(c\d+w\d+d(\d+)e(\d+))-(\d+)$/);if(!m)return;const key=m[1],di=+m[2],ei=+m[3],si=+m[4],cn=+(key.match(/^c(\d+)/)?.[1]||getCyc().num),done=!!getSets()[key]?.[si]?.done;if(dx>0&&!done){r.classList.add('v6-swipe-ok');setTimeout(()=>tgSet(key,si,di,ei,cn),90);}else if(dx<0&&done){r.classList.add('v6-swipe-undo');setTimeout(()=>tgSet(key,si,di,ei,cn),90);}},{passive:true});})();

/* ---------- Session recovery ---------- */
let v6RecoveryContext=null;window.v6RecoveryPending=false;
restoreSession=function(){const raw=localStorage.getItem(LS_SESS);if(!raw)return;try{const s=JSON.parse(raw);if(!s.startISO||!Number.isFinite(Number(s.startMs)))throw new Error('bad');v6RecoveryContext={...s,cycle:Number(s.cycle)||getCyc().num,profile:s.profile||getActiveProfile()};window.v6RecoveryPending=true;if(v6RecoveryContext.profile!==getActiveProfile()){setActiveProfile(v6RecoveryContext.profile);applyProgramStateV6(v6RecoveryContext.profile);}const snap=buildSessionSnapshot(v6RecoveryContext.cycle,v6RecoveryContext.weekIdx,v6RecoveryContext.dayIdx),age=Math.max(0,Math.round((Date.now()-Number(v6RecoveryContext.startMs))/60000));document.getElementById('v6-recovery-text').innerHTML=`Najden je <strong>${safeHtml(DAY_NAMES[v6RecoveryContext.dayIdx]||'trening')}</strong>, začet ${new Date(v6RecoveryContext.startISO).toLocaleString('sl-SI')}.` ;document.getElementById('v6-recovery-stats').innerHTML=`<div class="v6-recovery-stat"><strong>${snap.totals.doneSets}/${snap.totals.sets}</strong><span>setov</span></div><div class="v6-recovery-stat"><strong>${age}</strong><span>min od začetka</span></div><div class="v6-recovery-stat"><strong>${Math.round(snap.totals.tonnage)}</strong><span>kg tonaže</span></div>`;document.getElementById('v6-recovery-pop').classList.add('on');}catch(e){localStorage.removeItem(LS_SESS);localStorage.removeItem(V6_KEYS.draft);}};
function resumeSessionV6(){const s=v6RecoveryContext;if(!s)return;document.getElementById('v6-recovery-pop').classList.remove('on');window.v6RecoveryPending=false;activeSessionContext={...s};sessStart=new Date(s.startISO);stStart=Number(s.startMs);stRun=true;cd=s.dayIdx;cw=s.weekIdx;const dot=document.getElementById('sess-dot');if(dot)dot.classList.add('on');const btn=document.getElementById('st-b');if(btn){btn.textContent='Zaključi';btn.classList.add('active');}const ss=document.getElementById('st-s');if(ss)ss.textContent=`${sessStart.toLocaleTimeString('sl-SI',{hour:'2-digit',minute:'2-digit'})} · ${DAY_NAMES[cd]} (obnovljeno)`;clearInterval(stInt);stInt=setInterval(tickSessionClock,1000);tickSessionClock();showPage('workout');showDay(cd);setGymMode(true);const draft=JSON.parse(localStorage.getItem(V6_KEYS.draft)||'null');if(draft?.activeEx)setGymFocus(draft.activeEx,false);restoreTimer();toast('↺ Trening obnovljen','ok');}
async function discardSessionV6(){if(!await uiConfirm('Zavrzi aktivno session? Vneseni seti ostanejo shranjeni, session pa ne bo dodan v zgodovino.'))return;document.getElementById('v6-recovery-pop').classList.remove('on');window.v6RecoveryPending=false;v6RecoveryContext=null;localStorage.removeItem(LS_SESS);localStorage.removeItem(V6_KEYS.draft);const t=currentTimerV6();if(t)stopT(t.key);toast('Session zavržena; seti so ostali.','ok');}
const _toggleSessV5=toggleSess;toggleSess=async function(){const was=stRun;await _toggleSessV5();if(!was&&stRun)persistSessionDraftV6();if(was&&!stRun){localStorage.removeItem(V6_KEYS.draft);window.v6RecoveryPending=false;}};

/* ---------- Stagnation dashboard ---------- */
function collectStagnationAlertsV6(){const alerts=[],seen=new Set(),now=Date.now(),sessions=getSessions().map(s=>({...s,_ts:new Date(s.startISO||s.date||0).getTime()})).filter(s=>Number.isFinite(s._ts)&&s._ts>0).sort((a,b)=>b._ts-a._ts);if(sessions.length>=3){const gap=Math.floor((now-sessions[0]._ts)/86400000);if(gap>=7)alerts.push({name:'Konsistenca',severity:gap>=14?'bad':'warn',title:`${gap} dni brez zaključenega treninga`,text:'Pred povečevanjem bremen najprej ponovno vzpostavi reden ritem.'});const ton=s=>Number(s.totals?.tonnage||s.tonnage||0),recent=sessions.filter(x=>now-x._ts<7*86400000).reduce((a,x)=>a+ton(x),0),prior=sessions.filter(x=>now-x._ts>=7*86400000&&now-x._ts<14*86400000).reduce((a,x)=>a+ton(x),0);if(prior>1000&&recent>prior*1.35&&recent-prior>1500)alerts.push({name:'Tedenski volumen',severity:recent>prior*1.6?'bad':'warn',title:`Skok tonaže +${Math.round((recent/prior-1)*100)}%`,text:`Zadnjih 7 dni ${Math.round(recent)} kg proti ${Math.round(prior)} kg prej. Ne povečuj hkrati bremena, setov in frekvence.`});const recent28=sessions.filter(x=>now-x._ts<28*86400000).length,prior28=sessions.filter(x=>now-x._ts>=28*86400000&&now-x._ts<56*86400000).length;if(prior28>=6&&recent28<prior28*.6)alerts.push({name:'Konsistenca',severity:'warn',title:'Frekvenca treningov je opazno padla',text:`Zadnjih 28 dni ${recent28} sessionov, prej ${prior28}. Pred spremembo programa preveri urnik in regeneracijo.`});}activeDayIndicesV6().forEach(di=>{(buildDayExList(di)||[]).forEach((e,ei)=>{const name=e.n;if(e.programDisabled||seen.has(name))return;seen.add(name);const hist=getExerciseTimelineV6(di,ei,name).filter(h=>!isDeloadWeekIdx(h.week));if(hist.length<2)return;const r=evaluateProgressionV6(hist,{name,exercise:e,increment:defaultIncrementV6(e,name),mode:e.progMode||'auto',targetReps:e.targetReps});if(r.action==='reduce'||r.action==='deload'||r.stagnating)alerts.push({name,di,ei,severity:r.action==='deload'?'bad':'warn',title:r.action==='deload'?'Deload je smiseln':'Potrebna je prilagoditev',text:r.reasons.join(' ')});else if(hist[0].avgRpe>=9.3&&hist[1].avgRpe>=9.3)alerts.push({name,di,ei,severity:'warn',title:'RPE je dvakrat zapored visok',text:'Ohrani težo ali podaljšaj počitek; ne dodajaj bremena.'});});});return alerts.slice(0,12);}
function renderStagnationAlertsV6(){const el=document.getElementById('v6-stagnation-alerts'),cnt=document.getElementById('v6-alert-count');if(!el)return;const a=collectStagnationAlertsV6();if(cnt){cnt.textContent=a.length;cnt.className='v6-chip '+(a.length?'warn':'good');}if(!a.length){el.innerHTML='<div class="v6-alert good"><div class="v6-alert-title">✓ Ni jasnih znakov stagnacije</div><div class="v6-alert-text">To ni dokaz, da je program popoln; pomeni samo, da trenutni podatki ne kažejo ponavljajočega padca.</div></div>';return;}el.innerHTML=a.map(x=>`<div class="v6-alert ${x.severity}"><div class="v6-alert-title">${safeHtml(x.name)} · ${safeHtml(x.title)}</div><div class="v6-alert-text">${safeHtml(x.text)}</div>${Number.isInteger(x.di)&&Number.isInteger(x.ei)?`<button class="sb" onclick="showPage('workout');showDay(${x.di});setTimeout(()=>openExHistory(${x.di},${x.ei}),100)" style="margin-top:6px;font-size:10px;padding:4px 9px;">Odpri zgodovino</button>`:''}</div>`).join('');}

/* ---------- Advanced exercise history ---------- */
let v6ExHistoryChart=null;
openExHistory=function(di,ei){const key=sdk(getCyc().num,cw,di,ei),e=PROG.days[di]?.ex?.[ei],name=currentExerciseName(di,ei,key),hist=getExerciseTimelineV6(di,ei,name);document.getElementById('ex-hist-title').textContent='📊 '+name;const sum=document.getElementById('ex-hist-summary'),content=document.getElementById('ex-hist-content');if(!hist.length){sum.innerHTML='';content.innerHTML='<div style="font-size:13px;color:var(--text3);padding:1rem;text-align:center;">Še ni zaključenih sessionov za to vajo.</div>';document.getElementById('ex-hist-pop').classList.add('on');return;}const best=Math.max(...hist.map(x=>x.e1rm)),heavy=Math.max(...hist.map(x=>x.topKg)),rpes=hist.map(x=>x.avgRpe).filter(Boolean),pains=hist.map(x=>x.pain).filter(Boolean),rests=hist.map(x=>x.avgRest).filter(Boolean),rec=progressionForExerciseV6(di,ei,name);sum.innerHTML=`<div class="v6-hist-metrics"><div class="v6-hist-metric"><strong>${Math.round(best)}kg</strong><span>best e1RM</span></div><div class="v6-hist-metric"><strong>${heavy}kg</strong><span>najtežje</span></div><div class="v6-hist-metric"><strong>${rpes.length?(rpes.reduce((a,b)=>a+b,0)/rpes.length).toFixed(1):'—'}</strong><span>povp. RPE</span></div><div class="v6-hist-metric"><strong>${pains.length?(pains.reduce((a,b)=>a+b,0)/pains.length).toFixed(1):'0'}</strong><span>povp. bolečina</span></div><div class="v6-hist-metric"><strong>${rests.length?fmtRest(Math.round(rests.reduce((a,b)=>a+b,0)/rests.length)):'—'}</strong><span>povp. počitek</span></div><div class="v6-hist-metric"><strong>${hist.length}</strong><span>sessionov</span></div></div><div class="prog-v6 ${rec.action}"><div class="prog-v6-title">${safeHtml(rec.label)}</div><div class="prog-v6-reasons">${rec.reasons.map(x=>`<div>• ${safeHtml(x)}</div>`).join('')}</div></div><div class="v6-hist-chart"><canvas id="v6-ex-history-chart"></canvas></div>`;content.innerHTML=hist.slice(0,10).map(h=>`<div style="background:var(--bg3);border-radius:8px;padding:10px;margin-bottom:8px;${h.e1rm===best?'border:1px solid var(--green);':''}"><div style="display:flex;justify-content:space-between;gap:8px;"><strong style="font-size:12px;">${h.date?new Date(h.date).toLocaleDateString('sl-SI'):`C${h.cycle} T${h.week+1}`}</strong><span style="font-size:10px;color:var(--text3);">${Math.round(h.tonnage)}kg vol</span></div><div style="font-size:12px;color:var(--text2);margin-top:4px;">${h.sets.map(s=>`${s.kg}×${s.reps}${s.rpe?'@'+s.rpe:''}`).join(' · ')}</div><div style="font-size:10px;color:var(--text3);margin-top:4px;">e1RM ${Math.round(h.e1rm)}kg${h.avgRpe?' · RPE '+h.avgRpe.toFixed(1):''}${h.pain?' · bolečina '+h.pain+'/10':''}${h.avgRest?' · počitek '+fmtRest(Math.round(h.avgRest)):''}</div>${h.notes?.length?`<div style="font-size:10px;color:var(--amber-text);margin-top:4px;">📝 ${safeHtml(h.notes.join(' · '))}</div>`:''}</div>`).join('');document.getElementById('ex-hist-pop').classList.add('on');setTimeout(()=>{const c=document.getElementById('v6-ex-history-chart');if(!c||typeof Chart==='undefined')return;if(v6ExHistoryChart)v6ExHistoryChart.destroy();const data=[...hist].reverse().slice(-12);v6ExHistoryChart=new Chart(c.getContext('2d'),{type:'line',data:{labels:data.map(x=>x.date?new Date(x.date).toLocaleDateString('sl-SI',{day:'numeric',month:'numeric'}):`C${x.cycle}T${x.week+1}`),datasets:[{data:data.map(x=>Math.round(x.e1rm)),borderColor:'#1d9e75',backgroundColor:'rgba(29,158,117,.1)',tension:.25,pointRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:false},x:{grid:{display:false}}}}});},80);};

/* ---------- Backup center ---------- */
const _buildBackupJSONV5=buildBackupJSON;
buildBackupJSON=async function(includePhotos){const b=JSON.parse(await _buildBackupJSONV5(includePhotos));b.version=6;b.schemaVersion=6;b.programMeta={cut:getProgramMetaV6('cut'),bulk:getProgramMetaV6('bulk')};b.v6settings=getV6Settings();b.restLog=getRestLogV6();b.lastExternal=localStorage.getItem(V6_KEYS.lastExternal)||null;return JSON.stringify(b);};
validateBackupP1=function(backup){if(!backup||typeof backup!=='object'||Array.isArray(backup))return {ok:false,msg:'Datoteka ni veljaven JSON objekt.'};if(!backup.sets||typeof backup.sets!=='object'||Array.isArray(backup.sets))return {ok:false,msg:'Backup ne vsebuje sets podatkov.'};if(backup.sessions!==undefined&&!Array.isArray(backup.sessions))return {ok:false,msg:'sessions mora biti seznam.'};if(Number(backup.schemaVersion||backup.version||1)>6)return {ok:false,msg:'Backup je iz novejše verzije aplikacije.'};let rows=0;for(const [k,v] of Object.entries(backup.sets)){if(!/^c\d+w\d+d\d+e\d+$/.test(k)||!Array.isArray(v))return {ok:false,msg:'Pokvarjen ključ setov: '+k};rows+=v.length;if(rows>250000)return {ok:false,msg:'Nenormalno veliko setov.'};for(const set of v){if(!set||typeof set!=='object'||Array.isArray(set))return {ok:false,msg:'Neveljaven zapis seta.'};const kg=parseFloat(set.kg||0),reps=parseInt(set.reps||0);if(kg<0||kg>1500||reps<0||reps>1000)return {ok:false,msg:'Nerealne vrednosti kg ali ponovitev.'};}}return {ok:true,msg:'Struktura, ključi in meje vrednosti so veljavni.'};};
const _restoreBackupV5=restoreBackupObjectP1;
restoreBackupObjectP1=async function(backup,opts={}){if((opts.mode||'replace')==='replace')Object.values(V6_KEYS).forEach(k=>localStorage.removeItem(k));await _restoreBackupV5(backup,opts);if(backup.programMeta?.cut)localStorage.setItem(V6_KEYS.metaCut,JSON.stringify(backup.programMeta.cut));if(backup.programMeta?.bulk)localStorage.setItem(V6_KEYS.metaBulk,JSON.stringify(backup.programMeta.bulk));if(backup.v6settings)saveV6Settings(backup.v6settings);if(Array.isArray(backup.restLog))saveRestLogV6(backup.restLog);if(backup.lastExternal)localStorage.setItem(V6_KEYS.lastExternal,backup.lastExternal);applyProgramStateV6();ensureDayLists();renderDayTabsV6();renderV6Settings();showDay(activeDayIndicesV6()[0]||0);};
function backupStatsV6(b){return {sessions:Array.isArray(b.sessions)?b.sessions.length:0,setKeys:b.sets?Object.keys(b.sets).length:0,setRows:b.sets?Object.values(b.sets).reduce((a,x)=>a+(Array.isArray(x)?x.length:0),0):0,bw:b.bw?Object.keys(b.bw).length:0,rest:Array.isArray(b.restLog)?b.restLog.length:0};}
function currentBackupStatsV6(){return backupStatsV6({sessions:getSessions(),sets:getSets(),bw:getBW(),restLog:getRestLogV6()});}
renderBackupList=async function(){const el=document.getElementById('backup-list');if(!el)return;const list=await getAllBackups();renderBackupStatusV6();if(!list.length){el.innerHTML='<div style="font-size:12px;color:var(--text3);padding:.5rem;">Ni lokalnih snapshotov.</div>';return;}el.innerHTML=list.map(b=>{let stats={sessions:'?',setRows:'?'};try{stats=backupStatsV6(JSON.parse(b.blob));}catch(e){}const d=new Date(b.date),date=d.toLocaleDateString('sl-SI')+' '+d.toLocaleTimeString('sl-SI',{hour:'2-digit',minute:'2-digit'});return `<div class="bk-item"><div class="bk-item-l"><div class="bk-item-date">${date}</div><div class="bk-item-meta">${b.sizeKB||'?'}KB · ${stats.sessions} sessionov · ${stats.setRows} setov · ${safeHtml(b.label)}</div></div><div class="bk-item-r"><button class="bk-item-btn" onclick="previewBackupV6(${b.id})">🔎</button><button class="bk-item-btn" onclick="downloadBackupFromIDB(${b.id})">⬇</button><button class="bk-item-btn del" onclick="delBackupConfirm(${b.id})">×</button></div></div>`;}).join('');};
function renderBackupStatusV6(){const el=document.getElementById('v6-backup-status');if(!el)return;const raw=localStorage.getItem(V6_KEYS.lastExternal)||localStorage.getItem('wt_last_backup');if(!raw){el.innerHTML='<span class="v6-chip bad">Zunanji backup še ni potrjen</span>';return;}const days=Math.floor((Date.now()-new Date(raw).getTime())/86400000);el.innerHTML=`<span class="v6-chip ${days<=7?'good':days<=14?'warn':'bad'}">Zadnji zunanji backup: ${days===0?'danes':`pred ${days} dnevi`}</span>`;}
async function previewBackupV6(id){const list=await getAllBackups(),item=list.find(x=>x.id===id);if(!item)return;let b;try{b=JSON.parse(item.blob);}catch(e){toast('Backup ni veljaven JSON.','err');return;}const v=validateBackupP1(b),bs=backupStatsV6(b),cs=currentBackupStatsV6(),diff=[['Sessioni',cs.sessions,bs.sessions],['Set zapisi',cs.setRows,bs.setRows],['Ključi vaj',cs.setKeys,bs.setKeys],['Telesna teža',cs.bw,bs.bw],['Odmori',cs.rest,bs.rest]];document.getElementById('v6-backup-preview').innerHTML=`<div class="v6-alert ${v.ok?'good':'bad'}"><div class="v6-alert-title">${v.ok?'✓ Backup je berljiv':'✗ Backup ni varen za obnovo'}</div><div class="v6-alert-text">${safeHtml(v.msg)} · shema ${b.schemaVersion||b.version||1}</div></div><div class="v6-backup-summary"><div class="v6-backup-box"><strong>${bs.sessions}</strong><span>sessionov v backupu</span></div><div class="v6-backup-box"><strong>${bs.setRows}</strong><span>set zapisov</span></div></div><div class="sl">Primerjava: trenutno → backup</div>${diff.map(x=>`<div class="v6-diff-row"><span>${x[0]}</span><strong>${x[1]} → ${x[2]}</strong></div>`).join('')}<button class="sb" onclick="testBackupV6(${id})" style="width:100%;margin-top:.7rem;">🧪 Testiraj brez uvoza</button><div id="v6-backup-test" style="margin-top:.5rem;"></div>`;const dl=document.getElementById('v6-backup-download-btn'),rs=document.getElementById('v6-backup-restore-btn');dl.onclick=()=>downloadBackupFromIDB(id);rs.disabled=!v.ok;rs.onclick=async()=>{if(!v.ok)return;if(!await uiConfirm('Zamenjam trenutne podatke s tem snapshotom? Pred tem bo narejen rollback backup.'))return;await autoBackupToIDB();await restoreBackupObjectP1(b,{photos:false,mode:'replace'});closeBackupPreviewV6();toast('✓ Snapshot obnovljen','ok');};document.getElementById('v6-backup-pop').classList.add('on');}
function closeBackupPreviewV6(){document.getElementById('v6-backup-pop').classList.remove('on');}
async function testBackupV6(id){const el=document.getElementById('v6-backup-test'),list=await getAllBackups(),item=list.find(x=>x.id===id);try{const b=JSON.parse(item.blob),v=validateBackupP1(b),round=JSON.parse(JSON.stringify(b)),v2=validateBackupP1(round);if(!v.ok||!v2.ok)throw new Error(v.msg||v2.msg);el.innerHTML='<div class="v6-alert good"><div class="v6-alert-title">✓ Dry-run uspešen</div><div class="v6-alert-text">JSON parse, serializacija in validacija so uspešni. Tvoji podatki niso bili spremenjeni.</div></div>';}catch(e){el.innerHTML=`<div class="v6-alert bad"><div class="v6-alert-title">✗ Test ni uspel</div><div class="v6-alert-text">${safeHtml(e.message)}</div></div>`;}}
const _exportDataV5=exportData;exportData=async function(){const now=new Date().toISOString();localStorage.setItem('wt_last_backup',now);localStorage.setItem(V6_KEYS.lastExternal,now);const json=await buildBackupJSON(true),blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`workout_backup_v6_${now.split('T')[0]}.json`;a.click();URL.revokeObjectURL(url);exportCSV();renderBackupStatusV6();toast('💾 Popoln V6 backup prenesen','ok');return true;};

/* ---------- Self tests ---------- */
async function runSelfTestsV6(silent=false){const el=document.getElementById('v6-test-results'),status=document.getElementById('v6-test-status');if(el&&!silent)el.innerHTML='<div style="font-size:11px;color:var(--text3);">Preverjam…</div>';if(status){status.textContent='preverjam…';status.className='v6-chip';}const tests=[];const test=async(name,fn)=>{try{const ok=await fn();if(ok===false)throw new Error('pogoj ni izpolnjen');tests.push({name,ok:true,msg:'OK'});}catch(e){tests.push({name,ok:false,msg:e.message||String(e)});}};
  await test('Session uporablja zaklenjen kontekst',()=>{const active=activeDayIndicesV6()[0]||0,r=buildImmutableSessionRecord(new Date('2026-01-01T10:00:00'),new Date('2026-01-01T11:00:00'),60,{cycle:99,weekIdx:0,dayIdx:active,profile:getActiveProfile()});return r.cycle===99&&r.dayIdx===active;});
  await test('Backup shema 6 je veljavna',async()=>validateBackupP1(JSON.parse(await buildBackupJSON(false))).ok);
  await test('Progresija poveča dobro izvedbo',()=>evaluateProgressionV6([{topKg:100,e1rm:117,completion:1,avgRpe:8,maxRpe:8,pain:0,sets:[{reps:5}]},{topKg:100,e1rm:116,completion:1,avgRpe:8,pain:0,sets:[{reps:5}]}],{increment:2.5,name:'Bench',exercise:{m:true}}).action==='increase');
  await test('Bolečina blokira povečanje',()=>evaluateProgressionV6([{topKg:100,e1rm:117,completion:1,avgRpe:7,maxRpe:7,pain:6,sets:[{reps:5}]}],{increment:2.5,name:'Bench',exercise:{m:true}}).action==='reduce');
  await test('Pametni timer podaljša težak glavni set',()=>smartRestFromMetaV6({defaultSec:120,category:'main',rpe:9.5,reps:3})>=240);
  await test('Program ima aktiven dan',()=>activeDayIndicesV6().length>0);
  await test('Quick parser sprejme 120x5@8',()=>{const p=parseQuickSetV6('120x5@8');return p&&p.kg===120&&p.reps===5&&p.rpe===8;});
  await test('AI modul ni prisoten',()=>!document.getElementById('ai-chat')&&!localStorage.getItem('wt_ai_key'));
  const passed=tests.filter(x=>x.ok).length,allOk=passed===tests.length;if(el)el.innerHTML=tests.map(t=>`<div class="v6-test-row ${t.ok?'pass':'fail'}"><span>${safeHtml(t.name)}</span><span>${t.ok?'✓':'✗ '+safeHtml(t.msg)}</span></div>`).join('')+`<div style="font-size:11px;margin-top:.6rem;color:${allOk?'var(--green-text)':'var(--red-text)'};">${passed}/${tests.length} testov uspešnih</div>`;if(status){status.textContent=`${passed}/${tests.length} ${allOk?'OK':'napaka'}`;status.className='v6-chip '+(allOk?'good':'bad');}localStorage.setItem('wt_v6_last_test',JSON.stringify({date:new Date().toISOString(),pass:passed,total:tests.length}));return {passed,total:tests.length,ok:allOk};}

/* ---------- Wrappers for page/profile/day ---------- */
const _showDayV5=showDay;showDay=function(idx){applyProgramStateV6();const active=activeDayIndicesV6();if(!active.includes(idx))idx=active[0]??0;const r=_showDayV5(idx);renderDayTabsV6();return r;};
const _showPageV5=showPage;showPage=function(p){const r=_showPageV5(p);if(p==='tools'){renderV6Settings();renderBackupStatusV6();renderBackupList();}if(p==='gymlog')renderStagnationAlertsV6();return r;};
const _switchProfileV5=switchProfile;switchProfile=function(p){const r=_switchProfileV5(p);applyProgramStateV6(p);ensureDayLists();renderDayTabsV6();if(!stRun)showDay(activeDayIndicesV6()[0]||0);return r;};
const _clearAllV5=clearAll;clearAll=async function(){const r=await _clearAllV5();Object.values(V6_KEYS).forEach(k=>localStorage.removeItem(k));return r;};

/* Apply profile customizations before normal V5 init runs. */
applyProgramStateV6();

/* === V10 TIMER + RPE + FOCUS + BATTERY (release 1.0.40) === */
(function(){
  'use strict';
  if(window.WTFocusPatchV10)return;

  const PATCH_VERSION='1.0.40';
  const draftByKeyV10=new Map();
  const busyKeysV10=new Set();
  let observerV10=null;
  let renderPendingV10=false;
  let timerFinishedUntilV10=0;
  let batchPersistDepthV10=0;

  const CP1252_SPECIAL_V10=new Map([
    [0x20ac,0x80],[0x201a,0x82],[0x0192,0x83],[0x201e,0x84],
    [0x2026,0x85],[0x2020,0x86],[0x2021,0x87],[0x02c6,0x88],
    [0x2030,0x89],[0x0160,0x8a],[0x2039,0x8b],[0x0152,0x8c],
    [0x017d,0x8e],[0x2018,0x91],[0x2019,0x92],[0x201c,0x93],
    [0x201d,0x94],[0x2022,0x95],[0x2013,0x96],[0x2014,0x97],
    [0x02dc,0x98],[0x2122,0x99],[0x0161,0x9a],[0x203a,0x9b],
    [0x0153,0x9c],[0x017e,0x9e],[0x0178,0x9f]
  ]);

  function suspiciousCountV10(value){
    return (String(value||'').match(/[\u00c2\u00c3\u00c4\u00c5\u00e2]/g)||[]).length;
  }

  function decodeMojibakeV10(value){
    const source=String(value??'');
    if(!source||suspiciousCountV10(source)===0||typeof TextDecoder==='undefined'){
      return source;
    }

    const bytes=[];
    for(const char of source){
      const code=char.codePointAt(0);
      if(code<=0xff){
        bytes.push(code);
      }else if(CP1252_SPECIAL_V10.has(code)){
        bytes.push(CP1252_SPECIAL_V10.get(code));
      }else{
        return source;
      }
    }

    try{
      const decoded=new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(bytes));
      return suspiciousCountV10(decoded)<suspiciousCountV10(source)?decoded:source;
    }catch(error){
      return source;
    }
  }

  function repairElementV10(root){
    if(!root)return;

    if(root.nodeType===Node.TEXT_NODE){
      const fixed=decodeMojibakeV10(root.nodeValue);
      if(fixed!==root.nodeValue)root.nodeValue=fixed;
      return;
    }

    if(root.nodeType!==Node.ELEMENT_NODE&&root.nodeType!==Node.DOCUMENT_FRAGMENT_NODE){
      return;
    }

    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const textNodes=[];
    while(walker.nextNode())textNodes.push(walker.currentNode);

    textNodes.forEach(node=>{
      const fixed=decodeMojibakeV10(node.nodeValue);
      if(fixed!==node.nodeValue)node.nodeValue=fixed;
    });

    const elements=[];
    if(root.nodeType===Node.ELEMENT_NODE)elements.push(root);
    root.querySelectorAll?.('[title],[placeholder],[aria-label]').forEach(el=>elements.push(el));

    elements.forEach(element=>{
      ['title','placeholder','aria-label'].forEach(name=>{
        if(!element.hasAttribute?.(name))return;
        const current=element.getAttribute(name);
        const fixed=decodeMojibakeV10(current);
        if(fixed!==current)element.setAttribute(name,fixed);
      });
    });
  }

  function decimalV10(value){
    return String(value??'').trim().replace(',','.');
  }

  function displayNumberV10(value){
    const number=Number(value);
    if(!Number.isFinite(number))return'';
    return Number.isInteger(number)
      ?String(number)
      :String(number).replace('.',',');
  }

  function parseKeyV10(key){
    const match=String(key||'').match(/^c(\d+)w(\d+)d(\d+)e(\d+)$/);
    return match
      ?{
          cycle:Number(match[1]),
          week:Number(match[2]),
          day:Number(match[3]),
          exercise:Number(match[4])
        }
      :null;
  }

  function cardKeyV10(card){
    return String(card?.id||'').replace(/^ec-/,'');
  }

  function exerciseCardsV10(){
    return Array.from(document.querySelectorAll('#day-content .exc'));
  }

  function targetRpeV10(parsed){
    const exercise=PROG.days[parsed.day]?.ex?.[parsed.exercise];
    const direct=Number(exercise?.targetRpe);
    if(Number.isFinite(direct)&&direct>=5&&direct<=10)return direct;

    const label=String(PROG.weeks?.[parsed.week]?.rpe||'');
    const match=label.match(/(\d+(?:[.,]\d+)?)/);
    const fromLabel=match?Number(match[1].replace(',','.')):NaN;
    return Number.isFinite(fromLabel)&&fromLabel>=5&&fromLabel<=10
      ?fromLabel
      :8;
  }

  function pendingStateV10(key,parsed){
    const all=getSets();
    const sets=Array.isArray(all[key])?all[key]:[];
    const weekPlan=PROG.weeks[parsed.week];
    const total=Math.max(
      1,
      Number(nsf(parsed.day,parsed.exercise,weekPlan,key))||1
    );

    let setIndex=0;
    while(setIndex<total&&sets[setIndex]?.done)setIndex+=1;

    if(setIndex>=total){
      return{
        complete:true,
        setIndex,
        total,
        kg:'',
        reps:'',
        rpe:''
      };
    }

    const current=sets[setIndex]||{};
    const previous=[...sets.slice(0,setIndex)]
      .reverse()
      .find(set=>set&&set.kg!==''&&set.kg!==undefined&&set.reps);

    const draft=draftByKeyV10.get(key);
    const useDraft=draft&&draft.setIndex===setIndex;

    return{
      complete:false,
      setIndex,
      total,
      kg:useDraft
        ?draft.kg
        :(current.kg!==''&&current.kg!==undefined
          ?String(current.kg)
          :String(previous?.kg??'')),
      reps:useDraft
        ?draft.reps
        :(current.reps!==''&&current.reps!==undefined
          ?String(current.reps)
          :String(previous?.reps??'')),
      rpe:useDraft
        ?draft.rpe
        :(current.rpe!==undefined&&current.rpe!==null&&current.rpe!==''
          ?String(current.rpe)
          :String(targetRpeV10(parsed)))
    };
  }

  function storeDraftFromBoxV10(box){
    const key=box?.dataset?.key;
    const setIndex=Number(box?.dataset?.setIndex);
    if(!key||!Number.isInteger(setIndex))return;

    draftByKeyV10.set(key,{
      setIndex,
      kg:box.querySelector('[data-field="kg"]')?.value??'',
      reps:box.querySelector('[data-field="reps"]')?.value??'',
      rpe:box.querySelector('[data-field="rpe"]')?.value??''
    });
  }

  function captureAllDraftsV10(){
    document.querySelectorAll('.compact-log-box-v10').forEach(storeDraftFromBoxV10);
  }

  function syncCompactToRowV10(box,field){
    const key=box?.dataset?.key;
    const setIndex=Number(box?.dataset?.setIndex);
    if(!key||!Number.isInteger(setIndex))return;

    const row=document.getElementById(`row-${key}-${setIndex}`);
    if(!row)return;

    if(field==='kg'){
      const input=row.querySelector('.wi');
      if(input)input.value=box.querySelector('[data-field="kg"]')?.value??'';
    }

    if(field==='reps'){
      const input=row.querySelector('.ri');
      if(input)input.value=box.querySelector('[data-field="reps"]')?.value??'';
    }
  }

  function syncRowToCompactV10(target){
    const row=target?.closest?.('tr[id^="row-"]');
    if(!row)return;

    const match=String(row.id).match(/^row-(c\d+w\d+d\d+e\d+)-(\d+)$/);
    if(!match)return;

    const key=match[1];
    const setIndex=Number(match[2]);
    const parsed=parseKeyV10(key);
    if(!parsed)return;

    const state=pendingStateV10(key,parsed);
    if(state.complete||state.setIndex!==setIndex)return;

    const box=document.querySelector(`.compact-log-box-v10[data-key="${key}"]`);
    if(!box)return;

    const kg=row.querySelector('.wi')?.value??'';
    const reps=row.querySelector('.ri')?.value??'';
    const kgInput=box.querySelector('[data-field="kg"]');
    const repsInput=box.querySelector('[data-field="reps"]');

    if(kgInput&&document.activeElement!==kgInput)kgInput.value=kg;
    if(repsInput&&document.activeElement!==repsInput)repsInput.value=reps;

    storeDraftFromBoxV10(box);
  }

  function loggerMarkupV10(key,state){
    const disabled=state.complete?' disabled':'';
    const setLabel=state.complete
      ?'Kon\u010dano'
      :`Set ${state.setIndex+1}/${state.total}`;

    return`
      <div class="compact-set-label-v10">${setLabel}</div>
      <label class="compact-field-v10">
        <span>KG</span>
        <input data-field="kg" type="text" inputmode="decimal"
          autocomplete="off" value="${safeHtml(state.kg)}"${disabled}>
      </label>
      <label class="compact-field-v10">
        <span>PON</span>
        <input data-field="reps" type="text" inputmode="numeric"
          autocomplete="off" value="${safeHtml(state.reps)}"${disabled}>
      </label>
      <label class="compact-field-v10">
        <span>RPE
          <button type="button" class="rpe-help-v10"
            aria-label="RPE legenda">?</button>
        </span>
        <input data-field="rpe" type="text" inputmode="decimal"
          autocomplete="off" value="${safeHtml(state.rpe)}"${disabled}>
      </label>
      <button type="button" class="compact-log-v10"${disabled}>
        ${state.complete?'\u2713':'LOG'}
      </button>
      <div class="rpe-legend-v10" hidden>
        <strong>RPE legenda</strong>
        <div><b>10</b> maksimum \u00b7 0 ponovitev v rezervi</div>
        <div><b>9\u20139,5</b> pribli\u017eno 0\u20131 v rezervi</div>
        <div><b>8\u20138,5</b> pribli\u017eno 1\u20132 v rezervi</div>
        <div><b>7</b> pribli\u017eno 3 v rezervi</div>
        <div><b>6</b> pribli\u017eno 4 v rezervi</div>
        <div><b>5</b> zelo lahko oziroma ogrevanje</div>
      </div>`;
  }

  function installLoggerV10(card,force){
    const key=cardKeyV10(card);
    const parsed=parseKeyV10(key);
    const box=card?.querySelector('.quick-log-v6');
    if(!parsed||!box)return;

    const state=pendingStateV10(key,parsed);
    const signature=`${key}:${state.setIndex}:${state.total}:${state.complete?'1':'0'}`;

    if(
      !force&&
      box.classList.contains('compact-log-box-v10')&&
      box.dataset.signature===signature
    ){
      return;
    }

    if(box.classList.contains('compact-log-box-v10')){
      storeDraftFromBoxV10(box);
    }

    const freshState=pendingStateV10(key,parsed);
    box.className='quick-log-v6 compact-log-box-v10';
    box.dataset.key=key;
    box.dataset.setIndex=String(freshState.setIndex);
    box.dataset.signature=
      `${key}:${freshState.setIndex}:${freshState.total}:${freshState.complete?'1':'0'}`;
    box.innerHTML=loggerMarkupV10(key,freshState);

    const help=box.querySelector('.rpe-help-v10');
    const legend=box.querySelector('.rpe-legend-v10');
    const button=box.querySelector('.compact-log-v10');

    help?.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      if(legend)legend.hidden=!legend.hidden;
    });

    box.querySelectorAll('input').forEach(input=>{
      input.addEventListener('input',()=>{
        storeDraftFromBoxV10(box);
        syncCompactToRowV10(box,input.dataset.field);
      });

      input.addEventListener('change',()=>{
        storeDraftFromBoxV10(box);
        syncCompactToRowV10(box,input.dataset.field);
      });

      input.addEventListener('keydown',event=>{
        if(event.key!=='Enter')return;
        event.preventDefault();
        logCompactSetV10(box);
      });
    });

    button?.addEventListener('click',()=>{
      logCompactSetV10(box);
    });
  }

  async function logCompactSetV10(box){
    const key=box?.dataset?.key;
    const parsed=parseKeyV10(key);
    if(!key||!parsed||busyKeysV10.has(key))return;

    const state=pendingStateV10(key,parsed);
    if(state.complete)return;

    const boxSetIndex=Number(box.dataset.setIndex);
    if(boxSetIndex!==state.setIndex){
      installLoggerV10(document.getElementById('ec-'+key),true);
      toast('Set se je spremenil. Preveri trenutni vnos.','err');
      return;
    }

    const kgInput=box.querySelector('[data-field="kg"]');
    const repsInput=box.querySelector('[data-field="reps"]');
    const rpeInput=box.querySelector('[data-field="rpe"]');
    const button=box.querySelector('.compact-log-v10');

    const kgRaw=decimalV10(kgInput?.value);
    const repsRaw=decimalV10(repsInput?.value);
    const rpeRaw=decimalV10(rpeInput?.value);
    const kg=Number(kgRaw);
    const reps=Number(repsRaw);
    const rpe=Number(rpeRaw);

    if(kgRaw===''||!Number.isFinite(kg)||kg<0){
      toast('Vnesi veljavne kilograme.','err');
      kgInput?.focus();
      return;
    }

    if(
      repsRaw===''||
      !Number.isFinite(reps)||
      !Number.isInteger(reps)||
      reps<1
    ){
      toast('Vnesi veljavne ponovitve.','err');
      repsInput?.focus();
      return;
    }

    if(
      rpeRaw===''||
      !Number.isFinite(rpe)||
      rpe<5||
      rpe>10||
      Math.abs(rpe*2-Math.round(rpe*2))>.001
    ){
      toast('RPE mora biti 5\u201310 v koraku 0,5.','err');
      rpeInput?.focus();
      return;
    }

    busyKeysV10.add(key);
    batchPersistDepthV10+=1;
    window.__WT_BATCH_SET_LOG_V10__=true;
    if(button){
      button.disabled=true;
      button.textContent='...';
    }

    draftByKeyV10.set(key,{
      setIndex:state.setIndex,
      kg:kgInput.value,
      reps:repsInput.value,
      rpe:rpeInput.value
    });

    try{
      const exercise=PROG.days[parsed.day]?.ex?.[parsed.exercise];
      const isBarbell=BARBELL_EX.includes(exercise?.n);

      await sv(
        key,
        state.setIndex,
        'kg',
        kgRaw,
        parsed.day,
        parsed.exercise,
        parsed.cycle,
        isBarbell?1:0
      );

      await sv(
        key,
        state.setIndex,
        'reps',
        String(reps),
        parsed.day,
        parsed.exercise,
        parsed.cycle,
        0
      );

      setRpe(
        key,
        state.setIndex,
        Math.round(rpe*2)/2,
        parsed.day,
        parsed.exercise,
        parsed.cycle
      );

      const saved=getSets()[key]?.[state.setIndex];
      if(!saved?.done){
        tgSet(
          key,
          state.setIndex,
          parsed.day,
          parsed.exercise,
          parsed.cycle
        );
      }

      draftByKeyV10.delete(key);
      toast(
        `\u2713 ${displayNumberV10(kg)}kg \u00d7 ${reps} @ RPE ${displayNumberV10(rpe)}`,
        'ok'
      );
    }catch(error){
      console.warn('WT V10 compact log',error);
      toast('Set ni bil shranjen.','err');
    }finally{
      batchPersistDepthV10=Math.max(0,batchPersistDepthV10-1);
      window.__WT_BATCH_SET_LOG_V10__=batchPersistDepthV10>0;
      busyKeysV10.delete(key);

      if(batchPersistDepthV10===0){
        try{
          persistSessionDraftV10Base();
        }catch(error){}
      }

      queueRenderV10(20,true);
    }
  }

  function progressionNodeV10(card){
    let node=card.querySelector('.prog-dir-v10');
    if(node)return node;

    node=card.querySelector('.prog-v6');
    if(!node)return null;

    const text=node.textContent.replace(/\s+/g,' ').trim();
    const down=node.classList.contains('reduce')||node.classList.contains('deload');
    const up=node.classList.contains('increase');
    const symbol=up?'\u2191':down?'\u2193':'=';
    const cls=up?'up':down?'down':'same';

    node.className='prog-dir-v10 '+cls;
    node.title=text;
    node.setAttribute('aria-label',text);
    node.innerHTML='<span>'+symbol+'</span>';
    return node;
  }

  function styleActionControlV10(control){
    if(control.classList.contains('swbtn')){
      control.classList.add('swap-icon-v10');
      control.textContent='\u21c4';
      control.title='Zamenjave';
      control.setAttribute('aria-label','Zamenjave');
    }

    if(control.classList.contains('ex-menu-btn')){
      control.classList.add('menu-icon-v10');
      control.title='Ve\u010d mo\u017enosti';
      control.setAttribute('aria-label','Ve\u010d mo\u017enosti');
      control.innerHTML=
        '<span class="menu-lines-v10" aria-hidden="true">'+
          '<i></i><i></i><i></i>'+
        '</span>';
    }
  }

  function arrangeActionsV10(card){
    const quick=card.querySelector('.quick-log-v6');
    const table=card.querySelector('table.st');
    if(!quick&&!table)return;

    let toolbar=card.querySelector('.exercise-actions-v10');
    if(!toolbar){
      toolbar=document.createElement('div');
      toolbar.className='exercise-actions-v10';
      const anchor=quick||table;
      anchor.parentNode.insertBefore(toolbar,anchor);
    }

    const progression=progressionNodeV10(card);
    if(progression&&progression.parentNode!==toolbar){
      toolbar.appendChild(progression);
    }

    const badges=card.querySelector('.bdg');
    if(badges){
      Array.from(badges.children)
        .filter(element=>
          element.matches('.b,.restbtn,.swbtn,.ex-menu-btn,.toggle-fold')
        )
        .forEach(control=>{
          styleActionControlV10(control);
          toolbar.appendChild(control);
        });

      badges.classList.add('moved-v10');
    }

    card.querySelectorAll('.swbtn:not(.swap-icon-v10)').forEach(control=>{
      styleActionControlV10(control);
      toolbar.appendChild(control);
    });

    card.querySelectorAll('.ex-menu-btn:not(.menu-icon-v10)').forEach(control=>{
      styleActionControlV10(control);
      toolbar.appendChild(control);
    });
  }

  function ensureFocusNavV10(){
    let bar=document.getElementById('focus-nav-v10');
    if(bar)return bar;

    bar=document.createElement('div');
    bar.id='focus-nav-v10';
    bar.className='focus-nav-v10';
    bar.innerHTML=
      '<button type="button" class="focus-arrow-v10 prev" aria-label="Prej\u0161nja vaja">\u2039</button>'+
      '<div class="focus-label-v10">'+
        '<strong id="focus-position-v10">1/1</strong>'+
        '<span id="focus-name-v10">Vaja</span>'+
      '</div>'+
      '<button type="button" class="focus-arrow-v10 next" aria-label="Naslednja vaja">\u203a</button>';

    document.body.appendChild(bar);

    bar.querySelector('.prev')?.addEventListener('click',()=>{
      moveGymFocusV10(-1);
    });

    bar.querySelector('.next')?.addEventListener('click',()=>{
      moveGymFocusV10(1);
    });

    return bar;
  }

  function stableFocusKeysV10(){
    return exerciseCardsV10()
      .map(card=>cardKeyV10(card))
      .filter(Boolean);
  }

  function activeFocusKeyV10(){
    const keys=stableFocusKeysV10();
    if(!keys.length)return'';

    const stored=localStorage.getItem('wt_active_ex')||'';
    return keys.includes(stored)?stored:keys[0];
  }

  function updateFocusNavV10(){
    const bar=ensureFocusNavV10();
    const mode=typeof getGymMode==='function'&&getGymMode();
    const keys=stableFocusKeysV10();

    bar.classList.toggle('on',!!mode&&keys.length>0);
    if(!mode||!keys.length)return;

    const key=activeFocusKeyV10();
    const index=Math.max(0,keys.indexOf(key));
    const card=document.getElementById('ec-'+key);
    const name=card?.querySelector('.ex-name')?.textContent?.trim()||'Vaja';

    const position=bar.querySelector('#focus-position-v10');
    const nameElement=bar.querySelector('#focus-name-v10');
    const previous=bar.querySelector('.prev');
    const next=bar.querySelector('.next');

    if(position)position.textContent=`${index+1}/${keys.length}`;
    if(nameElement)nameElement.textContent=name;
    if(previous)previous.disabled=index<=0;
    if(next)next.disabled=index>=keys.length-1;
  }

  function setGymFocusV10(key,scroll){
    const cards=exerciseCardsV10();
    if(!cards.length)return;

    let active=cards.find(card=>cardKeyV10(card)===key);
    if(!active)active=cards[0];

    const safeKey=cardKeyV10(active);
    if(!safeKey)return;

    localStorage.setItem('wt_active_ex',safeKey);

    const gymMode=typeof getGymMode==='function'&&getGymMode();
    cards.forEach(card=>{
      const selected=card===active;
      card.classList.toggle('active-ex',selected);

      if(gymMode){
        card.style.setProperty('display',selected?'block':'none','important');
      }else{
        card.style.removeProperty('display');
      }
    });

    try{
      if(typeof updateGymFocusBar==='function')updateGymFocusBar(safeKey);
    }catch(error){}

    updateFocusNavV10();

    if(scroll){
      window.setTimeout(()=>{
        active.scrollIntoView({behavior:'smooth',block:'start'});
      },40);
    }
  }

  function moveGymFocusV10(direction){
    const keys=stableFocusKeysV10();
    if(!keys.length)return;

    const current=activeFocusKeyV10();
    let index=keys.indexOf(current);
    if(index<0)index=0;

    const nextIndex=Math.max(
      0,
      Math.min(keys.length-1,index+Number(direction||0))
    );

    setGymFocusV10(keys[nextIndex],nextIndex!==index);
  }

  function refreshGymTargetV10(){
    const keys=stableFocusKeysV10();
    if(!keys.length){
      localStorage.removeItem('wt_active_ex');
      exerciseCardsV10().forEach(card=>{
        card.classList.remove('active-ex');
        card.style.removeProperty('display');
      });
      updateFocusNavV10();
      return;
    }

    const stored=localStorage.getItem('wt_active_ex')||'';
    const key=keys.includes(stored)?stored:keys[0];
    setGymFocusV10(key,false);
  }

  function syncFocusV10(){
    const cards=exerciseCardsV10();
    if(!cards.length){
      updateFocusNavV10();
      return;
    }

    if(!(typeof getGymMode==='function'&&getGymMode())){
      cards.forEach(card=>card.style.removeProperty('display'));
      updateFocusNavV10();
      return;
    }

    setGymFocusV10(activeFocusKeyV10(),false);
  }

  function ensureGlobalTimerV10(){
    let element=document.getElementById('wt-global-timer-v10');
    if(element)return element;

    const sessionBar=document.querySelector('#page-workout .stb');
    if(!sessionBar)return null;

    element=document.createElement('div');
    element.id='wt-global-timer-v10';
    element.className='global-timer-v10';
    element.innerHTML=
      '<strong id="wt-global-time-v10">\u2014</strong>'+
      '<span id="wt-global-meta-v10">odmor</span>'+
      '<button type="button" data-action="minus">\u221230</button>'+
      '<button type="button" data-action="pause">\u2161</button>'+
      '<button type="button" data-action="plus">+30</button>'+
      '<button type="button" class="stop" data-action="stop">\u00d7</button>';

    sessionBar.insertAdjacentElement('afterend',element);

    element.querySelector('[data-action="minus"]')?.addEventListener('click',()=>{
      adjustTimerV6(-30);
    });

    element.querySelector('[data-action="plus"]')?.addEventListener('click',()=>{
      adjustTimerV6(30);
    });

    element.querySelector('[data-action="pause"]')?.addEventListener('click',()=>{
      const timer=currentTimerV6();
      if(timer)pauseResumeTimerV6(timer.key);
    });

    element.querySelector('[data-action="stop"]')?.addEventListener('click',()=>{
      const timer=currentTimerV6();
      if(timer)stopT(timer.key);
    });

    return element;
  }

  function remainingTimerSecondsV10(timer){
    if(!timer)return 0;
    return timer.paused
      ?Math.max(0,Number(timer.remainingSec)||0)
      :Math.max(0,Math.ceil((Number(timer.endTs)-Date.now())/1000));
  }

  function renderGlobalTimerV10(){
    const element=ensureGlobalTimerV10();
    if(!element)return;

    const timer=currentTimerV6();
    const time=element.querySelector('#wt-global-time-v10');
    const meta=element.querySelector('#wt-global-meta-v10');
    const pause=element.querySelector('[data-action="pause"]');

    if(timer){
      const remaining=remainingTimerSecondsV10(timer);
      element.classList.add('on');
      element.classList.remove('finished');

      if(time)time.textContent=timerDisplayV6(remaining);
      if(meta){
        meta.textContent=
          `${timer.paused?'pavza':'odmor'} \u00b7 plan ${fmtRest(Number(timer.plannedSec)||0)}`;
      }
      if(pause)pause.textContent=timer.paused?'\u25b6':'\u2161';
      return;
    }

    if(timerFinishedUntilV10>Date.now()){
      element.classList.add('on','finished');
      if(time)time.textContent='KONEC';
      if(meta)meta.textContent='naslednji set';
      return;
    }

    element.classList.remove('on','finished');
  }

  function webScheduleV10(seconds){
    if(window.__WT_ANDROID_APP__)return;
    cancelScheduledNotification();
    scheduleNotification(seconds);
  }

  function webCancelV10(){
    if(window.__WT_ANDROID_APP__)return;
    cancelScheduledNotification();
  }

  function nativeRescheduleV10(seconds){
    if(!window.__WT_ANDROID_APP__)return;

    const api=window.WTRestNotifications;
    if(!api||typeof api.reschedule!=='function')return;

    Promise.resolve(api.reschedule(seconds)).catch(error=>{
      console.warn('Native timer reschedule failed',error);
    });
  }

  function nativeCancelV10(){
    if(!window.__WT_ANDROID_APP__)return;

    const api=window.WTRestNotifications;
    if(!api||typeof api.cancel!=='function')return;

    Promise.resolve(api.cancel()).catch(error=>{
      console.warn('Native timer cancel failed',error);
    });
  }

  function finishTimerV10(timer,foregroundAlert){
    clearTimerIntervalsV6();
    localStorage.removeItem(LS_TIMER);
    webCancelV10();

    try{
      logRestV6(timer,'completed');
    }catch(error){}

    timerFinishedUntilV10=Date.now()+3500;
    renderGlobalTimerV10();

    if(foregroundAlert&&!document.hidden){
      alertEnd(timer.key);
    }

    try{
      renderV6Settings();
    }catch(error){}
  }

  tickTimerV6=function(timer){
    clearTimerIntervalsV6();
    renderGlobalTimerV10();

    if(!timer||timer.paused||document.hidden)return;

    const run=()=>{
      const current=currentTimerV6();
      if(!current||current.id!==timer.id){
        clearTimerIntervalsV6();
        renderGlobalTimerV10();
        return;
      }

      const remaining=remainingTimerSecondsV10(current);
      renderGlobalTimerV10();

      if(
        remaining<=15&&
        remaining>0&&
        getV6Settings().restWarning&&
        !current.warned15
      ){
        current.warned15=true;
        saveTimerV6(current);
        if(navigator.vibrate)navigator.vibrate(80);
      }

      if(remaining<=0){
        finishTimerV10(current,true);
      }
    };

    run();

    const active=currentTimerV6();
    if(active&&active.id===timer.id&&!document.hidden){
      TM[timer.key]=setInterval(run,1000);
    }
  };

  startT=function(key,seconds){
    const safeSeconds=Math.max(1,Math.round(Number(seconds)||0));
    clearTimerIntervalsV6();
    webCancelV10();

    const timer={
      id:'rest_'+Date.now(),
      key,
      endTs:Date.now()+safeSeconds*1000,
      startedTs:Date.now(),
      plannedSec:safeSeconds,
      remainingSec:safeSeconds,
      paused:false,
      warned15:false
    };

    saveTimerV6(timer);
    webScheduleV10(safeSeconds);
    tickTimerV6(timer);
  };

  stopT=function(key){
    const timer=currentTimerV6();
    if(timer){
      try{
        logRestV6(timer,'stopped');
      }catch(error){}
    }

    clearTimerIntervalsV6();
    localStorage.removeItem(LS_TIMER);
    webCancelV10();
    timerFinishedUntilV10=0;

    const bar=document.getElementById('tb-'+key);
    if(bar)bar.classList.remove('on','flash');

    const count=document.getElementById('tc-'+key);
    if(count)count.textContent='\u2014';

    renderGlobalTimerV10();

    try{
      renderV6Settings();
    }catch(error){}
  };

  adjustTimerV6=function(delta){
    const timer=currentTimerV6();
    if(!timer)return;

    const now=Date.now();
    const change=Number(delta)||0;

    if(timer.paused){
      timer.remainingSec=Math.max(0,(Number(timer.remainingSec)||0)+change);
    }else{
      timer.endTs=Math.max(now,timer.endTs+change*1000);
    }

    timer.plannedSec=Math.max(0,(Number(timer.plannedSec)||0)+change);
    saveTimerV6(timer);

    const remaining=remainingTimerSecondsV10(timer);
    if(timer.paused){
      webCancelV10();
      nativeCancelV10();
    }else{
      webScheduleV10(remaining);
      nativeRescheduleV10(remaining);
    }

    tickTimerV6(timer);
  };

  pauseResumeTimerV6=function(key){
    const timer=currentTimerV6();
    if(!timer||timer.key!==key)return;

    if(timer.paused){
      timer.paused=false;
      timer.endTs=Date.now()+Math.max(0,Number(timer.remainingSec)||0)*1000;
      saveTimerV6(timer);

      const remaining=remainingTimerSecondsV10(timer);
      webScheduleV10(remaining);
      nativeRescheduleV10(remaining);
    }else{
      timer.remainingSec=remainingTimerSecondsV10(timer);
      timer.paused=true;
      saveTimerV6(timer);
      webCancelV10();
      nativeCancelV10();
    }

    tickTimerV6(timer);
  };

  restoreTimer=function(){
    if(window.v6RecoveryPending&&!stRun)return;

    const timer=currentTimerV6();
    if(!timer){
      renderGlobalTimerV10();
      return;
    }

    if(!timer.paused&&remainingTimerSecondsV10(timer)<=0){
      clearTimerIntervalsV6();
      localStorage.removeItem(LS_TIMER);

      try{
        logRestV6(timer,'completed');
      }catch(error){}

      timerFinishedUntilV10=Date.now()+2500;
      renderGlobalTimerV10();
      return;
    }

    tickTimerV6(timer);
  };

  const persistSessionDraftV10Base=persistSessionDraftV6;
  persistSessionDraftV6=function(){
    if(batchPersistDepthV10>0||window.__WT_BATCH_SET_LOG_V10__)return;
    return persistSessionDraftV10Base.apply(this,arguments);
  };

  function processCardsV10(force){
    document.querySelectorAll('#day-content .exc').forEach(card=>{
      arrangeActionsV10(card);
      installLoggerV10(card,!!force);
    });

    syncFocusV10();
    renderGlobalTimerV10();
  }

  function queueRenderV10(delay,force){
    if(renderPendingV10)return;
    renderPendingV10=true;

    window.setTimeout(()=>{
      renderPendingV10=false;
      processCardsV10(!!force);
    },Number.isFinite(delay)?delay:0);
  }

  function wrapRenderV10(name,force){
    const original=window[name];
    if(typeof original!=='function'||original.__wtV10Wrapped)return;

    function wrapped(){
      captureAllDraftsV10();
      const result=original.apply(this,arguments);
      queueRenderV10(0,!!force);
      return result;
    }

    wrapped.__wtV10Wrapped=true;
    wrapped.__wtV10Original=original;
    window[name]=wrapped;
  }

  function installRowSyncV10(){
    const root=document.getElementById('day-content');
    if(!root||root.dataset.v10RowSync==='1')return;

    root.dataset.v10RowSync='1';

    root.addEventListener('input',event=>{
      if(event.target.matches('.wi,.ri')){
        syncRowToCompactV10(event.target);
      }
    });

    root.addEventListener('change',event=>{
      if(event.target.matches('.wi,.ri')){
        syncRowToCompactV10(event.target);
      }
    });

    root.addEventListener('click',event=>{
      if(!event.target.closest('.stp-btn'))return;
      window.setTimeout(()=>{
        syncRowToCompactV10(event.target);
      },0);
    });
  }

  function installObserverV10(){
    const root=document.getElementById('day-content');
    if(!root||observerV10)return;

    observerV10=new MutationObserver(mutations=>{
      let needsRender=false;

      mutations.forEach(mutation=>{
        mutation.addedNodes.forEach(node=>{
          repairElementV10(node);

          if(
            node.nodeType===Node.ELEMENT_NODE&&
            (
              node.matches?.('.exc,.quick-log-v6')||
              node.querySelector?.('.exc,.quick-log-v6')
            )
          ){
            needsRender=true;
          }
        });
      });

      if(needsRender)queueRenderV10(0,false);
    });

    observerV10.observe(root,{
      childList:true,
      subtree:true
    });
  }

  function disconnectObserverV10(){
    if(!observerV10)return;
    observerV10.disconnect();
    observerV10=null;
  }

  function updateKeyboardClassV10(){
    const active=document.activeElement;
    const open=!!(
      active&&
      active.matches?.('input,textarea,select')&&
      active.closest?.('#page-workout')
    );

    document.documentElement.classList.toggle('wt-keyboard-open',open);
  }

  function syncVisibilityV10(){
    if(document.hidden){
      clearTimerIntervalsV6();
      disconnectObserverV10();

      try{
        if(stInt){
          clearInterval(stInt);
          stInt=null;
        }
      }catch(error){}

      return;
    }

    installObserverV10();
    installRowSyncV10();
    restoreTimer();
    processCardsV10(false);

    try{
      if(stRun){
        clearInterval(stInt);
        stInt=setInterval(tickSessionClock,1000);
        tickSessionClock();
      }
    }catch(error){}
  }

  function initializeV10(){
    window.setGymFocus=setGymFocusV10;
    window.moveGymFocus=moveGymFocusV10;
    window.refreshGymTarget=refreshGymTargetV10;

    [
      'showDay',
      'setGymMode',
      'toggleGymMode',
      'tgSet',
      'addSet',
      'removeSet',
      'stepKg',
      'stepReps'
    ].forEach(name=>wrapRenderV10(name,true));

    ensureFocusNavV10();
    ensureGlobalTimerV10();
    installRowSyncV10();
    installObserverV10();

    repairElementV10(document.body);
    processCardsV10(true);
    restoreTimer();

    document.addEventListener('focusin',updateKeyboardClassV10);
    document.addEventListener('focusout',()=>{
      window.setTimeout(updateKeyboardClassV10,30);
    });

    document.addEventListener('visibilitychange',syncVisibilityV10);

    window.addEventListener('pageshow',()=>{
      window.setTimeout(()=>{
        installObserverV10();
        processCardsV10(false);
        restoreTimer();
      },60);
    });
  }

  window.logCompactSetV10=logCompactSetV10;
  window.WTFocusPatchV10={
    version:PATCH_VERSION,
    refresh:()=>processCardsV10(true),
    repairText:repairElementV10,
    setFocus:setGymFocusV10,
    moveFocus:moveGymFocusV10,
    focusKeys:stableFocusKeysV10,
    renderTimer:renderGlobalTimerV10
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initializeV10,{once:true});
  }else{
    initializeV10();
  }
})();
/* === V11 MANUAL RPE + STABLE FOCUS DOTS (release 1.0.41) === */
(function(){
  'use strict';
  if(window.WTFocusPatchV11)return;

  const PATCH_VERSION='1.0.41';
  const TOUCHED_PREFIX='wt_v11_rpe_touched_';
  let observerV11=null;
  let renderQueuedV11=false;

  function focusApiV11(){
    return window.WTFocusPatchV10||null;
  }

  function focusKeysV11(){
    const api=focusApiV11();
    if(api&&typeof api.focusKeys==='function'){
      try{return api.focusKeys().filter(Boolean);}catch(error){}
    }
    return Array.from(document.querySelectorAll('#day-content .exc'))
      .map(card=>String(card.id||'').replace(/^ec-/,''))
      .filter(Boolean);
  }

  function activeKeyV11(keys){
    const stored=localStorage.getItem('wt_active_ex')||'';
    return keys.includes(stored)?stored:(keys[0]||'');
  }

  function signatureV11(box){
    return String(box?.dataset?.signature||'');
  }

  function touchedKeyV11(box){
    return TOUCHED_PREFIX+signatureV11(box);
  }

  function prepareManualRpeV11(box){
    if(!box||!box.matches?.('.compact-log-box-v10'))return;
    const input=box.querySelector('[data-field="rpe"]');
    const signature=signatureV11(box);
    if(!input||!signature)return;

    input.placeholder='RPE';
    input.autocomplete='off';

    if(!sessionStorage.getItem(touchedKeyV11(box))&&input.dataset.v11Prepared!==signature){
      input.value='';
      input.dataset.v11Prepared=signature;
      input.dispatchEvent(new Event('input',{bubbles:true}));
    }
  }

  function markRpeTouchedV11(target){
    const input=target?.closest?.('.compact-log-box-v10 [data-field="rpe"]');
    if(!input)return;
    const box=input.closest('.compact-log-box-v10');
    const signature=signatureV11(box);
    if(signature)sessionStorage.setItem(TOUCHED_PREFIX+signature,'1');
  }

  function exerciseCompleteV11(key){
    try{
      if(typeof window.isExercisePending==='function'){
        return !window.isExercisePending(key);
      }
    }catch(error){}

    const card=document.getElementById('ec-'+key);
    if(card?.classList.contains('col-done'))return true;

    try{
      const match=String(key).match(/^c(\d+)w(\d+)d(\d+)e(\d+)$/);
      if(!match||typeof window.getSets!=='function'||typeof window.nsf!=='function')return false;
      const week=Number(match[2]);
      const day=Number(match[3]);
      const exercise=Number(match[4]);
      const program=typeof PROG!=='undefined'?PROG:window.PROG;
      const plan=program?.weeks?.[week];
      if(!plan)return false;
      const total=Math.max(1,Number(window.nsf(day,exercise,plan,key))||1);
      const sets=window.getSets()[key]||[];
      return sets.slice(0,total).length>=total&&sets.slice(0,total).every(set=>set&&set.done);
    }catch(error){
      return false;
    }
  }

  function ensureDotsV11(){
    const bar=document.getElementById('focus-nav-v10');
    if(!bar)return null;
    let dots=bar.querySelector('.focus-dots-v11');
    if(!dots){
      dots=document.createElement('div');
      dots.className='focus-dots-v11';
      dots.setAttribute('aria-label','Napredek vaj');
      bar.insertBefore(dots,bar.firstChild);
    }
    return dots;
  }

  function renderDotsV11(){
    const bar=document.getElementById('focus-nav-v10');
    const dots=ensureDotsV11();
    if(!bar||!dots)return;

    const keys=focusKeysV11();
    const active=activeKeyV11(keys);
    const signature=keys.map(key=>
      key+':'+(exerciseCompleteV11(key)?'1':'0')+':'+(key===active?'1':'0')
    ).join('|');

    if(dots.dataset.signature===signature)return;
    dots.dataset.signature=signature;
    dots.innerHTML='';

    keys.forEach((key,index)=>{
      const button=document.createElement('button');
      const complete=exerciseCompleteV11(key);
      button.type='button';
      button.className='focus-dot-v11 '+(complete?'complete':'pending')+(key===active?' active':'');
      button.setAttribute('aria-label',`Vaja ${index+1}: ${complete?'koncana':'ni koncana'}`);
      button.title=`Vaja ${index+1} - ${complete?'koncana':'ni koncana'}`;
      button.addEventListener('click',()=>{
        const api=focusApiV11();
        if(api&&typeof api.setFocus==='function')api.setFocus(key,true);
        else if(typeof window.setGymFocus==='function')window.setGymFocus(key,true);
        queueRenderV11(0);
      });
      dots.appendChild(button);
    });
  }

  function keepFocusBarVisibleV11(){
    const bar=document.getElementById('focus-nav-v10');
    if(!bar)return;
    const gymMode=typeof window.getGymMode==='function'&&window.getGymMode();
    const hasKeys=focusKeysV11().length>0;
    bar.classList.toggle('on',!!gymMode&&hasKeys);
  }

  function processV11(){
    document.querySelectorAll('.compact-log-box-v10').forEach(prepareManualRpeV11);
    keepFocusBarVisibleV11();
    renderDotsV11();
  }

  function queueRenderV11(delay){
    if(renderQueuedV11)return;
    renderQueuedV11=true;
    window.setTimeout(()=>{
      renderQueuedV11=false;
      processV11();
    },Number.isFinite(delay)?delay:0);
  }

  function wrapV11(name){
    const original=window[name];
    if(typeof original!=='function'||original.__wtV11Wrapped)return;
    function wrapped(){
      const result=original.apply(this,arguments);
      queueRenderV11(0);
      window.setTimeout(processV11,80);
      return result;
    }
    wrapped.__wtV11Wrapped=true;
    wrapped.__wtV11Original=original;
    window[name]=wrapped;
  }

  function installObserverV11(){
    const root=document.getElementById('day-content');
    if(!root||observerV11)return;
    observerV11=new MutationObserver(mutations=>{
      let relevant=false;
      mutations.forEach(mutation=>{
        mutation.addedNodes.forEach(node=>{
          if(node.nodeType!==Node.ELEMENT_NODE)return;
          if(node.matches?.('.compact-log-box-v10,.exc')||node.querySelector?.('.compact-log-box-v10,.exc')){
            relevant=true;
          }
        });
      });
      if(relevant)queueRenderV11(0);
    });
    observerV11.observe(root,{childList:true,subtree:true});
  }

  function initializeV11(){
    ['showDay','setGymMode','toggleGymMode','setGymFocus','moveGymFocus','refreshGymTarget','tgSet','addSet','removeSet']
      .forEach(wrapV11);

    document.addEventListener('input',event=>{
      markRpeTouchedV11(event.target);
      if(event.target?.matches?.('.compact-log-box-v10 [data-field="rpe"]'))queueRenderV11(0);
    },true);

    document.addEventListener('focusout',()=>window.setTimeout(processV11,40),true);
    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden){
        installObserverV11();
        queueRenderV11(0);
      }
    });

    window.visualViewport?.addEventListener('resize',()=>queueRenderV11(0));
    window.visualViewport?.addEventListener('scroll',()=>queueRenderV11(0));

    installObserverV11();
    processV11();
  }

  window.WTFocusPatchV11={
    version:PATCH_VERSION,
    refresh:processV11,
    renderDots:renderDotsV11
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initializeV11,{once:true});
  }else{
    initializeV11();
  }
})();
function renderEx(e,ei,di,wk,cn,isExtra){
  const exKey=sdk(cn,cw,di,ei);
  const n=nsf(di,ei,wk,exKey);
  const all=getSets();
  if(!all[exKey]) all[exKey]=Array.from({length:Math.max(n,5)},()=>({kg:'',reps:'',done:false}));
  while(all[exKey].length<n) all[exKey].push({kg:'',reps:'',done:false});
  saveSets(all);
  const sets=all[exKey],prs=getPRs(),prk=`pr${di}${ei}`,cpr=prs[prk]||0;
  const displayName=e.n; // kanoničen seznam že nosi prikazano ime
  const isSwapped=e.n0?(e.n!==e.n0):false;
  // Prev cycle hint
  let ph='';
  if(cn>1&&!isSwapped){const pp=getPeakForExercise(cn-1,di,ei);if(pp>0)ph=`<div class="ph">Prejšnji cikel peak: ${pp}kg</div>`;}
  // Last session hint (prejšnji teden ali prejšnji cikel) — najbolj koristen za izbiro teže
  let lhHtml='';
  const last=isSwapped?null:getLastSession(di,ei,cn,cw);
  if(last){
    const meta=last.date?` · ${last.date}`:'';
    lhHtml=`<div class="last-hint"><span>↺ Zadnjič: <strong>${last.kg}kg × ${last.reps}</strong></span><span class="lh-meta">T${last.w+1} C${last.c}${meta}</span></div>`;
  }
  // Week suggestion
  let sugHtml='';
  if(e.m&&cw>0){
    const sug=getWeek1Weight(cn,di,ei);
    if(sug>0){
      const sugKg=Math.round(sug*WEEK_PCTS[cw]/2.5)*2.5;
      const pcts=['','90%','82%','62%'];
      const lbls=['','Moderate','Volume','Deload'];
      sugHtml=`<div class="sug-box">💡 ${lbls[cw]} (${pcts[cw]} od T1): <strong>${sugKg}kg</strong></div>`;
    }
  }
  const maxKg=Math.max(0,...sets.map(s=>parseFloat(s.kg)||0));
  const isPR=maxKg>0&&maxKg>cpr;
  const tv=sets.slice(0,n).reduce((s,x)=>(parseFloat(x.kg)||0)*(parseFloat(x.reps)||0)+s,0);
  const isBarbell=BARBELL_EX.includes(e.n);
  const firstKg=parseFloat(sets[0]?.kg)||0;
  let plateHtml='';
  if(isBarbell){
    if(firstKg>0){const pl=calcPlatesFor(firstKg);plateHtml=pl?`<div class="platebox" id="pb-${exKey}"><strong>Vsaka stran:</strong> ${pl.each}<span class="pl-each">Palica ${pl.bar}kg + ${pl.perSide*2}kg = ${pl.total}kg</span></div>`:`<div class="platebox" id="pb-${exKey}">Ni možno sestaviti ${firstKg}kg s trenutnimi ploščami.</div>`;}
    else plateHtml=`<div class="platebox" id="pb-${exKey}" style="color:var(--text3);">Vnesi težo v S1 za prikaz plošč</div>`;
  }
  const rows=Array.from({length:n},(_,si)=>{
    const s=sets[si]||{kg:'',reps:'',done:false};
    const kgVal=parseFloat(s.kg)||0;
    const repsVal=parseFloat(s.reps)||0;
    const isDrop=!!s.drop;
    const isNextSet=!s.done&&sets.slice(0,si).every(x=>x.done);
    const vol=Math.round(kgVal*repsVal);
    const orm=s.kg&&s.reps?Math.round(kgVal*(1+repsVal/30)):'';
    const pls=isBarbell?platesShort(kgVal):{text:'',cls:''};
    const plMini=isBarbell?`<div class="pl-mini ${pls.cls}" id="pl-${exKey}-${si}">${pls.text}</div>`:'';
    const dropMark=isDrop?'<span class="set-type drop">D</span>':'';
    const kgStep=getKgStep();
    const repsStep=getRepsStep();
    const kgInputHtml=`<div class="stp-wrap"><button class="stp-btn" onclick="stepKg('${exKey}',${si},${di},${ei},${cn},-${kgStep},${isBarbell?1:0})">−</button><input class="wi" type="number" inputmode="decimal" placeholder="kg" value="${s.kg}" min="0" step="${kgStep}" onchange="sv('${exKey}',${si},'kg',this.value,${di},${ei},${cn},${isBarbell?1:0})"><button class="stp-btn" onclick="stepKg('${exKey}',${si},${di},${ei},${cn},${kgStep},${isBarbell?1:0})">+</button></div>`;
    const repsInputHtml=`<div class="stp-wrap"><button class="stp-btn" onclick="stepReps('${exKey}',${si},${di},${ei},${cn},-${repsStep})">−</button><input class="ri" type="number" inputmode="numeric" placeholder="pon" value="${s.reps}" min="0" step="${repsStep}" onchange="sv('${exKey}',${si},'reps',this.value,${di},${ei},${cn},0)"><button class="stp-btn" onclick="stepReps('${exKey}',${si},${di},${ei},${cn},${repsStep})">+</button></div>`;
    return `<tr id="row-${exKey}-${si}" class="${isDrop?'is-drop':''}${isNextSet?' next-set':''}"><td class="sn">${si+1}${dropMark}</td><td class="kg-cell">${kgInputHtml}${plMini}</td><td>${repsInputHtml}</td><td class="vc${vol>0?' hv':''}">${vol>0?vol+'kg':''}</td><td class="oc">${orm?orm+'kg':''}</td><td><button class="lb${s.done?' done':''}" onclick="tgSet('${exKey}',${si},${di},${ei},${cn})" oncontextmenu="event.preventDefault();toggleDrop('${exKey}',${si},${di},${ei},${cn})">${s.done?'✓':'Log'}</button></td></tr>`;
  }).join('');
  const baseN=wk.dl?3:(e.m?wk.sM:wk.sA);
  const extra=getExtraSets(exKey);
  const swHasData=SWAPS_DB[e.n];
  // 5/3/1 prescription box (samo bulk profil)
  let p531Html='';
  if(PROG.is531&&e.fl){
    const presc=get531Prescription(e.fl,cw);
    if(presc){
      p531Html=`<div class="p531-box"><div class="p531-title">📋 5/3/1 — ${PROG.weeks[cw].label} teden</div>${presc.map((s,i)=>`<div class="p531-row"><span>Set ${i+1}</span><span class="p531-pct">${s.pct}%</span><strong>${s.kg}kg</strong><span>× ${s.reps}</span></div>`).join('')}<div class="p531-note">Zadnji set "+" = naredi MAX ponovitev (vsaj predpisano).</div></div>`;
    } else {
      p531Html=`<div class="p531-box p531-warn">⚠ Vnesi 1RM za ${e.fl} — Tools → Profil ali preklopi na Bulk.</div>`;
    }
  } else if(PROG.is531&&e.bbb){
    const bbb=getBBBPrescription(e.bbb,e.bbbSets,e.bbbReps);
    if(bbb){
      p531Html=`<div class="p531-box bbb"><div class="p531-title">💪 BBB — volumen</div><div class="p531-row"><strong>${bbb.sets}×${bbb.reps}</strong><span>@ <strong>${bbb.kg}kg</strong> (~50% TM)</span></div></div>`;
    }
  }
  // Preveri če je vaja že v celoti zaključena (samo ob render-u — collapse stanje)
  const isAllDone=sets.length>=n&&sets.slice(0,n).every(s=>s.done);
  const userFold=isFolded(exKey);
  const collapsed=userFold===null?isAllDone:userFold;
  // Summary stats za collapsed view
  const doneSets=sets.filter(s=>s.done&&s.kg&&s.reps);
  const topSet=doneSets.length>0?doneSets.reduce((a,b)=>parseFloat(b.kg)>parseFloat(a.kg)?b:a):null;
  const totalVol=doneSets.reduce((a,b)=>a+(parseFloat(b.kg)||0)*(parseFloat(b.reps)||0),0);
  const summaryHtml=topSet?`<div class="exc-summary"><span class="es-stats">✓ ${doneSets.length}/${n} · top ${topSet.kg}kg×${topSet.reps} · ${Math.round(totalVol)}kg</span><button class="toggle-fold" onclick="toggleFold('${exKey}')">razširi ▾</button></div>`:'';
  const painHtml=renderPainBox(exKey,displayName,di,ei,cn);
  const activeCls=(typeof isActiveGymEx==='function'&&isActiveGymEx(exKey))?' active-ex':'';
  return `<div class="exc${isPR?' pr-card':''}${collapsed?' col-done':''}${activeCls}" id="ec-${exKey}">
    <div class="ex-top">
      <div class="ex-name-wrap"><div class="ex-name" id="exn-${exKey}">${safeHtml(displayName)}</div><button class="info-btn" onclick="toggleExInfo('${exKey}')" title="Opis vaje">ⓘ</button><button class="hist-btn" onclick="openExHistory(${di},${ei})" title="Zgodovina vaje">📊</button></div>
      <div class="sp ${wk.pill}">${n} × ${wk.reps}</div>
    </div>
    ${summaryHtml}
    <div class="ex-body">
    <div class="bdg"><span class="b ${wk.rb}">${wk.rpe}</span>${e.m?'<span class="b mb">Glavna</span>':''}${isExtra?'<span class="b" style="background:var(--blue-bg);color:var(--blue-text);">+ Extra</span>':''}${isPR?'<span class="b prb">PR</span>':''}<button class="restbtn" onclick="startT('${exKey}',${restForEx(e.id,displayName,e.r)})" oncontextmenu="event.preventDefault();editRest('${displayName.replace(/'/g,"\\'")}',${e.r},'${exKey}','${e.id||''}')" title="Dolg pritisk = nastavi počitek">${fmtRest(restForEx(e.id,displayName,e.r))} ▶</button>${isExtra?'':`<button class="swbtn" onclick="toggleSwap('${exKey}')">Zamenjave ▾</button>`}<button class="ex-menu-btn" onclick="toggleExMenu('${exKey}')" title="Več možnosti">⋯</button>${isAllDone?`<button class="toggle-fold" onclick="toggleFold('${exKey}')">skrči ▴</button>`:''}</div>
    <div class="ex-menu" id="exm-${exKey}">${(!isExtra&&isSwapped)?`<button class="ex-menu-item" onclick="clearSwap('${exKey}','${(e.n0||e.n).replace(/'/g,"\\'")}')">↺ Original vaja</button>`:''}<button class="ex-menu-item" onclick="moveExUp(${di},${ei})">↑ Premakni gor</button><button class="ex-menu-item" onclick="moveExDown(${di},${ei})">↓ Premakni dol</button>${isExtra?`<button class="ex-menu-item danger" onclick="removeExtraByName(${di},'${e.n.replace(/'/g,"\\'")}')">× Odstrani vajo</button>`:`<button class="ex-menu-item danger" onclick="removeExForWeek('${exKey}')">🗑 Odstrani za ta teden</button>`}</div>
    <div class="sw-panel" id="sw-${exKey}">
      <input class="sw-custom-in" type="text" placeholder="🔍 Išči vajo (npr. squat, biceps)..." id="swsr-${exKey}" oninput="filterSwapDB('${exKey}','${(e.n0||e.n).replace(/'/g,"\\'")}',this.value)" style="width:100%;margin-bottom:8px;">
      <div id="swdb-${exKey}" style="max-height:280px;overflow-y:auto;">${renderSwapDBList(exKey,(e.n0||e.n),'')}</div>
      <div class="sw-custom-row">
        <input class="sw-custom-in" type="text" placeholder="Ali vpiši svojo..." id="swci-${exKey}">
        <button class="sw-custom-btn" onclick="useCustomSwap('${exKey}','${(e.n0||e.n).replace(/'/g,"\\'")}')">Uporabi</button>
      </div>
    </div>
    ${sugHtml}
    ${p531Html}
    <div id="wu-dyn-${exKey}"></div>
    <div class="ex-d">${safeHtml(e.d||'')}</div>${e.tip?`<div class="ex-tip">${safeHtml(e.tip)}</div>`:''}${painHtml}
    <table class="st"><thead><tr><th>S</th><th>Teža</th><th>Pon</th><th>Vol</th><th>1RM</th><th></th></tr></thead><tbody id="rows-${exKey}">${rows}</tbody></table>
    ${tv>0?`<div class="vol-total" style="font-size:11px;color:var(--green-text);margin-top:4px;text-align:right;">Skupaj: ${Math.round(tv).toLocaleString()} kg</div>`:''}
    <div class="set-ctrl">
      <button class="set-ctrl-btn add" onclick="addSet('${exKey}',${di},${ei},${cn})">+</button>
      <span class="set-count-label">${n} serij${extra>0?` (+${extra})`:extra<0?` (${extra})`:''}</span>
      <button class="set-ctrl-btn rem" onclick="removeSet('${exKey}',${di},${ei},${cn})">−</button>
    </div>
    <div class="tbar" id="tb-${exKey}"><div class="tc" id="tc-${exKey}">—</div><div class="tl2">${fmtRest(restForEx(e.id,displayName,e.r))} odmor</div><button class="txb" onclick="stopT('${exKey}')">X</button></div>
    </div>
  </div>`;
}

// Fold state per exercise (override avto-collapse) — samo session storage
const foldState={};
function isFolded(key){return key in foldState?foldState[key]:null;}
function toggleExMenu(key){
  const p=document.getElementById('exm-'+key);
  if(p)p.classList.toggle('open');
}
// === DIAGNOSTIKA (samo za branje — nič ne spremeni) ===
// Primerja exName, ki je bil zabeležen ob vnosu seta, s trenutnim imenom vaje na tisti poziciji.
// Neujemanje = dokaz da so podatki "podedovani" od prej odstranjene/premaknjene vaje.
function diagnoseExNameMismatches(){
  const allSets=getSets();
  const out=[];
  Object.keys(allSets).forEach(k=>{
    const m=k.match(/^c(\d+)w(\d+)d(\d+)e(\d+)$/);
    if(!m)return;
    const [,c,w,di,ei]=m.map(Number);
    const d=PROG.days[di];if(!d)return;
    const list=d.ex||d._origEx;
    const curEx=list&&list[ei];
    const curName=curEx?getSwappedName(k,curEx.n,curEx.extra):null;
    const sets=allSets[k]||[];
    const tagged=sets.filter(s=>s&&s.exName&&s.kg&&s.reps);
    if(tagged.length===0||!curName)return;
    const mismatched=tagged.filter(s=>s.exName!==curName);
    if(mismatched.length>0){
      out.push({key:k,cikel:c,teden:w+1,dan:DAY_NAMES[di]||('Dan '+(di+1)),trenutnoIme:curName,zabeleženoIme:mismatched[0].exName,steviloSetov:mismatched.length});
    }
  });
  return out;
}
// Poišče na kateri poziciji TA TRENUTEK (za dan dan c/w) dejansko živi vaja z imenom wantName
function findCurrentPosForName(di,c,w,wantName){
  const list=buildDayExList(di);
  for(let i=0;i<list.length;i++){
    const k=sdk(c,w,di,i);
    const nm=getSwappedName(k,list[i].n,list[i].extra);
    if(nm===wantName)return i;
  }
  return -1;
}
// Popravi EN najden primer neskladja: prestavi podatke na pravo pozicijo (ali izbriši, če vaje ni več)
async function fixMismatchItem(wrongKey,wantName,silent){
  const m=wrongKey.match(/^c(\d+)w(\d+)d(\d+)e(\d+)$/);
  if(!m){if(!silent)toast('Napačen ključ','err');return 'error';}
  const c=+m[1],w=+m[2],di=+m[3],wrongEi=+m[4];
  const correctEi=findCurrentPosForName(di,c,w,wantName);
  if(correctEi<0){
    if(!silent&&!await uiConfirm(`Vaja "${wantName}" ne obstaja več na tem dnevu — podatkov ni kam prestaviti. Izbrišem jih?`))return 'skipped';
    if(silent)return 'orphan'; // pri "popravi vse" osirotelih ne brišemo samodejno brez potrditve
    const allSets=getSets();delete allSets[wrongKey];saveSets(allSets);
    const sc=getSetCounts();delete sc[wrongKey];saveSetCounts(sc);
    const hidden=getHiddenEx();delete hidden[wrongKey];saveHiddenEx(hidden);
    const pain=getPainData();delete pain[wrongKey];savePainData(pain);
    if(!silent)toast('🗑 Osiroteli podatki izbrisani','ok');
    return 'deleted';
  }
  if(correctEi===wrongEi)return 'already-ok';
  const correctKey=sdk(c,w,di,correctEi);
  const allSets=getSets();
  const destHasData=allSets[correctKey]&&allSets[correctKey].some(s=>s&&s.kg&&s.reps);
  if(destHasData){
    if(!silent)toast('⚠ Na pravi poziciji že obstajajo podatki — preveri ročno','err');
    return 'conflict';
  }
  if(allSets[wrongKey]!==undefined){allSets[correctKey]=allSets[wrongKey];delete allSets[wrongKey];saveSets(allSets);}
  const sc=getSetCounts();if(sc[wrongKey]!==undefined){sc[correctKey]=sc[wrongKey];delete sc[wrongKey];saveSetCounts(sc);}
  const hidden=getHiddenEx();if(hidden[wrongKey]!==undefined){hidden[correctKey]=hidden[wrongKey];delete hidden[wrongKey];saveHiddenEx(hidden);}
  const pain=getPainData();if(pain[wrongKey]!==undefined){pain[correctKey]=pain[wrongKey];delete pain[wrongKey];savePainData(pain);}
  if(!silent)toast('✓ Podatki prestavljeni na pravo vajo','ok');
  return 'fixed';
}
async function fixOneAndRefresh(wrongKey,wantName){
  await fixMismatchItem(wrongKey,wantName,false);
  runDataDiagnostic();
  if(cd!==null&&cd!==undefined)showDay(cd);
}
// Popravi VSE najdene primere naenkrat (varno — konflikte in osirotele preskoči, samo poroča)
async function fixAllMismatches(){
  const results=diagnoseExNameMismatches();
  if(results.length===0)return;
  if(!await uiConfirm(`Popravim ${results.length} najdenih neskladij? Prestavi podatke na pravo vajo. Konflikte in osirotele podatke preskoči (tiste ročno).`))return;
  let fixed=0,conflict=0,orphan=0;
  for(const r of results){
    const res=await fixMismatchItem(r.key,r.zabeleženoIme,true);
    if(res==='fixed')fixed++;else if(res==='conflict')conflict++;else if(res==='orphan')orphan++;
  }
  toast(`✓ Popravljenih: ${fixed}${conflict?' · Konfliktov: '+conflict:''}${orphan?' · Osirotelih (preveri ročno): '+orphan:''}`,'ok');
  runDataDiagnostic();
  if(cd!==null&&cd!==undefined)showDay(cd);
}
function runDataDiagnostic(){
  const results=diagnoseExNameMismatches();
  const el=document.getElementById('diag-results');
  if(!el)return;
  if(results.length===0){
    el.innerHTML='<div style="font-size:12px;color:var(--green-text);padding:.5rem;">✓ Ni najdenih neskladij — podatki so v redu.</div>';
    return;
  }
  el.innerHTML=`<div style="font-size:12px;color:var(--amber-text);margin-bottom:.5rem;">⚠ Najdenih ${results.length} neskladij:</div>`+
    `<button class="sb" style="width:100%;margin-bottom:.5rem;background:var(--green-bg);border-color:var(--green);color:var(--green-text);" onclick="fixAllMismatches()">🔧 Popravi vse (varno)</button>`+
    results.map(r=>`<div style="font-size:11px;color:var(--text2);padding:6px 8px;background:var(--bg3);border-radius:6px;margin-bottom:4px;">
      <div style="margin-bottom:5px;"><strong>${r.dan}</strong>, Cikel ${r.cikel}, Teden ${r.teden} — na poziciji je zdaj <strong>${r.trenutnoIme}</strong>, a ${r.steviloSetov} set(ov) je zabeleženih pod imenom <strong>${r.zabeleženoIme}</strong>.</div>
      <button class="sb" style="font-size:10px;padding:4px 10px;" onclick="fixOneAndRefresh('${r.key}','${r.zabeleženoIme.replace(/'/g,"\\'")}')">Popravi to</button>
    </div>`).join('')+
    `<div style="font-size:10px;color:var(--text3);margin-top:6px;">Vzrok: v starejši verziji je odstranjevanje/premikanje vaj lahko zamenjalo podatke med pozicijami. Od te verzije naprej se to ne more več zgoditi. "Popravi" prestavi podatke na pravo vajo (ali vpraša za brisanje, če vaje ni več).</div>`;
}
function toggleFold(key){
  const card=document.getElementById('ec-'+key);if(!card)return;
  const cur=card.classList.contains('col-done');
  foldState[key]=!cur;
  card.classList.toggle('col-done',!cur);
  // Posodobi gumbe znotraj
  const btns=card.querySelectorAll('.toggle-fold');
  btns.forEach(b=>{b.textContent=!cur?'razširi ▾':'skrči ▴';});
}

function addSet(exKey,di,ei,cn){
  const extra=getExtraSets(exKey);setExtraSets(exKey,extra+1);
  const wk=PROG.weeks[cw];
  const n=nsf(di,ei,wk,exKey);
  const all=getSets();
  if(!all[exKey]) all[exKey]=[];
  // Copy last set's kg as default
  const lastKg=all[exKey].length>0?all[exKey][all[exKey].length-1].kg:'';
  all[exKey].push({kg:lastKg,reps:'',done:false});
  saveSets(all);
  // Re-render just this exercise
  const card=document.getElementById('ec-'+exKey);
  if(card){const tmp=document.createElement('div');tmp.innerHTML=renderEx(PROG.days[di].ex[ei],ei,di,wk,cn);card.replaceWith(tmp.firstChild);}
}

function removeSet(exKey,di,ei,cn){
  const wk=PROG.weeks[cw];
  const baseN=wk.dl?3:(PROG.days[di].ex[ei].m?wk.sM:wk.sA);
  const extra=getExtraSets(exKey);
  if(baseN+extra<=1)return;
  setExtraSets(exKey,extra-1);
  const n=nsf(di,ei,wk,exKey);
  const all=getSets();
  if(all[exKey]&&all[exKey].length>n) all[exKey]=all[exKey].slice(0,n);
  saveSets(all);
  const card=document.getElementById('ec-'+exKey);
  if(card){const tmp=document.createElement('div');tmp.innerHTML=renderEx(PROG.days[di].ex[ei],ei,di,wk,cn);card.replaceWith(tmp.firstChild);}
}

function toggleSwap(key){const p=document.getElementById('sw-'+key);if(p){swOpen[key]=!swOpen[key];p.classList.toggle('open',swOpen[key]);}}
function getExSwaps(){try{return JSON.parse(localStorage.getItem('wt_exswap')||'{}');}catch{return {};}}
function saveExSwaps(s){localStorage.setItem('wt_exswap',JSON.stringify(s));}
// Swap je vezan na DAN + ORIGINALNO IME vaje (stabilno ob premikanju). Velja od tedna nastanka NAPREJ.
function swapPosKey(exKey){const m=String(exKey).match(/d(\d+)e(\d+)$/);return m?`d${m[1]}e${m[2]}`:exKey;}
function diFromKey(exKey){const m=String(exKey).match(/d(\d+)e\d+$/);return m?+m[1]:-1;}
function cwFromKey(exKey){const m=String(exKey).match(/c(\d+)w(\d+)d\d+e\d+/);return m?{c:+m[1],w:+m[2]}:{c:1,w:0};}
function origNameForKey(exKey){
  const m=String(exKey).match(/d(\d+)e(\d+)$/);if(!m)return null;
  const di=+m[1],ei=+m[2];
  const all=getDayLists();const arr=all&&all[di];
  if(arr&&arr[ei])return arr[ei].n0;
  const d=PROG.days[di];if(!d)return null;
  const list=d._origEx||d.ex;const e=list&&list[ei];
  return e?(e.n0||e.n):null;
}
function getSwappedName(exKey,origName,isExtra){
  const di=diFromKey(exKey);
  const cwk=cwFromKey(exKey);
  const all=getDayLists();
  const arr=all&&all[di];
  if(arr){
    const it=arr.find(x=>x.n0===origName)||arr.find(x=>dispNameForItem(x,cwk.c,cwk.w)===origName);
    if(it)return dispNameForItem(it,cwk.c,cwk.w);
    return origName;
  }
  // fallback pred migracijo (stari wt_exswap format)
  if(isExtra)return origName;
  const s=getExSwaps();
  const entry=s[`d${di}|${origName}`];
  if(!entry)return origName;
  if(typeof entry==='string')return entry;
  if(cwk.c>entry.c||(cwk.c===entry.c&&cwk.w>=entry.w))return entry.n;
  return origName;
}
// Enkratna migracija starih pozicijskih/polnih swap ključev → ime-osnovani
function migrateSwaps(){
  const s=getExSwaps();let changed=false;
  Object.keys(s).forEach(k=>{
    if(k.indexOf('|')>=0)return;
    const m=k.match(/d(\d+)e(\d+)$/);
    if(!m){delete s[k];changed=true;return;}
    const di=+m[1],ei=+m[2];
    const d=PROG.days[di];const list=d?(d._origEx||d.ex):null;const orig=list&&list[ei];
    if(orig&&orig.n&&!s[`d${di}|${orig.n}`]){s[`d${di}|${orig.n}`]=s[k];}
    delete s[k];changed=true;
  });
  if(changed)saveExSwaps(s);
}

// === SKRIVANJE VAJE ZA DOLOČEN TEDEN+CIKEL ===
function getHiddenEx(){try{return JSON.parse(localStorage.getItem('wt_hidden_ex')||'{}');}catch{return {};}}
function saveHiddenEx(h){localStorage.setItem('wt_hidden_ex',JSON.stringify(h));}
function isExHidden(exKey){return !!getHiddenEx()[exKey];}
async function removeExForWeek(exKey){
  if(!await uiConfirm('Odstrani to vajo samo za ta teden? (ostane v drugih tednih, podatki se ohranijo)'))return;
  const h=getHiddenEx();h[exKey]=true;saveHiddenEx(h);
  showDay(cd);toast('🗑 Vaja odstranjena za ta teden','ok');
}
function restoreHiddenWeek(di){
  const h=getHiddenEx();const cn=getCyc().num;const pre=`c${cn}w${cw}d${di}e`;
  let cnt=0;Object.keys(h).forEach(k=>{if(k.startsWith(pre)){delete h[k];cnt++;}});
  saveHiddenEx(h);showDay(cd);toast(`↩ Povrnjenih ${cnt} vaj`,'ok');
}

// === STEPPER za kg in pon ===
function getKgStep(){return parseFloat(localStorage.getItem('wt_kg_step')||'2.5');}
function getRepsStep(){return parseInt(localStorage.getItem('wt_reps_step')||'1');}
function setKgStep(v){localStorage.setItem('wt_kg_step',String(parseFloat(v)||2.5));toast('💾 Shranjeno','ok');}
function setRepsStep(v){localStorage.setItem('wt_reps_step',String(parseInt(v)||1));toast('💾 Shranjeno','ok');}

// === BUILT-IN EXERCISE DATABASE (100 vaj) ===
// Polja: n=ime, m=primary muscle, s=secondary, c=compound/isolation, eq=equipment, d=opis
const EXERCISE_DB=[
  // ========== CHEST (12) ==========
  {n:"Barbell Bench Press",m:"Chest",s:"Triceps, Front Delt",c:"compound",eq:"barbell",d:"Lie flat, grip slightly wider than shoulders. Lower bar to mid-chest, press up explosively. Keep shoulder blades retracted."},
  {n:"Incline Barbell Press",m:"Chest",s:"Front Delt, Triceps",c:"compound",eq:"barbell",d:"Bench at 30-45°. Lower to upper chest, drive feet into floor. Targets upper chest."},
  {n:"Decline Barbell Press",m:"Chest",s:"Triceps",c:"compound",eq:"barbell",d:"Bench at -15-30°. Lower to lower chest. Targets lower pec fibers."},
  {n:"Dumbbell Bench Press",m:"Chest",s:"Triceps, Front Delt",c:"compound",eq:"dumbbell",d:"Allows greater range of motion than barbell. Press dumbbells together at top for peak contraction."},
  {n:"Incline Dumbbell Press",m:"Chest",s:"Front Delt, Triceps",c:"compound",eq:"dumbbell",d:"Incline 30-45°. Better stretch on upper chest than barbell version."},
  {n:"Dumbbell Fly",m:"Chest",s:"",c:"isolation",eq:"dumbbell",d:"Slight elbow bend, arc dumbbells out and down. Squeeze chest at top. Don't go too low — protect shoulders."},
  {n:"Cable Crossover",m:"Chest",s:"",c:"isolation",eq:"cable",d:"Stand between cables, slight forward lean. Pull handles down and across. Continuous tension throughout."},
  {n:"Cable Chest Fly",m:"Chest",s:"",c:"isolation",eq:"cable",d:"Adjust cables to chest height. Sweep handles together in arc. Full stretch at start, full squeeze at end."},
  {n:"Pec Deck Machine",m:"Chest",s:"",c:"isolation",eq:"machine",d:"Sit upright, elbows on pads. Bring arms together, squeeze chest. Great for finishing pump."},
  {n:"Push-Ups",m:"Chest",s:"Triceps, Core",c:"compound",eq:"bodyweight",d:"Hands shoulder-width, body straight from head to heels. Lower chest to floor, press up."},
  {n:"Weighted Dips",m:"Chest",s:"Triceps, Front Delt",c:"compound",eq:"bodyweight",d:"Lean forward for chest emphasis. Lower until shoulders below elbows. Add weight via belt."},
  {n:"Machine Chest Press",m:"Chest",s:"Triceps, Front Delt",c:"compound",eq:"machine",d:"Adjust seat so handles align with mid-chest. Safer for beginners or heavy work without spotter."},

  // ========== BACK (15) ==========
  {n:"Conventional Deadlift",m:"Back",s:"Hamstrings, Glutes, Traps",c:"compound",eq:"barbell",d:"Bar over mid-foot. Hinge at hips, neutral spine. Drive through heels, lock out at top. King of strength."},
  {n:"Sumo Deadlift",m:"Back",s:"Glutes, Quads, Adductors",c:"compound",eq:"barbell",d:"Wide stance, toes out. Shorter ROM, more hip drive. Better for tall lifters or hip mobility issues."},
  {n:"Romanian Deadlift",m:"Hamstrings",s:"Glutes, Back",c:"compound",eq:"barbell",d:"Slight knee bend, push hips back. Bar slides down legs. Stop when stretch in hams. Don't go to floor."},
  {n:"Pull-Ups",m:"Back",s:"Biceps",c:"compound",eq:"bodyweight",d:"Hang from bar, palms forward. Pull until chin over bar. Engage lats by pulling elbows down."},
  {n:"Chin-Ups",m:"Back",s:"Biceps",c:"compound",eq:"bodyweight",d:"Underhand grip, palms toward you. More biceps involvement than pull-ups. Easier for most."},
  {n:"Lat Pulldown",m:"Back",s:"Biceps",c:"compound",eq:"cable",d:"Wide grip, slight backward lean. Pull bar to upper chest. Don't lean back excessively."},
  {n:"Close-Grip Lat Pulldown",m:"Back",s:"Biceps",c:"compound",eq:"cable",d:"V-handle or close neutral grip. More biceps and lower lat activation."},
  {n:"Barbell Row",m:"Back",s:"Biceps, Rear Delt",c:"compound",eq:"barbell",d:"Hinge ~45°, row bar to lower chest. Keep back flat. Drive elbows up and back."},
  {n:"Pendlay Row",m:"Back",s:"Biceps, Rear Delt",c:"compound",eq:"barbell",d:"Bar starts on floor every rep. Strict, explosive pull. Less momentum than barbell row."},
  {n:"T-Bar Row",m:"Back",s:"Biceps, Rear Delt",c:"compound",eq:"barbell",d:"Anchor one end, load other. Chest supported version safer for lower back."},
  {n:"Dumbbell Row",m:"Back",s:"Biceps",c:"compound",eq:"dumbbell",d:"Knee and hand on bench, opposite arm rows. Pull dumbbell toward hip, squeeze back."},
  {n:"Single-Arm DB Row",m:"Back",s:"Biceps",c:"compound",eq:"dumbbell",d:"Same as DB row but emphasize unilateral work. Great for fixing imbalances."},
  {n:"Seated Cable Row",m:"Back",s:"Biceps",c:"compound",eq:"cable",d:"Sit upright, V-handle. Pull to lower abs, squeeze shoulder blades. Don't rock back."},
  {n:"Face Pulls",m:"Rear Delt",s:"Back, Traps",c:"isolation",eq:"cable",d:"Rope at face height. Pull to face, externally rotate at end. Crucial for shoulder health."},
  {n:"Shrugs",m:"Traps",s:"",c:"isolation",eq:"dumbbell",d:"Heavy weight, shrug straight up. Hold at top 1 sec. No rolling — straight up and down."},

  // ========== SHOULDERS (10) ==========
  {n:"Overhead Press (OHP)",m:"Shoulders",s:"Triceps, Upper Chest",c:"compound",eq:"barbell",d:"Stand tall, bar at shoulders. Press overhead, lock out. Squeeze glutes to protect lower back."},
  {n:"Push Press",m:"Shoulders",s:"Triceps, Legs",c:"compound",eq:"barbell",d:"Use slight leg drive to assist press. Allows heavier weight than strict press."},
  {n:"Seated DB Shoulder Press",m:"Shoulders",s:"Triceps",c:"compound",eq:"dumbbell",d:"Back support reduces lower back stress. Press dumbbells from shoulder to overhead."},
  {n:"Arnold Press",m:"Shoulders",s:"Triceps",c:"compound",eq:"dumbbell",d:"Start palms facing you, rotate to facing forward as you press. Hits all three delt heads."},
  {n:"Lateral Raises",m:"Shoulders",s:"",c:"isolation",eq:"dumbbell",d:"Slight bend at elbow. Raise to shoulder height. Lead with elbows, not hands. Light weight, strict form."},
  {n:"Cable Lateral Raise",m:"Shoulders",s:"",c:"isolation",eq:"cable",d:"Cable from low pulley, behind body. Raise out to side. Constant tension throughout."},
  {n:"Front Raises",m:"Front Delt",s:"",c:"isolation",eq:"dumbbell",d:"Raise weight in front to shoulder height. Often unnecessary — bench press already hits front delts."},
  {n:"Rear Delt Fly",m:"Rear Delt",s:"",c:"isolation",eq:"dumbbell",d:"Bent over or face-down on incline. Raise dumbbells out wide. Lead with pinkies, not thumbs."},
  {n:"Reverse Pec Deck",m:"Rear Delt",s:"",c:"isolation",eq:"machine",d:"Reverse position on pec deck. Open arms wide, squeeze rear delts. Easier form than fly."},
  {n:"Upright Row",m:"Shoulders",s:"Traps, Biceps",c:"compound",eq:"barbell",d:"Pull bar up to chest, elbows high. Wider grip safer for shoulders. Stop at chest height."},

  // ========== BICEPS (8) ==========
  {n:"Barbell Curl",m:"Biceps",s:"",c:"isolation",eq:"barbell",d:"Stand, shoulder-width grip. Curl to chest, full ROM. No swinging — strict reps."},
  {n:"EZ-Bar Curl",m:"Biceps",s:"",c:"isolation",eq:"barbell",d:"Easier on wrists than straight bar. Inner grip = outer biceps, outer grip = inner."},
  {n:"Dumbbell Curl",m:"Biceps",s:"",c:"isolation",eq:"dumbbell",d:"Alternating or both at once. Supinate (rotate palm up) for max biceps activation."},
  {n:"Hammer Curl",m:"Biceps",s:"Brachialis, Forearm",c:"isolation",eq:"dumbbell",d:"Neutral grip (palms facing each other). Hits brachialis and brachioradialis. Builds arm thickness."},
  {n:"Incline Dumbbell Curl",m:"Biceps",s:"",c:"isolation",eq:"dumbbell",d:"Bench at 45-60°. Greater stretch on long head of biceps. Strict form essential."},
  {n:"Preacher Curl",m:"Biceps",s:"",c:"isolation",eq:"barbell",d:"Arms on pad. Isolates biceps with no swing. Don't lock out fully at bottom."},
  {n:"Cable Curl",m:"Biceps",s:"",c:"isolation",eq:"cable",d:"Constant tension throughout ROM. Try rope, straight bar, or single-handle variations."},
  {n:"Concentration Curl",m:"Biceps",s:"",c:"isolation",eq:"dumbbell",d:"Seated, elbow on inner thigh. Slow, strict reps. Peak biceps contraction."},

  // ========== TRICEPS (8) ==========
  {n:"Close-Grip Bench Press",m:"Triceps",s:"Chest, Front Delt",c:"compound",eq:"barbell",d:"Hands shoulder-width or slightly closer. Tucked elbows. Best mass-builder for triceps."},
  {n:"Tricep Pushdown (Rope)",m:"Triceps",s:"",c:"isolation",eq:"cable",d:"Rope on high pulley. Push down, spread rope at bottom. Keep elbows tucked."},
  {n:"Tricep Pushdown (Bar)",m:"Triceps",s:"",c:"isolation",eq:"cable",d:"Straight or V-bar. Push down to full extension. Don't flare elbows."},
  {n:"Skull Crushers",m:"Triceps",s:"",c:"isolation",eq:"barbell",d:"Lying on bench, EZ bar overhead. Lower to forehead, extend up. Elbows pointed up."},
  {n:"Overhead Tricep Extension",m:"Triceps",s:"",c:"isolation",eq:"dumbbell",d:"Stand or sit, dumbbell overhead with both hands. Lower behind head, extend up. Long head focus."},
  {n:"Tricep Kickback",m:"Triceps",s:"",c:"isolation",eq:"dumbbell",d:"Hinge over, upper arm parallel to floor. Extend forearm back. Squeeze at top."},
  {n:"Diamond Push-Ups",m:"Triceps",s:"Chest",c:"compound",eq:"bodyweight",d:"Hands form diamond under chest. More triceps than wide push-ups. Hard for most."},
  {n:"Dips (Vertical Body)",m:"Triceps",s:"Chest, Front Delt",c:"compound",eq:"bodyweight",d:"Body upright (not leaning). Lower until 90° at elbow. Press back up. Add weight when easy."},

  // ========== QUADS (8) ==========
  {n:"Barbell Back Squat",m:"Quads",s:"Glutes, Hamstrings, Core",c:"compound",eq:"barbell",d:"Bar on traps, feet shoulder-width. Sit back and down, knees track over toes. Drive up through heels."},
  {n:"Front Squat",m:"Quads",s:"Glutes, Core",c:"compound",eq:"barbell",d:"Bar on front delts. More upright torso, more quad-dominant. Need shoulder/wrist mobility."},
  {n:"Leg Press",m:"Quads",s:"Glutes, Hamstrings",c:"compound",eq:"machine",d:"Feet shoulder-width on platform. Lower until knees ~90°. Don't lock out fully at top."},
  {n:"Bulgarian Split Squat",m:"Quads",s:"Glutes",c:"compound",eq:"dumbbell",d:"Rear foot elevated on bench. Lower into lunge. Front leg does most of work. Brutal but effective."},
  {n:"Walking Lunges",m:"Quads",s:"Glutes, Hamstrings",c:"compound",eq:"dumbbell",d:"Step forward, lower back knee toward floor. Step through. Continuous walking motion."},
  {n:"Goblet Squat",m:"Quads",s:"Glutes, Core",c:"compound",eq:"dumbbell",d:"Hold dumbbell at chest. Squat deep. Great for learning squat pattern."},
  {n:"Leg Extension",m:"Quads",s:"",c:"isolation",eq:"machine",d:"Sit on machine, pad on shins. Extend legs fully. Squeeze quads at top."},
  {n:"Hack Squat",m:"Quads",s:"Glutes",c:"compound",eq:"machine",d:"Back against pad. More quad-isolated than back squat. Easier on lower back."},

  // ========== HAMSTRINGS / GLUTES (8) ==========
  {n:"Stiff-Leg Deadlift",m:"Hamstrings",s:"Glutes, Back",c:"compound",eq:"barbell",d:"Minimal knee bend. Hinge at hips. More hamstring stretch than RDL."},
  {n:"Seated Leg Curl",m:"Hamstrings",s:"",c:"isolation",eq:"machine",d:"Pad above ankles. Curl heels under. Squeeze hamstrings at bottom."},
  {n:"Lying Leg Curl",m:"Hamstrings",s:"",c:"isolation",eq:"machine",d:"Face down. Curl heels to glutes. Hips stay on pad — don't raise."},
  {n:"Hip Thrust",m:"Glutes",s:"Hamstrings",c:"compound",eq:"barbell",d:"Upper back on bench, bar across hips. Drive hips up, squeeze glutes hard. Best glute builder."},
  {n:"Glute Bridge",m:"Glutes",s:"Hamstrings",c:"compound",eq:"barbell",d:"On floor, bar across hips. Drive up, squeeze. Easier setup than hip thrust."},
  {n:"Cable Pull-Through",m:"Glutes",s:"Hamstrings",c:"compound",eq:"cable",d:"Cable between legs from low pulley. Hinge forward, drive hips through. Great teaching tool for hinge pattern."},
  {n:"Good Morning",m:"Hamstrings",s:"Glutes, Lower Back",c:"compound",eq:"barbell",d:"Bar on traps. Hinge forward keeping back flat. Excellent for posterior chain."},
  {n:"Single-Leg Romanian DL",m:"Hamstrings",s:"Glutes, Core",c:"compound",eq:"dumbbell",d:"One foot off ground. Hinge with stance leg. Improves balance and unilateral strength."},

  // ========== CALVES (3) ==========
  {n:"Standing Calf Raise",m:"Calves",s:"",c:"isolation",eq:"machine",d:"Stand on platform, weight on shoulders. Rise up on toes, full ROM. Hold contraction 1 sec."},
  {n:"Seated Calf Raise",m:"Calves",s:"",c:"isolation",eq:"machine",d:"Hits soleus more than gastrocnemius. Higher reps work better."},
  {n:"Donkey Calf Raise",m:"Calves",s:"",c:"isolation",eq:"machine",d:"Bent-over position, weight on hips/lower back. Greater stretch on calves."},

  // ========== CORE (10) ==========
  {n:"Plank",m:"Core",s:"Shoulders, Glutes",c:"isolation",eq:"bodyweight",d:"Forearms on floor, body straight line. Squeeze glutes and core. Hold for time."},
  {n:"Side Plank",m:"Core",s:"Glutes, Shoulders",c:"isolation",eq:"bodyweight",d:"Side position, body straight. Hold each side. Targets obliques."},
  {n:"Hanging Leg Raise",m:"Core",s:"Hip Flexors",c:"isolation",eq:"bodyweight",d:"Hang from bar. Raise legs to 90° (or higher for advanced). Don't swing."},
  {n:"Ab Wheel Rollout",m:"Core",s:"Shoulders",c:"isolation",eq:"other",d:"Knees on floor, roll wheel out. Keep core tight, don't sag. One of best ab exercises."},
  {n:"Cable Crunch",m:"Core",s:"",c:"isolation",eq:"cable",d:"Kneel below cable, rope behind head. Crunch elbows toward knees. Don't pull with arms."},
  {n:"Russian Twist",m:"Core",s:"",c:"isolation",eq:"dumbbell",d:"Sit, lean back, feet up. Twist torso side to side. Add weight when easy."},
  {n:"Decline Sit-Up",m:"Core",s:"Hip Flexors",c:"isolation",eq:"bodyweight",d:"Decline bench. Add plate on chest for resistance. Full ROM crunch."},
  {n:"Dead Bug",m:"Core",s:"",c:"isolation",eq:"bodyweight",d:"On back, arms up, knees bent. Lower opposite arm and leg. Keep back flat. Great for stability."},
  {n:"Pallof Press",m:"Core",s:"",c:"isolation",eq:"cable",d:"Stand sideways to cable. Press handle out, resist rotation. Anti-rotation core work."},
  {n:"Mountain Climbers",m:"Core",s:"Shoulders, Cardio",c:"compound",eq:"bodyweight",d:"Push-up position. Drive knees toward chest alternately. Fast pace = cardio. Slow = core."},

  // ========== FOREARMS / GRIP (3) ==========
  {n:"Wrist Curl",m:"Forearms",s:"",c:"isolation",eq:"dumbbell",d:"Forearms on bench, palms up. Curl wrists. Strict, slow reps."},
  {n:"Reverse Wrist Curl",m:"Forearms",s:"",c:"isolation",eq:"dumbbell",d:"Palms down version. Hits extensors. Critical for balanced forearm development."},
  {n:"Farmer's Walk",m:"Forearms",s:"Traps, Core",c:"compound",eq:"dumbbell",d:"Heavy dumbbells in each hand. Walk for distance or time. Builds grip and traps massively."},

  // ========== FULL BODY / POWER (5) ==========
  {n:"Power Clean",m:"Back",s:"Glutes, Hamstrings, Traps",c:"compound",eq:"barbell",d:"Explosive pull from floor to shoulders. Catch in front rack. Develops power and athleticism."},
  {n:"Clean and Press",m:"Shoulders",s:"Back, Legs",c:"compound",eq:"barbell",d:"Power clean to shoulders, then overhead press. Full body movement."},
  {n:"Snatch",m:"Back",s:"Shoulders, Legs, Glutes",c:"compound",eq:"barbell",d:"Floor to overhead in one motion. Most technical lift. Coach recommended."},
  {n:"Kettlebell Swing",m:"Glutes",s:"Hamstrings, Back, Core",c:"compound",eq:"other",d:"Hinge, hike kettlebell back. Snap hips forward, kettlebell to chest height. Power from hips, not arms."},
  {n:"Burpee",m:"Full Body",s:"Cardio",c:"compound",eq:"bodyweight",d:"Squat down, jump back to plank, push-up, jump forward, jump up. Brutal conditioning tool."}
];

// === CUSTOM EXERCISE DB ===
const CUST_KEY='wt_custom_ex';
function getCustomExercises(){try{return JSON.parse(localStorage.getItem(CUST_KEY)||'[]');}catch{return [];}}
function saveCustomExercises(arr){localStorage.setItem(CUST_KEY,JSON.stringify(arr));}
function addCustomExercise(){
  const name=plainImportedText(document.getElementById('cust-name').value.trim(),100);
  if(!name){toast('Vnesi ime','err');return;}
  const muscle=document.getElementById('cust-muscle').value;
  const cat=document.getElementById('cust-cat').value;
  const desc=plainImportedText(document.getElementById('cust-desc').value.trim(),1000);
  const list=getCustomExercises();
  if(list.find(e=>e.n.toLowerCase()===name.toLowerCase())){toast('Vaja že obstaja','err');return;}
  list.push({n:name,muscle,cat,desc,created:new Date().toISOString()});
  saveCustomExercises(list);
  document.getElementById('cust-name').value='';
  document.getElementById('cust-desc').value='';
  toast('✓ Vaja dodana','ok');
  renderCustomExList();
}
async function deleteCustomExercise(name){
  if(!await uiConfirm('Izbrišem vajo "'+name+'"?'))return;
  const list=getCustomExercises().filter(e=>e.n!==name);
  saveCustomExercises(list);
  renderCustomExList();
  toast('Izbrisana','ok');
}
function renderCustomExList(){
  const el=document.getElementById('custom-ex-list');if(!el)return;
  const list=getCustomExercises();
  if(list.length===0){el.innerHTML='<div style="font-size:11px;color:var(--text3);padding:.4rem;">Nobene shranjene vaje.</div>';return;}
  el.innerHTML=list.map(e=>`<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;padding:6px;border-bottom:.5px solid var(--border);font-size:12px;">
    <div style="flex:1;min-width:0;">
      <div style="color:var(--text);font-weight:500;">${safeHtml(e.n)}</div>
      <div style="color:var(--text3);font-size:10px;margin-top:2px;">${safeHtml(e.muscle)} · ${e.cat==='compound'?'compound':'izolacija'}</div>
      ${e.desc?`<div style="color:var(--text2);font-size:11px;margin-top:3px;line-height:1.3;">${safeHtml(e.desc)}</div>`:''}
    </div>
    <button class="bk-item-btn del" onclick="deleteCustomExercise(decodeURIComponent('${encodeURIComponent(e.n)}'))">×</button>
  </div>`).join('');
}
function initStepUI(){
  const ks=document.getElementById('kg-step-sel');if(ks)ks.value=String(getKgStep());
  const rs=document.getElementById('reps-step-sel');if(rs)rs.value=String(getRepsStep());
}
function stepKg(exKey,si,di,ei,cn,delta,isBarbell){
  const inp=document.querySelector(`#row-${exKey}-${si} .wi`);
  if(!inp)return;
  const cur=parseFloat(inp.value)||0;
  const newVal=Math.max(0,Math.round((cur+delta)*100)/100);
  inp.value=newVal;
  sv(exKey,si,'kg',String(newVal),di,ei,cn,isBarbell?1:0);
}
function stepReps(exKey,si,di,ei,cn,delta){
  const inp=document.querySelector(`#row-${exKey}-${si} .ri`);
  if(!inp)return;
  const cur=parseInt(inp.value)||0;
  const newVal=Math.max(0,cur+delta);
  inp.value=newVal;
  sv(exKey,si,'reps',String(newVal),di,ei,cn,0);
}
function useSwap(key,name,origName){
  if(!origName)origName=origNameForKey(key);
  if(!origName){toast('Te vaje ni mogoče zamenjati','err');return;}
  const di=diFromKey(key);
  const all=getDayLists();const arr=all&&all[di];
  if(!arr){toast('Napaka seznama','err');return;}
  const c=getCyc().num;
  const it=arr.find(x=>x.n0===origName)||arr.find(x=>dispNameForItem(x,c,cw)===origName);
  if(!it){toast('Vaja ni najdena','err');return;}
  // Blokiraj kolizijo: novo ime ne sme biti enako prikazu KATEREKOLI druge vaje tega dne
  const clash=arr.some(x=>x.id!==it.id&&dispNameForItem(x,c,cw).toLowerCase()===name.toLowerCase());
  if(clash){toast('Ta vaja že obstaja na tem dnevu — izberi drugo','err');return;}
  mutateDayList(di,list=>{
    const t=list.find(x=>x.id===it.id);
    if(!t)return;
    if(!Array.isArray(t.sw))t.sw=[];
    const last=t.sw[t.sw.length-1];
    if(last&&last.c===c&&last.w===cw)last.n=name; // isti teden: prepiši zadnji vnos
    else t.sw.push({n:name,c:c,w:cw});
  });
  showDay(cd);
  toast('✓ Zamenjano (ta in naslednji tedni)','ok');
}
function useCustomSwap(key,origName){const inp=document.getElementById('swci-'+key);if(!inp||!inp.value.trim())return;useSwap(key,inp.value.trim(),origName);}

// === SWAP DB LIST + SEARCH ===
function renderSwapDBList(exKey,origName,query){
  const q=(query||'').toLowerCase().trim();
  // Združi: custom (z ⭐) + built-in DB
  const customs=getCustomExercises().map(c=>({n:c.n,m:c.muscle,c:c.cat,d:c.desc||'',custom:true}));
  const builtins=EXERCISE_DB.map(e=>({n:e.n,m:e.m,c:e.c,d:e.d,s:e.s,eq:e.eq,custom:false}));
  let all=[...customs,...builtins];
  if(q){
    all=all.filter(e=>e.n.toLowerCase().includes(q)||e.m.toLowerCase().includes(q)||(e.s&&e.s.toLowerCase().includes(q))||(e.eq&&e.eq.toLowerCase().includes(q)));
  }
  if(all.length===0)return '<div style="font-size:11px;color:var(--text3);padding:.5rem;text-align:center;">Ni zadetkov.</div>';
  const onEsc=(origName||'').replace(/'/g,"\\'");
  return all.slice(0,50).map(e=>{
    const star=e.custom?'⭐ ':'';
    const eqIcon={barbell:'🏋',dumbbell:'🔔',cable:'🔗',machine:'⚙',bodyweight:'🤸',other:''}[e.eq]||'';
    const meta=`${e.m}${e.s?' · '+e.s:''} · ${e.c==='compound'?'compound':'isolation'}`;
    return `<div class="sw-item" onclick="useSwap('${exKey}','${e.n.replace(/'/g,"\\'")}','${onEsc}')">
      <div class="sw-item-name">${star}${eqIcon} ${e.n}</div>
      <div class="sw-item-note">${meta}</div>
      ${e.d?`<div style="font-size:10px;color:var(--text3);margin-top:3px;line-height:1.3;">${e.d.slice(0,140)}${e.d.length>140?'…':''}</div>`:''}
    </div>`;
  }).join('');
}

function filterSwapDB(exKey,origName,query){
  const el=document.getElementById('swdb-'+exKey);
  if(el)el.innerHTML=renderSwapDBList(exKey,origName,query);
}
function clearSwap(key,origName){
  if(!origName)origName=origNameForKey(key);
  if(!origName)return;
  const di=diFromKey(key);
  const all=getDayLists();const arr=all&&all[di];
  if(!arr)return;
  const c=getCyc().num;
  const it=arr.find(x=>dispNameForItem(x,c,cw).toLowerCase()!==x.n0.toLowerCase()&&(x.n0===origName||dispNameForItem(x,c,cw)===origName));
  if(!it)return;
  mutateDayList(di,list=>{
    const t=list.find(x=>x.id===it.id);
    if(!t||!Array.isArray(t.sw))return;
    const last=t.sw[t.sw.length-1];
    if(last&&last.c===c&&last.w===cw)t.sw.pop(); // swap iz istega tedna: samo razveljavi
    else t.sw.push({n:t.n0,c:c,w:cw}); // sicer: revert od zdaj naprej (pretekli tedni ostanejo)
    if(t.sw.length===0)delete t.sw;
  });
  showDay(cd);
  toast('↺ Original','ok');
}

function wuHint(e,sets){
  const fkg=parseFloat(sets[0]?.kg)||0;
  if(fkg<=0)return`<div class="wubox">Vnesi težo v S1 za ogrevanje</div>`;
  const type=e.n.toLowerCase().includes('squat')||e.n.toLowerCase().includes('deadlift')||e.n.toLowerCase().includes('leg press')?'lower':'upper';
  const wu=buildWU(fkg,type);
  return`<div class="wubox"><strong>Ogrevanje:</strong> ${wu.map(w=>`${w.pct===0?'Palica':w.pct+'%'}→${w.kg}kg×${w.reps}`).join(' · ')}</div>`;
}
function buildWU(wkg,type){
  const bar=20;
  if(type==='lower')return[{pct:0,kg:bar,reps:10},{pct:40,kg:rnd(wkg*.4),reps:8},{pct:60,kg:rnd(wkg*.6),reps:5},{pct:75,kg:rnd(wkg*.75),reps:3},{pct:90,kg:rnd(wkg*.9),reps:1}];
  return[{pct:0,kg:bar,reps:10},{pct:50,kg:rnd(wkg*.5),reps:8},{pct:70,kg:rnd(wkg*.7),reps:5},{pct:85,kg:rnd(wkg*.85),reps:2}];
}
function rnd(n){return Math.round(n/2.5)*2.5;}

// === DINAMIČNO OGREVANJE za vsako vajo ===
function showDynWarmup(exKey,di,ei){
  const box=document.getElementById('wu-dyn-'+exKey);
  if(!box)return;
  if(box.innerHTML){box.innerHTML='';return;}
  const all=getSets();
  const fkg=parseFloat((all[exKey]&&all[exKey][0]&&all[exKey][0].kg)||0);
  if(fkg<=0){box.innerHTML='<div class="wubox">Vnesi delovno težo v 1. serijo</div>';return;}
  const exName=(PROG.days[di].ex[ei]||{}).n||'';
  const lower=/squat|deadlift|leg press|lunge|hip thrust|rdl|romanian/i.test(exName);
  const wu=buildWU(fkg,lower?'lower':'upper');
  box.innerHTML=`<div class="wubox"><strong>Ogrevanje do ${fkg}kg:</strong><br>${wu.map(w=>`${w.pct===0?'Palica':w.pct+'%'} → <strong>${w.kg}kg</strong> × ${w.reps}`).join('<br>')}</div>`;
}

// === PRE-FILL naslednje sesije ===
function prefillFromLastSession(di){
  const all=getSets();
  const cyc=getCyc();
  let filled=0;
  PROG.days[di].ex.forEach((e,ei)=>{
    const curKey=sdk(cyc.num,cw,di,ei);
    const cur=all[curKey];
    if(cur&&cur.some(s=>s.kg))return;
    let lastKg=null;
    outer:
    for(let c=cyc.num;c>=1;c--){
      const wStart=(c===cyc.num)?cw-1:3;
      for(let w=wStart;w>=0;w--){
        const k=sdk(c,w,di,ei);
        if(all[k]){
          const done=all[k].filter(s=>s.done&&s.kg);
          if(done.length>0){
            const top=done.reduce((a,b)=>parseFloat(b.kg)>parseFloat(a.kg)?b:a);
            lastKg=parseFloat(top.kg);
            break outer;
          }
        }
      }
    }
    if(lastKg){
      const n=nsf(di,ei,PROG.weeks[cw],curKey);
      if(!all[curKey])all[curKey]=Array.from({length:n},()=>({kg:'',reps:'',done:false}));
      for(let i=0;i<n;i++){
        if(!all[curKey][i])all[curKey][i]={kg:'',reps:'',done:false};
        if(!all[curKey][i].kg)all[curKey][i].kg=String(lastKg);
      }
      filled++;
    }
  });
  if(filled>0){saveSets(all);showDay(di);toast(`✓ Predizpolnjeno ${filled} vaj`,'ok');}
  else toast('Ni prejšnjih podatkov','err');
}

// === REP PR tracking ===
function getRepPRs(){try{return JSON.parse(localStorage.getItem('wt_rep_prs')||'{}');}catch{return {};}}
function saveRepPRs(d){localStorage.setItem('wt_rep_prs',JSON.stringify(d));}
function checkRepPR(exName,kg,reps){
  if(!exName||!kg||!reps)return false;
  const prs=getRepPRs();
  if(!prs[exName])prs[exName]={};
  const cur=prs[exName][reps]||0;
  if(kg>cur){prs[exName][reps]=kg;saveRepPRs(prs);return cur>0;}
  return false;
}

// === TONNAGE TREND ===
function getTonnageHistory(){
  const sessions=getSessions().slice().reverse();
  const all=getSets();
  return sessions.map(s=>{
    const di=DAY_NAMES.indexOf(s.dayName);
    let tonnage=0;
    if(di>=0){
      // SAMO pravi teden te sesije (weekNum je 1-indexed)
      const w=Math.max(0,(s.weekNum||1)-1);
      for(let ei=0;ei<20;ei++){
        const k=sdk(s.cycle,w,di,ei);
        if(all[k])all[k].filter(x=>x.done&&x.kg&&x.reps).forEach(x=>{
          tonnage+=(parseFloat(x.kg)||0)*(parseFloat(x.reps)||0);
        });
      }
    }
    return {date:s.date,day:s.dayName,tonnage:Math.round(tonnage)};
  }).filter(t=>t.tonnage>0);
}
let tonnageChart=null;
function renderTonnageChart(){
  const hist=getTonnageHistory();
  const canvas=document.getElementById('tonnage-chart');
  const empty=document.getElementById('tonnage-empty');
  if(!canvas)return;
  if(hist.length<2){
    if(empty)empty.style.display='block';canvas.style.display='none';
    if(tonnageChart){tonnageChart.destroy();tonnageChart=null;}
    return;
  }
  if(empty)empty.style.display='none';canvas.style.display='block';
  if(tonnageChart)tonnageChart.destroy();
  const isDark=document.documentElement.getAttribute('data-theme')!=='light';
  tonnageChart=new Chart(canvas.getContext('2d'),{
    type:'bar',
    data:{labels:hist.slice(-20).map(h=>h.date.slice(5)),datasets:[{label:'Tonaža (kg)',data:hist.slice(-20).map(h=>h.tonnage),backgroundColor:'#378add'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{color:isDark?'#9da3ae':'#666'},grid:{color:isDark?'#2e3035':'#eee'}},x:{ticks:{color:isDark?'#9da3ae':'#666'},grid:{display:false}}}}
  });
}

// === FREKVENCA MIŠIC ===
function renderMuscleFrequency(){
  const sessions=getSessions();
  const weekAgo=Date.now()-7*86400000;
  const recent=sessions.filter(s=>new Date(s.date).getTime()>=weekAgo);
  const freq={};
  recent.forEach(s=>{
    const di=DAY_NAMES.indexOf(s.dayName);if(di<0)return;
    const seen=new Set();
    PROG.days[di]&&PROG.days[di].ex.forEach(e=>{
      let map=EX_MAP[e.n];
      if(!map){const db=EXERCISE_DB.find(x=>x.n===e.n);if(db)map={p:[db.m]};}
      if(map&&map.p)map.p.forEach(m=>seen.add(m));
    });
    seen.forEach(m=>{freq[m]=(freq[m]||0)+1;});
  });
  const muscles=Object.keys(VOL_TARGETS);
  const rows=muscles.map(m=>{
    const f=freq[m]||0;
    let cls,msg;
    if(f===0){cls='vl-low';msg='0× ni treniran';}
    else if(f===1){cls='vl-high';msg='1× — lahko 2×';}
    else{cls='vl-opt';msg=`${f}× ✓`;}
    return `<div class="bpr-row"><span>${m}</span><span class="vl-tag ${cls}">${msg}</span></div>`;
  }).join('');
  return `<div style="font-size:10px;color:var(--text3);margin-bottom:6px;">2× tedensko je za večino bolje kot 1×</div>${rows}`;
}

// === CILJI + NAPOVED ===
function getGoals(){try{return JSON.parse(localStorage.getItem('wt_goals')||'[]');}catch{return [];}}
function saveGoals(g){localStorage.setItem('wt_goals',JSON.stringify(g));}
function addGoal(){
  const ex=document.getElementById('goal-ex').value;
  const target=parseFloat(document.getElementById('goal-target').value);
  const date=document.getElementById('goal-date').value;
  if(!ex||!target||!date){toast('Izpolni vsa polja','err');return;}
  const goals=getGoals();
  goals.push({ex,target,date});
  saveGoals(goals);
  document.getElementById('goal-target').value='';
  renderGoals();
  toast('✓ Cilj dodan','ok');
}
function deleteGoal(idx){const g=getGoals();g.splice(idx,1);saveGoals(g);renderGoals();}
function renderGoals(){
  const el=document.getElementById('goals-list');if(!el)return;
  const sel=document.getElementById('goal-ex');
  if(sel&&!sel._filled){
    const allNames=[...new Set([...Object.values(BIG_LIFTS),...EXERCISE_DB.map(e=>e.n)])];
    sel.innerHTML=allNames.map(n=>`<option value="${n}">${n}</option>`).join('');
    sel._filled=true;
  }
  const goals=getGoals();
  if(goals.length===0){el.innerHTML='<div style="font-size:12px;color:var(--text3);padding:.5rem;">Ni ciljev.</div>';return;}
  const hist=getE1RMHistory();
  el.innerHTML=goals.map((g,idx)=>{
    let cur=0;
    if(hist[g.ex]&&hist[g.ex].length>0)cur=hist[g.ex][hist[g.ex].length-1].e1rm;
    const pct=Math.min(100,Math.round((cur/g.target)*100));
    const daysLeft=Math.ceil((new Date(g.date)-Date.now())/86400000);
    let forecast='';
    if(hist[g.ex]&&hist[g.ex].length>=2){
      const data=hist[g.ex];
      const first=data[0],last=data[data.length-1];
      const daysSpan=(new Date(last.date)-new Date(first.date))/86400000||1;
      const ratePerDay=(last.e1rm-first.e1rm)/daysSpan;
      if(ratePerDay>0){
        const daysToGoal=(g.target-cur)/ratePerDay;
        const reachDate=new Date(Date.now()+daysToGoal*86400000);
        forecast=daysToGoal<=daysLeft?`✓ Na pravi poti (~${reachDate.toLocaleDateString('sl-SI')})`:`⚠ Prepočasi (~${reachDate.toLocaleDateString('sl-SI')})`;
      }else forecast='Stagnacija — ni napredka';
    }
    return `<div style="padding:8px;border-bottom:.5px solid var(--border);">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong style="font-size:13px;">${g.ex}</strong>
        <button class="bk-item-btn del" style="font-size:11px;" onclick="deleteGoal(${idx})">×</button>
      </div>
      <div style="font-size:11px;color:var(--text2);margin:3px 0;">Cilj ${g.target}kg · trenutno ${cur||'?'}kg · ${daysLeft>0?daysLeft+' dni':'rok potekel'}</div>
      <div style="height:8px;background:var(--bg3);border-radius:4px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${pct>=100?'var(--green)':'var(--blue)'};"></div></div>
      ${forecast?`<div style="font-size:10px;color:var(--text3);margin-top:3px;">${forecast}</div>`:''}
    </div>`;
  }).join('');
}

// === ENERGIJA / INJURY LOG ===
function getDayLog(){try{return JSON.parse(localStorage.getItem('wt_daylog')||'{}');}catch{return {};}}
function saveDayLog(d){localStorage.setItem('wt_daylog',JSON.stringify(d));}
function setEnergy(val){
  const log=getDayLog();
  const today=new Date().toISOString().split('T')[0];
  if(!log[today])log[today]={};
  log[today].energy=val;
  saveDayLog(log);
  document.querySelectorAll('.energy-btn').forEach((b,i)=>b.classList.toggle('on',i+1===val));
  toast('✓ Energija '+val+'/5','ok');
}
// === KOFEIN & SPANJE ===
function logCaffeineSleep(){
  const caf=parseFloat(document.getElementById('caffeine-in').value);
  const slp=parseFloat(document.getElementById('sleep-in').value);
  if((isNaN(caf)||caf<0)&&(isNaN(slp)||slp<0)){toast('Vnesi kofein ali spanje','err');return;}
  const log=getDayLog();
  const today=new Date().toISOString().split('T')[0];
  if(!log[today])log[today]={};
  if(!isNaN(caf)&&caf>=0)log[today].caffeine=caf;
  if(!isNaN(slp)&&slp>=0)log[today].sleep=slp;
  saveDayLog(log);
  document.getElementById('caffeine-in').value='';
  document.getElementById('sleep-in').value='';
  renderCaffeineSleep();
  toast('✓ Zabeleženo za danes','ok');
}
function renderCaffeineSleep(){
  const el=document.getElementById('cs-log');if(!el)return;
  const log=getDayLog();
  const today=new Date().toISOString().split('T')[0];
  // Današnji vnos
  const t=log[today]||{};
  let todayHtml='';
  if(t.caffeine!==undefined||t.sleep!==undefined){
    todayHtml=`<div style="font-size:12px;color:var(--text2);background:var(--bg3);padding:8px;border-radius:6px;margin:8px 0;text-align:center;">Danes: ${t.caffeine!==undefined?`☕ ${t.caffeine}mg`:''} ${t.caffeine!==undefined&&t.sleep!==undefined?'·':''} ${t.sleep!==undefined?`😴 ${t.sleep}h`:''}</div>`;
  }
  // Zgodovina zadnjih 14 dni
  const entries=Object.entries(log).filter(([d,v])=>v.caffeine!==undefined||v.sleep!==undefined).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,14);
  if(entries.length===0){el.innerHTML=todayHtml||'<div style="font-size:11px;color:var(--text3);padding:.4rem;">Ni zapisov.</div>';return;}
  // Povprečja
  const cafVals=entries.filter(([d,v])=>v.caffeine!==undefined).map(([d,v])=>v.caffeine);
  const slpVals=entries.filter(([d,v])=>v.sleep!==undefined).map(([d,v])=>v.sleep);
  const avgCaf=cafVals.length?Math.round(cafVals.reduce((a,b)=>a+b,0)/cafVals.length):null;
  const avgSlp=slpVals.length?(slpVals.reduce((a,b)=>a+b,0)/slpVals.length).toFixed(1):null;
  let html=todayHtml;
  if(avgCaf!==null||avgSlp!==null){
    html+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0;">
      ${avgCaf!==null?`<div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:700;color:#a16207;">${avgCaf}mg</div><div style="font-size:10px;color:var(--text3);">povp. kofein</div></div>`:''}
      ${avgSlp!==null?`<div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:700;color:var(--blue-text);">${avgSlp}h</div><div style="font-size:10px;color:var(--text3);">povp. spanje</div></div>`:''}
    </div>`;
  }
  html+=entries.map(([date,v])=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:.5px solid var(--border);">
    <span style="color:var(--text3);font-size:11px;">${new Date(date).toLocaleDateString('sl-SI')}</span>
    <span>${v.caffeine!==undefined?`☕ ${v.caffeine}mg`:''} ${v.sleep!==undefined?`<span style="color:var(--blue-text);margin-left:8px;">😴 ${v.sleep}h</span>`:''}</span>
  </div>`).join('');
  el.innerHTML=html;
}

async function sv(key,si,field,val,di,ei,cn,isBarbell){
  // Validacija
  let inpSel='.ri';
  if(field==='kg'||field==='kgR'){
    inpSel=field==='kgR'?'.wi:nth-of-type(2)':'.wi';
  }
  const inpEl=document.querySelector(`#row-${key}-${si} ${inpSel}`);
  if(val!==''&&val!==undefined&&val!==null){
    const num=parseFloat(val);
    if(isNaN(num)||num<0){
      toast((field==='kg'||field==='kgR')?'Negativna teža?':'Negativne pon?','err');
      if(inpEl){inpEl.value='';inpEl.classList.add('invalid');setTimeout(()=>inpEl.classList.remove('invalid'),1500);}
      return;
    }
    if((field==='kg'||field==='kgR')&&num>500){
      if(!await uiConfirm(`${num}kg — si prepričan? (verjetno tipkarska napaka)`)){
        if(inpEl)inpEl.value='';return;
      }
    }
    if(field==='reps'&&num>100){
      if(!await uiConfirm(`${num} ponovitev — si prepričan?`)){
        if(inpEl)inpEl.value='';return;
      }
    }
  }
  if(inpEl)inpEl.classList.remove('invalid');
  const wk=PROG.weeks[cw],n=nsf(di,ei,wk,key),all=getSets();
  if(!all[key])all[key]=Array.from({length:n},()=>({kg:'',reps:'',done:false}));
  while(all[key].length<=si)all[key].push({kg:'',reps:'',done:false});
  all[key][si][field]=val;
  // Shrani ime vaje ob vnosu (za ločeno zgodovino po vaji ob zamenjavi)
  const _exObj=PROG.days[di].ex[ei];
  const _curName=getSwappedName(key,_exObj?_exObj.n:'',_exObj&&_exObj.extra);
  if(_curName){all[key][si].exName=_curName;all[key][si].exerciseId=exStableId(_curName);}
  saveSets(all);
  rebuildRows(key,di,ei,wk,n,all[key]);checkPR(key,di,ei,all[key]);
  if(field==='kg'){
    const kg=parseFloat(val)||0;
    if(kg>0){
      const cur=getSets();
      for(let i=si+1;i<n;i++){
        if(!cur[key][i])cur[key][i]={kg:'',reps:'',done:false};
        if(!cur[key][i].kg&&!cur[key][i].done){
          cur[key][i].kg=val;
          const inp=document.querySelector(`#row-${key}-${i} .wi`);
          if(inp)inp.value=val;
        }
      }
      saveSets(cur);
    }
    if(PROG.days[di].ex[ei].m&&cw===0){const box=document.querySelector(`#ec-${key} .wubox`);if(box){const fkg=parseFloat(all[key][0]?.kg)||0;if(fkg>0){const type=PROG.days[di].ex[ei].n.toLowerCase().includes('squat')||PROG.days[di].ex[ei].n.toLowerCase().includes('deadlift')||PROG.days[di].ex[ei].n.toLowerCase().includes('leg press')?'lower':'upper';const wu=buildWU(fkg,type);box.innerHTML=`<strong>Ogrevanje:</strong> ${wu.map(w=>`${w.pct===0?'Palica':w.pct+'%'}→${w.kg}kg×${w.reps}`).join(' · ')}`;}}}
    if(isBarbell){
      updatePlMini(key,si,kg);
      // Posodobi velik plate box ne glede na set — kaže zadnjo vneseno težo
      if(kg>0)updatePlateBox(key,kg);
      // Posodobi tudi vrstice, ki so dobile auto-fill enako težo
      if(kg>0){
        for(let i=si+1;i<n;i++){
          const inp=document.querySelector(`#row-${key}-${i} .wi`);
          if(inp&&parseFloat(inp.value)===kg)updatePlMini(key,i,kg);
        }
      }
    }
  }
}

function updatePlateBox(key,kg){
  const pb=document.getElementById('pb-'+key);if(!pb)return;
  if(kg<=0){pb.innerHTML='<span style="color:var(--text3);">Vnesi težo v S1 za prikaz plošč</span>';return;}
  const pl=calcPlatesFor(kg);
  if(pl)pb.innerHTML=`<strong>Vsaka stran:</strong> ${pl.each}<span class="pl-each">Palica ${pl.bar}kg + ${pl.perSide*2}kg = ${pl.total}kg</span>`;
  else pb.innerHTML=`Ni možno sestaviti ${kg}kg s trenutnimi ploščami.`;
}

// Posodobi mini prikaz plošč pod posameznim setom (varno tudi za non-barbell — element ne obstaja)
function updatePlMini(key,si,kg){
  const el=document.getElementById(`pl-${key}-${si}`);
  if(!el)return;
  const pls=platesShort(kg);
  el.textContent=pls.text;
  el.className='pl-mini '+pls.cls;
}

function rebuildRows(key,di,ei,wk,n,sets){
  const tb=document.getElementById('rows-'+key);if(!tb)return;
  tb.querySelectorAll('tr').forEach((row,si)=>{if(si>=n)return;const s=sets[si]||{};const vol=Math.round((parseFloat(s.kg)||0)*(parseFloat(s.reps)||0));const orm=s.kg&&s.reps?Math.round(parseFloat(s.kg)*(1+parseFloat(s.reps)/30)):'';const vc=row.querySelector('.vc'),oc=row.querySelector('.oc');if(vc){vc.textContent=vol>0?vol+'kg':'';vc.className='vc'+(vol>0?' hv':'');}if(oc)oc.textContent=orm?orm+'kg':'';});
  const tv=sets.slice(0,n).reduce((s,x)=>(parseFloat(x.kg)||0)*(parseFloat(x.reps)||0)+s,0);
  const card=document.getElementById('ec-'+key);
  if(card){let vt=card.querySelector('.vol-total');if(!vt){vt=document.createElement('div');vt.className='vol-total';vt.style.cssText='font-size:11px;color:var(--green-text);margin-top:4px;text-align:right;';card.querySelector('.st').after(vt);}vt.textContent=tv>0?'Skupaj: '+Math.round(tv).toLocaleString()+' kg':'';}
}

// Posodobi summary stats + toggle gumb v kartici (brez full re-rendera)
function rerenderExCard(key,di,ei,cn){
  const card=document.getElementById('ec-'+key);if(!card)return;
  const wk=PROG.weeks[cw],n=nsf(di,ei,wk,key);
  const sets=(getSets()[key]||[]).slice(0,n);
  const doneSets=sets.filter(s=>s.done&&s.kg&&s.reps);
  const topSet=doneSets.length>0?doneSets.reduce((a,b)=>parseFloat(b.kg)>parseFloat(a.kg)?b:a):null;
  const totalVol=doneSets.reduce((a,b)=>a+(parseFloat(b.kg)||0)*(parseFloat(b.reps)||0),0);
  const isAllDone=sets.length>=n&&sets.every(s=>s.done);
  // Update / create summary
  let sm=card.querySelector('.exc-summary');
  if(topSet){
    const sumHTML=`<span class="es-stats">✓ ${doneSets.length}/${n} · top ${topSet.kg}kg×${topSet.reps} · ${Math.round(totalVol)}kg</span><button class="toggle-fold" onclick="toggleFold('${key}')">${card.classList.contains('col-done')?'razširi ▾':'skrči ▴'}</button>`;
    if(!sm){sm=document.createElement('div');sm.className='exc-summary';card.querySelector('.ex-top').after(sm);}
    sm.innerHTML=sumHTML;
  }
  // Toggle gumb v .bdg če je all done
  let inlineFold=card.querySelector('.bdg .toggle-fold');
  if(isAllDone&&!inlineFold){
    const bdg=card.querySelector('.bdg');
    if(bdg){const b=document.createElement('button');b.className='toggle-fold';b.textContent='skrči ▴';b.setAttribute('onclick',`toggleFold('${key}')`);bdg.appendChild(b);}
  } else if(!isAllDone&&inlineFold){
    inlineFold.remove();
  }
}

function checkPR(key,di,ei,sets){
  const prs=getPRs(),prk=`pr${di}${ei}`;
  const cpr=typeof prs[prk]==='object'?prs[prk].kg:(prs[prk]||0);
  // Najdi top set (max kg, ali pri tied max e1RM)
  let bestSet=null,bestE1=0;
  sets.forEach(s=>{
    if(!s.kg||!s.reps)return;
    const e1=parseFloat(s.kg)*(1+parseInt(s.reps)/30);
    if(e1>bestE1){bestE1=e1;bestSet=s;}
  });
  const maxKg=bestSet?parseFloat(bestSet.kg):0;
  const card=document.getElementById('ec-'+key);if(!card)return;
  const exName=(PROG.days[di].ex[ei]||{}).n||'Vaja';
  // Rep PR — preveri vsak opravljeni set posebej
  let repPRhit=false;
  sets.forEach(s=>{
    if(s.done&&s.kg&&s.reps){
      if(checkRepPR(exName,parseFloat(s.kg),parseInt(s.reps)))repPRhit=true;
    }
  });
  if(maxKg>cpr&&maxKg>0){
    const history=(typeof prs[prk]==='object'&&Array.isArray(prs[prk].history))?prs[prk].history:[];
    history.unshift({kg:maxKg,reps:parseInt(bestSet.reps),date:new Date().toISOString().split('T')[0]});
    prs[prk]={kg:maxKg,reps:parseInt(bestSet.reps),date:new Date().toISOString().split('T')[0],exName,history:history.slice(0,20)};
    savePRs(prs);
    card.classList.add('pr-card');
    let pb=card.querySelector('.prb');
    if(!pb){pb=document.createElement('span');pb.className='b prb';pb.textContent='PR';card.querySelector('.bdg').appendChild(pb);}
    const bn=document.getElementById('pr-banner');
    if(bn){bn.textContent=`Nov PR: ${exName} — ${maxKg}kg × ${bestSet.reps}! 💪`;bn.classList.add('visible');setTimeout(()=>bn.classList.remove('visible'),4000);}
  } else if(repPRhit){
    const bn=document.getElementById('pr-banner');
    if(bn){bn.textContent=`Rep PR: ${exName}! 💪`;bn.classList.add('visible');setTimeout(()=>bn.classList.remove('visible'),3000);}
  }
}

// Premakni zeleni "next-set" poudarek na prvo nedokončano serijo (gym mode)
function updateNextSetHighlight(key){
  const all=getSets();
  const sets=all[key]||[];
  let nextSi=-1;
  for(let i=0;i<sets.length;i++){if(!sets[i].done){nextSi=i;break;}}
  let i=0;
  while(true){
    const r=document.getElementById(`row-${key}-${i}`);
    if(!r)break;
    r.classList.toggle('next-set',i===nextSi);
    i++;
  }
}

function tgSet(key,si,di,ei,cn){
  const wk=PROG.weeks[cw],n=nsf(di,ei,wk,key),all=getSets();
  if(!all[key])all[key]=Array.from({length:n},()=>({kg:'',reps:'',done:false}));
  all[key][si].done=!all[key][si].done;
  if(all[key][si].done&&navigator.vibrate)navigator.vibrate(25);
  // Shrani ime vaje (za ločeno zgodovino ob zamenjavi)
  const _exO=PROG.days[di].ex[ei];
  const _cn=getSwappedName(key,_exO?_exO.n:'',_exO&&_exO.extra);
  if(_cn){all[key][si].exName=_cn;all[key][si].exerciseId=exStableId(_cn);}
  saveSets(all);
  const btns=document.querySelectorAll(`#ec-${key} .lb`);
  if(btns[si]){btns[si].classList.toggle('done',all[key][si].done);btns[si].textContent=all[key][si].done?'✓':'Log';}
  if(all[key][si].done){
    // Drop set ne sproži timer-ja (gre takoj naprej)
    if(!all[key][si].drop){
      const _e=PROG.days[di].ex[ei];
      const _nm=getSwappedName(key,_e?_e.n:'',_e&&_e.extra);
      startT(key,restForEx(_e&&_e.id,_nm,_e?_e.r:90));
    }
    const nextSi=si+1;
    if(nextSi<n){
      if(!all[key][nextSi])all[key][nextSi]={kg:'',reps:'',done:false};
      const curKg=all[key][si].kg,curReps=all[key][si].reps;
      // Pri drop setu NE auto-filla naslednjega — manj teže pričakovano
      if(!all[key][si].drop){
        if(curKg&&!all[key][nextSi].kg){all[key][nextSi].kg=curKg;const iw=document.querySelector(`#row-${key}-${nextSi} .wi`);if(iw)iw.value=curKg;updatePlMini(key,nextSi,parseFloat(curKg)||0);}
        if(curReps&&!all[key][nextSi].reps){all[key][nextSi].reps=curReps;const ir=document.querySelector(`#row-${key}-${nextSi} .ri`);if(ir)ir.value=curReps;}
      }
      saveSets(all);
    }
  }
  const cnt=PROG.days[di].ex.filter((_,i)=>!isExHidden(sdk(cn,cw,di,i))&&allDone(di,i)).length;
  const el=document.getElementById('ex-done');if(el)el.textContent=cnt;
  if(typeof updateNextSetHighlight==='function')updateNextSetHighlight(key);
  if(typeof updateTabColors==='function')updateTabColors();
  if(typeof refreshGymTarget==='function')refreshGymTarget();
  // Auto-scroll na naslednjo nedokončano vajo, ko se trenutna v celoti zaključi
  if(allDone(di,ei)){
    // Auto-collapse trenutno (razen če je user ročno razširil)
    if(foldState[key]!==false){
      const card=document.getElementById('ec-'+key);
      if(card){
        // Posodobi summary preden skrčimo
        rerenderExCard(key,di,ei,cn);
        setTimeout(()=>{
          const c=document.getElementById('ec-'+key);
          if(c)c.classList.add('col-done');
        },400);
      }
    }
    let nextEi=-1;
    for(let i=ei+1;i<PROG.days[di].ex.length;i++){
      if(!allDone(di,i)&&!isExHidden(sdk(cn,cw,di,i))){nextEi=i;break;}
    }
    if(nextEi<0){
      for(let i=0;i<ei;i++){if(!allDone(di,i)&&!isExHidden(sdk(cn,cw,di,i))){nextEi=i;break;}}
    }
    if(nextEi>=0){
      const nextKey=sdk(cn,cw,di,nextEi);
      const nextCard=document.getElementById('ec-'+nextKey);
      if(nextCard){
        setTimeout(()=>{
          nextCard.scrollIntoView({behavior:'smooth',block:'start'});
          // Subtle highlight
          nextCard.style.transition='box-shadow .4s';
          nextCard.style.boxShadow='0 0 0 2px var(--green)';
          setTimeout(()=>nextCard.style.boxShadow='',1500);
        },600);
      }
    } else {
      toast('💪 Vse vaje zaključene!','ok');
    }
  }
}

function saveNote(nk,val){const n=getNotes();n[nk]=val;saveNotes(n);}

// 3-tonska sekvenca, glasnejša od prejšnjega beep-a
function beepSequence(){
  const s=getAlarmSettings();
  if(!s.sound)return;
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    if(ctx.state==='suspended')ctx.resume();
    const tones=MELODIES[s.melody]||MELODIES.default;
    const volMult=(s.volume||90)/100;
    tones.forEach(t=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);
      o.type='sine';o.frequency.value=t.f;
      const start=ctx.currentTime+t.d;
      g.gain.setValueAtTime(0,start);
      g.gain.linearRampToValueAtTime(t.vol*volMult,start+.02);
      g.gain.exponentialRampToValueAtTime(.001,start+t.len);
      o.start(start);o.stop(start+t.len);
    });
  }catch(e){}
}

function alertEnd(key){
  const s=getAlarmSettings();
  const bar=document.getElementById('tb-'+key);
  // Vibracija
  if(s.vibrate&&navigator.vibrate)navigator.vibrate([400,150,400,150,600]);
  // Zvok
  beepSequence();
  // Vizualni flash
  if(bar){
    bar.classList.add('flash');
    const cnt=document.getElementById('tc-'+key);
    if(cnt)cnt.textContent='✓ KONEC';
    setTimeout(()=>{
      if(bar){bar.classList.remove('flash');bar.classList.remove('on');}
      if(cnt)cnt.textContent='—';
    },5000);
  }
  // Push notification
  if(s.notif&&'Notification' in window && Notification.permission==='granted'){
    try{new Notification('Konec odmora 💪',{body:'Naslednja serija!',tag:'workout-rest',renotify:true});}catch(e){}
  }
}

// Active rest timer state (persistira preko reload-a)
const LS_TIMER='wt_active_timer';

function startT(key,secs){
  if(TM[key])clearInterval(TM[key]);
  // Preveri notification permission ob vsakem startu — če manjka, prosi
  if('Notification' in window){
    if(Notification.permission==='default'){
      Notification.requestPermission().then(p=>{
        if(p!=='granted')toast('⚠️ Brez dovoljenja: ni zvoka pri zaklenjenem zaslonu','err');
      });
    } else if(Notification.permission==='denied'){
      // Samo enkrat opozori — ne na vsakem timer startu
      if(!localStorage.getItem('wt_notif_warned')){
        toast('⚠️ Notif blokirane v Settings — ni zvoka v ozadju','err');
        localStorage.setItem('wt_notif_warned','1');
      }
    }
  }
  const endTs=Date.now()+secs*1000;
  localStorage.setItem(LS_TIMER,JSON.stringify({key,endTs}));
  const bar=document.getElementById('tb-'+key),cnt=document.getElementById('tc-'+key);
  if(!bar||!cnt)return;
  bar.classList.add('on');bar.classList.remove('flash');
  scheduleNotification(secs);
  const tick=()=>{
    const rem=Math.max(0,Math.ceil((endTs-Date.now())/1000));
    cnt.textContent=rem;
    if(rem<=0){
      clearInterval(TM[key]);TM[key]=null;
      localStorage.removeItem(LS_TIMER);
      alertEnd(key);
    }
  };
  tick();
  TM[key]=setInterval(tick,250);
}
function stopT(key){
  if(TM[key]){clearInterval(TM[key]);TM[key]=null;}
  localStorage.removeItem(LS_TIMER);
  cancelScheduledNotification();
  const b=document.getElementById('tb-'+key);
  if(b){b.classList.remove('on');b.classList.remove('flash');}
  const c=document.getElementById('tc-'+key);if(c)c.textContent='—';
}

// Scheduled notification — pošlje SW-ju, ki garantirano sproži notif
// tudi če je app v ozadju ali zaslon ugasnjen
let pendingNotifTimeout=null;
let activeTimerId=null;
function scheduleNotification(secs){
  cancelScheduledNotification();
  const s=getAlarmSettings();
  if(!s.notif||!('Notification' in window)||Notification.permission!=='granted')return;
  activeTimerId='t'+Date.now();
  // Pot 1: Service Worker (deluje v ozadju)
  const swOk=swMessage({
    type:'SCHEDULE_REST_END',
    id:activeTimerId,
    delayMs:secs*1000,
    label:'Naslednja serija — gremo!'
  });
  // Pot 2 (fallback): direct setTimeout — če SW ni na voljo
  if(!swOk){
    pendingNotifTimeout=setTimeout(()=>{
      try{
        new Notification('⏰ Konec odmora!',{
          body:'Naslednja serija — gremo!',
          tag:'workout-rest',
          renotify:true,
          vibrate:[400,150,400,150,600],
          requireInteraction:true,
          silent:false
        });
      }catch(e){}
    },secs*1000);
  }
}
function cancelScheduledNotification(){
  if(pendingNotifTimeout){clearTimeout(pendingNotifTimeout);pendingNotifTimeout=null;}
  if(activeTimerId){
    swMessage({type:'CANCEL_REST_END',id:activeTimerId});
    activeTimerId=null;
  }
}

// Obnovi rest timer po reload-u
function restoreTimer(){
  const raw=localStorage.getItem(LS_TIMER);if(!raw)return;
  try{
    const t=JSON.parse(raw);
    const rem=Math.ceil((t.endTs-Date.now())/1000);
    if(rem<=0){localStorage.removeItem(LS_TIMER);return;}
    // Počisti morebitni obstoječi interval za ta key (proti podvajanju ob re-renderju)
    if(TM[t.key]){clearInterval(TM[t.key]);TM[t.key]=null;}
    // Počakaj da DOM zariše vajo, potem zagon
    setTimeout(()=>{
      const bar=document.getElementById('tb-'+t.key);
      if(!bar){return;}  // vaja ni (več) na zaslonu — pusti LS_TIMER, lahko se vrne
      const cnt=document.getElementById('tc-'+t.key);
      bar.classList.add('on');bar.classList.remove('flash');
      if(TM[t.key]){clearInterval(TM[t.key]);}
      const tick=()=>{
        const r=Math.max(0,Math.ceil((t.endTs-Date.now())/1000));
        if(cnt)cnt.textContent=r;
        if(r<=0){clearInterval(TM[t.key]);TM[t.key]=null;localStorage.removeItem(LS_TIMER);alertEnd(t.key);}
      };
      tick();TM[t.key]=setInterval(tick,250);
    },50);
  }catch(e){localStorage.removeItem(LS_TIMER);}
}
function pad(n){return String(n).padStart(2,'0');}

// === SERVICE WORKER REGISTRACIJA ===
let swReg=null;
if('serviceWorker' in navigator){
  // Ko nov SW prevzame nadzor → samodejno osveži stran (dobiš novo vsebino brez ročnega reloada)
  let _swRefreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(_swRefreshing)return;
    _swRefreshing=true;
    window.location.reload();
  });
  window.addEventListener('load',()=>{
    // updateViaCache:'none' → brskalnik VEDNO preveri sw.js po mreži (ne iz HTTP predpomnilnika)
    navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>{
      swReg=reg;
      console.log('SW registriran');
      reg.update(); // takoj preveri za novo verzijo
      reg.addEventListener('updatefound',()=>{
        const nw=reg.installing;
        if(nw){nw.addEventListener('statechange',()=>{
          if(nw.state==='installed'&&navigator.serviceWorker.controller){
            toast('🔄 Posodabljam na novo verzijo...','ok');
          }
        });}
      });
    }).catch(err=>console.warn('SW registracija ni uspela:',err));
    navigator.serviceWorker.ready.then(reg=>{swReg=reg;});
  });
}

// Helper za pošiljanje sporočila SW-ju
function swMessage(msg){
  if(swReg&&swReg.active){
    swReg.active.postMessage(msg);
    return true;
  }
  if(navigator.serviceWorker&&navigator.serviceWorker.controller){
    navigator.serviceWorker.controller.postMessage(msg);
    return true;
  }
  return false;
}

// === SESSION PERSISTENCE ===
const LS_SESS='wt_active_sess';

let activeSessionContext=null;
function tickSessionClock(){const el=document.getElementById('st-d');if(!el||!stStart)return;const d=Math.max(0,Math.floor((Date.now()-stStart)/1000));el.textContent=pad(Math.floor(d/3600))+':'+pad(Math.floor((d%3600)/60))+':'+pad(d%60);}
async function toggleSess(){
  const dot=document.getElementById('sess-dot');
  if(!stRun){
    if('Notification' in window&&Notification.permission==='default'){try{Notification.requestPermission();}catch(e){}}
    sessStart=new Date();stStart=Date.now();stRun=true;activeSessionContext={startMs:stStart,startISO:sessStart.toISOString(),dayIdx:cd,weekIdx:cw,cycle:getCyc().num,profile:getActiveProfile()};
    localStorage.setItem(LS_SESS,JSON.stringify(activeSessionContext));
    if(dot)dot.classList.add('on');document.getElementById('st-b').textContent='Zaključi';document.getElementById('st-b').classList.add('active');document.getElementById('st-s').textContent=`${sessStart.toLocaleTimeString('sl-SI',{hour:'2-digit',minute:'2-digit'})} · ${DAY_NAMES[activeSessionContext.dayIdx]}`;
    clearInterval(stInt);stInt=setInterval(tickSessionClock,1000);tickSessionClock();renderTodayCard();return;
  }
  const ctx=activeSessionContext||JSON.parse(localStorage.getItem(LS_SESS)||'{}');
  if(!await uiConfirm(`Zaključi ${DAY_NAMES[ctx.dayIdx??cd]} session?`,'Zaključi'))return;
  clearInterval(stInt);stRun=false;localStorage.removeItem(LS_SESS);if(dot)dot.classList.remove('on');
  const end=new Date(),dur=Math.floor((end-sessStart)/1000),durMin=Math.max(0,Math.floor(dur/60)),record=buildImmutableSessionRecord(sessStart,end,durMin,ctx),sessions=getSessions();sessions.unshift(record);saveSessions(sessions);
  document.getElementById('st-b').textContent='Start session';document.getElementById('st-b').classList.remove('active');document.getElementById('st-d').textContent='00:00:00';document.getElementById('st-s').textContent=`Zadnji: ${durMin}min · ${record.dayName}`;
  sessStart=null;activeSessionContext=null;await autoBackupToIDB();setGymMode(false);renderTodayCard();toast('✓ Session shranjen + lokalni snapshot','ok');
}
function restoreSession(){
  const raw=localStorage.getItem(LS_SESS);if(!raw)return;
  try{const s=JSON.parse(raw);if(!s.startISO||!Number.isFinite(Number(s.startMs)))throw new Error('bad session');activeSessionContext={...s,cycle:Number(s.cycle)||getCyc().num,profile:s.profile||getActiveProfile()};sessStart=new Date(s.startISO);stStart=Number(s.startMs);stRun=true;if(typeof s.dayIdx==='number')cd=s.dayIdx;if(typeof s.weekIdx==='number')cw=s.weekIdx;
    const dot=document.getElementById('sess-dot');if(dot)dot.classList.add('on');const btn=document.getElementById('st-b');if(btn){btn.textContent='Zaključi';btn.classList.add('active');}const ss=document.getElementById('st-s');if(ss)ss.textContent=`${sessStart.toLocaleTimeString('sl-SI',{hour:'2-digit',minute:'2-digit'})} · ${DAY_NAMES[cd]} (obnovljeno)`;clearInterval(stInt);stInt=setInterval(tickSessionClock,1000);tickSessionClock();showDay(cd);toast('↺ Sesija obnovljena','ok');
  }catch(e){localStorage.removeItem(LS_SESS);activeSessionContext=null;}
}
function cycleExerciseMetrics(cn,di,ei){
  const all=getSets();let done=0,total=0,maxRpe=0,maxPain=0,bestE1rm=0,peak=0;
  for(let w=0;w<4;w++){const key=sdk(cn,w,di,ei),sets=all[key]||[];maxPain=Math.max(maxPain,getPain(key));const n=Math.min(sets.length,nsf(di,ei,PROG.weeks[w],key));sets.slice(0,n).forEach(s=>{total++;if(s.done)done++;const kg=parseFloat(s.kg)||0,reps=parseInt(s.reps)||0,rpe=parseFloat(s.rpe)||0;if(s.done&&kg>0&&reps>0){peak=Math.max(peak,kg);bestE1rm=Math.max(bestE1rm,kg*(1+reps/30));}maxRpe=Math.max(maxRpe,rpe);});}
  return {done,total,completion:total?done/total:0,maxRpe,maxPain,bestE1rm,peak};
}
function smartCycleSuggestion(cn,di,ei,name){
  const cur=cycleExerciseMetrics(cn,di,ei),prev=cn>1?cycleExerciseMetrics(cn-1,di,ei):null,prev2=cn>2?cycleExerciseMetrics(cn-2,di,ei):null,lower=/squat|deadlift|rdl|leg press/i.test(name),inc=lower?5:2.5,base=cur.peak||getWeek1Weight(cn,di,ei)||0;
  if(!base)return {skg:0,sc:'ss',sl:'Brez podatkov',reason:'Ni opravljenih delovnih setov',...cur};
  const trend=prev&&prev.bestE1rm?((cur.bestE1rm-prev.bestE1rm)/prev.bestE1rm)*100:0;
  const twoDrops=prev&&prev2&&prev.bestE1rm<prev2.bestE1rm*.98&&cur.bestE1rm<prev.bestE1rm*.98;
  if(cur.maxPain>=4)return {skg:Math.max(0,roundToPlate(base*.9)),sc:'sd2',sl:'-10%',reason:`Bolečina ${cur.maxPain}/10`,...cur,trend};
  if(twoDrops)return {skg:Math.max(0,base-inc),sc:'sd2',sl:`-${inc}kg`,reason:'Dva zaporedna padca e1RM',...cur,trend};
  if(cur.completion<.7||cur.maxRpe>=10||trend<-4)return {skg:Math.max(0,base-inc),sc:'sd2',sl:`-${inc}kg`,reason:cur.completion<.7?'Preveč zgrešenih setov':cur.maxRpe>=10?'Več grinderjev / RPE 10':'e1RM je opazno padel',...cur,trend};
  if(cur.completion>=.9&&(cur.maxRpe===0||cur.maxRpe<=8.5)&&trend>=-1)return {skg:base+inc,sc:'su',sl:`+${inc}kg`,reason:'Visoka izvedba, nadzorovan RPE in stabilen e1RM',...cur,trend};
  return {skg:base,sc:'ss',sl:'Ohrani',reason:cur.maxRpe>8.5?'RPE je že visok':'Najprej potrdi stabilen napredek',...cur,trend};
}
function renderCycle(){
  const cyc=getCyc(),cn=cyc.num;document.getElementById('cy-title').textContent='Cikel '+cn;document.getElementById('cy-badge').textContent='Cikel '+cn;document.getElementById('next-num').textContent=cn+1;const sd=cyc.startDates||{};document.getElementById('cy-date-label').textContent=sd[cn]?`Začetek: ${sd[cn]}`:'';
  const mainEx=[];PROG.days.forEach((d,di)=>d.ex.forEach((e,ei)=>{if(e.m)mainEx.push({n:e.n,di,ei});}));
  let html=`<div class="cyrow"><div class="cyl" style="color:var(--text3);">Vaja</div><div class="cyh">Peak</div><div class="cyh">Predlog</div><div class="cyh">Akcija</div></div>`;const sugs=[];
  mainEx.forEach(({n,di,ei})=>{const s=smartCycleSuggestion(cn,di,ei,n);sugs.push({n,di,ei,peak:s.peak,skg:s.skg,sc:s.sc,sl:s.sl,reason:s.reason,completion:s.completion,maxRpe:s.maxRpe,maxPain:s.maxPain,trend:s.trend});html+=`<div class="cyrow" title="${safeHtml(s.reason)}"><div class="cyl">${safeHtml(n.split(' ').slice(0,3).join(' '))}</div><div class="cyv">${s.peak>0?s.peak+'kg':'—'}</div><div class="cyv ${s.sc}">${s.skg>0?s.skg+'kg':'—'}</div><div class="cyv ${s.sc}" style="font-size:11px;">${s.skg>0?s.sl:'—'}</div></div>${s.skg>0?`<div style="font-size:10px;color:var(--text3);padding:0 0 6px 4px;">${safeHtml(s.reason)} · ${Math.round(s.completion*100)}% setov${s.maxRpe?' · max RPE '+s.maxRpe:''}${s.maxPain?' · bolečina '+s.maxPain+'/10':''}</div>`:''}`;});
  document.getElementById('cy-content').innerHTML=html;const hasData=sugs.some(s=>s.skg>0),nc=document.getElementById('cy-next-card');
  if(hasData){nc.style.display='block';document.getElementById('cy-next-content').innerHTML=sugs.filter(s=>s.skg>0).map(s=>`<div class="mr"><span class="mk">${safeHtml(s.n.split(' ').slice(0,3).join(' '))}<br><small style="color:var(--text3)">${safeHtml(s.reason)}</small></span><span class="mv ${s.sc}">${s.skg}kg <span style="font-size:11px;">(${s.sl})</span></span></div>`).join('');localStorage.setItem('wt_sugs6',JSON.stringify(sugs));}else nc.style.display='none';
  if(cn>1){document.getElementById('cy-hist-card').style.display='block';const sel=document.getElementById('lift-selector');sel.innerHTML=MAIN_LIFTS.map((l,i)=>`<div class="lift-chip${i===activeLift?' on':''}" onclick="selectLift(${i})">${safeHtml(l.split(' ').slice(0,2).join(' '))}</div>`).join('');renderStrengthChart();let hhtml=`<div class="ch-row">${[''].concat(Array.from({length:Math.min(cn,5)},(_,i)=>`C${cn-Math.min(cn,5)+1+i}`)).map((h,i)=>`<div class="${i===0?'ch-hd':'ch-cy'}">${h}</div>`).join('')}</div>`;mainEx.forEach(({n,di,ei})=>{hhtml+=`<div class="ch-row"><div style="font-size:10px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${safeHtml(n.split(' ').slice(0,2).join(' '))}</div>`;for(let c=Math.max(1,cn-4);c<=cn;c++){const v=getPeakForExercise(c,di,ei),prev=c>1?getPeakForExercise(c-1,di,ei):0;hhtml+=`<div class="ch-val ${v>prev&&v>0?'ch-up':''}">${v>0?v+'kg':'—'}</div>`;}hhtml+='</div>';});document.getElementById('cy-hist-content').innerHTML=hhtml;}else document.getElementById('cy-hist-card').style.display='none';
  const cynotes=getCyNotes(),noteEntries=Object.entries(cynotes).filter(([,v])=>v);if(noteEntries.length>0){document.getElementById('cy-notes-hist-card').style.display='block';document.getElementById('cy-notes-hist').innerHTML=noteEntries.map(([k,v])=>`<div style="padding:8px 0;border-bottom:.5px solid var(--border);"><div style="font-size:11px;color:var(--purple-text);margin-bottom:3px;">Cikel ${safeHtml(k)}</div><div style="font-size:12px;color:var(--text2);">${safeHtml(v)}</div></div>`).join('');}else document.getElementById('cy-notes-hist-card').style.display='none';
}
function selectLift(idx){activeLift=idx;document.querySelectorAll('.lift-chip').forEach((c,i)=>c.classList.toggle('on',i===idx));renderStrengthChart();}

function renderStrengthChart(){
  const cyc=getCyc(),cn=cyc.num;if(cn<2)return;
  const liftName=MAIN_LIFTS[activeLift];
  let di=-1,ei=-1;
  PROG.days.forEach((d,dIdx)=>d.ex.forEach((e,eIdx)=>{if(e.n===liftName){di=dIdx;ei=eIdx;}}));
  if(di<0)return;
  const labels=[],vals=[];
  for(let c=1;c<=cn;c++){const v=getPeakForExercise(c,di,ei);labels.push('C'+c);vals.push(v>0?v:null);}
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  const gc=isDark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.06)',tc=isDark?'#9da3ae':'#666';
  const ctx=document.getElementById('strength-chart')?.getContext('2d');if(!ctx)return;
  if(strengthChart)strengthChart.destroy();
  strengthChart=new Chart(ctx,{type:'line',data:{labels,datasets:[{data:vals,borderColor:'#7f77dd',backgroundColor:'rgba(127,119,221,0.1)',tension:0.3,pointRadius:5,pointBackgroundColor:'#7f77dd',borderWidth:2,spanGaps:true}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{color:tc,font:{size:11}},grid:{color:gc},border:{color:gc}},x:{ticks:{color:tc,font:{size:11}},grid:{display:false},border:{color:gc}}}}});
}

async function confirmNext(){
  await autoBackupToIDB();
  const cyc=getCyc(),newN=cyc.num+1;
  const noteVal=document.getElementById('cy-note-input')?.value||'';
  if(noteVal.trim()){const cn=getCyNotes();cn[cyc.num]=noteVal.trim();saveCyNotes(cn);}
  const startDates=cyc.startDates||{};
  startDates[String(newN)]=new Date().toISOString().split('T')[0];
  saveCyc({num:newN,startDates});
  // Safe parse suggestions
  let sugs=[];
  try{const raw=localStorage.getItem('wt_sugs6');if(raw){const p=JSON.parse(raw);if(Array.isArray(p))sugs=p;}}catch(e){sugs=[];}
  const all=getSets();
  if(sugs.length>0){
    sugs.forEach(s=>{
      if(s&&typeof s.skg==='number'&&s.skg>0&&typeof s.di==='number'&&typeof s.ei==='number'){
        const nk=sdk(newN,0,s.di,s.ei);
        const wk=PROG.weeks[0];
        const baseN=PROG.days[s.di].ex[s.ei].m?wk.sM:wk.sA;
        // Fill all sets with suggested weight
        all[nk]=Array.from({length:Math.max(baseN,5)},()=>({kg:String(s.skg),reps:'',done:false}));
      }
    });
    saveSets(all);
  }
  cw=0;cd=0;
  document.querySelectorAll('.wt').forEach((t,i)=>t.classList.toggle('active',i===0));
  showPage('workout');showDay(0);
  toast(`Cikel ${newN} začet! Teže predizpolnjene v T1.`,'ok');
}

// GYM LOG
function renderSessHist(){
  const sessions=getSessions();
  const el=document.getElementById('sess-hist-content');if(!el)return;
  // Filter po dnevu
  const filter=(document.getElementById('sess-filter')||{}).value||'';
  // Render dolgoročni pregled + duration graf (vedno, neodvisno od filtra)
  renderLongtermStats();
  renderConsistency();
  renderDurationChart();
  let filtered=sessions;
  if(filter)filtered=sessions.filter(s=>s.dayName===filter);
  if(filtered.length===0){el.innerHTML='<div style="font-size:12px;color:var(--text3);">'+(filter?'Ni treningov za "'+filter+'".':'Še ni treningov.')+'</div>';return;}
  const all=getSets();
  const dayColor={"Push A":"#1d9e75","Pull A":"#3b82f6","Noge":"#f59e0b","Push B":"#10b981","Pull B":"#6366f1"};
  const monthNames=["Januar","Februar","Marec","April","Maj","Junij","Julij","Avgust","September","Oktober","November","December"];
  // Grupiraj po mesecu (YYYY-MM)
  const byMonth={};
  filtered.forEach(s=>{
    const mk=s.date.slice(0,7);
    if(!byMonth[mk])byMonth[mk]=[];
    byMonth[mk].push(s);
  });
  const months=Object.keys(byMonth).sort().reverse();
  const curMonth=new Date().toISOString().slice(0,7);
  // Pomožna: izračun tonaže/setov za sesijo
  function sessStats(s){
    const di=DAY_NAMES.indexOf(s.dayName);
    let tonnage=0,setCount=0;
    if(di>=0){
      const w=Math.max(0,(s.weekNum||1)-1);
      for(let ei=0;ei<20;ei++){
        const k=sdk(s.cycle,w,di,ei);
        if(all[k])all[k].filter(x=>x.done&&x.kg&&x.reps).forEach(x=>{
          tonnage+=(parseFloat(x.kg)||0)*(parseFloat(x.reps)||0);setCount++;
        });
      }
    }
    return {tonnage,setCount};
  }
  let html='';
  months.forEach(mk=>{
    const [y,m]=mk.split('-');
    const monthLabel=`${monthNames[parseInt(m)-1]} ${y}`;
    const sess=byMonth[mk];
    const isOpen=(mk===curMonth)||(months.length===1);
    // Mesečni povzetek
    let monthTon=0;
    sess.forEach(s=>{monthTon+=sessStats(s).tonnage;});
    const rows=sess.map(s=>{
      const idx=sessions.indexOf(s);
      const st=sessStats(s);
      const col=dayColor[s.dayName]||'var(--green-text)';
      return `<div class="sess-entry">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:2px;background:${col};display:inline-block;"></span><span class="sess-day">${s.dayName}</span><span style="font-size:10px;color:var(--text3);">T${s.weekNum} · C${s.cycle}</span></div>
            <div class="sess-meta">${s.date} · ${s.startTime||'–'}–${s.endTime||'–'}</div>
            <div style="display:flex;gap:10px;margin-top:4px;font-size:11px;">
              <span style="color:var(--green-text);">⏱ ${s.durationMin}min</span>
              ${st.setCount>0?`<span style="color:var(--blue-text);">${st.setCount} setov</span>`:''}
              ${st.tonnage>0?`<span style="color:var(--purple-text);">${(st.tonnage/1000).toFixed(1)}t</span>`:''}
            </div>
          </div>
          <div style="display:flex;gap:4px;">
            <button class="bk-item-btn" style="font-size:11px;" onclick="editSession(${idx})" title="Uredi">✎</button>
            <button class="bk-item-btn del" style="font-size:11px;" onclick="deleteSession(${idx})" title="Izbriši">×</button>
          </div>
        </div>
      </div>`;
    }).join('');
    html+=`<div class="month-group" style="margin-bottom:8px;">
      <div onclick="this.parentNode.classList.toggle('open')" style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:var(--bg3);border-radius:8px;cursor:pointer;">
        <span style="font-size:13px;font-weight:600;color:var(--text);">${monthLabel}</span>
        <span style="font-size:11px;color:var(--text3);">${sess.length} treningov · ${(monthTon/1000).toFixed(1)}t <span class="month-arrow">▾</span></span>
      </div>
      <div class="month-body">${rows}</div>
    </div>`;
    // Označi odprtost preko inline (dodamo open class spodaj prek JS)
    if(isOpen)html=html.replace('<div class="month-group" style="margin-bottom:8px;">','<div class="month-group open" style="margin-bottom:8px;">');
  });
  el.innerHTML=html;
}

// Dolgoročni pregled
function renderLongtermStats(){
  const el=document.getElementById('longterm-stats');if(!el)return;
  const sessions=getSessions();
  if(sessions.length===0){el.innerHTML='<div style="font-size:12px;color:var(--text3);">Ni podatkov.</div>';return;}
  const total=sessions.length;
  const durations=sessions.filter(s=>s.durationMin>0).map(s=>s.durationMin);
  const avgDur=durations.length?Math.round(durations.reduce((a,b)=>a+b,0)/durations.length):0;
  const maxDur=durations.length?Math.max(...durations):0;
  const minDur=durations.length?Math.min(...durations):0;
  // Treningov na teden (povprečje zadnjih 4 tednov)
  const now=Date.now();
  const last4w=sessions.filter(s=>now-new Date(s.date).getTime()<=28*86400000).length;
  const perWeek=(last4w/4).toFixed(1);
  // Najpogostejši dan
  const dayCounts={};
  sessions.forEach(s=>{dayCounts[s.dayName]=(dayCounts[s.dayName]||0)+1;});
  // Prvi trening datum
  const firstDate=sessions[sessions.length-1].date;
  const daysSince=Math.floor((now-new Date(firstDate).getTime())/86400000);
  return el.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
      <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:700;color:var(--green-text);">${total}</div><div style="font-size:10px;color:var(--text3);">treningov skupaj</div></div>
      <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:700;color:var(--blue-text);">${perWeek}</div><div style="font-size:10px;color:var(--text3);">na teden (4t avg)</div></div>
      <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:700;color:var(--purple-text);">${avgDur}</div><div style="font-size:10px;color:var(--text3);">povp. minut</div></div>
    </div>
    <div style="font-size:11px;color:var(--text3);margin-top:8px;text-align:center;">Najkrajši ${minDur}min · najdaljši ${maxDur}min · ${daysSince} dni od prvega treninga</div>`;
}

// Konsistenca po dnevih (zadnjih 8 tednov)
function renderConsistency(){
  const el=document.getElementById('consistency-stats');if(!el)return;
  const sessions=getSessions();
  const now=Date.now();
  const weeks=8;
  const since=now-weeks*7*86400000;
  const recent=sessions.filter(s=>new Date(s.date).getTime()>=since);
  if(recent.length===0){el.innerHTML='<div style="font-size:12px;color:var(--text3);">Ni treningov v zadnjih 8 tednih.</div>';return;}
  const colors={"Push A":"#1d9e75","Pull A":"#3b82f6","Noge":"#f59e0b","Push B":"#10b981","Pull B":"#6366f1"};
  // Preštej vsak dan
  const counts={};
  DAY_NAMES.forEach(d=>counts[d]=0);
  recent.forEach(s=>{if(counts[s.dayName]!==undefined)counts[s.dayName]++;});
  const maxCount=Math.max(weeks,...Object.values(counts));
  el.innerHTML=DAY_NAMES.map(d=>{
    const c=counts[d];
    const pct=Math.round((c/weeks)*100);
    const barW=Math.round((c/maxCount)*100);
    const color=colors[d]||'#1d9e75';
    return `<div style="margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;"><span style="color:var(--text2);">${d}</span><span style="color:var(--text3);">${c}× · ${pct}%</span></div>
      <div style="height:8px;background:var(--bg3);border-radius:4px;overflow:hidden;"><div style="height:100%;width:${barW}%;background:${color};border-radius:4px;"></div></div>
    </div>`;
  }).join('');
  // Najboljši/najslabši dan
  const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const best=sorted[0],worst=sorted[sorted.length-1];
  if(best[1]>0&&best[1]!==worst[1]){
    el.innerHTML+=`<div style="font-size:11px;color:var(--text3);margin-top:8px;text-align:center;">Najpogosteje: <strong style="color:var(--green-text);">${best[0]}</strong> · najredkeje: <strong style="color:var(--amber-text);">${worst[0]}</strong></div>`;
  }
}

// Trajanje treningov graf
let durationChart=null;
function renderDurationChart(){
  const canvas=document.getElementById('duration-chart');
  const empty=document.getElementById('duration-empty');
  if(!canvas)return;
  const sessions=getSessions().slice().reverse().filter(s=>s.durationMin>0);
  if(sessions.length<2){if(empty)empty.style.display='block';canvas.style.display='none';if(durationChart){durationChart.destroy();durationChart=null;}return;}
  if(empty)empty.style.display='none';canvas.style.display='block';
  if(durationChart)durationChart.destroy();
  const isDark=document.documentElement.getAttribute('data-theme')!=='light';
  const recent=sessions.slice(-20);
  durationChart=new Chart(canvas.getContext('2d'),{
    type:'line',
    data:{labels:recent.map(s=>s.date.slice(5)),datasets:[{label:'Min',data:recent.map(s=>s.durationMin),borderColor:'#7f77dd',backgroundColor:'rgba(127,119,221,0.1)',fill:true,tension:0.3,pointRadius:3}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{color:isDark?'#9da3ae':'#666'},grid:{color:isDark?'#2e3035':'#eee'}},x:{ticks:{color:isDark?'#9da3ae':'#666'},grid:{display:false}}}}
  });
}

async function editSession(idx){
  const sessions=getSessions();
  const s=sessions[idx];if(!s)return;
  const newDur=await uiPrompt(`Trajanje sesije v minutah:\n${s.dayName} ${s.date}`,s.durationMin);
  if(newDur===null)return;
  const n=parseInt(newDur);
  if(isNaN(n)||n<1||n>500){toast('Napačna vrednost (1-500 min)','err');return;}
  s.durationMin=n;
  // Posodobi tudi končni čas, če imamo začetni
  if(s.startTime){
    try{
      const [h,m]=s.startTime.split(':').map(Number);
      const endMs=new Date();endMs.setHours(h,m+n,0,0);
      s.endTime=endMs.toLocaleTimeString('sl-SI',{hour:'2-digit',minute:'2-digit'});
    }catch(e){}
  }
  saveSessions(sessions);
  renderSessHist();renderWeeklySummary();
  toast('✓ Sesija posodobljena','ok');
}

async function deleteSession(idx){
  const sessions=getSessions();
  const s=sessions[idx];if(!s)return;
  if(!await uiConfirm(`Izbrišem sesijo ${s.dayName} ${s.date}?`))return;
  sessions.splice(idx,1);
  saveSessions(sessions);
  renderSessHist();renderWeeklySummary();
  toast('Izbrisana','ok');
}

async function addManualSession(){
  const date=await uiPrompt('Datum (npr. '+new Date().toISOString().split('T')[0]+'):',new Date().toISOString().split('T')[0]);
  if(!date)return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){toast('Format mora biti YYYY-MM-DD','err');return;}
  const dayChoice=await uiPrompt('Kateri dan?\n1 = Push A\n2 = Pull A\n3 = Noge\n4 = Push B\n5 = Pull B','1');
  const dayIdx=parseInt(dayChoice)-1;
  if(isNaN(dayIdx)||dayIdx<0||dayIdx>4){toast('Napačen dan','err');return;}
  const dur=await uiPrompt('Trajanje v minutah:','60');
  const durMin=parseInt(dur);
  if(isNaN(durMin)||durMin<1||durMin>500){toast('Napačno trajanje','err');return;}
  const week=await uiPrompt('Teden v ciklu (1-4):',String(cw+1));
  const wn=parseInt(week);
  if(isNaN(wn)||wn<1||wn>4){toast('Napačen teden','err');return;}
  const sessions=getSessions();
  const cyc=getCyc();
  sessions.unshift({
    date,
    dayName:DAY_NAMES[dayIdx],
    weekNum:wn,
    cycle:cyc.num,
    startTime:'',
    endTime:'',
    durationMin:durMin
  });
  saveSessions(sessions);
  renderSessHist();renderWeeklySummary();
  toast('✓ Sesija dodana','ok');
}

function renderWeeklySummary(){
  const sessions=getSessions();
  const all=getSets();
  const el=document.getElementById('sum-grid');const det=document.getElementById('sum-detail');if(!el)return;
  const now=new Date();
  const weekAgo=new Date(now-7*24*3600*1000);
  const prevWeekAgo=new Date(now-14*24*3600*1000);
  const thisWeekSess=sessions.filter(s=>new Date(s.date)>=weekAgo);
  const prevWeekSess=sessions.filter(s=>new Date(s.date)>=prevWeekAgo&&new Date(s.date)<weekAgo);
  // Helper za štetje setov in volumna iz seznama sesij
  function calcSetsAndVol(sessList){
    let s=0,v=0;
    sessList.forEach(sess=>{
      const di=DAY_NAMES.indexOf(sess.dayName);
      if(di<0||!PROG.days[di])return;
      // SAMO pravi teden te sesije
      const w=Math.max(0,(sess.weekNum||1)-1);
      for(let ei=0;ei<PROG.days[di].ex.length;ei++){
        const key=sdk(sess.cycle,w,di,ei);
        if(all[key]){all[key].filter(x=>x.done).forEach(x=>{s++;v+=(parseFloat(x.kg)||0)*(parseFloat(x.reps)||0);});}
      }
    });
    return {sets:s,vol:v};
  }
  const thisStats=calcSetsAndVol(thisWeekSess);
  const prevStats=calcSetsAndVol(prevWeekSess);
  const trainDays=thisWeekSess.length;
  const totalMin=thisWeekSess.reduce((a,b)=>a+(b.durationMin||0),0);
  const prevDays=prevWeekSess.length;
  const prevMin=prevWeekSess.reduce((a,b)=>a+(b.durationMin||0),0);
  function diff(cur,prev,unit){if(prev===0&&cur===0)return'';if(prev===0)return'';const d=cur-prev;const sign=d>0?'+':'';return`<span class="${d>0?'sum-up':d<0?'sum-down':'sum-same'}">${sign}${d}${unit}</span>`;}
  // Streak — zaporedni tedni s vsaj 1 sesijo
  const streak=calcStreak(sessions);
  // Skupna statistika cikla
  const cyc=getCyc();
  const cycleSess=sessions.filter(s=>s.cycle===cyc.num);
  const cycleStats=calcSetsAndVol(cycleSess);
  const cycleMin=cycleSess.reduce((a,b)=>a+(b.durationMin||0),0);
  el.innerHTML=`
    <div class="sum-card"><div class="sum-val">${trainDays}</div><div class="sum-lbl">Treningi ta teden</div><div class="sum-diff">${diff(trainDays,prevDays,'')}</div></div>
    <div class="sum-card"><div class="sum-val">${totalMin}</div><div class="sum-lbl">Skupaj minut</div><div class="sum-diff">${diff(totalMin,prevMin,'min')}</div></div>
    <div class="sum-card"><div class="sum-val">${thisStats.sets}</div><div class="sum-lbl">Opravljene serije</div><div class="sum-diff">${diff(thisStats.sets,prevStats.sets,'')}</div></div>
    <div class="sum-card"><div class="sum-val">${thisStats.vol>0?(thisStats.vol>=1000?Math.round(thisStats.vol/1000)+'t':Math.round(thisStats.vol)+'kg'):'—'}</div><div class="sum-lbl">Skupni volumen</div><div class="sum-diff">${prevStats.vol>0?diff(Math.round(thisStats.vol),Math.round(prevStats.vol),'kg'):''}</div></div>
    <div class="sum-card"><div class="sum-val">🔥 ${streak}</div><div class="sum-lbl">Streak (tedni)</div><div class="sum-diff" style="font-size:10px;">${streak>=4?'odlično!':streak>=2?'gradiš ritem':'zacni nov streak'}</div></div>
    <div class="sum-card"><div class="sum-val">${cycleSess.length}</div><div class="sum-lbl">Sesij v ciklu ${cyc.num}</div><div class="sum-diff" style="font-size:10px;">${cycleStats.vol>0?Math.round(cycleStats.vol/1000)+'t · '+cycleMin+' min':''}</div></div>
  `;
  if(det)det.innerHTML=thisWeekSess.length>0?thisWeekSess.map(s=>`${s.date}: <strong>${s.dayName}</strong> (${s.durationMin}min)`).join(' · '):'Ni treningov ta teden.';
}

// Streak — koliko zaporednih tednov je vsaj 1 sesija
function calcStreak(sessions){
  if(sessions.length===0)return 0;
  const now=new Date();
  let streak=0;
  for(let w=0;w<104;w++){
    const start=new Date(now-7*(w+1)*86400000);
    const end=new Date(now-7*w*86400000);
    const has=sessions.some(s=>{const d=new Date(s.date);return d>=start&&d<end;});
    if(has)streak++;
    else if(w===0)continue;  // ta teden še lahko trenira
    else break;
  }
  return streak;
}

function renderRestPlan(){
  const plan=getRestPlan();
  const grid=document.getElementById('rest-grid');if(!grid)return;
  // Cikel opcij: počitek, 5 treningov, kardio
  const colors={rest:'var(--bg3)','Push A':'#1d9e75','Pull A':'#3b82f6','Noge':'#f59e0b','Push B':'#10b981','Pull B':'#6366f1',cardio:'#ec4899'};
  const labels={rest:'Počitek','Push A':'Push A','Pull A':'Pull A','Noge':'Noge','Push B':'Push B','Pull B':'Pull B',cardio:'Kardio'};
  grid.innerHTML=WEEK_DAYS.map((d,i)=>{
    const type=plan[i]||'rest';
    const isTrain=type!=='rest'&&type!=='cardio';
    const bg=colors[type]||'var(--bg3)';
    const txtColor=(type==='rest')?'var(--text2)':'#fff';
    return`<div onclick="toggleRestDay(${i})" style="padding:8px 2px;text-align:center;border-radius:8px;background:${bg};cursor:pointer;min-height:46px;display:flex;flex-direction:column;justify-content:center;${type==='rest'?'border:.5px solid var(--border);':''}">
      <div style="font-size:10px;color:${type==='rest'?'var(--text3)':'rgba(255,255,255,.85)'};margin-bottom:3px;">${d}</div>
      <div style="font-size:10px;font-weight:600;color:${txtColor};line-height:1.1;">${labels[type]}</div>
    </div>`;
  }).join('');
  // Povzetek
  const trainDays=plan.filter(t=>t&&t!=='rest'&&t!=='cardio').length;
  const cardioDays=plan.filter(t=>t==='cardio').length;
  const restDays=7-trainDays-cardioDays;
  const sum=document.getElementById('plan-summary');
  if(sum)sum.textContent=`${trainDays} treningov · ${cardioDays} kardio · ${restDays} počitka na teden`;
}

const PLAN_CYCLE=['rest','Push A','Pull A','Noge','Push B','Pull B','cardio'];
function toggleRestDay(idx){
  const plan=getRestPlan();
  const cur=plan[idx]||'rest';
  const ci=PLAN_CYCLE.indexOf(cur);
  plan[idx]=PLAN_CYCLE[(ci+1)%PLAN_CYCLE.length];
  saveRestPlan(plan);renderRestPlan();
}

// BODYWEIGHT
function getBWGoal(){const v=parseFloat(localStorage.getItem('wt_bwgoal'));return isNaN(v)?80:v;}
function saveBWGoal(v){const n=parseFloat(v);if(!isNaN(n)&&n>40&&n<200){localStorage.setItem('wt_bwgoal',n);renderBW();}}
function initBWGoal(){const g=getBWGoal();const el=document.getElementById('bw-goal');if(el)el.value=g;}
async function editBW(date,curKg){
  const newVal=await uiPrompt(`Nova teža za ${date}:`,curKg);
  if(newVal===null)return;
  const n=parseFloat(newVal);
  if(isNaN(n)||n<30||n>250){toast('Napačna vrednost','err');return;}
  const d=getBW();d[date]=n;saveBW(d);renderBW();
  toast('✓ Teža posodobljena','ok');
}
async function deleteBW(date){
  if(!await uiConfirm(`Izbrišem vnos teže za ${date}?`))return;
  const d=getBW();delete d[date];saveBW(d);renderBW();
  toast('Izbrisano','ok');
}

function logBW(){
  const val=parseFloat(document.getElementById('bw-in').value);
  if(isNaN(val)||val<40||val>200)return;
  const d=getBW();d[new Date().toISOString().split('T')[0]]=val;saveBW(d);
  document.getElementById('bw-in').value='';renderBW();
}
function renderBW(){
  const data=getBW(),entries=Object.entries(data).sort((a,b)=>a[0].localeCompare(b[0]));
  if(entries.length===0)return;
  const goal=getBWGoal();
  const first=parseFloat(entries[0][1]);
  const latest=parseFloat(entries[entries.length-1][1]);
  // Za napredek uporabi 7-dnevno povprečje PO DATUMIH (stabilno, konsistentno s statistiko)
  const avg7=avg7d(entries);
  const isLoss=goal<first;
  const total=Math.abs(first-goal);
  const done=isLoss?Math.max(0,first-avg7):Math.max(0,avg7-first);
  const pct=total>0?Math.min(100,Math.round((done/total)*100)):0;
  document.getElementById('bw-prog-wrap').style.display='block';
  document.getElementById('bw-chart-card').style.display='block';
  document.getElementById('bw-log-card').style.display='block';
  document.getElementById('bw-pf').style.width=pct+'%';
  document.getElementById('bw-pt').textContent=done.toFixed(1)+'kg '+(isLoss?'izgubljeno':'pridobljeno')+' · '+pct+'%';
  const pl=document.getElementById('bw-prog-label');if(pl)pl.textContent=`Napredek do ${goal}kg`;
  const sl=document.getElementById('bw-start-label');if(sl)sl.textContent=`Start: ${first}kg`;
  const gl=document.getElementById('bw-goal-label');if(gl)gl.textContent=`Cilj: ${goal}kg`;
  const bwRev=entries.slice().reverse();
  const bwRow=(e,i,arr)=>{const prev=arr[i+1];const diff=prev?parseFloat(e[1])-parseFloat(prev[1]):0;const ds=diff!==0?`<span style="font-size:11px;color:${diff<0?'var(--green-text)':'var(--red-text)'}">${diff<0?'↓':'↑'}${Math.abs(diff).toFixed(1)}kg</span>`:'';return`<div class="bwe"><span>${e[0]}</span><span style="display:flex;gap:8px;align-items:center;">${ds}<strong style="color:var(--text);">${e[1]}kg</strong><button class="bk-item-btn" style="font-size:11px;padding:2px 6px;" onclick="editBW('${e[0]}',${e[1]})" title="Uredi">✎</button><button class="bk-item-btn del" style="font-size:11px;padding:2px 6px;" onclick="deleteBW('${e[0]}')" title="Izbriši">×</button></span></div>`;};
  const bwShown=bwRev.slice(0,10).map((e,i)=>bwRow(e,i,bwRev)).join('');
  const bwRest=bwRev.slice(10).map((e,i)=>bwRow(e,i+10,bwRev)).join('');
  let bwHtml=bwShown;
  if(bwRest){
    bwHtml+=`<div id="bw-log-rest" style="display:none;">${bwRest}</div>
    <button class="sb" onclick="const r=document.getElementById('bw-log-rest');const open=r.style.display!=='none';r.style.display=open?'none':'block';this.textContent=open?'▾ Prikaži vse (${bwRev.length})':'▴ Skrij';" style="width:100%;margin-top:.5rem;background:var(--bg3);font-size:12px;">▾ Prikaži vse (${bwRev.length})</button>`;
  }
  document.getElementById('bw-log').innerHTML=bwHtml;
  const labels=entries.map(e=>e[0].slice(5)),vals=entries.map(e=>parseFloat(e[1]));
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  const gc=isDark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.06)',tc=isDark?'#9da3ae':'#666';
  const ctx=document.getElementById('bw-chart').getContext('2d');
  if(bwChart)bwChart.destroy();
  const allVals=[...vals,goal];
  const yMin=Math.floor(Math.min(...allVals)-1),yMax=Math.ceil(Math.max(...allVals)+1);
  bwChart=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'Teža',data:vals,borderColor:'#1d9e75',backgroundColor:'rgba(29,158,117,0.1)',tension:0.3,pointRadius:3,pointBackgroundColor:'#1d9e75',borderWidth:1.5},{label:'7-dnevno povprečje',data:movingAvgDate(entries,7),borderColor:'#7f77dd',backgroundColor:'transparent',tension:0.4,pointRadius:0,borderWidth:2.5},{label:'Cilj',data:Array(labels.length).fill(goal),borderColor:'#ef9f27',borderDash:[4,4],borderWidth:1.5,pointRadius:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,labels:{color:tc,font:{size:10},boxWidth:12}}},scales:{y:{min:yMin,max:yMax,ticks:{color:tc,font:{size:11}},grid:{color:gc},border:{color:gc}},x:{ticks:{color:tc,font:{size:10},maxRotation:45},grid:{display:false},border:{color:gc}}}}});
  // Statistika + faze
  renderBWStats(entries,goal);
  renderPhases();
}

// 7-dnevno povprečje PO DATUMIH (zadnjih 7 dni od zadnjega vnosa)
function avg7d(entries){
  if(!entries||entries.length===0)return null;
  const lastT=new Date(entries[entries.length-1][0]).getTime();
  let win=entries.filter(e=>lastT-new Date(e[0]).getTime()<=6.5*86400000);
  if(win.length<2)win=entries.slice(-Math.min(7,entries.length));
  return win.reduce((a,e)=>a+parseFloat(e[1]),0)/win.length;
}
// Drseče povprečje PO DATUMIH za graf (za vsako točko: vnosi zadnjih `days` dni)
function movingAvgDate(entries,days){
  return entries.map((e,i)=>{
    const t=new Date(e[0]).getTime();
    let s=0,c=0;
    for(let j=i;j>=0;j--){
      if(t-new Date(entries[j][0]).getTime()>(days-0.5)*86400000)break;
      s+=parseFloat(entries[j][1]);c++;
    }
    return Math.round(s/c*100)/100;
  });
}
// (staro, po vnosih — ohranjeno za kompatibilnost)
function movingAvg(arr,window){
  return arr.map((_,i)=>{
    const start=Math.max(0,i-window+1);
    const slice=arr.slice(start,i+1);
    return Math.round(slice.reduce((a,b)=>a+b,0)/slice.length*100)/100;
  });
}

function renderBWStats(entries,goal){
  const card=document.getElementById('bw-stats-card');
  const el=document.getElementById('bw-stats');
  if(!el)return;
  if(entries.length<2){card.style.display='none';return;}
  card.style.display='block';
  const vals=entries.map(e=>parseFloat(e[1]));
  const dates=entries.map(e=>new Date(e[0]));
  // 7-dnevno povprečje — PO DATUMIH (zadnjih 7 dni), ne po vnosih
  const avg7=avg7d(entries);
  // Tedenska sprememba — LINEARNA REGRESIJA (zgladi dnevno nihanje); okno 21 dni, razširi na 35 če premalo točk
  const now=dates[dates.length-1].getTime();
  let weeklyChange=null;
  for(const winDays of [21,35]){
    const recentWindow=entries.filter(e=>now-new Date(e[0]).getTime()<=winDays*86400000);
    if(recentWindow.length>=3){
      const pts=recentWindow.map(e=>({x:(new Date(e[0]).getTime()-now)/86400000,y:parseFloat(e[1])}));
      const nP=pts.length;
      const sumX=pts.reduce((a,p)=>a+p.x,0), sumY=pts.reduce((a,p)=>a+p.y,0);
      const sumXY=pts.reduce((a,p)=>a+p.x*p.y,0), sumXX=pts.reduce((a,p)=>a+p.x*p.x,0);
      const denom=nP*sumXX-sumX*sumX;
      if(Math.abs(denom)>0.0001){weeklyChange=((nP*sumXY-sumX*sumY)/denom)*7;break;}
    }
  }
  if(weeklyChange===null&&vals.length>=2){
    const daySpan=(dates[dates.length-1]-dates[0])/86400000||1;
    weeklyChange=((vals[vals.length-1]-vals[0])/daySpan)*7;
  }
  // Napoved do cilja — upošteva SMER trenda
  let forecast='';
  if(weeklyChange!==null&&Math.abs(weeklyChange)>0.05){
    const remaining=goal-avg7;
    if(Math.abs(remaining)<=0.2){
      forecast=`✓ Cilj dosežen!`;
    } else {
      const movingToward=(remaining<0&&weeklyChange<0)||(remaining>0&&weeklyChange>0);
      if(movingToward){
        const weeksNeeded=remaining/weeklyChange;
        if(weeksNeeded<260){
          const reachDate=new Date(now+weeksNeeded*7*86400000);
          forecast=`📅 Pri tem tempu dosežeš ${goal}kg okoli <strong>${reachDate.toLocaleDateString('sl-SI')}</strong> (~${Math.round(weeksNeeded)} tednov)`;
        } else forecast=`Tempo prepočasen za realno napoved`;
      } else {
        forecast=`⚠ Trend gre trenutno <strong>stran od cilja</strong> (${weeklyChange>0?'+':''}${weeklyChange.toFixed(2)}kg/teden)`;
      }
    }
  }
  // Tempo ocena za cut
  let tempoNote='';
  if(weeklyChange!==null&&weeklyChange<0){
    const rate=Math.abs(weeklyChange);
    if(rate>0.8)tempoNote='<span style="color:var(--red-text);">⚠ Hitro — tvegaš izgubo mišice. Razmisli o manjšem deficitu.</span>';
    else if(rate>=0.3&&rate<=0.7)tempoNote='<span style="color:var(--green-text);">✓ Idealen tempo za cut (0.3-0.7kg/teden)</span>';
    else if(rate<0.3)tempoNote='<span style="color:var(--amber-text);">Počasen tempo — ok če si blizu cilja</span>';
  }
  const wcColor=weeklyChange<0?'var(--green-text)':weeklyChange>0?'var(--red-text)':'var(--text2)';
  const wcStr=weeklyChange!==null?`${weeklyChange>0?'+':''}${weeklyChange.toFixed(2)}kg`:'—';
  el.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:.5rem;">
      <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:700;color:var(--purple-text);">${avg7.toFixed(1)}kg</div>
        <div style="font-size:11px;color:var(--text3);">7-dnevno povprečje</div>
      </div>
      <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:700;color:${wcColor};">${wcStr}</div>
        <div style="font-size:11px;color:var(--text3);">Tedenska sprememba</div>
      </div>
    </div>
    ${tempoNote?`<div style="font-size:12px;padding:6px 0;">${tempoNote}</div>`:''}
    ${forecast?`<div style="font-size:12px;color:var(--text2);padding:6px;background:var(--bg3);border-radius:6px;">${forecast}</div>`:''}
    <div style="font-size:10px;color:var(--text3);margin-top:6px;">Dnevna teža niha ±1-2kg (voda, hrana). Sledi 7-dnevnemu povprečju, ne posameznim dnevom.</div>`;
}

// === FAZE (cut/bulk/maintenance) ===
function getPhases(){try{return JSON.parse(localStorage.getItem('wt_phases')||'[]');}catch{return [];}}
function savePhases(p){localStorage.setItem('wt_phases',JSON.stringify(p));}
function startPhase(){
  const type=document.getElementById('phase-type').value;
  const phases=getPhases();
  const today=new Date().toISOString().split('T')[0];
  // Zaključi prejšnjo fazo
  if(phases.length>0&&!phases[phases.length-1].end){
    phases[phases.length-1].end=today;
  }
  phases.push({type,start:today,end:null});
  savePhases(phases);
  renderPhases();
  toast('✓ Faza '+type+' začeta','ok');
}
function endPhase(idx){
  const phases=getPhases();
  if(phases[idx]){phases[idx].end=new Date().toISOString().split('T')[0];savePhases(phases);renderPhases();}
}
function deletePhase(idx){
  const phases=getPhases();phases.splice(idx,1);savePhases(phases);renderPhases();
}
function renderPhases(){
  const el=document.getElementById('phase-list');if(!el)return;
  const phases=getPhases().slice().reverse();
  if(phases.length===0){el.innerHTML='<div style="font-size:11px;color:var(--text3);padding:.4rem;">Ni faz.</div>';return;}
  const labels={cut:'🔻 Cut',bulk:'🔺 Bulk',maintain:'➖ Maintenance'};
  const bw=getBW();
  el.innerHTML=phases.map((p,ri)=>{
    const idx=getPhases().length-1-ri;
    const active=!p.end;
    // Sprememba teže v fazi
    let change='';
    const inPhase=Object.entries(bw).filter(([d])=>d>=p.start&&(!p.end||d<=p.end)).sort();
    if(inPhase.length>=2){
      const diff=parseFloat(inPhase[inPhase.length-1][1])-parseFloat(inPhase[0][1]);
      change=` · ${diff>0?'+':''}${diff.toFixed(1)}kg`;
    }
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:.5px solid var(--border);font-size:12px;">
      <div><strong>${labels[p.type]||p.type}</strong><div style="font-size:10px;color:var(--text3);">${p.start} → ${p.end||'zdaj'}${change}</div></div>
      <div style="display:flex;gap:4px;">${active?`<button class="bk-item-btn" style="font-size:10px;" onclick="endPhase(${idx})">Končaj</button>`:''}<button class="bk-item-btn del" style="font-size:10px;" onclick="deletePhase(${idx})">×</button></div>
    </div>`;
  }).join('');
}

// MEASUREMENTS — neck removed
function renderMeas(){
  const inp=document.getElementById('meas-inputs');
  if(inp)inp.innerHTML=MEAS_FIELDS.map(f=>`<div style="display:flex;flex-direction:column;gap:4px;"><label style="font-size:11px;color:var(--text2);">${f} (cm)</label><input class="meas-in" type="number" id="mi-${f}" placeholder="cm" min="20" max="200" step="0.5"></div>`).join('');
  const data=getMeas(),entries=Object.entries(data).sort((a,b)=>a[0].localeCompare(b[0]));
  if(entries.length===0)return;
  document.getElementById('meas-curr-card').style.display='block';
  const latest=entries[entries.length-1][1],prev=entries.length>1?entries[entries.length-2][1]:null;
  document.getElementById('meas-curr').innerHTML=MEAS_FIELDS.map(f=>{const v=latest[f]||null;const pv=prev?prev[f]:null;const diff=pv&&v?parseFloat(v)-parseFloat(pv):null;const ds=diff!==null?`<div class="meas-sub" style="color:${diff<0?'var(--green-text)':'var(--amber-text)'}">${diff<0?'↓':'↑'}${Math.abs(diff).toFixed(1)}cm</div>`:'';return`<div class="meas-card"><div class="meas-lbl">${f}</div><div class="meas-val">${v?v+'cm':'—'}</div>${ds}</div>`;}).join('');
  if(entries.length>1){document.getElementById('meas-hist-card').style.display='block';document.getElementById('meas-hist').innerHTML=entries.slice().reverse().slice(0,6).map(e=>`<div style="padding:8px 0;border-bottom:.5px solid var(--border);"><div style="font-size:12px;font-weight:500;color:var(--text);margin-bottom:4px;">${e[0]}</div><div style="display:flex;flex-wrap:wrap;gap:8px;">${MEAS_FIELDS.filter(f=>e[1][f]).map(f=>`<span style="font-size:11px;color:var(--text2);">${f}: <strong style="color:var(--text);">${e[1][f]}cm</strong></span>`).join('')}</div></div>`).join('');}
}
function saveMeasurements(){
  const data=getMeas(),today=new Date().toISOString().split('T')[0],entry={};
  MEAS_FIELDS.forEach(f=>{const v=document.getElementById('mi-'+f)?.value;if(v)entry[f]=parseFloat(v);});
  if(Object.keys(entry).length===0){toast('Vnesi vsaj eno mero','err');return;}
  data[today]=entry;saveMeas(data);renderMeas();
  MEAS_FIELDS.forEach(f=>{const el=document.getElementById('mi-'+f);if(el)el.value='';});
}

// TOOLS
function barChanged(){
  const sel=document.getElementById('bar-w'),ci=document.getElementById('bar-custom');
  if(sel.value==='custom'){ci.style.display='';}
  else{ci.style.display='none';const g=getGym();g.bar=parseFloat(sel.value)||20;saveGym(g);}
}
function saveBarCustom(){const g=getGym();g.bar=parseFloat(document.getElementById('bar-custom').value)||20;saveGym(g);}
function initPlates(){
  const gym=getGym();
  const barSel=document.getElementById('bar-w');if(barSel)barSel.value=String(gym.bar);
  const chips=document.getElementById('plate-chips');
  if(chips)chips.innerHTML=([1.25,2.5,5,10,15,20,25,50]).map(p=>`<div class="plate-chip${gym.plates.includes(p)?' on':''}" onclick="togglePlate(${p})">${p}kg</div>`).join('');
}
function togglePlate(p){
  const g=getGym();
  if(g.plates.includes(p))g.plates=g.plates.filter(x=>x!==p);
  else g.plates=[...g.plates,p].sort((a,b)=>a-b);
  saveGym(g);
  const chips=document.getElementById('plate-chips');
  if(chips)chips.innerHTML=([1.25,2.5,5,10,15,20,25,50]).map(pl=>`<div class="plate-chip${g.plates.includes(pl)?' on':''}" onclick="togglePlate(${pl})">${pl}kg</div>`).join('');
}
function calcPlatesManual(){
  const target=parseFloat(document.getElementById('plate-target').value);
  if(isNaN(target)||target<=0){toast('Vnesi ciljno težo','err');return;}
  const pl=calcPlatesFor(target);
  const res=document.getElementById('plate-result');
  if(!pl){res.innerHTML=`Ni možno sestaviti ${target}kg.`;res.classList.add('visible');return;}
  res.innerHTML=`<strong>Vsaka stran:</strong> ${pl.each}<br><span style="font-size:11px;">Palica ${pl.bar}kg + ${pl.perSide*2}kg = ${pl.total}kg</span>`;
  res.classList.add('visible');
}
function calcORM(){
  const kg=parseFloat(document.getElementById('orm-kg').value),reps=parseFloat(document.getElementById('orm-reps').value);
  if(isNaN(kg)||isNaN(reps)||reps<1||kg<=0)return;
  const epley=Math.round(kg*(1+reps/30)),brzycki=reps===1?kg:Math.round(kg/(1.0278-0.0278*reps)),avg=Math.round((epley+brzycki)/2);
  const pcts=[100,95,90,85,80,75,70].map(p=>`${p}%→${Math.round(avg*p/100/2.5)*2.5}kg`).join(' · ');
  const res=document.getElementById('orm-res');res.innerHTML=`<strong>Ocenjeni 1RM: ${avg}kg</strong><br><br><span style="font-size:11px;line-height:2;">${pcts}</span>`;res.classList.add('visible');
}
function calcWU(){
  const kg=parseFloat(document.getElementById('wu-kg').value),type=document.getElementById('wu-t').value;
  if(isNaN(kg)||kg<=0)return;
  const wu=buildWU(kg,type);
  const res=document.getElementById('wu-res');
  res.innerHTML='<strong>Ogrevanje:</strong><br><br>'+wu.map((w,i)=>`<div style="padding:5px 0;border-bottom:.5px solid var(--border);font-size:12px;">S${i+1}: <strong>${w.kg}kg</strong> × ${w.reps} ${w.pct===0?'(palica)':'('+w.pct+'%)'}</div>`).join('');
  res.classList.add('visible');
}

async function exportData(){
  // Najprej zberi photos iz IndexedDB
  let photos=[];
  try{photos=await getAllPhotos();}catch(e){console.warn('Ni fotografij:',e);}
  // Export kot JSON — ohrani vse podatke popolnoma
  const backup={
    version:5,
    schemaVersion:5,
    date:new Date().toISOString(),
    sets:getSets(),
    pr:getPRs(),
    notes:getNotes(),
    bw:getBW(),
    cycle:getCyc(),
    meas:getMeas(),
    gym:getGym(),
    sessions:getSessions(),
    pain:getPainData(),
    cynotes:getCyNotes(),
    restplan:getRestPlan(),
    setcounts:getSetCounts(),
    bwgoal:getBWGoal(),
    theme:localStorage.getItem(LS.theme)||'dark',
    // Nove dodatne nastavitve
    alarm:getAlarmSettings(),
    // bilateral removed
    collars:getCollars(),
    photos:photos,  // [{id, date, blob (base64)}]
    swaps:JSON.parse(localStorage.getItem('wt_exswap')||'{}'),
    sugs:JSON.parse(localStorage.getItem('wt_sugs6')||'{}'),
    extra_ex:JSON.parse(localStorage.getItem('wt_extra_ex')||'{}'),
    hidden_ex:JSON.parse(localStorage.getItem('wt_hidden_ex')||'{}'),
    daylists:{cut:JSON.parse(localStorage.getItem('wt_daylist_cut')||'null'),bulk:JSON.parse(localStorage.getItem('wt_daylist_bulk')||'null')},
    ex_ordernames:JSON.parse(localStorage.getItem('wt_ex_ordernames')||'{}'),
    rep_prs:JSON.parse(localStorage.getItem('wt_rep_prs')||'{}'),
    phases:JSON.parse(localStorage.getItem('wt_phases')||'[]'),
    profile:getActiveProfile(),
    tm531:get531TMs(),
    offset531:get531CycleOffset(),
    goals:JSON.parse(localStorage.getItem('wt_goals')||'[]'),
    daylog:JSON.parse(localStorage.getItem('wt_daylog')||'{}'),
    custom_ex:JSON.parse(localStorage.getItem(CUST_KEY)||'[]'),
    kg_step:localStorage.getItem('wt_kg_step'),
    reps_step:localStorage.getItem('wt_reps_step'),
    colors:getStoredColors(),
    custom_rest:getCustomRest(),
    compact:isCompact(),
    gym_mode:getGymMode()
  };
  const json=JSON.stringify(backup,null,2);
  const blob=new Blob([json],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`workout_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();URL.revokeObjectURL(url);
  // Zapomnimo si datum zadnjega backupa
  localStorage.setItem('wt_last_backup',new Date().toISOString());
  // Also export CSV for readability
  exportCSV();
  toast('💾 Backup prenesen','ok');
}

function exportCSV(){
  const all=getSets(),bw=getBW(),meas=getMeas(),prs=getPRs(),sessions=getSessions();
  let csv='TRENINGI\nKljuč,Serija,Teža(kg),Ponovitve,Opravljeno\n';
  Object.entries(all).forEach(([k,sets])=>{sets.forEach((s,i)=>{csv+=`${k},${i+1},${s.kg||''},${s.reps||''},${s.done?'da':'ne'}\n`;});});
  csv+='\nTELESNA TEŽA\nDatum,Teža(kg)\n';
  Object.entries(bw).sort().forEach(([d,v])=>{csv+=`${d},${v}\n`;});
  csv+='\nMERE\nDatum,'+MEAS_FIELDS.join(',')+'\n';
  Object.entries(meas).sort().forEach(([d,v])=>{csv+=`${d},${MEAS_FIELDS.map(f=>v[f]||'').join(',')}\n`;});
  csv+='\nSESSIONS\nDatum,Dan,Teden,Cikel,Začetek,Konec,Trajanje(min)\n';
  sessions.forEach(s=>{csv+=`${s.date},${s.dayName},${s.weekNum},${s.cycle},${s.startTime||''},${s.endTime||''},${s.durationMin}\n`;});
  csv+='\nPR-JI\nKljuč,Teža(kg)\n';
  Object.entries(prs).forEach(([k,v])=>{csv+=`${k},${v}\n`;});
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`workout_${new Date().toISOString().split('T')[0]}.csv`;a.click();URL.revokeObjectURL(url);
}

let _pendingImport=null,_importChoiceResolve=null;
function chooseImportMode(summary){return new Promise(res=>{_importChoiceResolve=res;document.getElementById('import-mode-summary').textContent=summary;document.getElementById('import-mode-pop').classList.add('on');});}
function finishImportChoice(choice){document.getElementById('import-mode-pop').classList.remove('on');if(_importChoiceResolve){_importChoiceResolve(choice);_importChoiceResolve=null;}}
function importData(){
  if(stRun){toast('Najprej zaključi aktivno sesijo.','err');return;}
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
  input.onchange=e=>{const file=e.target.files[0];if(!file)return;if(file.size>80*1024*1024){toast('Datoteka je večja od 80 MB.','err');return;}const reader=new FileReader();reader.onload=async ev=>{try{const backup=JSON.parse(ev.target.result),v=validateBackupP1(backup);if(!v.ok){toast('Napačna backup datoteka: '+v.msg,'err');return;}const mode=await chooseImportMode(backupSummaryP1(backup));if(!mode)return;const rollback=await buildBackupJSON(false);await saveBackupToIDB(rollback,'rollback-before-import');await restoreBackupObjectP1(backup,{photos:true,mode});await autoBackupToIDB();toast(mode==='replace'?'✓ Podatki popolnoma obnovljeni':'✓ Podatki združeni','ok');}catch(err){toast('Napaka pri uvozu: '+err.message,'err');}};reader.onerror=()=>toast('Datoteke ni mogoče prebrati.','err');reader.readAsText(file);};input.click();
}
async function clearAll(){
  if(stRun){toast('Najprej zaključi aktivno sesijo.','err');return;}
  if(await uiConfirm('Ponastavi vse podatke? Pred brisanjem bom naredil lokalni rollback snapshot.','Ponastavi')){await autoBackupToIDB();clearManagedData();localStorage.removeItem(LS_SESS);showDay(cd);toast('Podatki ponastavljeni. Rollback je v lokalnih snapshotih.','ok');}
}


// Toast notifikacija
function toast(msg,type){
  const t=document.getElementById('toast-el');if(!t)return;
  t.textContent=String(msg??'');t.className='show'+(type?' '+type:'');
  clearTimeout(t._tm);t._tm=setTimeout(()=>t.className='',2200);
}

// Alarm settings v localStorage
const ALARM_DEFAULTS={sound:true,vibrate:true,notif:true,volume:90,melody:'default'};
function getAlarmSettings(){
  try{return {...ALARM_DEFAULTS,...JSON.parse(localStorage.getItem('wt_alarm6')||'{}')};}
  catch{return {...ALARM_DEFAULTS};}
}
function saveAlarmSettings(s){localStorage.setItem('wt_alarm6',JSON.stringify(s));}
function toggleAlarmOpt(opt){
  const s=getAlarmSettings();s[opt]=!s[opt];saveAlarmSettings(s);
  if(opt==='notif'&&s.notif&&'Notification' in window&&Notification.permission==='default'){
    Notification.requestPermission();
  }
  initAlarmUI();
}
function setVolume(v){const s=getAlarmSettings();s.volume=parseInt(v);saveAlarmSettings(s);document.getElementById('vol-label').textContent=v+'%';}
function setMelody(m){const s=getAlarmSettings();s.melody=m;saveAlarmSettings(s);}
function initAlarmUI(){
  const s=getAlarmSettings();
  ['sound','vibrate','notif'].forEach(k=>{
    const el=document.getElementById('tg-'+(k==='vibrate'?'vib':k));
    if(el)el.classList.toggle('on',!!s[k]);
  });
  const vs=document.getElementById('vol-slider');if(vs)vs.value=s.volume;
  const vl=document.getElementById('vol-label');if(vl)vl.textContent=s.volume+'%';
  const ms=document.getElementById('melody-sel');if(ms)ms.value=s.melody;
}
function testAlarm(){alertEnd('test-key');toast('▶ Test alarma','ok');}

// Melodije — vsaka vrne array tonov {f:freq, d:delay, len:trajanje, vol:0-1}
const MELODIES={
  default:[{f:880,d:0,len:.22,vol:.9},{f:880,d:.32,len:.22,vol:.9},{f:1320,d:.65,len:.5,vol:1.0}],
  gentle:[{f:660,d:0,len:.4,vol:.6},{f:880,d:.5,len:.6,vol:.7}],
  urgent:[{f:1100,d:0,len:.15,vol:1.0},{f:1100,d:.2,len:.15,vol:1.0},{f:1100,d:.4,len:.15,vol:1.0},{f:1100,d:.6,len:.15,vol:1.0},{f:1100,d:.8,len:.3,vol:1.0}],
  bell:[{f:523,d:0,len:.2,vol:.7},{f:659,d:.18,len:.2,vol:.8},{f:784,d:.36,len:.2,vol:.9},{f:1047,d:.54,len:.6,vol:1.0}]
};

// Najdi zadnji set (prejšnji teden ali prejšnji cikel) za to vajo
function getLastSession(di,ei,curCn,curCw){
  const all=getSets();
  for(let c=curCn;c>=1;c--){
    const wStart=(c===curCn)?curCw-1:3;
    for(let w=wStart;w>=0;w--){
      const k=sdk(c,w,di,ei);
      if(all[k]){
        const doneSets=all[k].filter(s=>s.kg&&s.reps);
        if(doneSets.length>0){
          const top=doneSets.reduce((a,b)=>parseFloat(b.kg)>parseFloat(a.kg)?b:a);
          // Datum iz sessions
          let dateStr='';
          const sessions=getSessions();
          const sess=sessions.find(s=>s.cycle===c&&s.dayName===DAY_NAMES[di]);
          if(sess){
            const d=Math.floor((Date.now()-new Date(sess.date).getTime())/(86400000));
            dateStr=d===0?'danes':d===1?'včeraj':`pred ${d} dnevi`;
          }
          return {kg:parseFloat(top.kg),reps:parseInt(top.reps),date:dateStr,c,w};
        }
      }
    }
  }
  return null;
}

// === ZGODOVINA VAJE (ločena po imenu — sledi pravi vaji ob zamenjavi) ===
function getExerciseHistory(di,ei,wantName){
  const all=getSets();
  const sessions=getSessions();
  const cyc=getCyc();
  const origName=PROG.days[di]&&PROG.days[di]._origEx?(PROG.days[di]._origEx[ei]?PROG.days[di]._origEx[ei].n:null):(PROG.days[di].ex[ei]?PROG.days[di].ex[ei].n:null);
  const out=[];
  for(let c=1;c<=cyc.num;c++){
    for(let w=0;w<4;w++){
      const k=sdk(c,w,di,ei);
      if(!all[k])continue;
      const done=all[k].filter(s=>s.kg&&s.reps&&s.done);
      if(done.length===0)continue;
      // Ime te sesije: iz exName setov (najpogostejši), sicer originalno ime pozicije
      const named=done.filter(s=>s.exName);
      let sessName;
      if(named.length>0){
        // najpogostejši exName
        const counts={};named.forEach(s=>{counts[s.exName]=(counts[s.exName]||0)+1;});
        sessName=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
      } else {
        sessName=origName; // stari sety brez imena → originalna vaja
      }
      // Vključi samo če ustreza iskani vaji
      if(wantName&&sessName!==wantName)continue;
      const sess=sessions.find(s=>s.cycle===c&&Math.max(0,(s.weekNum||1)-1)===w&&DAY_NAMES.indexOf(s.dayName)===di);
      const top=done.reduce((a,b)=>parseFloat(b.kg)>parseFloat(a.kg)?b:a);
      const totalVol=done.reduce((a,b)=>a+(parseFloat(b.kg)||0)*(parseFloat(b.reps)||0),0);
      const e1rm=Math.round(parseFloat(top.kg)*(1+parseFloat(top.reps)/30));
      out.push({c,w,date:sess?sess.date:null,sets:done.map(s=>({kg:parseFloat(s.kg),reps:parseInt(s.reps)})),top:{kg:parseFloat(top.kg),reps:parseInt(top.reps)},totalVol:Math.round(totalVol),e1rm});
    }
  }
  out.sort((a,b)=> b.c-a.c || b.w-a.w);
  return out;
}

const WEEK_LBL=['T1 Težko','T2 Težko','T3 Zmerno','T4 Deload'];
function openExHistory(di,ei){
  const exKey=sdk(getCyc().num,cw,di,ei);
  const e=PROG.days[di].ex[ei];
  const name=getSwappedName(exKey,e?e.n:'Vaja',e&&e.extra);
  document.getElementById('ex-hist-title').textContent='📊 '+name;
  const hist=getExerciseHistory(di,ei,name);
  const sumEl=document.getElementById('ex-hist-summary');
  const el=document.getElementById('ex-hist-content');
  if(hist.length===0){
    sumEl.textContent='';
    el.innerHTML='<div style="font-size:13px;color:var(--text3);padding:1rem;text-align:center;">Še ni zabeleženih podatkov za to vajo.</div>';
    document.getElementById('ex-hist-pop').classList.add('on');
    return;
  }
  // Povzetek: vseh-časov najboljši e1RM, najtežja teža
  const bestE1RM=Math.max(...hist.map(h=>h.e1rm));
  const heaviest=Math.max(...hist.map(h=>h.top.kg));
  const firstE=hist[hist.length-1].e1rm, lastE=hist[0].e1rm;
  const trend=lastE-firstE;
  sumEl.innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap;">
    <span style="background:var(--bg3);border-radius:6px;padding:4px 8px;">🏆 Best e1RM: <strong style="color:var(--green-text);">${bestE1RM}kg</strong></span>
    <span style="background:var(--bg3);border-radius:6px;padding:4px 8px;">💪 Najtežje: <strong>${heaviest}kg</strong></span>
    ${hist.length>=2?`<span style="background:var(--bg3);border-radius:6px;padding:4px 8px;">${trend>=0?'📈':'📉'} <strong style="color:${trend>=0?'var(--green-text)':'var(--amber-text)'};">${trend>=0?'+':''}${trend}kg</strong></span>`:''}
  </div>`;
  el.innerHTML=hist.map(h=>{
    const dateNice=h.date?new Date(h.date).toLocaleDateString('sl-SI'):'';
    const setsStr=h.sets.map(s=>`${s.kg}×${s.reps}`).join(' · ');
    const isBest=h.e1rm===bestE1RM;
    return `<div style="background:var(--bg3);border-radius:8px;padding:10px;margin-bottom:8px;${isBest?'border:1px solid var(--green);':''}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:12px;font-weight:600;color:var(--text);">C${h.c} · ${WEEK_LBL[h.w]}</span>
        <span style="font-size:11px;color:var(--text3);">${dateNice}</span>
      </div>
      <div style="font-size:13px;color:var(--text2);">${setsStr}</div>
      <div style="display:flex;gap:12px;margin-top:4px;font-size:11px;">
        <span style="color:var(--purple-text);">e1RM ${h.e1rm}kg${isBest?' 🏆':''}</span>
        <span style="color:var(--text3);">Vol ${h.totalVol}kg</span>
      </div>
    </div>`;
  }).join('');
  document.getElementById('ex-hist-pop').classList.add('on');
}

// Helper: nastavi kg vrednost in sproži update logiko
function setKgVal(exKey,si,di,ei,cn,kg){
  const isBarbell=BARBELL_EX.includes(PROG.days[di].ex[ei].n);
  const inp=document.querySelector(`#row-${exKey}-${si} .wi`);
  if(inp)inp.value=kg;
  sv(exKey,si,'kg',String(kg),di,ei,cn,isBarbell?1:0);
}

// Long-press na kg input — kopira težo iz prejšnjega tedna
let lpTimer=null,lpStarted=false;
function lpStart(e){
  const inp=e.target;
  if(!inp.classList||!inp.classList.contains('wi'))return;
  lpStarted=false;
  lpTimer=setTimeout(()=>{
    lpStarted=true;
    handleLongPress(inp);
  },550);
}
function lpCancel(){if(lpTimer){clearTimeout(lpTimer);lpTimer=null;}}
function handleLongPress(inp){
  const row=inp.closest('tr');if(!row)return;
  const m=row.id.match(/^row-c(\d+)w(\d+)d(\d+)e(\d+)-(\d+)$/);
  if(!m)return;
  const cn=+m[1],cwCur=+m[2],di=+m[3],ei=+m[4],si=+m[5];
  let prevC=cn,prevW=cwCur-1;
  if(prevW<0){prevC=cn-1;prevW=3;}
  if(prevC<1){toast('Ni prejšnjega tedna','err');return;}
  const prevKey=`c${prevC}w${prevW}d${di}e${ei}`;
  const all=getSets();
  let useSet=all[prevKey]&&all[prevKey][si]&&all[prevKey][si].kg?all[prevKey][si]:null;
  // Fallback na S1 prejšnjega tedna
  if(!useSet&&all[prevKey]&&all[prevKey][0]&&all[prevKey][0].kg)useSet=all[prevKey][0];
  if(!useSet){toast(`T${prevW+1}: prazno`,'err');return;}
  const exKey=`c${cn}w${cwCur}d${di}e${ei}`;
  setKgVal(exKey,si,di,ei,cn,useSet.kg);
  toast(`↺ ${useSet.kg}kg iz T${prevW+1}`,'ok');
  if(navigator.vibrate)navigator.vibrate(50);
}
// Event delegation — delujem na celem dokumentu
document.addEventListener('touchstart',lpStart,{passive:true});
document.addEventListener('touchend',lpCancel);
document.addEventListener('touchmove',lpCancel);
document.addEventListener('mousedown',lpStart);
document.addEventListener('mouseup',lpCancel);
document.addEventListener('mouseleave',lpCancel);

// ============== NEW FEATURES ==============

// --- RPE per set ---
function setRpe(key,si,rpe,di,ei,cn){
  const all=getSets();
  if(!all[key])all[key]=[];
  while(all[key].length<=si)all[key].push({kg:'',reps:'',done:false});
  all[key][si].rpe=all[key][si].rpe===rpe?null:rpe;
  saveSets(all);
  // Re-render samo RPE row
  const rpeRow=document.getElementById(`rpe-${key}-${si}`);
  if(rpeRow){
    const cur=all[key][si].rpe;
    rpeRow.querySelectorAll('.rpe-chip').forEach(c=>{
      const n=parseInt(c.textContent);
      const sel=cur===n;
      c.className='rpe-chip'+(sel?(n>=9?' sel high':n>=8?' sel med':' sel'):'');
    });
  }
}

// --- Drop set toggle (long-press / right-click na Log gumb) ---
function toggleDrop(key,si,di,ei,cn){
  const all=getSets();
  if(!all[key])all[key]=[];
  while(all[key].length<=si)all[key].push({kg:'',reps:'',done:false});
  all[key][si].drop=!all[key][si].drop;
  saveSets(all);
  toast(all[key][si].drop?'D Drop set':'Navaden set','ok');
  // Re-render row
  const wk=PROG.weeks[cw],n=nsf(di,ei,wk,key);
  rebuildRows(key,di,ei,wk,n,all[key]);
  // Force full re-render row class (drop styling)
  const tr=document.getElementById(`row-${key}-${si}`);
  if(tr)tr.classList.toggle('is-drop',!!all[key][si].drop);
  // Update set number cell
  const sn=tr&&tr.querySelector('.sn');
  if(sn)sn.innerHTML=`${si+1}${all[key][si].drop?'<span class="set-type drop">D</span>':''}`;
}

// --- Note per set ---
let noteCtx=null;
function openNote(key,si,di,ei,cn){
  noteCtx={key,si,di,ei,cn};
  const all=getSets();
  const cur=(all[key]&&all[key][si]&&all[key][si].note)||'';
  document.getElementById('note-input').value=cur;
  document.getElementById('note-pop').classList.add('on');
  setTimeout(()=>document.getElementById('note-input').focus(),100);
}
function closeNote(){
  document.getElementById('note-pop').classList.remove('on');
  noteCtx=null;
}
function saveNotePop(){
  if(!noteCtx)return;
  const {key,si}=noteCtx;
  const val=plainImportedText(document.getElementById('note-input').value.trim(),2000);
  const all=getSets();
  if(!all[key])all[key]=[];
  while(all[key].length<=si)all[key].push({kg:'',reps:'',done:false});
  all[key][si].note=val||undefined;
  saveSets(all);
  // Update icon
  const cell=document.querySelector(`#row-${key}-${si} .note-icon`);
  if(cell){cell.classList.toggle('has',!!val);cell.textContent=val?'📝':'＋';}
  closeNote();
  if(val)toast('💾 Opomba shranjena','ok');
}

// --- Quick weight chips ---
function getRecentWeights(exName,limit=3){
  // Iz vseh setov za to vajo, preštej najpogostejše teže
  const all=getSets();
  const counts={};
  Object.keys(all).forEach(key=>{
    const m=key.match(/^c(\d+)w(\d+)d(\d+)e(\d+)$/);
    if(!m)return;
    const di=+m[3],ei=+m[4];
    if(!PROG.days[di]||!PROG.days[di].ex[ei])return;
    if(PROG.days[di].ex[ei].n!==exName)return;
    (all[key]||[]).forEach(s=>{
      if(s.kg){const w=parseFloat(s.kg);if(w>0)counts[w]=(counts[w]||0)+1;}
    });
  });
  return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,limit).map(e=>parseFloat(e[0]));
}
function renderQuickWeights(exKey,si,di,ei,cn,exName){
  const recent=getRecentWeights(exName,3);
  if(recent.length===0)return '';
  return `<div class="qw-row">${recent.map(w=>`<button class="qw-chip" onclick="quickKg('${exKey}',${si},${di},${ei},${cn},${w})">${w}kg</button>`).join('')}</div>`;
}
function quickKg(exKey,si,di,ei,cn,kg){
  const isBarbell=BARBELL_EX.includes(PROG.days[di].ex[ei].n);
  const inp=document.querySelector(`#row-${exKey}-${si} .wi`);
  if(inp)inp.value=kg;
  sv(exKey,si,'kg',String(kg),di,ei,cn,isBarbell?1:0);
}

// --- Plate calc collars ---
function getCollars(){return parseFloat(localStorage.getItem('wt_collars_kg')||'0');}
function setCollars(v){localStorage.setItem('wt_collars_kg',String(v));toast('💾 Shranjeno','ok');}
function initCollarsUI(){
  const inp=document.getElementById('collars-kg');
  if(inp)inp.value=getCollars()||'';
}

// --- Smart deload detection ---
function checkDeloadNeeded(di,ei,cn){
  const exName=PROG.days[di].ex[ei].n;
  if(!PROG.days[di].ex[ei].m)return;  // samo glavne vaje
  // Zberi performance zadnjih 3 sesij za to vajo
  const all=getSets();
  const sess=[];
  for(let c=cn;c>=Math.max(1,cn-1);c--){
    for(let w=3;w>=0;w--){
      const k=`c${c}w${w}d${di}e${ei}`;
      if(all[k]){
        const done=all[k].filter(s=>s.done&&s.kg&&s.reps);
        if(done.length>0){
          const top=done.reduce((a,b)=>parseFloat(b.kg)>parseFloat(a.kg)?b:a);
          sess.push({c,w,kg:parseFloat(top.kg),reps:parseInt(top.reps),e1rm:parseFloat(top.kg)*(1+parseInt(top.reps)/30)});
          if(sess.length>=3)break;
        }
      }
    }
    if(sess.length>=3)break;
  }
  if(sess.length<3)return;
  // Če e1RM pada 2 sesije zapored
  const drops=(sess[0].e1rm<sess[1].e1rm)&&(sess[1].e1rm<sess[2].e1rm);
  if(drops){
    const key=`deload_warn_${exName}_c${cn}w${cw}`;
    if(localStorage.getItem(key))return;  // ne spamiraj
    localStorage.setItem(key,'1');
    setTimeout(()=>{
      const card=document.getElementById('ec-'+sdk(cn,cw,di,ei));
      if(!card)return;
      const w=document.createElement('div');
      w.className='deload-warn';
      w.innerHTML=`<span>📉 Stagnacija na <strong>${exName}</strong> — 3 sesije zapored padec. Razmisli o deloadu.</span><button onclick="this.parentElement.remove()">OK</button>`;
      card.querySelector('.bdg').after(w);
    },300);
  }
}

// --- Volume per muscle group ---
function calcVolumeThisWeek(){
  const all=getSets();
  const cn=getCyc().num;
  const groups={};
  const customs=getCustomExercises();
  PROG.days.forEach((d,di)=>{
    const allEx=buildDayExList(di);
    allEx.forEach((e,ei)=>{
      let map=EX_MAP[e.n];
      // Če ni v EX_MAP, poišči v built-in DB ali custom
      if(!map){
        const dbEx=EXERCISE_DB.find(x=>x.n===e.n);
        if(dbEx){map={p:[dbEx.m],s:dbEx.s?dbEx.s.split(', '):[]};}
        else{const cu=customs.find(x=>x.n===e.n);if(cu)map={p:[cu.muscle],s:[]};}
      }
      if(!map)return;
      const k=`c${cn}w${cw}d${di}e${ei}`;
      const sets=(all[k]||[]).filter(s=>s.done&&s.kg&&s.reps&&!s.drop);
      const cnt=sets.length;
      if(cnt===0)return;
      map.p.forEach(m=>{groups[m]=(groups[m]||0)+cnt;});
      (map.s||[]).forEach(m=>{groups[m]=(groups[m]||0)+cnt*0.5;});
    });
  });
  return groups;
}
function renderVolumeView(){
  const groups=calcVolumeThisWeek();
  const allMuscles=[...new Set([...Object.keys(VOL_TARGETS),...Object.keys(groups)])];
  const sorted=allMuscles.sort((a,b)=>(groups[b]||0)-(groups[a]||0));
  if(sorted.length===0)return '<div style="color:var(--text3);font-size:12px;padding:.5rem;">Ni opravljenih vaj ta teden.</div>';
  const maxX=Math.max(20,...sorted.map(m=>groups[m]||0));
  const html=sorted.map(m=>{
    const cnt=groups[m]||0;
    const t=VOL_TARGETS[m]||{min:0,max:20};
    const pct=Math.min(100,(cnt/maxX)*100);
    let cls='under',tag='',tagcls='';
    if(cnt<t.min){cls='under';tag='pod MEV';tagcls='vl-low';}
    else if(cnt>=t.min&&cnt<=t.max){cls='optimal';tag='optimal';tagcls='vl-opt';}
    else if(cnt>t.max&&cnt<=t.max*1.3){cls='high';tag='visoko';tagcls='vl-high';}
    else{cls='over';tag='MRV+';tagcls='vl-over';}
    return `<div class="vol-grp-row"><span class="vol-grp-name">${m}<span class="vl-tag ${tagcls}">${tag}</span></span><div class="vol-grp-bar"><div class="vol-grp-fill ${cls}" style="width:${pct}%;"></div></div><span class="vol-grp-cnt">${cnt%1===0?cnt:cnt.toFixed(1)}</span></div>`;
  }).join('');
  return `<div style="font-size:10px;color:var(--text3);margin-bottom:6px;">MEV=minimum za rast · optimal=10-20 setov · MRV=meja okrevanja</div><div class="vol-grp">${html}</div><div class="vol-legend"><span><i style="background:var(--blue);"></i>Pod MEV</span><span><i style="background:var(--green);"></i>Optimalno</span><span><i style="background:var(--amber);"></i>Visoko</span><span><i style="background:var(--red);"></i>MRV+</span></div>`;
}

// === MIŠIČNI HEATMAP ===
function renderMuscleHeatmap(){
  const groups=calcVolumeThisWeek();
  const muscles=Object.keys(VOL_TARGETS);
  const withData=muscles.filter(m=>(groups[m]||0)>0);
  if(withData.length===0)return '<div style="color:var(--text3);font-size:12px;padding:.5rem;text-align:center;">Ni opravljenih vaj ta teden.</div>';
  const sorted=muscles.sort((a,b)=>(groups[b]||0)-(groups[a]||0));
  const rows=sorted.map(m=>{
    const cnt=groups[m]||0;
    const t=VOL_TARGETS[m]||{min:8,max:20};
    const mrv=t.max*1.3;
    let color,status;
    if(cnt===0){color='var(--bg4)';status='—';}
    else if(cnt<t.min){color='#378add';status='premalo';}
    else if(cnt<=t.max){color='#1d9e75';status='optimal ✓';}
    else if(cnt<=mrv){color='#ef9f27';status='veliko';}
    else{color='#e24b4a';status='preveč';}
    const pct=Math.min(100,(cnt/(mrv||20))*100);
    return `<div class="mh-row"><span class="mh-name">${m}</span><div class="mh-bar-bg"><div class="mh-bar" style="width:${pct}%;background:${color};">${cnt>0?(cnt%1===0?cnt:cnt.toFixed(1)):''}</div></div><span class="mh-status" style="color:${color};">${status}</span></div>`;
  }).join('');
  return `<div class="mh-wrap">${rows}</div><div class="mh-legend"><span><i style="background:#378add;"></i>Premalo</span><span><i style="background:#1d9e75;"></i>Optimal</span><span><i style="background:#ef9f27;"></i>Veliko</span><span><i style="background:#e24b4a;"></i>Preveč</span></div>`;
}

// === MESEČNI KOLEDAR TRENINGOV ===
let mcalOffset=0; // 0 = trenutni mesec, -1 = prejšnji, ...
// Barva za vsak dan treninga
const DAY_COLORS={"Push A":"#1d9e75","Pull A":"#3b82f6","Noge":"#f59e0b","Push B":"#10b981","Pull B":"#6366f1"};
// Kratka oznaka
const DAY_SHORT={"Push A":"Push A","Pull A":"Pull A","Noge":"Noge","Push B":"Push B","Pull B":"Pull B"};

function changeMcalMonth(delta){
  mcalOffset+=delta;
  if(mcalOffset>0)mcalOffset=0; // ne v prihodnost
  const el=document.getElementById('train-calendar');
  if(el)el.innerHTML=renderTrainCalendar();
}

function renderTrainCalendar(){
  const sessions=getSessions();
  if(sessions.length===0)return '<div style="color:var(--text3);font-size:12px;padding:.5rem;text-align:center;">Še ni treningov.</div>';
  // Map datum -> seznam dni treninga (lahko več treningov isti dan)
  const byDate={};
  sessions.forEach(s=>{
    if(!byDate[s.date])byDate[s.date]=[];
    byDate[s.date].push(s.dayName);
  });
  // Izračunaj prikazani mesec
  const today=new Date();today.setHours(0,0,0,0);
  const view=new Date(today.getFullYear(),today.getMonth()+mcalOffset,1);
  const year=view.getFullYear(),month=view.getMonth();
  const monthNames=["Januar","Februar","Marec","April","Maj","Junij","Julij","Avgust","September","Oktober","November","December"];
  const firstDow=(new Date(year,month,1).getDay()+6)%7; // pon=0
  const daysInMonth=new Date(year,month+1,0).getDate();
  const todayStr=today.toISOString().split('T')[0];
  // Glava z navigacijo
  let html=`<div class="mcal-head">
    <button class="mcal-nav" onclick="changeMcalMonth(-1)">‹</button>
    <div class="mcal-title">${monthNames[month]} ${year}</div>
    <button class="mcal-nav" onclick="changeMcalMonth(1)" ${mcalOffset>=0?'style="opacity:.3;"':''}>›</button>
  </div>`;
  // Dnevi v tednu
  html+=`<div class="mcal-grid">`;
  ["P","T","S","Č","P","S","N"].forEach(d=>{html+=`<div class="mcal-dow">${d}</div>`;});
  // Prazne celice pred 1.
  for(let i=0;i<firstDow;i++)html+=`<div class="mcal-day empty"></div>`;
  // Dnevi
  let trainCount=0;
  for(let day=1;day<=daysInMonth;day++){
    const dateStr=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const trainings=byDate[dateStr]||[];
    const isToday=dateStr===todayStr;
    if(trainings.length>0){
      trainCount++;
      const firstDay=trainings[0];
      const color=DAY_COLORS[firstDay]||"#1d9e75";
      const tag=trainings.length>1?`${trainings.length}×`:(DAY_SHORT[firstDay]||firstDay);
      html+=`<div class="mcal-day trained ${isToday?'today':''}" style="background:${color};" title="${dateStr}: ${trainings.join(', ')}">
        <div class="mcal-daynum">${day}</div>
        <div class="mcal-daytag">${tag}</div>
      </div>`;
    } else {
      html+=`<div class="mcal-day ${isToday?'today':''}"><div class="mcal-daynum">${day}</div></div>`;
    }
  }
  html+=`</div>`;
  // Legenda
  html+=`<div class="mcal-legend">`;
  Object.entries(DAY_COLORS).forEach(([name,color])=>{
    html+=`<span><i class="mcal-dot" style="background:${color};"></i>${name}</span>`;
  });
  html+=`</div>`;
  html+=`<div style="font-size:11px;color:var(--text3);margin-top:.5rem;text-align:center;">${trainCount} treningov v ${monthNames[month].toLowerCase()}u</div>`;
  return html;
}

// === e1RM TREND GRAF ===
let e1rmChart=null,e1rmActiveLift=0;
function getE1RMHistory(){
  const all=getSets();
  const lifts={};
  Object.entries(BIG_LIFTS).forEach(([key,exName])=>{lifts[exName]=[];});
  const sessions=getSessions().slice().reverse();
  sessions.forEach(s=>{
    const di=DAY_NAMES.indexOf(s.dayName);if(di<0)return;
    // SAMO pravi teden te sesije
    const w=Math.max(0,(s.weekNum||1)-1);
    PROG.days[di]&&PROG.days[di].ex.forEach((e,ei)=>{
      const k=sdk(s.cycle,w,di,ei);
      if(all[k]){
        const done=all[k].filter(x=>x.done&&x.kg&&x.reps);
        if(done.length>0){
          const best=done.reduce((mx,x)=>{const e1=parseFloat(x.kg)*(1+parseInt(x.reps)/30);return e1>mx?e1:mx;},0);
          if(best>0){
            if(!lifts[e.n])lifts[e.n]=[];
            lifts[e.n].push({date:s.date,e1rm:Math.round(best)});
          }
        }
      }
    });
  });
  // Obdrži samo vaje z >=2 točkama
  Object.keys(lifts).forEach(k=>{if(lifts[k].length<2)delete lifts[k];});
  return lifts;
}
function renderE1RMChart(){
  const hist=getE1RMHistory();
  const liftNames=Object.keys(hist);
  const chipsEl=document.getElementById('e1rm-lift-chips');
  const emptyEl=document.getElementById('e1rm-empty');
  const canvas=document.getElementById('e1rm-chart');
  if(liftNames.length===0){
    if(chipsEl)chipsEl.innerHTML='';
    if(emptyEl)emptyEl.style.display='block';
    if(canvas)canvas.style.display='none';
    if(e1rmChart){e1rmChart.destroy();e1rmChart=null;}
    return;
  }
  if(emptyEl)emptyEl.style.display='none';
  if(canvas)canvas.style.display='block';
  if(e1rmActiveLift>=liftNames.length)e1rmActiveLift=0;
  // Chips
  if(chipsEl)chipsEl.innerHTML=liftNames.map((n,i)=>`<button class="lift-chip${i===e1rmActiveLift?' on':''}" onclick="selectE1RMLift(${i})">${n.length>18?n.slice(0,16)+'…':n}</button>`).join('');
  const activeName=liftNames[e1rmActiveLift];
  const data=hist[activeName];
  if(e1rmChart)e1rmChart.destroy();
  const ctx=canvas.getContext('2d');
  const isDark=document.documentElement.getAttribute('data-theme')!=='light';
  e1rmChart=new Chart(ctx,{
    type:'line',
    data:{
      labels:data.map(d=>d.date.slice(5)),
      datasets:[{
        label:activeName+' e1RM (kg)',
        data:data.map(d=>d.e1rm),
        borderColor:'#1d9e75',
        backgroundColor:'rgba(29,158,117,0.1)',
        fill:true,tension:0.3,pointRadius:4,pointBackgroundColor:'#1d9e75'
      }]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        y:{ticks:{color:isDark?'#9da3ae':'#666'},grid:{color:isDark?'#2e3035':'#eee'}},
        x:{ticks:{color:isDark?'#9da3ae':'#666'},grid:{display:false}}
      }
    }
  });
}
function selectE1RMLift(i){e1rmActiveLift=i;renderE1RMChart();}

// --- PR feed timeline ---
function renderPRFeed(){
  const prs=getPRs();
  const items=[];
  Object.entries(prs).forEach(([k,v])=>{
    if(typeof v==='object'){
      const exName=v.exName||k;
      if(Array.isArray(v.history)){
        v.history.forEach(h=>items.push({exName,...h}));
      } else if(v.kg) {
        items.push({exName,kg:v.kg,reps:v.reps||1,date:v.date||''});
      }
    } else if(typeof v==='number'&&v>0){
      // Stari format — fallback z imenom iz keya prXY (di,ei)
      const m=k.match(/^pr(\d)(\d+)$/);
      if(m){
        const di=+m[1],ei=+m[2];
        const exName=(PROG.days[di]&&PROG.days[di].ex[ei])?PROG.days[di].ex[ei].n:'Vaja';
        items.push({exName,kg:v,reps:1,date:''});
      }
    }
  });
  items.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(items.length===0)return '<div style="color:var(--text3);font-size:12px;padding:.5rem;">Še brez PR-jev.</div>';
  const renderItem=i=>{
    const e1rm=Math.round((parseFloat(i.kg)||0)*(1+(parseInt(i.reps)||1)/30));
    const dateNice=i.date?new Date(i.date).toLocaleDateString('sl-SI'):'';
    return `<div class="pr-item"><div class="pr-item-l"><div class="pr-item-name">${i.exName}</div><div class="pr-item-date">${dateNice}</div></div><div class="pr-item-r"><div class="pr-item-val">${i.kg}kg × ${i.reps||1}</div><div class="pr-item-delta">e1RM ${e1rm}kg</div></div></div>`;
  };
  const shown=items.slice(0,8).map(renderItem).join('');
  const rest=items.slice(8).map(renderItem).join('');
  let html=shown;
  if(rest){
    html+=`<div id="pr-feed-rest" style="display:none;">${rest}</div>
    <button class="sb" onclick="const r=document.getElementById('pr-feed-rest');const open=r.style.display!=='none';r.style.display=open?'none':'block';this.textContent=open?'▾ Prikaži vse (${items.length})':'▴ Skrij';" style="width:100%;margin-top:.5rem;background:var(--bg3);font-size:12px;">▾ Prikaži vse (${items.length})</button>`;
  }
  return html;
}

// --- Strength ratios ---
function renderStrengthRatios(){
  // Vzemi zadnjo BW iz history-a
  let bw=0;
  try{
    const data=getBW();
    const entries=Object.entries(data).sort((a,b)=>a[0].localeCompare(b[0]));
    if(entries.length>0)bw=parseFloat(entries[entries.length-1][1])||0;
  }catch(e){}
  if(!bw){return '<div style="color:var(--text3);font-size:12px;">Vnesi telesno težo v Teža section za prikaz.</div>';}
  const prs=getPRs();
  // Najdi PR po imenu — strukturira se po prDIEI keys, najdimo z exName ali iščimo v PROG
  function findPR(exName){
    for(const k in prs){
      const v=prs[k];
      if(typeof v==='object'&&v.exName===exName)return v;
    }
    // Fallback: poišči indeks v PROG, vzemi prXY
    for(let di=0;di<PROG.days.length;di++){
      for(let ei=0;ei<PROG.days[di].ex.length;ei++){
        if(PROG.days[di].ex[ei].n===exName){
          const v=prs[`pr${di}${ei}`];
          if(typeof v==='object')return v;
          if(typeof v==='number'&&v>0)return {kg:v,reps:1};
        }
      }
    }
    return null;
  }
  const rows=Object.entries(BIG_LIFTS).map(([key,exName])=>{
    const pr=findPR(exName);
    if(!pr||!pr.kg)return null;
    const kg=parseFloat(pr.kg);
    const e1rm=Math.round(kg*(1+(parseInt(pr.reps)||1)/30));
    const ratio=(e1rm/bw).toFixed(2);
    const tiers=STRENGTH_TIERS[key];
    let tierIdx=0,tierLabel='Začetnik',tierCls='tier-beg';
    for(let i=tiers.length-1;i>=0;i--){
      if(parseFloat(ratio)>=tiers[i].r){
        tierIdx=i;tierLabel=tiers[i].l;
        tierCls=['tier-beg','tier-nov','tier-int','tier-adv','tier-elite'][i];
        break;
      }
    }
    const liftName={bench:"Bench",squat:"Squat",deadlift:"Deadlift",ohp:"OHP"}[key];
    return `<tr><td class="sr-name">${liftName}</td><td class="sr-kg">${e1rm}kg</td><td class="sr-ratio">${ratio}× BW</td><td><span class="sr-tier ${tierCls}">${tierLabel}</span></td></tr>`;
  }).filter(Boolean).join('');
  if(!rows)return '<div style="color:var(--text3);font-size:12px;">Še brez PR-jev za big lift-e.</div>';
  return `<div style="font-size:11px;color:var(--text3);margin-bottom:.5rem;">BW: ${bw}kg · e1RM razmerja</div><table class="sr-table">${rows}</table>`;
}

// --- Body part readiness ---
function renderBodyReadiness(){
  // Za vsak dan, kdaj zadnjič treniran
  const sessions=getSessions();
  const now=Date.now();
  const html=PROG.days.map((d,di)=>{
    const last=sessions.find(s=>s.dayName===DAY_NAMES[di]);
    if(!last)return `<div class="bpr-row"><span>${d.title}</span><span class="bpr-stat">Ni podatkov</span></div>`;
    const days=Math.floor((now-new Date(last.date).getTime())/86400000);
    let cls='fresh',msg;
    if(days===0)msg='danes';
    else if(days===1){msg='včeraj';cls='soon';}
    else if(days<3){msg=`pred ${days} dnevi`;cls='soon';}
    else if(days<=5){msg=`pred ${days} dnevi`;cls='ready';}
    else if(days<=8){msg=`pred ${days} dnevi`;cls='fresh';}
    else {msg=`pred ${days} dnevi`;cls='warn';}
    return `<div class="bpr-row"><span>${d.title}</span><span class="bpr-stat ${cls}">${msg}</span></div>`;
  }).join('');
  return html;
}

// --- Photos (IndexedDB) ---
const DB_NAME='wt_photos',DB_STORE='photos',BK_STORE='backups';
let _db=null;
function openPhotoDB(){
  return new Promise((res,rej)=>{
    if(_db)return res(_db);
    // Verzija 2 — dodam backups store
    const r=indexedDB.open(DB_NAME,2);
    r.onupgradeneeded=(ev)=>{
      const db=r.result;
      if(!db.objectStoreNames.contains(DB_STORE))db.createObjectStore(DB_STORE,{keyPath:'id',autoIncrement:true});
      if(!db.objectStoreNames.contains(BK_STORE))db.createObjectStore(BK_STORE,{keyPath:'id',autoIncrement:true});
    };
    r.onsuccess=()=>{_db=r.result;res(_db);};
    r.onerror=()=>rej(r.error);
  });
}
async function savePhoto(file){
  const db=await openPhotoDB();
  const reader=new FileReader();
  return new Promise((res,rej)=>{
    reader.onload=()=>{
      const tx=db.transaction(DB_STORE,'readwrite');
      tx.objectStore(DB_STORE).add({date:new Date().toISOString(),blob:reader.result});
      tx.oncomplete=()=>res();
      tx.onerror=()=>rej(tx.error);
    };
    reader.readAsDataURL(file);
  });
}
async function getAllPhotos(){
  const db=await openPhotoDB();
  return new Promise(res=>{
    const tx=db.transaction(DB_STORE,'readonly');
    const r=tx.objectStore(DB_STORE).getAll();
    r.onsuccess=()=>res(r.result.sort((a,b)=>b.date.localeCompare(a.date)));
    r.onerror=()=>res([]);
  });
}
async function deletePhoto(id){
  const db=await openPhotoDB();
  return new Promise(res=>{
    const tx=db.transaction(DB_STORE,'readwrite');
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete=res;
  });
}
async function renderPhotos(){
  const grid=document.getElementById('photo-grid');if(!grid)return;
  const photos=await getAllPhotos();
  if(photos.length===0){grid.innerHTML='<div style="grid-column:1/-1;color:var(--text3);font-size:12px;padding:1rem;text-align:center;">Še brez fotografij.</div>';return;}
  grid.innerHTML=photos.map(p=>{
    const d=new Date(p.date).toLocaleDateString('sl-SI',{day:'numeric',month:'numeric'});
    return `<div class="photo-thumb"><img src="${p.blob}" onclick="viewPhoto('${p.blob}')" alt=""><div class="photo-date">${d}</div><button class="photo-del" onclick="event.stopPropagation();delPhotoConfirm(${p.id})">×</button></div>`;
  }).join('');
}
function viewPhoto(src){
  const v=document.getElementById('photo-viewer');
  document.getElementById('photo-viewer-img').src=src;
  v.classList.add('on');
}
function closePhotoViewer(){document.getElementById('photo-viewer').classList.remove('on');}
async function delPhotoConfirm(id){
  if(!await uiConfirm('Izbriši fotko?'))return;
  await deletePhoto(id);await renderPhotos();
}
async function handlePhotoUpload(input){
  const f=input.files[0];if(!f)return;
  await savePhoto(f);
  input.value='';
  await renderPhotos();
  toast('📸 Shranjena','ok');
}

// === TEDENSKI BACKUP REMINDER ===
function getDaysSinceLastBackup(){
  const last=localStorage.getItem('wt_last_backup');
  if(!last)return null;
  return Math.floor((Date.now()-new Date(last).getTime())/86400000);
}

// === IDB BACKUP STORAGE — preživi reinstall PWA, hrani zadnjih 12 backupov ===
async function saveBackupToIDB(blob,label){
  const db=await openPhotoDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction(BK_STORE,'readwrite');
    const obj={date:new Date().toISOString(),label:label||'auto',blob:blob,sizeKB:Math.round(blob.length/1024)};
    tx.objectStore(BK_STORE).add(obj);
    tx.oncomplete=async()=>{
      // Cleanup — drži samo zadnjih 4
      await pruneOldBackups(12);
      res();
    };
    tx.onerror=()=>rej(tx.error);
  });
}

async function getAllBackups(){
  const db=await openPhotoDB();
  return new Promise(res=>{
    const tx=db.transaction(BK_STORE,'readonly');
    const r=tx.objectStore(BK_STORE).getAll();
    r.onsuccess=()=>res(r.result.sort((a,b)=>b.date.localeCompare(a.date)));
    r.onerror=()=>res([]);
  });
}

async function deleteBackup(id){
  const db=await openPhotoDB();
  return new Promise(res=>{
    const tx=db.transaction(BK_STORE,'readwrite');
    tx.objectStore(BK_STORE).delete(id);
    tx.oncomplete=res;
  });
}

async function pruneOldBackups(keep){
  const all=await getAllBackups();
  if(all.length<=keep)return;
  // Briši najstarejše (all je sortiran desc)
  for(let i=keep;i<all.length;i++){
    await deleteBackup(all[i].id);
  }
}

// Ustvari backup JSON brez photos (za IDB — fotke so že v IDB)
async function buildBackupJSON(includePhotos){
  let photos=[];
  if(includePhotos){
    try{photos=await getAllPhotos();}catch(e){}
  }
  return JSON.stringify({
    version:5,
    schemaVersion:5,
    date:new Date().toISOString(),
    sets:getSets(),
    pr:getPRs(),
    notes:getNotes(),
    bw:getBW(),
    cycle:getCyc(),
    meas:getMeas(),
    gym:getGym(),
    sessions:getSessions(),
    pain:getPainData(),
    cynotes:getCyNotes(),
    restplan:getRestPlan(),
    setcounts:getSetCounts(),
    bwgoal:getBWGoal(),
    theme:localStorage.getItem(LS.theme)||'dark',
    alarm:getAlarmSettings(),
    // bilateral removed
    collars:getCollars(),
    photos:photos,
    swaps:JSON.parse(localStorage.getItem('wt_exswap')||'{}'),
    sugs:JSON.parse(localStorage.getItem('wt_sugs6')||'{}'),
    extra_ex:JSON.parse(localStorage.getItem('wt_extra_ex')||'{}'),
    hidden_ex:JSON.parse(localStorage.getItem('wt_hidden_ex')||'{}'),
    daylists:{cut:JSON.parse(localStorage.getItem('wt_daylist_cut')||'null'),bulk:JSON.parse(localStorage.getItem('wt_daylist_bulk')||'null')},
    ex_ordernames:JSON.parse(localStorage.getItem('wt_ex_ordernames')||'{}'),
    rep_prs:JSON.parse(localStorage.getItem('wt_rep_prs')||'{}'),
    phases:JSON.parse(localStorage.getItem('wt_phases')||'[]'),
    profile:getActiveProfile(),
    tm531:get531TMs(),
    offset531:get531CycleOffset(),
    goals:JSON.parse(localStorage.getItem('wt_goals')||'[]'),
    daylog:JSON.parse(localStorage.getItem('wt_daylog')||'{}'),
    custom_ex:JSON.parse(localStorage.getItem(CUST_KEY)||'[]'),
    kg_step:localStorage.getItem('wt_kg_step'),
    reps_step:localStorage.getItem('wt_reps_step'),
    colors:getStoredColors(),
    custom_rest:getCustomRest(),
    compact:isCompact(),
    gym_mode:getGymMode()
  });
}

// Auto-shrani backup v IDB (brez photos — varčuje prostor)
async function autoBackupToIDB(){
  try{
    const json=await buildBackupJSON(false);
    await saveBackupToIDB(json,'auto');
    localStorage.setItem('wt_last_idb_backup',new Date().toISOString());
    return true;
  }catch(e){console.warn('IDB backup failed:',e);return false;}
}

function checkBackupReminder(){
  const banner=document.getElementById('bk-banner'),txt=document.getElementById('bk-banner-text');if(!banner||!txt)return;
  const days=getDaysSinceLastBackup(),sess=getSessions();banner.classList.remove('show','urgent');
  if(days===null&&sess.length>=3){txt.innerHTML=`<strong>Prenesi prvi zunanji backup</strong>${sess.length} sessionov je varovanih le lokalno.`;banner.classList.add('show','urgent');return;}
  if(days!==null&&days>=7){txt.innerHTML=`<strong>${days>=14?'Zunanji backup je prestar':'Tedenski zunanji backup'}</strong>${days} dni od zadnjega prenosa JSON.`;banner.classList.add('show');if(days>=14)banner.classList.add('urgent');}
}

async function doWeeklyBackup(){
  await exportData();
  const banner=document.getElementById('bk-banner');
  if(banner)banner.classList.remove('show','urgent');
}

function snoozeBackup(){
  const banner=document.getElementById('bk-banner');
  if(banner)banner.classList.remove('show','urgent');
}

// === UI ZA TOOLS — UPRAVLJANJE BACKUPOV ===
async function renderBackupList(){
  const el=document.getElementById('backup-list');
  if(!el)return;
  const list=await getAllBackups();
  if(list.length===0){
    el.innerHTML='<div style="font-size:12px;color:var(--text3);padding:.5rem;">Ni shranjenih lokalnih snapshotov.</div>';
    return;
  }
  el.innerHTML=list.map(b=>{
    const d=new Date(b.date);
    const dateStr=d.toLocaleDateString('sl-SI')+' '+d.toLocaleTimeString('sl-SI',{hour:'2-digit',minute:'2-digit'});
    const days=Math.floor((Date.now()-d.getTime())/86400000);
    const ago=days===0?'danes':days===1?'včeraj':`pred ${days} dnevi`;
    return `<div class="bk-item">
      <div class="bk-item-l">
        <div class="bk-item-date">${dateStr}</div>
        <div class="bk-item-meta">${ago} · ${b.sizeKB||'?'}KB · ${b.label}</div>
      </div>
      <div class="bk-item-r">
        <button class="bk-item-btn" onclick="downloadBackupFromIDB(${b.id})">⬇</button>
        <button class="bk-item-btn" onclick="restoreBackupFromIDB(${b.id})">↺</button>
        <button class="bk-item-btn del" onclick="delBackupConfirm(${b.id})">×</button>
      </div>
    </div>`;
  }).join('');
}

async function downloadBackupFromIDB(id){
  const list=await getAllBackups();
  const b=list.find(x=>x.id===id);if(!b)return;
  const blob=new Blob([b.blob],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`workout_backup_${b.date.split('T')[0]}.json`;
  a.click();URL.revokeObjectURL(url);
  toast('💾 Backup prenesen','ok');
}

async function restoreBackupFromIDB(id){
  const list=await getAllBackups();
  const b=list.find(x=>x.id===id);if(!b)return;
  try{
    const backup=JSON.parse(b.blob);
    const v=validateBackupP1(backup);
    if(!v.ok){toast('Backup je pokvarjen: '+v.msg,'err');return;}
    if(!await uiConfirm(backupSummaryP1(backup)))return;
    await restoreBackupObjectP1(backup,{photos:false,mode:'replace'});
    toast('✓ Obnovljeno iz backupa','ok');
  }catch(e){toast('Napaka pri obnovi: '+e.message,'err');}
}


async function delBackupConfirm(id){
  if(!await uiConfirm('Izbriši ta backup?'))return;
  await deleteBackup(id);
  await renderBackupList();
  toast('Izbrisan','ok');
}

async function manualAutoBackup(){
  const ok=await autoBackupToIDB();
  if(ok){
    toast('💾 Backup shranjen v napravi','ok');
    await renderBackupList();
  }else{
    toast('Napaka','err');
  }
}

// === Swipe med vajami (samo v gym mode) ===
(function(){
  let tsX=0,tsY=0,startCard=null;
  const dc=document.getElementById('day-content');
  if(!dc)return;
  dc.addEventListener('touchstart',e=>{
    if(!document.body.classList.contains('gym-mode'))return;
    const t=e.touches[0];
    tsX=t.clientX;tsY=t.clientY;
    startCard=e.target.closest('tr[id^="row-"]')?null:e.target.closest('.exc');
  },{passive:true});
  dc.addEventListener('touchend',e=>{
    if(!document.body.classList.contains('gym-mode')||!startCard)return;
    const t=e.changedTouches[0];
    const dx=t.clientX-tsX,dy=t.clientY-tsY;
    const card=startCard;startCard=null;
    if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.4)return; // premalo horizontalno
    const startEl=document.elementFromPoint(tsX,tsY);
    if(startEl&&startEl.closest('input,button,select,textarea'))return; // ne moti tipkanja/gumbov
    const cards=Array.from(dc.querySelectorAll('.exc'));
    const idx=cards.indexOf(card);
    if(idx<0)return;
    const next=dx<0?cards[idx+1]:cards[idx-1]; // levo=naslednja, desno=prejšnja
    if(next)setGymFocus(next.id.replace(/^ec-/,''),true);
  },{passive:true});
})();

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
showDay(_initDay);
try{initP1();}catch(e){console.warn('P1 init failed',e);}
// Obnovi morebiten aktivni session in rest timer
restoreSession();restoreTimer();
localStorage.removeItem('wt_ai_key');
setTimeout(maybeShowOnboarding,250);
setTimeout(()=>runSelfTestsV6(true).catch(e=>console.warn('V6 self-test:',e)),1200);

// Tedenski backup reminder ob startu
setTimeout(checkBackupReminder,2000);




