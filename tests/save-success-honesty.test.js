'use strict';
// Bug B (success only shown for a verified write) — audit + regression guards.
//
// Every user-facing success notify() in js/compact-shell.js was audited
// against the write it follows. Two mechanisms make a shown "success" honest:
//
//   (A) commitStorageBatch(...) (js/core/state-storage.js): atomic, journals
//       the previous values first, and THROWS if any key fails verification
//       (localStorage.getItem(key)!==String(value)) or if a write is already
//       pending. A throw short-circuits the calling function before it ever
//       reaches its notify(success) call, and is caught by either the sheet()
//       submit handler (shows the error inline in the dialog, dialog stays
//       open, no success shown) or the root click handler (shows an error
//       toast). This is the mechanism behind: logging history corrections
//       (commitHistory), planned-set add/remove/edit (compactCommitPlanV27),
//       editWeight, editHistoryMeta, addHistorySet, program-toggle's
//       afterProgram callers that use commitStorageBatch directly (cycle-new,
//       phase-start, phase-date, editDay, data-advanced-form,
//       data-equipment-form), and addExercise's mutateDayList path.
//
//   (B) safeSetRaw(...)/saveDayLists(...) (returns a boolean instead of
//       throwing): every call site that can show a success message checks
//       the boolean explicitly and throws its own Error when it is false,
//       e.g. `if(!safeSetRaw(...))throw Error('... ni shranjen.')`. This is
//       the mechanism behind editRestSheet's custom-rest save, the 5/3/1
//       training-max save ('tm'), and program.js's saveDayLists-based edits
//       (editProgram, program-toggle).
//
// A third path, WTFocusPatchV10.logValues (src/app/v6-core.js, the log-a-set
// flow driven by the compact UI's set-log form), does its underlying writes
// via sv()/tgSet() (which call the boolean-returning saveSets()), but does
// NOT check each individual return value; instead it re-checks
// storageHasPendingWrites() immediately before reporting success (both in
// logCompactSetV10's own toast, and in logValues' own returned bool that
// js/compact-shell.js's data-log-form submit handler uses to pick between
// "Serija zabeležena." and "Serija ni shranjena."). Since safeSetRaw always
// records a failed write into pendingStorageWrites, this check is equivalent
// to checking every individual write and is confirmed correct by Playwright
// (see task report): injecting a persistent localStorage.setItem failure
// during "log a set" shows "Serija ni shranjena. Preveri vnos." (error) and
// the header shows "Ni shranjeno", and wt_s6 is left byte-for-byte unchanged
// — never "Serija zabeležena." with silently-dropped data.
//
// These tests guard the load-bearing checks above against silent regression
// (e.g. someone "simplifying" logCompactSetV10 by dropping the
// storageHasPendingWrites() re-check, since none of the individual awaited
// sv()/tgSet()/setRpe() calls are otherwise inspected for failure).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('logCompactSetV10 (the log-a-set write path) re-verifies storageHasPendingWrites() before reporting success, since its individual sv()/tgSet()/setRpe() writes are not otherwise checked', () => {
  const core = read('src/app/v6-core.js');
  const start = core.indexOf('async function logCompactSetV10(box){');
  const end = core.indexOf('function progressionNodeV10(card){');
  assert.ok(start > 0 && end > start);
  const body = core.slice(start, end);
  const pendingCheckIdx = body.indexOf('if(storageHasPendingWrites())throw new Error');
  const successToastIdx = body.indexOf("toast(\n        `\\u2713");
  assert.ok(pendingCheckIdx > 0, 'logCompactSetV10 must re-check storageHasPendingWrites() before its success toast');
  assert.ok(successToastIdx > pendingCheckIdx, 'the pending-writes check must run BEFORE the success toast, not after');
});

test('WTFocusPatchV10.logValues (used by the compact set-log form) reports success only when the set is done AND there are no pending storage writes', () => {
  const core = read('src/app/v6-core.js');
  const idx = core.indexOf("logValues:async(key,values,index)=>{");
  assert.ok(idx > 0);
  const body = core.slice(idx, core.indexOf('\n    },', idx));
  assert.match(body, /return !!getSets\(\)\[key\]\?\.\[index\]\?\.done&&!storageHasPendingWrites\(\);/);
});

test('editRestSheet (custom rest) and the 5/3/1 training-max save check safeSetRaw\'s return value and throw instead of reporting success on failure', () => {
  const shell = read('js/compact-shell.js');
  assert.match(shell, /if\(!safeSetRaw\('wt_custom_rest',JSON\.stringify\(rests\)\)\)throw Error\('Počitek ni shranjen\.'\);/);
  assert.match(shell, /if\(!safeSetRaw\('wt_531tm',JSON\.stringify\(next\)\)\)throw Error\('TM ni shranjen\.'\);/);
});

test('addExercise (Program → add exercise) re-checks storageHasPendingWrites() after mutateDayList before reporting success', () => {
  const shell = read('js/compact-shell.js');
  const idx = shell.indexOf('function addExercise(){');
  const end = shell.indexOf('function editDay(){');
  assert.ok(idx > 0 && end > idx);
  const body = shell.slice(idx, end);
  assert.match(body, /mutateDayList\(di,rows=>rows\.push/);
  const mutateIdx = body.indexOf('mutateDayList(di,rows=>rows.push');
  const checkIdx = body.indexOf('if(storageHasPendingWrites())throw Error');
  const afterProgramIdx = body.indexOf('afterProgram();');
  assert.ok(checkIdx > mutateIdx, 'the pending-writes check must come after mutateDayList');
  assert.ok(afterProgramIdx > checkIdx, 'afterProgram() (which shows the success toast) must come after the pending-writes check, not before');
});

test('commitStorageBatch (the mechanism behind history corrections, planned-set edits, body weight, cycle/phase/program edits) throws on any write failure instead of returning false, so a caller cannot accidentally show success after a caught-but-ignored failure', () => {
  const storage = read('js/core/state-storage.js');
  const idx = storage.indexOf('function commitStorageBatch(changes){');
  const end = storage.indexOf('recoverStorageJournal();', idx);
  const body = storage.slice(idx, end);
  assert.match(body, /throw new Error\(/, 'commitStorageBatch must throw (not return false) on failure');
  assert.doesNotMatch(body, /return false/);
});
