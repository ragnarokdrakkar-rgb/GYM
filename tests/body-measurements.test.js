'use strict';
// Item 1 (Phase 2B): body measurements (meritve, wt_m6) were reachable in the
// legacy tools screen but that screen was retired ("Screen retired; retain
// stored measurements and backup support" — src/app/analytics-tools.js
// renderMeas) and the compact redesign (js/compact-shell.js) never grew a
// replacement entry point, even though getMeas/saveMeas and the wt_m6 key are
// still read by exportData/importData. This adds a "Telesne mere" section to
// Napredek → Teža (weightView) using the existing storage functions/shape,
// and these tests cover it.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),shell=read('js/compact-shell.js'),compactUi=read('js/compact-ui.js');
function harness(extra={}){const ctx=vm.createContext(extra);vm.runInContext(compactUi,ctx);vm.runInContext(shell,ctx);return ctx;}
function inner(ctx,name){const start=shell.indexOf('  function '+name+'('),end=shell.indexOf('\n  function ',start+1);assert.ok(start>=0&&end>start,'function '+name+' not found');vm.runInContext(shell.slice(start,end),ctx);}
const button=(act,label,cls,attrs)=>`<button type="button" class="${cls||'cg-link'}" data-act="${act}" ${attrs||''}>${label}</button>`;
const MEAS_FIELDS=['Prsa','Pas','Boki','L roka','D roka','L stegno','D stegno'];

function measCtx(measStore){
  const meas=measStore||{};
  const ctx=harness({
    esc:s=>String(s),icon:()=>'',fmt:n=>String(n),button,clock:n=>String(n),
    state:{progress:'Teža',weightDays:30},dateLabel:d=>d,shortDate:()=>'',
    getBW:()=>({}),getBWPhaseContext:e=>({type:'bulk',label:'Bulk',start:null,entries:e}),
    avg7d:()=>null,compactWeeklyWeightV27:()=>null,weightVerdictV30:()=>({tone:'neutral',text:'x'}),
    getMeas:()=>meas,MEAS_FIELDS,LS:{meas:'wt_m6'},dateKey:()=>'2026-09-24',
  });
  ctx.meas=meas;
  inner(ctx,'weightView');
  return ctx;
}
function editMeasCtx(measStore){
  const meas=measStore||{},calls=[];
  const ctx=harness({
    getMeas:()=>meas,MEAS_FIELDS,LS:{meas:'wt_m6'},dateKey:()=>'2026-09-24',esc:s=>String(s),
    sheet:(title,body,save)=>{ctx._title=title;ctx._body=body;ctx._save=save;},
    commitStorageBatch:writes=>calls.push(writes),notify:(t,err)=>calls.push(['notify',t,err]),
  });
  ctx.meas=meas;ctx.calls=calls;
  inner(ctx,'editMeas');
  return ctx;
}

test('weightView renders a "Telesne mere" section with an add button, even with no data yet', ()=>{
  const html=measCtx({}).weightView();
  assert.match(html,/Telesne mere/);
  assert.match(html,/data-act="meas-add"/);
  assert.match(html,/Še ni vnesenih telesnih mer/);
});

test('weightView lists existing measurement entries with an edit action per date', ()=>{
  const html=measCtx({'2026-09-01':{Pas:80,Prsa:100},'2026-09-15':{Pas:79}}).weightView();
  assert.match(html,/2026-09-15/);
  assert.match(html,/2026-09-01/);
  assert.match(html,/Pas: 79cm/);
  assert.match(html,/data-act="meas-edit"/);
  assert.match(html,/data-date-key="2026-09-01"/);
});

test('editMeas saves a new measurement entry for today via commitStorageBatch under LS.meas, keyed like getMeas/saveMeas expect', async ()=>{
  const ctx=editMeasCtx({});
  ctx.editMeas();
  await ctx._save(new Map([['date','2026-09-24'],['Pas','80'],['Prsa','']]));
  const write=ctx.calls.find(c=>Array.isArray(c)&&c[0]&&c[0][0]==='wt_m6');
  assert.ok(write,'expected a commitStorageBatch write to wt_m6');
  const saved=JSON.parse(write[0][1]);
  assert.deepEqual(saved['2026-09-24'],{Pas:80});
});

test('editMeas rejects an empty submit (no field filled in)', async ()=>{
  const ctx=editMeasCtx({});
  ctx.editMeas();
  await assert.rejects(()=>ctx._save(new Map([['date','2026-09-24']])),/vsaj eno mero/);
});

test('editMeas refuses to overwrite another date\'s existing entry when the date field is changed to a taken date', async ()=>{
  const ctx=editMeasCtx({'2026-09-01':{Pas:70}});
  ctx.editMeas('2026-09-24');
  await assert.rejects(()=>ctx._save(new Map([['date','2026-09-01'],['Pas','80']])),/že obstajajo mere/);
});

test('editMeas editing an existing date preserves other stored dates (no data loss) and moves the entry if the date changes', async ()=>{
  const ctx=editMeasCtx({'2026-09-01':{Pas:70},'2026-09-10':{Pas:75}});
  ctx.editMeas('2026-09-01');
  await ctx._save(new Map([['date','2026-09-02'],['Pas','71']]));
  const write=ctx.calls.find(c=>Array.isArray(c)&&c[0]&&c[0][0]==='wt_m6');
  const saved=JSON.parse(write[0][1]);
  assert.equal(saved['2026-09-01'],undefined);
  assert.deepEqual(saved['2026-09-02'],{Pas:71});
  assert.deepEqual(saved['2026-09-10'],{Pas:75}); // untouched
});

test('editMeas throws (does not silently lose data) if measurements changed underneath the open sheet', async ()=>{
  const ctx=editMeasCtx({'2026-09-01':{Pas:70}});
  ctx.editMeas('2026-09-24');
  ctx.meas['2026-09-05']={Pas:99}; // concurrent external change
  await assert.rejects(()=>ctx._save(new Map([['date','2026-09-24'],['Pas','80']])),/spremenile/);
});
