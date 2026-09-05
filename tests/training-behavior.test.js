'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const core=read('src/app/v6-core.js'),profile=read('src/app/profile-strength.js'),model=read('src/app/workout-model.js');
function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a);return source.slice(a,b);}
function progression(history,cfg={}){
  const ctx=vm.createContext({history,cfg:{targetReps:'6–10',name:'Bench',increment:2.5,...cfg},getV6Settings:()=>({rpeUp:8.5,rpeDown:9.5,painStop:4}),BARBELL_EX:['Bench'],calcPlatesFor:()=>cfg.plates!==false});
  vm.runInContext(section(core,'function parseRepRangeV6','function getRestLogV6')+section(core,'function roundStepV6','function isDeloadWeekIdx'),ctx);
  return vm.runInContext('evaluateProgressionV6(history,cfg)',ctx);
}
function completed(overrides={}){return {topKg:80,completion:1,e1rm:110,loadType:'external',sets:[{kg:80,reps:10,rpe:8,done:true},{kg:80,reps:10,rpe:8,done:true}],...overrides};}
test('increase requires upper target and RPE on every working set',()=>{
  assert.equal(progression([completed()]).action,'increase');
  for(const sets of [[{reps:10,rpe:8},{reps:8,rpe:8}],[{reps:10,rpe:8},{reps:10}],[{reps:10,rpe:9},{reps:10,rpe:8}]])assert.equal(progression([completed({sets})]).action,'hold');
});
test('incomplete workout is held, not reduced from missing sets',()=>{
  assert.equal(progression([completed({completion:.5,sets:[{kg:80,reps:10,rpe:10}]})]).action,'hold');
});
test('pain cannot produce a supposedly safe calculated reduction',()=>{
  const result=progression([completed({pain:6})]);assert.equal(result.action,'hold');assert.equal(result.label,'Preveri bolečino');
  assert.equal(progression([completed({pain:3}),completed({pain:3})]).label,'Preveri bolečino');
});
test('zero load, assisted load and changed units never receive automatic increases',()=>{
  for(const loadType of ['bodyweight','assisted'])assert.equal(progression([completed()],{exercise:{loadType}}).action,'hold');
  assert.equal(progression([completed({topKg:0})]).action,'hold');
  assert.equal(progression([completed()],{exercise:{loadType:'dumbbell'}}).action,'hold');
});
test('manual/531 modes and unavailable plate combinations stay held',()=>{
  for(const mode of ['hold','531'])assert.equal(progression([completed()],{mode}).action,'hold');
  assert.equal(progression([completed()],{plates:false}).action,'hold');
});
test('high RPE can reduce complete sets and warmups do not block working-set targets',()=>{
  assert.equal(progression([completed({sets:[{kg:80,reps:10,rpe:10}]})]).suggestedKg,77.5);
  const workout=completed();workout.sets.push({kg:20,reps:5,type:'warmup'});
  assert.equal(progression([workout]).action,'increase');
});
test('confidence needs comparable complete history, missing target cannot increase',()=>{
  assert.equal(progression([completed()]).confidence,'nizka');
  assert.equal(progression([completed(),completed(),completed()]).confidence,'visoka');
  assert.equal(progression([completed()],{targetReps:''}).action,'hold');
});
function profileHarness(){
  const roster={0:[{id:'my-press',n0:'Custom press',targetSets:3,targetReps:'8–12',loadType:'dumbbell',progMode:'double'},{id:'my-row',n0:'My row',sw:[{n:'Cable row',c:2,w:0}]}]};
  const data=new Map([['wt_profile','cut'],['wt_daylist_shared_v16',JSON.stringify(roster)],['wt_531tm',JSON.stringify({bench:90,squat:120})],['wt_sess6','[{"id":"old-history"}]']]);
  const inputs=Object.fromEntries(['bench','squat','deadlift','ohp'].map(l=>['tm-'+l,{value:''}]));
  const ctx=vm.createContext({localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},PROG_CUT:{weeks:[{reps:'6–10',sM:5,sA:4}],days:[{title:'Day',ex:[]}]},document:{getElementById:id=>inputs[id]||null},safeSetRaw:(k,v)=>{data.set(k,v);return true;},stRun:false,LS_SESS:'wt_active_sess',cd:0,toast(){},uiConfirm:async()=>true,getPhases:()=>JSON.parse(data.get('wt_phases')||'[]'),commitStorageBatch:changes=>{for(const [k,v] of changes)data.set(k,v);},DAY_NAMES:[],getProgramMetaV6:()=>({days:[{name:'My day'}]})});
  vm.runInContext(section(profile,'// ============== PROFIL SISTEM','// Per-vaja:'),ctx);
  vm.runInContext(section(model,'const SHARED_DAYLIST_KEY_V16','// Prikazano ime vaje')+section(model,'function ensureDayLists()','// Stare plasti so vgrajene')+'\n}',ctx);
  vm.runInContext(section(core,'function applyProgramStateV6','function renderDayTabsV6'),ctx);
  vm.runInContext('initProfileUI=()=>{};render531Current=()=>{};showDay=()=>{};renderPhases=()=>{};',ctx);
  return {data,inputs,ctx,run:s=>vm.runInContext(s,ctx)};
}
test('reopening and saving TM is idempotent, invalid field prevents partial commit',()=>{
  const h=profileHarness();h.inputs['tm-bench'].value='90';h.inputs['tm-squat'].value='120';
  for(let i=0;i<3;i++)assert.equal(h.run('save531FromInputs()'),true);
  assert.deepEqual(JSON.parse(h.data.get('wt_531tm')),{bench:90,squat:120});
  h.inputs['tm-bench'].value='100';h.inputs['tm-squat'].value='abc';
  assert.equal(h.run('save531FromInputs()'),false);assert.equal(JSON.parse(h.data.get('wt_531tm')).bench,90);
});
test('Cut/Bulk roundtrip preserves chosen roster, order, manual targets and session history',async()=>{
  const h=profileHarness(),before=h.data.get('wt_daylist_shared_v16');
  assert.equal(await h.run("switchProfile('bulk')"),true);
  assert.equal(h.run('PROG.is531'),false);assert.equal(h.data.get('wt_daylist_shared_v16'),before);
  assert.equal(await h.run("switchProfile('cut')"),true);
  assert.equal(h.data.get('wt_daylist_shared_v16'),before);assert.equal(h.data.get('wt_sess6'),'[{"id":"old-history"}]');
  const phases=JSON.parse(h.data.get('wt_phases'));assert.ok(phases[0].end);assert.equal(phases[1].type,'cut');
});
test('phase change is refused while active or recovery session exists',async()=>{
  const h=profileHarness();h.data.set('wt_active_sess','active');
  assert.equal(await h.run("switchProfile('bulk')"),false);assert.equal(h.data.get('wt_profile'),'cut');
});
test('timeline does not conflate different swapped exercises sharing one roster slot',()=>{
  const ctx=vm.createContext({PROG:{days:[{ex:[{id:'slot'}]}]},exStableId:x=>x,getRestLogV6:()=>[],getExerciseHistory:()=>[],getSessions:()=>[{date:'2026-09-05',exercises:[{rosterId:'slot',name:'Other press',exerciseId:'Other press',sets:[{kg:100,reps:10,done:true}]}]}]});
  vm.runInContext(section(core,'function getExerciseTimelineV6','function exerciseCategoryV6'),ctx);
  assert.equal(vm.runInContext("getExerciseTimelineV6(0,0,'My press').length",ctx),0);
});
test('Android legacy injections do not reinstate duplicate navigation or logger',()=>{
  for(const file of ['js/ui-safe-v1.js','js/workout/set-log.js']){
    let seen=0;vm.runInNewContext(read(file),{document:{getElementById:id=>{assert.equal(id,'page-program');seen++;return {};}}});assert.equal(seen,1);
  }
});
test('e1RM chart reads locked session snapshots instead of mutable current rows',()=>{
  const source=read('src/app/analytics-tools.js');
  const sessions=[{date:'2026-09-04',exercises:[{name:'Bench',sets:[{kg:80,reps:8,done:true}]}]},{date:'2026-09-05',exercises:[{name:'Bench',sets:[{kg:82.5,reps:8,done:true}]}]}];
  const ctx=vm.createContext({BIG_LIFTS:{bench:'Bench'},getSets:()=>({}),getSessions:()=>sessions});
  vm.runInContext(section(source,'function getE1RMHistory()','function renderE1RMChart'),ctx);
  const results=vm.runInContext('getE1RMHistory().Bench',ctx);
  assert.equal(results.length,2);assert.deepEqual(Array.from(results,x=>x.e1rm),[105,101]);
});
