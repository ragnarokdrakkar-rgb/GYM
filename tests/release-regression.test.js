'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const childProcess=require('node:child_process');

const root=path.resolve(__dirname,'..');
const version='1.1.1';

function read(relativePath){
  return fs.readFileSync(path.join(root,relativePath),'utf8');
}

const sourceFiles=[
  'src/app/ui-shell.js',
  'src/app/workout-model.js',
  'src/app/profile-strength.js',
  'src/app/workout-ui.js',
  'src/app/gym-session-core.js',
  'src/app/v6-core.js',
  'src/app/workout-runtime.js',
  'src/app/analytics-tools.js',
  'src/app/main.js'
];

test('release version is synchronized',()=>{
  const pkg=JSON.parse(read('package.json'));
  const lock=JSON.parse(read('package-lock.json'));
  assert.equal(pkg.version,version);
  assert.equal(lock.version,version);
  assert.equal(lock.packages[''].version,version);
  assert.match(read('js/core/bootstrap.js'),new RegExp(`APP_VERSION='${version.replaceAll('.','\\.')}'`));
  assert.match(read('sw.js'),new RegExp(`service worker v${version.replaceAll('.','\\.')}`));
  assert.match(read('android/app/build.gradle'),new RegExp(`versionName "${version.replaceAll('.','\\.')}"`));
  assert.match(read('README-GITHUB.md'),new RegExp(`Workout Tracker ${version.replaceAll('.','\\.')}`));
});

test('runtime bundle is byte-identical to source files',()=>{
  const source=sourceFiles.map(read).join('');
  assert.equal(read('js/app.js'),source);
});

test('all shipped JavaScript files pass syntax validation',()=>{
  const files=[
    ...sourceFiles,
    'js/app.js',
    'js/core/bootstrap.js',
    'js/core/state-storage.js',
    'js/core/backup.js',
    'js/app-ui.js',
    'js/app-update.js',
    'js/rest-native-notifications.js',
    'js/data/exercise-swaps.js',
    'js/data/programs.js',
    'sw.js'
  ];
  for(const relativePath of files){
    const result=childProcess.spawnSync(
      process.execPath,
      ['--check',path.join(root,relativePath)],
      {encoding:'utf8',windowsHide:true}
    );
    assert.equal(result.status,0,`${relativePath}: ${result.stderr||result.stdout}`);
  }
});

test('primary navigation, week and day controls are semantic buttons',()=>{
  const html=read('index.html');
  assert.doesNotMatch(html,/<div class="nt(?:\s|")/);
  assert.doesNotMatch(html,/<div class="wt(?:\s|")/);
  assert.doesNotMatch(html,/<div class="dt(?:\s|")/);
  assert.match(html,/<button type="button" class="nt active"/);
  assert.match(html,/<button type="button" class="wt active"/);
  assert.match(html,/<button type="button" class="dt active"/);
});

test('Forge UI changes hierarchy, not only color tokens',()=>{
  const html=read('index.html');
  const css=read('css/app.css');
  const runtime=read('src/app/workout-runtime.js');
  assert.match(html,/class="brand-mark-v17"/);
  assert.match(html,/class="session-clock-v17"/);
  assert.match(html,/class="page-heading-v17/);
  assert.match(runtime,/class="exercise-order-v17"/);
  assert.match(runtime,/class="set-grid-v17"/);
  assert.match(css,/V17 FORGE UI/);
  assert.match(css,/--bg:#070707/);
  assert.match(css,/--green:#ff4b23/);
});

test('exercise swap catalog is lazy-rendered',()=>{
  const runtime=read('src/app/workout-runtime.js');
  assert.match(runtime,/class="sw-lazy-v15" data-loaded="0"/);
  assert.match(runtime,/if\(!list\|\|list\.dataset\.loaded==='1'\)return;/);
  assert.match(runtime,/list\.innerHTML=renderSwapDBList\(key,original,''\);/);
  assert.doesNotMatch(runtime,/id="swdb-\$\{exKey\}"[^\n]+\$\{renderSwapDBList/);
});

test('narrow-screen set rows use a bounded grid',()=>{
  const css=read('css/app.css');
  assert.match(css,/V15 MOBILE STABILITY/);
  assert.match(css,/html\.gym-mode \.st tr\s*\{[\s\S]*?grid-template-columns:22px minmax\(72px,1fr\) minmax\(68px,1fr\) 54px;/);
  assert.match(css,/html,\s*body\s*\{[\s\S]*?overflow-x:hidden;/);
  assert.match(css,/html\.gym-mode \.st td\.vc,[\s\S]*?display:none!important;/);
});

test('release features are wired into the workout flow',()=>{
  const core=read('src/app/v6-core.js');
  const html=read('index.html');
  assert.match(core,/function undoLastSetV15\(\)/);
  assert.match(core,/function markSaveStateV15\(/);
  assert.match(core,/function showSessionSummaryV15\(/);
  assert.match(core,/baseToggleSessionV15/);
  assert.match(html,/id="undo-set-v15"/);
  assert.match(html,/id="save-status-v15"/);
});

test('plate calculation and main actions use Slovenian labels',()=>{
  const core=read('src/app/v6-core.js');
  const html=read('index.html');
  assert.match(core,/button\.textContent='PL'/);
  assert.match(core,/Izračun plošč ON/);
  assert.match(core,/Izračun plošč OFF/);
  assert.match(html,/>Začni trening<\/button>/);
  assert.match(html,/>Fokus<\/button>/);
  assert.doesNotMatch(html,/>Start session<\/button>/);
  assert.doesNotMatch(html,/>Gym mode<\/button>/);
});

test('critical storage writes use the guarded storage layer',()=>{
  const storage=read('js/core/state-storage.js');
  const model=read('src/app/workout-model.js');
  const runtime=read('src/app/workout-runtime.js');
  assert.match(storage,/function safeSetRaw\(/);
  assert.match(storage,/function safeRemoveRaw\(/);
  assert.match(storage,/return safeSetRaw\(k,JSON\.stringify\(v\)\);/);
  assert.match(model,/function saveDayLists\(all\)\{return safeSetRaw/);
  assert.match(runtime,/commitStorageBatch\(changes\)/);
  assert.match(runtime,/\[LS_SESS,JSON\.stringify\(next\)\]/);
});
