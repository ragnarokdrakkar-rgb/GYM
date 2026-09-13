const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const shell=read('js/compact-shell.js'),reference=read('design/compact-gym-v3-reference.html'),css=read('css/compact-reference.css');
test('Compact status uses canonical completion while preserving independent partial exercises',()=>{
  const ctx=vm.createContext({});vm.runInContext(shell,ctx);
  assert.equal(ctx.compactStatusV27({state:'complete',done:3,total:3}),'done');
  assert.equal(ctx.compactStatusV27({state:'partial',done:1,total:3}),'partial');
  assert.equal(ctx.compactStatusV27({state:'pending',done:0,total:3}),'pending');
  assert.equal(ctx.compactStatusV27({done:0,total:0}),'pending');
});
test('Native compact recovery and finish do not reopen legacy modals or legacy settings screens',()=>{
  assert.match(shell,/function showRecovery/);assert.match(shell,/wasRunning&&!stRun/);
  assert.doesNotMatch(shell,/slot name="legacy-tools"/);
  assert.match(read('src/app/v6-core.js'),/if\(document.documentElement.dataset.ui==='compact-shell'\)return;/);
});
test('Production component CSS is reproduced exactly from the approved v3 preview',()=>{
  const expected=[...reference.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n').replaceAll('#cg-preview','#cg-app').trim();
  assert.equal(css.trim(),'/* Generated from the approved Compact Gym v3 design. */\n'+expected);
  assert.match(css,/height:46px/);assert.match(css,/font-size:21px/);assert.match(css,/cg-log-footer\{display:flex/);
});
test('The new main UI is an isolated screen, not a stylesheet over legacy exercise cards',()=>{
  assert.match(shell,/attachShadow\(\{mode:'open'\}\)/);assert.match(shell,/cg-workrow/);assert.match(shell,/cg-log-footer/);assert.match(shell,/cg-focus-meta/);assert.match(shell,/cg-focus-steps/);
  assert.doesNotMatch(shell,/class="exc\b|compact-log-box-v10|\.exc\s*\{/);
  const html=read('index.html');assert.ok(html.includes('data-ui="compact-shell"'));assert.ok(!html.includes('href="css/compact.css"'));
  assert.ok(!html.includes('design/compact-gym-v3-reference.html'));assert.doesNotMatch(shell,/sampleLoads|current-demo|Vzorčni podatki/);
});
test('Planning transaction keeps existing stores, journals before/after and rejects stale rows',()=>{
  let all={key:[{kg:'50',reps:'8',done:true},{kg:'',reps:'',done:false}]},counts={key:0},commit;
  const ctx=vm.createContext({getSets:()=>structuredClone(all),getSetCounts:()=>structuredClone(counts),LS:{sets:'s',setcounts:'c'},exStableId:n=>n,commitStorageBatch:changes=>{commit=changes;}});
  vm.runInContext(read('js/compact-ui.js'),ctx);vm.runInContext(shell,ctx);
  ctx.compactCommitPlanV27('key',2,JSON.stringify(all.key),{type:'edit',values:[{index:1,kg:'65',reps:'6'}]},'Bench');
  const saved=JSON.parse(commit[0][1]);assert.equal(saved.key[0].done,true);assert.equal(saved.key[1].done,false);assert.equal(saved.key[1].kg,'65');assert.equal(commit[2][0],'wt_plan_undo_v26');
  assert.throws(()=>ctx.compactCommitPlanV27('key',2,'[]',{type:'add',count:1,kg:'30',reps:'6'},'Bench'));
});
test('Weight trend needs three measurements spanning a week and does not fabricate empty history',()=>{
  const ctx=vm.createContext({});vm.runInContext(shell,ctx);
  assert.equal(ctx.compactWeeklyWeightV27([]),null);assert.equal(ctx.compactWeeklyWeightV27([['2026-09-01',80],['2026-09-02',81],['2026-09-03',82]]),null);
  assert.ok(Math.abs(ctx.compactWeeklyWeightV27([['2026-09-01',80],['2026-09-05',81],['2026-09-09',82]])-1.75)<1e-8);
});
test('All shadow styles and script are precached and logging uses the guarded existing logger',()=>{
  const sw=read('sw.js');for(const file of ['css/compact-host.css','css/compact-reference.css','css/compact-shell.css','js/compact-shell.js'])assert.ok(sw.includes(file));
  assert.match(shell,/WTFocusPatchV10.logValues/);assert.match(read('src/app/v6-core.js'),/await logCompactSetV10\(box\)/);
  assert.match(shell,/if\(week!==cw\)setWeek\(week\)/);assert.doesNotMatch(shell,/showWeek\(/);
});
