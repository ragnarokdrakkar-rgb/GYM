/* =========================
   WORKOUT TRACKER V6 EXTENSION
   ========================= */
const V6_KEYS={
  settings:'wt_v6_settings',restLog:'wt_rest_log_v6',draft:'wt_session_draft_v6',
  metaCut:'wt_program_meta_cut',metaBulk:'wt_program_meta_bulk',metaShared:'wt_program_meta_shared_v16',lastExternal:'wt_last_external_backup_v6'
};
const V6_DEFAULTS={progression:true,smartRest:true,restWarning:true,rpeUp:8.5,rpeDown:9.5,completionUp:100,painStop:4};
function getV6Settings(){try{return {...V6_DEFAULTS,...JSON.parse(localStorage.getItem(V6_KEYS.settings)||'{}')};}catch{return {...V6_DEFAULTS};}}
function saveV6Settings(s){return safeSetRaw(V6_KEYS.settings,JSON.stringify({...V6_DEFAULTS,...s,completionUp:100}));}
function toggleV6Setting(k){const s=getV6Settings();s[k]=!s[k];if(!saveV6Settings(s))return;renderV6Settings();if(cd!==undefined)showDay(cd);}
function saveProgressionSettingsV6(){const s=getV6Settings();
  s.rpeUp=Math.max(6,Math.min(10,parseFloat(document.getElementById('v6-rpe-up')?.value)||8.5));
  s.rpeDown=Math.max(7,Math.min(10,parseFloat(document.getElementById('v6-rpe-down')?.value)||9.5));
  s.completionUp=100;
  s.painStop=Math.max(1,Math.min(10,parseInt(document.getElementById('v6-pain-stop')?.value)||4));
  if(!saveV6Settings(s))return;toast('✓ Pravila shranjena','ok');if(cd!==undefined)showDay(cd);
}
function renderV6Settings(){const s=getV6Settings();
  [['v6-prog-toggle','progression'],['v6-rest-toggle','smartRest'],['v6-rest-warn-toggle','restWarning']].forEach(([id,k])=>document.getElementById(id)?.classList.toggle('on',!!s[k]));
  const vals={'v6-rpe-up':s.rpeUp,'v6-rpe-down':s.rpeDown,'v6-completion-up':100,'v6-pain-stop':s.painStop};Object.entries(vals).forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.value=v;});
  const log=getRestLogV6(),sum=document.getElementById('v6-rest-summary');if(sum){const last=log.slice(-20),avg=last.length?Math.round(last.reduce((a,b)=>a+(b.actualSec||0),0)/last.length):0;sum.textContent=last.length?`Zadnjih ${last.length} odmorov · povprečno ${fmtRest(avg)}`:'Po prvih setih bo prikazana statistika dejanskega počitka.';}
}

/* ---------- Program metadata and active days ---------- */
function programMetaKeyV6(){return V6_KEYS.metaShared;}
function defaultProgramMetaV6(){const base=PROG_CUT;return {version:2,shared:true,days:base.days.map((d,i)=>({name:['Push A','Pull A','Noge','Push B','Pull B'][i]||`Dan ${i+1}`,title:d.title,sub:d.sub||'',active:true}))};}
function migrateProgramMetaV16(){
  try{const shared=JSON.parse(localStorage.getItem(V6_KEYS.metaShared)||'null');if(shared&&Array.isArray(shared.days))return shared;}catch(e){}
  try{migrateSharedDayListsV16();}catch(e){}
  let source='cut';try{source=JSON.parse(localStorage.getItem(DAYLIST_MIGRATION_KEY_V16)||'null')?.source||'cut';}catch(e){}
  let legacy=null;
  try{legacy=JSON.parse(localStorage.getItem(source==='bulk'?V6_KEYS.metaBulk:V6_KEYS.metaCut)||'null');}catch(e){}
  if(!legacy){try{legacy=JSON.parse(localStorage.getItem(source==='bulk'?V6_KEYS.metaCut:V6_KEYS.metaBulk)||'null');}catch(e){}}
  if(legacy&&Array.isArray(legacy.days)){legacy={...legacy,version:2,shared:true};localStorage.setItem(V6_KEYS.metaShared,JSON.stringify(legacy));return legacy;}
  return null;
}
function getProgramMetaV6(){const def=defaultProgramMetaV6(),raw=migrateProgramMetaV16();if(!raw||!Array.isArray(raw.days))return def;return {version:2,shared:true,days:raw.days.map((d,i)=>({...def.days[i],...d}))};}
function saveProgramMetaV6(meta){localStorage.setItem(V6_KEYS.metaShared,JSON.stringify({...meta,version:2,shared:true}));}
function activeDayIndicesV6(){const m=getProgramMetaV6();return m.days.map((d,i)=>d.active===false?null:i).filter(i=>i!==null);}
function applyProgramStateV6(profile=getActiveProfile()){
  const base=buildPhaseProgramV16(profile),meta=getProgramMetaV6();
  while(base.days.length<meta.days.length)base.days.push({title:`Dan ${base.days.length+1}`,sub:'',tags:[],ex:[]});
  meta.days.forEach((m,i)=>{if(!base.days[i])base.days[i]={title:m.title||`Dan ${i+1}`,sub:m.sub||'',tags:[],ex:[]};base.days[i].title=m.title||m.name||`Dan ${i+1}`;base.days[i].sub=m.sub||'';base.days[i].active=m.active!==false;if(!Array.isArray(base.days[i].tags))base.days[i].tags=[];if(!Array.isArray(base.days[i].ex))base.days[i].ex=[];});
  PROG=base;DAY_NAMES.length=meta.days.length;meta.days.forEach((m,i)=>DAY_NAMES[i]=m.name||`Dan ${i+1}`);
  try{const all=getDayLists();if(all){let ch=false;meta.days.forEach((_,i)=>{if(!Array.isArray(all[i])){all[i]=[];ch=true;}});if(ch)saveDayLists(all);}}catch(e){}
}
function renderDayTabsV6(){const tabs=document.querySelector('.dtabs');if(!tabs)return;const meta=getProgramMetaV6(),active=meta.days.filter(d=>d.active!==false).length||1;tabs.style.gridTemplateColumns=`repeat(${Math.min(active,7)},1fr)`;tabs.innerHTML=meta.days.map((d,i)=>`<button type="button" class="dt${i===cd?' active':''}${d.active===false?' v6-hidden-day':''}" onclick="showDay(${i})"><span class="dt-n">Dan ${i+1}</span><span class="dt-l">${safeHtml(d.name||`Dan ${i+1}`)}</span></button>`).join('');updateTabColors();}
const _isWeekCompleteV5=isWeekComplete;
isWeekComplete=function(cn,w){const ids=activeDayIndicesV6();if(!ids.length)return false;return ids.every(di=>isDayComplete(cn,w,di));};
getSuggestedDayIndex=function(){const active=activeDayIndicesV6();if(!active.length)return 0;const sessions=getSessions();if(!sessions.length)return active[0];const last=sessions[0],i=typeof last.dayIdx==='number'?last.dayIdx:DAY_NAMES.indexOf(last.dayName),pos=active.indexOf(i);return active[(pos<0?0:pos+1)%active.length];};

/* ---------- Program builder ---------- */
let v6BuilderDay=0;
async function openProgramBuilderV6(){if(stRun){toast('Program med aktivno sesijo ostane zaklenjen.','err');return;}await autoBackupToIDB();applyProgramStateV6();ensureDayLists();v6BuilderDay=activeDayIndicesV6()[0]??0;document.getElementById('v6-builder-pop').classList.add('on');renderProgramBuilderV6();}
function closeProgramBuilderV6(){document.getElementById('v6-builder-pop').classList.remove('on');applyProgramStateV6();renderDayTabsV6();showDay(activeDayIndicesV6().includes(cd)?cd:(activeDayIndicesV6()[0]||0));}
function renderProgramBuilderV6(){applyProgramStateV6();ensureDayLists();const meta=getProgramMetaV6(),prof=getActiveProfile();document.getElementById('v6-builder-profile').textContent=`Skupni program · ${prof==='bulk'?'Bulk':'Cut'} faza`;const days=document.getElementById('v6-builder-days');days.innerHTML=meta.days.map((d,i)=>`<button class="v6-builder-day${i===v6BuilderDay?' active':''}${d.active===false?' off':''}" onclick="v6BuilderDay=${i};renderProgramBuilderV6()">${safeHtml(d.name||`Dan ${i+1}`)}${d.active===false?' · off':''}</button>`).join('');renderProgramBuilderDayV6(v6BuilderDay);}
function renderProgramBuilderDayV6(di){const meta=getProgramMetaV6(),d=meta.days[di];if(!d)return;const all=getDayLists()||{},list=all[di]||[],opts=[...new Set([...EXERCISE_DB.map(x=>x.n),...getCustomExercises().map(x=>x.n)])].sort((a,b)=>a.localeCompare(b)).map(n=>`<option value="${safeHtml(n)}"></option>`).join('');
  const exHtml=list.map((it,i)=>{const nm=dispNameForItem(it,getCyc().num,cw),off=!!it.programDisabled;return `<div class="v6-ex-edit${off?' off':''}"><div class="v6-ex-edit-head"><div class="v6-ex-edit-name">${safeHtml(nm)}</div><button class="v6-mini-btn" onclick="moveBuilderExerciseV6(${di},${i},-1)">↑</button><button class="v6-mini-btn" onclick="moveBuilderExerciseV6(${di},${i},1)">↓</button><button class="v6-mini-btn" onclick="toggleBuilderExerciseV6(${di},${i})">${off?'↺':'×'}</button></div><div class="v6-builder-grid">
    <div class="v6-builder-field full"><label>Ime vaje</label><input value="${safeHtml(nm)}" onchange="updateBuilderExerciseV6(${di},${i},'name',this.value)"></div>
    <div class="v6-builder-field"><label>Vloga</label><select onchange="updateBuilderExerciseV6(${di},${i},'main',this.value)"><option value="0" ${!it.m?'selected':''}>Pomožna</option><option value="1" ${it.m?'selected':''}>Glavna</option></select></div>
    <div class="v6-builder-field"><label>Način progresije</label><select onchange="updateBuilderExerciseV6(${di},${i},'progMode',this.value)"><option value="auto" ${(it.progMode||'auto')==='auto'?'selected':''}>Pametno</option><option value="linear" ${it.progMode==='linear'?'selected':''}>Linearno</option><option value="double" ${it.progMode==='double'?'selected':''}>Double progression</option><option value="531" ${it.progMode==='531'?'selected':''}>5/3/1 (opcijsko)</option><option value="hold" ${it.progMode==='hold'?'selected':''}>Brez sprememb</option></select></div>
    ${it.progMode==='531'?`<div class="v6-builder-field"><label>5/3/1 dvig</label><select onchange="updateBuilderExerciseV6(${di},${i},'lift531',this.value)"><option value="bench" ${(it.lift531||infer531LiftV16(nm))==='bench'?'selected':''}>Bench</option><option value="squat" ${(it.lift531||infer531LiftV16(nm))==='squat'?'selected':''}>Squat</option><option value="deadlift" ${(it.lift531||infer531LiftV16(nm))==='deadlift'?'selected':''}>Deadlift</option><option value="ohp" ${(it.lift531||infer531LiftV16(nm))==='ohp'?'selected':''}>OHP</option></select></div>`:''}
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
  else if(field==='main')it.m=value==='1';else if(field==='targetSets')it.targetSets=value?Math.max(1,Math.min(12,parseInt(value)||1)):undefined;else if(field==='targetRpe')it.targetRpe=value?Math.max(5,Math.min(10,parseFloat(value)||8)):undefined;else if(field==='rest')it.r=Math.max(30,Math.min(600,parseInt(value)||90));else if(field==='increment')it.increment=value?Math.max(.25,Math.min(20,parseFloat(value)||2.5)):undefined;else if(field==='desc')it.d=plainImportedText(value,1000);else if(field==='progMode'){it.progMode=['auto','linear','double','531','hold'].includes(value)?value:'auto';if(it.progMode==='531')it.lift531=it.lift531||infer531LiftV16(dispNameForItem(it,getCyc().num,cw))||'bench';else delete it.lift531;}else if(field==='lift531')it.lift531=['bench','squat','deadlift','ohp'].includes(value)?value:'bench';else it[field]=plainImportedText(value,80);saveDayLists(all);renderProgramBuilderV6();renderPhaseHubV16();}
function moveBuilderExerciseV6(di,i,dir){const all=getDayLists()||{},arr=all[di]||[],j=i+dir;if(j<0||j>=arr.length)return;mutateDayList(di,l=>{[l[i],l[j]]=[l[j],l[i]];});renderProgramBuilderV6();}
function toggleBuilderExerciseV6(di,i){const all=getDayLists()||{},it=all[di]?.[i];if(!it)return;it.programDisabled=!it.programDisabled;saveDayLists(all);renderProgramBuilderV6();}
function addBuilderExerciseV6(di){const input=document.getElementById('v6-add-ex-name'),name=plainImportedText(input?.value.trim(),100);if(!name){toast('Vpiši ime vaje.','err');return;}const all=getDayLists()||{},arr=all[di]||[];if(arr.some(x=>dispNameForItem(x,getCyc().num,cw).toLowerCase()===name.toLowerCase())){toast('Vaja je že na tem dnevu.','err');return;}const db=EXERCISE_DB.find(x=>x.n===name),cu=getCustomExercises().find(x=>x.n===name);mutateDayList(di,l=>l.push({id:_newExId(name),n0:name,m:false,r:db?.c==='compound'||cu?.cat==='compound'?120:75,rl:'',d:db?.d||cu?.desc||'',tip:'',extra:true,progMode:'auto'}));renderProgramBuilderV6();}
async function duplicateProgramDayV6(di){const m=getProgramMetaV6();if(m.days.length>=7){toast('Največ 7 dni.','err');return;}const src=m.days[di],ni=m.days.length;m.days.push({...src,name:(src.name||`Dan ${di+1}`)+' kopija',title:(src.title||'Trening')+' — kopija',active:true});saveProgramMetaV6(m);applyProgramStateV6();const all=getDayLists()||{},srcList=all[di]||[];all[ni]=srcList.map(x=>({...JSON.parse(JSON.stringify(x)),id:_newExId(x.n0)}));saveDayLists(all);v6BuilderDay=ni;renderProgramBuilderV6();}

/* target sets/reps from builder */
const _nsfV5=nsf;
nsf=function(di,ei,wk,exKey){return exerciseTargetSetsV19(PROG.days[di]?.ex?.[ei],wk,exKey);};
const _isExHiddenV5=isExHidden;
isExHidden=function(exKey){const m=String(exKey).match(/^c\d+w\d+d(\d+)e(\d+)$/);if(m){const e=PROG.days[+m[1]]?.ex?.[+m[2]];if(e?.programDisabled)return true;}return _isExHiddenV5(exKey);};

/* ---------- Exercise timeline + progression ---------- */
function parseRepRangeV6(v){const n=String(v||'').match(/(\d+)\D+(\d+)/);if(n)return {min:+n[1],max:+n[2]};const one=String(v||'').match(/\d+/);return one?{min:+one[0],max:+one[0]}:{min:5,max:10};}
function getRestLogV6(){try{return JSON.parse(localStorage.getItem(V6_KEYS.restLog)||'[]');}catch{return [];}}
function saveRestLogV6(v){return safeSetRaw(V6_KEYS.restLog,JSON.stringify(v.slice(-500)));}
function getExerciseTimelineV6(di,ei,name){const id=exStableId(name),rosterId=PROG.days[di]?.ex?.[ei]?.id,out=[];getSessions().forEach(s=>{const ex=Array.isArray(s.exercises)?s.exercises.find(x=>(x.exerciseId===id||x.name===name)&&(!rosterId||!x.rosterId||x.rosterId===rosterId)):null;if(!ex)return;const done=(ex.sets||[]).filter(x=>x.done&&x.type!=='warmup'&&!x.warm&&!x.drop&&x.kg!==''&&x.kg!==null&&Number.isFinite(Number(x.kg))&&Number(x.kg)>=0&&Number(x.reps)>0);if(!done.length)return;const top=done.reduce((a,b)=>(Number(b.kg)*(1+Number(b.reps)/30))>(Number(a.kg)*(1+Number(a.reps)/30))?b:a),rpes=done.map(x=>Number(x.rpe)).filter(Boolean),notes=done.map(x=>x.note).filter(Boolean);const rest=getRestLogV6().filter(r=>r.exerciseId===id&&r.date===s.date);out.push({date:s.date,loadType:ex.loadType||'external',cycle:s.cycle,week:(s.weekIdx??((s.weekNum||1)-1)),sets:done,doneSets:done.length,targetSets:ex.targetSets||done.length,completion:(ex.targetSets||done.length)?done.length/(ex.targetSets||done.length):1,topKg:Number(top.kg),topReps:Number(top.reps),e1rm:Number(top.kg)*(1+Number(top.reps)/30),tonnage:done.reduce((a,x)=>a+Number(x.kg)*Number(x.reps),0),avgRpe:rpes.length?rpes.reduce((a,b)=>a+b,0)/rpes.length:0,maxRpe:rpes.length?Math.max(...rpes):0,pain:Number(ex.pain)||0,notes,avgRest:rest.length?rest.reduce((a,b)=>a+(b.actualSec||0),0)/rest.length:0});});
  if(!out.length){try{getExerciseHistory(di,ei,name).filter(h=>h.date).forEach(h=>out.push({date:h.date,cycle:h.c,week:h.w,sets:h.sets.map(x=>({...x,done:true})),doneSets:h.sets.length,targetSets:h.sets.length,completion:1,topKg:h.top.kg,topReps:h.top.reps,e1rm:h.e1rm,tonnage:h.totalVol,avgRpe:0,maxRpe:0,pain:0,notes:[],avgRest:0}));}catch(e){}}
  return out.sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.cycle-a.cycle||b.week-a.week);
}
function exerciseCategoryV6(e,name){if(e?.m)return 'main';const map=EX_MAP[name],db=EXERCISE_DB.find(x=>x.n===name);return (map?.cat||db?.c)==='compound'?'compound':'isolation';}
function defaultIncrementV6(e,name){if(e?.increment)return Number(e.increment);const cat=exerciseCategoryV6(e,name);if(cat==='isolation')return 1;return /squat|deadlift|leg press|romanian|rdl|hip thrust/i.test(name)?5:2.5;}
function roundStepV6(v,step){return Math.round(v/step)*step;}
function evaluateProgressionV6(history,cfg={}){
  if(!history.length)return {action:'none',label:'Najprej zabeleži trening',suggestedKg:0,reasons:['Ni primerljivih zaključenih treningov.'],confidence:'nizka',stagnating:false};
  const settings=getV6Settings(),last=history[0],previous=history[1],step=Number(cfg.increment)>0?Number(cfg.increment):2.5;
  const mode=cfg.mode||'auto',base=Math.max(0,Number(last.topKg)||0),range=parseRepRangeV6(cfg.targetReps);
  const sets=(last.sets||[]).filter(x=>x.done!==false&&x.type!=='warmup'&&!x.warm&&!x.drop);
  const completeRpe=sets.length>0&&sets.every(x=>Number(x.rpe)>=1&&Number(x.rpe)<=10);
  const targetKnown=typeof cfg.targetReps==='string'&&/\d/.test(cfg.targetReps);
  const upper=mode==='linear'?range.min:range.max;
  const repsMet=targetKnown&&sets.length>0&&sets.every(x=>Number(x.reps)>=upper);
  const allDone=Number(last.completion)>=1;
  const loadType=cfg.exercise?.loadType||last.loadType||'external';
  const reasons=[];let action='hold',kg=base,label='',stagnating=false;
  const repeatedPain=history.slice(0,2).length===2&&history.slice(0,2).every(x=>Number(x.pain)>=3);
  if(Number(last.pain)>=settings.painStop||repeatedPain){
    label='Preveri bolečino';reasons.push('Prekini ali prilagodi bolečo vajo. Aplikacija ne more določiti varnega bremena; ob vztrajanju poišči strokovno oceno.');
  }else if(mode==='hold'||mode==='531'){
    reasons.push(mode==='531'?'Sledi ločenemu načrtu 5/3/1.':'Za to vajo je izbrana ročna progresija.');
  }else if(loadType==='assisted'||loadType==='bodyweight'||base===0){
    reasons.push(loadType==='assisted'?'Primerjaj ponovitve pri isti asistenci; manj pomoči pomeni večjo zahtevnost.':'Najprej napreduj pri ponovitvah oziroma zahtevnosti izvedbe. Dodano breme izberi ročno.');
  }else if(last.loadType&&last.loadType!==loadType){
    reasons.push('Pomen kilogramov je spremenjen. Najprej zabeleži primerljiv trening z novo vrsto bremena.');
  }else if(!completeRpe){
    reasons.push('RPE manjka pri enem ali več delovnih setih. Napora ne morem oceniti.');
  }else if(!allDone){
    reasons.push('Trening je nepopoln. Sam izpuščen set ne pomeni, da moraš zmanjšati težo.');
  }else if(sets.some(x=>Number(x.rpe)>=settings.rpeDown)){
    action='reduce';kg=Math.max(0,roundStepV6(base-step,step));reasons.push('Visok napor v delovnem setu: preveri počitek in tehniko ter razmisli o manjšem bremenu.');
  }else if(!repsMet){
    reasons.push(targetKnown?`Najprej dosezi ${upper} ponovitev v vsakem delovnem setu.`:'Najprej določi ciljni razpon ponovitev.');
  }else if(sets.some(x=>Number(x.rpe)>settings.rpeUp)){
    reasons.push('Cilj ponovitev je dosežen, napor pa je še visok.');
  }else if(previous&&Number(last.e1rm)<Number(previous.e1rm)*.98){
    reasons.push('Primerljiv rezultat je nižji. Ohrani breme in preveri regeneracijo.');stagnating=true;
  }else{
    const candidate=roundStepV6(base+step,step);
    const barbell=typeof BARBELL_EX!=='undefined'&&BARBELL_EX.includes(cfg.name);
    if(barbell&&typeof calcPlatesFor==='function'&&!calcPlatesFor(candidate))reasons.push('Predlagan korak ni izvedljiv s shranjenimi ploščami. Prilagodi korak ali opremo.');
    else{action='increase';kg=candidate;reasons.push('Vsi delovni seti dosežejo cilj ponovitev pri nadzorovanem RPE.');}
  }
  const comparable=history.slice(0,3).filter(h=>(h.sets||[]).length&&h.completion>=1&&(h.sets||[]).every(x=>Number(x.rpe)>=1&&Number(x.rpe)<=10));
  const confidence=completeRpe&&allDone&&targetKnown?(comparable.length>=3?'visoka':comparable.length>=2?'srednja':'nizka'):'nizka';
  return {action,label:label||{increase:`Predlog: ${kg} kg`,hold:`Ohrani ${kg} kg`,reduce:`Razmisli o ${kg} kg`}[action],suggestedKg:kg,reasons,confidence,stagnating,last};
}
function isDeloadWeekIdx(w){return !!(PROG.weeks&&PROG.weeks[w]&&PROG.weeks[w].dl);}
function progressionForExerciseV6(di,ei,name){const e=PROG.days[di]?.ex?.[ei],hist=getExerciseTimelineV6(di,ei,name).filter(h=>!isDeloadWeekIdx(h.week));return evaluateProgressionV6(hist,{name,exercise:e,increment:defaultIncrementV6(e,name),mode:e?.progMode||'auto',targetReps:e?.targetReps||PROG.weeks[cw]?.reps});}
function renderProgressionCardV6(di,ei,name){if(!getV6Settings().progression)return '';const r=progressionForExerciseV6(di,ei,name);const cls=r.action==='none'?'':r.action;return `<div class="prog-v6 ${cls}"><div class="prog-v6-head"><span class="prog-v6-title">🧠 ${safeHtml(r.label)}</span><span class="v6-chip ${r.action==='increase'?'good':r.action==='hold'?'warn':r.action==='none'?'':'bad'}">Zanesljivost: ${safeHtml(r.confidence)}</span></div><div class="prog-v6-reasons">${r.reasons.slice(0,3).map(x=>`<div>• ${safeHtml(x)}</div>`).join('')}</div></div>`;}
smartCycleSuggestion=function(cn,di,ei,name){const r=progressionForExerciseV6(di,ei,name),cur=cycleExerciseMetrics(cn,di,ei),actionMap={increase:['su','+'+(r.suggestedKg-(cur.peak||r.last?.topKg||0))+'kg'],hold:['ss','Ohrani'],reduce:['sd2','Zmanjšaj'],deload:['sd2','Deload'],none:['ss','Brez podatkov']},a=actionMap[r.action]||actionMap.hold;return {skg:r.suggestedKg||0,sc:a[0],sl:a[1],reason:r.reasons.join(' '),...cur,trend:0};};

/* ---------- Quick logging and render wrapper ---------- */
function nextPendingSetIndexV6(key,di,ei){const a=getSets()[key]||[],wk=PROG.weeks[cw],n=Math.max(1,nsf(di,ei,wk,key));for(let i=0;i<n;i++)if(!a[i]?.done)return i;return n;}
function parseQuickSetV6(text){const s=String(text||'').trim().replace(',','.');let m=s.match(/^\s*(\d+(?:\.\d+)?)\s*(?:x|×|\s)\s*(\d+)\s*(?:@\s*(\d+(?:\.\d+)?))?\s*$/i);if(!m)m=s.match(/^\s*(\d+(?:\.\d+)?)\s+(\d+)\s+(\d+(?:\.\d+)?)\s*$/);return m?{kg:+m[1],reps:+m[2],rpe:m[3]?+m[3]:null}:null;}
async function quickLogSetV6(key,di,ei,cn){const inp=document.getElementById('v6q-'+key),p=parseQuickSetV6(inp?.value);if(!p){toast('Primer vnosa: 120x5@8','err');return;}let si=nextPendingSetIndexV6(key,di,ei),wk=PROG.weeks[cw],n=nsf(di,ei,wk,key);if(si>=n){addSet(key,di,ei,cn);si=n;}const isBarbell=BARBELL_EX.includes(PROG.days[di]?.ex?.[ei]?.n);await sv(key,si,'kg',String(p.kg),di,ei,cn,isBarbell?1:0);await sv(key,si,'reps',String(p.reps),di,ei,cn,0);if(p.rpe)setRpe(key,si,p.rpe,di,ei,cn);const cur=getSets()[key]?.[si];if(!cur?.done)tgSet(key,si,di,ei,cn);const fresh=document.getElementById('v6q-'+key);if(fresh)fresh.value='';}
function repeatPreviousSetV6(key,di,ei,cn){let all=getSets(),a=all[key]||[],si=nextPendingSetIndexV6(key,di,ei),wk=PROG.weeks[cw],n=nsf(di,ei,wk,key),prev=[...a.slice(0,Math.min(si,a.length))].reverse().find(x=>x.kg&&x.reps);if(!prev){toast('Ni prejšnjega seta.','err');return;}if(si>=n){addSet(key,di,ei,cn);all=getSets();a=all[key]||[];si=n;}a[si]={...a[si],kg:prev.kg,reps:prev.reps,rpe:prev.rpe||null,exName:prev.exName,exerciseId:prev.exerciseId};saveSets(all);showDay(di);toast('↺ Prejšnji set kopiran','ok');}
function copyWeightForwardV6(key,di,ei){const all=getSets(),a=all[key]||[],wk=PROG.weeks[cw],n=nsf(di,ei,wk,key),si=nextPendingSetIndexV6(key,di,ei),src=(si<n?a[si]?.kg:null)||[...a.slice(0,Math.min(si,n))].reverse().find(x=>x.kg)?.kg;if(!src){toast('Najprej vnesi težo.','err');return;}if(si>=n){toast('Vsi ciljni seti so že zaključeni.','ok');return;}for(let i=si;i<n;i++)if(!a[i]?.done){if(!a[i])a[i]={kg:'',reps:'',done:false};a[i].kg=src;}saveSets(all);showDay(di);toast(`↓ ${src} kg kopirano naprej`,'ok');}
function focusNextSetV6(key,si){setTimeout(()=>{const row=document.getElementById(`row-${key}-${si+1}`);const inp=row?.querySelector('.wi,.ri');if(inp){inp.focus();inp.select?.();}},120);}
const _renderExV5=renderEx;
  renderEx=function(e,ei,di,wk,cn,isExtra){const wk2={...wk,reps:e.targetReps||(e.progMode==='531'?'5/3/1':wk.reps),rpe:e.targetRpe?`RPE ${e.targetRpe}`:(e.progMode==='531'?'TM odstotki':wk.rpe)};let html=_renderExV5(e,ei,di,wk2,cn,isExtra),key=sdk(cn,cw,di,ei),name=e.n;const prog=renderProgressionCardV6(di,ei,name),quick=`<div class="quick-log-v6"><input id="v6q-${key}" aria-label="Hitri vnos seta" placeholder="120x5@8" onkeydown="if(event.key==='Enter')quickLogSetV6('${key}',${di},${ei},${cn})"><button class="primary" onclick="quickLogSetV6('${key}',${di},${ei},${cn})">Zapiši set</button><button aria-label="Ponovi prejšnji set" onclick="repeatPreviousSetV6('${key}',${di},${ei},${cn})">↺ set</button><button aria-label="Kopiraj težo naprej" onclick="copyWeightForwardV6('${key}',${di},${ei})">↓ kg</button></div>`;html=html.replace('<table class="st">',prog+quick+'<table class="st">');html=html.replace(`<button class="txb" onclick="stopT('${key}')">X</button></div>`,`<button class="timer-v6-btn" aria-label="Skrajšaj čas za 30 sekund" onclick="adjustTimerV6(-30)">−30</button><button class="timer-v6-btn" aria-label="Premor ali nadaljevanje časovnika" onclick="pauseResumeTimerV6('${key}')" id="tp-${key}">Ⅱ</button><button class="timer-v6-btn" aria-label="Podaljšaj čas za 30 sekund" onclick="adjustTimerV6(30)">+30</button><button class="txb" aria-label="Ustavi časovnik" onclick="stopT('${key}')">X</button><span class="timer-v6-meta" id="tm-${key}"></span></div>`);return html;};

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
    if(_tgSetV5(key,si,di,ei,cn)===false)return false;
  }finally{
    startT=startTimerOnce;
  }

  const after=getSets()[key]?.[si];

  if(!before&&after?.done&&!storageHasPendingWrites()){
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
buildBackupJSON=async function(includePhotos){const b=JSON.parse(await _buildBackupJSONV5(includePhotos));b.version=7;b.schemaVersion=7;b.daylists={...(b.daylists||{}),shared:getDayLists()};b.programMeta={shared:getProgramMetaV6(),cut:null,bulk:null};b.phase={active:getActiveProfile(),plansVersion:1};b.v6settings=getV6Settings();b.restLog=getRestLogV6();b.lastExternal=localStorage.getItem(V6_KEYS.lastExternal)||null;return JSON.stringify(b);};
validateBackupP1=validateBackupV18;
const _restoreBackupV5=restoreBackupObjectP1;
restoreBackupObjectP1=async function(backup,opts={}){return _restoreBackupV5(backup,opts);};
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
  await test('Backup shema 7 je veljavna',async()=>validateBackupP1(JSON.parse(await buildBackupJSON(false))).ok);
  await test('Progresija poveča dobro izvedbo',()=>evaluateProgressionV6([{topKg:100,e1rm:117,completion:1,avgRpe:8,maxRpe:8,pain:0,sets:[{reps:5}]},{topKg:100,e1rm:116,completion:1,avgRpe:8,pain:0,sets:[{reps:5}]}],{increment:2.5,name:'Bench',exercise:{m:true}}).action==='increase');
  await test('Bolečina blokira povečanje',()=>evaluateProgressionV6([{topKg:100,e1rm:117,completion:1,avgRpe:7,maxRpe:7,pain:6,sets:[{reps:5}]}],{increment:2.5,name:'Bench',exercise:{m:true}}).action==='reduce');
  await test('Pametni timer podaljša težak glavni set',()=>smartRestFromMetaV6({defaultSec:120,category:'main',rpe:9.5,reps:3})>=240);
  await test('Program ima aktiven dan',()=>activeDayIndicesV6().length>0);
  await test('Cut in Bulk uporabljata isti seznam vaj',()=>_dlKey()==='wt_daylist_shared_v16');
  await test('5/3/1 je opcijski način vaje',()=>buildPhaseProgramV16('bulk').is531===false);
  await test('Quick parser sprejme 120x5@8',()=>{const p=parseQuickSetV6('120x5@8');return p&&p.kg===120&&p.reps===5&&p.rpe===8;});
  await test('AI modul ni prisoten',()=>!document.getElementById('ai-chat')&&!localStorage.getItem('wt_ai_key'));
  const passed=tests.filter(x=>x.ok).length,allOk=passed===tests.length;if(el)el.innerHTML=tests.map(t=>`<div class="v6-test-row ${t.ok?'pass':'fail'}"><span>${safeHtml(t.name)}</span><span>${t.ok?'✓':'✗ '+safeHtml(t.msg)}</span></div>`).join('')+`<div style="font-size:11px;margin-top:.6rem;color:${allOk?'var(--green-text)':'var(--red-text)'};">${passed}/${tests.length} testov uspešnih</div>`;if(status){status.textContent=`${passed}/${tests.length} ${allOk?'OK':'napaka'}`;status.className='v6-chip '+(allOk?'good':'bad');}localStorage.setItem('wt_v6_last_test',JSON.stringify({date:new Date().toISOString(),pass:passed,total:tests.length}));return {passed,total:tests.length,ok:allOk};}

/* ---------- Wrappers for page/profile/day ---------- */
const _showDayV5=showDay;showDay=function(idx){applyProgramStateV6();const active=activeDayIndicesV6();if(!active.includes(idx))idx=active[0]??0;const r=_showDayV5(idx);renderDayTabsV6();return r;};
const _showPageV5=showPage;showPage=function(p){const r=_showPageV5(p);if(p==='tools'){renderV6Settings();renderBackupStatusV6();renderBackupList();}if(p==='gymlog')renderStagnationAlertsV6();return r;};
const _switchProfileV5=switchProfile;switchProfile=async function(p){const changed=await _switchProfileV5(p);if(changed===false)return false;applyProgramStateV6(p);ensureDayLists();renderDayTabsV6();if(!stRun)showDay(activeDayIndicesV6().includes(cd)?cd:(activeDayIndicesV6()[0]||0));renderTodayCard();renderPhaseHubV16();return true;};
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
      :`Serija ${state.setIndex+1}/${state.total}`;

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
        ${state.complete?'\u2713':'ZAPIŠI'}
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

      if(storageHasPendingWrites())throw new Error('Set has pending storage writes');
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

/* === V15 STABILITY + UNDO + SAVE STATUS + SESSION SUMMARY (release 1.0.48) === */
(function(){
  'use strict';

  const PATCH_VERSION='1.0.48';
  const UNDO_KEY='wt_undo_v15';
  let saveStatusTimerV15=null;

  function markSaveStateV15(state='saved'){
    if(typeof storageHasPendingWrites==='function'&&storageHasPendingWrites())state='error';
    const el=document.getElementById('save-status-v15');
    if(!el)return;

    window.clearTimeout(saveStatusTimerV15);
    el.classList.remove('saving','saved','error');
    el.classList.add(state);

    if(state==='saving'){
      el.textContent='Shranjujem…';
      return;
    }

    if(state==='error'){
      el.textContent='Ni shranjeno';
      return;
    }

    el.textContent='Shranjeno';
    saveStatusTimerV15=window.setTimeout(()=>{
      el.classList.remove('saved');
    },1800);
  }

  window.markSaveStateV15=markSaveStateV15;

  function readUndoStackV15(){
    try{
      const value=JSON.parse(localStorage.getItem(UNDO_KEY)||'[]');
      return Array.isArray(value)?value:[];
    }catch(error){
      return [];
    }
  }

  function writeUndoStackV15(stack){
    safeSetRaw(UNDO_KEY,JSON.stringify((stack||[]).slice(-12)));
    updateUndoButtonV15();
  }

  function clearUndoStackV15(){
    safeRemoveRaw(UNDO_KEY);
    updateUndoButtonV15();
  }

  function updateUndoButtonV15(){
    const button=document.getElementById('undo-set-v15');
    if(!button)return;
    const stack=readUndoStackV15();
    button.disabled=stack.length===0;
    const last=stack[stack.length-1];
    button.title=last
      ?`Razveljavi: ${last.exerciseName||'vaja'}, set ${last.si+1}`
      :'Ni seta za razveljavitev';
  }

  function cloneSetV15(value){
    return JSON.parse(JSON.stringify(value||{
      kg:'',reps:'',rpe:null,done:false
    }));
  }

  function captureUndoV15(key,si,di,ei,cn){
    const current=getSets()[key]?.[si];
    const exerciseName=currentExerciseName(di,ei,key);
    const stack=readUndoStackV15();
    stack.push({
      key,
      si,
      di,
      ei,
      cn,
      week:cw,
      exerciseName,
      before:cloneSetV15(current),
      capturedAt:new Date().toISOString()
    });
    writeUndoStackV15(stack);
  }

  const baseToggleSetV15=tgSet;
  tgSet=function(key,si,di,ei,cn){
    captureUndoV15(key,si,di,ei,cn);
    const result=baseToggleSetV15.apply(this,arguments);
    refreshStorageStatus(result===false?'error':'saved');
    updateUndoButtonV15();
    return result;
  };

  function undoLastSetV15(){
    const stack=readUndoStackV15();
    const item=stack.pop();
    if(!item){
      toast('Ni seta za razveljavitev.','err');
      updateUndoButtonV15();
      return;
    }

    const all=getSets();
    if(!Array.isArray(all[item.key]))all[item.key]=[];
    while(all[item.key].length<=item.si){
      all[item.key].push({kg:'',reps:'',rpe:null,done:false});
    }
    all[item.key][item.si]=cloneSetV15(item.before);
    if(!saveSets(all))return false;
    writeUndoStackV15(stack);

    try{
      const timer=JSON.parse(
        localStorage.getItem('wt_active_timer')||'null'
      );
      if(timer?.key===item.key)stopT(item.key);
    }catch(error){}

    cw=Number.isInteger(item.week)?item.week:cw;
    showDay(item.di);
    setGymFocus(item.key,false);
    toast(`↶ Razveljavljen ${item.exerciseName}, set ${item.si+1}`,'ok');
  }

  window.undoLastSetV15=undoLastSetV15;

  function ensureSessionSummaryV15(){
    let popup=document.getElementById('session-summary-v15');
    if(popup)return popup;

    popup=document.createElement('div');
    popup.id='session-summary-v15';
    popup.className='note-pop session-summary-v15';
    popup.innerHTML=`
      <div class="note-pop-card session-summary-card-v15">
        <div class="session-summary-kicker-v15">TRENING SHRANJEN</div>
        <h3 id="session-summary-title-v15">Povzetek treninga</h3>
        <div class="session-summary-grid-v15" id="session-summary-grid-v15"></div>
        <div class="session-summary-best-v15" id="session-summary-best-v15"></div>
        <div class="session-summary-next-v15" id="session-summary-next-v15"></div>
        <div class="session-summary-actions-v15">
          <button type="button" class="sb" onclick="openProgressFromSummaryV15()">Poglej napredek</button>
          <button type="button" class="sb primary" onclick="closeSessionSummaryV15()">Končano</button>
        </div>
      </div>`;
    popup.addEventListener('click',event=>{
      if(event.target===popup)closeSessionSummaryV15();
    });
    document.body.appendChild(popup);
    return popup;
  }

  function sessionPrCountV15(record){
    try{
      return Object.values(getPRs()).filter(value=>
        value&&typeof value==='object'&&value.date===record.date
      ).length;
    }catch(error){
      return 0;
    }
  }

  function bestSessionSetV15(record){
    const sets=(record.exercises||[]).flatMap(exercise=>
      (exercise.sets||[])
        .filter(set=>set.done&&Number(set.kg)>0&&Number(set.reps)>0)
        .map(set=>({...set,exerciseName:exercise.name}))
    );
    if(!sets.length)return null;
    return sets.reduce((best,set)=>{
      const score=Number(set.kg)*(1+Number(set.reps)/30);
      const bestScore=Number(best.kg)*(1+Number(best.reps)/30);
      return score>bestScore?set:best;
    });
  }

  function nextSessionSuggestionV15(record){
    try{
      const exercise=(record.exercises||[]).find(item=>
        item.isMain&&(item.sets||[]).some(set=>set.done)
      )||(record.exercises||[]).find(item=>
        (item.sets||[]).some(set=>set.done)
      );
      if(!exercise)return 'Naslednji korak: zabeleži vsaj en delovni set.';
      const list=buildDayExList(record.dayIdx)||[];
      const ei=Math.max(0,list.findIndex(item=>
        dispNameForItem(item,record.cycle,record.weekIdx)===exercise.name
      ));
      const suggestion=progressionForExerciseV6(
        record.dayIdx,
        ei,
        exercise.name
      );
      const kg=suggestion.suggestedKg
        ?` · predlog ${suggestion.suggestedKg} kg`
        :'';
      return `${suggestion.label}${kg}`;
    }catch(error){
      return 'Naslednji trening nadaljuj po trenutnem programu.';
    }
  }

  function showSessionSummaryV15(record){
    if(!record)return;
    const popup=ensureSessionSummaryV15();
    const totals=record.totals||{};
    const doneSets=(record.exercises||[]).flatMap(item=>item.sets||[])
      .filter(set=>set.done);
    const rpes=doneSets.map(set=>Number(set.rpe)).filter(Number.isFinite);
    const avgRpe=rpes.length
      ?(rpes.reduce((sum,value)=>sum+value,0)/rpes.length).toFixed(1)
      :'—';
    const prCount=sessionPrCountV15(record);
    const best=bestSessionSetV15(record);

    popup.querySelector('#session-summary-title-v15').textContent=
      `${record.dayName||'Trening'} · ${record.durationMin||0} min`;
    popup.querySelector('#session-summary-grid-v15').innerHTML=`
      <div><strong>${totals.doneSets||0}/${totals.sets||0}</strong><span>serij</span></div>
      <div><strong>${Math.round(totals.tonnage||0).toLocaleString('sl-SI')}</strong><span>kg volumna</span></div>
      <div><strong>${avgRpe}</strong><span>povp. RPE</span></div>
      <div><strong>${prCount}</strong><span>novih PR</span></div>`;
    popup.querySelector('#session-summary-best-v15').textContent=best
      ?`Najboljši set: ${best.exerciseName} · ${best.kg} kg × ${best.reps}${best.rpe?' @ '+best.rpe:''}`
      :'Ni dokončanih delovnih setov.';
    popup.querySelector('#session-summary-next-v15').textContent=
      nextSessionSuggestionV15(record);
    popup.classList.add('on');
  }

  function closeSessionSummaryV15(){
    document.getElementById('session-summary-v15')
      ?.classList.remove('on');
  }

  function openProgressFromSummaryV15(){
    closeSessionSummaryV15();
    showProgressPage('gymlog');
  }

  window.closeSessionSummaryV15=closeSessionSummaryV15;
  window.openProgressFromSummaryV15=openProgressFromSummaryV15;

  const baseToggleSessionV15=toggleSess;
  toggleSess=async function(){
    const wasRunning=stRun;
    const beforeId=getSessions()[0]?.id||'';
    const result=await baseToggleSessionV15.apply(this,arguments);

    if(!wasRunning&&stRun){
      clearUndoStackV15();
    }

    if(wasRunning&&!stRun){
      const record=getSessions()[0];
      clearUndoStackV15();
      if(record&&record.id!==beforeId)showSessionSummaryV15(record);
    }

    return result;
  };

  function syncActiveSemanticsV15(){
    document.querySelectorAll('.nt,.wt,.dt').forEach(button=>{
      if(button.classList.contains('active')){
        button.setAttribute('aria-current',
          button.classList.contains('nt')?'page':'true'
        );
      }else{
        button.removeAttribute('aria-current');
      }
    });
  }

  const baseShowPageV15=showPage;
  showPage=function(){
    const result=baseShowPageV15.apply(this,arguments);
    syncActiveSemanticsV15();
    return result;
  };

  const baseSetWeekV15=setWeek;
  setWeek=function(){
    const result=baseSetWeekV15.apply(this,arguments);
    syncActiveSemanticsV15();
    return result;
  };

  const baseShowDayV15=showDay;
  showDay=function(){
    const result=baseShowDayV15.apply(this,arguments);
    syncActiveSemanticsV15();
    return result;
  };

  function initializeV15(){
    markSaveStateV15('saved');
    updateUndoButtonV15();
    syncActiveSemanticsV15();
    safeSetRaw('wt_release_version',PATCH_VERSION);
  }

  window.WTStabilityPatchV15={
    version:PATCH_VERSION,
    undo:undoLastSetV15,
    saveState:markSaveStateV15,
    showSummary:showSessionSummaryV15
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initializeV15,{once:true});
  }else{
    initializeV15();
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
/* === V12 FOCUS DOT NAVIGATION (release 1.0.43) === */
(function(){
  'use strict';
  if(window.WTFocusPatchV12)return;

  const PATCH_VERSION='1.0.43';
  let renderFrameV12=0;

  function focusApiV12(){
    return window.WTFocusPatchV10||null;
  }

  function dotsApiV12(){
    return window.WTFocusPatchV11||null;
  }

  function refreshDotsV12(smooth){
    const dotsApi=dotsApiV12();

    if(dotsApi&&typeof dotsApi.renderDots==='function'){
      try{
        dotsApi.renderDots();
      }catch(error){}
    }

    window.cancelAnimationFrame(renderFrameV12);

    renderFrameV12=window.requestAnimationFrame(()=>{
      const dots=document.querySelectorAll('.focus-dot-v11');
      const active=document.querySelector('.focus-dot-v11.active');

      dots.forEach(dot=>{
        if(dot===active){
          dot.setAttribute('aria-current','step');
        }else{
          dot.removeAttribute('aria-current');
        }
      });

      if(!active)return;

      try{
        active.scrollIntoView({
          behavior:smooth?'smooth':'auto',
          block:'nearest',
          inline:'center'
        });
      }catch(error){}
    });
  }

  function moveFocusV12(direction){
    const api=focusApiV12();

    if(api&&typeof api.moveFocus==='function'){
      api.moveFocus(direction);
      refreshDotsV12(true);
      window.setTimeout(()=>refreshDotsV12(false),90);
      return;
    }

    if(typeof window.moveGymFocus==='function'){
      window.moveGymFocus(direction);
      refreshDotsV12(true);
      window.setTimeout(()=>refreshDotsV12(false),90);
    }
  }

  function handleArrowClickV12(event){
    const arrow=event.target?.closest?.(
      '#focus-nav-v10 .focus-arrow-v10'
    );

    if(!arrow||arrow.disabled)return;

    const direction=arrow.classList.contains('prev')?-1:
      arrow.classList.contains('next')?1:0;

    if(!direction)return;

    event.preventDefault();
    event.stopImmediatePropagation();
    moveFocusV12(direction);
  }

  function handleDotClickV12(event){
    if(!event.target?.closest?.('.focus-dot-v11'))return;
    window.setTimeout(()=>refreshDotsV12(true),0);
    window.setTimeout(()=>refreshDotsV12(false),100);
  }

  function handleKeyboardV12(event){
    if(
      event.defaultPrevented||
      event.altKey||
      event.ctrlKey||
      event.metaKey
    ){
      return;
    }

    if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;

    const target=event.target;

    if(
      target?.matches?.(
        'input,textarea,select,[contenteditable="true"]'
      )
    ){
      return;
    }

    const gymMode=
      typeof window.getGymMode==='function'&&
      window.getGymMode();

    if(!gymMode)return;

    event.preventDefault();
    moveFocusV12(event.key==='ArrowLeft'?-1:1);
  }

  function initializeV12(){
    document.addEventListener(
      'click',
      handleArrowClickV12,
      true
    );

    document.addEventListener(
      'click',
      handleDotClickV12,
      false
    );

    document.addEventListener(
      'keydown',
      handleKeyboardV12,
      true
    );

    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden){
        refreshDotsV12(false);
      }
    });

    window.addEventListener('pageshow',()=>{
      window.setTimeout(()=>refreshDotsV12(false),60);
    });

    refreshDotsV12(false);
  }

  window.WTFocusPatchV12={
    version:PATCH_VERSION,
    refresh:refreshDotsV12,
    move:moveFocusV12
  };

  if(document.readyState==='loading'){
    document.addEventListener(
      'DOMContentLoaded',
      initializeV12,
      {once:true}
    );
  }else{
    initializeV12();
  }
})();
/* === V13 CLEANUP EXPORT CALENDAR FOCUS PLATES (release 1.0.44) === */
(function(){
  'use strict';

  if(window.WTReleasePatchV13)return;

  const PATCH_VERSION='1.0.44';
  const PLATE_PREF_KEY='wt_plate_calc_exercises_v13';
  let plateDialogState=null;
  let renderQueued=false;
  let observer=null;

  function localDateKey(value){
    const date=value instanceof Date?value:new Date(value);
    if(Number.isNaN(date.getTime()))return '';
    return [
      date.getFullYear(),
      String(date.getMonth()+1).padStart(2,'0'),
      String(date.getDate()).padStart(2,'0')
    ].join('-');
  }

  function readPlatePrefs(){
    try{
      const parsed=JSON.parse(
        localStorage.getItem(PLATE_PREF_KEY)||'{}'
      );
      return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)
        ?parsed
        :{};
    }catch(error){
      return {};
    }
  }

  function savePlatePrefs(value){
    safeSetRaw(
      PLATE_PREF_KEY,
      JSON.stringify(value||{})
    );
  }

  function parseExerciseKey(key){
    const match=String(key||'').match(
      /^c(\d+)w(\d+)d(\d+)e(\d+)$/
    );
    if(!match)return null;
    return {
      cycle:Number(match[1]),
      week:Number(match[2]),
      day:Number(match[3]),
      exercise:Number(match[4])
    };
  }

  function exerciseContext(key){
    const parsed=parseExerciseKey(key);
    if(!parsed)return null;

    const exercise=
      typeof PROG!=='undefined'
        ?PROG.days?.[parsed.day]?.ex?.[parsed.exercise]||null
        :null;

    let item=null;
    try{
      item=getDayLists?.()?.[parsed.day]?.[parsed.exercise]||null;
    }catch(error){}

    let name=exercise?.n||item?.n0||'Vaja';
    try{
      name=currentExerciseName(
        parsed.day,
        parsed.exercise,
        key
      )||name;
    }catch(error){}

    return {
      key,
      parsed,
      exercise,
      item,
      name
    };
  }

  function plateIdentity(context){
    if(context?.item?.id)return String(context.item.id);
    if(context?.exercise?.id)return String(context.exercise.id);

    let stable=context?.name||'vaja';
    try{
      stable=exStableId(stable);
    }catch(error){}

    return `d${context.parsed.day}|${stable}`;
  }

  function defaultPlateEnabled(context){
    const exercise=context?.exercise||{};
    const name=String(context?.name||exercise.n||'');
    let equipment=String(
      context?.item?.eq||
      exercise.eq||
      ''
    ).toLowerCase();

    try{
      if(!equipment){
        equipment=String(
          EXERCISE_DB.find(item=>item.n===name)?.eq||''
        ).toLowerCase();
      }
    }catch(error){}

    if(equipment==='barbell')return true;
    if(exercise.fl||exercise.bbb)return true;

    try{
      if(
        Array.isArray(BARBELL_EX)&&
        BARBELL_EX.includes(name)
      ){
        return true;
      }
    }catch(error){}

    return /\bbarbell\b|deadlift|front squat|back squat|good morning|power clean|clean and press|snatch/i.test(name);
  }

  function plateEnabledForKey(key){
    const context=exerciseContext(key);
    if(!context)return false;

    const prefs=readPlatePrefs();
    const identity=plateIdentity(context);

    if(Object.prototype.hasOwnProperty.call(prefs,identity)){
      return !!prefs[identity];
    }

    return defaultPlateEnabled(context);
  }

  function setPlateEnabled(key,enabled){
    const context=exerciseContext(key);
    if(!context)return false;

    const prefs=readPlatePrefs();
    prefs[plateIdentity(context)]=!!enabled;
    savePlatePrefs(prefs);
    return true;
  }

  function cardForKey(key){
    return document.getElementById('ec-'+key);
  }

  function firstWeight(card){
    return Number(
      String(
        card?.querySelector('tr[id^="row-"] .wi')?.value||''
      ).replace(',','.')
    )||0;
  }

  function renderPlateBox(card,key,kg){
    if(!card)return;

    let box=card.querySelector('.platebox');

    if(!box){
      box=document.createElement('div');
      box.className='platebox';
      box.id='pb-'+key;

      const table=card.querySelector('table.st');
      if(table)table.parentNode.insertBefore(box,table);
      else card.querySelector('.ex-body')?.appendChild(box);
    }

    if(kg<=0){
      box.innerHTML=
        '<span style="color:var(--text3);">'+
        'Vnesi tezo za prikaz plosc'+
        '</span>';
      return;
    }

    let plates=null;
    try{
      plates=calcPlatesFor(kg);
    }catch(error){}

    if(!plates){
      box.textContent=
        `Ni mogoce sestaviti ${kg}kg s trenutnimi ploscami.`;
      return;
    }

    box.innerHTML=
      `<strong>Vsaka stran:</strong> ${plates.each}`+
      `<span class="pl-each">`+
      `Palica ${plates.bar}kg + ${plates.perSide*2}kg = `+
      `${plates.total}kg</span>`;
  }

  function renderPlateMini(card,key,setIndex,kg){
    const row=document.getElementById(
      `row-${key}-${setIndex}`
    );
    const cell=row?.querySelector('.kg-cell');
    if(!cell)return;

    let mini=row.querySelector('.pl-mini');

    if(!mini){
      mini=document.createElement('div');
      mini.id=`pl-${key}-${setIndex}`;
      mini.className='pl-mini';
      cell.appendChild(mini);
    }

    let result={text:'',cls:''};
    try{
      result=platesShort(kg);
    }catch(error){}

    const nextText=result?.text||'';
    const nextClass='pl-mini '+(result?.cls||'');

    if(mini.textContent!==nextText){
      mini.textContent=nextText;
    }

    if(mini.className!==nextClass){
      mini.className=nextClass;
    }
  }

  function ensurePlateButton(card,key,enabled){
    let button=card.querySelector('.plate-toggle-v13');

    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='plate-toggle-v13';
      button.textContent='PL';
      button.setAttribute(
        'aria-label',
        'Izračun plošč'
      );

      button.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        openPlateDialog(key);
      });
    }

    button.classList.toggle('on',!!enabled);
    button.classList.toggle('off',!enabled);
    button.title=
      `Izračun plošč ${enabled?'ON':'OFF'}`;

    const toolbar=
      card.querySelector('.exercise-actions-v10')||
      card.querySelector('.bdg')||
      card.querySelector('.ex-top');

    if(toolbar&&button.parentNode!==toolbar){
      toolbar.appendChild(button);
    }
  }

  function applyPlateCard(card){
    const key=String(card?.id||'').replace(/^ec-/,'');
    if(!key)return;

    const enabled=plateEnabledForKey(key);
    card.dataset.plateCalc=enabled?'1':'0';
    ensurePlateButton(card,key,enabled);

    if(!enabled){
      card.querySelectorAll('.platebox,.pl-mini')
        .forEach(node=>node.remove());
      return;
    }

    renderPlateBox(card,key,firstWeight(card));

    card.querySelectorAll('tr[id^="row-"]').forEach(row=>{
      const match=String(row.id).match(/-(\d+)$/);
      if(!match)return;

      const setIndex=Number(match[1]);
      const kg=Number(
        String(row.querySelector('.wi')?.value||'')
          .replace(',','.')
      )||0;

      renderPlateMini(card,key,setIndex,kg);
    });
  }

  function focusKeys(){
    try{
      const api=window.WTFocusPatchV10;
      if(api&&typeof api.focusKeys==='function'){
        return api.focusKeys().filter(Boolean);
      }
    }catch(error){}

    return Array.from(
      document.querySelectorAll('#day-content .exc')
    )
      .map(card=>String(card.id||'').replace(/^ec-/,''))
      .filter(Boolean);
  }

  function refreshFocusDots(){
    const keys=focusKeys();
    const active=localStorage.getItem('wt_active_ex')||'';

    document.querySelectorAll('.focus-dot-v11')
      .forEach((dot,index)=>{
        const key=keys[index]||'';
        const selected=key!==''&&key===active;
        dot.classList.toggle('active',selected);

        if(selected){
          dot.setAttribute('aria-current','step');
        }else{
          dot.removeAttribute('aria-current');
        }
      });
  }

  function removeDynamicLegacyUi(){
    document.querySelectorAll(
      '.wubox,[id^="wu-dyn-"],.deload-warn'
    ).forEach(node=>node.remove());
  }

  function applyUi(){
    document.querySelectorAll('#day-content .exc')
      .forEach(applyPlateCard);

    removeDynamicLegacyUi();
    refreshFocusDots();
  }

  function scheduleUi(){
    if(renderQueued)return;
    renderQueued=true;

    window.requestAnimationFrame(()=>{
      renderQueued=false;
      applyUi();
    });
  }

  function ensurePlateDialog(){
    let popup=document.getElementById('plate-calc-pop-v13');
    if(popup)return popup;

    popup=document.createElement('div');
    popup.className='note-pop';
    popup.id='plate-calc-pop-v13';
    popup.innerHTML=`
      <div class="note-pop-card plate-choice-card-v13">
        <h3>Izračun plošč</h3>
        <div class="plate-choice-name-v13"
          id="plate-choice-name-v13">Vaja</div>
        <div class="plate-choice-actions-v13">
          <button type="button"
            class="sb plate-choice-on-v13">
            Izračun plošč ON
          </button>
          <button type="button"
            class="sb plate-choice-off-v13">
            Izračun plošč OFF
          </button>
        </div>
        <button type="button"
          class="sb plate-choice-close-v13">
          Prekliči
        </button>
      </div>`;

    popup.querySelector('.plate-choice-on-v13')
      ?.addEventListener('click',()=>confirmPlateChoice(true));

    popup.querySelector('.plate-choice-off-v13')
      ?.addEventListener('click',()=>confirmPlateChoice(false));

    popup.querySelector('.plate-choice-close-v13')
      ?.addEventListener('click',closePlateDialog);

    popup.addEventListener('click',event=>{
      if(event.target===popup)closePlateDialog();
    });

    document.body.appendChild(popup);
    return popup;
  }

  function openPlateDialog(key){
    const context=exerciseContext(key);
    if(!context){
      toast('Vaja ni bila najdena.','err');
      return;
    }

    plateDialogState={key};
    const popup=ensurePlateDialog();
    const label=popup.querySelector('#plate-choice-name-v13');
    const enabled=plateEnabledForKey(key);

    if(label){
      label.textContent=
        `${context.name} · trenutno ${enabled?'ON':'OFF'}`;
    }

    popup.classList.add('on');
  }

  function closePlateDialog(){
    document.getElementById('plate-calc-pop-v13')
      ?.classList.remove('on');
    plateDialogState=null;
  }

  function confirmPlateChoice(enabled){
    const key=plateDialogState?.key;
    if(!key)return;

    if(!setPlateEnabled(key,enabled)){
      toast('Nastavitve ni bilo mogoce shraniti.','err');
      return;
    }

    closePlateDialog();
    applyPlateCard(cardForKey(key));
    toast(`Izračun plošč ${enabled?'ON':'OFF'}`,'ok');
  }

  function installPlateWrappers(){
    if(typeof sv==='function'&&!sv.__wtV13Wrapped){
      const base=sv;

      async function wrapped(
        key,
        setIndex,
        field,
        value,
        dayIndex,
        exerciseIndex,
        cycle,
        isBarbell
      ){
        const enabled=plateEnabledForKey(key);
        const result=await base.call(
          this,
          key,
          setIndex,
          field,
          value,
          dayIndex,
          exerciseIndex,
          cycle,
          enabled?1:0
        );

        scheduleUi();
        return result;
      }

      wrapped.__wtV13Wrapped=true;
      wrapped.__wtV13Original=base;
      sv=wrapped;
      window.sv=wrapped;
    }

    if(
      typeof updatePlateBox==='function'&&
      !updatePlateBox.__wtV13Wrapped
    ){
      const base=updatePlateBox;

      function wrapped(key,kg){
        const card=cardForKey(key);

        if(!plateEnabledForKey(key)){
          card?.querySelectorAll('.platebox')
            .forEach(node=>node.remove());
          return;
        }

        renderPlateBox(card,key,Number(kg)||0);
      }

      wrapped.__wtV13Wrapped=true;
      wrapped.__wtV13Original=base;
      updatePlateBox=wrapped;
      window.updatePlateBox=wrapped;
    }

    if(
      typeof updatePlMini==='function'&&
      !updatePlMini.__wtV13Wrapped
    ){
      const base=updatePlMini;

      function wrapped(key,setIndex,kg){
        const card=cardForKey(key);

        if(!plateEnabledForKey(key)){
          document.getElementById(`pl-${key}-${setIndex}`)
            ?.remove();
          return;
        }

        renderPlateMini(
          card,
          key,
          Number(setIndex),
          Number(kg)||0
        );
      }

      wrapped.__wtV13Wrapped=true;
      wrapped.__wtV13Original=base;
      updatePlMini=wrapped;
      window.updatePlMini=wrapped;
    }

    [
      'showDay',
      'setGymFocus',
      'moveGymFocus',
      'refreshGymTarget',
      'tgSet',
      'addSet',
      'removeSet'
    ].forEach(name=>{
      const original=window[name];
      if(
        typeof original!=='function'||
        original.__wtV13UiWrapped
      ){
        return;
      }

      function wrapped(){
        const result=original.apply(this,arguments);
        scheduleUi();
        window.setTimeout(scheduleUi,80);
        return result;
      }

      wrapped.__wtV13UiWrapped=true;
      wrapped.__wtV13Original=original;
      window[name]=wrapped;

      try{
        eval(`${name}=window[name]`);
      }catch(error){}
    });
  }

  function installRemovedFeatureGuards(){
    try{
      const settings=getV6Settings();
      settings.smartRest=false;
      settings.restWarning=false;
      saveV6Settings(settings);
    }catch(error){}

    if(typeof smartRestFromMetaV6==='function'){
      smartRestFromMetaV6=function(meta){
        return Math.max(
          1,
          Number(meta?.defaultSec)||90
        );
      };
      window.smartRestFromMetaV6=smartRestFromMetaV6;
    }

    if(typeof computeSmartRestV6==='function'){
      computeSmartRestV6=function(key,setIndex,seconds){
        return Math.max(1,Number(seconds)||90);
      };
      window.computeSmartRestV6=computeSmartRestV6;
    }

    if(typeof renderStagnationAlertsV6==='function'){
      renderStagnationAlertsV6=function(){};
      window.renderStagnationAlertsV6=renderStagnationAlertsV6;
    }

    if(typeof collectStagnationAlertsV6==='function'){
      collectStagnationAlertsV6=function(){return [];};
      window.collectStagnationAlertsV6=
        collectStagnationAlertsV6;
    }

    if(typeof runSelfTestsV6==='function'){
      runSelfTestsV6=async function(){return [];};
      window.runSelfTestsV6=runSelfTestsV6;
    }

    if(typeof checkDeloadNeeded==='function'){
      checkDeloadNeeded=function(){};
      window.checkDeloadNeeded=checkDeloadNeeded;
    }
  }

  function installDateFixes(){
    if(
      typeof getSessions==='function'&&
      !getSessions.__wtV13Wrapped
    ){
      const base=getSessions;

      function wrapped(){
        return base.call(this).map(session=>{
          if(!session||!session.startISO)return session;

          const corrected=localDateKey(session.startISO);
          if(!corrected||session.date===corrected)return session;

          return {
            ...session,
            date:corrected
          };
        });
      }

      wrapped.__wtV13Wrapped=true;
      wrapped.__wtV13Original=base;
      getSessions=wrapped;
      window.getSessions=wrapped;
    }

    if(
      typeof buildImmutableSessionRecord==='function'&&
      !buildImmutableSessionRecord.__wtV13Wrapped
    ){
      const base=buildImmutableSessionRecord;

      function wrapped(start,end,duration,context){
        const record=base.call(
          this,
          start,
          end,
          duration,
          context
        );

        record.date=localDateKey(start);
        return record;
      }

      wrapped.__wtV13Wrapped=true;
      wrapped.__wtV13Original=base;
      buildImmutableSessionRecord=wrapped;
      window.buildImmutableSessionRecord=wrapped;
    }

    [
      'renderTrainCalendar',
      'renderSessHist'
    ].forEach(name=>{
      const original=window[name];

      if(
        typeof original!=='function'||
        original.__wtV13DateWrapped
      ){
        return;
      }

      function wrapped(){
        const nativeToISOString=Date.prototype.toISOString;

        Date.prototype.toISOString=function(){
          const shifted=new Date(
            this.getTime()-
            this.getTimezoneOffset()*60000
          );
          return nativeToISOString.call(shifted);
        };

        try{
          return original.apply(this,arguments);
        }finally{
          Date.prototype.toISOString=nativeToISOString;
        }
      }

      wrapped.__wtV13DateWrapped=true;
      wrapped.__wtV13Original=original;
      window[name]=wrapped;

      try{
        eval(`${name}=window[name]`);
      }catch(error){}
    });
  }

  async function saveBackupFile(json,filename){
    const plugin=window.Capacitor?.Plugins?.BackupExport;

    if(plugin&&typeof plugin.saveJson==='function'){
      await plugin.saveJson({
        content:json,
        filename
      });
      return 'native';
    }

    const file=new File(
      [json],
      filename,
      {type:'application/json'}
    );

    let canShare=false;
    try{
      canShare=
        typeof navigator.share==='function'&&
        (
          typeof navigator.canShare!=='function'||
          navigator.canShare({files:[file]})
        );
    }catch(error){
      canShare=false;
    }

    if(canShare){
      await navigator.share({
        files:[file],
        title:'Workout Tracker backup'
      });
      return 'share';
    }

    const url=URL.createObjectURL(file);
    const link=document.createElement('a');
    link.href=url;
    link.download=filename;
    link.style.display='none';
    document.body.appendChild(link);
    link.click();

    window.setTimeout(()=>{
      link.remove();
      URL.revokeObjectURL(url);
    },2000);

    return 'download';
  }

  function installBackupFixes(){
    if(
      typeof buildBackupJSON==='function'&&
      !buildBackupJSON.__wtV13Wrapped
    ){
      const base=buildBackupJSON;

      async function wrapped(includePhotos){
        const backup=JSON.parse(
          await base.call(this,includePhotos)
        );

        backup.platePrefsV13=readPlatePrefs();
        return JSON.stringify(backup);
      }

      wrapped.__wtV13Wrapped=true;
      wrapped.__wtV13Original=base;
      buildBackupJSON=wrapped;
      window.buildBackupJSON=wrapped;
    }

    if(
      typeof restoreBackupObjectP1==='function'&&
      !restoreBackupObjectP1.__wtV13Wrapped
    ){
      const base=restoreBackupObjectP1;

      async function wrapped(backup,options={}){
        const result=await base.call(this,backup,options);
        installRemovedFeatureGuards();
        scheduleUi();
        return result;
      }

      wrapped.__wtV13Wrapped=true;
      wrapped.__wtV13Original=base;
      restoreBackupObjectP1=wrapped;
      window.restoreBackupObjectP1=wrapped;
    }

    exportData=async function(){
      try{
        const json=await buildBackupJSON(true);
        const parsed=JSON.parse(json);
        const validation=validateBackupP1(parsed);

        if(!validation.ok){
          throw new Error(
            validation.msg||'Backup ni veljaven.'
          );
        }

        const now=new Date();
        const filename=
          `workout_backup_v6_${localDateKey(now)}.json`;

        await saveBackupFile(json,filename);

        const completedAt=now.toISOString();
        localStorage.setItem(
          'wt_last_backup',
          completedAt
        );

        try{
          localStorage.setItem(
            V6_KEYS.lastExternal,
            completedAt
          );
        }catch(error){}

        try{
          renderBackupStatusV6();
        }catch(error){}

        toast('Backup je bil uspesno shranjen.','ok');
        return true;
      }catch(error){
        console.warn(
          'Workout backup export failed',
          error
        );

        toast(
          `Backup ni bil shranjen: ${
            error?.message||'neznana napaka'
          }`,
          'err'
        );

        return false;
      }
    };

    window.exportData=exportData;
  }

  function installObserver(){
    if(observer||!document.body)return;

    observer=new MutationObserver(()=>{
      scheduleUi();
    });

    observer.observe(document.body,{
      childList:true,
      subtree:true
    });
  }

  function initialize(){
    installRemovedFeatureGuards();
    installDateFixes();
    installBackupFixes();
    installPlateWrappers();
    ensurePlateDialog();
    installObserver();
    applyUi();

    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden)scheduleUi();
    });

    window.addEventListener('pageshow',scheduleUi);
  }

  window.WTReleasePatchV13={
    version:PATCH_VERSION,
    localDateKey,
    plateEnabled:plateEnabledForKey,
    refresh:scheduleUi
  };

  if(document.readyState==='loading'){
    document.addEventListener(
      'DOMContentLoaded',
      initialize,
      {once:true}
    );
  }else{
    initialize();
  }
})();
/* === V14 PROGRAM BUILDER + DAY COMPLETION (release 1.0.47) === */
(function(){
  'use strict';

  if(window.WTBuilderPatchV14)return;

  const PATCH_VERSION='1.0.47';
  const BASE_DAY_COUNT={cut:5,bulk:5};
  const PLATE_PREF_KEY='wt_plate_calc_exercises_v13';

  let chooserDayV14=null;
  let customDayV14=null;
  let viewportFrameV14=0;

  const baseGetProgramMetaV14=getProgramMetaV6;
  const baseSaveProgramMetaV14=saveProgramMetaV6;
  const baseRenderBuilderDayV14=renderProgramBuilderDayV6;

  function uidV14(prefix){
    return `${prefix}-${Date.now().toString(36)}-${
      Math.random().toString(36).slice(2,8)
    }`;
  }

  function profileV14(){
    return typeof getActiveProfile==='function'
      ?getActiveProfile()
      :'cut';
  }

  function normalizedMetaV14(profile=profileV14()){
    const meta=baseGetProgramMetaV14(profile);
    let changed=false;

    meta.days.forEach((day,index)=>{
      if(!day.id){
        day.id=uidV14(`day-${profile}-${index+1}`);
        changed=true;
      }

      if(day.deleted===true&&day.active!==false){
        day.active=false;
        changed=true;
      }

      if(
        index>=(BASE_DAY_COUNT[profile]||5)&&
        day.isCopy===undefined&&
        day.customDay===undefined
      ){
        const copyLike=/kopija|copy/i.test(
          `${day.name||''} ${day.title||''}`
        );

        if(copyLike)day.isCopy=true;
        else day.customDay=true;

        changed=true;
      }
    });

    if(changed){
      baseSaveProgramMetaV14(meta,profile);
    }

    return meta;
  }

  getProgramMetaV6=function(profile=profileV14()){
    return normalizedMetaV14(profile);
  };
  window.getProgramMetaV6=getProgramMetaV6;

  function activeDayObjectsV14(){
    const meta=getProgramMetaV6();

    return meta.days
      .map((day,index)=>({day,index}))
      .filter(({day})=>
        day.deleted!==true&&
        day.active!==false
      );
  }

  activeDayIndicesV6=function(){
    return activeDayObjectsV14().map(entry=>entry.index);
  };
  window.activeDayIndicesV6=activeDayIndicesV6;

  function dayListAtV14(dayIndex,cycle,week){
    try{
      const list=dayListFor(dayIndex,cycle,week);
      if(Array.isArray(list))return list;
    }catch(error){}

    try{
      const list=buildDayExList(dayIndex);
      return Array.isArray(list)?list:[];
    }catch(error){
      return [];
    }
  }

  function targetSetsV14(item,weekPlan,key){
    return exerciseTargetSetsV19(item,weekPlan,key);
  }

  isDayComplete=function(cycle,week,dayIndex){
    const meta=getProgramMetaV6();
    const day=meta.days?.[dayIndex];

    if(
      !day||
      day.deleted===true||
      day.active===false
    ){
      return false;
    }

    const allSets=getSets();
    const weekPlan=PROG.weeks?.[week]||PROG.weeks?.[cw];
    const visible=activeWorkoutEntriesV19(cycle,week,dayIndex);

    if(visible.length===0)return false;

    return visible.every(({item,key})=>{
      const expected=targetSetsV14(item,weekPlan,key);
      const sets=Array.isArray(allSets[key])
        ?allSets[key].slice(0,expected)
        :[];

      return (
        sets.length===expected&&
        sets.every(set=>set&&set.done===true)
      );
    });
  };
  window.isDayComplete=isDayComplete;

  updateTabColors=function(){
    const cycle=getCyc().num;

    document.querySelectorAll('.wt').forEach((tab,week)=>{
      tab.classList.toggle(
        'done',
        isWeekComplete(cycle,week)
      );
    });

    document.querySelectorAll('.dt').forEach(tab=>{
      const dayIndex=Number(tab.dataset.dayIndex);

      tab.classList.toggle(
        'done',
        Number.isInteger(dayIndex)&&
        isDayComplete(cycle,cw,dayIndex)
      );
    });
  };
  window.updateTabColors=updateTabColors;

  renderDayTabsV6=function(){
    const tabs=document.querySelector('.dtabs');
    if(!tabs)return;

    const meta=getProgramMetaV6();
    const activeCount=activeDayIndicesV6().length||1;
    let visibleOrdinal=0;

    tabs.style.gridTemplateColumns=
      `repeat(${Math.min(activeCount,7)},1fr)`;

    tabs.innerHTML=meta.days.map((day,index)=>{
      const visible=
        day.deleted!==true&&
        day.active!==false;

      if(visible)visibleOrdinal+=1;

      const ordinal=visible?visibleOrdinal:index+1;
      const hiddenClass=visible?'':' v6-hidden-day';

      return (
        `<div class="dt${index===cd?' active':''}${hiddenClass}" `+
        `data-day-index="${index}" `+
        `onclick="showDay(${index})" `+
        `${visible?'':'aria-hidden="true"'}>`+
          `<div class="dt-n">Dan ${ordinal}</div>`+
          `<div class="dt-l">${
            safeHtml(day.name||`Dan ${ordinal}`)
          }</div>`+
        `</div>`
      );
    }).join('');

    updateTabColors();
  };
  window.renderDayTabsV6=renderDayTabsV6;

  function visibleBuilderDaysV14(meta){
    return meta.days
      .map((day,index)=>({day,index}))
      .filter(({day})=>day.deleted!==true);
  }

  renderProgramBuilderV6=function(){
    applyProgramStateV6();
    ensureDayLists();

    const meta=getProgramMetaV6();
    const profile=profileV14();
    const visible=visibleBuilderDaysV14(meta);
    const available=visible.map(entry=>entry.index);

    if(!available.includes(v6BuilderDay)){
      v6BuilderDay=
        activeDayIndicesV6()[0]??
        available[0]??
        0;
    }

    const badge=document.getElementById('v6-builder-profile');
    if(badge)badge.textContent=`Skupni program · ${profile==='bulk'?'Bulk':'Cut'} faza`;

    const days=document.getElementById('v6-builder-days');

    if(days){
      days.innerHTML=visible.map(({day,index})=>
        `<button type="button" `+
        `class="v6-builder-day${
          index===v6BuilderDay?' active':''
        }${day.active===false?' off':''}" `+
        `data-builder-day-index="${index}">`+
        `${safeHtml(day.name||`Dan ${index+1}`)}`+
        `${day.active===false?' · off':''}`+
        `</button>`
      ).join('');

      days.querySelectorAll('[data-builder-day-index]')
        .forEach(button=>{
          button.addEventListener('click',()=>{
            v6BuilderDay=Number(
              button.dataset.builderDayIndex
            );
            renderProgramBuilderV6();
          });
        });
    }

    renderProgramBuilderDayV6(v6BuilderDay);
  };
  window.renderProgramBuilderV6=renderProgramBuilderV6;

  function isRemovableDayV14(day,index){
    return (
      day?.isCopy===true||
      day?.customDay===true||
      index>=(BASE_DAY_COUNT[profileV14()]||5)
    );
  }

  function appendDayControlsV14(dayIndex){
    const content=document.getElementById('v6-builder-content');
    const meta=getProgramMetaV6();
    const day=meta.days?.[dayIndex];

    if(!content||!day)return;

    const controls=document.createElement('div');
    controls.className='builder-day-controls-v14';

    const status=document.createElement('div');
    status.className='builder-day-status-v14';
    status.textContent=
      day.active===false?'Dan je arhiviran':'Dan je aktiven';
    controls.appendChild(status);

    const actions=document.createElement('div');
    actions.className='builder-day-control-actions-v14';

    const statusButton=document.createElement('button');
    statusButton.type='button';
    statusButton.className='sb';
    statusButton.textContent=
      day.active===false
        ?'Ponovno aktiviraj'
        :'Arhiviraj dan';

    statusButton.addEventListener('click',()=>{
      setDayActiveV14(dayIndex,day.active===false);
    });

    actions.appendChild(statusButton);

    if(isRemovableDayV14(day,dayIndex)){
      const deleteButton=document.createElement('button');
      deleteButton.type='button';
      deleteButton.className='sb danger-action';
      deleteButton.textContent=
        day.isCopy===true
          ?'Izbriši kopijo'
          :'Izbriši dan';

      deleteButton.addEventListener('click',()=>{
        deleteProgramDayV14(dayIndex);
      });

      actions.appendChild(deleteButton);
    }

    controls.appendChild(actions);
    content.insertBefore(controls,content.firstChild);
  }

  function upgradeExercisePickerV14(dayIndex){
    const input=document.getElementById('v6-add-ex-name');
    if(!input)return;

    input.removeAttribute('list');
    input.readOnly=true;
    input.autocomplete='off';
    input.classList.add('builder-picker-input-v14');
    input.placeholder='Tapni za izbiro vaje';

    const open=event=>{
      event?.preventDefault?.();
      input.blur();
      openExerciseChooserV14(dayIndex);
    };

    input.addEventListener('click',open);
    input.addEventListener('focus',open);

    document.getElementById('v6-ex-options')?.remove();

    const field=input.closest('.v6-builder-field');
    const label=field?.querySelector('label');
    if(label)label.textContent='Izberi vajo';

    const actions=input
      .closest('.v6-ex-edit')
      ?.querySelector('.v6-builder-actions');

    if(actions){
      const create=document.createElement('button');
      create.type='button';
      create.className='sb builder-create-v14';
      create.textContent='+ Ustvari novo vajo';
      create.addEventListener('click',()=>{
        openCustomExerciseV14(dayIndex);
      });
      actions.appendChild(create);
    }
  }

  renderProgramBuilderDayV6=function(dayIndex){
    baseRenderBuilderDayV14(dayIndex);
    appendDayControlsV14(dayIndex);
    upgradeExercisePickerV14(dayIndex);
    syncViewportV14();
  };
  window.renderProgramBuilderDayV6=renderProgramBuilderDayV6;

  async function setDayActiveV14(dayIndex,active){
    const meta=getProgramMetaV6();
    const day=meta.days?.[dayIndex];
    if(!day)return;

    if(!active&&activeDayIndicesV6().length<=1){
      toast('Vsaj en dan mora ostati aktiven.','err');
      return;
    }

    day.active=!!active;
    baseSaveProgramMetaV14(meta,profileV14());
    applyProgramStateV6();

    if(!active&&v6BuilderDay===dayIndex){
      v6BuilderDay=activeDayIndicesV6()[0]??dayIndex;
    }

    renderProgramBuilderV6();
    renderDayTabsV6();

    toast(
      active
        ?'Dan je ponovno aktiven.'
        :'Dan je arhiviran.',
      'ok'
    );
  }

  async function deleteProgramDayV14(dayIndex){
    const meta=getProgramMetaV6();
    const day=meta.days?.[dayIndex];

    if(!day||!isRemovableDayV14(day,dayIndex)){
      toast('Osnovnega programskega dne ni mogoče izbrisati.','err');
      return;
    }

    if(
      day.active!==false&&
      activeDayIndicesV6().length<=1
    ){
      toast('Vsaj en dan mora ostati aktiven.','err');
      return;
    }

    const accepted=await uiConfirm(
      `Izbrišem "${day.name||'ta dan'}" iz programa?\n\n`+
      'Stara zgodovina ostane varno shranjena.'
    );

    if(!accepted)return;

    day.deleted=true;
    day.active=false;
    day.deletedAt=new Date().toISOString();

    baseSaveProgramMetaV14(meta,profileV14());
    applyProgramStateV6();

    const remaining=visibleBuilderDaysV14(
      getProgramMetaV6()
    ).map(entry=>entry.index);

    v6BuilderDay=
      activeDayIndicesV6()[0]??
      remaining[0]??
      0;

    renderProgramBuilderV6();
    renderDayTabsV6();

    toast('Dan je odstranjen iz programa.','ok');
  }

  window.deleteProgramDayV14=deleteProgramDayV14;

  addProgramDayV6=async function(){
    const meta=getProgramMetaV6();
    const visible=visibleBuilderDaysV14(meta);

    if(visible.length>=7){
      toast('Največ 7 aktivnih programskih dni.','err');
      return;
    }

    const dayIndex=meta.days.length;
    const number=visible.length+1;

    meta.days.push({
      id:uidV14(`day-${profileV14()}-${number}`),
      name:`Dan ${number}`,
      title:`Nov trening ${number}`,
      sub:'',
      active:true,
      customDay:true,
      deleted:false
    });

    baseSaveProgramMetaV14(meta,profileV14());
    applyProgramStateV6();

    const all=getDayLists()||{};
    all[dayIndex]=[];
    saveDayLists(all);

    v6BuilderDay=dayIndex;
    renderProgramBuilderV6();
  };
  window.addProgramDayV6=addProgramDayV6;

  duplicateProgramDayV6=async function(dayIndex){
    const meta=getProgramMetaV6();
    const visible=visibleBuilderDaysV14(meta);

    if(visible.length>=7){
      toast('Največ 7 aktivnih programskih dni.','err');
      return;
    }

    const source=meta.days?.[dayIndex];
    if(!source)return;

    const newIndex=meta.days.length;
    const copyName=(source.name||`Dan ${dayIndex+1}`)+' kopija';

    meta.days.push({
      ...JSON.parse(JSON.stringify(source)),
      id:uidV14(`day-${profileV14()}-copy`),
      sourceId:source.id||null,
      isCopy:true,
      customDay:false,
      deleted:false,
      deletedAt:null,
      name:copyName,
      title:(source.title||'Trening')+' — kopija',
      active:true
    });

    baseSaveProgramMetaV14(meta,profileV14());
    applyProgramStateV6();

    const all=getDayLists()||{};
    const sourceList=Array.isArray(all[dayIndex])
      ?all[dayIndex]
      :[];

    all[newIndex]=sourceList.map(item=>({
      ...JSON.parse(JSON.stringify(item)),
      id:_newExId(item.n0||item.n||'vaja')
    }));

    saveDayLists(all);

    v6BuilderDay=newIndex;
    renderProgramBuilderV6();
    toast('Kopija dneva je ustvarjena.','ok');
  };
  window.duplicateProgramDayV6=duplicateProgramDayV6;

  function exerciseOptionsV14(){
    const options=new Map();

    (Array.isArray(EXERCISE_DB)?EXERCISE_DB:[])
      .forEach(item=>{
        const name=String(item?.n||'').trim();
        if(!name)return;

        options.set(name.toLowerCase(),{
          name,
          muscle:item.m||'',
          secondary:item.s||'',
          category:item.c||'isolation',
          equipment:item.eq||'other',
          description:item.d||'',
          rest:item.c==='compound'?120:75,
          custom:false
        });
      });

    (typeof getCustomExercises==='function'
      ?getCustomExercises()
      :[]
    ).forEach(item=>{
      const name=String(item?.n||'').trim();
      if(!name)return;

      options.set(name.toLowerCase(),{
        name,
        muscle:item.muscle||item.m||'',
        secondary:item.secondary||item.s||'',
        category:item.cat||item.c||'isolation',
        equipment:item.eq||'other',
        description:item.desc||item.d||'',
        rest:Number(item.defaultRest)||75,
        targetSets:Number(item.targetSets)||null,
        targetReps:item.targetReps||'',
        targetRpe:Number(item.targetRpe)||null,
        main:item.main===true,
        plateDefault:
          typeof item.plateDefault==='boolean'
            ?item.plateDefault
            :item.eq==='barbell',
        custom:true
      });
    });

    return Array.from(options.values()).sort((a,b)=>
      a.name.localeCompare(b.name,'sl')
    );
  }

  function ensureChooserV14(){
    let popup=document.getElementById('builder-ex-picker-v14');
    if(popup)return popup;

    popup=document.createElement('div');
    popup.id='builder-ex-picker-v14';
    popup.className='note-pop builder-sheet-v14';
    popup.innerHTML=`
      <div class="note-pop-card builder-sheet-card-v14">
        <div class="builder-sheet-head-v14">
          <div>
            <h3>Izberi vajo</h3>
            <div class="builder-sheet-sub-v14">
              Tapni vajo, da jo dodaš v trening.
            </div>
          </div>
          <button type="button"
            class="builder-sheet-x-v14"
            aria-label="Zapri">×</button>
        </div>
        <input type="search"
          id="builder-ex-search-v14"
          class="builder-search-v14"
          placeholder="Išči po imenu, mišici ali opremi"
          autocomplete="off">
        <div id="builder-ex-list-v14"
          class="builder-ex-list-v14"></div>
        <button type="button"
          class="sb builder-new-ex-v14">
          + Ustvari novo vajo
        </button>
      </div>`;

    popup.querySelector('.builder-sheet-x-v14')
      ?.addEventListener('click',closeExerciseChooserV14);

    popup.querySelector('.builder-new-ex-v14')
      ?.addEventListener('click',()=>{
        const dayIndex=chooserDayV14;
        closeExerciseChooserV14();
        openCustomExerciseV14(dayIndex);
      });

    popup.querySelector('#builder-ex-search-v14')
      ?.addEventListener('input',event=>{
        renderChooserListV14(event.target.value);
      });

    popup.addEventListener('click',event=>{
      if(event.target===popup)closeExerciseChooserV14();
    });

    document.body.appendChild(popup);
    return popup;
  }

  function renderChooserListV14(query=''){
    const list=document.getElementById('builder-ex-list-v14');
    if(!list)return;

    const needle=String(query||'').trim().toLowerCase();

    const matches=exerciseOptionsV14().filter(item=>{
      if(!needle)return true;

      return [
        item.name,
        item.muscle,
        item.secondary,
        item.category,
        item.equipment
      ].some(value=>
        String(value||'').toLowerCase().includes(needle)
      );
    });

    list.innerHTML='';

    if(matches.length===0){
      const empty=document.createElement('div');
      empty.className='builder-empty-v14';
      empty.textContent='Ni zadetkov.';
      list.appendChild(empty);
      return;
    }

    matches.slice(0,100).forEach(item=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='builder-ex-option-v14';

      const title=document.createElement('strong');
      title.textContent=(item.custom?'★ ':'')+item.name;

      const meta=document.createElement('span');
      meta.textContent=[
        item.muscle,
        item.equipment,
        item.category==='compound'?'compound':'isolation'
      ].filter(Boolean).join(' · ');

      button.append(title,meta);

      button.addEventListener('click',()=>{
        const dayIndex=chooserDayV14;
        addExerciseToDayV14(dayIndex,item);
      });

      list.appendChild(button);
    });
  }

  function openExerciseChooserV14(dayIndex){
    if(!Number.isInteger(Number(dayIndex)))return;

    chooserDayV14=Number(dayIndex);
    const popup=ensureChooserV14();
    const search=popup.querySelector('#builder-ex-search-v14');

    if(document.activeElement?.blur){
      document.activeElement.blur();
    }

    if(search)search.value='';
    renderChooserListV14('');
    popup.classList.add('on');
    syncViewportV14();

    window.setTimeout(()=>{
      search?.focus();
    },80);
  }

  function closeExerciseChooserV14(){
    document.getElementById('builder-ex-picker-v14')
      ?.classList.remove('on');

    document.activeElement?.blur?.();
    chooserDayV14=null;
  }

  window.openExerciseChooserV14=openExerciseChooserV14;
  window.closeExerciseChooserV14=closeExerciseChooserV14;

  function readPlatePrefsV14(){
    try{
      const value=JSON.parse(
        localStorage.getItem(PLATE_PREF_KEY)||'{}'
      );

      return value&&typeof value==='object'
        ?value
        :{};
    }catch(error){
      return {};
    }
  }

  function setPlatePreferenceV14(exerciseId,enabled){
    if(!exerciseId)return;

    const prefs=readPlatePrefsV14();
    prefs[String(exerciseId)]=!!enabled;

    localStorage.setItem(
      PLATE_PREF_KEY,
      JSON.stringify(prefs)
    );
  }

  function exerciseItemV14(option){
    return {
      id:_newExId(option.name),
      n0:option.name,
      m:option.main===true,
      r:Math.max(30,Math.min(600,Number(option.rest)||75)),
      rl:'',
      d:option.description||'',
      tip:'',
      extra:true,
      progMode:'auto',
      eq:option.equipment||'other',
      targetSets:
        Number(option.targetSets)>0
          ?Math.max(1,Math.min(12,Number(option.targetSets)))
          :undefined,
      targetReps:option.targetReps||undefined,
      targetRpe:
        Number(option.targetRpe)>=5
          ?Math.max(5,Math.min(10,Number(option.targetRpe)))
          :undefined
    };
  }

  function addExerciseToDayV14(dayIndex,option){
    const di=Number(dayIndex);
    if(!Number.isInteger(di)||!option?.name)return;

    ensureDayLists();

    const all=getDayLists()||{};
    const list=Array.isArray(all[di])?all[di]:[];
    const wanted=option.name.trim().toLowerCase();
    const cycle=getCyc().num;

    const existing=list.find(item=>{
      const displayed=String(
        dispNameForItem(item,cycle,cw)||''
      ).trim().toLowerCase();

      const original=String(item.n0||'')
        .trim()
        .toLowerCase();

      return displayed===wanted||original===wanted;
    });

    if(existing){
      if(existing.programDisabled){
        existing.programDisabled=false;
        all[di]=list;
        saveDayLists(all);

        closeExerciseChooserV14();
        closeCustomExerciseV14();
        renderProgramBuilderV6();
        toast('Vaja je ponovno aktivirana.','ok');
        return;
      }

      toast('Vaja je že na tem dnevu.','err');
      return;
    }

    const item=exerciseItemV14(option);

    mutateDayList(di,items=>{
      items.push(item);
    });

    if(typeof option.plateDefault==='boolean'){
      setPlatePreferenceV14(
        item.id,
        option.plateDefault
      );
    }

    closeExerciseChooserV14();
    closeCustomExerciseV14();
    renderProgramBuilderV6();

    toast(`${option.name} je dodana.`, 'ok');
  }

  function ensureCustomPopupV14(){
    let popup=document.getElementById('builder-custom-ex-v14');
    if(popup)return popup;

    popup=document.createElement('div');
    popup.id='builder-custom-ex-v14';
    popup.className='note-pop builder-sheet-v14';
    popup.innerHTML=`
      <div class="note-pop-card builder-sheet-card-v14
        builder-custom-card-v14">
        <div class="builder-sheet-head-v14">
          <div>
            <h3>Ustvari novo vajo</h3>
            <div class="builder-sheet-sub-v14">
              Vaja se shrani in takoj doda v izbrani trening.
            </div>
          </div>
          <button type="button"
            class="builder-sheet-x-v14"
            aria-label="Zapri">×</button>
        </div>

        <div class="builder-custom-scroll-v14">
          <label class="builder-field-v14 full">
            <span>Ime vaje</span>
            <input id="builder-custom-name-v14"
              maxlength="100"
              autocomplete="off">
          </label>

          <div class="builder-custom-grid-v14">
            <label class="builder-field-v14">
              <span>Mišična skupina</span>
              <select id="builder-custom-muscle-v14">
                <option>Prsa</option>
                <option>Hrbet</option>
                <option>Ramena</option>
                <option>Bicepsi</option>
                <option>Tricepsi</option>
                <option>Kvadricepsi</option>
                <option>Hamstringi</option>
                <option>Gluteusi</option>
                <option>Mečni</option>
                <option>Core</option>
                <option>Celo telo</option>
              </select>
            </label>

            <label class="builder-field-v14">
              <span>Tip</span>
              <select id="builder-custom-category-v14">
                <option value="compound">Compound</option>
                <option value="isolation">Isolation</option>
              </select>
            </label>

            <label class="builder-field-v14">
              <span>Oprema</span>
              <select id="builder-custom-equipment-v14">
                <option value="barbell">Barbell</option>
                <option value="dumbbell">Dumbbell</option>
                <option value="machine">Machine</option>
                <option value="cable">Cable</option>
                <option value="bodyweight">Bodyweight</option>
                <option value="other">Drugo</option>
              </select>
            </label>

            <label class="builder-field-v14">
              <span>Vloga</span>
              <select id="builder-custom-role-v14">
                <option value="accessory">Pomožna</option>
                <option value="main">Glavna</option>
              </select>
            </label>

            <label class="builder-field-v14">
              <span>Privzeti seti</span>
              <input id="builder-custom-sets-v14"
                type="number" min="1" max="12" value="4">
            </label>

            <label class="builder-field-v14">
              <span>Ponovitve</span>
              <input id="builder-custom-reps-v14"
                value="8–12" maxlength="30">
            </label>

            <label class="builder-field-v14">
              <span>Ciljni RPE</span>
              <input id="builder-custom-rpe-v14"
                type="number" min="5" max="10"
                step="0.5" value="8">
            </label>

            <label class="builder-field-v14">
              <span>Počitek (sek)</span>
              <input id="builder-custom-rest-v14"
                type="number" min="30" max="600"
                step="15" value="90">
            </label>

            <label class="builder-field-v14 full">
              <span>Izračun plošč</span>
              <select id="builder-custom-plate-v14">
                <option value="1">ON</option>
                <option value="0">OFF</option>
              </select>
            </label>

            <label class="builder-field-v14 full">
              <span>Opis oziroma navodilo</span>
              <textarea id="builder-custom-desc-v14"
                rows="4" maxlength="1000"></textarea>
            </label>
          </div>
        </div>

        <div class="builder-custom-actions-v14">
          <button type="button"
            class="sb builder-custom-cancel-v14">
            Prekliči
          </button>
          <button type="button"
            class="sb builder-custom-save-v14">
            Shrani in dodaj
          </button>
        </div>
      </div>`;

    popup.querySelector('.builder-sheet-x-v14')
      ?.addEventListener('click',closeCustomExerciseV14);

    popup.querySelector('.builder-custom-cancel-v14')
      ?.addEventListener('click',closeCustomExerciseV14);

    popup.querySelector('.builder-custom-save-v14')
      ?.addEventListener('click',saveCustomExerciseV14);

    popup.querySelector('#builder-custom-equipment-v14')
      ?.addEventListener('change',event=>{
        const plate=popup.querySelector(
          '#builder-custom-plate-v14'
        );

        if(plate){
          plate.value=
            event.target.value==='barbell'?'1':'0';
        }
      });

    popup.addEventListener('click',event=>{
      if(event.target===popup)closeCustomExerciseV14();
    });

    document.body.appendChild(popup);
    return popup;
  }

  function openCustomExerciseV14(dayIndex){
    const di=Number(dayIndex);
    if(!Number.isInteger(di))return;

    customDayV14=di;
    const popup=ensureCustomPopupV14();

    popup.querySelector('#builder-custom-name-v14').value='';
    popup.querySelector('#builder-custom-muscle-v14').value='Prsa';
    popup.querySelector('#builder-custom-category-v14').value='compound';
    popup.querySelector('#builder-custom-equipment-v14').value='barbell';
    popup.querySelector('#builder-custom-role-v14').value='accessory';
    popup.querySelector('#builder-custom-sets-v14').value='4';
    popup.querySelector('#builder-custom-reps-v14').value='8–12';
    popup.querySelector('#builder-custom-rpe-v14').value='8';
    popup.querySelector('#builder-custom-rest-v14').value='90';
    popup.querySelector('#builder-custom-plate-v14').value='1';
    popup.querySelector('#builder-custom-desc-v14').value='';

    document.activeElement?.blur?.();
    popup.classList.add('on');
    syncViewportV14();

    window.setTimeout(()=>{
      popup.querySelector('#builder-custom-name-v14')?.focus();
    },80);
  }

  function closeCustomExerciseV14(){
    document.getElementById('builder-custom-ex-v14')
      ?.classList.remove('on');

    document.activeElement?.blur?.();
    customDayV14=null;
  }

  function fieldValueV14(popup,id){
    return popup.querySelector('#'+id)?.value??'';
  }

  function saveCustomExerciseV14(){
    const popup=document.getElementById('builder-custom-ex-v14');
    const dayIndex=customDayV14;
    if(!popup||!Number.isInteger(dayIndex))return;

    const name=plainImportedText(
      fieldValueV14(popup,'builder-custom-name-v14').trim(),
      100
    );

    if(!name){
      toast('Vnesi ime vaje.','err');
      popup.querySelector('#builder-custom-name-v14')?.focus();
      return;
    }

    const exists=exerciseOptionsV14().some(item=>
      item.name.toLowerCase()===name.toLowerCase()
    );

    if(exists){
      toast('Vaja s tem imenom že obstaja.','err');
      return;
    }

    const muscle=plainImportedText(
      fieldValueV14(popup,'builder-custom-muscle-v14'),
      80
    );
    const category=
      fieldValueV14(popup,'builder-custom-category-v14')===
      'compound'
        ?'compound'
        :'isolation';
    const equipment=
      fieldValueV14(popup,'builder-custom-equipment-v14')||
      'other';
    const main=
      fieldValueV14(popup,'builder-custom-role-v14')==='main';
    const targetSets=Math.max(
      1,
      Math.min(
        12,
        Number(fieldValueV14(
          popup,
          'builder-custom-sets-v14'
        ))||4
      )
    );
    const targetReps=plainImportedText(
      fieldValueV14(popup,'builder-custom-reps-v14'),
      30
    );
    const targetRpe=Math.max(
      5,
      Math.min(
        10,
        Number(fieldValueV14(
          popup,
          'builder-custom-rpe-v14'
        ))||8
      )
    );
    const rest=Math.max(
      30,
      Math.min(
        600,
        Number(fieldValueV14(
          popup,
          'builder-custom-rest-v14'
        ))||90
      )
    );
    const plateDefault=
      fieldValueV14(popup,'builder-custom-plate-v14')==='1';
    const description=plainImportedText(
      fieldValueV14(popup,'builder-custom-desc-v14').trim(),
      1000
    );

    const custom={
      n:name,
      muscle,
      m:muscle,
      cat:category,
      c:category,
      eq:equipment,
      desc:description,
      d:description,
      defaultRest:rest,
      targetSets,
      targetReps,
      targetRpe,
      main,
      plateDefault
    };

    const customs=getCustomExercises();
    customs.push(custom);
    saveCustomExercises(customs);

    addExerciseToDayV14(dayIndex,{
      name,
      muscle,
      category,
      equipment,
      description,
      rest,
      targetSets,
      targetReps,
      targetRpe,
      main,
      plateDefault,
      custom:true
    });
  }

  window.openCustomExerciseV14=openCustomExerciseV14;
  window.closeCustomExerciseV14=closeCustomExerciseV14;
  window.saveCustomExerciseV14=saveCustomExerciseV14;

  function syncViewportV14(){
    window.cancelAnimationFrame(viewportFrameV14);

    viewportFrameV14=window.requestAnimationFrame(()=>{
      const height=window.visualViewport?.height||
        window.innerHeight;

      document.documentElement.style.setProperty(
        '--wt-visual-height-v14',
        `${Math.max(320,Math.round(height))}px`
      );
    });
  }

  function closeTopBuilderPopupV14(){
    const custom=document.getElementById('builder-custom-ex-v14');
    if(custom?.classList.contains('on')){
      closeCustomExerciseV14();
      return true;
    }

    const chooser=document.getElementById('builder-ex-picker-v14');
    if(chooser?.classList.contains('on')){
      closeExerciseChooserV14();
      return true;
    }

    return false;
  }

  function initializeV14(){
    normalizedMetaV14('cut');
    normalizedMetaV14('bulk');

    syncViewportV14();
    renderDayTabsV6();

    window.visualViewport?.addEventListener(
      'resize',
      syncViewportV14
    );
    window.visualViewport?.addEventListener(
      'scroll',
      syncViewportV14
    );
    window.addEventListener('resize',syncViewportV14);

    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&closeTopBuilderPopupV14()){
        event.preventDefault();
      }
    },true);

    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden){
        syncViewportV14();
        renderDayTabsV6();
      }
    });
  }

  window.WTBuilderPatchV14={
    version:PATCH_VERSION,
    refresh:()=>{
      renderDayTabsV6();
      if(
        document.getElementById('v6-builder-pop')
          ?.classList.contains('on')
      ){
        renderProgramBuilderV6();
      }
    },
    isDayComplete,
    openChooser:openExerciseChooserV14,
    createExercise:openCustomExerciseV14
  };

  if(document.readyState==='loading'){
    document.addEventListener(
      'DOMContentLoaded',
      initializeV14,
      {once:true}
    );
  }else{
    initializeV14();
  }
})();
