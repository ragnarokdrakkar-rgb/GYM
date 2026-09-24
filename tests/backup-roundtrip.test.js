'use strict';
// Item 4 — Backup export/import round trip.
//
// Exercises the REAL production code for buildBackupJSON (src/app/analytics-tools.js),
// validateBackupP1/backupSummaryP1/restoreBackupObjectP1 (src/app/gym-session-core.js)
// and validateBackupV18/buildRestorePlanV18/commitStorageBatch (js/core/backup.js,
// js/core/state-storage.js) together, with synthetic localStorage data covering every
// field the task calls out: sessions (wt_sess6), sets (wt_s6), bodyweight (wt_bw6),
// measurements (wt_m6), phases (wt_phases), program meta (wt_program_meta_shared_v16)
// + day lists (wt_daylist_shared_v16), custom exercises (wt_custom_ex), custom rest
// (wt_custom_rest), 5/3/1 training maxes (wt_531tm), hidden exercises (wt_hidden_ex),
// set counts (wt_sc6) and rep PRs (wt_rep_prs).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

function slice(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.ok(start >= 0, 'missing needle: ' + startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert.ok(end > start, 'missing end needle: ' + endNeedle);
  return source.slice(start, end);
}

// Every localStorage key the round trip must preserve, with distinctive synthetic
// values so a dropped/overwritten key is easy to spot.
function seedData() {
  return {
    wt_s6: JSON.stringify({ c1w0d0e0: [{ kg: 80, reps: 8, rpe: 8, done: true, exerciseId: 'ex_bench' }] }),
    wt_p6: JSON.stringify({ c1w0d0e0: 82.5 }),
    wt_n6: JSON.stringify({ c1w0d0e0: 'note' }),
    wt_bw6: JSON.stringify({ '2026-09-01': 78.4 }),
    wt_c6: JSON.stringify({ num: 3, startDates: { 1: '2026-01-01' } }),
    wt_m6: JSON.stringify({ '2026-09-01': { Prsa: 100, Pas: 80 } }),
    wt_g6: JSON.stringify({ bar: 20, plates: [1.25, 2.5, 5, 10, 20] }),
    wt_sess6: JSON.stringify([{ id: 'sess_original', date: '2026-09-01', dayName: 'Push A', durationMin: 45 }]),
    wt_cyn6: JSON.stringify({ '1': 'cycle note' }),
    wt_rp6: JSON.stringify({ main: 180 }),
    wt_sc6: JSON.stringify({ c1w0d0e0: 5 }),
    wt_pain6: JSON.stringify({ c1w0d0e0: { level: 2 } }),
    wt_th6: 'dark',
    wt_alarm6: JSON.stringify({ sound: false, vibrate: true, notif: true, volume: 50, melody: 'default' }),
    wt_collars_kg: '2.5',
    wt_exswap: JSON.stringify({}),
    wt_sugs6: JSON.stringify([]),
    wt_extra_ex: JSON.stringify({}),
    wt_hidden_ex: JSON.stringify({ ex_old_move: true }),
    wt_daylist_shared_v16: JSON.stringify({ 0: [{ id: 'mine', n0: 'Bench press', targetSets: 3, increment: 2.5 }] }),
    wt_daylist_cut: JSON.stringify(null),
    wt_daylist_bulk: JSON.stringify(null),
    wt_ex_ordernames: JSON.stringify({}),
    wt_rep_prs: JSON.stringify({ ex_bench: { 8: 80 } }),
    wt_phases: JSON.stringify([{ id: 'phase1', profile: 'bulk', start: '2026-01-01' }]),
    wt_profile: 'bulk',
    wt_531tm: JSON.stringify({ squat: 140, bench: 100 }),
    wt_531offset: '2',
    wt_goals: JSON.stringify([{ id: 'g1', text: 'Bench 100kg' }]),
    wt_daylog: JSON.stringify({}),
    wt_custom_ex: JSON.stringify([{ id: 'custom1', name: 'My Custom Lift' }]),
    wt_kg_step: '2.5',
    wt_reps_step: '1',
    wt_colors: JSON.stringify({ accent: '#ff0000' }),
    wt_custom_rest: JSON.stringify({ ex_bench: 200 }),
    wt_compact: '1',
    wt_gym_mode: '0',
    wt_bwgoal: '82',
    wt_program_meta_shared_v16: JSON.stringify({ version: 2, shared: true, days: [{ name: 'Push A', title: 'Push A', sub: '', active: true }] }),
  };
}

function harness(initial = {}) {
  const data = new Map(Object.entries(initial));
  const localStorage = {
    getItem: k => (data.has(k) ? data.get(k) : null),
    setItem(k, v) { data.set(k, String(v)); },
    removeItem: k => data.delete(k),
  };
  const calls = [];
  const noop = name => (...args) => { calls.push(name); };
  const domStub = { classList: { add() {}, remove() {}, toggle() {} }, textContent: '', value: '', hidden: false };
  const context = vm.createContext({
    localStorage, console,
    window: {},
    document: { getElementById: () => domStub, addEventListener() {}, body: domStub, documentElement: domStub },
    setTimeout: () => 0, clearTimeout() {}, alert() {},
    Math, JSON, Object, Array, Number, String, Boolean, Date, Map, Promise, isNaN, parseInt, parseFloat,
  });
  vm.runInContext('window.document=document;window.localStorage=localStorage;', context);

  // --- js/core scripts (loaded verbatim, as in index.html) ---
  vm.runInContext(read('js/core/bootstrap.js'), context);
  vm.runInContext(read('js/core/state-storage.js'), context);
  vm.runInContext(read('js/core/backup.js'), context);

  // --- small src/app getters buildBackupJSON/restore depend on ---
  vm.runInContext("function getActiveProfile(){return localStorage.getItem('wt_profile')||'cut';}", context);
  vm.runInContext("function get531TMs(){try{return JSON.parse(localStorage.getItem('wt_531tm')||'{}');}catch{return {};}}", context);
  vm.runInContext("function get531CycleOffset(){return parseInt(localStorage.getItem('wt_531offset')||'0');}", context);
  vm.runInContext("function getStoredColors(){try{return JSON.parse(localStorage.getItem('wt_colors')||'{}');}catch{return {};}}", context);
  vm.runInContext("const ALARM_DEFAULTS={sound:true,vibrate:true,notif:true,volume:90,melody:'default'};function getAlarmSettings(){try{return {...ALARM_DEFAULTS,...JSON.parse(localStorage.getItem('wt_alarm6')||'{}')};}catch{return {...ALARM_DEFAULTS};}}", context);
  vm.runInContext("function getCollars(){return parseFloat(localStorage.getItem('wt_collars_kg')||'0');}", context);
  vm.runInContext("function getBWGoal(){const v=parseFloat(localStorage.getItem('wt_bwgoal'));return isNaN(v)?80:v;}", context);
  vm.runInContext("function getGymMode(){return localStorage.getItem('wt_gym_mode')==='1';}", context);
  vm.runInContext("const CUST_KEY='wt_custom_ex';", context);
  vm.runInContext("const V6_KEYS={settings:'wt_v6_settings',restLog:'wt_rest_log_v6',draft:'wt_session_draft_v6',metaCut:'wt_program_meta_cut',metaBulk:'wt_program_meta_bulk',metaShared:'wt_program_meta_shared_v16',lastExternal:'wt_last_external_backup_v6'};", context);
  vm.runInContext("function getRestLogV6(){try{return JSON.parse(localStorage.getItem(V6_KEYS.restLog)||'[]');}catch{return [];}}", context);

  // no-op UI hooks restoreBackupObjectP1 calls after committing storage
  ['applyProgramStateV6','ensureDayLists','initTheme','applyAllColors','initBWGoal','renderDayTabsV6','renderV6Settings','initProfileUI','showPage','showDay','initP1','renderTodayCard'].forEach(name => {
    context[name] = noop(name);
  });
  context.uiConfirm = async () => true;
  context.openPhotoDB = async () => { throw new Error('no IndexedDB in test harness'); };
  context.getAllPhotos = async () => [];
  context.cw = 0; context.cd = 0;

  // --- gym-session-core.js: sanitizeImported .. restoreBackupObjectP1 ---
  const gymCore = read('src/app/gym-session-core.js');
  const restoreBlock = slice(gymCore, 'function plainImportedText(', 'async function restoreBackupObjectP1(rawBackup,opts={}){') +
    slice(gymCore, 'async function restoreBackupObjectP1(rawBackup,opts={}){', '\n}\n') + '\n}\n';
  vm.runInContext(restoreBlock, context);

  // --- analytics-tools.js: base buildBackupJSON (schema 5) ---
  const analytics = read('src/app/analytics-tools.js');
  const buildBackupBlock = slice(analytics, 'async function buildBackupJSON(includePhotos){', '\n}\n') + '\n}\n';
  vm.runInContext(buildBackupBlock, context);

  // --- v6-core.js wraps buildBackupJSON to add programMeta/daylists.shared/phase/
  // v6settings/restLog/lastExternal (this is the version actually loaded in the app,
  // since v6-core.js runs after analytics-tools.js in the built bundle) ---
  vm.runInContext("function getProgramMetaV6(){return JSON.parse(localStorage.getItem('wt_program_meta_shared_v16')||'null');}", context);
  vm.runInContext("function getDayLists(){return JSON.parse(localStorage.getItem('wt_daylist_shared_v16')||'null');}", context);
  vm.runInContext("function getV6Settings(){try{return JSON.parse(localStorage.getItem(V6_KEYS.settings)||'{}');}catch{return {};}}", context);
  const v6Core = read('src/app/v6-core.js');
  const wrapBlock = slice(v6Core, 'const _buildBackupJSONV5=buildBackupJSON;', '\nvalidateBackupP1=validateBackupV18;');
  vm.runInContext(wrapBlock, context);

  return { context, data, calls, run: s => vm.runInContext(s, context) };
}

test('buildBackupJSON -> restoreBackupObjectP1(replace) round trip loses nothing across every tracked field', async () => {
  const seed = seedData();
  const h = harness(seed);
  const backupJson = await h.run('buildBackupJSON(false)');
  const backup = JSON.parse(backupJson);

  // Overwrite everything with different "current device" data first, so a
  // successful restore can only be explained by the import, not by no-ops.
  const clobbered = Object.fromEntries(Object.keys(seed).map(k => [k, JSON.stringify({ clobbered: true })]));
  h.data.clear();
  Object.entries(clobbered).forEach(([k, v]) => h.data.set(k, v));

  h.context.backup = backup;
  const result = await h.run("restoreBackupObjectP1(backup,{photos:false,mode:'replace'})");
  assert.equal(result.ok, true);

  const checks = {
    wt_s6: seed.wt_s6, wt_sess6: seed.wt_sess6, wt_bw6: seed.wt_bw6, wt_m6: seed.wt_m6,
    wt_phases: seed.wt_phases, wt_program_meta_shared_v16: seed.wt_program_meta_shared_v16,
    wt_daylist_shared_v16: seed.wt_daylist_shared_v16, wt_custom_ex: seed.wt_custom_ex,
    wt_custom_rest: seed.wt_custom_rest, wt_531tm: seed.wt_531tm, wt_hidden_ex: seed.wt_hidden_ex,
    wt_sc6: seed.wt_sc6, wt_rep_prs: seed.wt_rep_prs,
  };
  for (const [key, expected] of Object.entries(checks)) {
    assert.deepEqual(JSON.parse(h.data.get(key)), JSON.parse(expected), key + ' was lost or altered by the round trip');
  }
});

test('merge keeps current data on conflicts and does not touch program/phase/settings', async () => {
  const seed = seedData();
  const h = harness(seed);
  const backupJson = await h.run('buildBackupJSON(false)');
  const backup = JSON.parse(backupJson);
  // Incoming backup has a conflicting bodyweight entry and an extra non-conflicting one.
  backup.bw = { '2026-09-01': 999, '2026-09-02': 79.1 };
  backup.tm531 = { squat: 999 }; // must NOT win during merge
  backup.profile = 'cut'; // must NOT win during merge
  h.context.backup = backup;
  const result = await h.run("restoreBackupObjectP1(backup,{photos:false,mode:'merge'})");
  assert.equal(result.ok, true);
  const bw = JSON.parse(h.data.get('wt_bw6'));
  assert.equal(bw['2026-09-01'], 78.4, 'current bodyweight value must win on conflict during merge');
  assert.equal(bw['2026-09-02'], 79.1, 'non-conflicting incoming bodyweight entry must still be added on merge');
  assert.deepEqual(JSON.parse(h.data.get('wt_531tm')), { squat: 140, bench: 100 }, 'TM must stay untouched by merge');
  assert.equal(h.data.get('wt_profile'), 'bulk', 'active profile/phase must stay untouched by merge');
});

test('invalid, corrupt or foreign JSON is refused and changes nothing', async () => {
  const seed = seedData();
  const h = harness(seed);
  const before = new Map(h.data);

  // Foreign/garbage object (no sets field at all).
  h.context.foreign = { hello: 'world', notABackup: true };
  await assert.rejects(() => h.run("restoreBackupObjectP1(foreign,{photos:false,mode:'replace'})"));
  assert.deepEqual([...h.data], [...before]);

  // Corrupt set row (non-numeric kg).
  h.context.corrupt = { version: 7, sets: { c1w0d0e0: [{ kg: 'not-a-number', reps: 5 }] } };
  await assert.rejects(() => h.run("restoreBackupObjectP1(corrupt,{photos:false,mode:'replace'})"));
  assert.deepEqual([...h.data], [...before]);

  // validateBackupP1 itself must flag both as invalid (this is what importData()'s
  // reader.onload checks before ever prompting for merge/replace).
  assert.equal(h.run('validateBackupP1(foreign).ok'), false);
  assert.equal(h.run('validateBackupP1(corrupt).ok'), false);
});

test('a failed photo import does not lose the localStorage data that was already restored', async () => {
  const seed = seedData();
  const h = harness(seed);
  const backupJson = await h.run('buildBackupJSON(false)');
  const backup = JSON.parse(backupJson);
  backup.photos = [{ date: '2026-09-01', blob: 'fake-base64' }];
  h.data.clear();
  h.context.backup = backup;
  // openPhotoDB stub throws -> photo import fails, but sets/history restore must stand.
  const result = await h.run("restoreBackupObjectP1(backup,{photos:true,mode:'replace'})");
  assert.equal(result.ok, true);
  assert.equal(result.photos, 'failed');
  assert.deepEqual(JSON.parse(h.data.get('wt_s6')), JSON.parse(seed.wt_s6));
  assert.deepEqual(JSON.parse(h.data.get('wt_sess6')), JSON.parse(seed.wt_sess6));
});

test('importData creates an automatic local rollback backup before restoring (merge and replace)', () => {
  const analytics = read('src/app/analytics-tools.js');
  const importFn = slice(analytics, 'function importData(){', '\nasync function clearAll(');
  // The rollback snapshot (buildBackupJSON + saveBackupToIDB) must run before
  // restoreBackupObjectP1 mutates active storage, for either import mode.
  const rollbackIdx = importFn.indexOf('const rollback=await buildBackupJSON(false)');
  const saveIdx = importFn.indexOf('await saveBackupToIDB(rollback');
  const restoreIdx = importFn.indexOf('await restoreBackupObjectP1(backup,{photos:true,mode}');
  assert.ok(rollbackIdx > 0 && saveIdx > rollbackIdx && restoreIdx > saveIdx,
    'importData must snapshot the current data (buildBackupJSON + saveBackupToIDB) before calling restoreBackupObjectP1');
});
