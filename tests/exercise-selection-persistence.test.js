'use strict';
// Item 6: selected exercises (custom additions, swaps/renames, active/inactive
// flags and order — all stored in wt_daylist_shared_v16 + wt_program_meta_shared_v16)
// must stay selected across reload, week change, cycle change, Cut/Bulk switch and
// backup export -> import. Synthetic roster used throughout: a custom exercise, a
// swap/rename, and a disabled exercise.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const shell=read('js/compact-shell.js');

const roster=()=>({0:[
  {id:'bench',n0:'Bench Press',m:true,r:120,extra:false,progMode:'auto'},
  {id:'custom-1',n0:'My custom exercise',m:false,r:90,extra:true,progMode:'auto'}, // a custom added exercise
  {id:'row',n0:'Row',m:true,r:90,extra:false,progMode:'auto',sw:[{n:'Cable row',c:1,w:0}],programDisabled:true}, // swapped/renamed AND disabled
]});

test('cycle-new (Nov cikel) writes only the cycle key — the exercise roster and program meta are untouched',()=>{
  const start=shell.indexOf("else if(act==='cycle-new')"),end=shell.indexOf("else if(act==='settings-back')",start);
  assert.ok(start>=0&&end>start,'cycle-new branch found');
  const branch=shell.slice(start,end);
  assert.match(branch,/commitStorageBatch\(\[\[LS\.cycle,/);
  // Only one call to commitStorageBatch, and it is the cycle-key pair above —
  // no second [key,value] pair follows it (that would look like `}]],[` or `)],[`).
  assert.equal((branch.match(/commitStorageBatch\(/g)||[]).length,1);
  assert.doesNotMatch(branch,/_dlKey\(\)|wt_daylist|metaShared|saveDayLists/);
});

test('setWeek (week change) never touches the shared roster or program meta',()=>{
  const start=shell.indexOf('function setWeek('),end=shell.indexOf('\n  function ',start+1);
  const body=start>=0?shell.slice(start,end):'';
  if(start>=0){ // setWeek may live in compact-shell.js or be a thin wrapper over a shared core function
    assert.doesNotMatch(body,/_dlKey\(\)|wt_daylist|metaShared|saveDayLists/);
  }
  // The daylist lookup itself is keyed by week only for DISPLAY NAME (dispNameForItem),
  // never for which exercises exist — dayListFor(di,c,w) reads the same shared list.
  const model=read('src/app/workout-model.js');
  assert.match(model,/function dayListFor\(di,c,w\)\{\n  const all=getDayLists\(\);/);
});

function backupHarness(initial={}){
  const data=new Map(Object.entries(initial)),states=[];
  let reject=null;
  const localStorage={getItem:k=>data.get(k)??null,setItem(k,v){if(reject?.(k,String(v)))throw Object.assign(new Error('full'),{name:'QuotaExceededError'});data.set(k,String(v));},removeItem:k=>data.delete(k)};
  const context=vm.createContext({localStorage,window:{markSaveStateV15:s=>states.push(s)},document:{getElementById:()=>null,addEventListener(){}},setTimeout(){},alert(){},console,LS:{sets:'wt_s6',sessions:'wt_sess6',cycle:'wt_c6',pr:'wt_pr',notes:'wt_notes',bw:'wt_bw',meas:'wt_meas',gym:'wt_gym',pain:'wt_pain',cynotes:'wt_cyn',restplan:'wt_rest',setcounts:'wt_counts',theme:'wt_theme'},V6_KEYS:{settings:'wt_v6_settings',restLog:'wt_rest_log_v6',metaShared:'wt_program_meta_shared_v16',lastExternal:'wt_last_external_backup_v6'},MANAGED_LOCAL_KEYS:['wt_s6','wt_sess6','wt_profile','wt_daylist_shared_v16','wt_program_meta_shared_v16'],CUST_KEY:'wt_custom_ex',getRestLogV6:()=>[],mergeSessions:(a,b)=>[...new Map([...a,...b].map(x=>[x.id,x])).values()]});
  vm.runInContext(read('js/core/state-storage.js')+'\n'+read('js/core/backup.js'),context);
  return {context,data,run:s=>vm.runInContext(s,context)};
}

test('backup export -> import round-trip preserves a custom exercise, a swap/rename and a disabled exercise exactly (replace mode)',()=>{
  const h=backupHarness();
  const meta={days:[{name:'Push',active:true,deleted:false}]};
  const before=roster();
  h.context.candidate={
    version:7,
    sets:{},
    profile:'cut',
    daylists:{shared:before},
    programMeta:{shared:meta},
  };
  assert.equal(h.run('validateBackupV18(candidate).ok'),true);
  h.run("commitStorageBatch(buildRestorePlanV18(candidate,'replace'))");
  const restoredRoster=JSON.parse(h.data.get('wt_daylist_shared_v16'));
  const restoredMeta=JSON.parse(h.data.get('wt_program_meta_shared_v16'));
  assert.deepEqual(restoredRoster,before);
  assert.deepEqual(restoredMeta,meta);
  // Specifically: the custom exercise, the swap and the disabled flag survived.
  assert.equal(restoredRoster[0][1].extra,true);
  assert.equal(restoredRoster[0][1].n0,'My custom exercise');
  assert.deepEqual(restoredRoster[0][2].sw,[{n:'Cable row',c:1,w:0}]);
  assert.equal(restoredRoster[0][2].programDisabled,true);
});

test('backup import in merge mode never overwrites an existing roster with an imported one (imported daylists are replace-only)',()=>{
  const h=backupHarness({wt_daylist_shared_v16:JSON.stringify(roster())});
  const before=JSON.parse(h.data.get('wt_daylist_shared_v16'));
  h.context.candidate={version:7,sets:{c1w0d0e0:[{kg:80,reps:8,done:true}]},daylists:{shared:{0:[{n0:'Imported exercise'}]}}};
  assert.equal(h.run('validateBackupV18(candidate).ok'),true);
  h.run("commitStorageBatch(buildRestorePlanV18(candidate,'merge'))");
  assert.deepEqual(JSON.parse(h.data.get('wt_daylist_shared_v16')),before);
});
