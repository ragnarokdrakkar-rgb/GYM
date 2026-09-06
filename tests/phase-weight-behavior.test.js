'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a);return source.slice(a,b);}
const bodyweight=section(read('src/app/analytics-tools.js'),'// BODYWEIGHT','// MEASUREMENTS');
const profile=section(read('src/app/profile-strength.js'),'function getActiveProfile()','// 5/3/1:');
function harness({type='bulk',start='2026-09-04',goal=85,weights={},phases}={}){
  const stored=new Map([['wt_profile',type],['wt_bwgoal',String(goal)],['wt_bw6',JSON.stringify(weights)],['wt_phases',JSON.stringify(phases||[{type:'cut',start:'2026-08-01',end:'2026-09-03'},{type,start,end:null}])]]);
  const elements=Object.fromEntries(['bw-prog-wrap','bw-chart-card','bw-log-card','bw-stats-card','bw-pf','bw-pt','bw-prog-label','bw-start-label','bw-goal-label','bw-log','bw-chart','bw-stats','phase-list'].map(id=>[id,{style:{},textContent:'',innerHTML:'',getContext:()=>({})}]));
  const charts=[],writes=[];
  const ctx=vm.createContext({
    localStorage:{getItem:key=>stored.get(key)??null,setItem:(key,value)=>{writes.push(key);stored.set(key,String(value));}},
    getBW:()=>JSON.parse(stored.get('wt_bw6')),saveBW:()=>{throw new Error('Rendering must not write bodyweight history');},
    document:{getElementById:id=>elements[id]||null,documentElement:{getAttribute:()=> 'dark'}},
    bwChart:null,Chart:class {constructor(canvas,config){this.config=config;charts.push(this);}destroy(){this.destroyed=true;}}
  });
  vm.runInContext(profile+bodyweight,ctx);
  return {stored,elements,charts,writes,run:code=>vm.runInContext(code,ctx),render(){vm.runInContext('renderBW()',ctx);return elements['bw-stats'].innerHTML;}};
}

test('Bulk loss is not praised as Cut and never receives a green weekly-loss signal',()=>{
  const h=harness({weights:{'2026-09-04':82,'2026-09-11':81.5,'2026-09-18':81}});
  const html=h.render();
  assert.match(html,/Bulk: teža trenutno pada — nasprotno smeri faze Bulk/);
  assert.match(html,/color:var\(--amber-text\);">-0\.50kg/);
  assert.doesNotMatch(html,/Idealen tempo|tempo za cut|izgubo mišice|manjšem deficitu/);
  assert.match(html,/stran od cilja/);
});

test('new Bulk phase excludes prior Cut trend even with three daily new-phase measurements',()=>{
  const h=harness({weights:{'2026-08-14':85,'2026-08-21':84.5,'2026-08-28':84,'2026-09-03':83.5,'2026-09-04':83.4,'2026-09-05':83.3,'2026-09-06':83.2}});
  const html=h.render();
  assert.match(html,/Za trend faze Bulk še ni dovolj podatkov/);
  assert.match(html,/vsaj 3 meritve.*vsaj 7 dni/);
  assert.match(html,/>83\.3kg</);
  assert.doesNotMatch(html,/Bulk: teža trenutno|Pri tem tempu|stran od cilja|kg\/teden/);
  assert.match(h.elements['bw-start-label'].textContent,/83\.4kg \(2026-09-04\)/);
  assert.equal(h.elements['bw-pf'].style.width,'0%');
});

test('one or zero phase measurements show insufficient data instead of a historical trend',()=>{
  for(const current of [{},{'2026-09-04':81.5}]){
    const h=harness({weights:{'2026-08-21':83,'2026-08-28':82.5,'2026-09-03':82,...current}});
    const html=h.render();
    assert.match(html,/Za trend faze Bulk še ni dovolj podatkov/);
    assert.doesNotMatch(html,/Pri tem tempu|Bulk: teža trenutno/);
    assert.equal(h.elements['bw-pf'].style.width,'0%');
    if(!Object.keys(current).length)assert.match(h.elements['bw-start-label'].textContent,/čaka na meritev/);
  }
});

test('Cut with enough current-phase measurements has a correctly signed phase-only trend',()=>{
  const h=harness({type:'cut',start:'2026-09-04',goal:78,weights:{'2026-08-20':76,'2026-08-27':78,'2026-09-03':80,'2026-09-04':82,'2026-09-11':81.5,'2026-09-18':81}});
  const html=h.render();
  assert.match(html,/Cut: teža trenutno pada\./);
  assert.match(html,/color:var\(--green-text\);">-0\.50kg/);
  assert.match(html,/Pri tem tempu dosežeš 78kg/);
  assert.equal(h.elements['bw-pf'].style.width,'25%');
  assert.match(h.elements['bw-start-label'].textContent,/82kg \(2026-09-04\)/);
});

test('Bulk gain uses the current-phase baseline even when the all-time first weight is above the goal',()=>{
  const h=harness({goal:84,weights:{'2026-08-01':95,'2026-09-03':82,'2026-09-04':81,'2026-09-11':81.5,'2026-09-18':82}});
  const html=h.render();
  assert.match(html,/Bulk: teža trenutno narašča\./);
  assert.match(html,/color:var\(--green-text\);">\+0\.50kg/);
  assert.equal(h.elements['bw-pf'].style.width,'33%');
  assert.equal(h.elements['bw-pt'].textContent,'1.0kg pridobljeno v tej fazi · 33%');
  assert.match(h.elements['bw-start-label'].textContent,/81kg \(2026-09-04\)/);
});

test('a stale Cut goal in Bulk is flagged without overwriting it or forecasting further loss',()=>{
  const h=harness({goal:80,weights:{'2026-08-01':95,'2026-09-04':82,'2026-09-11':81.5,'2026-09-18':81}});
  const before=Array.from(h.stored),html=h.render();
  assert.match(html,/Zapisani cilj 80kg ni v smeri faze Bulk/);
  assert.match(h.elements['bw-pt'].textContent,/Preveri cilj/);
  assert.doesNotMatch(html,/Pri tem tempu dosežeš|Cilj dosežen/);
  assert.equal(h.elements['bw-pf'].style.width,'0%');
  assert.deepEqual(Array.from(h.stored),before);
  assert.deepEqual(h.writes,[]);
});

test('rendering phase statistics preserves the complete measurement chart, log and phase history',()=>{
  const weights={'2026-08-01':90,'2026-08-15':88,'2026-08-29':86,'2026-09-04':85,'2026-09-11':85.5,'2026-09-18':86};
  const h=harness({weights,goal:90}),before=Array.from(h.stored);
  h.render();
  for(const date of Object.keys(weights))assert.ok(h.elements['bw-log'].innerHTML.includes(date));
  assert.deepEqual(Array.from(h.charts[0].config.data.datasets[0].data),Object.values(weights));
  assert.equal(h.charts[0].config.data.labels.length,Object.keys(weights).length);
  assert.match(h.elements['phase-list'].innerHTML,/2026-08-01 → 2026-09-03/);
  assert.match(h.elements['phase-list'].innerHTML,/2026-09-04 → zdaj/);
  assert.deepEqual(Array.from(h.stored),before);
  assert.deepEqual(h.writes,[]);
});

test('canonical profile does not borrow a mismatched open Cut phase or a completed Bulk phase',()=>{
  const h=harness({phases:[{type:'bulk',start:'2026-08-01',end:'2026-08-31'},{type:'cut',start:'2026-09-01',end:null}],weights:{'2026-09-04':82,'2026-09-11':81.5,'2026-09-18':81}});
  const html=h.render();
  assert.match(html,/Začetek trenutne faze Bulk ni zabeležen/);
  assert.doesNotMatch(html,/Cut: teža|Bulk: teža|Pri tem tempu/);
  assert.equal(h.elements['bw-pf'].style.width,'0%');
});

test('seven-day average does not pull in older entries when recent measurements are sparse',()=>{
  const h=harness();
  assert.equal(h.run("avg7d([['2026-08-01',95],['2026-09-04',82],['2026-09-18',81]])"),81);
});

test('two widely separated measurements cannot bypass the current-phase trend data requirement',()=>{
  const h=harness({weights:{'2026-09-04':82,'2026-11-04':81}});
  assert.match(h.render(),/Za trend faze Bulk še ni dovolj podatkov/);
});
