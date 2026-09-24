'use strict';
// Step 7: header brand + save state, floating toast, nav, button states,
// bottom-sheet dialogs, onboarding and typography/spacing tokens.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const shell=read('js/compact-shell.js'),v4=read('css/compact-v4.css'),host=read('css/compact-host.css'),index=read('index.html');

test('Header brand is WORKOUT with the inline flame mark, not GYM / COMPACT',()=>{
  assert.match(shell,/<span>WORKOUT<\/span>/);
  assert.match(shell,/class="cg-flame"/);
  assert.match(shell,/fill="#ff7a1a"/);assert.match(shell,/fill="#ffd08a"/);
  assert.doesNotMatch(shell,/GYM<span class="cg-brand-detail">/);
  assert.doesNotMatch(shell,/COMPACT/);
});

test('Save-state control exposes act="storage-retry" and only the red state acts on tap',()=>{
  assert.match(shell,/button\('storage-retry',/);
  assert.match(shell,/data-save-state="ok"/);
  assert.match(shell,/if\(act==='storage-retry'\)\{if\(!storageHasPendingWrites\(\)\)return;const ok=retryPendingStorageWrites\(\);/);
  assert.match(shell,/notify\(ok\?'Shranjeno\.':'Shranjevanje ni uspelo\. Izvozi podatke v Nastavitvah → Varnostna kopija\.',!ok\)/);
});

test('tick() drives save state from storageHasPendingWrites and markSaveStateV15 hooks into it',()=>{
  assert.match(shell,/setSaveState\(storageHasPendingWrites\(\)\?'error':'ok'\)/);
  assert.match(shell,/window\.markSaveStateV15=function\(state\)\{/);
  assert.match(shell,/function setSaveState\(state\)\{/);
});

test('CSS gives the red save state a tappable, non-inert control and dims ok/saving',()=>{
  assert.match(v4,/\.cg-savebtn\[data-save-state="ok"\],#cg-app \.cg-savebtn\[data-save-state="saving"\]\{pointer-events:none;\}/);
  assert.match(v4,/\.cg-savebtn\[data-save-state="error"\]\{color:var\(--cg-pending\);\}/);
});

test('notify() keeps its (text,error) signature; the toast timing helper never auto-hides errors',()=>{
  assert.match(shell,/function notify\(text,error=false\)\{/);
  const ctx=vm.createContext({});vm.runInContext(shell,ctx);
  assert.equal(ctx.compactToastTimingV32(false),3500);
  assert.equal(ctx.compactToastTimingV32(true),null);
});

test('Error toasts are dismissed on tap; the message role switches between status and alert',()=>{
  assert.match(shell,/message\.setAttribute\('role',error\?'alert':'status'\)/);
  assert.match(shell,/message\.classList\.toggle\('cg-message-error',!!error\)/);
  assert.match(shell,/message\.addEventListener\('click',\(\)=>\{if\(message\.classList\.contains\('cg-message-error'\)\)/);
});

test('Toast floats above the bottom nav, and sits closer to the edge in Focus mode',()=>{
  assert.match(v4,/#cg-app \.cg-message\{position:fixed;top:auto;left:50%;bottom:calc\(56px \+ max\(10px,env\(safe-area-inset-bottom,0px\)\) \+ 10px\)/);
  assert.match(v4,/#cg-app\[data-focus="true"\] \.cg-message\{bottom:calc\(16px \+ env\(safe-area-inset-bottom,0px\)\);\}/);
  assert.match(v4,/#cg-app \.cg-message:empty\{display:none;\}/);
});

test('Bottom nav is 56px tall with a translucent+blurred panel and a solid fallback',()=>{
  assert.match(v4,/#cg-app \.cg-nav\{min-height:56px;background:color-mix\(in srgb,var\(--cg-panel\) 86%,transparent\);backdrop-filter:blur\(16px\)/);
  assert.match(v4,/@supports not \(\(backdrop-filter:blur\(1px\)\) or \(-webkit-backdrop-filter:blur\(1px\)\)\)\{#cg-app \.cg-nav\{background:var\(--cg-panel\);\}\}/);
  assert.match(v4,/#cg-app \.cg-nav button\{min-height:56px;font-size:11\.5px;\}/);
});

test('Typography and spacing tokens are defined and applied to every screen h1',()=>{
  for(const tok of ['--cg-fs-h1:30px','--cg-fs-h2:20px','--cg-fs-body:15px','--cg-fs-small:12.5px','--cg-gap:12px','--cg-gutter:16px'])
    assert.ok(v4.includes(tok),'missing token '+tok);
  assert.match(v4,/#cg-app h1\{font-family:var\(--cg-display\);font-weight:700;font-size:var\(--cg-fs-h1\);/);
  for(const cls of ['cg-cycle-title','cg-program-title','cg-progress-title','cg-shead-title'])
    assert.match(v4,new RegExp('#cg-app \\.'+cls+'\\{[^}]*font-size:var\\(--cg-fs-h1\\)'));
});

test('Button states: :active, :disabled and :focus-visible are defined, and reduced motion is respected',()=>{
  assert.match(v4,/#cg-app button:not\(:disabled\):active\{transform:scale\(\.98\);\}/);
  assert.match(v4,/#cg-app button:disabled\{opacity:\.45;cursor:default;pointer-events:none;\}/);
  assert.match(v4,/#cg-app button:focus-visible,#cg-app input:focus-visible,#cg-app select:focus-visible,#cg-app textarea:focus-visible,#cg-app summary:focus-visible\{outline:2px solid var\(--cg-accent\);outline-offset:2px;\}/);
  assert.match(v4,/@media\(prefers-reduced-motion:reduce\)\{#cg-app button:not\(:disabled\):active\{transform:none;\}/);
});

test('Bottom sheets are anchored to the bottom edge with a drag handle, sticky actions and 48px/16px inputs',()=>{
  assert.match(v4,/#cg-app dialog\{position:fixed;inset:auto 0 0 0;top:auto;margin:0 auto;width:100%;max-width:430px;border-radius:18px 18px 0 0;/);
  assert.match(v4,/#cg-app dialog::before\{content:'';display:block;width:40px;height:4px;/);
  assert.match(v4,/#cg-app dialog::backdrop\{background:rgba\(0,0,0,\.72\);\}/);
  assert.match(v4,/#cg-app \.cg-sheet\{max-height:calc\(88dvh - 16px\);overflow-y:auto;/);
  assert.match(v4,/#cg-app \.cg-sheet-actions\{position:sticky;bottom:0;/);
  assert.match(v4,/#cg-app \.cg-dialog-title h2\{font-family:var\(--cg-display\);font-weight:700;font-size:22px;\}/);
  assert.match(v4,/min-height:48px;font-size:16px;\}/);
});

test('showModal() is still used, so sheets stay in the native top layer above the nav and toast',()=>{
  assert.match(shell,/dialog\.showModal\(\)/);
});

test('Legacy full-screen popups (onboarding and every other .note-pop) are hidden behind the compact shell',()=>{
  assert.match(host,/\.compact-shell-v27 \.note-pop\{display:none!important;\}/);
  assert.ok(index.includes('id="onboarding-pop"'));
});

test('Onboarding sheet: title Dobrodošel, Slovenian copy, Cut/Bulk choice buttons, and a single quiet Pozneje (no Prekliči+Zapri pair)',()=>{
  const start=shell.indexOf('window.maybeShowOnboarding='),end=shell.indexOf('\n    ',shell.indexOf('};',start));
  const block=shell.slice(start,end+2);
  assert.match(block,/sheet\('Dobrodošel',/);
  assert.match(block,/Izberi fazo telesne sestave\. Vaje in zgodovina ostanejo tvoje tudi ob poznejšem preklopu\./);
  assert.match(block,/choice\('cut','Cut',/);assert.match(block,/choice\('bulk','Bulk',/);
  assert.match(block,/data-onboard="\$\{p\}"/);
  assert.match(block,/cg-choice-grid/);
  assert.match(block,/'Pozneje',undefined,true\)/);
  assert.doesNotMatch(block,/Zapri/);
  assert.doesNotMatch(block,/Prekliči/);
});

test('sheet() renders only the single ok button (no Prekliči) when soloOk is set',()=>{
  const ctx=vm.createContext({});vm.runInContext(shell,ctx);
  assert.match(shell,/function sheet\(title,body,save,ok='Shrani',cancel,soloOk=false\)\{/);
  assert.match(shell,/\$\{soloOk\?'':button\('modal-close','Prekliči','cg-quiet'\)\}<button type="submit" class="\$\{soloOk\?'cg-quiet':'cg-action'\}">/);
});

test('Choosing a phase in onboarding still routes through the click handler to the original finishOnboarding',()=>{
  assert.match(shell,/if\(b\.dataset\.onboard\)\{closeSheet\(false\);finishOnboarding\(b\.dataset\.onboard\);return;\}/);
  assert.match(shell,/const originalOnboarding=window\.finishOnboarding;window\.finishOnboarding=function\(\)\{/);
});

test('.cg-empty is a dashed, centered, muted 14px/24px-padding card used for every listed empty state',()=>{
  assert.match(v4,/#cg-app \.cg-empty\{display:block;text-align:center;font-size:14px;color:var\(--cg-muted\);padding:24px;border:1\.5px dashed var\(--cg-line2\);border-radius:12px;/);
  const usages=[
    'Ta dan nima aktivnih vaj.','Ta dan ni zabeleženega treninga.',
    'Za to vajo še ni zabeleženih treningov. Graf se prikaže po prvem vnosu.',
    'Vnesi prvo meritev za prikaz grafa.','Ni lokalnih kopij.'
  ];
  for(const text of usages)assert.match(shell,new RegExp('cg-empty">'+text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});

test('44px minimum touch target: pseudo-element hit areas cover the visually smaller controls',()=>{
  assert.match(v4,/#cg-app \.cg-switch,#cg-app \.cg-dots button,#cg-app \.cg-range-seg button,#cg-app \.cg-history-chip,/);
  assert.match(v4,/width:max\(100%,44px\);height:max\(100%,44px\);\}/);
});

test('Main content clears the nav and toast at the bottom',()=>{
  assert.match(v4,/#cg-app \.cg-main\{padding-bottom:140px;\}/);
});

test('Hidden legacy pop-ups that await user input are always replaced by compact sheets',()=>{
  const shell=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','js/compact-shell.js'),'utf8');
  for(const name of ['uiConfirm','uiPrompt','chooseImportMode','maybeShowOnboarding'])assert.match(shell,new RegExp('window\\.'+name+'='),name+' must be overridden while .note-pop is hidden');
  assert.match(shell,/window\.restoreSession=function\(\)\{const result=originalRestore\.apply\(this,arguments\);showRecovery\(\)/);
});
