'use strict';
// Phase 3A item 1 — user default rest (wt_default_rest).
// restForEx(id,name,def) must resolve, in order: a per-exercise custom rest
// (wt_custom_rest, keyed by id or name) > the user's default rest
// (wt_default_rest, 30-600s) > the exercise-type fallback `def` passed in.
// This is the single resolver used by the Training rows, Focus meta, Program
// rows and the rest timer start, so covering restForEx covers all of them.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');

function harness(initial={}){
  const data=new Map(Object.entries(initial));
  const localStorage={
    getItem:k=>(data.has(k)?data.get(k):null),
    setItem(k,v){data.set(k,String(v));},
    removeItem:k=>data.delete(k),
  };
  const domStub={classList:{add(){},remove(){},toggle(){}},textContent:'',value:'',hidden:false};
  const context=vm.createContext({
    localStorage,console,window:{},
    document:{getElementById:()=>domStub,addEventListener(){},body:domStub},
    setTimeout:()=>0,alert(){},
    Math,JSON,Object,Array,Number,String,Boolean,parseInt,parseFloat,isNaN,
  });
  vm.runInContext('window.document=document;window.localStorage=localStorage;',context);
  vm.runInContext(read('js/core/bootstrap.js'),context);
  vm.runInContext(read('js/core/state-storage.js'),context);
  return {context,data};
}

test('restForEx falls back to the exercise-type default when nothing is set', ()=>{
  const {context}=harness();
  assert.equal(context.restForEx('ex_bench','Bench press',120),120);
});

test('a user default rest applies to every exercise without its own custom rest', ()=>{
  const {context,data}=harness();
  data.set('wt_default_rest','90');
  assert.equal(context.restForEx('ex_bench','Bench press',120),90);
  assert.equal(context.restForEx('ex_curl','Curl',60),90);
});

test('a custom per-exercise rest always wins over the user default', ()=>{
  const {context,data}=harness();
  data.set('wt_default_rest','90');
  data.set('wt_custom_rest',JSON.stringify({ex_bench:200}));
  assert.equal(context.restForEx('ex_bench','Bench press',120),200,'custom rest by id must win');
  const {context:c2,data:d2}=harness();
  d2.set('wt_default_rest','90');
  d2.set('wt_custom_rest',JSON.stringify({'Bench press':200}));
  assert.equal(c2.restForEx(undefined,'Bench press',120),200,'custom rest by name must win');
});

test('getDefaultRest ignores out-of-range or garbage values (30-600s bounds)', ()=>{
  const cases=[['0',null],['29',null],['601',null],['30',30],['600',600],['abc',null],['',null]];
  for(const [stored,expected] of cases){
    const {context,data}=harness();
    data.set('wt_default_rest',stored);
    assert.equal(context.getDefaultRest(),expected,`wt_default_rest=${JSON.stringify(stored)}`);
    assert.equal(context.restForEx('ex_x','X',77),expected==null?77:expected);
  }
});

test('resetting the default rest (removing wt_default_rest) returns behaviour to the exercise-type default', ()=>{
  const {context,data}=harness();
  data.set('wt_default_rest','150');
  assert.equal(context.restForEx('ex_x','X',77),150);
  context.safeRemoveRaw('wt_default_rest');
  assert.equal(context.getDefaultRest(),null);
  assert.equal(context.restForEx('ex_x','X',77),77);
});

// --- Settings UI (js/compact-shell.js): the Trening row + edit sheet ---
const shell=read('js/compact-shell.js'),compactUi=read('js/compact-ui.js');
function shellFn(ctxObj,name){
  const ctx=vm.createContext(ctxObj);
  vm.runInContext(compactUi,ctx);
  vm.runInContext(shell,ctx);
  const start=shell.indexOf('  function '+name+'('),end=shell.indexOf('\n  function ',start+1);
  assert.ok(start>=0&&end>start,'function '+name+' not found');
  vm.runInContext(shell.slice(start,end),ctx);
  return ctx;
}

test('defaultRestSheet: saving a new value commits wt_default_rest via safeSetRaw and applies bounds 30-600s', ()=>{
  const writes=[];
  const ctx=shellFn({
    esc:s=>String(s),clock:n=>Math.floor(n/60)+':'+String(n%60).padStart(2,'0'),
    button:(act,label,cls,attrs)=>`<button type="button" class="${cls||''}" data-act="${act}" ${attrs||''}>${label}</button>`,
    getDefaultRest:()=>null,
    safeSetRaw:(k,v)=>{writes.push([k,v]);return true;},
    dialog:{innerHTML:'',showModal(){},querySelector:()=>({addEventListener(){}})},
  },'defaultRestSheet');
  let savedBody='',savedFn=null;
  ctx.sheet=(title,body,fn)=>{savedBody=body;savedFn=fn;};
  ctx.notify=()=>{};
  ctx.defaultRestSheet();
  assert.match(savedBody,/Ponastavi \(po vrsti vaje\)/);
  const form=new Map([['minutes','1'],['seconds','30']]);
  savedFn({get:k=>form.get(k)});
  assert.deepEqual(writes,[['wt_default_rest','90']]);
});

test('defaultRestSheet: rejects values outside 30-600 seconds without writing anything', ()=>{
  const writes=[];
  const ctx=shellFn({
    esc:s=>String(s),clock:n=>String(n),
    button:(act,label,cls,attrs)=>`<button type="button" class="${cls||''}" data-act="${act}" ${attrs||''}>${label}</button>`,
    getDefaultRest:()=>null,
    safeSetRaw:(k,v)=>{writes.push([k,v]);return true;},
    dialog:{innerHTML:'',showModal(){},querySelector:()=>({addEventListener(){}})},
  },'defaultRestSheet');
  let savedFn=null;
  ctx.sheet=(title,body,fn)=>{savedFn=fn;};
  ctx.notify=()=>{};
  ctx.defaultRestSheet();
  const tooLow=new Map([['minutes','0'],['seconds','10']]);
  assert.throws(()=>savedFn({get:k=>tooLow.get(k)}),/30–600/);
  assert.equal(writes.length,0);
});
