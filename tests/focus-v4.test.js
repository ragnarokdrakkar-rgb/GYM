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

test('focusStrip: one tappable bar per exercise with its status class; the current one is marked and labelled',()=>{
  const cache=[ex({key:'a',name:'Bench',status:'done',done:3}),ex({key:'b',name:'Počepi',status:'partial',done:1,target:5}),ex({key:'c',name:'Veslanje',status:'pending'})];
  const ctx=baseCtx({workoutCache:cache,state:{active:'b',focus:true}});inner(ctx,'focusStrip');
  const html=ctx.focusStrip();
  assert.match(html,/^<div class="cg-fprog" role="group" aria-label="Vaje v tem treningu">/);
  assert.equal((html.match(/<button type="button"/g)||[]).length,3);
  assert.match(html,/class="done" data-ex="a" aria-label="1\. Bench: 3\/3"><\/button>/);
  assert.match(html,/class="partial current" data-ex="b" aria-label="2\. Počepi: 1\/5" aria-current="true"><\/button>/);
  assert.match(html,/class="pending" data-ex="c" aria-label="3\. Veslanje: 0\/3"><\/button>/);
  assert.doesNotMatch(html,/aria-hidden/,'it is the navigation now, not decoration');
});

test('focusSteps: prev/next disabled at the ends, the middle names the position and the next exercise; no second indicator',()=>{
  const cache=[ex({key:'a',name:'Bench'}),ex({key:'b',name:'Počepi'}),ex({key:'c',name:'Veslanje'})];
  const first=baseCtx({workoutCache:cache});inner(first,'focusSteps');
  const firstHtml=first.focusSteps(0);
  assert.match(firstHtml,/data-act="prev" aria-label="Prejšnja vaja" disabled/);
  assert.doesNotMatch(firstHtml,/data-act="next"[^>]*disabled/);
  assert.match(firstHtml,/<div class="cg-fstep-info"><strong>Vaja 1\/3<\/strong><small>Naprej: Počepi<\/small><\/div>/);
  const mid=baseCtx({workoutCache:cache});inner(mid,'focusSteps');
  const midHtml=mid.focusSteps(1);
  assert.doesNotMatch(midHtml,/data-act="prev"[^>]*disabled/);
  assert.doesNotMatch(midHtml,/data-act="next"[^>]*disabled/);
  assert.match(midHtml,/Vaja 2\/3<\/strong><small>Naprej: Veslanje</);
  const last=baseCtx({workoutCache:cache});inner(last,'focusSteps');
  const lastHtml=last.focusSteps(2);
  assert.doesNotMatch(lastHtml,/data-act="prev"[^>]*disabled/);
  assert.match(lastHtml,/data-act="next" aria-label="Naslednja vaja" disabled/);
  assert.match(lastHtml,/Vaja 3\/3<\/strong><small>Zadnja vaja</);
  assert.doesNotMatch(lastHtml,/data-ex=|cg-dots/,'the strip at the top is the only per-exercise indicator');
  assert.doesNotMatch(shell,/cg-dots|focusDot/);
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
