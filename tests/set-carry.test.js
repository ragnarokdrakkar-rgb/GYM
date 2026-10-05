'use strict';
// Entering kg for a set must not be copied onto every later set. Only after a
// set is confirmed does the NEXT set inherit its kg/reps — and a set the user
// planned by hand (typed in advance) keeps its own values. Synthetic data only.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const runtime=read('src/app/workout-runtime.js'),model=read('src/app/workout-model.js'),compactUi=read('js/compact-ui.js');
function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,`${start} section exists`);return source.slice(a,b);}
const carrySource=section(model,'function carryToNextSetV34(','// Keep original exercise indexes');

function carry(){const ctx=vm.createContext({});vm.runInContext(carrySource,ctx);return ctx.carryToNextSetV34;}

test('the next set inherits kg/reps only from a confirmed set',()=>{
  const fn=carry();
  assert.deepEqual({...fn({kg:'80',reps:'8',done:true},{kg:'',reps:'',done:false})},{kg:'80',reps:'8',done:false,carried:true});
  assert.equal(fn({kg:'80',reps:'8',done:false},{kg:'',reps:'',done:false}),null,'an unconfirmed set carries nothing');
  assert.deepEqual({...fn({kg:'80',reps:'8',done:true},undefined)},{kg:'80',reps:'8',done:false,carried:true},'a missing next row is created');
});

test('a hand-planned or finished next set is never overwritten; drop sets carry nothing',()=>{
  const fn=carry();
  assert.equal(fn({kg:'80',reps:'8',done:true},{kg:'85',reps:'5',done:false,manual:true}),null);
  assert.equal(fn({kg:'80',reps:'8',done:true},{kg:'',reps:'',done:false,manual:true}),null);
  assert.equal(fn({kg:'80',reps:'8',done:true},{kg:'90',reps:'3',done:true}),null);
  assert.equal(fn({kg:'60',reps:'12',done:true,drop:true},{kg:'',reps:'',done:false}),null);
});

test('a previously carried value is replaced, other stored values only fill empty fields',()=>{
  const fn=carry();
  assert.deepEqual({...fn({kg:'82.5',reps:'6',done:true},{kg:'80',reps:'8',done:false,carried:true})},{kg:'82.5',reps:'6',done:false,carried:true});
  assert.equal(fn({kg:'80',reps:'8',done:true},{kg:'80',reps:'8',done:false,carried:true}),null,'same values: nothing to write');
  // An older stored value without any flag (e.g. from before this version) keeps its kg; empty reps are filled.
  assert.deepEqual({...fn({kg:'80',reps:'8',done:true},{kg:'75',reps:'',done:false})},{kg:'75',reps:'8',done:false,carried:true});
});

// --- sv() + tgSet() together, with the browser-facing helpers stubbed out ---
function runtimeHarness(initialSets){
  const ls={wt_s6:JSON.stringify(initialSets)},timers=[];
  const ctx=vm.createContext({
    localStorage:{getItem:k=>ls[k]??null,setItem:(k,v)=>{ls[k]=String(v);}},
    document:{querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null},
    navigator:{},toast(){},uiConfirm:async()=>true,setTimeout(){},
    PROG:{days:[{ex:[{n:'Bench',r:120}]}],weeks:[{sM:4,sA:4}]},cw:0,BARBELL_EX:[],foldState:{},
    getSetCounts:()=>({}),saveSetCounts(){},
    getSets:()=>JSON.parse(ls.wt_s6||'{}'),saveSets:all=>{ls.wt_s6=JSON.stringify(all);return true;},
    getSwappedName:(key,n)=>n,exStableId:n=>'id-'+n,rebuildRows(){},checkPR(){},buildWU:()=>[],updatePlMini(){},
    startT:(key,sec)=>timers.push([key,sec]),restForEx:(id,name,def)=>def,
    isExHidden:()=>false,sdk:(c,w,d,e)=>`c${c}w${w}d${d}e${e}`,allDone:()=>false
  });
  vm.runInContext(section(model,'function exerciseTargetSetsV19(','// Keep original exercise indexes'),ctx);
  vm.runInContext('function getExtraSets(){return 0;}',ctx);
  vm.runInContext(section(runtime,'async function sv(','function updatePlateBox('),ctx);
  vm.runInContext(section(runtime,'function tgSet(','function saveNote('),ctx);
  return {ctx,rows:()=>JSON.parse(ls.wt_s6).c1w0d0e0,timers};
}
const K='c1w0d0e0';
async function logSet(h,si,kg,reps){await h.ctx.sv(K,si,'kg',kg,0,0,1,0);await h.ctx.sv(K,si,'reps',reps,0,0,1,0);h.ctx.tgSet(K,si,0,0,1);}

test('logging set 1 does not write its kg into sets 2–4; set 2 gets it only after set 1 is confirmed',async()=>{
  const h=runtimeHarness({});
  await h.ctx.sv(K,0,'kg','60',0,0,1,0);
  assert.deepEqual(h.rows().slice(1).map(r=>r.kg),['','',''],'typing kg for set 1 leaves later sets empty');
  await h.ctx.sv(K,0,'reps','8',0,0,1,0);h.ctx.tgSet(K,0,0,0,1);
  const rows=h.rows();
  assert.equal(rows[0].done,true);
  assert.deepEqual([rows[1].kg,rows[1].reps,rows[1].carried],['60','8',true],'only the next set inherits');
  assert.deepEqual(rows.slice(2).map(r=>r.kg),['',''],'sets 3–4 stay empty');
});

test('a heavier second set carries to set 3 (the old forward fill kept the first weight there)',async()=>{
  const h=runtimeHarness({});
  await logSet(h,0,'60','8');
  await logSet(h,1,'62.5','8');
  const rows=h.rows();
  assert.deepEqual(rows.map(r=>r.kg),['60','62.5','62.5','']);
  assert.equal(rows[1].carried,undefined,'a confirmed set is no longer marked as carried');
});

test('a set planned by hand keeps its weight when earlier sets are confirmed',async()=>{
  const planned={[K]:[{kg:'',reps:'',done:false},{kg:'',reps:'',done:false},{kg:'85',reps:'5',done:false,manual:true},{kg:'',reps:'',done:false}]};
  const h=runtimeHarness(planned);
  await logSet(h,0,'80','8');
  await logSet(h,1,'80','8');
  const rows=h.rows();
  assert.deepEqual([rows[2].kg,rows[2].reps,rows[2].manual],['85','5',true]);
  assert.equal(rows[3].kg,'','the set after the planned one is untouched until set 3 is confirmed');
});

test('planning a set in advance marks it manual; clearing it removes the plan; added sets follow the rule',()=>{
  const ctx=vm.createContext({});vm.runInContext(section(compactUi,'function compactPlanChangeV26(','\nif(typeof document'),ctx);
  const rows=[{kg:'80',reps:'8',done:true},{kg:'80',reps:'8',done:false,carried:true},{kg:'',reps:'',done:false}];
  const edited=ctx.compactPlanChangeV26(rows,3,{type:'edit',values:[{index:1,kg:'85',reps:'8'}]}).rows;
  assert.deepEqual({...edited[1]},{kg:'85',reps:'8',done:false,manual:true});
  const cleared=ctx.compactPlanChangeV26(edited,3,{type:'edit',values:[{index:1,kg:'',reps:''}]}).rows;
  assert.equal(cleared[1].manual,undefined);
  const added=ctx.compactPlanChangeV26(rows,3,{type:'add',count:1,kg:'',reps:''}).rows;
  assert.deepEqual({...added[3]},{kg:'',reps:'',done:false},'"+ Serija" adds an empty set that inherits later');
  const plannedSets=ctx.compactPlanChangeV26(rows,3,{type:'add',count:2,kg:'90',reps:'3'}).rows;
  assert.deepEqual([...plannedSets.slice(3).map(r=>r.manual)],[true,true],'"Dodaj načrtovane serije" with values is a manual plan');
});
