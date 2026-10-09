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
    exerciseInProgramV36:(e,c,w)=>!!e&&!e.programDisabled&&(!e.from||c>e.from.c||(c===e.from.c&&w>=e.from.w)),exerciseValidForWeekV36:(e,c,w)=>!e||!e.from||c>e.from.c||(c===e.from.c&&w>=e.from.w),
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
    getDefaultRest:()=>null,
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

test('Main settings: four visible groups (Program, Trening, Podatki, Aplikacija), every row explained, nothing folded away',()=>{
  const ctx=settingsCtx({programUses531V16:()=>false});
  const html=ctx.settings();
  for(const g of ['Program','Trening','Podatki','Aplikacija'])assert.match(html,new RegExp(`cg-section-label"><span>${g}</span>`));
  for(const act of ['program','phase','progression','default-rest','alarm','equipment','backup','history','pr-check','history-sources','app'])assert.match(html,new RegExp(`data-act="${act}"`),act);
  assert.doesNotMatch(html,/<details class="cg-fold"/,'no hidden fold on the main settings screen');
  assert.doesNotMatch(html,/data-act="advanced"/,'the catch-all "Dodatna orodja" page is gone');
  assert.doesNotMatch(html,/data-act="tm"/); // 531 not used
  // every row has a caption
  const rows=html.match(/<button[^>]*class="cg-srow"[^>]*>[\s\S]*?<\/button>/g)||[];
  assert.ok(rows.length>=11);
  for(const row of rows)assert.match(row,/<small>[^<]+<\/small>/,'row without caption: '+row.slice(0,80));
});

test('Main settings shows the 5/3/1 Training max row only when the program uses 5\\/3\\/1',()=>{
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

test('Trening card shows the default rest row, with the current value or a fallback caption',()=>{
  const set=settingsCtx({getDefaultRest:()=>90}).settings();
  assert.match(set,/data-act="default-rest"/);
  assert.match(set,/Privzeti počitek/);
  assert.match(set,/Velja za vaje brez lastnega počitka/);
  assert.match(set,/90/); // stubbed clock(n)=>String(n)
  const unset=settingsCtx({getDefaultRest:()=>null}).settings();
  assert.match(unset,/Po vrsti vaje/);
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
  for(const settingsRoute of ['phase','backup','equipment','history','sources','advanced','alarm','progression','app']){
    const ctx=settingsCtx({state:{settings:settingsRoute,flagged:false,query:'',limit:50}});
    const html=ctx.settings();
    assert.match(html,/data-act="settings-back"/,`expected settings-back on ${settingsRoute}`);
  }
});

test('Alarm and Progression subpages share one form (all field names present, the other group hidden); App page keeps cycle/update/diagnostics acts',()=>{
  const fields=['sound','vibrate','notif','volume','melody','smartRest','restWarning','progression','rpeUp','rpeDown','painStop'];
  for(const route of ['alarm','progression']){
    const html=settingsCtx({state:{settings:route,flagged:false,query:'',limit:50}}).settings();
    assert.match(html,/<form data-advanced-form>/);
    for(const f of fields)assert.match(html,new RegExp(`name="${f}"`),`${route} missing ${f}`);
    assert.match(html,/<div hidden>/);
  }
  const app=settingsCtx({state:{settings:'app',flagged:false,query:'',limit:50},programUses531V16:()=>true}).settings();
  for(const act of ['cycle-new','tm-advance','tm-reset','update','draft-restore','diagnostics'])assert.match(app,new RegExp(`data-act="${act}"`),`missing act ${act}`);
  assert.doesNotMatch(app,/data-advanced-form/,'nothing to save on the app page');
  assert.match(shell,/\['equipment','history','backup','phase','advanced','alarm','progression','app'\]\.includes\(act\)/);
});

test('Equipment subpage keeps data-equipment-form with all its field names',()=>{
  const ctx=settingsCtx({state:{settings:'equipment',flagged:false,query:'',limit:50}});
  const html=ctx.settings();
  assert.match(html,/<form data-equipment-form/);
  for(const field of ['show','barKind','bar','collars','plate']){
    assert.match(html,new RegExp(`name="${field}"`),`missing field ${field}`);
  }
});

test('changing a field in the alarm/progression form does not re-render (which reset the form to stored values before saving)',()=>{
  const handler=shell.slice(shell.indexOf("root.addEventListener('change'"),shell.indexOf("root.addEventListener('submit'"));
  assert.match(handler,/el\.closest\('\[data-advanced-form\]'\)/);
  assert.match(handler,/el\.closest\('\[data-equipment-form\]'\)/);
});
