'use strict';
// Item 5: reordering/adding/removing/toggling exercises mid-week must keep
// logged sets (wt_s6), set counts (wt_sc6), hidden flags (wt_hidden_ex) and PR
// slots (wt_p6, pr{di}{ei}) attached to the SAME exercise, even when that
// exercise has data logged in a previous cycle/week, not just the current one.
// mutateDayList()+reconcilePositions() (src/app/workout-model.js) is the single
// path every compact-shell.js program-up/down/toggle/add action goes through
// (moveBuilderExerciseV6 in src/app/v6-core.js also calls mutateDayList).
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const model=read('src/app/workout-model.js');

function harness(di,items){
  const store=new Map();
  const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
  const h={sets:{},setCounts:{},hidden:{},pain:{},prs:{},cycleNum:3};
  const ctx=vm.createContext({
    localStorage,
    PROG:{days:[{ex:[]}]},
    getSets:()=>h.sets,saveSets:d=>{h.sets=d;return true;},
    getSetCounts:()=>h.setCounts,saveSetCounts:d=>{h.setCounts=d;return true;},
    getHiddenEx:()=>h.hidden,saveHiddenEx:d=>{h.hidden=d;return true;},
    getPainData:()=>h.pain,savePainData:d=>{h.pain=d;return true;},
    getPRs:()=>h.prs,savePRs:d=>{h.prs=d;return true;},
    getCyc:()=>({num:h.cycleNum}),
    safeSetRaw:(k,v)=>{localStorage.setItem(k,v);return true;},
    cw:0,
  });
  vm.runInContext(model,ctx);
  // Seed the shared day list directly (bypassing the legacy migration path).
  const all={};all[di]=items;
  vm.runInContext(`saveDayLists(${JSON.stringify(all)})`,ctx);
  h.ctx=ctx;
  return h;
}
const sdkKey=(c,w,d,e)=>`c${c}w${w}d${d}e${e}`;

test('Moving an exercise up keeps its logged sets, set count, hidden flag and PR across every past cycle/week, not just the current one',()=>{
  const di=2;
  const items=[{id:'bench'},{id:'row'},{id:'squat'}]; // squat at index 2 will move to index 0
  const h=harness(di,items);
  // Data logged for "squat" (originally index 2) in an OLDER cycle/week (cycle 1, week 0)
  // and in the CURRENT cycle/week (cycle 3, week 1), plus a set count bump, a hidden
  // flag and a PR slot, all keyed positionally at index 2.
  h.sets[sdkKey(1,0,di,2)]=[{kg:80,reps:5,done:true}];
  h.sets[sdkKey(3,1,di,2)]=[{kg:100,reps:3,done:true}];
  h.setCounts[sdkKey(3,1,di,2)]=1;
  h.hidden[sdkKey(3,0,di,2)]=true;
  h.prs['pr'+di+'2']={kg:100,date:'2026-09-01'};
  // Unrelated data on "bench" (index 0) must be left completely alone.
  h.sets[sdkKey(3,1,di,0)]=[{kg:60,reps:8,done:true}];
  h.prs['pr'+di+'0']={kg:60,date:'2026-08-01'};

  vm.runInContext(`mutateDayList(${di},arr=>{const [x]=arr.splice(2,1);arr.splice(0,0,x);})`,h.ctx);

  const order=JSON.parse(vm.runInContext(`JSON.stringify(getDayLists()[${di}].map(x=>x.id))`,h.ctx));
  assert.deepEqual(order,['squat','bench','row']);

  // squat's data followed it to index 0 in every cycle/week it appeared in.
  assert.deepEqual(h.sets[sdkKey(1,0,di,0)],[{kg:80,reps:5,done:true}]);
  assert.deepEqual(h.sets[sdkKey(3,1,di,0)],[{kg:100,reps:3,done:true}]);
  assert.equal(h.setCounts[sdkKey(3,1,di,0)],1);
  assert.equal(h.hidden[sdkKey(3,0,di,0)],true);
  assert.deepEqual(h.prs['pr'+di+'0'],{kg:100,date:'2026-09-01'});
  // No ghost data left behind at squat's old position (index 2).
  assert.equal(h.sets[sdkKey(1,0,di,2)],undefined);
  assert.equal(h.sets[sdkKey(3,1,di,2)],undefined);
  assert.equal(h.hidden[sdkKey(3,0,di,2)],undefined);
  // bench's data (now at index 1) followed it too, not overwritten by squat's data.
  assert.deepEqual(h.sets[sdkKey(3,1,di,1)],[{kg:60,reps:8,done:true}]);
  assert.deepEqual(h.prs['pr'+di+'1'],{kg:60,date:'2026-08-01'});
});

test('Adding a new exercise to the end of the day does not shift or overwrite any existing exercise\'s data',()=>{
  const di=1;
  const items=[{id:'a'},{id:'b'}];
  const h=harness(di,items);
  h.sets[sdkKey(2,0,di,0)]=[{kg:40,reps:10,done:true}];
  h.sets[sdkKey(2,0,di,1)]=[{kg:50,reps:8,done:true}];
  h.prs['pr'+di+'1']={kg:50,date:'2026-01-01'};

  vm.runInContext(`mutateDayList(${di},arr=>arr.push({id:'c'}))`,h.ctx);

  const order=JSON.parse(vm.runInContext(`JSON.stringify(getDayLists()[${di}].map(x=>x.id))`,h.ctx));
  assert.deepEqual(order,['a','b','c']);
  assert.deepEqual(h.sets[sdkKey(2,0,di,0)],[{kg:40,reps:10,done:true}]);
  assert.deepEqual(h.sets[sdkKey(2,0,di,1)],[{kg:50,reps:8,done:true}]);
  assert.deepEqual(h.prs['pr'+di+'1'],{kg:50,date:'2026-01-01'});
});

test('Toggling programDisabled in place (program-toggle) does not touch any positional data — no reconciliation needed',()=>{
  const di=0;
  const items=[{id:'a'},{id:'b'}];
  const h=harness(di,items);
  h.sets[sdkKey(1,0,di,0)]=[{kg:20,reps:12,done:true}];
  h.sets[sdkKey(1,0,di,1)]=[{kg:30,reps:12,done:true}];
  // program-toggle in compact-shell.js mutates the item in place and calls
  // saveDayLists directly, WITHOUT mutateDayList/reconcilePositions, because the
  // list order and length never change.
  vm.runInContext(`{const all=getDayLists();all[${di}][0].programDisabled=true;saveDayLists(all);}`,h.ctx);
  const order=vm.runInContext(`getDayLists()[${di}]`,h.ctx);
  assert.equal(order[0].programDisabled,true);
  assert.deepEqual(h.sets[sdkKey(1,0,di,0)],[{kg:20,reps:12,done:true}]);
  assert.deepEqual(h.sets[sdkKey(1,0,di,1)],[{kg:30,reps:12,done:true}]);
});

test('Removing an exercise from the middle reassigns the following exercises\' data down by one, without merging with each other',()=>{
  const di=3;
  const items=[{id:'a'},{id:'b'},{id:'c'}];
  const h=harness(di,items);
  h.sets[sdkKey(1,0,di,0)]=[{kg:1,reps:1,done:true}];
  h.sets[sdkKey(1,0,di,1)]=[{kg:2,reps:2,done:true}]; // 'b' will be removed
  h.sets[sdkKey(1,0,di,2)]=[{kg:3,reps:3,done:true}];
  h.prs['pr'+di+'2']={kg:3};

  vm.runInContext(`mutateDayList(${di},arr=>{arr.splice(1,1);})`,h.ctx);

  const order=JSON.parse(vm.runInContext(`JSON.stringify(getDayLists()[${di}].map(x=>x.id))`,h.ctx));
  assert.deepEqual(order,['a','c']);
  assert.deepEqual(h.sets[sdkKey(1,0,di,0)],[{kg:1,reps:1,done:true}]);
  assert.deepEqual(h.sets[sdkKey(1,0,di,1)],[{kg:3,reps:3,done:true}]);
  assert.deepEqual(h.prs['pr'+di+'1'],{kg:3});
  assert.equal(h.sets[sdkKey(1,0,di,2)],undefined);
});
