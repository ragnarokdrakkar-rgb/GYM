/* Historical corrections are explicit, journaled and never rename the live roster. */
function historyRowsV24(sets=getSets(),sessions=getSessions(),prs=getPRs()){
  const out=[];
  const add=(ref,name,set,source)=>{
    if(!set||typeof set!=='object')return;
    if(!set.done&&!set.kg&&!set.reps)return;
    const kg=Number(set.kg),reps=Number(set.reps),rpe=Number(set.rpe);
    const reasons=[];
    if((set.done||ref.kind==='pr')&&(!Number.isFinite(kg)||kg<0||!Number.isInteger(reps)||reps<1))reasons.push('Neveljavna teža ali ponovitve');
    if(kg>250)reasons.push('Teža nad 250 kg — preveri vnos');
    if(reps>12)reasons.push('Več kot 12 ponovitev — ocena e1RM je manj zanesljiva');
    if(set.rpe!=null&&set.rpe!==''&&(!Number.isFinite(rpe)||rpe<1||rpe>10))reasons.push('RPE zunaj 1–10');
    if(ref.kind==='pr')reasons.push('Shranjen PR — preveri izvor, lahko je starejši od popravljenih serij');
    if(ref.kind!=='pr')source+=set.done?' · opravljeno':' · nezaključen vnos';
    out.push({ref,name:name||'Neznana stara vaja',set,source,reasons,e1rm:kg>=0&&reps>0?Math.round(kg*(1+reps/30)):null});
  };
  sessions.forEach((session,si)=>(session.exercises||[]).forEach((ex,ei)=>(ex.sets||[]).forEach((set,ri)=>add({kind:'session',si,ei,ri},ex.name||set.exName,set,`${session.date||'Brez datuma'} · ${session.dayName||''} · zaključeni trening · serija ${ri+1}`))));
  Object.entries(sets).forEach(([key,rows])=>{if(Array.isArray(rows))rows.forEach((set,ri)=>add({kind:'sets',key,ri},set?.exName,set,`${key} · shranjeni vnos · serija ${ri+1}`));});
  Object.entries(prs).forEach(([key,value])=>add({kind:'pr',key},value?.exName||`PR ${key} (ime ni shranjeno)`,typeof value==='number'?{kg:value,reps:1}:value,`${key} · PR, uporabljen tudi pri razmerju moči`));
  return out;
}
function historyTargetV24(data,ref){
  if(ref.kind==='session')return data.sessions[ref.si]?.exercises?.[ref.ei]?.sets?.[ref.ri];
  if(ref.kind==='sets')return data.sets[ref.key]?.[ref.ri];
  const value=data.prs[ref.key];return typeof value==='number'?{kg:value,reps:1}:value;
}
function historyCorrectionV24(data,ref,expected,values){
  const next=JSON.parse(JSON.stringify(data)),old=historyTargetV24(next,ref);
  if(!old||JSON.stringify(old)!==expected)throw new Error('Zapis se je spremenil. Ponovno odpri urejanje.');
  const kg=Number(values.kg),reps=Number(values.reps),rpe=values.rpe===''?null:Number(values.rpe),name=String(values.name||'').trim();
  if(values.kg===''||!Number.isFinite(kg)||kg<0||kg>2000||!Number.isInteger(reps)||reps<1||reps>1000||rpe!==null&&(!Number.isFinite(rpe)||rpe<1||rpe>10)||!name||name.length>160)throw new Error('Preveri ime, kg (0–2000), ponovitve (1–1000) in RPE (1–10 ali prazno).');
  const updated={...old,kg,reps,rpe,exName:name,volume:kg*reps};
  if(ref.kind==='sets')next.sets[ref.key][ref.ri]=updated;
  else if(ref.kind==='pr')next.prs[ref.key]=updated;
  else{
    const session=next.sessions[ref.si],ex=session.exercises[ref.ei];ex.sets[ref.ri]=updated;
    // Name applies to this historical exercise only, never the current program.
    ex.name=name;
    let total=0,done=0,tonnage=0;
    session.exercises.forEach(e=>(e.sets||[]).forEach(s=>{if(s.type==='warmup'||s.warm)return;total++;if(s.done){done++;tonnage+=(Number(s.kg)||0)*(Number(s.reps)||0);}}));
    session.totals={...session.totals,sets:total,doneSets:done,tonnage:Math.round(tonnage)};
    if('tonnage' in session)session.tonnage=Math.round(tonnage);
  }
  return next;
}
// Removes ONE saved workout record from history (e.g. started by mistake). Only the
// session record goes; the day's logged sets and PRs stay untouched, so nothing else
// changes. Rejects a stale record and refuses to touch anything but that index.
function historyDeleteSessionV35(data,si,expected){
  const next=JSON.parse(JSON.stringify(data)),old=next.sessions?.[si];
  if(!old||JSON.stringify(old)!==expected)throw new Error('Trening se je spremenil. Ponovno odpri zgodovino.');
  next.sessions.splice(si,1);
  return next;
}
// One-step undo for a history edit: only the stores that actually change, and
// only their previous value. (Storing both full "before" and "after" of sets,
// sessions and PRs held the whole history four times at once during the commit
// and overflowed localStorage on real phones.) `fingerprint` of the result lets
// undo check that nothing else changed in between.
function historyUndoSnapshotV35(before,next){
  const changed={};
  for(const store of ['sets','sessions','prs']){const b=JSON.stringify(before[store]),a=JSON.stringify(next[store]);if(b!==a)changed[store]=before[store];}
  return {version:35,before:changed,after:historyFingerprintV35(next)};
}
function historyFingerprintV35(data){
  const text=JSON.stringify([data.sets,data.sessions,data.prs]);let h=0;
  for(let i=0;i<text.length;i++)h=(h*31+text.charCodeAt(i))>>>0;
  return text.length+':'+h.toString(16);
}
// The batch of a history edit: changed stores plus the slim undo snapshot.
function historyCommitEntriesV35(before,next){
  const undo=historyUndoSnapshotV35(before,next),entries=[];
  for(const [store,key] of [['sets',LS.sets],['sessions',LS.sessions],['prs',LS.pr]])if(store in undo.before)entries.push([key,JSON.stringify(next[store])]);
  entries.push(['wt_history_undo_v24',JSON.stringify(undo)]);
  return entries;
}
// Entries that restore the snapshot. Returns null when the current data is not
// what the edit produced (then an automatic undo is not safe).
function historyUndoEntriesV35(undo,current){
  if(!undo||undo.version!==35||!undo.before||typeof undo.before!=='object')return null;
  if(historyFingerprintV35(current)!==undo.after)return null;
  const entries=[];
  for(const [store,key] of [['sets',LS.sets],['sessions',LS.sessions],['prs',LS.pr]])if(store in undo.before)entries.push([key,JSON.stringify(undo.before[store])]);
  entries.push(['wt_history_undo_v24',null]);
  return entries;
}
let historySelectionV24=null,historyVisibleV24=[],historyLimitV24=50;
function renderHistoryEditorV24(reset=true){
  const host=document.getElementById('history-results-v24');if(!host)return;
  if(reset)historyLimitV24=50;
  const query=document.getElementById('history-query-v24').value.trim().toLowerCase(),only=document.getElementById('history-suspect-v24').checked;
  historyVisibleV24=historyRowsV24().filter(r=>(!only||r.reasons.length)&&(!query||`${r.name} ${r.source}`.toLowerCase().includes(query)));
  host.innerHTML='<p>'+historyVisibleV24.length+' zapisov. Viri so prikazani ločeno: zaključeni trening, shranjeni vnos in PR. Popravek spremeni samo izbrani vir.</p>'+historyVisibleV24.slice(0,historyLimitV24).map((r,i)=>'<article class="history-row-v24"><strong>'+safeHtml(r.name)+'</strong><small>'+safeHtml(r.source)+'</small><div>'+safeHtml(String(r.set.kg))+' kg × '+safeHtml(String(r.set.reps))+' · RPE '+safeHtml(String(r.set.rpe??'—'))+'</div><small>e1RM: '+(r.e1rm??'—')+' kg · kg × (1 + ponovitve / 30), ocena, ne dvignjena teža</small>'+r.reasons.map(x=>'<small class="history-warning-v24">'+safeHtml(x)+'</small>').join('')+'<button type="button" class="sb" onclick="openHistoryEditV24('+i+')">Uredi zapis</button></article>').join('')+(historyVisibleV24.length>historyLimitV24?'<button type="button" class="sb" onclick="historyLimitV24+=50;renderHistoryEditorV24(false)">Prikaži še 50</button>':'');
}
function openHistoryEditV24(index){
  if(stRun||window.v6RecoveryPending){toast('Najprej zaključi ali obnovi aktivni trening.','err');return;}
  const row=historyVisibleV24[index];if(!row)return;
  historySelectionV24={ref:row.ref,expected:JSON.stringify(row.set)};
  for(const [field,value] of Object.entries({name:row.name,kg:row.set.kg,reps:row.set.reps,rpe:row.set.rpe??''}))document.getElementById('history-edit-'+field).value=value;
  document.getElementById('history-edit-source').textContent=row.source;
  document.getElementById('history-dialog-v24').showModal();
}
function saveHistoryEditV24(){
  if(stRun||window.v6RecoveryPending){toast('Med treningom zgodovine ni mogoče spreminjati.','err');return;}
  if(!historySelectionV24)return;
  try{
    const before={sets:getSets(),sessions:getSessions(),prs:getPRs()},values={};
    for(const field of ['name','kg','reps','rpe'])values[field]=document.getElementById('history-edit-'+field).value;
    const next=historyCorrectionV24(before,historySelectionV24.ref,historySelectionV24.expected,values);
    // A durable one-step undo and all affected stores commit together or roll back.
    commitStorageBatch(historyCommitEntriesV35(before,next));
    document.getElementById('history-dialog-v24').close();historySelectionV24=null;renderHistoryEditorV24();toast('Popravek shranjen. Drugi viri in program ostanejo nespremenjeni.','ok');
  }catch(error){toast(error.message,'err');}
}
async function undoHistoryEditV24(){
  if(stRun||window.v6RecoveryPending){toast('Najprej zaključi trening.','err');return;}
  try{
    const undo=JSON.parse(readStorageRaw('wt_history_undo_v24')||'null');if(!undo){toast('Ni popravka za razveljavitev.','err');return;}
    if(!historyUndoEntriesV35(undo,{sets:getSets(),sessions:getSessions(),prs:getPRs()}))throw new Error('Podatki so se od popravka spremenili. Samodejna razveljavitev ni varna.');
    if(!await uiConfirm('Razveljavim zadnji popravek zgodovine?'))return;
    const entries=stRun||window.v6RecoveryPending?null:historyUndoEntriesV35(undo,{sets:getSets(),sessions:getSessions(),prs:getPRs()});
    if(!entries)throw new Error('Podatki so se spremenili. Ponovno odpri zgodovino.');
    commitStorageBatch(entries);
    renderHistoryEditorV24();toast('Zadnji popravek razveljavljen.','ok');
  }catch(error){toast(error.message,'err');}
}
