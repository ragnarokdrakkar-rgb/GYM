'use strict';
// Item 3 (Phase 2B): PR detection (checkPR / checkRepPR, src/app/workout-runtime.js)
// must only look at DONE working sets of the exact exercise — never planned
// (done:false) rows that still carry kg/reps, and never warm-up sets. Before
// the fix, checkPR's bestSet/repPR scan iterated the raw `sets` array
// (all[key], which includes not-done and warmup rows) without filtering on
// `done` or `type`/`warm`, so a heavier planned-but-not-done row or a heavy
// warmup could be saved into wt_p6 / wt_rep_prs as a "PR" that was never
// actually lifted.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const runtime=read('src/app/workout-runtime.js');
function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,`${start} section exists`);return source.slice(a,b);}

function fakeCard(){
  const el={classList:{add(){}},querySelector:()=>({appendChild(){}})};
  return el;
}
function harness(){
  const ls={};
  const localStorage={getItem:k=>Object.prototype.hasOwnProperty.call(ls,k)?ls[k]:null,setItem:(k,v)=>{ls[k]=v;}};
  const document={getElementById:id=>id.startsWith('ec-')?fakeCard():{textContent:'',classList:{add(){}},remove(){}}};
  const ctx=vm.createContext({
    localStorage,document,
    PROG:{days:[{ex:[{n:'Bench'}]}]},
    setTimeout:()=>{}, // no real timers needed
  });
  ctx.ls=ls;
  vm.runInContext(section(runtime,'// === REP PR tracking ===','// === TONNAGE TREND ==='),ctx);
  vm.runInContext(section(runtime,'function checkPR(key,di,ei,sets){','function updateNextSetHighlight(key){'),ctx);
  ctx.LS={pr:'wt_p6'};
  vm.runInContext('function getPRs(){return JSON.parse(localStorage.getItem("wt_p6")||"{}");}function savePRs(d){localStorage.setItem("wt_p6",JSON.stringify(d));}',ctx);
  return ctx;
}

test('a heavier planned-but-not-done row is never recorded as a PR', ()=>{
  const ctx=harness();
  const sets=[
    {done:true,kg:60,reps:8},
    {done:false,kg:999,reps:5}, // planned only, never lifted
  ];
  ctx.checkPR('c1w0d0e0',0,0,sets);
  const prs=JSON.parse(ctx.ls.wt_p6);
  assert.equal(prs.pr00.kg,60,'PR must come from the done set, not the planned-only 999kg row');
});

test('a heavy warmup set is never recorded as a PR', ()=>{
  const ctx=harness();
  const sets=[
    {done:true,kg:50,reps:5,type:'warmup'},
    {done:true,kg:40,reps:8},
  ];
  ctx.checkPR('c1w0d0e0',0,0,sets);
  const prs=JSON.parse(ctx.ls.wt_p6);
  assert.equal(prs.pr00.kg,40,'PR must skip the warmup set even though it is heavier');
});

test('a heavy warmup set marked with warm:true (not type) is also excluded', ()=>{
  const ctx=harness();
  const sets=[
    {done:true,kg:70,reps:5,warm:true},
    {done:true,kg:45,reps:8},
  ];
  ctx.checkPR('c1w0d0e0',0,0,sets);
  const prs=JSON.parse(ctx.ls.wt_p6);
  assert.equal(prs.pr00.kg,45);
});

test('a done working set that beats the stored PR is still recorded (no regression)', ()=>{
  const ctx=harness();
  ctx.ls.wt_p6=JSON.stringify({pr00:{kg:50,reps:5,exName:'Bench',history:[]}});
  ctx.checkPR('c1w0d0e0',0,0,[{done:true,kg:55,reps:5}]);
  const prs=JSON.parse(ctx.ls.wt_p6);
  assert.equal(prs.pr00.kg,55);
});

test('rep PR (wt_rep_prs) ignores not-done and warmup rows the same way', ()=>{
  const ctx=harness();
  ctx.checkPR('c1w0d0e0',0,0,[
    {done:true,kg:20,reps:20}, // establishes a baseline rep PR at reps=20
  ]);
  // Now a heavier weight at the same rep count, but only planned or warmup:
  ctx.checkPR('c1w0d0e0',0,0,[
    {done:false,kg:100,reps:20},
    {done:true,kg:100,reps:20,type:'warmup'},
    {done:true,kg:21,reps:20},
  ]);
  const repPrs=JSON.parse(ctx.ls.wt_rep_prs);
  assert.equal(repPrs.Bench['20'],21,'rep PR must ignore the planned and warmup 100kg rows');
});
