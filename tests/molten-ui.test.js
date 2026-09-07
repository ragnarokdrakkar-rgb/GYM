'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ui=fs.readFileSync(require('node:path').join(__dirname,'../js/app-ui.js'),'utf8');
function harness({running=false,recovery=false,write=true}={}){
  const meta={days:[{name:'A',active:true},{name:'B',active:false},{name:'C',active:false,deleted:true}]};
  const calls=[];
  const ctx=vm.createContext({stRun:running,window:{v6RecoveryPending:recovery},getProgramMetaV6:()=>JSON.parse(JSON.stringify(meta)),V6_KEYS:{metaShared:'meta'},safeSetRaw:(key,value)=>{calls.push(['write',key,JSON.parse(value)]);return write;},applyProgramStateV6:()=>calls.push(['apply']),renderDayTabsV6:()=>{},renderProgramPageV18:()=>{},toast:(msg,type)=>calls.push([type,msg])});
  vm.runInContext(ui.slice(ui.indexOf('function restoreProgramDayV22'),ui.indexOf('function openProgramDayV18')),ctx);
  return {calls,run:i=>vm.runInContext(`restoreProgramDayV22(${i})`,ctx)};
}
test('Molten archive restore blocks active and recovery sessions',()=>{
  for(const options of [{running:true},{recovery:true}]){const h=harness(options);h.run(1);assert.equal(h.calls.some(x=>x[0]==='write'),false);}
});
test('Molten archive restore preserves indexes, rejects deleted days and reports no false success on failed write',()=>{
  const h=harness();h.run(1);const saved=h.calls.find(x=>x[0]==='write')[2];assert.equal(saved.days[1].active,true);assert.equal(saved.days[2].deleted,true);
  const failed=harness({write:false});failed.run(1);assert.equal(failed.calls.some(x=>x[0]==='apply'||x[0]==='ok'),false);
  const deleted=harness();deleted.run(2);assert.equal(deleted.calls.length,0);
});
test('Molten week shortcuts use canonical day indexes rather than filtered positions',()=>{
  assert.match(ui,/const i=Number\(d.dataset.dayIndex\)/);
  assert.match(ui,/\.dtabs \.dt\[data-day-index\]/);
});

test('Week strip excludes inactive and deleted days, keeps original navigation indexes and removes empty strip',()=>{
  const source=ui.slice(ui.indexOf('  function renderWeekStrip(){'),ui.indexOf('  // --- Napredek:'));
  const meta={days:Array.from({length:6},()=>({active:true}))};meta.days[1].active=false;
  let removed=false;
  const strip={dataset:{},innerHTML:'',remove(){removed=true;}};
  const tabs=meta.days.map((_,i)=>({dataset:{dayIndex:String(i)},querySelector:()=>({textContent:'Day '+i}),classList:{contains:c=>c==='done'&&[0,2,3].includes(i)}}));
  const context=vm.createContext({getProgramMetaV6:()=>meta,esc:s=>s,document:{getElementById:id=>id==='week-strip-v22'?strip:{},querySelectorAll:()=>tabs,querySelector:()=>null}});
  vm.runInContext(source+';renderWeekStrip();',context);
  assert.match(strip.innerHTML,/3 \/ 5 opravljenih/);
  assert.doesNotMatch(strip.innerHTML,/openProgramDayV18\(1\)/);
  assert.match(strip.innerHTML,/openProgramDayV18\(4\)/);
  meta.days[4].deleted=true;vm.runInContext('renderWeekStrip()',context);
  assert.doesNotMatch(strip.innerHTML,/openProgramDayV18\(4\)/);
  meta.days.forEach(d=>d.active=false);vm.runInContext('renderWeekStrip()',context);assert.equal(removed,true);
});

test('Focus review is visible and dot rings have breathing room',()=>{
  const css=fs.readFileSync(require('node:path').join(__dirname,'../css/app.css'),'utf8');
  assert.match(css,/html\.gym-mode \.set-review-v18\{display:block!important;/);
  assert.match(css,/min-height:44px;padding:12px;gap:16px/);
  assert.match(ui,/if\(value!==current\)setRpe\(key,si,value/);
});
