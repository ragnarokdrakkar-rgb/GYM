'use strict';
// Step 9: a compact Trening top (no week strip, two-line week buttons, one-line day buttons with a status icon,
// hero + Program day card with ONE inline stats line) and two Focus polish items (a single meta line under the
// exercise name, legible partial step dots). Presentation only: counting and data logic are not touched here.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const shell=read('js/compact-shell.js'),compactUi=read('js/compact-ui.js'),v4=read('css/compact-v4.css'),shellCss=read('css/compact-shell.css'),referenceCss=read('css/compact-reference.css');
function harness(extra={}){const ctx=vm.createContext(extra);vm.runInContext(compactUi,ctx);vm.runInContext(shell,ctx);return ctx;}
function inner(ctx,name){const start=shell.indexOf('  function '+name+'('),end=shell.indexOf('\n  function ',start+1);assert.ok(start>=0&&end>start,'function '+name+' not found');vm.runInContext(shell.slice(start,end),ctx);}
function innerConst(ctx,name){const m=shell.match(new RegExp('  const '+name+'=.*;'));assert.ok(m,'const '+name+' not found');vm.runInContext(m[0],ctx);}
const button=(act,label,cls,attrs)=>`<button type="button" class="${cls||'cg-link'}" data-act="${act}" ${attrs||''}>${label}</button>`;
const visibleText=html=>html.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
const buttonsOf=(html,attr)=>[...html.matchAll(new RegExp(`<button [^>]*${attr}="[^"]*"[^>]*>[\\s\\S]*?</button>`,'g'))].map(m=>m[0]);

// ---- minimal CSS reader (innermost `selectors{declarations}` blocks, comments stripped) ----
const cssRules=text=>[...text.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m=>({selectors:m[1].split(',').map(s=>s.trim()),body:m[2].trim()}));
const v4Rules=cssRules(v4),shellRules=cssRules(shellCss);
const bodyIn=(rules,selector)=>{const all=rules.filter(r=>r.selectors.includes(selector)).map(r=>r.body);assert.ok(all.length,'no rule for '+selector);return all.join(';');};
const v4Body=selector=>bodyIn(v4Rules,selector),shellBody=selector=>bodyIn(shellRules,selector);
const tokens=Object.fromEntries([...v4Body('#cg-app').matchAll(/(--[\w-]+):([^;]+);/g)].map(m=>[m[1],m[2].trim()]));
// WCAG helpers (same sRGB math as color-mix / opacity compositing)
const rgb=hex=>{assert.match(hex,/^#[0-9a-f]{6}$/i,hex);return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));};
const lin=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
const lum=hex=>{const [r,g,b]=rgb(hex);return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);};
const ratio=(a,b)=>{const [hi,lo]=[lum(a),lum(b)].sort((x,y)=>y-x);return (hi+0.05)/(lo+0.05);};
const mix=(a,p,b)=>'#'+rgb(a).map((v,i)=>Math.round(v*p+rgb(b)[i]*(1-p)).toString(16).padStart(2,'0')).join('');

// ---- week + day picker -------------------------------------------------------------------------------------------
const DAYS=[
  {dayIndex:0,name:'Push A',total:25,done:25,completed:true,status:'done',recordCount:1,date:'2026-09-28'},
  {dayIndex:1,name:'Pull A',total:20,done:6,completed:false,status:'partial',date:''},
  {dayIndex:2,name:'Noge',total:18,done:2,completed:false,active:true,status:'active',date:''},
  {dayIndex:3,name:'Push B',total:20,done:0,completed:false,status:'pending',date:''},
  {dayIndex:4,name:'Pull B',total:0,done:0,completed:false,status:'pending',date:''}
];
const WEEKS={0:{done:5,total:5,partial:0,status:'done'},1:{done:2,total:5,partial:1,status:'partial'},2:{done:0,total:5,partial:0,status:'pending'},3:{done:0,total:5,partial:0,status:'pending'}};
function navCtx({days=DAYS,weeks=WEEKS,locked=false,cd=0,cw=0,stateDay=cd}={}){
  const meta={days:days.map(()=>({active:true,deleted:false}))};
  const ctx=harness({PROG:{weeks:[{},{},{},{}]},cw,cd,state:{day:stateDay},getActiveProfile:()=>'cut',navigationLocked:()=>locked,getProgramMetaV6:()=>meta,
    weekOverview:week=>({cycle:1,week,days,...(weeks[week]||{done:0,total:days.length,partial:0,status:'pending'})}),
    esc:s=>String(s),icon:()=>'',dateLabel:s=>'«'+s+'»',button});
  for(const fn of ['weekLabel','chipWord','chip','quickNavigation'])inner(ctx,fn);
  return ctx;
}
const STATUS_WORDS=/Opravljeno|Delno|V teku|Ni opravljeno|Še ni opravljeno|Brez vaj|Trening opravljen|Serije opravljene|Brez aktivnih vaj/i;

test('The week strip (.cg-weekbar) is gone from the markup, the script and both stylesheets',()=>{
  const html=navCtx().quickNavigation();
  assert.doesNotMatch(html,/cg-weekbar/);
  for(const [name,text] of [['js/compact-shell.js',shell],['css/compact-shell.css',shellCss],['css/compact-v4.css',v4]])assert.doesNotMatch(text,/cg-weekbar/,name);
  // the picker now opens with the week buttons
  assert.match(html,/<section class="cg-quick-nav" aria-label="Hitra izbira treninga"><div class="cg-quick-weeks"/);
});

test('Week buttons: line 1 "T1" (+ " ✓" when done), line 2 the status pips; no visible week-name <small>, the name and progress stay in aria-label',()=>{
  const html=navCtx({cw:1}).quickNavigation(),weeks=buttonsOf(html,'data-quick-week');
  assert.equal(weeks.length,4);
  assert.match(weeks[0],/<strong>T1 ✓<\/strong><span class="cg-pips">(<i class="(?:done|partial|active|pending)"><\/i>){5}<\/span><\/button>$/);
  assert.match(weeks[1],/<strong>T2<\/strong><span class="cg-pips">/);
  assert.match(weeks[3],/<strong>T4<\/strong>/);
  const names=['Moč','Kontrola','Volumen','Deload'];
  weeks.forEach((b,i)=>{
    assert.doesNotMatch(b,/<small/,'week '+(i+1)+' has no <small> line');
    assert.ok(!visibleText(b).includes(names[i]),'week name '+names[i]+' is not visible text');
    const label=/aria-label="([^"]*)"/.exec(b)[1];
    assert.equal(label,`Teden ${i+1} · ${names[i]} · ${WEEKS[i].done}/${WEEKS[i].total} opravljenih treningov`);
  });
  assert.equal(visibleText(weeks[0]),'T1 ✓');assert.equal(visibleText(weeks[2]),'T3');
  // selection and lock semantics are unchanged
  weeks.forEach((b,i)=>{assert.match(b,new RegExp(`data-quick-week="${i}"`));assert.match(b,new RegExp(`aria-pressed="${i===1}"`));assert.doesNotMatch(b,/ disabled/);});
  assert.match(weeks[1],/class="cg-week partial selected"/);assert.doesNotMatch(weeks[0],/selected/);
  for(const b of buttonsOf(navCtx({locked:true}).quickNavigation(),'data-quick-week'))assert.match(b,/ disabled/);
});

test('Day buttons are ONE line (status icon + name): no visible status word, the words stay in aria-label, one icon class per status',()=>{
  const html=navCtx().quickNavigation(),days=buttonsOf(html,'data-quick-day');
  assert.equal(days.length,5);
  const expected=[
    ['done','Push A: Trening opravljen · «2026-09-28»'],
    ['partial','Pull A: Delno opravljeno · 6/20 serij'],
    ['active','Noge: V teku'],
    ['pending','Push B: Še ni opravljeno'],
    ['none','Pull B: Brez aktivnih vaj']
  ];
  days.forEach((b,i)=>{
    const [icon,label]=expected[i];
    assert.ok(b.includes(`><i class="cg-dot ${icon}" aria-hidden="true"></i><strong>${DAYS[i].name}</strong></button>`),`day ${i}: icon ${icon} then the name`);
    assert.equal(visibleText(b),DAYS[i].name,`day ${i}: the only visible text is the name`);
    assert.doesNotMatch(visibleText(b),STATUS_WORDS);
    assert.ok(b.includes(`aria-label="${label}"`),`day ${i}: aria-label ${label}`);
    assert.doesNotMatch(b,/<small|cg-chip/);
  });
  // a day whose sets are complete but has no saved workout record keeps its own wording
  const noRecord=navCtx({days:[{...DAYS[0],recordCount:0,date:''}]}).quickNavigation();
  assert.match(noRecord,/aria-label="Push A: Serije opravljene"/);
});

test('Day buttons keep data-quick-day / data-quick-program / aria-pressed / disabled semantics and the --day-columns logic',()=>{
  const trening=buttonsOf(navCtx({cd:2}).quickNavigation(),'data-quick-day');
  trening.forEach((b,i)=>{
    assert.match(b,new RegExp(`data-quick-day="${DAYS[i].dayIndex}" data-quick-program="0"`));
    assert.match(b,new RegExp(`aria-pressed="${i===2}"`));assert.doesNotMatch(b,/ disabled/);
  });
  assert.match(trening[2],/class="cg-day active selected"/);assert.doesNotMatch(trening[0],/selected/);
  // locked (running / recovery session): Trening day buttons are disabled; the Program variant stays usable
  const locked=navCtx({locked:true,cd:0,stateDay:1}),lockedDays=buttonsOf(locked.quickNavigation(),'data-quick-day');
  lockedDays.forEach(b=>assert.match(b,/ disabled/));
  const program=buttonsOf(locked.quickNavigation(true),'data-quick-day');
  program.forEach((b,i)=>{assert.match(b,/data-quick-program="1"/);assert.doesNotMatch(b,/ disabled/);assert.match(b,new RegExp(`aria-pressed="${i===1}"`));});
  for(const [n,cols] of [[1,1],[3,3],[4,2],[5,3],[6,3],[7,4]])
    assert.match(navCtx({days:Array.from({length:n},(_,i)=>({...DAYS[0],dayIndex:i,name:'D'+i}))}).quickNavigation(),new RegExp(`--day-columns:${cols}"`));
  assert.match(shellCss,/\.cg-quick-days\{display:grid;grid-template-columns:repeat\(var\(--day-columns\),minmax\(0,1fr\)\);/);
});

test('A day without active exercises is a muted dash, not a status ring (day button and hero chip)',()=>{
  const ctx=harness({});inner(ctx,'chipWord');inner(ctx,'chip');
  assert.equal(ctx.chip('pending',0,0,false),'<span class="cg-chip none"><i class="cg-dot none"></i><span>Brez vaj</span></span>');
  assert.match(ctx.chip('pending',0,3,false),/<span class="cg-chip pending"><i class="cg-dot pending"><\/i><span>Ni opravljeno<\/span>/);
  assert.match(ctx.chip('done',3,3,false),/cg-chip done"><i class="cg-dot done"/);
  assert.match(ctx.chip('partial',1,3,false),/cg-chip partial"><i class="cg-dot partial"><\/i><span>Delno 1\/3<\/span>/);
});

test('Status icons: done = filled green with a check, partial = half-filled blue ring, active = filled blue, pending = HOLLOW red ring, none = muted dash',()=>{
  assert.match(v4Body('#cg-app .cg-dot.done'),/background:var\(--cg-ok\)/);
  assert.match(v4Body('#cg-app .cg-dot.done::after'),/border-left:2px solid var\(--cg-bg\);border-bottom:2px solid var\(--cg-bg\)/);
  assert.match(v4Body('#cg-app .cg-dot.partial'),/linear-gradient\(90deg,var\(--cg-partial\) 50%,transparent 50%\);border:1\.5px solid var\(--cg-partial\)/);
  assert.match(v4Body('#cg-app .cg-dot.active'),/background:var\(--cg-partial\)/);
  assert.match(v4Body('#cg-app .cg-dot.pending'),/background:transparent;border:1\.5px solid var\(--cg-pending\)/);
  assert.match(v4Body('#cg-app .cg-dot.none'),/background:transparent/);
  assert.match(v4Body('#cg-app .cg-dot.none::after'),/height:2px;[^}]*background:var\(--cg-dim\)/);
  // a muted mark must still reach the 3:1 non-text contrast on the day button surface
  assert.ok(ratio(tokens['--cg-dim'],tokens['--cg-panel'])>=3);
  // status stays separate from selection: the status icon never uses the accent
  for(const k of ['done','partial','active','pending','none'])assert.doesNotMatch(v4Body('#cg-app .cg-dot.'+k),/--cg-accent/);
});

test('Picker geometry: week buttons ~44px two-line columns, day buttons >=46px single rows, notes and the quick-next button 12px',()=>{
  assert.match(shellBody('#cg-app .cg-quick-weeks button'),/flex-direction:column;[^}]*min-height:44px/);
  assert.match(shellBody('#cg-app .cg-quick-days button'),/flex-direction:row;[^}]*min-height:46px/);
  assert.match(shellBody('#cg-app .cg-quick-note'),/font-size:12px/);
  assert.match(shellBody('#cg-app .cg-next-workout'),/font-size:12px/);
  // the week-name <small> rules are gone, and the partial week keeps its blue cue on the label
  assert.doesNotMatch(shellCss,/cg-quick-weeks button small|cg-quick-weeks button\.partial small/);
  assert.match(shellBody('#cg-app .cg-quick-weeks button.partial strong'),/color:var\(--cg-partial\)/);
});

test('Status vs selection: a selected day keeps the accent tint/border (selection rule is at least as specific as the done tint and loads later)',()=>{
  const specificity=sel=>{
    const ids=(sel.match(/#[\w-]+/g)||[]).length,classes=(sel.match(/\.[\w-]+|\[[^\]]+\]/g)||[]).length;
    const types=(sel.replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]/g,' ').match(/[a-z][\w-]*/gi)||[]).length;
    return [ids,classes,types];
  };
  const atLeast=(a,b)=>{for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return true;};
  const tint=specificity('#cg-app .cg-quick-days button.done');
  for(const selected of ['#cg-app .cg-quick-days button.selected','#cg-app .cg-quick-days button[aria-pressed="true"]'])
    assert.ok(atLeast(specificity(selected),tint),selected+' must not lose to the done tint');
  const order=JSON.parse('['+/const ready=\[([^\]]+)\]/.exec(shell)[1].replace(/'/g,'"')+']');
  assert.ok(order.indexOf('css/compact-v4.css')>order.indexOf('css/compact-shell.css'),'selection rules (v4) load after the done tint (shell)');
  // and the done tint can never reach the status icon: it only targets the button element
  assert.doesNotMatch(shellCss,/\.cg-quick-days \.(done|partial|active|pending)/);
});

// ---- hero card ----------------------------------------------------------------------------------------------------
function heroCtx(over={}){
  const ctx=harness({cd:0,stRun:false,stStart:0,
    getSessions:()=>[{dayIdx:0,date:'2026-09-21'},{dayIdx:0,date:'2026-09-28'},{dayIdx:3,date:'2026-09-30'}],
    clock:n=>String(Math.floor(n)),icon:n=>`<svg data-icon="${n}"></svg>`,esc:s=>String(s),button,...over});
  inner(ctx,'chipWord');inner(ctx,'chip');innerConst(ctx,'shortDate');inner(ctx,'heroCard');
  return ctx;
}

test('Hero: name + status chip on one row, muted sub, ONE inline stats line, then the actions; no 3-column stats block',()=>{
  const html=heroCtx().heroCard({status:'pending',done:0,total:25},{name:'Push A',sub:'Prsa · ramena · tricepsi'},0,25,6);
  assert.match(html,/^<section class="cg-hero"><div class="cg-hero-head"><h2 class="cg-hero-name">Push A<\/h2><span class="cg-chip pending"><i class="cg-dot pending"><\/i><span>Ni opravljeno<\/span><\/span><\/div>/);
  assert.ok(html.includes('<p class="cg-hero-sub">Prsa · ramena · tricepsi</p>'));
  assert.ok(html.includes('<p class="cg-hero-line"><b>6</b> vaj · <b>0/25</b> serij · zadnjič <b>28. 9.</b></p>'),'inline stats line: vaj · serij · zadnjič');
  assert.doesNotMatch(html,/cg-hero-stats/);assert.doesNotMatch(html,/<span>(vaj|serij|zadnjič)<\/span>/);
  const at=s=>html.indexOf(s);
  assert.ok(at('cg-hero-head')<at('cg-hero-sub')&&at('cg-hero-sub')<at('cg-hero-line')&&at('cg-hero-line')<at('cg-hero-actions'),'rows: head, sub, stats line, actions');
  assert.match(html,/class="cg-hero-start" data-act="session-start"/);assert.match(html,/class="cg-hero-focus" data-act="focus"/);
  assert.doesNotMatch(html,/cg-hero-live/);
});

test('Hero: no sub row without day.sub, "—" when the day was never trained, and Slovenian agreement of the exercise count',()=>{
  const ctx=heroCtx({getSessions:()=>[]});
  const none=ctx.heroCard({status:'pending',done:0,total:12},{name:'Noge'},0,12,3);
  assert.doesNotMatch(none,/cg-hero-sub/);
  assert.ok(none.includes('<p class="cg-hero-line"><b>3</b> vaje · <b>0/12</b> serij · zadnjič <b>—</b></p>'));
  for(const [n,word] of [[1,'vaja'],[2,'vaji'],[3,'vaje'],[4,'vaje'],[5,'vaj'],[6,'vaj'],[7,'vaj']])
    assert.ok(ctx.heroCard({status:'pending',done:0,total:1},{name:'D'},0,5,n).includes(`<b>${n}</b> ${word} · `),n+' '+word);
});

test('Hero: a running session keeps the live row (between the stats line and the actions), the finish action and the "Nadaljuj/Ponovi" labels',()=>{
  const ctx=heroCtx();
  ctx.stRun=true;ctx.stStart=Date.now();
  const running=ctx.heroCard({status:'active',done:4,total:26},{name:'Noge',sub:'Kvadricepsi'},4,26,6);
  assert.match(running,/<div class="cg-hero-live"><strong data-session-clock>\d+<\/strong><span>Trening v teku<\/span><\/div>/);
  assert.match(running,/class="cg-hero-finish" data-act="session-finish" >Zaključi trening/);
  assert.doesNotMatch(running,/data-act="session-start"/);
  assert.match(running,/<span class="cg-chip active"><i class="cg-dot active"><\/i><span>V teku<\/span>/);
  assert.ok(running.indexOf('cg-hero-line')<running.indexOf('cg-hero-live')&&running.indexOf('cg-hero-live')<running.indexOf('cg-hero-actions'));
  assert.ok(running.includes('<b>4/26</b> serij'));
  ctx.stRun=false;
  assert.match(ctx.heroCard({status:'partial',done:4,total:26},{name:'Noge'},4,26,6),/Nadaljuj/);
  assert.match(ctx.heroCard({status:'done',done:26,total:26},{name:'Noge'},26,26,6),/Ponovi trening/);
});

test('Hero CSS: name row is a wrapping flex row with the chip right-aligned; the stats line is 13-14px, bold numbers, tabular-nums; the old stats columns are gone',()=>{
  const head=v4Body('#cg-app .cg-hero-head');
  assert.match(head,/display:flex/);assert.match(head,/flex-wrap:wrap/);assert.match(head,/justify-content:space-between/);
  assert.match(v4Body('#cg-app .cg-hero-head .cg-chip'),/margin-left:auto/);
  const line=v4Body('#cg-app .cg-hero-line'),size=Number(/font-size:([\d.]+)px/.exec(line)[1]);
  assert.ok(size>=13&&size<=14,'stats line font-size '+size);
  assert.match(line,/font-variant-numeric:tabular-nums/);
  assert.match(v4Body('#cg-app .cg-hero-line b'),/font-weight:700/);
  assert.doesNotMatch(v4,/cg-hero-stats/);
  assert.match(v4Body('#cg-app .cg-hero .cg-chip'),/margin-top:0/);
  for(const selector of ['#cg-app .cg-hero-start','#cg-app .cg-hero-finish','#cg-app .cg-hero-focus'])assert.ok(v4Rules.some(r=>r.selectors.includes(selector)&&Number(/min-height:(\d+)px/.exec(r.body)?.[1]||0)>=44),selector+' keeps a >=44px touch target');
  // the display font and the radial glow of the hero card are untouched
  assert.match(v4Body('#cg-app .cg-hero-name'),/font-family:var\(--cg-display\)/);
  assert.ok(v4Body('#cg-app .cg-hero').includes('radial-gradient(120% 90% at 0% 0%,color-mix(in srgb,var(--cg-accent-fill) 16%,transparent),transparent 60%),var(--cg-panel)'));
});

// ---- Program day card -------------------------------------------------------------------------------------------------
function programCtx(days,list,hidden={}){
  const ctx=harness({esc:s=>String(s),icon:()=>'',clock:n=>String(n),button,PROG:{weeks:[{},{},{},{}]},cw:0,state:{day:0},navigationLocked:()=>false,
    getCyc:()=>({num:1}),sdk:(c,w,d,e)=>`c${c}w${w}d${d}e${e}`,exerciseTargetSetsV19:item=>Number(item?.targetSets)||4,restForEx:(id,n,r)=>r,getHiddenEx:()=>hidden,
    getProgramMetaV6:()=>({days}),dayListFor:()=>list});
  inner(ctx,'activeDayWordV29');inner(ctx,'program');
  return ctx;
}
const pex=(n,over={})=>({n,n0:n,targetSets:4,targetReps:'8-12',r:90,programDisabled:false,...over});

test('Program day card: name row, muted sub, ONE inline stats line, Uredi dan; no 3-column stats block',()=>{
  const list=[pex('A',{targetSets:5}),pex('B'),pex('C'),pex('D'),pex('E'),pex('F')];
  const html=programCtx([{name:'Push A',sub:'Prsa · ramena',active:true,deleted:false}],list).program();
  const card=html.slice(html.indexOf('<section class="cg-hero cg-pcard">'),html.indexOf('</section>',html.indexOf('cg-pcard'))+10);
  assert.ok(card.startsWith('<section class="cg-hero cg-pcard"><div class="cg-hero-head"><h2 class="cg-hero-name">Push A</h2></div><p class="cg-hero-sub">Prsa · ramena</p>'));
  assert.ok(card.includes('<p class="cg-hero-line"><b>6/6</b> aktivnih vaj · <b>25</b> serij · aktiven dan: <b>Da</b></p>'));
  assert.doesNotMatch(card,/cg-hero-stats/);
  assert.match(card,/<div class="cg-hero-actions"><button type="button" class="cg-quiet cg-nowrap" data-act="day-edit" >Uredi dan<\/button><\/div><\/section>$/);
});

test('Program day card: inactive day says Ne, a hidden/disabled exercise lowers the active count, and few sets use Slovenian agreement',()=>{
  const list=[pex('A',{targetSets:2}),pex('B',{targetSets:1,programDisabled:true}),pex('C',{targetSets:1})];
  const off=programCtx([{name:'Rest',active:false,deleted:false},{name:'Other',active:true,deleted:false}],list).program();
  assert.ok(off.includes('<p class="cg-hero-line"><b>2/3</b> aktivnih vaj · <b>3</b> serije · aktiven dan: <b>Ne</b></p>'));
  const hidden=programCtx([{name:'X',active:true,deleted:false}],list,{c1w0d0e2:true}).program();
  assert.ok(hidden.includes('<b>1/3</b> aktivnih vaj · <b>2</b> seriji · aktiven dan: <b>Da</b>'));
  const one=programCtx([{name:'X',active:true,deleted:false}],[pex('A',{targetSets:1})]).program();
  assert.ok(one.includes('<b>1</b> serija ·'));
});

// ---- Focus ------------------------------------------------------------------------------------------------------------
function metaCtx(){const ctx=harness({esc:s=>String(s),fmt:n=>String(n).replace('.',',')});inner(ctx,'focusMeta');return ctx;}
const fex=(over={})=>({target:4,item:{targetReps:'8-10'},last:{kg:47.5,reps:8},...over});

test('Focus meta is ONE line: "Cilj <b>target</b> · Zadnjič kg × reps" with a previous entry, only the target without one',()=>{
  const ctx=metaCtx();
  const withLast=ctx.focusMeta(fex());
  assert.equal(withLast,'<div class="cg-focus-meta">Cilj <b>4 × 8-10</b> · <span class="cg-focus-last">Zadnjič 47,5 kg × 8</span></div>');
  assert.equal(withLast.match(/class="cg-focus-meta"/g).length,1);
  assert.equal(visibleText(withLast),'Cilj 4 × 8-10 · Zadnjič 47,5 kg × 8');
  const without=ctx.focusMeta(fex({last:null}));
  assert.equal(without,'<div class="cg-focus-meta">Cilj <b>4 × 8-10</b></div>');
  assert.doesNotMatch(without,/Zadnjič|·/);
  // target wording is the one Focus always had: "n × reps", else n + the Slovenian word for sets
  for(const [n,word] of [[1,'serija'],[2,'seriji'],[3,'serije'],[4,'serije'],[5,'serij'],[8,'serij']])
    assert.equal(ctx.focusMeta(fex({target:n,item:{},last:null})),`<div class="cg-focus-meta">Cilj <b>${n} ${word}</b></div>`);
  // the last entry reads exactly like the logger's own .cg-last line (including the optional RPE)
  assert.match(ctx.focusMeta(fex({last:{kg:60,reps:5,rpe:8.5}})),/Zadnjič 60 kg × 5 · RPE 8\.5<\/span>/);
  assert.match(shell,/<div class="cg-last">\$\{e\.last\?`Zadnjič \$\{fmt\(e\.last\.kg\)\} kg × \$\{esc\(e\.last\.reps\)\}\$\{e\.last\.rpe\?' · RPE '\+esc\(e\.last\.rpe\):''\}`:'Še brez prejšnjega vnosa\.'\}<\/div>/);
});

test('Focus renders the meta line from focusMeta() between the exercise name and the logger; the Trening list keeps the logger .cg-last line',()=>{
  const focusBranch=shell.slice(shell.indexOf('if(state.focus){'),shell.indexOf('const picker=state.focus'));
  assert.match(focusBranch,/\$\{title\}\$\{focusMeta\(active\)\}\$\{logger\(active\)\}/);
  assert.doesNotMatch(focusBranch,/class="cg-focus-meta"/,'the old inline two-part meta markup is gone from the branch');
  // logger() (used by the list rows and Focus) still renders its own .cg-last; only css hides it in Focus
  assert.match(shell,/return `<div class="cg-logger"><div class="cg-last">/);
  assert.match(shell,/\$\{open\?logger\(e\):''\}/);
});

test('CSS hides the logger .cg-last line ONLY in Focus (scoped to #cg-app[data-focus="true"]); the list view and the reference rule are untouched',()=>{
  const lastRules=[...v4Rules,...shellRules].filter(r=>r.selectors.some(s=>/\.cg-last\b/.test(s)));
  assert.ok(lastRules.length>=1,'a rule for .cg-last exists');
  for(const r of lastRules){
    assert.ok(r.selectors.every(s=>s.startsWith('#cg-app[data-focus="true"] ')),'scoped to Focus: '+r.selectors.join(','));
    assert.match(r.body,/display:none/);
  }
  assert.ok(lastRules.some(r=>r.selectors.includes('#cg-app[data-focus="true"] .cg-last')));
  const reference=cssRules(referenceCss).filter(r=>r.selectors.includes('#cg-app .cg-last'));
  assert.equal(reference.length,1);assert.doesNotMatch(reference[0].body,/display:none/);
  // the focus meta line is a normal text line (block), muted, with the target in the strong text color
  const meta=v4Body('#cg-app .cg-focus-meta');
  assert.match(meta,/display:block/);assert.match(meta,/color:var\(--cg-muted\)/);
  assert.match(v4Body('#cg-app .cg-focus-meta b'),/color:var\(--cg-text\)/);
  assert.match(v4Body('#cg-app .cg-focus-last'),/white-space:nowrap/);
});

test('Focus step dots: partial = blue border + light blue tint + normal text (digit legible >= 4.5:1); done, pending and current are unchanged',()=>{
  const partial=v4Body('#cg-app .cg-dots button.partial');
  assert.match(partial,/background:color-mix\(in srgb,var\(--cg-partial\) 22%,transparent\)/);
  assert.match(partial,/border-color:var\(--cg-partial\)/);
  assert.match(partial,/(^|;)color:var\(--cg-text\)/);
  assert.doesNotMatch(partial,/gradient/);
  // contrast of the digit on the rendered tint (partial at the rule's alpha, composited on the page background and the surfaces used in Focus)
  const share=Number(/color-mix\(in srgb,var\(--cg-partial\) (\d+)%,transparent\)/.exec(partial)[1])/100;
  for(const surface of ['bg','panel','raised']){
    const tint=mix(tokens['--cg-partial'],share,tokens['--cg-'+surface]);
    assert.ok(ratio(tokens['--cg-text'],tint)>=4.5,`digit on tint over --cg-${surface}: ${ratio(tokens['--cg-text'],tint).toFixed(2)}`);
  }
  assert.ok(ratio(tokens['--cg-partial'],tokens['--cg-bg'])>=3,'the blue ring keeps 3:1 against the page');
  // untouched styles
  assert.equal(v4Body('#cg-app .cg-dots button.done'),'background:var(--cg-ok);border-color:var(--cg-ok);color:var(--cg-bg);');
  assert.match(v4Body('#cg-app .cg-dots button'),/background:transparent;border:1\.5px solid var\(--cg-pending\);color:var\(--cg-pending\)/);
  assert.equal(v4Body('#cg-app .cg-dots button.current'),'box-shadow:0 0 0 2px var(--cg-bg),0 0 0 4px var(--cg-accent);');
  // the digit stays in the button (focusDot markup is unchanged: partial dots still show their number)
  const ctx=harness({state:{active:''},esc:s=>String(s)});inner(ctx,'focusDot');
  assert.match(ctx.focusDot({key:'k',name:'Bench',status:'partial',done:1,target:3},1),/class="partial " data-ex="k" aria-label="Bench: 1\/3">2</);
});

// ---- guard rails for the stylesheet change itself ------------------------------------------------------------------------
test('Step 9 block sits at the END of compact-v4.css, uses only var(--cg-*) tokens (no new literal colors) and carries the new rules',()=>{
  const marker='/* Step 9: compact Trening top, inline hero stats, Focus meta line */';
  assert.equal(v4.split(marker).length-1,1);
  assert.equal(v4.lastIndexOf('/* Step '),v4.indexOf(marker),'no later Step block');
  const block=v4.slice(v4.indexOf(marker)).replace(/\/\*[\s\S]*?\*\//g,'');
  assert.doesNotMatch(block,/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
  assert.match(block,/var\(--cg-/);
  for(const selector of ['#cg-app .cg-hero-head','#cg-app .cg-hero-line','#cg-app[data-focus="true"] .cg-last','#cg-app .cg-dot.none'])assert.match(block,new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),selector);
  // the generated reference stylesheet is never edited by this step
  assert.doesNotMatch(referenceCss,/cg-hero-line|cg-hero-head|cg-dot\.none|Step 9/);
});

test('No new literal colors in the changed shell/v4 rules for the Trening top (status/selection colors come from tokens)',()=>{
  for(const selector of ['#cg-app .cg-quick-weeks button','#cg-app .cg-quick-days button','#cg-app .cg-quick-days button.done','#cg-app .cg-quick-note','#cg-app .cg-next-workout'])
    assert.doesNotMatch(shellBody(selector),/#[0-9a-f]{3,8}\b|rgba?\(/i,selector);
  for(const selector of ['#cg-app .cg-hero','#cg-app .cg-hero-sub','#cg-app .cg-hero-line','#cg-app .cg-focus-meta','#cg-app .cg-dots button.partial'])
    assert.doesNotMatch(v4Body(selector),/#[0-9a-f]{3,8}\b|rgba?\(/i,selector);
  // selection is still drawn separately from status: accent border + tint + glow on the selected day/week
  assert.match(v4Body('#cg-app .cg-quick-days button.selected'),/border-color:var\(--cg-accent\);background:color-mix\(in srgb,var\(--cg-accent\) 10%,var\(--cg-raised\)\)/);
});
