'use strict';
// Phase 3A item 2 — "Preveri rekorde" (Settings → Napredno).
// The three pure top-level helpers in js/compact-shell.js: prSlotNameResolver,
// prAuditBestRowsV33 and compactPrAuditV33 recompute PRs from actual history
// (only done working sets — never planned or warm-up rows) and diff them
// against the stored wt_p6 / wt_rep_prs records, without touching storage.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const shell=read('js/compact-shell.js');
function ctx(){const c=vm.createContext({});vm.runInContext(shell,c);return c;}

test('prSlotNameResolver: resolves pr{dayIdx}{exIdx} against the current program, by exact key match not digit parsing', ()=>{
  const c=ctx();
  const prog={days:[{ex:[{n:'Bench press'},{n:'Row'}]},{ex:[{n:'Squat'}]}]};
  const resolve=c.prSlotNameResolver(prog);
  assert.equal(resolve('pr00'),'Bench press');
  assert.equal(resolve('pr01'),'Row');
  assert.equal(resolve('pr10'),'Squat');
  assert.equal(resolve('pr99'),null);
});

test('prAuditBestRowsV33: planned (done:false) and warm-up rows are ignored; only done work sets count', ()=>{
  const c=ctx();
  const setsByKey={
    k1:[
      {done:false,kg:999,reps:5}, // planned only
      {done:true,kg:50,reps:8,type:'warmup'}, // warmup
      {done:true,kg:60,reps:8,warm:true}, // warm flag
      {done:true,kg:80,reps:5,exName:'Bench press'}, // the only real work set
    ],
  };
  const {best,repBest}=c.prAuditBestRowsV33([],setsByKey,()=>null);
  assert.deepEqual(JSON.parse(JSON.stringify(best.get('Bench press'))),{kg:80,reps:5,e1:80*(1+5/30)});
  assert.equal(repBest.get('Bench press')[5],80);
});

test('prAuditBestRowsV33: session exercises and live wt_s6 rows are merged, keeping only the true maximum', ()=>{
  const c=ctx();
  const sessionExercises=[{name:'Bench press',sets:[{done:true,kg:80,reps:5}]}];
  const setsByKey={k1:[{done:true,kg:100,reps:3,exName:'Bench press'}]};
  const {best}=c.prAuditBestRowsV33(sessionExercises,setsByKey,()=>null);
  assert.equal(best.get('Bench press').kg,100);
});

test('compactPrAuditV33: a correct stored PR (matches history) is not flagged', ()=>{
  const c=ctx();
  const best=new Map([['Bench press',{kg:80,reps:5,e1:1}]]);
  const audit=c.compactPrAuditV33({pr00:{kg:80,reps:5,exName:'Bench press'}},{},()=>'Bench press',best,new Map());
  assert.equal(audit.slotDiffs.length,0);
});

test('compactPrAuditV33: a higher stored value that came from a planned/warm-up row is flagged as a mismatch', ()=>{
  const c=ctx();
  const best=new Map([['Bench press',{kg:80,reps:5,e1:1}]]); // real history max is 80
  const audit=c.compactPrAuditV33({pr00:{kg:120,reps:5,exName:'Bench press'}},{},()=>'Bench press',best,new Map());
  assert.equal(audit.slotDiffs.length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(audit.slotDiffs[0])),{key:'pr00',name:'Bench press',storedKg:120,storedReps:5,historyKg:80,historyReps:5,noHistory:false});
});

test('compactPrAuditV33: a legacy plain-number PR is compared by kg only (no stored reps to check)', ()=>{
  const c=ctx();
  const best=new Map([['Squat',{kg:140,reps:3,e1:1}]]);
  const audit=c.compactPrAuditV33({pr10:150},{},key=>key==='pr10'?'Squat':null,best,new Map());
  assert.equal(audit.slotDiffs.length,1);
  assert.equal(audit.slotDiffs[0].historyKg,140);
});

test('compactPrAuditV33: a PR with no supporting history at all is flagged noHistory, not silently corrected', ()=>{
  const c=ctx();
  const audit=c.compactPrAuditV33({pr00:{kg:120,reps:5,exName:'Ghost exercise'}},{},()=>null,new Map(),new Map());
  assert.equal(audit.slotDiffs.length,1);
  assert.equal(audit.slotDiffs[0].noHistory,true);
  assert.equal(audit.slotDiffs[0].historyKg,null);
});

test('compactPrAuditV33: rep PRs are diffed by exercise name and rep count', ()=>{
  const c=ctx();
  const repBest=new Map([['Bench press',{5:80,8:60}]]);
  const audit=c.compactPrAuditV33({},{'Bench press':{5:100,8:60}},()=>null,new Map(),repBest);
  assert.equal(audit.repDiffs.length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(audit.repDiffs[0])),{name:'Bench press',reps:5,storedKg:100,historyKg:80,noHistory:false});
});

test('compactPrAuditV33: a rep PR for an exercise with no history at all is flagged noHistory', ()=>{
  const c=ctx();
  const audit=c.compactPrAuditV33({},{'Ghost lift':{5:100}},()=>null,new Map(),new Map());
  assert.equal(audit.repDiffs.length,1);
  assert.equal(audit.repDiffs[0].noHistory,true);
});

test('compactPrAuditV33: zero/absent stored PRs never produce a diff row', ()=>{
  const c=ctx();
  const audit=c.compactPrAuditV33({pr00:0,pr01:null},{},()=>'X',new Map(),new Map());
  assert.equal(audit.slotDiffs.length,0);
});
