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

