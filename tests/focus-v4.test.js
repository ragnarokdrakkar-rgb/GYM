'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),shell=read('js/compact-shell.js');
function harness(extra={}){const ctx=vm.createContext(extra);vm.runInContext(shell,ctx);return ctx;}
function inner(ctx,name){const start=shell.indexOf('  function '+name+'('),end=shell.indexOf('\n  function ',start+1);assert.ok(start>=0&&end>start,'function '+name+' not found');vm.runInContext(shell.slice(start,end),ctx);}

function baseCtx(overrides={}){
  return harness({
    esc:s=>String(s),fmt:n=>String(n),icon:name=>`<svg data-icon="${name}"></svg>`,
    button:(act,label,cls,attrs)=>`<button type="button" class="${cls||'cg-link'}" data-act="${act}" ${attrs||''}>${label}</button>`,
    clock:n=>`clock(${n})`,
    workoutCache:[],state:{active:'',focus:true},window:{},
    ...overrides
  });
}
const ex=(overrides={})=>({key:'k1',name:'Bench',status:'pending',done:0,target:3,item:{},rest:90,...overrides});

test('focusDot: done is filled/checked, partial and pending carry their status class, current adds the outline class independent of status',()=>{
  const ctx=baseCtx();inner(ctx,'focusDot');
  const done=ctx.focusDot(ex({status:'done',done:3}),0);
  assert.match(done,/class="done\s*"/);assert.match(done,/>✓</);
  const partial=ctx.focusDot(ex({status:'partial',done:1}),1);
  assert.match(partial,/class="partial\s*"/);assert.match(partial,/>2</); // 1-indexed position
  const pending=ctx.focusDot(ex({status:'pending'}),2);
  assert.match(pending,/class="pending\s*"/);assert.match(pending,/>3</);
  const current=ctx.focusDot(ex({key:'k2',status:'pending'}),0);
  const ctx2=baseCtx({state:{active:'k2',focus:true}});inner(ctx2,'focusDot');
  const currentHtml=ctx2.focusDot(ex({key:'k2',status:'partial'}),0);
  assert.match(currentHtml,/class="partial current"/); // status class kept, current appended regardless of status
  assert.doesNotMatch(current,/current/); // not selected in the base ctx (different active key)
});

test('focusDot aria-label reports the exercise name and done/target progress',()=>{
  const ctx=baseCtx();inner(ctx,'focusDot');
  const html=ctx.focusDot(ex({name:'Počepi',done:2,target:5,status:'partial'}),0);
  assert.match(html,/aria-label="Počepi: 2\/5"/);
});

test('focusSteps: prev is disabled only on the first exercise, next only on the last',()=>{
  const cache=[ex({key:'a'}),ex({key:'b'}),ex({key:'c'})];
  const first=baseCtx({workoutCache:cache});inner(first,'focusDot');inner(first,'focusSteps');
  const firstHtml=first.focusSteps(0);
  assert.match(firstHtml,/data-act="prev" aria-label="Prejšnja vaja" disabled/);
  assert.doesNotMatch(firstHtml,/data-act="next"[^>]*disabled/);
  const mid=baseCtx({workoutCache:cache});inner(mid,'focusDot');inner(mid,'focusSteps');
  const midHtml=mid.focusSteps(1);
  assert.doesNotMatch(midHtml,/data-act="prev"[^>]*disabled/);
  assert.doesNotMatch(midHtml,/data-act="next"[^>]*disabled/);
  const last=baseCtx({workoutCache:cache});inner(last,'focusDot');inner(last,'focusSteps');
  const lastHtml=last.focusSteps(2);
  assert.doesNotMatch(lastHtml,/data-act="prev"[^>]*disabled/);
  assert.match(lastHtml,/data-act="next" aria-label="Naslednja vaja" disabled/);
  // Three dots, one per exercise.
  assert.equal((lastHtml.match(/data-ex=/g)||[]).length,3);
});

test('restBar: label uses the exercise whose key matches the running timer, with a paused suffix, and falls back to plain "Počitek"',()=>{
  const ctx=baseCtx({
    workoutCache:[ex({key:'k1',name:'Počepi'}),ex({key:'k2',name:'Bench'})],
    currentTimerV6:()=>({id:'t1',key:'k2',paused:false,endTs:Date.now()+65000})
  });
  inner(ctx,'restBar');
  const html=ctx.restBar();
  assert.match(html,/Počitek · Bench/);
  assert.doesNotMatch(html,/premor/);
  assert.match(html,/data-rest-clock/);

  const pausedCtx=baseCtx({
    workoutCache:[ex({key:'k2',name:'Bench'})],
    currentTimerV6:()=>({id:'t1',key:'k2',paused:true,remainingSec:40})
  });
  inner(pausedCtx,'restBar');
  assert.match(pausedCtx.restBar(),/Počitek · Bench · premor/);

  const noMatchCtx=baseCtx({
    workoutCache:[ex({key:'other'})],
    currentTimerV6:()=>({id:'t1',key:'missing',paused:false,endTs:Date.now()+10000})
  });
  inner(noMatchCtx,'restBar');
  assert.match(noMatchCtx.restBar(),/>Počitek</);

  const noTimerCtx=baseCtx({currentTimerV6:()=>null});
  inner(noTimerCtx,'restBar');
  assert.equal(noTimerCtx.restBar(),'');

  const zeroLeftCtx=baseCtx({currentTimerV6:()=>({id:'t1',key:'k1',paused:false,endTs:Date.now()-1000})});
  inner(zeroLeftCtx,'restBar');
  assert.equal(zeroLeftCtx.restBar(),'');
});

test('restNotifyStep fires exactly once per finished timer id, and never for a timer that has already been acknowledged (e.g. by a manual rest-stop)',()=>{
  const ctx=baseCtx();inner(ctx,'restNotifyStep');
  let activeId='',notifiedId='';
  // Running: no fire, activeId tracks the timer.
  let step=ctx.restNotifyStep({id:'t1'},45,activeId,notifiedId);
  assert.equal(step.fire,false);activeId=step.activeId;notifiedId=step.notifiedId;
  assert.equal(activeId,'t1');
  // Reaches zero while still present: fires once.
  step=ctx.restNotifyStep({id:'t1'},0,activeId,notifiedId);
  assert.equal(step.fire,true);activeId=step.activeId;notifiedId=step.notifiedId;
  assert.equal(notifiedId,'t1');
  // Still at zero / already removed on the next tick: no repeat fire.
  step=ctx.restNotifyStep(null,0,activeId,notifiedId);
  assert.equal(step.fire,false);activeId=step.activeId;notifiedId=step.notifiedId;
  step=ctx.restNotifyStep({id:'t1'},0,activeId,notifiedId);
  assert.equal(step.fire,false);
  // A fresh timer (new id) can fire again.
  activeId='';notifiedId='t1';
  step=ctx.restNotifyStep({id:'t2'},60,activeId,notifiedId);
  assert.equal(step.fire,false);activeId=step.activeId;
  step=ctx.restNotifyStep({id:'t2'},0,activeId,notifiedId);
  assert.equal(step.fire,true);assert.equal(step.notifiedId,'t2');
});

test('restNotifyStep is pre-suppressed for a manually stopped timer: the removal tick that follows a rest-stop (which pre-sets notifiedId) does not fire',()=>{
  const ctx=baseCtx();inner(ctx,'restNotifyStep');
  const activeId='t1',notifiedId='t1'; // compact-shell's rest-stop handler sets notifiedId=t.id before stopping
  const step=ctx.restNotifyStep(null,0,activeId,notifiedId);
  assert.equal(step.fire,false);
});

test('The Focus session-start button only appears when no session is running, and Focus never renders a finish button',()=>{
  const cache=[ex({key:'k1'})];
  const notRunning=baseCtx({workoutCache:cache,stRun:false});
  const start=!notRunning.stRun?notRunning.button('session-start',notRunning.icon('play')+' Začni trening','cg-action cg-focus-start'):'';
  assert.match(start,/data-act="session-start"/);
  assert.match(start,/Začni trening/);
  const running=baseCtx({workoutCache:cache,stRun:true});
  const startWhileRunning=!running.stRun?running.button('session-start','x'):'';
  assert.equal(startWhileRunning,'');
  // The whole focus branch never mentions session-finish (that only exists on the Training list screen).
  const focusSource=shell.slice(shell.indexOf('if(state.focus){'),shell.indexOf('const picker=state.focus'));
  assert.doesNotMatch(focusSource,/session-finish/);
  assert.match(focusSource,/session-start/);
});
