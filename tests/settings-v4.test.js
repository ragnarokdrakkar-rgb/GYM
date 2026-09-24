'use strict';
// Step 6: Settings redesign — main screen groups + collapsed "Napredno" fold,
// the shared subpage header (back row above a display-font h1), the Cut/Bulk
// choice buttons on the phase subpage, and the untouched forms/acts on the
// equipment/advanced/sources subpages.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),shell=read('js/compact-shell.js'),compactUi=read('js/compact-ui.js');
function harness(extra={}){const ctx=vm.createContext(extra);vm.runInContext(compactUi,ctx);vm.runInContext(shell,ctx);return ctx;}
function inner(ctx,name){const start=shell.indexOf('  function '+name+'('),end=shell.indexOf('\n  function ',start+1);assert.ok(start>=0&&end>start,'function '+name+' not found');vm.runInContext(shell.slice(start,end),ctx);}
const button=(act,label,cls,attrs)=>`<button type="button" class="${cls||'cg-link'}" data-act="${act}" ${attrs||''}>${label}</button>`;

function settingsCtx(overrides={}){
  const base={
    esc:s=>String(s),icon:name=>`<svg data-icon="${name}"></svg>`,fmt:n=>String(n),button,clock:n=>String(n),
    APP_VERSION:'v4-test',cw:0,cd:0,
    V6_KEYS:{lastExternal:'wt_last_external_backup_v6'},
    localStorage:{getItem:()=>null},
    state:{settings:'',flagged:false,query:'',limit:50},
    getCyc:()=>({num:1}),
    getProgramMetaV6:()=>({days:[]}),
    dayListFor:()=>[],
    getActiveProfile:()=>'bulk',
    getBWPhaseContext:()=>({start:null}),
    getPhases:()=>[],
    getGym:()=>({bar:20,plates:[]}),
    getCollars:()=>2.5,
    getV6Settings:()=>({plateCalculator:true}),
    getAlarmSettings:()=>({sound:true,vibrate:true,notif:true,volume:80,melody:'default'}),
    get531CycleOffset:()=>0,
    historyRowsV24:()=>[],
    programUses531V16:()=>false,
    historyView:()=>'<div data-history-marker></div>',
    ...overrides,
  };
  const ctx=harness(base);
  for(const fn of ['subHeader','phaseGuidelineCaptionV31','programSummaryV31','equipmentView','sourceView','srow','advancedView','settings'])inner(ctx,fn);
  return ctx;
}

test('Main settings shows the Trening and Podatki cards, and a collapsed Napredno fold with history-sources and advanced',()=>{
  const ctx=settingsCtx({programUses531V16:()=>false});
  const html=ctx.settings();
  assert.match(html,/cg-section-label"><span>Trening<\/span>/);
  assert.match(html,/cg-section-label"><span>Podatki<\/span>/);
  assert.match(html,/data-act="phase"/);
  assert.match(html,/data-act="program"/);
  assert.match(html,/data-act="equipment"/);
  assert.match(html,/data-act="backup"/);
  assert.match(html,/data-act="history"/);
  const foldStart=html.indexOf('<details class="cg-fold">');
  assert.ok(foldStart>=0,'expected a collapsed <details class="cg-fold">');
  assert.doesNotMatch(html.slice(foldStart,foldStart+40),/ open/);
  const fold=html.slice(foldStart);
  assert.match(fold,/Napredno/);
  assert.match(fold,/data-act="history-sources"/);
  assert.match(fold,/data-act="advanced"/);
  assert.doesNotMatch(html,/data-act="tm"/); // 531 not used
});

test('Main settings shows the 5/3/1 Training max row inside the fold only when the program uses 5\\/3\\/1',()=>{
  const html531=settingsCtx({programUses531V16:()=>true}).settings();
  assert.match(html531,/data-act="tm"/);
  const noHtml=settingsCtx({programUses531V16:()=>false}).settings();
  assert.doesNotMatch(noHtml,/data-act="tm"/);
});

test('Program caption counts only active, non-deleted days and their active (non-disabled) exercises',()=>{
  const days=[
    {name:'Push',active:true,deleted:false},
    {name:'Rest',active:false,deleted:false},
    {name:'Gone',active:true,deleted:true},
    {name:'Pull',active:true,deleted:false},
  ];
  const lists={0:[{programDisabled:false},{programDisabled:false},{programDisabled:true}],3:[{programDisabled:false}]};
  const ctx=settingsCtx({getProgramMetaV6:()=>({days}),dayListFor:i=>lists[i]||[]});
  const html=ctx.settings();
  // 2 active non-deleted days (Push, Pull); 2+1=3 active (non-disabled) exercises
  assert.match(html,/2 aktivnih dni · 3 aktivnih vaj/);
});

test('Phase subpage shows both data-profile buttons with the guideline captions and marks the active profile selected',()=>{
  const ctx=settingsCtx({state:{settings:'phase',flagged:false,query:'',limit:50},getActiveProfile:()=>'bulk'});
  const html=ctx.settings();
  assert.match(html,/data-profile="cut" class="cg-choice[^"]*"/);
  assert.match(html,/data-profile="bulk" class="cg-choice selected"/);
  assert.match(html,/cilj \+0,25 do \+0,5 kg\/teden/);
  assert.match(html,/cilj −0,75 do −0,25 kg\/teden/);

  const cutCtx=settingsCtx({state:{settings:'phase',flagged:false,query:'',limit:50},getActiveProfile:()=>'cut'});
  const cutHtml=cutCtx.settings();
  assert.match(cutHtml,/data-profile="cut" class="cg-choice selected"/);
  assert.doesNotMatch(cutHtml,/data-profile="bulk" class="cg-choice selected"/);
});

test('Every settings subpage renders the shared settings-back header button',()=>{
  for(const settingsRoute of ['phase','backup','equipment','history','sources','advanced']){
    const ctx=settingsCtx({state:{settings:settingsRoute,flagged:false,query:'',limit:50}});
    const html=ctx.settings();
    assert.match(html,/data-act="settings-back"/,`expected settings-back on ${settingsRoute}`);
  }
});

test('Advanced subpage keeps its form and every existing act',()=>{
  const ctx=settingsCtx({state:{settings:'advanced',flagged:false,query:'',limit:50},programUses531V16:()=>true});
  const html=ctx.settings();
  assert.match(html,/<form data-advanced-form>/);
  for(const act of ['cycle-new','tm-advance','tm-reset','update','draft-restore','diagnostics']){
    assert.match(html,new RegExp(`data-act="${act}"`),`missing act ${act}`);
  }
});

test('Equipment subpage keeps data-equipment-form with all its field names',()=>{
  const ctx=settingsCtx({state:{settings:'equipment',flagged:false,query:'',limit:50}});
  const html=ctx.settings();
  assert.match(html,/<form data-equipment-form/);
  for(const field of ['show','barKind','bar','collars','plate']){
    assert.match(html,new RegExp(`name="${field}"`),`missing field ${field}`);
  }
});
