'use strict';
// Step 16: adding an exercise while a workout is running (Trening list button
// and the Focus ⋯ menu) with the scope "samo ta trening" (from+until on the
// current week) or "v program od tedna naprej". Synthetic data only.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),shell=read('js/compact-shell.js'),model=read('src/app/workout-model.js');
const modelWeek=model.slice(model.indexOf('function exerciseValidForWeekV36('),model.indexOf('function activeWorkoutEntriesV19('));
function harness(extra={}){const ctx=vm.createContext(extra);vm.runInContext(modelWeek,ctx);vm.runInContext(shell,ctx);return ctx;}
function inner(ctx,name){const start=shell.indexOf('  function '+name+'('),end=shell.indexOf('\n  function ',start+1);assert.ok(start>=0&&end>start,'function '+name+' not found');vm.runInContext(shell.slice(start,end),ctx);}
const button=(act,label,cls,attrs)=>`<button type="button" class="${cls||'cg-link'}" data-act="${act}" ${attrs||''}>${label}</button>`;
const noopDialog=()=>({querySelector:()=>null,querySelectorAll:()=>[]});
const dbSample=[{n:'Barbell Bench Press',m:'Chest',c:'compound',d:'bench'},{n:'Plank',m:'Core',c:'isolation',d:'plank'}];

test('until:{c,w} ends validity; from+until on one week means "samo ta trening"',()=>{
  const ctx=vm.createContext({});vm.runInContext(modelWeek,ctx);
  const v=ctx.exerciseValidForWeekV36,once=ctx.exerciseOnlyOneWeekV38,passed=ctx.exerciseUntilPassedV38,reached=ctx.exerciseFromReachedV38;
  const one={from:{c:1,w:1},until:{c:1,w:1}};
  assert.equal(v(one,1,0),false);assert.equal(v(one,1,1),true);assert.equal(v(one,1,2),false);assert.equal(v(one,2,1),false);
  assert.equal(once(one),true);assert.equal(once({from:{c:1,w:1}}),false);assert.equal(once({from:{c:1,w:1},until:{c:1,w:3}}),false);
  assert.equal(v({until:{c:1,w:2}},1,2),true);assert.equal(v({until:{c:1,w:2}},1,3),false);assert.equal(v({until:{c:1,w:2}},2,0),false);
  assert.equal(passed({until:{c:'1',w:'2'}},1,3),true,'strings from JSON');assert.equal(passed({until:{c:'x'}},9,9),false,'garbage never restricts');
  assert.equal(reached({from:{c:2,w:0}},1,3),false);assert.equal(reached({},1,0),true);
  assert.equal(ctx.exerciseInProgramV36({...one,programDisabled:true},1,1),false);
});

function detailsCtx(){const sheets=[];const ctx=harness({EXERCISE_DB:dbSample,esc:s=>String(s),plainImportedText:(v,max)=>String(v||'').slice(0,max),sheet:(title,body,save,ok)=>{sheets.push({title,body,save,ok});}});ctx.sheets=sheets;inner(ctx,'exerciseDetailsSheet');return ctx;}
test('the details sheet offers the scope choice only when asked, with "samo ta trening" preselected',async()=>{
  const ctx=detailsCtx();let got=null;
  ctx.exerciseDetailsSheet('Plank','core',async o=>{got=o;},{week:3});
  const s=ctx.sheets[0];
  assert.match(s.body,/<fieldset class="cg-scope"><legend>Kje velja<\/legend>/);
  assert.match(s.body,/<input type="radio" name="scope" value="once" checked><span><strong>Samo ta trening<\/strong><small>Teden 3\. V drugih tednih je ni\.<\/small>/);
  assert.match(s.body,/<input type="radio" name="scope" value="program"><span><strong>V program od tedna 3 naprej<\/strong>/);
  await s.save(new Map([['sets','2'],['reps','60 s'],['rest','45']]));
  assert.equal(got.scope,'once','no radio value in the form data = once');
  await s.save(new Map([['sets','2'],['reps','60 s'],['rest','45'],['scope','program']]));
  assert.equal(got.scope,'program');
  ctx.exerciseDetailsSheet('Plank','core',async o=>{got=o;});
  assert.doesNotMatch(ctx.sheets[1].body,/cg-scope/);
  await ctx.sheets[1].save(new Map([['sets','3'],['reps','10'],['rest','60']]));assert.equal(got.scope,'');
});

function workoutCtx(over={}){
  const store={0:[]},calls=[],sheets=[],customs=[];
  const ctx=harness({EXERCISE_DB:dbSample,getCustomExercises:()=>customs,CUST_KEY:'wt_custom_ex',safeSetRaw:(k,v)=>{calls.push(['set',k,v]);return true;},
    getCyc:()=>({num:1}),cw:2,cd:0,dispNameForItem:it=>it.n0,plainImportedText:(v,max)=>String(v||'').slice(0,max),esc:s=>String(s),button,compactNameV26:s=>String(s).toLowerCase(),
    _newExId:n=>'id-'+n,state:{focus:false,openRow:''},dialog:noopDialog(),closeSheet:()=>{},notify:t=>calls.push(['notify',t]),
    guardProgram:()=>{throw Error('guardProgram must not block adding during a workout');},window:{v6RecoveryPending:false},
    getProgramMetaV6:()=>({days:[{name:'Push',active:true}]}),programWriteBusy:false,getDayLists:()=>JSON.parse(JSON.stringify(store)),
    mutateDayList:(di,fn)=>{const arr=store[di]||(store[di]=[]);fn(arr);calls.push(['mutate',JSON.parse(JSON.stringify(arr))]);},
    showDay:i=>calls.push(['showDay',i]),currentRows:()=>store[0].map((it,ei)=>({key:'c1w2d0e'+ei,ei,item:it})),
    sheet:(title,body,save,ok)=>{sheets.push({title,body,save,ok});},autoBackupToIDB:()=>Promise.resolve(true),storageHasPendingWrites:()=>false,...over});
  ctx.store=store;ctx.calls=calls;ctx.sheets=sheets;ctx.customs=customs;
  for(const n of ['exerciseIsOnDayV29','saveCustomExerciseV38','exercisePickerSheet','exerciseDetailsSheet','guardWorkoutAdd','addExerciseToWorkout'])inner(ctx,n);
  return ctx;
}
test('adding during a workout: picker → details with scope → one appended row; "samo ta trening" carries from+until on this week',async()=>{
  const ctx=workoutCtx();
  ctx.addExerciseToWorkout();
  assert.equal(ctx.sheets[0].title,'Dodaj vajo v trening');
  await ctx.sheets[0].save(new Map([['name','Plank'],['group','core']]));
  assert.match(ctx.sheets[1].body,/name="scope" value="once" checked/);
  await ctx.sheets[1].save(new Map([['sets','2'],['reps','45 s'],['rest','30']]));
  const row=ctx.store[0][0];
  assert.equal(row.n0,'Plank');assert.equal(row.targetSets,2);assert.equal(row.r,30);
  assert.equal(JSON.stringify(row.from),'{"c":1,"w":2}');assert.equal(JSON.stringify(row.until),'{"c":1,"w":2}');
  assert.equal(ctx.calls.filter(c=>c[0]==='mutate').length,1);
  assert.ok(ctx.calls.some(c=>c[0]==='showDay'),'re-rendered through showDay, not afterProgram (which would clear the set draft)');
  assert.deepEqual(ctx.calls.find(c=>c[0]==='notify').slice(1),['»Plank« dodana na konec tega treninga.']);
  assert.equal(ctx.state.openRow,'c1w2d0e0','opened because nothing else was open');
  assert.equal(ctx.customs.length,0);
});
test('scope "program" writes from only; a new name becomes a custom exercise; an open row stays open',async()=>{
  const ctx=workoutCtx({state:{focus:false,openRow:'c1w2d0e9'}});
  ctx.addExerciseToWorkout();
  await ctx.sheets[0].save(new Map([['name',''],['search','Moj plank'],['group','core']]));
  await ctx.sheets[1].save(new Map([['sets','3'],['reps','10'],['rest','60'],['scope','program']]));
  const row=ctx.store[0][0];
  assert.equal(JSON.stringify(row.from),'{"c":1,"w":2}');assert.equal(row.until,undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.customs)),[{n:'Moj plank',group:'core'}]);
  assert.deepEqual(ctx.calls.find(c=>c[0]==='notify').slice(1),['»Moj plank« dodana v program od tedna 3 naprej.']);
  assert.equal(ctx.state.openRow,'c1w2d0e9');
});
test('blocked while a recovery dialog is pending or the day is inactive; an expired "samo ta trening" row does not count as a duplicate',async()=>{
  const pending=workoutCtx({window:{v6RecoveryPending:true}});
  assert.throws(()=>pending.addExerciseToWorkout(),/Najprej nadaljuj ali zavrzi najdeni trening/);
  const inactive=workoutCtx({getProgramMetaV6:()=>({days:[{name:'Push',active:false}]})});
  assert.throws(()=>inactive.addExerciseToWorkout(),/Ta dan ni aktiven/);
  const ctx=workoutCtx();
  ctx.store[0].push({id:'old',n0:'Plank',from:{c:1,w:0},until:{c:1,w:0}},{id:'cur',n0:'Barbell Bench Press',from:{c:1,w:1}});
  ctx.addExerciseToWorkout();
  await assert.rejects(()=>ctx.sheets[0].save(new Map([['name','Barbell Bench Press'],['group','chest']])),/že na tem dnevu/);
  await ctx.sheets[0].save(new Map([['name','Plank'],['group','core']]));
  await ctx.sheets[1].save(new Map([['sets','2'],['reps','45 s'],['rest','30']]));
  assert.equal(ctx.store[0].length,3,'Plank from week 1 expired, so it can be added again this week');
  assert.equal(JSON.stringify(ctx.store[0][2].until),'{"c":1,"w":2}');
});
test('entry points: "+ Dodaj vajo" on the Trening list (Program link only when unlocked), "Dodaj vajo v ta trening" in the Focus menu, Program row labels',()=>{
  assert.match(shell,/<div class="cg-workout-actions\$\{navigationLocked\(\)\?'':' two'\}">\$\{button\('workout-add','\+ Dodaj vajo','cg-add'\)\}\$\{navigationLocked\(\)\?'':button\('program-current','Uredi vaje tega dne','cg-add'\)\}<\/div>/);
  assert.match(shell,/\$\{item\('exercise-add','Dodaj vajo v ta trening','Na konec treninga\. Samo danes ali v program\.'\)\}/);
  assert.match(shell,/else if\(act==='exercise-add'\|\|act==='workout-add'\)\{addExerciseToWorkout\(\);return;\}/);
  assert.match(shell,/when=once\?\(notYet\|\|expired\?` · samo v ciklu \$\{e\.from\.c\}, tednu \$\{Number\(e\.from\.w\)\+1\}`:' · samo ta teden'\):notYet\?` · velja od cikla/);
  assert.match(shell,/expired\?` · veljala do cikla \$\{e\.until\.c\}, tedna \$\{Number\(e\.until\.w\)\+1\}`:''/);
  assert.match(shell,/<div class="cg-prow\$\{off\|\|notYet\|\|expired\?' off':''\}">/);
  const css=read('css/compact-v4.css');
  assert.match(css,/#cg-app \.cg-workout-actions\.two\{grid-template-columns:1fr 1fr;\}/);
  assert.match(css,/#cg-app \.cg-choice:has\(input:checked\)\{border-color:var\(--cg-accent\)/);
  const start=shell.indexOf('  function addExerciseToWorkout('),body=shell.slice(start,shell.indexOf('\n  }\n',start));
  assert.doesNotMatch(body,/draft\.clear|afterProgram\(|guardProgram\(/,'never wipes the current set draft or blocks on a running workout');
  assert.match(body,/mutateDayList\(di,rows=>\{index=rows\.push\(/,'appended: saved set keys never move');
});
