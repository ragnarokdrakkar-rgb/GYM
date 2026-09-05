'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

function harness(initial={}){
  const data=new Map(Object.entries(initial)),states=[];
  let reject=null;
  const localStorage={getItem:k=>data.get(k)??null,setItem(k,v){if(reject?.(k,String(v)))throw Object.assign(new Error('full'),{name:'QuotaExceededError'});data.set(k,String(v));},removeItem:k=>data.delete(k)};
  const context=vm.createContext({localStorage,window:{markSaveStateV15:s=>states.push(s)},document:{getElementById:()=>null,addEventListener(){}},setTimeout(){},alert(){},console,LS:{sets:'wt_s6',sessions:'wt_sess6',cycle:'wt_c6',pr:'wt_pr',notes:'wt_notes',bw:'wt_bw',meas:'wt_meas',gym:'wt_gym',pain:'wt_pain',cynotes:'wt_cyn',restplan:'wt_rest',setcounts:'wt_counts',theme:'wt_theme'},V6_KEYS:{settings:'wt_v6_settings',restLog:'wt_rest_log_v6',metaShared:'wt_program_meta_shared_v16',lastExternal:'wt_last_external_backup_v6'},MANAGED_LOCAL_KEYS:['wt_s6','wt_sess6','wt_profile'],CUST_KEY:'wt_custom_ex',getRestLogV6:()=>[],mergeSessions:(a,b)=>[...new Map([...a,...b].map(x=>[x.id,x])).values()]});
  vm.runInContext(read('js/core/state-storage.js')+'\n'+read('js/core/backup.js'),context);
  return {context,data,states,run:s=>vm.runInContext(s,context),rejectWith:fn=>{reject=fn;}};
}

test('failed set write returns false, retains exportable data and cannot be masked by unrelated success',()=>{
  const h=harness();h.rejectWith(k=>k==='wt_s6');
  assert.equal(h.run("saveSets({c1w0d0e0:[{kg:'80',reps:'8',done:true}]})"),false);
  assert.equal(h.run('getSets().c1w0d0e0[0].kg'),'80');
  assert.equal(h.data.has('wt_s6'),false);
  h.run("safeSetRaw('wt_layout','ok')");
  assert.equal(h.states.at(-1),'error');
  h.rejectWith(null);
  assert.equal(h.run('retryPendingStorageWrites()'),true);
  assert.equal(h.states.at(-1),'saved');
  assert.equal(JSON.parse(h.data.get('wt_s6')).c1w0d0e0[0].kg,'80');
});

test('backup rejects NaN, partial numbers, fractional reps, invalid schema and nested roster',()=>{
  const h=harness();
  for(const row of [{kg:'abc',reps:5},{kg:'80kg',reps:5},{kg:80,reps:'3.2'},{kg:Infinity,reps:5},{kg:80,reps:5,rpe:'nan'},{kg:80,reps:5,done:'true'}]){
    h.context.candidate={version:7,sets:{c1w0d0e0:[row]}};
    assert.equal(h.run('validateBackupV18(candidate).ok'),false,JSON.stringify(row));
  }
  h.context.candidate={version:'abc',sets:{}};
  assert.equal(h.run('validateBackupV18(candidate).ok'),false);
  h.context.candidate={version:7,sets:{},daylists:{shared:{0:{n:'Bad array'}}}};
  assert.equal(h.run('validateBackupV18(candidate).ok'),false);
  h.context.candidate=JSON.parse('{"version":7,"sets":{},"notes":{"__proto__":{"bad":true}}}');
  assert.equal(h.run('validateBackupV18(candidate).ok'),false);
});

test('backup accepts legacy blanks and zero external load',()=>{
  const h=harness();
  assert.equal(h.run("validateBackupV18({version:5,sets:{c1w0d0e0:[{kg:'',reps:'',rpe:null,done:false},{kg:0,reps:8,rpe:8,done:true}]}}).ok"),true);
});

test('batch write rolls back every original key if a later write fails',()=>{
  const h=harness({wt_s6:'old sets',wt_sess6:'old sessions',wt_active_sess:'active'});
  h.rejectWith((k,v)=>k==='wt_sess6'&&v==='new sessions');
  assert.throws(()=>h.run("commitStorageBatch(new Map([['wt_s6','new sets'],['wt_sess6','new sessions'],['wt_active_sess',null]]))"));
  assert.equal(h.data.get('wt_s6'),'old sets');
  assert.equal(h.data.get('wt_sess6'),'old sessions');
  assert.equal(h.data.get('wt_active_sess'),'active');
  assert.equal(h.data.has('wt_storage_journal_v18'),false);
});

test('full storage refuses transaction before changing active data if journal does not fit',()=>{
  const h=harness({wt_s6:'old sets'});h.rejectWith(()=>true);
  assert.throws(()=>h.run("commitStorageBatch(new Map([['wt_s6','new sets']]))"));
  assert.equal(h.data.get('wt_s6'),'old sets');
});

test('interrupted transaction journal is recovered on startup',()=>{
  const h=harness({wt_s6:'partial',wt_new:'partial',wt_storage_journal_v18:JSON.stringify([['wt_s6','original'],['wt_new',null]])});
  assert.equal(h.data.get('wt_s6'),'original');assert.equal(h.data.has('wt_new'),false);
  assert.equal(h.data.has('wt_storage_journal_v18'),false);
});

test('invalid restore plans leave all active data unchanged',()=>{
  const h=harness({wt_s6:'original',wt_profile:'bulk'}),before=[...h.data];
  assert.throws(()=>h.run("buildRestorePlanV18({sets:{c1w0d0e0:[{kg:'abc'}]}},'replace')"));
  assert.deepEqual([...h.data],before);
});

test('merge preserves current conflicting sets and does not replace selected program or phase',()=>{
  const h=harness({wt_s6:JSON.stringify({c1w0d0e0:[{kg:80,reps:8}]}),wt_profile:'cut',wt_daylist_shared_v16:JSON.stringify({0:[{id:'mine',n0:'My exercise'}]})});
  h.run("commitStorageBatch(buildRestorePlanV18({version:7,sets:{c1w0d0e0:[{kg:10,reps:2}],c1w0d1e0:[{kg:30,reps:9}]},profile:'bulk',daylists:{shared:{0:[{n0:'Other'}]}}},'merge'))");
  assert.equal(h.run('getSets().c1w0d0e0[0].kg'),80);
  assert.equal(h.run('getSets().c1w0d1e0[0].kg'),30);
  assert.equal(h.data.get('wt_profile'),'cut');
  assert.equal(JSON.parse(h.data.get('wt_daylist_shared_v16'))[0][0].id,'mine');
});

test('session identity is stable across repeated finalization attempts',()=>{
  const h=harness();
  const source=read('src/app/gym-session-core.js');
  const functionSource=source.slice(source.indexOf('function buildImmutableSessionRecord('),source.indexOf('function buildSessionSnapshot('));
  Object.assign(h.context,{buildSessionSnapshot:()=>({totals:{},exercises:[]}),getActiveProfile:()=> 'cut',DAY_NAMES:['Push'],cw:0,cd:0});
  vm.runInContext(functionSource,h.context);
  assert.equal(h.run("buildImmutableSessionRecord(new Date('2026-09-05T12:00:00Z'),new Date(),30,{sessionId:'stable-session',cycle:1,weekIdx:0,dayIdx:0}).id"),'stable-session');
});

function sessionHarness(){
  const h=harness(),messages=[];
  h.context.document.getElementById=()=>({textContent:'',classList:{add(){},remove(){}}});
  Object.assign(h.context,{uiConfirm:async()=>true,toast:(message,type)=>messages.push({message,type}),showDay(){},renderTodayCard(){},setGymMode(){},getActiveProfile:()=> 'cut',DAY_NAMES:['Push'],setInterval:()=>1,clearInterval(){},pad:n=>String(n).padStart(2,'0'),autoBackupToIDB:async()=>false,buildImmutableSessionRecord:(start,end,duration,ctx)=>({id:ctx.sessionId,dayName:'Push',cycle:ctx.cycle,weekIdx:ctx.weekIdx,dayIdx:ctx.dayIdx,totals:{},exercises:[]})});
  const source=read('src/app/workout-runtime.js');
  vm.runInContext(source.slice(source.indexOf("const LS_SESS='wt_active_sess'"),source.indexOf('function restoreSession(){')),h.context);
  return {...h,messages};
}

test('failed finalization retains active session; retry commits exactly once and separates snapshot failure',async()=>{
  const h=sessionHarness();
  assert.equal(await h.run('toggleSess()'),true);
  const active=h.data.get('wt_active_sess');
  h.rejectWith((key,value)=>key==='wt_sess6'&&value.startsWith('['));
  assert.equal(await h.run('toggleSess()'),false);
  assert.equal(h.run('stRun'),true);
  assert.equal(h.data.get('wt_active_sess'),active);
  assert.equal(h.run('getSessions().length'),0);
  h.rejectWith(null);
  assert.equal(await h.run('toggleSess()'),true);
  assert.equal(h.run('stRun'),false);
  assert.equal(h.data.has('wt_active_sess'),false);
  assert.equal(h.run('getSessions().length'),1);
  assert.match(h.messages.at(-1).message,/shranjen.*kopija.*ni uspela/);
});

test('repeated day starts fresh sets while preserving the completed session and recovery draft',async()=>{
  const h=sessionHarness();
  await h.run('toggleSess()');
  h.run("saveSets({c1w0d0e0:[{kg:80,reps:8,rpe:8,done:true}]})");
  await h.run('toggleSess()');
  const oldId=h.run('getSessions()[0].id');
  await h.run('toggleSess()');
  assert.equal(h.run('getSets().c1w0d0e0.length'),0);
  assert.equal(h.run('getSessions()[0].id'),oldId);
  assert.equal(JSON.parse(h.data.get('wt_previous_day_draft_v18')).sets.c1w0d0e0[0].kg,80);
});

test('double tapping session start does not immediately finish the new session',async()=>{
  const h=sessionHarness();
  await Promise.all([h.run('toggleSess()'),h.run('toggleSess()')]);
  assert.equal(h.run('stRun'),true);
  assert.equal(h.run('getSessions().length'),0);
});
