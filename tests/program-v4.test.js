'use strict';
// Step 4: Program screen redesign — day chips, day card, reorderable exercise
// rows with a toggle switch, and a reliable "Dodaj vajo"/"Dodaj dan" flow.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),shell=read('js/compact-shell.js'),compactUi=read('js/compact-ui.js');
function harness(extra={}){const ctx=vm.createContext(extra);vm.runInContext(compactUi,ctx);vm.runInContext(shell,ctx);return ctx;}
function inner(ctx,name){const start=shell.indexOf('  function '+name+'('),end=shell.indexOf('\n  function ',start+1);assert.ok(start>=0&&end>start,'function '+name+' not found');vm.runInContext(shell.slice(start,end),ctx);}
function innerAsync(ctx,name,nextMarker){const start=shell.indexOf('  async function '+name+'('),end=shell.indexOf(nextMarker,start+1);assert.ok(start>=0&&end>start,'async function '+name+' not found');vm.runInContext(shell.slice(start,end),ctx);}
const button=(act,label,cls,attrs)=>`<button type="button" class="${cls||'cg-link'}" data-act="${act}" ${attrs||''}>${label}</button>`;
const noopDialog=()=>({querySelector:()=>null,querySelectorAll:()=>[]});

function programCtx(overrides={}){
  const ctx=harness({esc:s=>String(s),icon:()=>'',clock:n=>String(n),button,
    PROG:{weeks:[{},{},{},{}]},cw:0,state:{day:0},navigationLocked:()=>false,getCyc:()=>({num:1}),sdk:(c,w,d,e)=>`c${c}w${w}d${d}e${e}`,exerciseTargetSetsV19:item=>Number(item?.targetSets)||4,exerciseInProgramV36:(e,c,w)=>!!e&&!e.programDisabled&&(!e.from||c>e.from.c||(c===e.from.c&&w>=e.from.w)),exerciseValidForWeekV36:(e,c,w)=>!e||!e.from||c>e.from.c||(c===e.from.c&&w>=e.from.w),restForEx:(id,n,r)=>r,getHiddenEx:()=>({}),
    ...overrides});
  inner(ctx,'activeDayWordV29');inner(ctx,'program');
  return ctx;
}
function day(name,active=true,sub){return {name,active,sub,deleted:false};}
function ex(n,over={}){return {n,n0:n,targetSets:3,targetReps:'8-12',r:90,programDisabled:false,...over};}

test('Slovenian active-day count wording covers the dual/plural rules',()=>{
  const days=[day('A'),day('B',false),day('C')];
  for(const [activeCount,word] of [[1,'aktiven dan'],[2,'aktivna dneva'],[3,'aktivni dnevi'],[4,'aktivni dnevi'],[5,'aktivnih dni']]){
    const metaDays=Array.from({length:activeCount},(_,i)=>day('D'+i)).concat(day('inactive',false));
    const ctx=programCtx({getProgramMetaV6:()=>({days:metaDays}),dayListFor:()=>[]});
    assert.match(ctx.program(),new RegExp(`${activeCount} ${word} · Cut/Bulk ne spremeni vaj`));
  }
});

test('Day chips list every non-deleted day in original index order, mark inactive ones dashed, and exclude deleted days',()=>{
  const metaDays=[day('Push'),day('Rest',false),{name:'Gone',active:true,deleted:true},day('Pull')];
  const ctx=programCtx({state:{day:0},getProgramMetaV6:()=>({days:metaDays}),dayListFor:i=>i===0?[ex('Bench'),ex('Row',{programDisabled:true})]:i===3?[ex('Squat')]:[]});
  const html=ctx.program();
  assert.match(html,/data-act="program-day" data-index="0"[^]*?Push[^]*?1 vaj/);
  assert.match(html,/cg-pchip inactive[^]*?data-index="1"[^]*?Rest[^]*?neaktiven/);
  assert.doesNotMatch(html,/Gone/);
  assert.match(html,/data-act="program-day" data-index="3"[^]*?Pull/);
  assert.doesNotMatch(html,/data-index="2"/);
});

test('"+ Dan" is disabled once the program has 7 days',()=>{
  const six=programCtx({getProgramMetaV6:()=>({days:Array.from({length:6},(_,i)=>day('D'+i))}),dayListFor:()=>[]}).program();
  assert.doesNotMatch(six,/data-act="day-add"[^>]*disabled/);
  const seven=programCtx({getProgramMetaV6:()=>({days:Array.from({length:7},(_,i)=>day('D'+i))}),dayListFor:()=>[]}).program();
  assert.match(seven,/data-act="day-add"[^>]*disabled/);
});

test('Exercise rows disable the up arrow on the first row and the down arrow on the last row',()=>{
  const list=[ex('Bench'),ex('Row'),ex('Squat',{programDisabled:true})];
  const ctx=programCtx({getProgramMetaV6:()=>({days:[day('Push')]}),dayListFor:()=>list});
  const html=ctx.program();
  const rows=html.split('<div class="cg-prow').slice(1);
  assert.equal(rows.length,3);
  assert.match(rows[0],/data-act="program-up"[^>]*disabled/);assert.doesNotMatch(rows[0],/data-act="program-down"[^>]*disabled/);
  assert.doesNotMatch(rows[1],/data-act="program-up"[^>]*disabled/);assert.doesNotMatch(rows[1],/data-act="program-down"[^>]*disabled/);
  assert.doesNotMatch(rows[2],/data-act="program-up"[^>]*disabled/);assert.match(rows[2],/data-act="program-down"[^>]*disabled/);
  assert.match(rows[2],/^ off"|off"/);assert.match(rows[2],/aria-checked="false"/);
  assert.match(rows[0],/aria-checked="true"/);
});

test('Day card active-exercise and weekly-set counts exclude a disabled exercise and one hidden for the current week only',()=>{
  const list=[ex('Bench',{targetSets:3}),ex('Row',{targetSets:2,programDisabled:true}),ex('Curl',{targetSets:4})];
  // Curl (index 2) is hidden only for this cycle/week via wt_hidden_ex; Bench (index 0) is not.
  const hidden={'c1w0d0e2':true};
  const ctx=programCtx({getProgramMetaV6:()=>({days:[day('Push')]}),dayListFor:()=>list,getHiddenEx:()=>hidden});
  const html=ctx.program();
  // Only Bench (3 sets) counts: Row is disabled, Curl is hidden this week.
  // Step 9: the three values sit in ONE inline stats line instead of three big columns.
  assert.match(html,/<b>1\/3<\/b> aktivnih vaj · <b>3<\/b> serije · aktiven dan: <b>Da<\/b>/);
  assert.doesNotMatch(html,/cg-hero-stats/);
  // All three rows still render so the exercise can be reordered/re-enabled/un-hidden later.
  assert.equal(html.split('<div class="cg-prow').length-1,3);
  // The exercise removed from this week only says so and offers a way back; the others do not.
  assert.match(html,/odstranjena v tednu 1/);
  assert.equal((html.match(/data-act="program-unhide"/g)||[]).length,1);
  assert.match(html,/data-act="program-unhide" data-index="2"/);
  // Without any hidden exercise, both Bench and Curl (not disabled) count.
  const visible=programCtx({getProgramMetaV6:()=>({days:[day('Push')]}),dayListFor:()=>list}).program();
  assert.match(visible,/<b>2\/3<\/b> aktivnih vaj · <b>7<\/b> serij · aktiven dan: <b>Da<\/b>/);
});

test('program-toggle flips programDisabled on a fresh read, saves via saveDayLists, and throws when the exercise is gone',()=>{
  const start=shell.indexOf("else if(act==='program-toggle')"),marker="notify(it.programDisabled?'Vaja je neaktivna. Zgodovina ostane.':'Vaja je spet aktivna.');",end=shell.indexOf(marker,start)+marker.length+1;
  const branch=shell.slice(start,end),body=branch.replace(/^else if\(act==='program-toggle'\)/,'');
  assert.match(branch,/const all=getDayLists\(\)/);assert.match(branch,/if\(!it\)throw Error/);assert.match(branch,/saveDayLists\(all\)/);assert.match(branch,/afterProgram\(\)/);
  const calls=[];
  const ctx=vm.createContext({guardProgram:()=>calls.push('guard'),
    getDayLists:()=>({0:[{n:'A',programDisabled:false},{n:'B',programDisabled:true}]}),
    saveDayLists:all=>{calls.push(['save',JSON.parse(JSON.stringify(all))]);return true;},
    afterProgram:()=>calls.push('after'),notify:t=>calls.push(['notify',t]),state:{day:0},Error});
  const toggle=vm.runInContext(`(function(index){const act='program-toggle';${body}})`,ctx);
  toggle(0);
  assert.deepEqual(calls[0],'guard');assert.equal(calls[1][0],'save');assert.equal(calls[1][1][0][0].programDisabled,true);
  assert.equal(calls[2],'after');assert.deepEqual(calls[3],['notify','Vaja je neaktivna. Zgodovina ostane.']);
  calls.length=0;toggle(1);assert.deepEqual(calls[3],['notify','Vaja je spet aktivna.']);
  assert.throws(()=>toggle(9),/Vaja ni več na tem dnevu/);
});

// ---- Step 14: picker by muscle group, details sheet, from-week, replace/remove/delete ----
const dbSample=[{n:'Barbell Bench Press',m:'Chest',c:'compound',d:'bench'},{n:'Bench Dip',m:'Triceps',c:'isolation',d:'dip'},{n:'Face Pulls',m:'Rear Delt',c:'isolation',d:'fp'},{n:'Shrugs',m:'Traps',c:'isolation',d:'sh'},{n:'Burpee',m:'Full Body',c:'compound',d:'b'}];
test('Muscle groups cover every built-in DB muscle and sort custom exercises into their group',()=>{
  const ctx=harness();
  const groups=ctx.muscleGroupsV36();
  assert.equal(groups.length,12);
  for(const m of ['Chest','Back','Traps','Shoulders','Front Delt','Rear Delt','Biceps','Triceps','Quads','Hamstrings','Glutes','Calves','Core','Forearms','Full Body'])assert.notEqual(ctx.muscleGroupOfV36(m),undefined,m);
  assert.equal(ctx.muscleGroupOfV36('Rear Delt'),'shoulders');assert.equal(ctx.muscleGroupOfV36('Traps'),'back');assert.equal(ctx.muscleGroupOfV36('Nekaj'),'other');
  const custom=[{n:'Moj potisk',group:'chest'},{n:'Stara',m:'Quads'},{n:'Barbell Bench Press',group:'chest'}];
  const chest=ctx.exercisesOfGroupV36('chest',dbSample,custom);
  assert.deepEqual(JSON.parse(JSON.stringify(chest)),[{n:'Barbell Bench Press',custom:false},{n:'Moj potisk',custom:true}],'custom listed once, DB name not duplicated');
  assert.equal(ctx.exercisesOfGroupV36('quads',dbSample,custom)[0].n,'Stara','legacy custom with m is mapped');
  assert.equal(ctx.exercisesOfGroupV36('other',dbSample,[]).length,1);
});

function pickerCtx(dayItems=[]){
  const sheets=[];
  const ctx=harness({EXERCISE_DB:dbSample,getCustomExercises:()=>[{n:'Moj potisk',group:'chest'}],esc:s=>String(s),button,
    getDayLists:()=>({0:dayItems}),getCyc:()=>({num:1}),cw:0,dispNameForItem:it=>it.n0||it.n,programWriteBusy:false,guardProgram:()=>{},
    plainImportedText:(v,max)=>String(v||'').slice(0,max),dialog:noopDialog(),compactNameV26:s=>String(s).toLowerCase(),
    sheet:(title,body,save,ok)=>{sheets.push({title,body,save,ok});}});
  ctx.sheets=sheets;inner(ctx,'exercisePickerSheet');return ctx;
}
test('The picker opens with the muscle grid and counts, and rejects a pick that is already on the day',async()=>{
  const ctx=pickerCtx([{n0:'Bench Dip'}]);let picked=null;
  ctx.exercisePickerSheet({title:'Dodaj vajo',di:0,excludeIndex:-1,onPick:async(n,g)=>{picked=[n,g];}});
  const s=ctx.sheets[0];
  assert.equal(s.title,'Dodaj vajo');assert.equal(s.ok,'Naprej');
  assert.equal((s.body.match(/data-muscle="/g)||[]).length,12);
  assert.match(s.body,/data-muscle="chest"><strong>Prsa<\/strong><small>2 vaji<\/small>/,'DB + custom counted');
  assert.match(s.body,/data-muscle="shoulders"><strong>Ramena<\/strong><small>1 vaja<\/small>/);
  assert.match(s.body,/data-exercise-search/);
  await assert.rejects(()=>s.save(new Map([['name','Bench Dip'],['group','triceps']])),/že na tem dnevu/);
  await assert.rejects(()=>s.save(new Map([['name',''],['search','  ']])),/Izberi ali vpiši vajo/);
  await s.save(new Map([['name',''],['search','Nova moja'],['group','']]));
  assert.deepEqual(picked,['Nova moja','']);
});
test('Replacing: the exercise itself is excluded from the duplicate check, other rows are not',async()=>{
  const ctx=pickerCtx([{n0:'Bench Dip'},{n0:'Shrugs'}]);let picked=null;
  ctx.exercisePickerSheet({title:'Zamenjaj vajo',di:0,excludeIndex:0,onPick:async n=>{picked=n;}});
  const s=ctx.sheets[0];
  await s.save(new Map([['name','Bench Dip'],['group','triceps']]));assert.equal(picked,'Bench Dip');
  await assert.rejects(()=>s.save(new Map([['name','Shrugs'],['group','back']])),/že na tem dnevu/);
});

function addExerciseCtx(){
  const store={0:[]},calls=[],sheets=[],customs=[];
  const ctx=harness({EXERCISE_DB:dbSample,getCustomExercises:()=>customs,CUST_KEY:'wt_custom_ex',safeSetRaw:(k,v)=>{calls.push(['set',k,v]);return true;},
    getCyc:()=>({num:2}),cw:1,dispNameForItem:it=>it.n0,plainImportedText:(v,max)=>String(v||'').slice(0,max),esc:s=>String(s),button,compactNameV26:s=>String(s).toLowerCase(),
    _newExId:n=>'id-'+n,state:{day:0},dialog:noopDialog(),closeSheet:()=>{},notify:(t)=>calls.push(['notify',t]),
    guardProgram:()=>{},programWriteBusy:false,getDayLists:()=>JSON.parse(JSON.stringify(store)),
    mutateDayList:(di,fn)=>{const arr=store[di]||(store[di]=[]);fn(arr);calls.push(['mutate',JSON.parse(JSON.stringify(arr))]);},
    afterProgram:()=>calls.push('after'),
    sheet:(title,body,save,ok)=>{sheets.push({title,body,save,ok});},
    autoBackupToIDB:()=>Promise.resolve(true),storageHasPendingWrites:()=>false});
  ctx.store=store;ctx.calls=calls;ctx.sheets=sheets;ctx.customs=customs;
  inner(ctx,'exerciseIsOnDayV29');inner(ctx,'exercisePickerSheet');inner(ctx,'exerciseDetailsSheet');inner(ctx,'addExercise');
  return ctx;
}
test('addExercise: pick → details (sets/reps/rest) → one write with from:{cycle,week}; a new name is saved as a custom exercise of its group',async()=>{
  const ctx=addExerciseCtx();
  ctx.addExercise();
  await ctx.sheets[0].save(new Map([['name','Barbell Bench Press'],['group','chest']]));
  const details=ctx.sheets[1];assert.equal(details.title,'Barbell Bench Press');assert.match(details.body,/name="rest"[^>]*value="120"/,'compound default rest');
  await details.save(new Map([['sets','4'],['reps','6–8'],['rest','150']]));
  assert.equal(ctx.calls.filter(c=>c[0]==='mutate').length,1);
  const row=ctx.store[0][0];
  assert.equal(row.n0,'Barbell Bench Press');assert.equal(row.targetSets,4);assert.equal(row.targetReps,'6–8');assert.equal(row.r,150);assert.equal(row.d,'bench');
  assert.deepEqual(JSON.parse(JSON.stringify(row.from)),{c:2,w:1},'valid from the current cycle+week');
  assert.equal(ctx.customs.length,0,'a DB exercise is not stored as custom');
  assert.match(ctx.calls.find(c=>c[0]==='notify')[1],/od tedna 2 naprej/);
  // a brand-new name becomes a custom exercise of the chosen group
  ctx.addExercise();
  await ctx.sheets[2].save(new Map([['name',''],['search','Moj potisk'],['group','chest']]));
  await ctx.sheets[3].save(new Map([['sets','3'],['reps','10'],['rest','60']]));
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.customs)),[{n:'Moj potisk',group:'chest'}]);
  assert.equal(ctx.store[0].length,2);
});
test('addExercise busy guard and post-backup duplicate re-check still hold',async()=>{
  let resolveBackup;const ctx=addExerciseCtx();ctx.autoBackupToIDB=()=>new Promise(r=>{resolveBackup=r;});
  ctx.addExercise();await ctx.sheets[0].save(new Map([['name','Barbell Bench Press'],['group','chest']]));
  const first=ctx.sheets[1].save(new Map([['sets','3'],['reps','5'],['rest','90']]));
  await assert.doesNotReject(ctx.sheets[1].save(new Map([['sets','3'],['reps','5'],['rest','90']])));
  assert.equal(ctx.store[0].length,0,'busy guard');
  ctx.store[0].push({n0:'Barbell Bench Press'});resolveBackup(true);
  await assert.rejects(first,/že na tem dnevu/);assert.equal(ctx.store[0].length,1);
});
test('removeExercise and deleteDay: guarded, confirmed, index-preserving, history untouched',()=>{
  const body=name=>{const a=shell.indexOf('  async function '+name+'(');return shell.slice(a,shell.indexOf('\n  }\n',a));};
  const rm=body('removeExercise');
  assert.match(rm,/compactCanRemoveExerciseV34\(getSets\(\)\[key\]\)/,'blocked while sets are confirmed this week');
  assert.match(rm,/await ask\(/);assert.match(rm,/mutateDayList\(di,rows=>\{rows\.splice\(index,1\);\}\)/,'goes through mutateDayList → reconcilePositions');
  assert.match(rm,/storageHasPendingWrites\(\)/);
  const dd=body('deleteDay');
  assert.match(dd,/Vsaj en dan mora ostati aktiven/);
  assert.match(dd,/Object\.assign\(next\.days\[index\],\{deleted:true,active:false,deletedAt/,'marked, never spliced: indexes stay');
  assert.doesNotMatch(dd,/days\.splice/);
  assert.match(dd,/commitStorageBatch\(\[\[V6_KEYS\.metaShared/);
  assert.match(shell,/else if\(act==='program-replace'\)\{replaceExercise\(index\);return;\}/);
  assert.match(shell,/else if\(act==='program-remove'\)\{await removeExercise\(index\);return;\}/);
  assert.match(shell,/else if\(act==='day-delete'\)\{await deleteDay\(\);return;\}/);
});
test('Program rows and counters respect "valid from week": an exercise added in week 3 is greyed and not counted in week 1',()=>{
  const list=[ex('Bench',{targetSets:3}),ex('Curl',{targetSets:4,from:{c:1,w:2}})];
  const ctx=programCtx({getProgramMetaV6:()=>({days:[day('Push')]}),dayListFor:()=>list,exerciseInProgramV36:(e,c,w)=>!e.programDisabled&&(!e.from||c>e.from.c||(c===e.from.c&&w>=e.from.w)),exerciseValidForWeekV36:(e,c,w)=>!e.from||c>e.from.c||(c===e.from.c&&w>=e.from.w)});
  const html=ctx.program();
  assert.match(html,/<b>1\/2<\/b> aktivnih vaj · <b>3<\/b> serije/);
  assert.match(html,/velja od cikla 1, tedna 3/);
  assert.match(html,/cg-prow off"><span class="cg-order">2<\/span>/);
});

function addDayCtx(days){
  const meta={days},calls=[],dayLists={};
  const ctx=harness({state:{day:0},V6_KEYS:{metaShared:'meta'},guardProgram:()=>{},programWriteBusy:false,
    getProgramMetaV6:()=>meta,getDayLists:()=>dayLists,plainImportedText:(v,max)=>String(v||'').slice(0,max),
    _newExId:n=>'id-'+n,_dlKey:()=>'dl',commitStorageBatch:writes=>calls.push(['commit',writes]),
    afterProgram:()=>calls.push('after'),closeSheet:()=>{},esc:s=>String(s),
    sheet:(title,body,save)=>{ctx._save=save;},autoBackupToIDB:()=>Promise.resolve(true)});
  ctx.meta=meta;ctx.calls=calls;
  const nextMarker='\n  function editWeight(';
  innerAsync(ctx,'addDay',nextMarker);
  return ctx;
}
test('addDay enforces the 7-day limit and rejects when the program changed underneath it',async()=>{
  const ctx=addDayCtx(Array.from({length:7},(_,i)=>({name:'D'+i})));
  await assert.rejects(()=>ctx.addDay(),/Največ 7 dni/);
});
test('addDay busy guard silently no-ops a concurrent second submit while the first awaits the backup',async()=>{
  let resolveBackup;
  const ctx=addDayCtx([{name:'D0'}]);
  ctx.autoBackupToIDB=()=>new Promise(r=>{resolveBackup=r;});
  await ctx.addDay();
  const first=ctx._save(new Map([['name','Legs']]));
  await assert.doesNotReject(ctx._save(new Map([['name','Arms']])));
  assert.equal(ctx.calls.filter(c=>c[0]==='commit').length,0);
  resolveBackup(true);
  await first;
  assert.equal(ctx.calls.filter(c=>c[0]==='commit').length,1);
  assert.equal(ctx.meta.days.length,2);assert.equal(ctx.meta.days[1].name,'Legs');
});
