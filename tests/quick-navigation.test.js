'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),shell=read('js/compact-shell.js');
function harness(extra={}){const ctx=vm.createContext(extra);vm.runInContext(shell,ctx);return ctx;}
function inner(ctx,name){const start=shell.indexOf('  function '+name+'('),end=shell.indexOf('\n  function ',start+1);assert.ok(start>=0&&end>start);vm.runInContext(shell.slice(start,end),ctx);}
const rows=(n,done=true)=>Array.from({length:n},()=>({done,kg:60,reps:8}));
const params=()=>({cycle:2,week:1,dayIndex:5,entries:[{key:'c2w1d5e0',target:3}],sets:{},records:[],activeContext:null});
const saved=extra=>({cycle:2,weekNum:2,dayIdx:5,date:'2026-09-13',exercises:[{name:'Bench',sets:rows(1)}],...extra});

test('Quick workout status ignores planned numbers and distinguishes partial from complete sets',()=>{
  const ctx=harness(),p=params();p.sets.c2w1d5e0=rows(3,false);
  assert.equal(ctx.compactDayProgressV28(p).status,'pending');
  p.sets.c2w1d5e0[0].done=true;assert.equal(ctx.compactDayProgressV28(p).status,'partial');
  p.sets.c2w1d5e0=rows(4);const result=ctx.compactDayProgressV28(p);
  assert.equal(result.status,'done');assert.equal(result.done,3);assert.equal(result.total,3);
});
test('Quick completion only borrows a saved workout from the exact cycle, week and original day index',()=>{
  const ctx=harness(),p=params();
  for(const record of [saved({cycle:1}),saved({weekNum:1}),saved({dayIdx:0}),saved({weekIdx:0}),saved({dayIdx:undefined})]){
    p.records=[record];assert.equal(ctx.compactDayProgressV28(p).completed,false);
  }
  p.records=[saved({weekIdx:1})];assert.equal(ctx.compactDayProgressV28(p).completed,true);
});
test('An explicitly finished nonempty workout stays done after editing or repeating its plan',()=>{
  const ctx=harness(),p=params();p.records=[saved(),saved({date:'2026-09-12'})];p.entries[0].target=8;
  const result=ctx.compactDayProgressV28(p);assert.equal(result.completed,true);assert.equal(result.recordCount,2);assert.equal(result.date,'2026-09-13');
  const week=ctx.compactWeekProgressV28([result]);assert.equal(week.done,1);assert.equal(week.total,1);
});
test('Empty, planned-only and warmup-only saved workouts do not earn completion',()=>{
  const ctx=harness(),p=params();
  for(const record of [saved({exercises:[],totals:{doneSets:0}}),saved({exercises:[{sets:rows(3,false)}]}),saved({exercises:[{sets:[{done:true,type:'warmup'}]}]}),saved({exercises:[{sets:[{done:true,warm:true}]}]})]){
    p.records=[record];assert.equal(ctx.compactDayProgressV28(p).completed,false);
  }
  p.records=[saved({exercises:undefined,setCount:2})];assert.equal(ctx.compactDayProgressV28(p).completed,true);
});
test('An active repeat is blue while previous finished workout remains in the weekly count',()=>{
  const ctx=harness(),p=params();p.records=[saved()];p.activeContext={cycle:2,weekIdx:1,dayIdx:5};
  const result=ctx.compactDayProgressV28(p);assert.equal(result.status,'active');assert.equal(result.completed,true);
  const week=ctx.compactWeekProgressV28([result]);assert.equal(week.done,1);assert.equal(week.partial,0);
  p.records=[];assert.equal(ctx.compactWeekProgressV28([ctx.compactDayProgressV28(p)]).partial,1);
});
test('No active exercises means no fabricated completion or next-workout suggestion',()=>{
  const ctx=harness(),p=params();p.entries=[];p.records=[saved()];const result=ctx.compactDayProgressV28(p);
  assert.equal(result.completed,false);assert.equal(ctx.compactNextDayV28([result]),null);
  assert.equal(ctx.compactWeekProgressV28([]).status,'pending');
});
test('Next workout prioritizes partially completed days and retains nonconsecutive original indexes',()=>{
  const ctx=harness(),days=[{dayIndex:0,total:3,completed:true,status:'done'},{dayIndex:2,total:3,completed:false,status:'pending'},{dayIndex:5,total:3,completed:false,status:'partial'}];
  assert.equal(ctx.compactNextDayV28(days).dayIndex,5);days[2].completed=true;
  assert.equal(ctx.compactNextDayV28(days).dayIndex,2);days[1].completed=true;
  assert.equal(ctx.compactNextDayV28(days),null);assert.equal(ctx.compactWeekProgressV28(days).status,'done');
});
test('Week overview excludes disabled/deleted days and uses canonical hidden/disabled exercise filtering and targets',()=>{
  const meta={days:[{name:'Push A'},{name:'Inactive',active:false},{name:'Deleted',deleted:true},{name:'Pull A'}]},sets={c2w1d0e0:rows(3),c2w1d0e2:rows(1)},ctx=harness({getProgramMetaV6:()=>meta,getCyc:()=>({num:2}),getSets:()=>sets,getSessions:()=>[],stRun:false,window:{},cw:1,PROG:{weeks:[{sM:5,sA:4},{sM:5,sA:4},{},{dl:true}]},getHiddenEx:()=>({c2w1d0e3:true}),getSetCounts:()=>({c2w1d0e2:-1}),dayListFor:di=>di===0?[{n:'Bench',progMode:'531'},{n:'Off',programDisabled:true},{n:'Row',targetSets:2},{n:'Hidden'}]:[{n:'Pull up',targetSets:3}]});
  const model=read('src/app/workout-model.js');vm.runInContext(model.slice(model.indexOf('// Get extra sets'),model.indexOf('// Ali so v danem dnevu')),ctx);
  inner(ctx,'weekOverview');const result=ctx.weekOverview(1);
  assert.deepEqual(Array.from(result.days,d=>d.dayIndex),[0,3]);assert.equal(result.done,1);assert.equal(result.total,2);assert.equal(result.days[0].total,4);
  assert.equal(ctx.weekOverview(0).done,0);
});
test('Direct selection uses the guarded existing week/day setters and preserves the Program page',()=>{
  const calls=[],state={page:'Trening',focus:true},ctx=harness({state,cw:0,navigationLocked:()=>false,getProgramMetaV6:()=>({days:[{}, {active:false},{},{deleted:true}]}),PROG:{weeks:[{},{},{},{}]},setWeek:w=>calls.push(['week',w]),showDay:d=>calls.push(['day',d]),setGymMode:v=>calls.push(['focus',v])});
  inner(ctx,'selectQuickWorkout');ctx.selectQuickWorkout(1,2);
  assert.deepEqual(calls,[['week',1],['focus',false],['day',2]]);assert.equal(state.day,2);assert.equal(state.focus,false);
  calls.length=0;state.page='Program';ctx.selectQuickWorkout(2,0,true);assert.deepEqual(calls,[['week',2]]);assert.equal(state.page,'Program');
  for(const [w,d] of [[0,1],[0,3],[9,0],[0,-1]])assert.throws(()=>ctx.selectQuickWorkout(w,d));
  ctx.navigationLocked=()=>true;assert.throws(()=>ctx.selectQuickWorkout(0,0),/aktivni trening/);
});
test('Quick navigation locks during running, saved-pending and recovery sessions',()=>{
  const ctx=harness({stRun:false,window:{},LS_SESS:'session',localStorage:{getItem:()=>null}});inner(ctx,'navigationLocked');
  assert.equal(ctx.navigationLocked(),false);ctx.stRun=true;assert.equal(ctx.navigationLocked(),true);ctx.stRun=false;ctx.window.v6RecoveryPending=true;assert.equal(ctx.navigationLocked(),true);ctx.window.v6RecoveryPending=false;ctx.localStorage.getItem=()=>'{pending}';assert.equal(ctx.navigationLocked(),true);
});
test('Quick buttons replace the collapsed selectors in Training and Program, while Focus stays compact',()=>{
  assert.doesNotMatch(shell,/data-workout-day|<select data-week|cg-workout-picker/);
  assert.match(shell,/const picker=state.focus\?'':quickNavigation\(\)/);assert.match(shell,/quickNavigation\(true\)/);assert.match(shell,/data-quick-day="\$\{d.dayIndex\}"/);assert.match(shell,/cikel \$\{getCyc\(\)\.num\}/);assert.match(shell,/Teden \$\{cw\+1\}/);
  assert.match(shell,/aria-pressed="\$\{d.dayIndex===selected\}"/);assert.match(read('css/compact-shell.css'),/\.cg-quick-days \.partial small/);
});
test('Startup restores sixth and seventh active workout days instead of silently falling back to day one',()=>{
  const source=read('src/app/main.js'),start=source.indexOf('const _lastDay='),end=source.indexOf('try{const _av',start),block=source.slice(start,end),days=Array.from({length:7},()=>({active:true}));days[1].active=false;days[3].deleted=true;
  for(const [savedDay,expected] of [[0,0],[5,5],[6,6],[1,0],[3,0],[-1,0],[7,0],['',0]]){
    const ctx=vm.createContext({localStorage:{getItem:()=>String(savedDay)},_lastWeek:NaN,getProgramMetaV6:()=>({days}),activeDayIndicesV6:()=>[0,2,4,5,6]});
    assert.equal(vm.runInContext(block+'\n_initDay;',ctx),expected);
  }
});
test('Seven-day quick navigation wraps in four columns, exposes original indexes and handles empty programs honestly',()=>{
  let days=Array.from({length:7},(_,dayIndex)=>({dayIndex,name:'Day '+dayIndex,total:3,completed:false,status:'pending'}));
  const ctx=harness({PROG:{weeks:[{},{},{},{}]},cw:0,cd:6,state:{day:6},getActiveProfile:()=> 'cut',navigationLocked:()=>false,getProgramMetaV6:()=>({days:Array.from({length:7},()=>({active:true,deleted:false}))}),weekOverview:week=>({cycle:3,week,days,done:0,total:days.length,partial:0,status:'pending'}),esc:s=>s,icon:()=>'',dateLabel:s=>s,button:(act,label,cls,attrs)=>`<button data-act="${act}" ${attrs||''}>${label}</button>`});
  inner(ctx,'weekLabel');inner(ctx,'chipWord');inner(ctx,'chip');inner(ctx,'quickNavigation');const html=ctx.quickNavigation();
  assert.match(html,/--day-columns:4/);assert.match(html,/data-quick-day="6"/);assert.match(html,/Teden 1 · Moč/);assert.match(html,/Teden 2 · Kontrola/);
  days=[];const empty=ctx.quickNavigation();assert.match(empty,/Dodaj aktivne vaje/);assert.doesNotMatch(empty,/Vsi aktivni treningi tega tedna so opravljeni/);
});
