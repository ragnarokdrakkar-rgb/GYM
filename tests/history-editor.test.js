const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../js/history-editor.js'),'utf8'),ctx);
const fixture=()=>({sets:{c1w0d0e0:[{kg:100,reps:5,done:true,exName:'Bench'}]},sessions:[{exercises:[{name:'Bench',sets:[{kg:100,reps:5,done:true},{kg:20,reps:10,done:true,type:'warmup'}]}],totals:{maxPain:2}}],prs:{pr00:{kg:200,reps:13,exName:'Bench'}}});
test('History lists snapshot, raw sets and PR provenance without changing data',()=>{
  const d=fixture(),before=JSON.stringify(d),rows=ctx.historyRowsV24(d.sets,d.sessions,d.prs);
  assert.equal(rows.length,4);assert.equal(JSON.stringify(d),before);assert.equal(rows.at(-1).e1rm,287);assert.ok(rows.at(-1).reasons.length);
});
test('Historical edit preserves current roster source, flags and snapshot totals',()=>{
  const d=fixture(),ref={kind:'session',si:0,ei:0,ri:0};
  const next=ctx.historyCorrectionV24(d,ref,JSON.stringify(d.sessions[0].exercises[0].sets[0]),{kg:'90',reps:'4',rpe:'8',name:'Old bench'});
  assert.equal(next.sessions[0].totals.tonnage,360);assert.equal(next.sessions[0].totals.doneSets,1);assert.equal(next.sessions[0].totals.maxPain,2);
  assert.equal(next.sets.c1w0d0e0[0].kg,100);assert.equal(d.sessions[0].exercises[0].name,'Bench');assert.equal(next.sessions[0].exercises[0].sets[0].done,true);
});
test('PR correction is explicit and stale or invalid writes are rejected',()=>{
  const d=fixture(),ref={kind:'pr',key:'pr00'},expected=JSON.stringify(d.prs.pr00),values={kg:'120',reps:'3',rpe:'',name:'Bench'};
  assert.equal(ctx.historyCorrectionV24(d,ref,expected,values).prs.pr00.kg,120);
  assert.throws(()=>ctx.historyCorrectionV24(d,ref,'{}',values));
  for(const change of [{kg:''},{kg:'-5'},{reps:'1.5'},{rpe:'12'},{name:''}])assert.throws(()=>ctx.historyCorrectionV24(d,ref,expected,{...values,...change}));
});
test('Numeric legacy PR remains editable without altering other stores',()=>{
  const d=fixture();d.prs.pr00=125;
  const next=ctx.historyCorrectionV24(d,{kind:'pr',key:'pr00'},JSON.stringify({kg:125,reps:1}),{kg:'120',reps:'1',rpe:'',name:'Bench'});
  assert.equal(next.prs.pr00.kg,120);assert.equal(next.prs.pr00.rpe,null);assert.equal(next.sets.c1w0d0e0[0].kg,100);
});
test('Deleting a workout from history removes only that session record; sets and PRs stay',()=>{
  const d=fixture();d.sessions.push({date:'2026-10-09',dayName:'Noge',exercises:[]});
  const before=JSON.stringify(d),expected=JSON.stringify(d.sessions[0]);
  const next=ctx.historyDeleteSessionV35(d,0,expected);
  assert.equal(next.sessions.length,1);assert.equal(next.sessions[0].dayName,'Noge');
  assert.equal(JSON.stringify(next.sets),JSON.stringify(d.sets));assert.equal(JSON.stringify(next.prs),JSON.stringify(d.prs));
  assert.equal(JSON.stringify(d),before,'input is not mutated');
  assert.throws(()=>ctx.historyDeleteSessionV35(d,0,'{}'),/spremenil/,'stale record is rejected');
  assert.throws(()=>ctx.historyDeleteSessionV35(d,5,expected),/spremenil/,'missing index is rejected');
});
test('History undo snapshot keeps only the changed stores and only their previous value',()=>{
  const d=fixture();ctx.LS={sets:'wt_s6',sessions:'wt_sess6',pr:'wt_p6'};
  const next=ctx.historyDeleteSessionV35(d,0,JSON.stringify(d.sessions[0]));
  const undo=ctx.historyUndoSnapshotV35(d,next);
  assert.equal(JSON.stringify(Object.keys(undo.before)),'["sessions"]','sets and PRs did not change, so they are not copied');
  assert.equal(JSON.stringify(undo.before.sessions),JSON.stringify(d.sessions));
  assert.equal(typeof undo.after,'string');
  const entries=ctx.historyCommitEntriesV35(d,next);
  assert.equal(JSON.stringify(entries.map(e=>e[0])),'["wt_sess6","wt_history_undo_v24"]','only the changed store and the undo key are written');
  // The commit is far smaller than the old before+after copy of everything.
  const old=JSON.stringify({before:d,after:next}).length,slim=JSON.stringify(undo).length;
  assert.ok(slim<old,`slim ${slim} vs old ${old}`);
  // With a realistic history the saving is what matters: only the sessions store is copied, once.
  const big=fixture();big.sessions=Array.from({length:40},(_,i)=>({...JSON.parse(JSON.stringify(big.sessions[0])),id:'s'+i}));big.sets=Object.fromEntries(Array.from({length:120},(_,i)=>['c1w0d0e'+i,[{kg:100,reps:5,done:true,exName:'Bench'}]]));
  const bigNext=ctx.historyDeleteSessionV35(big,0,JSON.stringify(big.sessions[0]));
  assert.ok(JSON.stringify(ctx.historyUndoSnapshotV35(big,bigNext)).length<JSON.stringify({before:big,after:bigNext}).length/3);
});
test('History undo restores exactly the changed stores and refuses when the data moved on',()=>{
  const d=fixture();ctx.LS={sets:'wt_s6',sessions:'wt_sess6',pr:'wt_p6'};
  const next=ctx.historyDeleteSessionV35(d,0,JSON.stringify(d.sessions[0])),undo=JSON.parse(JSON.stringify(ctx.historyUndoSnapshotV35(d,next)));
  const entries=ctx.historyUndoEntriesV35(undo,next);
  assert.equal(JSON.stringify(entries.map(e=>e[0])),'["wt_sess6","wt_history_undo_v24"]');
  assert.equal(entries[0][1],JSON.stringify(d.sessions));assert.equal(entries[1][1],null);
  const moved=JSON.parse(JSON.stringify(next));moved.sets.c1w0d0e0[0].kg=120;
  assert.equal(ctx.historyUndoEntriesV35(undo,moved),null,'a later change elsewhere blocks the automatic undo');
  assert.equal(ctx.historyUndoEntriesV35({before:d,after:next},next),null,'an old-format snapshot is never replayed');
});
