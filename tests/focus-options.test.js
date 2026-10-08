'use strict';
// Focus/training set entry: quick ± buttons and the exercise options menu
// (remove from this workout, disable in the program, restore). Synthetic data only.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const shell=fs.readFileSync(path.join(__dirname,'..','js/compact-shell.js'),'utf8');
function harness(extra={}){const ctx=vm.createContext(extra);vm.runInContext(shell,ctx);return ctx;}
function inner(ctx,name){const start=shell.indexOf('  function '+name+'('),end=shell.indexOf('\n  function ',start+1);assert.ok(start>=0&&end>start,'function '+name+' not found');vm.runInContext(shell.slice(start,end),ctx);}
function branch(act){const start=shell.indexOf(`else if(act==='${act}')`),end=shell.indexOf('\n      else if(',start+1);assert.ok(start>=0&&end>start,act+' branch found');return shell.slice(start,end);}

test('± buttons step kg by the kg step and reps by the reps step, within valid bounds',()=>{
  const {compactStepValueV34:step}=harness();
  assert.equal(step('60',1,2.5,'kg'),'62.5');
  assert.equal(step('60',-1,2.5,'kg'),'57.5');
  assert.equal(step('62,5',1,2.5,'kg'),'65','a decimal comma is understood');
  assert.equal(step('',1,2.5,'kg'),'2.5','an empty field starts from 0');
  assert.equal(step('1',-1,2.5,'kg'),'0','never below 0 kg');
  assert.equal(step('0.1',1,0.2,'kg'),'0.3','no floating point noise');
  assert.equal(step('60',1,undefined,'kg'),'62.5','default kg step is 2,5');
  assert.equal(step('8',1,1,'reps'),'9');
  assert.equal(step('1',-1,1,'reps'),'1','never below 1 rep');
  assert.equal(step('',1,1,'reps'),'1');
});

test('± buttons change only the current set field and never submit or save it',()=>{
  const code=branch('kg-step\'||act===\'reps-step');
  assert.match(code,/b\.closest\('form'\)\?\.querySelector\(`\[data-field="\$\{field\}"\],\[data-step-field="\$\{field\}"\]`\)/,'current set form or the plan sheet');
  assert.match(code,/input\.value!==''\?input\.value:input\.placeholder/,'an empty planned field steps from the shown suggestion');
  assert.match(code,/input\.dispatchEvent\(new Event\('input',\{bubbles:true\}\)\)/,'goes through the normal draft path');
  assert.match(code,/return;\}$/,'no re-render, no storage write');
  assert.doesNotMatch(code,/savePlanAction|safeSetRaw|commitStorageBatch|logValues/);
});

test('an exercise can be removed only while none of its sets is confirmed',()=>{
  const {compactCanRemoveExerciseV34:can}=harness();
  assert.equal(can([]),true);
  assert.equal(can([{kg:'60',reps:'8',done:false,manual:true}]),true);
  assert.equal(can([{kg:'60',reps:'8',done:true},{kg:'',reps:'',done:false}]),false);
  assert.equal(can(undefined),true);
});

function menuCtx(rows,locked=false){
  let opened=null;
  const ctx=harness({
    esc:s=>String(s),clock:n=>`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`,cw:1,
    activeExercise:()=>({key:'c1w1d0e0',name:'Bench',rows,rest:150}),
    navigationLocked:()=>locked,
    sheet:(title,body,save,ok,cancel,soloOk)=>{opened={title,body,ok,soloOk};}
  });
  inner(ctx,'exerciseMenu');ctx.exerciseMenu();return opened;
}

test('the exercise menu offers info, rest and both remove options with clear consequences',()=>{
  const menu=menuCtx([{kg:'',reps:'',done:false}]);
  assert.equal(menu.title,'Bench');assert.equal(menu.soloOk,true);assert.equal(menu.ok,'Zapri');
  for(const act of ['exercise-info','rest-settings','exercise-remove-week','exercise-disable'])assert.match(menu.body,new RegExp(`data-act="${act}" >`));
  assert.match(menu.body,/Počitek · 2:30/);
  assert.match(menu.body,/Samo teden 2\. Vrneš jo na seznamu vaj\./);
  assert.match(menu.body,/Vsi tedni\. Zgodovina ostane\./);
});

test('with confirmed sets both remove options are disabled and say why; during a workout only the program option is',()=>{
  const done=menuCtx([{kg:'60',reps:'8',done:true}]);
  assert.match(done.body,/data-act="exercise-remove-week" disabled/);
  assert.match(done.body,/data-act="exercise-disable" disabled/);
  assert.match(done.body,/Najprej jih razveljavi/);
  const running=menuCtx([{kg:'',reps:'',done:false}],true);
  assert.match(running.body,/data-act="exercise-remove-week" >/);
  assert.match(running.body,/data-act="exercise-disable" disabled/);
  assert.match(running.body,/Po koncu treninga: Program → stikalo\./);
});

test('removing from this workout re-checks confirmed sets after the confirmation and writes wt_hidden_ex verifiably',()=>{
  const code=branch('exercise-remove-week');
  const checks=code.match(/compactCanRemoveExerciseV34\(getSets\(\)\[e\.key\]\)/g)||[];
  assert.equal(checks.length,2,'checked before and after the confirm dialog');
  assert.ok(code.indexOf('await ask(')>code.indexOf('compactCanRemoveExerciseV34')&&code.lastIndexOf('compactCanRemoveExerciseV34')>code.indexOf('await ask('));
  assert.match(code,/hidden\[e\.key\]=true/);assert.match(code,/setHidden\(hidden,/);
  assert.match(shell,/function setHidden\(next,message\)\{if\(!safeSetRaw\('wt_hidden_ex',JSON\.stringify\(next\)\)\)throw Error/);
});

test('disabling in the program is blocked during a workout and keeps history',()=>{
  const code=branch('exercise-disable');
  assert.match(code,/^else if\(act==='exercise-disable'\)\{\n\s*guardProgram\(\);/);
  assert.match(code,/it\.programDisabled=true;if\(!saveDayLists\(all\)\)throw Error/);
  assert.doesNotMatch(code,/splice|delete all/,'the exercise stays in the day list');
});

test('removed exercises are listed on the workout screen with a way back',()=>{
  const ctx=harness({esc:s=>String(s),button:(act,label,cls,attrs)=>`<button data-act="${act}" class="${cls||''}" ${attrs||''}>${label}</button>`,
    hiddenHere:()=>[{it:{n:'Curl'},i:2,key:'c1w0d0e2'},{it:{n:'Dips'},i:3,key:'c1w0d0e3'}]});
  inner(ctx,'removedNote');
  const html=ctx.removedNote();
  assert.match(html,/Odstranjene iz tega treninga:<\/b> Curl, Dips/);
  assert.match(html,/data-act="day-unhide"/);
  const none=harness({esc:s=>String(s),button:()=>'',hiddenHere:()=>[]});inner(none,'removedNote');
  assert.equal(none.removedNote(),'');
  const back=harness();inner(back,'backInWorkoutText');
  assert.equal(back.backInWorkoutText(1),'Vaja je spet v treningu.');
  assert.equal(back.backInWorkoutText(2),'2 vaji sta spet v treningu.');
  assert.equal(back.backInWorkoutText(3),'3 vaje so spet v treningu.');
  assert.equal(back.backInWorkoutText(5),'5 vaj je spet v treningu.');
});

test('Focus shows the exercise name with an options button; the logger link opens the same menu',()=>{
  assert.match(shell,/<div class="cg-ftitle"><h1 class="cg-fname">\$\{esc\(active\.name\)\}<\/h1>\$\{button\('exercise-menu','⋯','cg-ficon cg-fmenu','aria-label="Možnosti vaje" aria-haspopup="dialog"'\)\}<\/div>/);
  assert.match(shell,/\$\{button\('exercise-menu','Možnosti vaje','cg-link','aria-haspopup="dialog"'\)\}<\/div>`;/);
  const css=fs.readFileSync(path.join(__dirname,'..','css/compact-v4.css'),'utf8');
  assert.match(css,/#cg-app \.cg-ftitle \.cg-fname\{[^}]*font-size:clamp\(34px,9\.8vw,42px\)/,'bigger than the old 31px');
  assert.match(css,/#cg-app\[data-focus="true"\] \.cg-message\{bottom:calc\(96px \+ env\(safe-area-inset-bottom,0px\)\);\}/,'toasts sit above the step bar');
});

test('an empty set field is not painted as an error before the user has touched it',()=>{
  const css=fs.readFileSync(path.join(__dirname,'..','css/compact-v4.css'),'utf8');
  assert.match(css,/#cg-app \.cg-setrow2 input:user-invalid\{border-color:var\(--cg-pending\);\}/);
  assert.doesNotMatch(css,/\.cg-setrow2 input:invalid/);
});

test('typing in Focus makes room for the keyboard and keeps the field visible',()=>{
  assert.match(shell,/root\.addEventListener\('focusin',event=>\{if\(!typingField\(event\.target\)\)return;root\.classList\.add\('cg-typing'\);setTimeout\(\(\)=>revealField\(event\.target\),250\);\}\);/);
  assert.match(shell,/window\.visualViewport\?\.addEventListener\('resize',\(\)=>revealField\(root\.getRootNode\(\)\.activeElement\)\);/);
  assert.match(shell,/function typingField\(el\)\{return !!\(el&&el\.matches\?\.\('input,select,textarea'\)&&el\.closest\('\.cg-fscroll'\)\);\}/);
  const css=fs.readFileSync(path.join(__dirname,'..','css/compact-v4.css'),'utf8');
  assert.match(css,/#cg-app\.cg-typing\[data-focus="true"\] \.cg-focus-steps/);
  assert.match(css,/#cg-app\.cg-typing\[data-focus="true"\] \.cg-fhead/);
});

test('a later set is planned in a sheet; saving keeps what was typed for the current set',()=>{
  const sheetFn=shell.slice(shell.indexOf('  function planSheet('),shell.indexOf('  function exerciseMenu('));
  assert.match(sheetFn,/if\(row\.done\|\|index>=e\.target\)return;/,'never for a confirmed set');
  assert.match(sheetFn,/data-step-field="kg"/);assert.match(sheetFn,/data-step-field="reps"/);
  assert.doesNotMatch(sheetFn,/data-field=/,'sheet fields never feed the current set draft');
  assert.match(sheetFn,/savePlanAction\(e,\{type:'edit',values:\[\{index,kg:data\.get\('kg'\)\?\?'',reps:data\.get\('reps'\)\?\?''\}\]\},false\)/);
  const save=shell.slice(shell.indexOf('  function savePlanAction('),shell.indexOf('\n  }\n',shell.indexOf('  function savePlanAction(')));
  assert.match(save,/const keep=draft\.get\(e\.key\);compactCommitPlanV27/);
  assert.match(save,/if\(keep&&pending&&!pending\.complete&&keep\.index===pending\.setIndex\)draft\.set\(e\.key,keep\);/);
  assert.match(shell,/else if\(act==='plan-edit'\)\{planSheet\(index\);return;\}/);
});
