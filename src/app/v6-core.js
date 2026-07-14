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
const _tgSetV5=tgSet;tgSet=function(key,si,di,ei,cn){const before=!!getSets()[key]?.[si]?.done;if(!before){const t=currentTimerV6();if(t&&t.key===key){logRestV6(t,'next-set');clearTimerIntervalsV6();localStorage.removeItem(LS_TIMER);cancelScheduledNotification();}}_tgSetV5(key,si,di,ei,cn);const after=getSets()[key]?.[si];if(!before&&after?.done){if(!after.drop){const e=PROG.days[di]?.ex?.[ei],nm=currentExerciseName(di,ei,key),def=restForEx(e?.id,nm,e?.r||90),sec=computeSmartRestV6(key,si,def);if(sec>0)startT(key,sec);}if(navigator.vibrate)navigator.vibrate(35);focusNextSetV6(key,si);}persistSessionDraftV6();};
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

/* === V8 FOCUS FIX (release 1.0.38) === */
(function(){
  'use strict';
  if(window.WTFocusPatchV8)return;

  const PATCH_VERSION='1.0.38';
  let refreshPending=false;
  let compactBusy=false;
  let swipeStart=null;
  let lastTimerId='';
  let timerFinishedUntil=0;

  function parseKeyV8(key){
    const m=String(key||'').match(/^c(\d+)w(\d+)d(\d+)e(\d+)$/);
    return m?{cycle:+m[1],week:+m[2],day:+m[3],exercise:+m[4]}:null;
  }

  function decimalV8(value){
    return String(value??'').trim().replace(',','.');
  }

  function displayNumberV8(value){
    const n=Number(value);
    if(!Number.isFinite(n))return'';
    return Number.isInteger(n)?String(n):String(n).replace('.',',');
  }

  function pendingSetV8(key,di,ei){
    const all=getSets();
    const sets=Array.isArray(all[key])?all[key]:[];
    const wk=PROG.weeks[cw];
    const total=Math.max(1,Number(nsf(di,ei,wk,key))||1);
    let si=0;
    while(si<total&&sets[si]?.done)si++;

    if(si>=total){
      return{complete:true,si,total,kg:'',reps:''};
    }

    const current=sets[si]||{};
    const previous=[...sets.slice(0,si)]
      .reverse()
      .find(set=>set&&set.kg!==''&&set.kg!==undefined&&set.reps);

    return{
      complete:false,
      si,
      total,
      kg:current.kg!==''&&current.kg!==undefined&&current.kg!==null
        ?current.kg
        :(previous?.kg??''),
      reps:current.reps!==''&&current.reps!==undefined&&current.reps!==null
        ?current.reps
        :(previous?.reps??'')
    };
  }

  function compactMarkupV8(key,di,ei,cn){
    const state=pendingSetV8(key,di,ei);
    const disabled=state.complete?' disabled':'';
    const kg=safeHtml(state.complete?'':String(state.kg??''));
    const reps=safeHtml(state.complete?'':String(state.reps??''));

    return`
      <div class="compact-set-label-v8">${state.complete?'KonÄano':`Set ${state.si+1}/${state.total}`}</div>
      <label class="compact-field-v8">
        <span>KG</span>
        <input id="v8-kg-${key}" type="number" inputmode="decimal" min="0" step="0.5" value="${kg}"${disabled}>
      </label>
      <label class="compact-field-v8">
        <span>PON</span>
        <input id="v8-reps-${key}" type="number" inputmode="numeric" min="1" step="1" value="${reps}"${disabled}>
      </label>
      <label class="compact-field-v8">
        <span>RPE <button type="button" class="rpe-help-v8" aria-label="RPE legenda">?</button></span>
        <input id="v8-rpe-${key}" type="number" inputmode="decimal" min="5" max="10" step="0.5" placeholder="8"${disabled}>
      </label>
      <button type="button" class="compact-log-v8"${disabled}>${state.complete?'âœ“':'LOG'}</button>
      <div class="rpe-legend-v8" hidden>
        <strong>RPE legenda</strong>
        <div><b>10</b> maksimum Â· 0 ponovitev v rezervi</div>
        <div><b>9â€“9,5</b> pribliÅ¾no 0â€“1 v rezervi</div>
        <div><b>8â€“8,5</b> pribliÅ¾no 1â€“2 v rezervi</div>
        <div><b>7</b> pribliÅ¾no 3 v rezervi</div>
        <div><b>6</b> pribliÅ¾no 4 v rezervi</div>
        <div><b>5</b> zelo lahko oziroma ogrevanje</div>
      </div>`;
  }

  function installCompactLoggerV8(card,force){
    const key=String(card?.id||'').replace(/^ec-/,'');
    const parsed=parseKeyV8(key);
    const box=card?.querySelector('.quick-log-v6');
    if(!parsed||!box)return;

    if(box.dataset.v8Ready==='1'&&!force)return;

    box.dataset.v8Ready='1';
    box.classList.add('compact-log-box-v8');
    box.innerHTML=compactMarkupV8(
      key,
      parsed.day,
      parsed.exercise,
      parsed.cycle
    );

    const help=box.querySelector('.rpe-help-v8');
    const legend=box.querySelector('.rpe-legend-v8');
    const log=box.querySelector('.compact-log-v8');
    const inputs=box.querySelectorAll('input');

    help?.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      if(legend)legend.hidden=!legend.hidden;
    });

    log?.addEventListener('click',()=>{
      logCompactSetV8(key,parsed.day,parsed.exercise,parsed.cycle);
    });

    inputs.forEach(input=>{
      input.addEventListener('keydown',event=>{
        if(event.key!=='Enter')return;
        event.preventDefault();
        logCompactSetV8(key,parsed.day,parsed.exercise,parsed.cycle);
      });
    });
  }

  async function logCompactSetV8(key,di,ei,cn){
    if(compactBusy)return;

    const state=pendingSetV8(key,di,ei);
    if(state.complete)return;

    const kgEl=document.getElementById('v8-kg-'+key);
    const repsEl=document.getElementById('v8-reps-'+key);
    const rpeEl=document.getElementById('v8-rpe-'+key);
    const button=kgEl?.closest('.compact-log-box-v8')?.querySelector('.compact-log-v8');
    if(!kgEl||!repsEl||!rpeEl||!button)return;

    const kgRaw=decimalV8(kgEl.value);
    const repsRaw=decimalV8(repsEl.value);
    const rpeRaw=decimalV8(rpeEl.value);
    const kg=Number(kgRaw);
    const reps=Number(repsRaw);
    const rpe=Number(rpeRaw);

    if(kgRaw===''||!Number.isFinite(kg)||kg<0){
      toast('Vnesi veljavne kilograme.','err');
      kgEl.focus();
      return;
    }

    if(repsRaw===''||!Number.isFinite(reps)||!Number.isInteger(reps)||reps<1){
      toast('Vnesi veljavne ponovitve.','err');
      repsEl.focus();
      return;
    }

    if(
      !Number.isFinite(rpe)||
      rpe<5||
      rpe>10||
      Math.abs(rpe*2-Math.round(rpe*2))>.001
    ){
      toast('RPE mora biti 5â€“10 v koraku 0,5.','err');
      rpeEl.focus();
      return;
    }

    compactBusy=true;
    button.disabled=true;
    button.textContent='...';

    try{
      const exercise=PROG.days[di]?.ex?.[ei];
      const isBarbell=BARBELL_EX.includes(exercise?.n);

      await sv(key,state.si,'kg',kgRaw,di,ei,cn,isBarbell?1:0);
      await sv(key,state.si,'reps',String(reps),di,ei,cn,0);
      setRpe(key,state.si,Math.round(rpe*2)/2,di,ei,cn);

      if(!getSets()[key]?.[state.si]?.done){
        tgSet(key,state.si,di,ei,cn);
      }

      toast(
        `âœ“ ${displayNumberV8(kg)}kg Ã— ${reps} @ RPE ${displayNumberV8(rpe)}`,
        'ok'
      );
    }catch(error){
      console.warn('WT V8 compact log',error);
      toast('Set ni bil shranjen.','err');
    }finally{
      compactBusy=false;
      queueRefreshV8(30,true);
    }
  }

  window.logCompactSetV8=logCompactSetV8;

  function simplifyProgressionV8(card){
    card.querySelectorAll('.prog-v6').forEach(box=>{
      if(box.dataset.v8Ready==='1')return;

      const text=box.textContent.replace(/\s+/g,' ').trim();
      const down=box.classList.contains('reduce')||box.classList.contains('deload');
      const up=box.classList.contains('increase');
      const symbol=up?'â†‘':down?'â†“':'=';
      const cls=up?'up':down?'down':'same';

      box.dataset.v8Ready='1';
      box.title=text;
      box.setAttribute('aria-label',text);
      box.className=`prog-dir-v8 ${cls}`;
      box.innerHTML=`<span>${symbol}</span>`;
    });
  }

  function firstPendingCardV8(cards){
    for(const card of cards){
      const key=String(card.id||'').replace(/^ec-/,'');
      try{
        if(key&&isExercisePending(key))return card;
      }catch(error){}
    }
    return cards.find(card=>!card.classList.contains('col-done'))||cards[0]||null;
  }

  function syncFocusV8(){
    const cards=Array.from(document.querySelectorAll('#day-content .exc'));

    if(!getGymMode()){
      cards.forEach(card=>{
        card.style.removeProperty('display');
      });
      return;
    }

    if(!cards.length)return;

    let key=localStorage.getItem('wt_active_ex')||'';
    let active=key?document.getElementById('ec-'+key):null;

    if(!active||!cards.includes(active)){
      active=null;
    }

    if(active){
      try{
        if(!isExercisePending(key))active=null;
      }catch(error){
        active=null;
      }
    }

    if(!active){
      try{
        const next=findNextPendingExerciseKey()||'';
        const candidate=next?document.getElementById('ec-'+next):null;
        if(candidate&&cards.includes(candidate)){
          key=next;
          active=candidate;
        }
      }catch(error){}
    }

    if(!active){
      active=firstPendingCardV8(cards);
      key=String(active?.id||'').replace(/^ec-/,'');
    }

    if(!active||!key)return;

    localStorage.setItem('wt_active_ex',key);

    cards.forEach(card=>{
      const visible=card===active;
      card.classList.toggle('active-ex',visible);
      card.style.setProperty(
        'display',
        visible?'block':'none',
        'important'
      );
    });

    try{
      updateGymFocusBar(key);
    }catch(error){}
  }

  function ensureGlobalTimerV8(){
    let el=document.getElementById('wt-global-timer-v8');
    if(el)return el;

    const sessionBar=document.querySelector('#page-workout .stb');
    if(!sessionBar)return null;

    el=document.createElement('div');
    el.id='wt-global-timer-v8';
    el.className='global-timer-v8';
    el.innerHTML=`
      <strong id="wt-global-time-v8">â€”</strong>
      <span id="wt-global-meta-v8">odmor</span>
      <button type="button" data-action="minus">âˆ’30</button>
      <button type="button" data-action="pause">â…¡</button>
      <button type="button" data-action="plus">+30</button>
      <button type="button" class="stop" data-action="stop">Ã—</button>`;

    sessionBar.insertAdjacentElement('afterend',el);

    el.querySelector('[data-action="minus"]')?.addEventListener('click',()=>{
      adjustTimerV6(-30);
    });
    el.querySelector('[data-action="plus"]')?.addEventListener('click',()=>{
      adjustTimerV6(30);
    });
    el.querySelector('[data-action="pause"]')?.addEventListener('click',()=>{
      const timer=currentTimerV6();
      if(timer)pauseResumeTimerV6(timer.key);
    });
    el.querySelector('[data-action="stop"]')?.addEventListener('click',()=>{
      const timer=currentTimerV6();
      if(timer)stopT(timer.key);
    });

    return el;
  }

  function pollGlobalTimerV8(){
    const el=ensureGlobalTimerV8();
    if(!el)return;

    const timer=currentTimerV6();
    const time=el.querySelector('#wt-global-time-v8');
    const meta=el.querySelector('#wt-global-meta-v8');
    const pause=el.querySelector('[data-action="pause"]');

    if(timer){
      lastTimerId=timer.id||'timer';
      timerFinishedUntil=0;

      const remaining=timer.paused
        ?Math.max(0,Number(timer.remainingSec)||0)
        :Math.max(0,Math.ceil((Number(timer.endTs)-Date.now())/1000));

      el.classList.add('on');
      el.classList.remove('finished');
      if(time)time.textContent=timerDisplayV6(remaining);
      if(meta)meta.textContent=`odmor Â· plan ${fmtRest(Number(timer.plannedSec)||0)}`;
      if(pause)pause.textContent=timer.paused?'â–¶':'â…¡';
      return;
    }

    if(lastTimerId){
      lastTimerId='';
      timerFinishedUntil=Date.now()+3500;
    }

    if(timerFinishedUntil>Date.now()){
      el.classList.add('on','finished');
      if(time)time.textContent='KONEC';
      if(meta)meta.textContent='naslednji set';
      return;
    }

    el.classList.remove('on','finished');
  }

  function processWorkoutV8(force){
    document.querySelectorAll('#day-content .exc').forEach(card=>{
      installCompactLoggerV8(card,force);
      simplifyProgressionV8(card);
    });
    syncFocusV8();
    pollGlobalTimerV8();
  }

  function queueRefreshV8(delay,force){
    if(refreshPending)return;
    refreshPending=true;
    window.setTimeout(()=>{
      refreshPending=false;
      processWorkoutV8(!!force);
    },Number.isFinite(delay)?delay:0);
  }

  function wrapRefreshV8(name,force){
    const original=window[name];
    if(typeof original!=='function'||original.__wtV8Wrapped)return;

    function wrapped(){
      const result=original.apply(this,arguments);
      queueRefreshV8(0,!!force);
      window.setTimeout(()=>processWorkoutV8(!!force),80);
      return result;
    }

    wrapped.__wtV8Wrapped=true;
    wrapped.__wtV8Original=original;
    window[name]=wrapped;
  }

  function exactCustomRestV8(key,def){
    const parsed=parseKeyV8(key);
    if(!parsed)return 0;

    const exercise=PROG.days[parsed.day]?.ex?.[parsed.exercise];
    const name=currentExerciseName(
      parsed.day,
      parsed.exercise,
      key
    );
    const custom=getCustomRest();
    let raw;

    if(
      exercise?.id&&
      Object.prototype.hasOwnProperty.call(custom,exercise.id)
    ){
      raw=custom[exercise.id];
    }else if(
      name&&
      Object.prototype.hasOwnProperty.call(custom,name)
    ){
      raw=custom[name];
    }

    const seconds=Number(raw);
    return Number.isFinite(seconds)&&seconds>0?seconds:0;
  }

  const smartRestBeforeV8=computeSmartRestV6;
  computeSmartRestV6=function(key,si,def){
    const exact=exactCustomRestV8(key,def);
    if(exact>0)return exact;
    return smartRestBeforeV8.apply(this,arguments);
  };

  function installSwipeV8(){
    const root=document.getElementById('day-content');
    if(!root||root.dataset.v8FocusSwipe==='1')return;
    root.dataset.v8FocusSwipe='1';

    root.addEventListener('touchstart',event=>{
      if(!getGymMode())return;
      if(event.target.closest('input,button,select,textarea,tr'))return;
      const touch=event.touches[0];
      swipeStart={x:touch.clientX,y:touch.clientY};
    },{passive:true});

    root.addEventListener('touchend',event=>{
      if(!swipeStart||!getGymMode())return;

      const touch=event.changedTouches[0];
      const dx=touch.clientX-swipeStart.x;
      const dy=touch.clientY-swipeStart.y;
      swipeStart=null;

      if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.35)return;

      moveGymFocus(dx<0?1:-1);
      queueRefreshV8(0,true);
    },{passive:true});
  }

  function installObserverV8(){
    const root=document.getElementById('day-content');
    if(!root||root.dataset.v8Observed==='1')return;
    root.dataset.v8Observed='1';

    const observer=new MutationObserver(()=>{
      queueRefreshV8(0,false);
    });

    observer.observe(root,{
      childList:true,
      subtree:true
    });
  }

  function initializeV8(){
    [
      'showDay',
      'setGymMode',
      'toggleGymMode',
      'setGymFocus',
      'moveGymFocus',
      'refreshGymTarget',
      'tgSet',
      'addSet',
      'removeSet'
    ].forEach(name=>wrapRefreshV8(name,true));

    installObserverV8();
    installSwipeV8();
    ensureGlobalTimerV8();
    processWorkoutV8(true);

    window.setTimeout(()=>{
      installObserverV8();
      installSwipeV8();
      processWorkoutV8(true);
    },250);

    window.setInterval(pollGlobalTimerV8,250);
  }

  window.WTFocusPatchV8={
    version:PATCH_VERSION,
    refresh:()=>processWorkoutV8(true),
    syncFocus:syncFocusV8
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initializeV8,{once:true});
  }else{
    initializeV8();
  }

  window.addEventListener('pageshow',()=>{
    window.setTimeout(()=>processWorkoutV8(true),60);
  });
})();
