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
