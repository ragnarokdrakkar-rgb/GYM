const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/compact-ui.js'),'utf8'),ctx=vm.createContext({});vm.runInContext(source,ctx);
const plain=v=>JSON.parse(JSON.stringify(v));
test('Workout colors are stable, distinct for standard days, independent of theme',()=>{
  const names=['Push A','Pull A','Noge','Push B','Pull B'];assert.equal(new Set(names.map(n=>ctx.compactDayColorV26(n))).size,5);
  assert.equal(ctx.compactDayColorV26(' Push   A '),ctx.compactDayColorV26('push a'));assert.equal(ctx.compactDayColorV26('Custom'),ctx.compactDayColorV26('Custom'));
});
test('Strength only lists active roster exercises and active nondeleted days',()=>{
  const active=ctx.compactActiveExercisesV26({days:[{name:'Push'},{name:'Pull'},{active:false},{deleted:true}]},{0:[{n:'Bench'},{n:'Hidden',programDisabled:true}],1:[{n:' bench '},{n:'Row'}],2:[{n:'No'}],3:[{n:'Deleted'}]});
  assert.deepEqual(plain(active).map(e=>[e.key,e.days]),[['bench',['Push','Pull']],['row',['Pull']]]);
});
test('Strength graph uses exact exercise, actual kg and done working sets, never PR estimates or planned rows',()=>{
  const sessions=[{date:'2026-09-12',exercises:[{name:'Bench',sets:[{kg:100,reps:5,done:true},{kg:110,reps:3,done:true},{kg:500,reps:9,done:false},{kg:200,reps:1,done:true,warm:true}]},{name:'Incline bench',sets:[{kg:300,reps:5,done:true}]}]},{date:'2026-09-01',exercises:[{name:'Bench',sets:[{kg:95,reps:6,done:true}]}]}];
  const before=JSON.stringify(sessions),result=ctx.compactStrengthSeriesV26(sessions,'bench');assert.deepEqual(plain(result).map(p=>[p.date,p.kg,p.reps]),[['2026-09-01',95,6],['2026-09-12',110,3]]);assert.equal(result[1].volume,830);assert.equal(JSON.stringify(sessions),before);
});
test('New exercise without history has no invented graph data',()=>assert.equal(ctx.compactStrengthSeriesV26([],'new').length,0));
test('Plan edits preserve completed data and do not mark future sets done',()=>{
  const rows=[{kg:'50',reps:'8',done:true,rpe:8},{kg:'',reps:'',done:false}],before=JSON.stringify(rows);
  const result=ctx.compactPlanChangeV26(rows,2,{type:'edit',values:[{index:0,kg:'999',reps:'1'},{index:1,kg:'62,5',reps:'6'}]});
  assert.deepEqual(plain(result.rows[0]),rows[0]);assert.equal(result.rows[1].kg,'62.5');assert.equal(result.rows[1].done,false);assert.equal(JSON.stringify(rows),before);
});
test('Adding multiple planned sets and deleting one pending set preserves surplus completed work',()=>{
  const rows=[{kg:50,done:true},{kg:55,done:false},{kg:60,done:true}];
  const added=ctx.compactPlanChangeV26(rows,2,{type:'add',count:2,kg:'65',reps:'5'});assert.equal(added.target,5);assert.equal(added.rows[2].kg,60);assert.equal(added.rows[3].done,false);
  const removed=ctx.compactPlanChangeV26(added.rows,5,{type:'remove',index:1});assert.equal(removed.target,4);assert.equal(removed.rows[1].kg,60);assert.equal(removed.rows[1].done,true);
  assert.throws(()=>ctx.compactPlanChangeV26(rows,3,{type:'remove',index:0}));assert.throws(()=>ctx.compactPlanChangeV26([{done:false}],1,{type:'remove',index:0}));
});
test('Invalid planned entries and overlarge plan are refused',()=>{
  for(const kg of ['-1','no','2001'])assert.throws(()=>ctx.compactPlanChangeV26([],1,{type:'add',count:1,kg,reps:'5'}));
  assert.throws(()=>ctx.compactPlanChangeV26([],1,{type:'add',count:30,kg:'10',reps:'5'}));
  assert.throws(()=>ctx.compactPlanChangeV26([],1,{type:'edit',values:[{index:0,kg:'10',reps:'1.5'}]}));
});
test('Plan and counts commit together; compact files ship in HTML and web offline cache',()=>{
  assert.match(source,/commitStorageBatch\(\[\[LS.sets/);assert.match(source,/WTFocusPatchV10\?\.syncFromStorage\(key\)/);
  for(const name of ['../index.html','../sw.js']){const text=fs.readFileSync(path.join(__dirname,name),'utf8');assert.ok(text.includes('js/compact-ui.js'));assert.ok(text.includes('css/compact.css'));}
});
