'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const shell=fs.readFileSync(path.join(__dirname,'..','js/compact-shell.js'),'utf8');
test('Confirming a set starts the workout before logging, reusing the session toggle and keeping typed values',()=>{
  const start=shell.indexOf("if(form.hasAttribute('data-log-form'))"),block=shell.slice(start,shell.indexOf('render();}',start));
  const values=block.indexOf('v=valuesFor(e)'),toggle=block.indexOf('await toggleSess()'),log=block.indexOf('logValues(');
  assert.ok(values>0&&toggle>values&&log>toggle,'values are read, then the session starts, then the set is logged');
  assert.match(block,/if\(window\.v6RecoveryPending\)\{showRecovery\(\);return;\}/,'pending recovery opens the recovery sheet and logs nothing');
  assert.match(block,/if\(!stRun\)throw Error/,'a failed start never logs a set');
  assert.doesNotMatch(block,/draft\.clear\(\)/,'auto-start must not clear the typed values');
  assert.match(block,/Trening začet · serija zabeležena\./);
  assert.match(block,/if\(busy\)return;/);
});
test('Planned-row edits never start a workout',()=>{
  const change=shell.slice(shell.indexOf("if(el.hasAttribute('data-plan-index'))"),shell.indexOf("if(el.hasAttribute('data-history-date'))"));
  assert.doesNotMatch(change,/toggleSess/);
});
