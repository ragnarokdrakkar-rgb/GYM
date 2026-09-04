// === P1 CORE: stable exercise IDs, gym mode, pain guard, session snapshots ===
function safeHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function slugifyP1(v){return String(v||'vaja').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'vaja';}
function exStableId(name){return 'ex_'+slugifyP1(name);}
function currentExerciseName(di,ei,key){const e=PROG.days[di]&&PROG.days[di].ex[ei];return getSwappedName(key,e?e.n:'Vaja',e&&e.extra);}
function getPain(key){const p=getPainData();return Number(p[key]&&p[key].level)||0;}
function setExPain(key,val,di,ei,cn){
  const level=Math.max(0,Math.min(10,parseInt(val)||0));
  const p=getPainData();
  if(level>0){p[key]={level,date:new Date().toISOString(),exerciseId:exStableId(currentExerciseName(di,ei,key)),exerciseName:currentExerciseName(di,ei,key),cycle:cn,week:cw+1,day:DAY_NAMES[di]};}
  else delete p[key];
  savePainData(p);
  const box=document.getElementById('pain-'+key);
  if(box){box.className='pain-box '+(level>=5?'danger':level>=3?'warn':'');const msg=box.querySelector('.pain-msg');if(msg)msg.textContent=painMessage(level,currentExerciseName(di,ei,key));}
  if(level>=5)toast('Bolečina 5+ — danes ne lovi PR-ja. Zamenjaj ali zmanjšaj.', 'err');
  else if(level>=3)toast('Bolečina 3–4 — zmanjšaj intenzivnost/volumen.', 'err');
  else if(level>0)toast('Bolečina zabeležena', 'ok');
}
function painMessage(level,name){
  if(level>=5)return '5+ / 10: stop za PR-je. Zamenjaj vajo ali zmanjšaj ROM/težo.';
  if(level>=3)return '3–4 / 10: ohrani tehniko, brez grinderjev, manj volumen/intenzivnost.';
  if(level>0)return '1–2 / 10: spremljaj. Če se stopnjuje, prekini težke sete.';
  if(/deadlift|rdl|romanian|squat|leg curl|hamstring|good morning|lunge|bulgarian|hip thrust/i.test(name||''))return '0 / 10: OK. Če se pojavi bolečina, jo zabeleži pred naslednjim setom.';
  return '0 / 10';
}
function renderPainBox(key,name,di,ei,cn){
  const level=getPain(key);
  const cls=level>=5?'danger':level>=3?'warn':'';
  const opts=Array.from({length:11},(_,i)=>`<option value="${i}" ${i===level?'selected':''}>${i}</option>`).join('');
  return `<div class="pain-box ${cls}" id="pain-${key}"><span>🩹 Bolečina</span><select aria-label="Stopnja bolečine za ${safeHtml(name)}" onchange="setExPain('${key}',this.value,${di},${ei},${cn})">${opts}</select><span class="pain-msg">${safeHtml(painMessage(level,name))}</span></div>`;
}
function getGymMode(){return localStorage.getItem('wt_gym_mode')==='1';}
function setGymMode(on){
  safeSetRaw('wt_gym_mode',on?'1':'0');
  document.documentElement.classList.toggle('gym-mode',!!on);document.body.classList.toggle('gym-mode',!!on);
  const b=document.getElementById('gym-mode-btn');if(b){b.classList.toggle('gym-on',!!on);b.textContent=on?'Izhod':'Fokus';}
  refreshGymTarget();
}
function toggleGymMode(){setGymMode(!getGymMode());}
function isActiveGymEx(key){return localStorage.getItem('wt_active_ex')===key;}
function isExercisePending(key){
  const m=String(key).match(/^c(\d+)w(\d+)d(\d+)e(\d+)$/);if(!m)return false;
  const w=+m[2],di=+m[3],ei=+m[4],all=getSets();
  if(!PROG.days[di]||!PROG.days[di].ex[ei]||isExHidden(key))return false;
  const n=nsf(di,ei,PROG.weeks[w],key),sets=all[key]||[];
  return !sets.slice(0,n).every(s=>s&&s.done);
}
function visibleExerciseKeys(){return Array.from(document.querySelectorAll('#day-content .exc')).map(c=>c.id.replace(/^ec-/,''));}
function findNextPendingExerciseKey(){
  const cn=getCyc().num,di=cd,w=cw,all=getSets(),exs=(PROG.days[di]&&PROG.days[di].ex)||[];
  for(let ei=0;ei<exs.length;ei++){const key=sdk(cn,w,di,ei);if(isExHidden(key))continue;const n=nsf(di,ei,PROG.weeks[w],key),sets=all[key]||[];if(!sets.slice(0,n).every(s=>s&&s.done))return key;}
  return '';
}
function setGymFocus(key,scroll=true){
  if(!key)return;safeSetRaw('wt_active_ex',key);
  document.querySelectorAll('.exc.active-ex').forEach(x=>x.classList.remove('active-ex'));
  const c=document.getElementById('ec-'+key);if(c)c.classList.add('active-ex');
  updateGymFocusBar(key);
  if(scroll&&c)setTimeout(()=>c.scrollIntoView({behavior:'smooth',block:'start'}),50);
}
function moveGymFocus(dir){
  const keys=visibleExerciseKeys();if(!keys.length)return;
  const cur=localStorage.getItem('wt_active_ex');let i=keys.indexOf(cur);if(i<0)i=0;
  i=Math.max(0,Math.min(keys.length-1,i+dir));setGymFocus(keys[i],true);
}
function updateGymFocusBar(key){
  const nameEl=document.getElementById('gym-focus-name'),metaEl=document.getElementById('gym-focus-meta');if(!nameEl||!metaEl)return;
  const m=String(key||'').match(/^c(\d+)w(\d+)d(\d+)e(\d+)$/);if(!m){nameEl.textContent='Trening zaključen';metaEl.textContent='Vse serije so opravljene';return;}
  const di=+m[3],ei=+m[4],name=currentExerciseName(di,ei,key),sets=(getSets()[key]||[]),n=nsf(di,ei,PROG.weeks[+m[2]],key),done=sets.slice(0,n).filter(x=>x&&x.done).length;
  nameEl.textContent=name;metaEl.textContent=`${done}/${n} serij · podrsaj ali uporabi puščici`;
}
function refreshGymTarget(){
  let next=localStorage.getItem('wt_active_ex');
  const onCurrentDay=next&&new RegExp(`^c${getCyc().num}w${cw}d${cd}e\\d+$`).test(next);
  if(!onCurrentDay||!isExercisePending(next))next=findNextPendingExerciseKey();
  if(next)setGymFocus(next,false);else{localStorage.removeItem('wt_active_ex');document.querySelectorAll('.exc.active-ex').forEach(x=>x.classList.remove('active-ex'));updateGymFocusBar('');}
  const gt=document.getElementById('gym-target');
  if(gt){
    if(!getGymMode())gt.textContent='Fokus pokaže samo aktivno vajo, večje kontrole in naslednji set.';
    else if(next){const m=String(next).match(/d(\d+)e(\d+)$/),nm=m?currentExerciseName(+m[1],+m[2],next):'Naslednja vaja';gt.innerHTML=`🎯 Aktivno: <strong>${safeHtml(nm)}</strong>`;}
    else gt.textContent='Vse vaje za ta dan so zaključene.';
  }
}
function buildImmutableSessionRecord(start,end,durMin,ctx){
  const c=ctx||{};
  const cn=Number(c.cycle)||getCyc().num, w=Number.isInteger(c.weekIdx)?c.weekIdx:cw, di=Number.isInteger(c.dayIdx)?c.dayIdx:cd;
  const profile=c.profile||getActiveProfile();
  const snap=buildSessionSnapshot(cn,w,di);
  return {
    schemaVersion:4,
    id:'sess_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),
    date:start.toISOString().split('T')[0],
    startISO:start.toISOString(),endISO:end.toISOString(),
    dayName:DAY_NAMES[di],dayIdx:di,weekNum:w+1,weekIdx:w,cycle:cn,profile,
    startTime:start.toLocaleTimeString('sl-SI',{hour:'2-digit',minute:'2-digit'}),
    endTime:end.toLocaleTimeString('sl-SI',{hour:'2-digit',minute:'2-digit'}),
    durationMin:durMin,
    totals:snap.totals,
    exercises:snap.exercises,
    snapshotLocked:true
  };
}
function buildSessionSnapshot(cn,w,di){
  const all=getSets(),exs=(PROG.days[di]&&PROG.days[di].ex)||[];
  const exercises=[];let totalSets=0,totalDone=0,totalTonnage=0,maxPain=0;
  exs.forEach((e,ei)=>{
    const key=sdk(cn,w,di,ei); if(isExHidden(key))return;
    const name=getSwappedName(key,e.n,e.extra);
    const n=nsf(di,ei,PROG.weeks[w],key);
    const raw=(all[key]||[]).slice(0,n);
    const pain=getPain(key);maxPain=Math.max(maxPain,pain);
    const sets=raw.map((s,si)=>{
      const kg=parseFloat(s.kg)||0,reps=parseInt(s.reps)||0,vol=kg*reps;
      totalSets++; if(s.done)totalDone++; totalTonnage+=s.done?vol:0;
      return {set:si+1,kg:s.kg||'',reps:s.reps||'',rpe:s.rpe||null,done:!!s.done,drop:!!s.drop,note:s.note||'',volume:vol,exerciseId:s.exerciseId||exStableId(name),exName:s.exName||name};
    });
    exercises.push({key,exerciseId:exStableId(name),name,originalName:e.n||name,isExtra:!!e.extra,isMain:!!e.m,targetSets:n,targetReps:(PROG.weeks[w]||{}).reps||'',pain,sets});
  });
  return {exercises,totals:{sets:totalSets,doneSets:totalDone,tonnage:Math.round(totalTonnage),maxPain}};
}
function getSuggestedDayIndex(){
  const sessions=getSessions();if(!sessions.length)return 0;
  const last=sessions[0],i=DAY_NAMES.indexOf(last.dayName);return i<0?0:(i+1)%DAY_NAMES.length;
}
function getLastSessionForDay(di){return getSessions().find(x=>x.dayIdx===di||x.dayName===DAY_NAMES[di])||null;}
function getMainSuggestionForDay(di){
  const d=PROG.days[di];if(!d)return null;const ei=d.ex.findIndex(e=>e.m);if(ei<0)return null;
  const cn=getCyc().num,key=sdk(cn,cw,di,ei),name=currentExerciseName(di,ei,key);
  const sets=getSets()[key]||[];let kg=Math.max(0,...sets.map(x=>parseFloat(x.kg)||0));
  if(!kg){const last=getLastSession(di,ei,cn,cw);kg=last?parseFloat(last.kg)||0:0;}
  return {name,kg};
}
function renderTodayCard(){
  const el=document.getElementById('today-card');if(!el||!PROG.days[cd])return;
  const suggested=getSuggestedDayIndex(),last=getLastSessionForDay(cd),main=getMainSuggestionForDay(cd),isSuggested=suggested===cd;
  const lastTxt=last?`Zadnjič ${last.date}: ${last.durationMin||'?'} min`:'Ta trening še nima session zgodovine';
  const mainTxt=main&&main.kg?`${main.name}: izhodišče ${main.kg} kg`:main?main.name:'';
  const phase=getActiveProfile()==='bulk'?'Bulk · rast':'Cut · ohranjanje';
  el.innerHTML=`<div class="today-card-grid"><div><div class="today-eyebrow">${isSuggested?'Predlagan naslednji trening':'Izbran trening'}</div><div class="today-title">${safeHtml(PROG.days[cd].title)} · Teden ${cw+1}</div><div class="today-meta">${safeHtml(lastTxt)}${mainTxt?'<br>'+safeHtml(mainTxt):''}</div></div><button class="today-action" onclick="startTodayWorkout()">${stRun?'Nadaljuj':'Začni trening'}</button></div><div class="today-secondary"><span>Cikel ${getCyc().num} · ${phase}</span>${!isSuggested?`<button class="sb" onclick="openSuggestedWorkout(${suggested})" style="padding:4px 9px;">Predlog: ${safeHtml(DAY_NAMES[suggested])}</button>`:''}</div>`;
}
function openSuggestedWorkout(di){showDay(di);renderTodayCard();}
function startTodayWorkout(){
  if(!stRun)toggleSess();setGymMode(true);refreshGymTarget();scrollToActiveEx();
}
function maybeShowOnboarding(){if(!localStorage.getItem('wt_onboarding_done'))document.getElementById('onboarding-pop')?.classList.add('on');}
function finishOnboarding(profile){
  safeSetRaw('wt_onboarding_done','1');document.getElementById('onboarding-pop')?.classList.remove('on');
  if(profile){setActiveProfile(profile==='bulk'?'bulk':'cut');PROG=buildPhaseProgramV16(profile);ensureDayLists();applyProgramStateV6(profile);initProfileUI();showDay(cd);}
  toast((profile==='bulk'?'Bulk':'Cut')+' faza je pripravljena. Vaje lahko kadarkoli urediš v builderju.','ok');
}
function initP1(){setGymMode(getGymMode());migrateSetExerciseIds();renderTodayCard();}
function migrateSetExerciseIds(){
  const all=getSets();let changed=false;
  Object.keys(all).forEach(k=>{const m=k.match(/^c(\d+)w(\d+)d(\d+)e(\d+)$/);if(!m)return;const di=+m[3],ei=+m[4];const e=PROG.days[di]&&PROG.days[di].ex[ei];const nm=e?e.n:'Vaja';(all[k]||[]).forEach(s=>{if(s&&!s.exerciseId){s.exerciseId=exStableId(s.exName||nm);changed=true;}});});
  if(changed)saveSets(all);
}
function plainImportedText(v,max=5000){return String(v??'').replace(/[<>\u0000]/g,'').slice(0,max);}
function sanitizeImported(value,depth=0){
  if(depth>12)return null;if(typeof value==='string')return plainImportedText(value);
  if(Array.isArray(value))return value.slice(0,50000).map(v=>sanitizeImported(v,depth+1));
  if(value&&typeof value==='object'){const out={};Object.entries(value).slice(0,50000).forEach(([k,v])=>{out[plainImportedText(k,180)]=sanitizeImported(v,depth+1);});return out;}
  return value;
}
function validateBackupP1(backup){
  if(!backup||typeof backup!=='object'||Array.isArray(backup))return {ok:false,msg:'Datoteka ni veljaven JSON objekt.'};
  if(!backup.sets||typeof backup.sets!=='object'||Array.isArray(backup.sets))return {ok:false,msg:'Backup ne vsebuje sets podatkov.'};
  if(backup.sessions!==undefined&&!Array.isArray(backup.sessions))return {ok:false,msg:'sessions mora biti seznam.'};
  if(Number(backup.schemaVersion||backup.version||1)>5)return {ok:false,msg:'Backup je iz novejše verzije aplikacije.'};
  let rows=0;
  for(const [k,v] of Object.entries(backup.sets)){
    if(!/^c\d+w\d+d\d+e\d+$/.test(k)||!Array.isArray(v))return {ok:false,msg:'Pokvarjen ključ setov: '+k};
    rows+=v.length;if(rows>250000)return {ok:false,msg:'Backup vsebuje nenormalno veliko setov.'};
    for(const set of v){if(!set||typeof set!=='object'||Array.isArray(set))return {ok:false,msg:'Neveljaven zapis seta.'};const kg=parseFloat(set.kg||0),reps=parseInt(set.reps||0);if(kg<0||kg>1500||reps<0||reps>1000)return {ok:false,msg:'Backup vsebuje nerealne kg ali ponovitve.'};}
  }
  if(Array.isArray(backup.sessions)&&backup.sessions.length>100000)return {ok:false,msg:'Preveč session zapisov.'};
  return {ok:true,msg:'OK'};
}
function backupSummaryP1(backup){
  const setKeys=backup.sets?Object.keys(backup.sets).length:0,setRows=backup.sets?Object.values(backup.sets).reduce((a,v)=>a+(Array.isArray(v)?v.length:0),0):0,sess=Array.isArray(backup.sessions)?backup.sessions.length:0,bw=backup.bw?Object.keys(backup.bw).length:0,pain=backup.pain?Object.keys(backup.pain).length:0,bd=backup.date?String(backup.date).split('T')[0]:'neznan datum',bv=backup.schemaVersion||backup.version||'?';
  return `Backup ${bd} · shema ${bv}\n${sess} sessionov · ${setKeys} vaj / ${setRows} setov · ${bw} meritev teže · ${pain} zapisov bolečine\n\nZamenjaj vse = popolna obnova. Združi = uvoženi zapisi dopolnijo trenutno bazo.`;
}
function mergeObj(current,incoming){return {...(current&&typeof current==='object'?current:{}),...(incoming&&typeof incoming==='object'?incoming:{})};}
function mergeSessions(current,incoming){
  const map=new Map();[...(current||[]),...(incoming||[])].forEach(x=>{if(!x||typeof x!=='object')return;const k=x.id||[x.date,x.dayName,x.startISO||x.startTime,x.durationMin].join('|');map.set(k,x);});
  return [...map.values()].sort((a,b)=>String(b.startISO||b.date||'').localeCompare(String(a.startISO||a.date||'')));
}
const MANAGED_LOCAL_KEYS=[...Object.values(LS),'wt_sugs6','wt_bwgoal','wt_alarm6','wt_collars_kg','wt_exswap','wt_extra_ex','wt_hidden_ex','wt_daylist_cut','wt_daylist_bulk','wt_daylist_shared_v16','wt_daylist_migration_v16','wt_program_meta_shared_v16','wt_ex_ordernames','wt_rep_prs','wt_phases','wt_profile','wt_531tm','wt_531offset','wt_goals','wt_daylog','wt_custom_ex','wt_kg_step','wt_reps_step','wt_colors','wt_custom_rest','wt_compact','wt_gym_mode','wt_active_ex','wt_active_timer'];
function clearManagedData(){MANAGED_LOCAL_KEYS.forEach(k=>localStorage.removeItem(k));}
async function restoreBackupObjectP1(rawBackup,opts={}){
  const checked=validateBackupP1(rawBackup);if(!checked.ok)throw new Error(checked.msg);
  const backup=sanitizeImported(rawBackup),mode=opts.mode||'replace';
  if(mode==='replace')clearManagedData();
  const putObj=(key,val,getter)=>{if(val===undefined)return;const next=mode==='merge'?mergeObj(getter(),val):val;lss(key,next);};
  putObj(LS.sets,backup.sets,getSets);putObj(LS.pr,backup.pr||{},getPRs);putObj(LS.notes,backup.notes||{},getNotes);putObj(LS.bw,backup.bw||{},getBW);putObj(LS.meas,backup.meas||{},getMeas);putObj(LS.gym,backup.gym||{},getGym);putObj(LS.pain,backup.pain||{},getPainData);putObj(LS.cynotes,backup.cynotes||{},getCyNotes);putObj(LS.restplan,backup.restplan||{},getRestPlan);putObj(LS.setcounts,backup.setcounts||{},getSetCounts);
  if(backup.cycle){const cur=getCyc(),inc=backup.cycle;saveCyc(mode==='merge'?{num:Math.max(cur.num||1,inc.num||1),startDates:mergeObj(cur.startDates,inc.startDates)}:inc);}
  if(mode==='merge')saveSessions(mergeSessions(getSessions(),backup.sessions||[]));else saveSessions(Array.isArray(backup.sessions)?backup.sessions:[]);
  const setRaw=(k,v,merge=false)=>{if(v===undefined)return;if(merge){let cur={};try{cur=JSON.parse(localStorage.getItem(k)||'{}');}catch(e){}localStorage.setItem(k,JSON.stringify(mergeObj(cur,v)));}else localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));};
  if(backup.bwgoal!==undefined)localStorage.setItem('wt_bwgoal',String(backup.bwgoal));
  let importedTheme=backup.theme;if(importedTheme==='"dark"'||importedTheme==='"light"'){try{importedTheme=JSON.parse(importedTheme);}catch(e){}}if(importedTheme==='dark'||importedTheme==='light')localStorage.setItem(LS.theme,importedTheme);
  if(backup.alarm)saveAlarmSettings(backup.alarm);if(backup.collars!==undefined)setCollars(backup.collars);
  setRaw('wt_exswap',backup.swaps,mode==='merge');setRaw('wt_extra_ex',backup.extra_ex,mode==='merge');setRaw('wt_hidden_ex',backup.hidden_ex,mode==='merge');setRaw('wt_ex_ordernames',backup.ex_ordernames,mode==='merge');setRaw('wt_rep_prs',backup.rep_prs,mode==='merge');
  if(backup.daylists){if(backup.daylists.cut)setRaw('wt_daylist_cut',backup.daylists.cut);if(backup.daylists.bulk)setRaw('wt_daylist_bulk',backup.daylists.bulk);if(backup.daylists.shared)setRaw('wt_daylist_shared_v16',backup.daylists.shared);}
  if(backup.phases)setRaw('wt_phases',backup.phases);if(backup.profile)setRaw('wt_profile',backup.profile);if(backup.tm531)setRaw('wt_531tm',backup.tm531);if(backup.offset531!==undefined)setRaw('wt_531offset',String(backup.offset531));if(backup.goals)setRaw('wt_goals',backup.goals);if(backup.daylog)setRaw('wt_daylog',backup.daylog,mode==='merge');if(backup.custom_ex)setRaw(CUST_KEY,backup.custom_ex);if(backup.kg_step)setRaw('wt_kg_step',String(backup.kg_step));if(backup.reps_step)setRaw('wt_reps_step',String(backup.reps_step));if(backup.sugs)setRaw('wt_sugs6',backup.sugs);if(backup.colors)setRaw('wt_colors',backup.colors);if(backup.custom_rest)setRaw('wt_custom_rest',backup.custom_rest);if(backup.compact!==undefined)setRaw('wt_compact',backup.compact?'1':'0');if(backup.gym_mode!==undefined)setRaw('wt_gym_mode',backup.gym_mode?'1':'0');
  if(opts.photos&&Array.isArray(backup.photos)&&backup.photos.length>0&&await uiConfirm(`Backup vsebuje ${backup.photos.length} fotografij. ${mode==='replace'?'Zamenjam':'Dodam'} tudi fotografije?`)){
    const db=await openPhotoDB();if(mode==='replace')await new Promise(res=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).clear();tx.oncomplete=res;});for(const p of backup.photos){if(p&&p.blob)await new Promise(res=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).add({date:p.date||new Date().toISOString(),blob:p.blob});tx.oncomplete=res;});}
  }
  PROG=buildPhaseProgramV16(getActiveProfile());try{ensureDayLists();}catch(e){}initTheme();applyAllColors();initBWGoal();cw=0;cd=0;localStorage.setItem('wt_last_week','0');localStorage.setItem('wt_last_day','0');localStorage.removeItem('wt_active_ex');localStorage.removeItem('wt_active_timer');document.querySelectorAll('.wt').forEach((t,i)=>t.classList.toggle('active',i===0));showPage('workout');showDay(0);initP1();
}

