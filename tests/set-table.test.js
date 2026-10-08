'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),shell=read('js/compact-shell.js');
function harness(extra={}){const ctx=vm.createContext(extra);vm.runInContext(shell,ctx);return ctx;}
function inner(ctx,name){const start=shell.indexOf('  function '+name+'('),end=shell.indexOf('\n  function ',start+1);assert.ok(start>=0&&end>start,'function '+name+' not found');vm.runInContext(shell.slice(start,end),ctx);}

// Stand-ins for the small helpers logger()/setTable()/setRow() close over,
// matching their real call signatures closely enough to exercise the markup.
function baseCtx(overrides={}){
  return harness({
    esc:s=>String(s),fmt:n=>String(n),icon:()=>'<svg></svg>',
    button:(act,label,cls,attrs)=>`<button type="button" class="${cls||'cg-link'}" data-act="${act}" ${attrs||''}>${label}</button>`,
    draft:new Map(),busy:false,
    prescriptionOpen:new Set(),window:{},clock:n=>String(n),
    get531Prescription:()=>null,getKgStep:()=>2.5,getRepsStep:()=>1,
    ...overrides
  });
}
function loadTable(ctx){for(const fn of ['valuesFor','steppers','setRow','setTable'])inner(ctx,fn);}
function loadLogger(ctx){loadTable(ctx);inner(ctx,'logger');}

function exercise(overrides={}){
  return {
    key:'k1',name:'Bench',target:4,done:1,
    rows:[{kg:60,reps:8,done:true},{kg:'',reps:'',done:false},{kg:'',reps:'',done:false},{kg:'',reps:'',done:false}],
    pending:{setIndex:1,complete:false},
    item:{},last:null,rest:90,
    ...overrides
  };
}

test('Set table renders one row per set: done, current and planned kinds',()=>{
  const ctx=baseCtx();loadTable(ctx);
  const html=ctx.setTable(exercise());
  assert.match(html,/cg-setrow2 done/);
  assert.match(html,/data-log-form/);
  assert.match(html,/cg-setrow2 planned/);
  // Four rows total (1 done + 1 current + 2 planned).
  assert.equal((html.match(/cg-setrow2/g)||[]).length,4);
});

test('Only the current row carries data-field inputs and the submit button',()=>{
  const ctx=baseCtx();loadTable(ctx);
  const e=exercise();
  const row0=ctx.setRow(e,0,1),row1=ctx.setRow(e,1,1),row2=ctx.setRow(e,2,1),row3=ctx.setRow(e,3,1);
  assert.doesNotMatch(row0,/data-field/);assert.doesNotMatch(row2,/data-field/);assert.doesNotMatch(row3,/data-field/);
  assert.match(row1,/data-field="kg"/);assert.match(row1,/data-field="reps"/);assert.match(row1,/data-field="rpe"/);
  assert.match(row1,/type="submit"/);assert.match(row1,/aria-label="Zabeleži serijo 2"/);
  assert.equal((row0.match(/type="submit"/g)||[]).length,0);
  assert.equal((row2.match(/type="submit"/g)||[]).length,0);
});

test('Planned rows show their values as buttons that open the plan sheet (no inline fields)',()=>{
  const ctx=baseCtx();loadTable(ctx);
  const e=exercise(),row=ctx.setRow(e,2,1);
  assert.equal((row.match(/data-act="plan-edit" data-index="2"/g)||[]).length,2);
  assert.doesNotMatch(row,/<input/);
  // Nothing stored yet: the values taken over from the current set are shown greyed.
  const hinted=ctx.setRow(exercise({pending:{setIndex:1,complete:false,kg:'60',reps:'8'}}),2,1);
  assert.match(hinted,/cg-plan-value hint" data-act="plan-edit" data-index="2"[^>]*>60</);
  assert.match(ctx.setRow(exercise(),2,1),/>—</,'no value at all shows a dash');
  assert.match(row,/cg-setrow-tick empty/);
  assert.match(row,/aria-hidden="true"/);
});

test('Done rows carry set-edit and set-undo actions with a filled tick',()=>{
  const ctx=baseCtx();loadTable(ctx);
  const e=exercise(),row=ctx.setRow(e,0,1);
  assert.match(row,/data-act="set-edit" data-index="0"/);
  assert.match(row,/data-act="set-undo" data-index="0"/);
  assert.match(row,/cg-tick-done/);
  assert.doesNotMatch(row,/data-plan-index/);
});

test('"− Zadnja serija" is disabled when the last row is done or only one set is planned',()=>{
  const ctx=baseCtx();loadTable(ctx);
  const single=exercise({target:1,done:0,rows:[{kg:'',reps:'',done:false}],pending:{setIndex:0,complete:false}});
  assert.match(ctx.setTable(single),/data-act="set-remove-last" disabled/);
  const lastDone=exercise({target:2,done:2,rows:[{kg:60,reps:8,done:true},{kg:60,reps:8,done:true}],pending:{complete:true}});
  assert.match(ctx.setTable(lastDone),/data-act="set-remove-last" disabled/);
  const removable=exercise();
  assert.doesNotMatch(ctx.setTable(removable),/data-act="set-remove-last" disabled/);
});

test('"+ Serija" is disabled once the target reaches 30 sets',()=>{
  const ctx=baseCtx();loadTable(ctx);
  const rows=Array.from({length:30},(_,i)=>({kg:60,reps:8,done:i<5}));
  const maxed=exercise({target:30,done:5,rows,pending:{setIndex:5,complete:false}});
  assert.match(ctx.setTable(maxed),/data-act="set-add-one" disabled/);
  const under=exercise();
  assert.doesNotMatch(ctx.setTable(under),/data-act="set-add-one" disabled/);
});

test('The current set has quick ± buttons: kg by the kg step (2,5) and reps by the reps step',()=>{
  const ctx=baseCtx();loadTable(ctx);
  const row=ctx.setRow(exercise(),1,1);
  assert.match(row,/data-act="kg-step" data-dir="-1"[^>]*>−2\.5</);
  assert.match(row,/data-act="kg-step" data-dir="1"[^>]*>\+2\.5</);
  assert.match(row,/data-act="reps-step" data-dir="-1"[^>]*>−1</);
  assert.match(row,/data-act="reps-step" data-dir="1"[^>]*>\+1</);
  // Buttons only on the current set, and they never submit the set.
  assert.doesNotMatch(ctx.setRow(exercise(),2,1),/kg-step/);
  assert.doesNotMatch(ctx.setRow(exercise(),0,1),/kg-step/);
  assert.doesNotMatch(row,/<button type="submit"[^>]*data-act="kg-step"/);
});

test('A set planned by hand is marked (dot + label), a carried or empty one is not',()=>{
  const ctx=baseCtx();loadTable(ctx);
  const e=exercise({rows:[{kg:60,reps:8,done:true},{kg:62.5,reps:8,done:false,carried:true},{kg:70,reps:5,done:false,manual:true},{kg:'',reps:'',done:false}]});
  const html=ctx.setTable(e);
  assert.match(ctx.setRow(e,2,1),/cg-setrow2 planned manual/);
  assert.match(ctx.setRow(e,2,1),/cg-manual-dot/);
  assert.match(ctx.setRow(e,2,1),/aria-label="Serija 3: 70 kg, ročno načrtovano · uredi"/);
  const carried=exercise({rows:[{kg:60,reps:8,done:true},{kg:'',reps:'',done:false},{kg:62.5,reps:8,done:false,carried:true},{kg:'',reps:'',done:false}]});
  assert.match(ctx.setRow(carried,2,1),/cg-plan-value" data-act="plan-edit" data-index="2"[^>]*>62\.5</,'a carried value is stored, so not greyed');
  assert.doesNotMatch(ctx.setRow(e,3,1),/manual/);
  assert.doesNotMatch(ctx.setRow(e,1,1),/cg-manual-dot/);
  assert.match(html,/cg-manual-note/);
  assert.doesNotMatch(ctx.setTable(exercise()),/cg-manual-note/);
  // The current set keeps the mark when it was planned by hand.
  const current=exercise({rows:[{kg:60,reps:8,done:true},{kg:85,reps:5,done:false,manual:true}],target:2,pending:{setIndex:1,complete:false,kg:'85',reps:'5'}});
  assert.match(ctx.setRow(current,1,1),/cg-setrow2 current manual/);
});

test('"+ Serija" adds an empty set that follows the carry rule instead of copying values in advance',()=>{
  assert.match(shell,/act==='set-add-one'\)\{savePlanAction\(e,\{type:'add',count:1,kg:'',reps:''\}\)/);
  assert.doesNotMatch(shell,/function lastSetValues\(/);
});

test('All-done message is shown above the table, which stays visible so sets can be edited or undone',()=>{
  const ctx=baseCtx();loadLogger(ctx);
  const done=exercise({target:2,done:2,rows:[{kg:60,reps:8,done:true},{kg:60,reps:8,done:true}],pending:{complete:true}});
  const html=ctx.logger(done);
  assert.match(html,/cg-success">✓ Vseh 2 serij je zabeleženih\./);
  assert.match(html,/cg-settable/);
  assert.match(html,/cg-setrow2 done/);
});

test('Logger no longer renders the removed plan/set-history details or the old add-planned link',()=>{
  const ctx=baseCtx();loadLogger(ctx);
  const html=ctx.logger(exercise());
  assert.doesNotMatch(html,/data-plan-details/);
  assert.doesNotMatch(html,/data-set-details/);
  assert.doesNotMatch(html,/plan-add/);
  assert.doesNotMatch(html,/Načrt serij · vpiši/);
  assert.match(html,/cg-log-footer/);
});
