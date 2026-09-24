'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),shell=read('js/compact-shell.js');
function harness(extra={}){const ctx=vm.createContext(extra);vm.runInContext(shell,ctx);return ctx;}
function inner(ctx,name){const start=shell.indexOf('  function '+name+'('),end=shell.indexOf('\n  function ',start+1);assert.ok(start>=0&&end>start,'function '+name+' not found');vm.runInContext(shell.slice(start,end),ctx);}
function innerConst(ctx,name){const re=new RegExp('  const '+name+'=.*;');const m=shell.match(re);assert.ok(m,'const '+name+' not found');vm.runInContext(m[0],ctx);}

function navCtx(dayCount,overrides={}){
  const days=Array.from({length:dayCount},(_,i)=>({dayIndex:i,name:'Dan '+i,total:3,done:0,completed:false,status:'pending',date:''}));
  const meta={days:Array.from({length:dayCount},()=>({active:true,deleted:false}))};
  const ctx=harness({PROG:{weeks:[{},{},{},{}]},cw:0,cd:0,state:{day:0},getActiveProfile:()=>'cut',navigationLocked:()=>false,
    getProgramMetaV6:()=>meta,weekOverview:()=>({cycle:1,days,done:0,total:dayCount,partial:0,status:'pending'}),
    esc:s=>s,icon:()=>'',dateLabel:s=>s,button:(act,label,cls,attrs)=>`<button data-act="${act}" ${attrs||''}>${label}</button>`,...overrides});
  for(const fn of ['weekLabel','chipWord','chip','quickNavigation'])inner(ctx,fn);
  return ctx;
}

test('Day-grid column rule: n<=3 uses n columns, n=4 uses 2, n 5-6 use 3, n=7 uses 4',()=>{
  for(const [n,cols] of [[1,1],[2,2],[3,3],[4,2],[5,3],[6,3],[7,4]]){
    const html=navCtx(n).quickNavigation();
    assert.match(html,new RegExp(`--day-columns:${cols}"`),`n=${n} expected ${cols} columns`);
  }
});

test('Chip words cover every status, distinguish partial fractions, and are honest about empty programs',()=>{
  const ctx=harness({});inner(ctx,'chipWord');
  assert.equal(ctx.chipWord('done',3,3,false),'Opravljeno');
  assert.equal(ctx.chipWord('partial',1,3,false),'Delno 1/3');
  assert.equal(ctx.chipWord('active',1,3,false),'V teku');
  assert.equal(ctx.chipWord('pending',0,3,false),'Ni opravljeno');
  assert.equal(ctx.chipWord('pending',0,0,false),'Brez vaj');
  assert.equal(ctx.chipWord('done',3,3,true),'✓');
  assert.equal(ctx.chipWord('partial',1,3,true),'1/3');
  assert.equal(ctx.chipWord('active',1,3,true),'●');
  assert.equal(ctx.chipWord('pending',0,3,true),'○');
  assert.equal(ctx.chipWord('pending',0,0,true),'–');
});

test('Four-column (seven day) grids use short chip words but keep the full status in aria-label',()=>{
  const html=navCtx(7).quickNavigation();
  assert.match(html,/data-quick-day="0"/);
  assert.match(html,/<span>○<\/span>/);
  assert.doesNotMatch(html,/<span>Ni opravljeno<\/span>/);
  assert.match(html,/aria-label="Dan 0: Še ni opravljeno"/);
});

test('Inactive-day note reports the count, wording and adjusted total; singular vs plural',()=>{
  const html2=navCtx(1,{getProgramMetaV6:()=>({days:[{active:true},{active:false,deleted:false},{active:false,deleted:false},{deleted:true}]})}).quickNavigation();
  assert.match(html2,/2 neaktivnih dni ni prikazanih in ne šteje v 0\/1\./);
  const html1=navCtx(1,{getProgramMetaV6:()=>({days:[{active:true},{active:false,deleted:false}]})}).quickNavigation();
  assert.match(html1,/1 neaktiven dan ni prikazan in ne šteje v 0\/1\./);
  const html0=navCtx(1).quickNavigation();
  assert.doesNotMatch(html0,/neaktiv/);
});

test('Hero primary action label matches day status, and running shows the finish action and clock',()=>{
  const ctx=harness({cd:2,stRun:false,stStart:0,getSessions:()=>[],clock:n=>String(n),icon:()=>'',esc:s=>s,button:(act,label,cls)=>`<button data-act="${act}" class="${cls||''}">${label}</button>`});
  inner(ctx,'chipWord');inner(ctx,'chip');innerConst(ctx,'shortDate');inner(ctx,'heroCard');
  const day={name:'Dan',sub:''};
  assert.match(ctx.heroCard({status:'pending',done:0,total:3},day,0,3,1),/Začni trening/);
  assert.match(ctx.heroCard({status:'partial',done:1,total:3},day,1,3,1),/Nadaljuj/);
  assert.match(ctx.heroCard({status:'done',done:3,total:3},day,3,3,1),/Ponovi trening/);
  ctx.stRun=true;ctx.stStart=Date.now();
  const running=ctx.heroCard({status:'active',done:1,total:3},day,1,3,1);
  assert.match(running,/Zaključi trening/);
  assert.match(running,/data-session-clock/);
});

test('Exercise rows do not auto-open: state.openRow starts empty, controls which row is open, and is distinct from state.active',()=>{
  assert.match(shell,/openRow:''/);
  assert.match(shell,/state\.openRow=state\.openRow===b\.dataset\.ex\?'':b\.dataset\.ex/);
  assert.match(shell,/const open=e\.key===state\.openRow/);
  assert.match(shell,/\$\{open\?logger\(e\):''\}/);
});

test('Starting a session opens the first unfinished exercise row',()=>{
  assert.match(shell,/const first=workoutCache\.find\(x=>x\.status!=='done'\)\|\|workoutCache\[0\];state\.openRow=first\?\.key\|\|'';state\.active=first\?\.key\|\|state\.active;/);
});

test('compact-v4.css loads in the shadow root after compact-shell.css',()=>{
  const readyMatch=shell.match(/const ready=\[([^\]]+)\]/);
  assert.ok(readyMatch);
  const list=JSON.parse('['+readyMatch[1].replace(/'/g,'"')+']');
  assert.deepEqual(list,['css/compact-reference.css','css/compact-shell.css','css/compact-v4.css']);
});

test('Service worker precaches compact-v4.css and the four WT Display font files',()=>{
  const sw=read('sw.js');
  for(const f of ['css/compact-v4.css','assets/fonts/barlow-condensed-latin-600-normal.woff2','assets/fonts/barlow-condensed-latin-700-normal.woff2','assets/fonts/barlow-condensed-latin-ext-600-normal.woff2','assets/fonts/barlow-condensed-latin-ext-700-normal.woff2'])assert.ok(sw.includes(f),f);
});

test('compact-host.css defines the WT Display font-face for weights 600 and 700, latin and latin-ext, with font-display:swap',()=>{
  const css=read('css/compact-host.css');
  assert.match(css,/@font-face\{font-family:"WT Display";font-style:normal;font-weight:600;font-display:swap;src:url\('\.\.\/assets\/fonts\/barlow-condensed-latin-600-normal\.woff2'\)/);
  assert.match(css,/@font-face\{font-family:"WT Display";font-style:normal;font-weight:700;font-display:swap;src:url\('\.\.\/assets\/fonts\/barlow-condensed-latin-700-normal\.woff2'\)/);
  assert.match(css,/barlow-condensed-latin-ext-600-normal\.woff2/);
  assert.match(css,/barlow-condensed-latin-ext-700-normal\.woff2/);
  assert.equal((css.match(/@font-face/g)||[]).length,4);
});

test('Note under the days never tells an unfinished week with exercises to add exercises',()=>{
  const ctx=navCtx(3);const html=ctx.quickNavigation();
  assert.doesNotMatch(html,/Dodaj aktivne vaje/);assert.doesNotMatch(html,/Vsi aktivni treningi/);assert.doesNotMatch(html,/quick-next/);
  const empty=navCtx(2,{weekOverview:()=>({cycle:1,days:[{dayIndex:0,name:'A',total:0,done:0,completed:false,status:'pending'},{dayIndex:1,name:'B',total:0,done:0,completed:false,status:'pending'}],done:0,total:2,partial:0,status:'pending'})});
  assert.match(empty.quickNavigation(),/Dodaj aktivne vaje/);
  const done=[{dayIndex:0,name:'A',total:3,done:3,completed:true,status:'done'},{dayIndex:2,name:'C',total:3,done:0,completed:false,status:'pending'}];
  const next=navCtx(2,{weekOverview:()=>({cycle:1,days:done,done:1,total:2,partial:0,status:'partial'})}).quickNavigation();
  assert.match(next,/data-act="quick-next" data-index="2"/);assert.match(next,/Naslednji: C/);
  assert.match(navCtx(3,{navigationLocked:()=>true}).quickNavigation(),/zaklenjena/);
});
test('Short 4-column chip shows the real partial count',()=>{
  const ctx=navCtx(7);assert.equal(ctx.chipWord('partial',2,5,true),'2/5');assert.equal(ctx.chipWord('partial',2,5,false),'Delno 2/5');
});
