'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const model=read('src/app/workout-model.js'),core=read('src/app/v6-core.js'),analytics=read('src/app/analytics-tools.js');
function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,`${start} section exists`);return source.slice(a,b);}
function harness(items=[{n:'Bench',m:true,progMode:'531',targetSets:4}]){
  const h={items,sets:{},hidden:{},extras:{},meta:{days:[{active:true}]},sessions:[]};
  h.ctx=vm.createContext({PROG:{days:[{ex:items}],weeks:[{sM:5,sA:4},{sM:5,sA:4},{sM:5,sA:4},{dl:true}]},cw:0,DAY_NAMES:['Day'],getProgramMetaV6:()=>h.meta,getHiddenEx:()=>h.hidden,getSetCounts:()=>h.extras,getSets:()=>h.sets,getCyc:()=>({num:1}),dayListFor:()=>h.items,window:{},getSessions:()=>h.sessions,getSwappedName:(k,n)=>n,getPain:()=>0,exStableId:n=>n,getCustomExercises:()=>[],EX_MAP:{Bench:{p:['Chest']},Disabled:{p:['Arms']},Row:{p:['Back']}},EXERCISE_DB:[]});
  h.run=s=>vm.runInContext(s,h.ctx);
  h.run(section(model,'// Get extra sets','// Ali so v danem dnevu'));
  // Execute the FINAL overrides, not the superseded original definitions.
  h.run(section(core,'const _nsfV5=nsf;','const _isExHiddenV5'));
  h.run(section(core,'  function targetSetsV14','  updateTabColors=function()'));
  h.run(section(analytics,'// GYM LOG','function renderSessHist'));
  h.run(section(analytics,'function calcVolumeThisWeek()','function renderVolumeView'));
  h.run(section(read('src/app/gym-session-core.js'),'function buildSessionSnapshot','function getSuggestedDayIndex'));
  h.run(section(read('src/app/workout-runtime.js'),'function getTonnageHistory','let tonnageChart'));
  return h;
}
const rows=n=>Array.from({length:n},()=>({done:true,kg:80,reps:8}));
test('final day completion and cards share 531 targets, including deload and set adjustments',()=>{
  const h=harness();
  for(const week of [0,3])for(const extra of [-2,-1,0,2]){
    const key=`c1w${week}d0e0`,expected=3+extra;
    h.extras[key]=extra;h.sets[key]=rows(expected);
    assert.equal(h.run(`nsf(0,0,PROG.weeks[${week}],'${key}')`),expected);
    assert.equal(h.run(`isDayComplete(1,${week},0)`),true);
    h.sets[key].pop();assert.equal(h.run(`isDayComplete(1,${week},0)`),false);
  }
});
test('disabled exercises between active exercises retain their indexes and cannot block the day checkmark',()=>{
  const h=harness([{n:'Bench',targetSets:1},{n:'Disabled',programDisabled:true,targetSets:12},{n:'Row',targetSets:1}]);
  h.sets.c1w0d0e0=rows(1);h.sets.c1w0d0e2=rows(1);
  const before=JSON.stringify(h.items);
  assert.equal(h.run('isDayComplete(1,0,0)'),true);
  assert.deepEqual(JSON.parse(h.run('JSON.stringify(activeWorkoutEntriesV19(1,0,0).map(e=>e.exerciseIndex))')),[0,2]);
  assert.equal(JSON.stringify(h.items),before);
  h.items[1].programDisabled=false;assert.equal(h.run('isDayComplete(1,0,0)'),false);
});
test('hidden exercises are excluded; empty, disabled and partial workouts never earn a checkmark',()=>{
  const h=harness([{n:'Bench',targetSets:2},{n:'Row',targetSets:4}]);
  h.hidden.c1w0d0e1=true;h.sets.c1w0d0e0=rows(2);
  assert.equal(h.run('isDayComplete(1,0,0)'),true);
  for(const incomplete of [[],rows(1),[...rows(1),{done:false}]]){
    h.sets.c1w0d0e0=incomplete;
    assert.equal(h.run('isDayComplete(1,0,0)'),false);
    assert.equal(h.run('allDone(0,0)'),false);
  }
  h.hidden.c1w0d0e0=true;assert.equal(h.run('isDayComplete(1,0,0)'),false);
  h.hidden={};h.items.forEach(e=>e.programDisabled=true);assert.equal(h.run('isDayComplete(1,0,0)'),false);
  h.items=[];assert.equal(h.run('isDayComplete(1,0,0)'),false);
});
test('inactive and deleted days cannot contribute completion, snapshots or current muscle stats',()=>{
  const h=harness();h.sets.c1w0d0e0=rows(3);
  for(const day of [{active:false},{deleted:true}]){
    h.meta.days[0]=day;
    assert.equal(h.run('isDayComplete(1,0,0)'),false);
    assert.equal(h.run('buildSessionSnapshot(1,0,0).exercises.length'),0);
    assert.equal(h.run('Object.keys(calcVolumeThisWeek()).length'),0);
  }
});
test('manual targets and deload agree in cards, day status and session snapshots',()=>{
  const h=harness([{n:'Bench',targetSets:5}]);
  for(const [week,count] of [[0,5],[3,3]]){
    h.sets[`c1w${week}d0e0`]=rows(count);
    assert.equal(h.run(`nsf(0,0,PROG.weeks[${week}],'c1w${week}d0e0')`),count);
    assert.equal(h.run(`isDayComplete(1,${week},0)`),true);
    assert.equal(h.run(`buildSessionSnapshot(1,${week},0).exercises[0].targetSets`),count);
  }
});
test('disabled/hidden rows do not leak into current stats or new session snapshots; stored rows remain intact',()=>{
  const h=harness([{n:'Bench',targetSets:1},{n:'Disabled',programDisabled:true},{n:'Row'}]);
  h.hidden.c1w0d0e2=true;
  h.sets={c1w0d0e0:rows(1),c1w0d0e1:rows(12),c1w0d0e2:rows(4)};
  const before=JSON.stringify(h.sets);
  assert.equal(h.run('buildSessionSnapshot(1,0,0).totals.doneSets'),1);
  assert.equal(h.run('buildSessionSnapshot(1,0,0).totals.tonnage'),640);
  assert.equal(h.run('JSON.stringify(calcVolumeThisWeek())'),'{"Chest":1}');
  assert.equal(h.run("sessionStatsV19({cycle:1,weekNum:1,dayIdx:0}).setCount"),1);
  assert.equal(JSON.stringify(h.sets),before);
});
test('history and tonnage use immutable snapshots even if the exercise is disabled today',()=>{
  const h=harness([{n:'Disabled',programDisabled:true}]);
  h.sessions=[{date:'2026-09-06',dayName:'Old day name',cycle:1,weekNum:1,exercises:[{name:'Disabled',sets:[...rows(2),{done:true,kg:20,reps:5,type:'warmup'}]}]}];
  h.sets.c1w0d0e0=rows(12);
  assert.equal(h.run('sessionStatsV19(getSessions()[0]).setCount'),2);
  assert.equal(h.run('getTonnageHistory()[0].tonnage'),1280);
});
test('surplus completed sets are labelled explicitly, not as an impossible-looking 3/1 fraction',()=>{
  const h=harness();
  assert.equal(h.run('completedSetLabelV19(3,1)'),'3 opravljenih · cilj 1');
  assert.equal(h.run('completedSetLabelV19(3,3)'),'3/3');
});
test('saving after reducing the target preserves surplus completed work, but not empty padding',()=>{
  const h=harness([{n:'Bench',targetSets:1}]);h.sets.c1w0d0e0=[...rows(3),{done:false},{done:false}];
  assert.equal(h.run('buildSessionSnapshot(1,0,0).totals.doneSets'),3);
  assert.equal(h.run('buildSessionSnapshot(1,0,0).totals.tonnage'),1920);
  assert.equal(h.run('buildSessionSnapshot(1,0,0).exercises[0].sets.length'),3);
});
test('snapshot planned sets do not depend on whether the exercise card was rendered first',()=>{
  const h=harness([{n:'Bench',targetSets:3}]);h.sets.c1w0d0e0=rows(1);
  assert.equal(h.run('buildSessionSnapshot(1,0,0).totals.sets'),3);
  assert.equal(h.run('buildSessionSnapshot(1,0,0).totals.doneSets'),1);
});
test('changing a set target immediately refreshes the day checkmark and cannot erase completed rows',()=>{
  const h=harness([{n:'Bench',targetSets:3}]);h.sets.c1w0d0e0=rows(2);
  let done=false,refreshes=0;
  Object.assign(h.ctx,{document:{getElementById:()=>null},saveSetCounts:s=>{h.extras=s;},saveSets:s=>{h.sets=s;},updateTabColors:()=>{done=h.run('isDayComplete(1,0,0)');refreshes++;},refreshGymTarget(){}});
  h.run(section(read('src/app/workout-runtime.js'),'function addSet(','function toggleSwap('));
  h.run("removeSet('c1w0d0e0',0,0,1)");assert.equal(done,true);assert.equal(refreshes,1);
  h.run("removeSet('c1w0d0e0',0,0,1)");assert.equal(h.sets.c1w0d0e0.length,2);assert.equal(refreshes,2);
  h.run("removeSet('c1w0d0e0',0,0,1)");assert.equal(h.extras.c1w0d0e0,-2);assert.equal(refreshes,2);
  h.run("addSet('c1w0d0e0',0,0,1)");assert.equal(done,true);
  h.run("addSet('c1w0d0e0',0,0,1)");assert.equal(done,false);assert.equal(refreshes,4);
});
test('measurements page and navigation are gone; old route opens bodyweight without deleting stored data',()=>{
  const html=read('index.html');
  assert.doesNotMatch(html,/id="page-body"|data-progress="body"|>Mere<|Telesne mere/);
  assert.match(html,/id="page-bodyweight"/);
  let savedRoute='',active=false;const ctx=vm.createContext({document:{getElementById:id=>id==='page-bodyweight'?{classList:{add(){active=true;}}}:null,querySelectorAll:()=>[],querySelector:()=>null,body:{dataset:{}}},window:{scrollTo(){}},safeSetRaw:(k,v)=>{assert.equal(k,'wt_last_page');savedRoute=v;},initBWGoal(){},renderBW(){},renderPhases(){}});
  vm.runInContext(section(read('src/app/ui-shell.js'),'function showProgressPage','function showPage')+read('src/app/ui-shell.js').slice(read('src/app/ui-shell.js').indexOf('function showPage')),ctx);
  vm.runInContext("showPage('body')",ctx);assert.equal(savedRoute,'bodyweight');assert.equal(active,true);
  const measCtx=vm.createContext({document:{getElementById:()=>null}});
  vm.runInContext(section(analytics,'function renderMeas()','function saveMeasurements')+'renderMeas();',measCtx);
});
