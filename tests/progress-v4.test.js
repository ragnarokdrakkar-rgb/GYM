'use strict';
// Step 5: Napredek (Progress) redesign — weight verdict guidance, strength
// prev/next bounds, session chips, calendar chip wrapping, segmented order
// and the weight range buttons.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),shell=read('js/compact-shell.js'),compactUi=read('js/compact-ui.js');
function harness(extra={}){const ctx=vm.createContext(extra);vm.runInContext(compactUi,ctx);vm.runInContext(shell,ctx);return ctx;}
function inner(ctx,name){const start=shell.indexOf('  function '+name+'('),end=shell.indexOf('\n  function ',start+1);assert.ok(start>=0&&end>start,'function '+name+' not found');vm.runInContext(shell.slice(start,end),ctx);}
const button=(act,label,cls,attrs)=>`<button type="button" class="${cls||'cg-link'}" data-act="${act}" ${attrs||''}>${label}</button>`;

// weightVerdictV30 is a top-level pure function (outside the shell IIFE), so a
// plain vm context with just shell.js run in it exposes it directly.
function topCtx(){const ctx=vm.createContext({});vm.runInContext(shell,ctx);return ctx;}

test('weightVerdictV30: bulk in range is ok and names the guideline range',()=>{
  const ctx=topCtx(),r=ctx.weightVerdictV30('bulk',0.35);
  assert.equal(r.tone,'ok');
  assert.match(r.text,/raste/);assert.match(r.text,/0,35 kg na teden/);assert.match(r.text,/v cilju/);
  assert.match(r.text,/0,25.0,5 kg na teden/); // en dash between the range bounds
});
test('weightVerdictV30: bulk below the guideline range is a warn "počasneje"',()=>{
  const r=topCtx().weightVerdictV30('bulk',0.1);
  assert.equal(r.tone,'warn');assert.match(r.text,/počasneje od cilja/);
});
test('weightVerdictV30: bulk above the guideline range is a warn "hitreje"',()=>{
  const r=topCtx().weightVerdictV30('bulk',0.8);
  assert.equal(r.tone,'warn');assert.match(r.text,/hitreje od cilja/);
});
test('weightVerdictV30: cut in range is ok and says "pada"',()=>{
  const r=topCtx().weightVerdictV30('cut',-0.4);
  assert.equal(r.tone,'ok');assert.match(r.text,/pada/);assert.match(r.text,/v cilju/);
});
test('weightVerdictV30: cut losing weight slower than the goal (closer to 0) warns "počasneje"',()=>{
  const r=topCtx().weightVerdictV30('cut',-0.1);
  assert.equal(r.tone,'warn');assert.match(r.text,/počasneje od cilja/);
});
test('weightVerdictV30: cut losing weight faster than the goal warns "hitreje"',()=>{
  const r=topCtx().weightVerdictV30('cut',-1.0);
  assert.equal(r.tone,'warn');assert.match(r.text,/hitreje od cilja/);
});
test('weightVerdictV30: null weekly trend is a neutral explanation, not ok/warn',()=>{
  for(const v of [null,undefined,NaN]){
    const r=topCtx().weightVerdictV30('bulk',v);
    assert.equal(r.tone,'neutral');
    assert.match(r.text,/3 meritve/);assert.match(r.text,/7 dni/);
  }
});

test('compactStrengthNavV30: next/prev move by series order and clamp at the ends',()=>{
  const ctx=topCtx(),series=[{si:5},{si:1},{si:9}]; // si order is not sequential
  assert.equal(ctx.compactStrengthNavV30(series,5,'next'),1);
  assert.equal(ctx.compactStrengthNavV30(series,1,'next'),9);
  assert.equal(ctx.compactStrengthNavV30(series,9,'next'),9); // clamped at the end
  assert.equal(ctx.compactStrengthNavV30(series,9,'prev'),1);
  assert.equal(ctx.compactStrengthNavV30(series,5,'prev'),5); // clamped at the start
  assert.equal(ctx.compactStrengthNavV30(series,999,'prev'),999); // unknown si: unchanged
});

function progressCtx(overrides={}){
  const base={esc:s=>String(s),icon:()=>'',fmt:n=>String(n),button,clock:n=>String(n),
    state:{progress:'Teža',weightDays:30,date:'2026-09-24',session:-1,exercise:'',flagged:false,strength:'',point:-1},
    dateLabel:d=>d,shortDate:()=>'',getBW:()=>({}),getBWPhaseContext:e=>({type:'bulk',label:'Bulk',start:null,entries:e}),
    avg7d:()=>null,compactWeeklyWeightV27:()=>null,weightVerdictV30:()=>({tone:'neutral',text:'x'}),
    getSets:()=>({}),getSessions:()=>[],sessionExercisesForStatsV19:()=>[],compactDayColorV26:()=>'#fff',
    localStorage:{getItem:()=>null},sessionStatsV19:()=>({setCount:0}),
    getMeas:()=>({}),MEAS_FIELDS:['Prsa','Pas','Boki','L roka','D roka','L stegno','D stegno'],LS:{meas:'wt_m6'},dateKey:()=>'2026-09-24',
    ...overrides};
  return harness(base);
}

test('Segmented control order is Teža, Moč, Zgodovina',()=>{
  const ctx=progressCtx({strengthView:()=>'',historyView:()=>''});
  inner(ctx,'weightView');inner(ctx,'progress');
  const html=ctx.progress();
  const order=[...html.matchAll(/data-progress="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(order,['Teža','Moč','Zgodovina']);
});

test('Weight range buttons set state.weightDays to 30/90/0 and mark the active one selected',()=>{
  const ctx=progressCtx({state:{weightDays:90}});
  inner(ctx,'weightView');
  const html=ctx.weightView();
  const buttons=[...html.matchAll(/data-weight-range="(\d+)" class="([^"]*)"/g)];
  assert.deepEqual(buttons.map(m=>m[1]),['30','90','0']);
  assert.match(buttons.find(m=>m[1]==='90')[2],/selected/);
  assert.doesNotMatch(buttons.find(m=>m[1]==='30')[2],/selected/);
});

function historyCtx(sessions,overrides={}){
  const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const base={esc:s=>String(s),icon:()=>'',fmt:n=>String(n),button,dateKey,
    state:{date:'2026-09-24',session:-1,exercise:'',flagged:false},
    dateLabel:d=>d,compactDayColorV26:name=>'#'+String(name).length,
    getSets:()=>({}),getSessions:()=>sessions,
    sessionExercisesForStatsV19:s=>s.exercises||[],sessionStatsV19:()=>({setCount:1}),
    localStorage:{getItem:()=>null},
    ...overrides};
  const ctx=harness(base);
  inner(ctx,'selectDate');inner(ctx,'sessions');inner(ctx,'calendar');inner(ctx,'historyView');
  return ctx;
}

test('History session chips render only when more than one session shares the date, and carry the original si',()=>{
  const oneSession=[{date:'2026-09-24',dayName:'Push',startTime:'08:00',exercises:[]}];
  const html1=historyCtx(oneSession).historyView();
  assert.doesNotMatch(html1,/data-history-pick/);

  const twoSessions=[
    {date:'2026-09-24',dayName:'Push',startTime:'08:00',exercises:[]},
    {date:'2026-09-24',dayName:'Pull',startTime:'18:00',exercises:[]},
  ];
  const html2=historyCtx(twoSessions).historyView();
  const picks=[...html2.matchAll(/data-history-pick="(\d+)"/g)].map(m=>Number(m[1]));
  assert.deepEqual(picks,[0,1]); // original session index (si), not a re-numbered position
  assert.match(html2,/08:00 · Push/);assert.match(html2,/18:00 · Pull/);
});

test('Calendar day cells never use a clipping/ellipsis class, and show "+N" only past two sessions',()=>{
  const names=['Push A','Pull A','Legs','Push B'];
  const sessions=names.map(n=>({date:'2026-09-24',dayName:n,startTime:'08:00',exercises:[]}));
  const ctx=historyCtx(sessions,{state:{date:'2026-09-24',session:-1,exercise:'',flagged:false,month:8,year:2026}});
  const html=ctx.calendar();
  assert.doesNotMatch(html,/text-overflow/);assert.doesNotMatch(html,/class="[^"]*clip/);
  assert.match(html,/cg-cal-more">\+2</);
  assert.equal((html.match(/cg-cal-name/g)||[]).length,2);
});

test('Calendar marks today with a "today" class distinct from "selected"',()=>{
  const now=new Date(),todayKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const ctx=historyCtx([],{state:{date:'1999-01-01',session:-1,exercise:'',flagged:false,month:now.getMonth(),year:now.getFullYear()}});
  const html=ctx.calendar();
  assert.match(html,new RegExp(`data-date="${todayKey}" class="[^"]*today`));
  assert.doesNotMatch(html,new RegExp(`data-date="${todayKey}" class="[^"]*selected`));
});
