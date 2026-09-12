const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const core=fs.readFileSync(path.join(__dirname,'../src/app/v6-core.js'),'utf8');
test('Finished timer schedules its own dismissal even after timer intervals stop',()=>{
  let callback,renders=0;const ctx=vm.createContext({Date,setTimeout:fn=>(callback=fn,1),clearTimeout:()=>{},renderGlobalTimerV10:()=>renders++});
  const body=core.slice(core.indexOf('  let timerFinishedUntilV10=0;'),core.indexOf('\n  }',core.indexOf('  function showTimerFinishedV25'))+4);
  vm.runInContext(body+';showTimerFinishedV25(2500)',ctx);assert.equal(renders,1);assert.ok(vm.runInContext('timerFinishedUntilV10',ctx)>0);
  callback();assert.equal(vm.runInContext('timerFinishedUntilV10',ctx),0);assert.equal(renders,2);
});
test('Builder adds once, persists before closing, and leaves chooser open on failed write',()=>{
  for(const fail of [false,true]){
    let saved={0:[]},closed=0;const ctx=vm.createContext({stRun:false,window:{},getProgramMetaV6:()=>({days:[{}]}),ensureDayLists:()=>{},getDayLists:()=>JSON.parse(JSON.stringify(saved)),getCyc:()=>({num:1}),cw:0,dispNameForItem:x=>x.n0,exerciseItemV14:o=>({id:'new',n0:o.name}),_dlKey:()=>'roster',CUST_KEY:'custom',commitStorageBatch:changes=>{if(fail)throw Error('write failed');saved=JSON.parse(changes[0][1]);},closeExerciseChooserV14:()=>closed++,closeCustomExerciseV14:()=>{},renderProgramBuilderV6:()=>{},toast:()=>{}});
    vm.runInContext(core.slice(core.indexOf('  function addExerciseToDayV14('),core.indexOf('  function ensureCustomPopupV14')),ctx);
    vm.runInContext("addExerciseToDayV14(0,{name:'QA exercise'});addExerciseToDayV14(0,{name:'QA exercise'})",ctx);
    assert.equal(saved[0].length,fail?0:1);assert.equal(closed,fail?0:1);
  }
});
test('Weight chart range uses calendar days and never mutates complete history',()=>{
  const analytics=fs.readFileSync(path.join(__dirname,'../src/app/analytics-tools.js'),'utf8');const ctx=vm.createContext({Date});
  vm.runInContext(analytics.slice(analytics.indexOf('function bwChartWindowV25'),analytics.indexOf('function renderBW()')),ctx);
  const entries=[['2026-01-01',80],['2026-08-01',81],['2026-09-12',82]];
  assert.equal(ctx.bwChartWindowV25(entries,30).length,1);assert.equal(ctx.bwChartWindowV25(entries,90).length,2);assert.equal(ctx.bwChartWindowV25(entries,0).length,3);assert.equal(entries.length,3);
});
test('Builder popup is above its parent overlay',()=>{
  const css=fs.readFileSync(path.join(__dirname,'../css/app.css'),'utf8');assert.match(css,/\.builder-sheet-v14\{\s*z-index:1100!important/);
});
