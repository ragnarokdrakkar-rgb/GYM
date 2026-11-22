'use strict';
// Step 19: local copies (IndexedDB snapshots) can be restored from Settings →
// Varnostna kopija and saved to the phone through the native export path.
// Synthetic data only.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const shell=read('js/compact-shell.js'),tools=read('src/app/analytics-tools.js'),v6=read('src/app/v6-core.js');
function section(src,start,end){const a=src.indexOf(start),b=src.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,start+' found');return src.slice(a,b);}
function shellLine(ctx,decl){const a=shell.indexOf(decl);assert.ok(a>=0,decl+' found');vm.runInContext(shell.slice(a,shell.indexOf('\n',a)),ctx);}

test('pruning keeps 12 copies but never deletes the copy that is being restored',async()=>{
  const deleted=[],all=Array.from({length:14},(_,i)=>({id:i+1,date:`2026-11-${String(20-i).padStart(2,'0')}`}));
  const ctx=vm.createContext({getAllBackups:async()=>all,deleteBackup:async id=>deleted.push(id)});
  vm.runInContext(section(tools,'async function pruneOldBackups(','\n}\n')+'\n}',ctx);
  await ctx.pruneOldBackups(12,13);
  assert.deepEqual(deleted,[14],'the 13th (protected) copy stays, only the 14th goes');
  deleted.length=0;await ctx.pruneOldBackups(12);assert.deepEqual(deleted,[13,14]);
  assert.match(tools,/async function saveBackupToIDB\(blob,label,protectId\)\{/);
  assert.match(tools,/pruneOldBackups\(12,protectId\)\.catch/);
});

test('autoBackupToIDB takes a string label; anything else (e.g. an event) stays "auto"',async()=>{
  const saved=[];const ctx=vm.createContext({buildBackupJSON:async()=>'{}',saveBackupToIDB:async(j,l)=>saved.push(l),localStorage:{setItem(){}},console});
  vm.runInContext(section(tools,'async function autoBackupToIDB(','\n}\n')+'\n}',ctx);
  await ctx.autoBackupToIDB('manual');await ctx.autoBackupToIDB();await ctx.autoBackupToIDB({type:'click'});
  assert.deepEqual(saved,['manual','auto','auto']);
  assert.match(shell,/else if\(act==='snapshot'\)\{const ok=await autoBackupToIDB\('manual'\);/);
});

function downloadCtx(saver){
  const toasts=[];const ctx=vm.createContext({getAllBackups:async()=>[{id:5,date:'2026-11-21T18:42:10.000Z',blob:'{"sets":{}}'}],toast:(t,k)=>toasts.push([t,k||'']),window:{saveBackupFileV13:saver},URL,Blob,document:{}, setTimeout});
  vm.runInContext(section(tools,'async function downloadBackupFromIDB(','\n}\n')+'\n}',ctx);ctx.toasts=toasts;return ctx;
}
test('"Shrani" saves through the shared native/share saver and reports the real outcome',async()=>{
  let got=null;const native=downloadCtx(async(json,filename)=>{got={json,filename};return 'native';});
  assert.equal(await native.downloadBackupFromIDB(5),true);
  assert.deepEqual(got,{json:'{"sets":{}}',filename:'workout_backup_2026-11-21_1842.json'});
  assert.match(native.toasts[0][0],/^Kopija shranjena v mapo Prenosi \(workout_backup_2026-11-21_1842\.json\)\.$/);
  const share=downloadCtx(async()=>'share');await share.downloadBackupFromIDB(5);assert.match(share.toasts[0][0],/poslana v izbrano aplikacijo/);
  const cancelled=downloadCtx(async()=>{const e=new Error('x');e.name='AbortError';throw e;});
  assert.equal(await cancelled.downloadBackupFromIDB(5),false);assert.deepEqual(cancelled.toasts[0],['Shranjevanje preklicano.','']);
  const failed=downloadCtx(async()=>{throw new Error('Backup ni bil shranjen.');});
  assert.equal(await failed.downloadBackupFromIDB(5),false);assert.deepEqual(failed.toasts[0],['Kopije ni bilo mogoče shraniti: Backup ni bil shranjen.','err']);
  const gone=downloadCtx(async()=>'native');assert.equal(await gone.downloadBackupFromIDB(99),false);assert.deepEqual(gone.toasts[0],['Te lokalne kopije ni več.','err']);
  assert.doesNotMatch(section(tools,'async function downloadBackupFromIDB(','\n}\n'),/💾 Backup prenesen/,'no unconditional success toast');
  assert.match(v6,/  window\.saveBackupFileV13=\(json,filename\)=>saveBackupFile\(json,filename\);\n  async function saveBackupFile\(json,filename\)\{\n    const plugin=window\.Capacitor\?\.Plugins\?\.BackupExport;/);
});

test('copy rows show workouts and confirmed sets (not planned rows), a readable label, Obnovi and Shrani',()=>{
  const ctx=vm.createContext({});
  shellLine(ctx,'  function backupLabelV40(');shellLine(ctx,'  function backupCountsV40(');shellLine(ctx,'  function backupWordsV40(');
  const c=ctx.backupCountsV40({sessions:[{},{}],sets:{a:[{done:true},{done:false},{kg:'',reps:''}],b:[{done:true},{done:true}]},bw:{d1:80}});
  assert.equal(JSON.stringify(c),'{"sessions":2,"done":3,"bw":1}');
  assert.equal(ctx.backupWordsV40({sessions:1,done:2}),'1 trening · 2 seriji');
  assert.equal(ctx.backupWordsV40({sessions:3,done:5}),'3 treningi · 5 serij');
  assert.equal(ctx.backupWordsV40({sessions:5,done:1}),'5 treningov · 1 serija');
  assert.equal(ctx.backupLabelV40('auto'),'samodejna');assert.equal(ctx.backupLabelV40('manual'),'ročna');
  assert.equal(ctx.backupLabelV40('pred-obnovo'),'pred obnovo');assert.equal(ctx.backupLabelV40('rollback-before-import'),'pred uvozom datoteke');
  assert.equal(ctx.backupLabelV40(''),'lokalna kopija');
  const render=section(shell,'  async function renderBackups(','\n  async function restoreLocalCopyV40(');
  assert.match(render,/button\('backup-restore','Obnovi','cg-link',`data-index="\$\{b\.id\}" \$\{st\?'':'disabled'\}`\)/,'an unreadable copy cannot be restored');
  assert.match(render,/button\('backup-download','Shrani','cg-link'/);
  assert.match(render,/'ni berljiva · '/);
  assert.match(shell,/else if\(act==='backup-download'\)\{await downloadBackupFromIDB\(index\);return;\}\n\s*else if\(act==='backup-restore'\)await restoreLocalCopyV40\(index\);/);
});

function restoreCtx(over={}){
  const calls=[];const backup={schemaVersion:7,sets:{c1w0d0e0:[{kg:'60',reps:'8',done:true}]},sessions:[{id:'s1',durationMin:40}],bw:{'2026-11-20':80}};
  const ctx=vm.createContext({navigationLocked:()=>false,getAllBackups:async()=>[{id:7,date:'2026-11-21T18:00:00.000Z',blob:JSON.stringify(backup)}],
    validateBackupP1:()=>({ok:true}),getSessions:()=>[{},{}],getSets:()=>({}),getBW:()=>({}),
    ask:async t=>{calls.push(['ask',t]);return true;},buildBackupJSON:async()=>'{"now":1}',
    saveBackupToIDB:async(json,label,protect)=>calls.push(['save',json,label,protect]),
    currentTimerV6:()=>({key:'k'}),stopT:k=>calls.push(['stopT',k]),
    restoreBackupObjectP1:async(b,o)=>calls.push(['restore',b.sessions.length,o.mode,o.photos]),
    busy:false,draft:{clear:()=>calls.push('draft.clear')},state:{page:'Nastavitve',settings:'backup'},
    backupStatsCache:{clear(){}},notify:t=>calls.push(['notify',t]),Date,JSON,...over});
  shellLine(ctx,'  function backupCountsV40(');
  const a=shell.indexOf('  async function restoreLocalCopyV40(');vm.runInContext(shell.slice(a,shell.indexOf('\n  }\n',a)+4),ctx);
  ctx.calls=calls;return ctx;
}
test('restore: confirm with the comparison → save the current state as "pred obnovo" (copy protected) → replace → stay on the list',async()=>{
  const ctx=restoreCtx();await ctx.restoreLocalCopyV40(7);
  const [ask,save,stop,restore]=ctx.calls;
  assert.equal(ask[0],'ask');assert.match(ask[1],/Treningi v zgodovini: 2 → 1\nOpravljene serije: 0 → 1\nMeritve teže: 0 → 1/);assert.match(ask[1],/»pred obnovo«/);
  assert.deepEqual(save,['save','{"now":1}','pred-obnovo',7],'current state first, with the restored copy protected from pruning');
  assert.deepEqual(stop,['stopT','k']);
  assert.deepEqual(restore,['restore',1,'replace',false]);
  assert.equal(ctx.state.page,'Nastavitve');assert.equal(ctx.state.settings,'backup');
  assert.match(ctx.calls.at(-1)[1],/^Obnovljeno iz kopije .+\. Prejšnje stanje je kopija »pred obnovo«\.$/);
});
test('restore is refused during a workout, on cancel nothing changes, and a failed safety copy stops the restore',async()=>{
  await assert.rejects(restoreCtx({navigationLocked:()=>true}).restoreLocalCopyV40(7),/Najprej zaključi ali obnovi aktivni trening/);
  const cancel=restoreCtx({ask:async()=>false});await cancel.restoreLocalCopyV40(7);assert.equal(cancel.calls.length,0);
  const noSave=restoreCtx({saveBackupToIDB:async()=>{throw new Error('QuotaExceededError');}});
  await assert.rejects(noSave.restoreLocalCopyV40(7),/Trenutnega stanja ni bilo mogoče shraniti, zato obnove nisem začel/);
  assert.ok(!noSave.calls.some(c=>c[0]==='restore'));
  await assert.rejects(restoreCtx({validateBackupP1:()=>({ok:false,msg:'Nepodprta shema backupa.'})}).restoreLocalCopyV40(7),/Lokalna kopija ni veljavna: Nepodprta shema backupa\./);
  await assert.rejects(restoreCtx().restoreLocalCopyV40(99),/Te lokalne kopije ni več/);
  const busy=restoreCtx({busy:true});await busy.restoreLocalCopyV40(7);assert.ok(!busy.calls.some(c=>c[0]==='restore'),'no double restore');
});
