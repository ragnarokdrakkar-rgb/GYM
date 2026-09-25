'use strict';
// A restore (replace or merge) must drop the history/plan/body-weight undo
// snapshots: they describe pre-restore data, and replaying one afterwards would
// overwrite the imported sets, sessions, PRs or weights. Synthetic data only.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const UNDO=['wt_history_undo_v24','wt_plan_undo_v26','wt_bw_undo_v27'];

function harness(initial){
  const data=new Map(Object.entries(initial));
  const localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
  const context=vm.createContext({localStorage,window:{markSaveStateV15(){}},document:{getElementById:()=>null,addEventListener(){}},setTimeout(){},alert(){},console,LS:{sets:'wt_s6',sessions:'wt_sess6',cycle:'wt_c6',pr:'wt_p6',notes:'wt_n6',bw:'wt_bw6',meas:'wt_m6',gym:'wt_gym',pain:'wt_pain',cynotes:'wt_cyn',restplan:'wt_rest',setcounts:'wt_sc6',theme:'wt_theme'},V6_KEYS:{settings:'wt_v6_settings',restLog:'wt_rest_log_v6',metaShared:'wt_program_meta_shared_v16',lastExternal:'wt_last_external_backup_v6'},MANAGED_LOCAL_KEYS:['wt_s6','wt_sess6'],CUST_KEY:'wt_custom_ex',getRestLogV6:()=>[],getCyc:()=>({num:1}),getSessions:()=>[],mergeSessions:(a,b)=>[...a,...b]});
  vm.runInContext(read('js/core/state-storage.js')+'\n'+read('js/core/backup.js'),context);
  return {data,context,run:s=>vm.runInContext(s,context)};
}
const seeded=()=>Object.fromEntries([...UNDO.map(k=>[k,JSON.stringify({before:{sets:{}}})]),['wt_s6','{}']]);

for(const mode of ['replace','merge']){
  test(`${mode} restore clears history, plan and body-weight undo buffers`,()=>{
    const h=harness(seeded());
    h.context.candidate={version:7,sets:{c1w0d0e0:[{kg:80,reps:5,done:true}]},sessions:[]};
    assert.equal(h.run('validateBackupV18(candidate).ok'),true);
    h.run(`commitStorageBatch(buildRestorePlanV18(candidate,'${mode}'))`);
    for(const k of UNDO)assert.equal(h.data.has(k),false,`${k} cleared after ${mode}`);
    assert.ok(JSON.parse(h.data.get('wt_s6')).c1w0d0e0,'imported sets present');
  });
}
