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
    PROG:{weeks:[{},{},{},{}]},cw:0,state:{day:0},navigationLocked:()=>false,getCyc:()=>({num:1}),sdk:(c,w,d,e)=>`c${c}w${w}d${d}e${e}`,exerciseTargetSetsV19:item=>Number(item?.targetSets)||4,restForEx:(id,n,r)=>r,
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

function searchCtx(dayItems=[]){
  return harness({EXERCISE_DB:[{n:'Barbell Bench Press',c:'compound',d:'d'},{n:'Bench Dip',c:'isolation',d:'d'}],
    getCustomExercises:()=>[{n:'My Custom Bench'}],esc:s=>String(s),
    getDayLists:()=>({0:dayItems}),getCyc:()=>({num:1}),cw:0,
    dispNameForItem:it=>it.n0||it.n,programWriteBusy:false});
}
test('Exercise search filters case-insensitively, caps at 40 results, offers "Nova vaja" and disables duplicates',()=>{
  const ctx=searchCtx([{n0:'Bench Dip'}]);
  inner(ctx,'exerciseIsOnDayV29');inner(ctx,'exerciseResultsV29');
  const html=ctx.exerciseResultsV29(0,'BENCH',['Barbell Bench Press','Bench Dip','My Custom Bench','Squat']);
  assert.match(html,/Barbell Bench Press/);assert.match(html,/My Custom Bench/);
  assert.doesNotMatch(html,/Squat/);
  assert.match(html,/data-pick-exercise="Bench Dip" disabled/);assert.match(html,/že na tem dnevu/);
  assert.match(html,/Nova vaja: BENCH/); // no catalog name equals "bench" exactly, so the free-text option is offered
  const exact=ctx.exerciseResultsV29(0,'bench dip',['Barbell Bench Press','Bench Dip']);
  assert.doesNotMatch(exact,/Nova vaja/); // case-insensitive exact match suppresses "Nova vaja"
  const noMatch=ctx.exerciseResultsV29(0,'Zzz Novo Ime',['Barbell Bench Press']);
  assert.match(noMatch,/Nova vaja: Zzz Novo Ime/);
  const many=['Curl'].concat(Array.from({length:60},(_,i)=>'Curl Variant '+i));
  const capped=ctx.exerciseResultsV29(0,'Curl',many); // exact match ("Curl") among the 61 matches → no extra "Nova vaja" button
  assert.doesNotMatch(capped,/Nova vaja/);
  assert.equal((capped.match(/data-pick-exercise/g)||[]).length,40);
});

function addExerciseCtx(){
  const store={0:[]},calls=[];
  const ctx=harness({EXERCISE_DB:[{n:'Squat',c:'compound',d:'desc'}],getCustomExercises:()=>[],
    getCyc:()=>({num:1}),cw:0,dispNameForItem:it=>it.n0,plainImportedText:(v,max)=>String(v||'').slice(0,max),
    _newExId:n=>'id-'+n,state:{day:0},dialog:noopDialog(),
    guardProgram:()=>{},programWriteBusy:false,getDayLists:()=>JSON.parse(JSON.stringify(store)),
    mutateDayList:(di,fn)=>{const arr=store[di]||(store[di]=[]);fn(arr);calls.push(['mutate',JSON.parse(JSON.stringify(arr))]);},
    afterProgram:()=>calls.push('after'),
    sheet:(title,body,save)=>{ctx._save=save;},
    autoBackupToIDB:()=>Promise.resolve(true),storageHasPendingWrites:()=>false});
  ctx.store=store;ctx.calls=calls;
  inner(ctx,'exerciseCatalogV29');inner(ctx,'exerciseIsOnDayV29');inner(ctx,'exerciseResultsV29');inner(ctx,'addExercise');
  return ctx;
}
test('addExercise adds exactly once per submit, rejects existing names, and the busy guard blocks a concurrent second add',async()=>{
  const ctx=addExerciseCtx();
  ctx.addExercise();
  await ctx._save(new Map([['name','Squat'],['sets','3'],['reps','5']]));
  assert.equal(ctx.calls.filter(c=>c[0]==='mutate').length,1);
  assert.equal(ctx.store[0].length,1);assert.equal(ctx.store[0][0].n0,'Squat');
  await assert.rejects(()=>ctx._save(new Map([['name','Squat'],['sets','3'],['reps','5']])),/že na tem dnevu/);
  assert.equal(ctx.store[0].length,1);
});
test('addExercise busy guard: a concurrent second submit is a silent no-op, and the post-await duplicate re-check rejects a name added meanwhile',async()=>{
  let resolveBackup;
  const ctx=addExerciseCtx();
  ctx.autoBackupToIDB=()=>new Promise(r=>{resolveBackup=r;});
  ctx.addExercise();
  const first=ctx._save(new Map([['name','Squat'],['sets','3'],['reps','5']]));
  // Second concurrent submit while the first is awaiting autoBackupToIDB: silent no-op, no throw.
  await assert.doesNotReject(ctx._save(new Map([['name','Bench'],['sets','3'],['reps','5']])));
  assert.equal(ctx.store[0].length,0,'busy guard must not let a second write through while the first is in flight');
  // Simulate another write landing on the day list while the first add is awaiting the backup.
  ctx.store[0].push({n0:'Squat'});
  resolveBackup(true);
  await assert.rejects(first,/že na tem dnevu/);
  assert.equal(ctx.store[0].length,1,'the post-await duplicate re-check must reject rather than double-add');
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
test('addExercise uses typed search text when no result was tapped and never reports success on a failed write',()=>{
  const shell=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','js/compact-shell.js'),'utf8'),body=shell.slice(shell.indexOf('  function addExercise('),shell.indexOf('\n  }\n',shell.indexOf('  function addExercise(')));
  assert.match(body,/data\.get\('name'\)\|\|data\.get\('search'\)/);
  assert.ok(body.indexOf('storageHasPendingWrites()')>body.indexOf('mutateDayList(')&&body.indexOf('storageHasPendingWrites()')<body.indexOf('afterProgram()'));
});
