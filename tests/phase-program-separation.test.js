const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const profile=read('src/app/profile-strength.js');
const model=read('src/app/workout-model.js');
const core=read('src/app/v6-core.js');
const runtime=read('src/app/workout-runtime.js');
const html=read('index.html');
const css=read('css/app.css');

test('Cut and Bulk use one canonical exercise roster',()=>{
  assert.match(model,/const SHARED_DAYLIST_KEY_V16='wt_daylist_shared_v16'/);
  assert.match(model,/function _dlKey\(\)\{return SHARED_DAYLIST_KEY_V16;\}/);
  assert.doesNotMatch(model,/function _dlKey\(\)\{return 'wt_daylist_'\+getActiveProfile\(\)/);
});

test('legacy rosters are migrated without deleting the originals',()=>{
  assert.match(model,/legacyPreserved:true/);
  assert.match(model,/const cut=parseDayListsV16\('wt_daylist_cut'\),bulk=parseDayListsV16\('wt_daylist_bulk'\)/);
  assert.doesNotMatch(model,/removeItem\('wt_daylist_(cut|bulk)'\)/);
});

test('phase switch changes prescription but never selects PROG_BULK',()=>{
  const start=profile.indexOf('async function switchProfile');
  const end=profile.indexOf('function initProfileUI',start);
  const switchBody=profile.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.match(switchBody,/PROG=buildPhaseProgramV16\(p\)/);
  assert.doesNotMatch(switchBody,/PROG_BULK/);
  assert.doesNotMatch(switchBody,/wt_last_(week|day)/);
});

test('Bulk is a phase and 5/3/1 is opt-in per exercise',()=>{
  assert.match(profile,/base\.phase=phase;base\.is531=false/);
  assert.match(core,/<option value="531"[^>]*>5\/3\/1 \(opcijsko\)<\/option>/);
  assert.match(runtime,/const use531=e\.progMode==='531'/);
  assert.doesNotMatch(html,/Bulk \(5\/3\/1\)|5\/3\/1 BBB · moč in masa/);
});

test('phase UI explains that exercises remain unchanged',()=>{
  assert.match(html,/id="phase-hub-v16"/);
  assert.match(html,/Vaje: <strong>ostanejo enake<\/strong>/);
  assert.match(html,/vaje, vrstni red in zgodovina se ne spremenijo/);
  assert.match(css,/V16 CRISP UI \+ LOČENA CUT\/BULK FAZA/);
  assert.match(css,/:root\[data-phase="bulk"\]/);
});

test('backup schema 7 contains shared roster and shared program metadata',()=>{
  assert.match(core,/b\.version=7;b\.schemaVersion=7/);
  assert.match(core,/shared:getDayLists\(\)/);
  assert.match(core,/programMeta=\{shared:getProgramMetaV6\(\)/);
  assert.match(core,/Number\(backup\.schemaVersion\|\|backup\.version\|\|1\)>7/);
});
