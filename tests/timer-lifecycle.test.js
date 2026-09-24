'use strict';
// Bug A (rest timer lifecycle) investigation regression coverage.
//
// The app defines THREE generations of startT/stopT/tickTimerV6/adjustTimerV6/
// pauseResumeTimerV6/restoreTimer in src/app/v6-core.js: a bare function
// declaration in src/app/workout-runtime.js (legacy, operates on the
// `tb-<key>`/`tc-<key>` DOM bar and returns early if that DOM is missing) and
// two later plain-assignment overrides inside v6-core.js (the "V6" and final
// "V10" versions, which operate on LS_TIMER + renderGlobalTimerV10 and do not
// depend on the legacy bar DOM at all).
//
// Because js/app.js is one concatenated script, all function DECLARATIONS
// hoist first (workout-runtime.js's `function startT(){}` wins the hoist
// since v6-core.js only ever uses plain assignment `startT=function(){}`),
// but hoisting only sets the INITIAL binding. Execution then proceeds
// top-to-bottom over the concatenated file; because v6-core.js is
// concatenated *before* workout-runtime.js (see build-app-bundle.cjs's
// `files` order), v6-core.js's assignments run and overwrite the global
// `startT` (etc.), and workout-runtime.js's `function startT(){}` never
// re-executes at its textual position (a function declaration only matters
// during hoisting, not when control flow reaches it). So the *last*
// assignment in v6-core.js (the V10 version) is what actually runs at
// runtime, and the legacy workout-runtime.js body is dead code.
//
// This is fragile: reordering `files` in build-app-bundle.cjs, or turning
// the legacy definition into a `const`/`let` (which would throw on
// redeclaration) or into an assignment placed after v6-core.js in the
// concatenation, would silently swap in the legacy timer implementation
// (which can leave LS_TIMER (`wt_active_timer`) in localStorage forever,
// per its `if(!bar||!cnt)return` early exit, since the shadow-DOM compact UI
// never creates `tb-<key>`/`tc-<key>` elements). Guard the invariant here.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('build-app-bundle.cjs concatenates v6-core.js before workout-runtime.js', () => {
  const buildScript = read('tools/build-app-bundle.cjs');
  const order = [...buildScript.matchAll(/'([a-z0-9-]+)'/g)].map(m => m[1]);
  const coreIdx = order.indexOf('v6-core');
  const runtimeIdx = order.indexOf('workout-runtime');
  assert.ok(coreIdx >= 0 && runtimeIdx >= 0, 'both files are part of the bundle file list');
  assert.ok(coreIdx < runtimeIdx, 'v6-core.js must be concatenated before workout-runtime.js so its startT/stopT overrides run last and win, not the legacy DOM-bar-bound versions');
});

test('the V10 (final) startT/stopT/tickTimerV6 overrides are the last ones assigned in the bundle, so they are what actually runs', () => {
  const bundle = read('js/app.js');
  // A signature unique to each V10-generation body (from the block inside the
  // second v6-core.js IIFE), so we can confirm the LAST assignment for each
  // name is really that generation and not e.g. a later accidental reassignment.
  const v10Signature = {
    startT: 'safeSeconds',
    stopT: 'timerFinishedUntilV10=0',
    tickTimerV6: 'renderGlobalTimerV10()',
    adjustTimerV6: 'nativeRescheduleV10(remaining)',
    pauseResumeTimerV6: 'nativeRescheduleV10(remaining)',
    restoreTimer: 'remainingTimerSecondsV10(timer)<=0',
  };
  for (const name of ['startT', 'stopT', 'tickTimerV6', 'adjustTimerV6', 'pauseResumeTimerV6', 'restoreTimer']) {
    const assignments = [...bundle.matchAll(new RegExp('(?:^|[^.\\w])' + name + '\\s*=\\s*function', 'g'))];
    assert.ok(assignments.length >= 1, `${name} should have at least one plain-assignment override in v6-core.js (found ${assignments.length})`);
    const last = assignments[assignments.length - 1];
    const bodyStart = last.index + last[0].length;
    const nextFnBoundary = bundle.indexOf('\n', bundle.indexOf('};', bodyStart));
    const body = bundle.slice(bodyStart, nextFnBoundary > 0 ? nextFnBoundary : bodyStart + 4000);
    assert.ok(body.includes(v10Signature[name]), `the LAST assignment to ${name} in the bundle must be the V10 body (expected to contain "${v10Signature[name]}")`);
  }
});

test('the legacy startT/stopT bodies (workout-runtime.js) are DOM-bar-bound and would leak wt_active_timer forever if ever reachable — documented so a future refactor cannot silently reintroduce them', () => {
  const legacy = read('src/app/workout-runtime.js');
  assert.match(legacy, /function startT\(key,secs\)\{/);
  assert.match(legacy, /if\(!bar\|\|!cnt\)return;/, 'legacy startT must still early-return without scheduling a tick when the legacy tb-/tc- bar DOM is absent (compact-shell never creates it)');
  assert.match(legacy, /localStorage\.setItem\(LS_TIMER,JSON\.stringify\(\{key,endTs\}\)\);/, 'legacy startT still writes LS_TIMER before its early return, which is why it must never be the active implementation');
});

test('the active (V10) startT/stopT do not gate writing/removing LS_TIMER on any tb-/tc- legacy bar DOM existing', () => {
  const core = read('src/app/v6-core.js');
  const v10Start = core.indexOf('startT=function(key,seconds){');
  const v10StopEnd = core.indexOf('adjustTimerV6=function(delta){');
  assert.ok(v10Start > 0 && v10StopEnd > v10Start);
  const block = core.slice(v10Start, v10StopEnd);
  // The legacy bug pattern is an early return that skips saveTimerV6/
  // localStorage.removeItem(LS_TIMER) when the bar DOM is absent, e.g.
  // `if(!bar||!cnt)return;`. V10 may still *reference* tb-/tc- for cosmetic
  // classList cleanup (guarded by `if(bar)`), but must never gate LS_TIMER on it.
  assert.doesNotMatch(block, /if\(!bar[^)]*\)\s*return/, 'V10 must not early-return (skipping LS_TIMER writes/removal) when the legacy bar DOM is missing');
  assert.match(block, /saveTimerV6\(timer\);/, 'V10 startT must unconditionally persist LS_TIMER');
  assert.match(block, /localStorage\.removeItem\(LS_TIMER\);/, 'V10 stopT must unconditionally clear LS_TIMER');
});

test('V10 finishTimerV10 always removes LS_TIMER on natural expiry, independent of document.hidden or which page is shown', () => {
  const core = read('src/app/v6-core.js');
  const start = core.indexOf('function finishTimerV10(timer,foregroundAlert){');
  const end = core.indexOf('tickTimerV6=function(timer){');
  assert.ok(start > 0 && end > start);
  const body = core.slice(start, end);
  assert.match(body, /localStorage\.removeItem\(LS_TIMER\)/);
  // alertEnd (beep/vibrate/native notification UI) is intentionally gated on
  // foreground+visible, but the LS_TIMER cleanup itself must run before that
  // gate is even checked, so it is unconditional.
  const removeIdx = body.indexOf('localStorage.removeItem(LS_TIMER)');
  const foregroundGuardIdx = body.indexOf('if(foregroundAlert');
  assert.ok(removeIdx >= 0 && foregroundGuardIdx > removeIdx, 'LS_TIMER cleanup must happen before the foreground/hidden-gated alert branch, not inside it');
});

test('restoreTimer (V10) also clears an already-expired LS_TIMER on load/visibility-return, so a ghost timer record left by a killed/backgrounded app cannot persist forever', () => {
  const core = read('src/app/v6-core.js');
  const start = core.indexOf('restoreTimer=function(){');
  const end = core.indexOf('const persistSessionDraftV10Base');
  assert.ok(start > 0 && end > start);
  const body = core.slice(start, end);
  assert.match(body, /remainingTimerSecondsV10\(timer\)<=0/);
  assert.match(body, /localStorage\.removeItem\(LS_TIMER\)/);
});
