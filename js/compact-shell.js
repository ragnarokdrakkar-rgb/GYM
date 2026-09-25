/* Approved Compact Gym v3 screen structure connected to the original stores.
   The preview's demo script is NOT imported. No sample sessions or migrations. */
function compactStatusV27(progress){return progress.total>0&&progress.done>=progress.total?'done':progress.done>0?'partial':'pending';}
// Workout completion and set completion are distinct: a saved, explicitly
// finished workout remains done even if its plan is later edited or repeated.
function compactDayProgressV28({cycle,week,dayIndex,entries,sets,records,activeContext}){
  let done=0,total=0;
  for(const entry of entries){
    const target=Math.max(1,Number(entry.target)||1);
    total+=target;done+=(sets[entry.key]||[]).filter(s=>s?.type!=='warmup'&&s?.warm!==true).slice(0,target).filter(s=>s?.done===true).length;
  }
  const matches=s=>s&&Number(s.cycle)===cycle&&Number(s.weekIdx??(Number(s.weekNum)-1))===week&&Number(s.dayIdx)===dayIndex;
  const hasWork=s=>Array.isArray(s.exercises)&&s.exercises.length
    ?s.exercises.some(e=>(e.sets||[]).some(r=>r?.done===true&&!r.warm&&r.type!=='warmup'))
    :Number(s.totals?.doneSets??s.setCount??0)>0;
  const finished=records.filter(s=>matches(s)&&hasWork(s)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.startTime||'').localeCompare(String(a.startTime||'')));
  const active=!!matches(activeContext),completed=total>0&&(finished.length>0||done>=total);
  const status=active?'active':completed?'done':done>0?'partial':'pending';
  return {dayIndex,done,total,completed,status,active,recordCount:finished.length,date:finished[0]?.date||''};
}
function compactWeekProgressV28(days){
  const done=days.filter(d=>d.completed).length,partial=days.filter(d=>!d.completed&&(d.status==='partial'||d.status==='active')).length;
  return {done,total:days.length,partial,status:days.length&&done===days.length?'done':done||partial?'partial':'pending'};
}
function compactNextDayV28(days){
  return days.find(d=>d.total>0&&!d.completed&&(d.status==='partial'||d.status==='active'))||days.find(d=>d.total>0&&!d.completed)||null;
}
function compactCommitPlanV27(key,target,expected,action,name){
  const all=getSets(),counts=getSetCounts();
  if(JSON.stringify(all[key]||[])!==expected)throw Error('Serije so se spremenile. Ponovno odpri vajo.');
  const result=compactPlanChangeV26(all[key],target,action),before={rows:all[key],count:counts[key]};
  all[key]=result.rows.map(s=>({...s,exName:s.exName||name,exerciseId:s.exerciseId||exStableId(name)}));
  counts[key]=(Number(counts[key])||0)+result.target-target;
  commitStorageBatch([[LS.sets,JSON.stringify(all)],[LS.setcounts,JSON.stringify(counts)],['wt_plan_undo_v26',JSON.stringify({key,before,after:{rows:all[key],count:counts[key]}})]]);
  return result;
}
function compactWeeklyWeightV27(entries){
  if(!entries.length)return null;
  const end=Date.parse(entries.at(-1)[0]+'T12:00:00Z');
  for(const days of [21,35]){
    const points=entries.filter(([d])=>end-Date.parse(d+'T12:00:00Z')<=days*86400000).map(([d,v])=>({x:(Date.parse(d+'T12:00:00Z')-end)/86400000,y:Number(v)}));
    if(points.length<3||-points[0].x<7)continue;
    const n=points.length,sx=points.reduce((v,p)=>v+p.x,0),sy=points.reduce((v,p)=>v+p.y,0),sxy=points.reduce((v,p)=>v+p.x*p.y,0),sxx=points.reduce((v,p)=>v+p.x*p.x,0),den=n*sxx-sx*sx;
    if(den>0)return (n*sxy-sx*sy)/den*7;
  }return null;
}
// Step 5: guideline ranges (kg/week) used only to describe the current trend
// in words — never to change anything automatically. Values are informational.
const WEIGHT_GUIDELINES_V30={bulk:{min:0.25,max:0.5},cut:{min:-0.75,max:-0.25}};
function weightVerdictV30(phaseType,weeklyKgOrNull){
  const type=phaseType==='cut'?'cut':'bulk',label=type==='bulk'?'Bulk':'Cut';
  if(weeklyKgOrNull===null||weeklyKgOrNull===undefined||!Number.isFinite(weeklyKgOrNull))
    return {tone:'neutral',text:`Za trend faze ${label} potrebujemo vsaj 3 meritve v tej fazi, ki pokrivajo 7 dni, ali nastavljen datum začetka faze v Nastavitvah.`};
  const g=WEIGHT_GUIDELINES_V30[type],verb=type==='bulk'?'raste':'pada',
    fmtSl=n=>Math.abs(n).toLocaleString('sl-SI',{maximumFractionDigits:2}),
    rate=fmtSl(weeklyKgOrNull),lo=fmtSl(Math.min(g.min,g.max)),hi=fmtSl(Math.max(g.min,g.max)),
    goal=`Cilj za ${label} je ${lo}–${hi} kg na teden`;
  const belowMin=weeklyKgOrNull<g.min,aboveMax=weeklyKgOrNull>g.max;
  if(!belowMin&&!aboveMax)return {tone:'ok',text:`Teža ${verb} za približno ${rate} kg na teden. ${goal}: v cilju.`};
  const slower=type==='bulk'?belowMin:aboveMax;
  return {tone:'warn',text:`Teža ${verb} za približno ${rate} kg na teden. ${goal}: ${verb} ${slower?'počasneje':'hitreje'} od cilja.`};
}
// === PR audit (Settings → Napredno → Preveri rekorde) ===
// Resolves a wt_p6 key ("pr"+dayIdx+exIdx) to the exercise name currently at
// that program slot, by generating candidate keys instead of parsing the
// (ambiguous, multi-digit) suffix — mirrors how checkPR() builds the same key.
function prSlotNameResolver(prog){
  const days=(prog&&prog.days)||[];
  return key=>{
    for(let di=0;di<days.length;di++){
      const ex=(days[di]&&days[di].ex)||[];
      for(let ei=0;ei<ex.length;ei++)if(`pr${di}${ei}`===key)return ex[ei].n||null;
    }
    return null;
  };
}
// Pure aggregation: the best (highest e1RM) done working set per exercise name,
// and the best kg per rep count per name, across every history source passed
// in. Planned (done:false) and warm-up (type:'warmup'/warm:true) rows are
// never considered. Passing the same set twice (e.g. it exists both in a
// locked session snapshot and in live wt_s6) is harmless — this only keeps
// maxima, so a duplicate can never win over, or lose to, the true best.
function prAuditBestRowsV33(sessionExercises,setsByKey,resolveSlotName){
  const best=new Map(),repBest=new Map();
  const isDoneWork=s=>!!s&&s.done===true&&s.type!=='warmup'&&s.warm!==true;
  const consider=(name,kgRaw,repsRaw)=>{
    if(!name)return;
    const kg=parseFloat(kgRaw),reps=parseInt(repsRaw,10);
    if(!(kg>0)||!(reps>0))return;
    const e1=kg*(1+reps/30),cur=best.get(name);
    if(!cur||e1>cur.e1)best.set(name,{kg,reps,e1});
    const rb=repBest.get(name)||{};
    if(!(rb[reps]>=kg))rb[reps]=kg;
    repBest.set(name,rb);
  };
  (sessionExercises||[]).forEach(ex=>(ex.sets||[]).filter(isDoneWork).forEach(s=>consider(ex.name,s.kg,s.reps)));
  Object.entries(setsByKey||{}).forEach(([key,rows])=>(rows||[]).filter(isDoneWork).forEach(s=>consider(s.exName||resolveSlotName(key),s.kg,s.reps)));
  return {best,repBest};
}
// Pure diff: compares the stored wt_p6/wt_rep_prs records against the
// recomputed history-only best values. Only actual differences are returned;
// a record with no supporting history at all is flagged separately
// (noHistory:true) rather than silently "corrected" to zero.
function compactPrAuditV33(prMap,repPrMap,nameForPrSlot,best,repBest){
  const slotDiffs=[];
  Object.entries(prMap||{}).forEach(([key,value])=>{
    if(!/^pr\d+$/.test(key))return;
    const isObj=value&&typeof value==='object',storedKg=Number(isObj?value.kg:value)||0;
    if(!(storedKg>0))return;
    const storedReps=isObj&&value.reps!=null?Number(value.reps):null;
    const name=(isObj&&value.exName)||nameForPrSlot(key)||null;
    const hist=name?best.get(name):null;
    if(!hist){slotDiffs.push({key,name,storedKg,storedReps,historyKg:null,historyReps:null,noHistory:true});return;}
    if(hist.kg!==storedKg||(storedReps!=null&&hist.reps!==storedReps))
      slotDiffs.push({key,name,storedKg,storedReps,historyKg:hist.kg,historyReps:hist.reps,noHistory:false});
  });
  const repDiffs=[];
  Object.entries(repPrMap||{}).forEach(([name,byReps])=>{
    const hist=repBest.get(name)||{};
    Object.entries(byReps||{}).forEach(([reps,kg])=>{
      const storedKg=Number(kg),histKg=hist[reps]!==undefined?Number(hist[reps]):null;
      if(histKg===null){repDiffs.push({name,reps:Number(reps),storedKg,historyKg:null,noHistory:true});return;}
      if(histKg!==storedKg)repDiffs.push({name,reps:Number(reps),storedKg,historyKg:histKg,noHistory:false});
    });
  });
  return {slotDiffs,repDiffs};
}
// Moves the selected point in the strength chart to the previous/next session
// in the (date-sorted) series, clamped at the ends. Pure, unit-tested directly.
// Toast timing: success messages self-clear, errors stay until tapped or replaced.
function compactToastTimingV32(error){return error?null:3500;}
function compactStrengthNavV30(series,currentSi,dir){
  const idx=(series||[]).findIndex(p=>p.si===currentSi);
  if(idx<0)return currentSi;
  const next=idx+(dir==='next'?1:-1);
  if(next<0||next>=series.length)return currentSi;
  return series[next].si;
}
if(typeof document!=='undefined'&&document.documentElement.dataset.ui==='compact-shell')(function(){
  'use strict';
  const esc=safeHtml,fmt=n=>Number(n).toLocaleString('sl-SI',{maximumFractionDigits:2});
  const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const dateLabel=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)?new Date(d+'T12:00').toLocaleDateString('sl-SI',{day:'numeric',month:'long',year:'numeric'}):'Brez datuma';
  const clock=n=>{n=Math.max(0,Math.floor(n||0));return n>=3600?`${Math.floor(n/3600)}:${String(Math.floor(n%3600/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`:`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};
  const paths={dumbbell:'M3 9v6M6 6v12M18 6v12M21 9v6M6 12h12',check:'m5 12 4 4L19 6',play:'m8 5 11 7-11 7Z',pause:'M8 5v14M16 5v14',x:'m6 6 12 12M6 18 18 6',left:'m15 5-7 7 7 7',right:'m9 5 7 7-7 7',up:'m5 15 7-7 7 7',down:'m5 9 7 7 7-7',arrow:'M12 19V5m-6 6 6-6 6 6',timer:'M9 2h6M12 8v5l3 2M19 5l1 1',focus:'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5',exit:'M3 8h5V3M16 3v5h5M3 16h5v5M16 21v-5h5',program:'M8 6h12M8 12h12M8 18h12M3 6h1M3 12h1M3 18h1',chart:'M3 3v18h18M6 16l5-6 4 3 5-7',settings:'M4 7h8M16 7h4M4 17h4M12 17h8M14 4v6M10 14v6',calendar:'M8 2v4M16 2v4M3 10h18M4 4h16v17H4Z',trash:'M3 6h18M9 3h6M6 6l1 15h10l1-15M10 10v7M14 10v7'};
  const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${name==='timer'?'<circle cx="12" cy="14" r="8"/>':''}<path d="${paths[name]||paths.settings}"/></svg>`;
  const button=(act,label,cls='cg-link',attrs='')=>`<button type="button" class="${cls}" data-act="${act}" ${attrs}>${label}</button>`;
  let root,main,nav,header,message,dialog,chart=null,queued=false,renderedRoute='',modalSave=null,modalCancel=null,busy=false,workoutCache=[],restActiveId='',restNotifiedId='',programWriteBusy=false;
  const state={page:'Trening',focus:false,active:'',day:0,progress:'Teža',settings:'',date:dateKey(new Date()),month:new Date().getMonth(),year:new Date().getFullYear(),session:-1,exercise:'',flagged:false,strength:'',point:-1,limit:50,query:'',weightDays:30,cycleMenu:false,openRow:''};
  const draft=new Map(),prescriptionOpen=new Set();
  const $=s=>root.querySelector(s),$$=s=>[...root.querySelectorAll(s)];
  function notify(text,error=false){
    message.textContent=text;message.setAttribute('role',error?'alert':'status');
    message.classList.toggle('cg-message-error',!!error);
    clearTimeout(message._timer);
    const delay=compactToastTimingV32(error);
    if(text&&delay!=null)message._timer=setTimeout(()=>{message.textContent='';},delay);
  }
  function guardProgram(){if(stRun||window.v6RecoveryPending||localStorage.getItem(LS_SESS))throw Error('Najprej zaključi ali obnovi aktivni trening.');}
  function currentRows(){
    const all=getSets(),history=sessions();return activeWorkoutEntriesV19(getCyc().num,cw,cd).map(({item,exerciseIndex,key})=>{
      const progress=exerciseProgressV20(key),saved=all[key]||[],pending=window.WTFocusPatchV10.readPending(key),name=currentExerciseName(cd,exerciseIndex,key),last=compactStrengthSeriesV26(history,compactNameV26(name)).at(-1)||null;
      return {key,item,ei:exerciseIndex,name,target:progress.total,done:progress.done,status:compactStatusV27(progress),rows:saved,pending,last,rest:restForEx(item.id,name,item.r||90)};
    });
  }
  function activeExercise(){return workoutCache.find(e=>e.key===state.active)||workoutCache[0];}
  function valuesFor(e){const p=e.pending||{};const saved=draft.get(e.key);return saved&&saved.index===p.setIndex?saved:{index:p.setIndex,kg:p.kg??'',reps:p.reps??'',rpe:p.rpe??''};}
  function lastSetValues(e){
    for(let i=e.target-1;i>=0;i--){const row=e.rows[i];if(row&&row.kg!==undefined&&row.kg!==''&&row.reps!==undefined&&row.reps!=='')return {kg:row.kg,reps:row.reps};}
    const v=valuesFor(e);return v.kg!==''&&v.reps!==''?{kg:v.kg,reps:v.reps}:null;
  }
  function setRow(e,i,cur){
    const row=e.rows[i]||{};
    if(row.done)return `<div class="cg-setrow2 done"><span class="cg-setrow-num">${i+1}</span>${button('set-edit',fmt(row.kg),'cg-setrow-value cg-setrow-editable',`data-index="${i}" aria-label="Uredi serijo ${i+1}: ${fmt(row.kg)} kg"`)}${button('set-edit',esc(row.reps),'cg-setrow-value cg-setrow-editable',`data-index="${i}" aria-label="Uredi serijo ${i+1}: ${esc(row.reps)} ponovitev"`)}${button('set-undo',icon('check'),'cg-setrow-tick cg-tick-done',`data-index="${i}" aria-label="Razveljavi serijo ${i+1}"`)}</div>`;
    if(i===cur){
      const v=valuesFor(e);
      return `<form data-log-form class="cg-setrow2 current"><span class="cg-setrow-num">${i+1}</span><input aria-label="Kilogrami" data-field="kg" type="number" inputmode="decimal" min="0" max="2000" step="any" value="${esc(v.kg)}" required><input aria-label="Ponovitve" data-field="reps" type="number" inputmode="numeric" min="1" max="1000" step="1" value="${esc(v.reps)}" required><button type="submit" class="cg-setrow-tick cg-tick-current" aria-label="Zabeleži serijo ${i+1}" ${busy?'disabled':''}>${icon('check')}</button><label class="cg-setrow-extra cg-rpe-field">RPE (neobvezno)<input aria-label="RPE" data-field="rpe" type="number" inputmode="decimal" min="5" max="10" step="0.5" placeholder="—" value="${esc(v.rpe)}"></label></form>`;
    }
    const hint=valuesFor(e);return `<div class="cg-setrow2 planned"><span class="cg-setrow-num">${i+1}</span><input type="number" inputmode="decimal" min="0" max="2000" step="any" aria-label="Serija ${i+1} kg" data-plan-index="${i}" data-plan-field="kg" value="${esc(row.kg??'')}" placeholder="${esc(hint.kg??'')}"><input type="number" inputmode="numeric" min="1" max="1000" step="1" aria-label="Serija ${i+1} ponovitve" data-plan-index="${i}" data-plan-field="reps" value="${esc(row.reps??'')}" placeholder="${esc(hint.reps??'')}"><span class="cg-setrow-tick empty" aria-hidden="true"></span></div>`;
  }
  function setTable(e){
    const p=e.pending,cur=p&&!p.complete?p.setIndex:-1;
    const rows=Array.from({length:e.target},(_,i)=>setRow(e,i,cur)).join('');
    const lastRowDone=!!(e.rows[e.target-1]||{}).done,removeDisabled=e.target<=1||lastRowDone;
    return `<div class="cg-settable"><div class="cg-settable-head"><span>#</span><span>kg</span><span>Pon.</span><span></span></div>${rows}</div><div class="cg-log-footer">${button('set-add-one','+ Serija','cg-link',e.target>=30?'disabled':'')}${button('set-remove-last','− Zadnja serija','cg-link',removeDisabled?'disabled':'')}</div>`;
  }
  function logger(e){
    const pending=e.pending&&!e.pending.complete,allDone=e.target>0&&e.done>=e.target;
    let prescription='';if(e.item.progMode==='531'){const rows=get531Prescription(e.item.lift531||infer531LiftV16(e.name),cw);prescription=`<details class="cg-531" data-prescription ${prescriptionOpen.has(e.key)?'open':''}><summary>5/3/1 · načrt serij</summary>${rows?`<table>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.pct}%</td><td>${fmt(r.kg)} kg</td><td>× ${esc(r.reps)}</td></tr>`).join('')}</table>`:'Training max nastavi v Nastavitvah → 5/3/1.'}</details>`;}
    return `<div class="cg-logger"><div class="cg-last">${e.last?`Zadnjič ${fmt(e.last.kg)} kg × ${esc(e.last.reps)}${e.last.rpe?' · RPE '+esc(e.last.rpe):''}`:'Še brez prejšnjega vnosa.'}</div>${prescription}${allDone?`<p class="cg-small cg-success">✓ Vseh ${e.target} serij je zabeleženih.</p>`:''}${setTable(e)}${pending&&window.WTReleasePatchV13?.plateEnabled(e.key)?'<div class="cg-plates" aria-live="polite"></div>':''}<div class="cg-rest-tools">${button('rest-settings',icon('timer')+' Počitek '+clock(e.rest))}${button('rest-start',icon('play'),'cg-icon','aria-label="Začni počitek"')}</div>${button('exercise-info','Opis in nastavitve vaje')}</div>`;
  }
  function restBar(){
    const t=currentTimerV6();if(!t)return '';const left=t.paused?t.remainingSec:Math.max(0,Math.ceil((t.endTs-Date.now())/1000));if(!left)return '';
    const ex=workoutCache.find(e=>e.key===t.key),label=(ex?`Počitek · ${esc(ex.name)}`:'Počitek')+(t.paused?' · premor':'');
    return `<div class="cg-rest"><div class="cg-rest-label">${label}</div><strong data-rest-clock class="cg-rest-clock">${clock(left)}</strong><div class="cg-rest-actions">${button('rest-minus','−30','cg-icon','aria-label="Skrajšaj počitek za 30 sekund"')}${button('rest-toggle',icon(t.paused?'play':'pause'),'cg-icon','aria-label="Pavziraj ali nadaljuj počitek"')}${button('rest-plus','+30','cg-icon','aria-label="Podaljšaj počitek za 30 sekund"')}${button('rest-stop',icon('x'),'cg-icon','aria-label="Zapri počitek"')}</div></div>`;
  }
  // Fires "Počitek končan." exactly once per finished rest timer. Pure/testable:
  // activeId tracks the timer we last saw running, notifiedId the one we already
  // announced. t is null once the timer is removed (by tick's own expiry or a
  // manual rest-stop, which pre-sets notifiedId to suppress the announcement).
  function restNotifyStep(t,left,activeId,notifiedId){
    const id=t?t.id:(left<=0?activeId:'');
    const nextActive=t?t.id:'';
    if(id&&left<=0&&id!==notifiedId)return {activeId:nextActive,notifiedId:id,fire:true};
    return {activeId:nextActive,notifiedId,fire:false};
  }
  function focusHeader(day,index){
    return `<div class="cg-fhead">${button('focus',icon('x'),'cg-ficon','aria-label="Izhod iz fokusa"')}<div class="cg-fhead-mid"><strong>${esc(day?.name||'Trening')}</strong><small>Cikel ${getCyc().num} · Teden ${cw+1} · vaja ${index+1}/${workoutCache.length}</small></div><div class="cg-fhead-clock"><strong data-session-clock>${clock(stRun?(Date.now()-stStart)/1000:0)}</strong></div></div>`;
  }
  function focusDot(e,i){
    const current=e.key===state.active,label=`${e.name}: ${e.done}/${e.target}`;
    return `<button type="button" class="${e.status} ${current?'current':''}" data-ex="${e.key}" aria-label="${esc(label)}">${e.status==='done'?'✓':i+1}</button>`;
  }
  function focusSteps(index){
    return `<div class="cg-focus-steps">${button('prev',icon('left'),'cg-quiet',`aria-label="Prejšnja vaja" ${index<=0?'disabled':''}`)}<div class="cg-dots">${workoutCache.map((e,i)=>focusDot(e,i)).join('')}</div>${button('next',icon('right'),'cg-quiet',`aria-label="Naslednja vaja" ${index>=workoutCache.length-1?'disabled':''}`)}</div>`;
  }
  function navigationLocked(){return !!(stRun||window.v6RecoveryPending||localStorage.getItem(LS_SESS));}
  function weekOverview(week=cw){
    const cycle=Number(getCyc().num),sets=getSets(),records=getSessions(),activeContext=stRun?activeSessionContext:window.v6RecoveryPending?v6RecoveryContext:null;
    const days=getProgramMetaV6().days.flatMap((day,dayIndex)=>{
      if(day.active===false||day.deleted)return [];
      const entries=activeWorkoutEntriesV19(cycle,week,dayIndex).map(entry=>({...entry,target:exerciseTargetSetsV19(entry.item,PROG.weeks[week],entry.key)}));
      return [{...compactDayProgressV28({cycle,week,dayIndex,entries,sets,records,activeContext}),name:day.name||'Dan '+(dayIndex+1)}];
    });
    return {cycle,week,days,...compactWeekProgressV28(days)};
  }
  function weekLabel(week){const plan=PROG.weeks[week];return plan?.name||plan?.label||(getActiveProfile()==='bulk'?['Osnova','Volumen','Napredek','Deload']:['Moč','Kontrola','Volumen','Deload'])[week]||'';}
  function chipWord(status,done,total,short){
    if(!total)return short?'–':'Brez vaj';
    if(short)return {done:'✓',partial:`${done}/${total}`,active:'●',pending:'○'}[status];
    return {done:'Opravljeno',partial:`Delno ${done}/${total}`,active:'V teku',pending:'Ni opravljeno'}[status];
  }
  function chip(status,done,total,short){return `<span class="cg-chip ${status}"><i class="cg-dot ${status}"></i><span>${chipWord(status,done,total,short)}</span></span>`;}
  function quickNavigation(programPage=false){
    const weeks=PROG.weeks.map((plan,week)=>({...weekOverview(week),name:weekLabel(week)}));
    const current=weeks[cw],selected=programPage?state.day:cd,locked=navigationLocked(),next=compactNextDayV28(current.days);
    const statusText=d=>d.active?'V teku':d.completed?(d.recordCount?'Trening opravljen':'Serije opravljene'):d.status==='partial'?'Delno opravljeno':d.total?'Še ni opravljeno':'Brez aktivnih vaj';
    const n=current.days.length,columns=n<=3?Math.max(1,n):n===4?2:n<=6?3:4;
    const meta=getProgramMetaV6(),inactiveCount=meta.days.filter(d=>d.active===false&&!d.deleted).length;
    const selectedDay=current.days.find(d=>d.dayIndex===selected),selectedCompleted=!!selectedDay?.completed;
    const inactiveNote=inactiveCount?`<p class="cg-quick-note">${inactiveCount} ${inactiveCount===1?'neaktiven dan ni prikazan':'neaktivnih dni ni prikazanih'} in ne šteje v ${current.done}/${current.total}.</p>`:'';
    const statusNote=locked?'<p class="cg-quick-note">Izbira tedna in treninga je med aktivnim treningom zaklenjena.</p>':(selectedCompleted&&next)?button('quick-next','Naslednji: '+esc(next.name)+' '+icon('right'),'cg-next-workout',`data-index="${next.dayIndex}"`):current.status==='done'?'<p class="cg-quick-note">Vsi aktivni treningi tega tedna so opravljeni.</p>':current.days.some(d=>d.total>0)?'':'<p class="cg-quick-note">Dodaj aktivne vaje v Programu.</p>';
    return `<section class="cg-quick-nav" aria-label="Hitra izbira treninga"><div class="cg-weekbar" aria-hidden="true">${current.days.map(d=>`<i class="${d.status}"></i>`).join('')}</div><div class="cg-quick-weeks" aria-label="Tedni cikla">${weeks.map(w=>`<button type="button" data-quick-week="${w.week}" class="cg-week ${w.status}${w.week===cw?' selected':''}" aria-pressed="${w.week===cw}" aria-label="Teden ${w.week+1} · ${esc(w.name)} · ${w.done}/${w.total} opravljenih treningov" ${locked?'disabled':''}><strong>T${w.week+1}${w.status==='done'?' ✓':''}</strong><small>${esc(w.name)}</small><span class="cg-pips">${w.days.map(d=>`<i class="${d.status}"></i>`).join('')}</span></button>`).join('')}</div><div class="cg-quick-days" style="--day-columns:${columns}" aria-label="Treningi tega tedna">${current.days.map(d=>`<button type="button" data-quick-day="${d.dayIndex}" data-quick-program="${programPage?'1':'0'}" class="cg-day ${d.status}${d.dayIndex===selected?' selected':''}" aria-pressed="${d.dayIndex===selected}" aria-label="${esc(d.name+': '+statusText(d))}${d.date?' · '+esc(dateLabel(d.date)):''}" ${locked&&!programPage?'disabled':''}><strong>${esc(d.name)}</strong>${chip(d.status,d.done,d.total,columns===4)}</button>`).join('')}</div>${inactiveNote}${statusNote}</section>`;
  }
  function selectQuickWorkout(week,day,programPage=false){
    if(navigationLocked())throw Error('Najprej zaključi ali obnovi aktivni trening.');
    const meta=getProgramMetaV6();
    if(!Number.isInteger(week)||!PROG.weeks[week]||!Number.isInteger(day)||!meta.days[day]||meta.days[day].active===false||meta.days[day].deleted)throw Error('Ta trening ni aktiven.');
    if(week!==cw)setWeek(week);
    state.active='';state.day=day;
    if(!programPage){state.page='Trening';state.focus=false;setGymMode(false);showDay(day);}
  }
  const slDate=d=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(d||'');return m?`${Number(m[3])}. ${Number(m[2])}. ${m[1]}`:String(d||'');};
  const shortDate=d=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(d||'');return m?`${Number(m[3])}. ${Number(m[2])}.`:'—';};
  function progressRing(e){
    const t=Math.max(1,e.target),frac=Math.max(0,Math.min(1,e.done/t)),r=15,c=2*Math.PI*r,dash=(frac*c).toFixed(2),label=e.status==='done'?'✓':`${e.done}/${e.target}`;
    return `<span class="cg-ring ${e.status}" aria-hidden="true"><svg viewBox="0 0 36 36" width="38" height="38"><circle class="cg-ring-track" cx="18" cy="18" r="${r}"/>${frac>0?`<circle class="cg-ring-arc" cx="18" cy="18" r="${r}" stroke-dasharray="${dash} ${c.toFixed(2)}"/>`:''}<text x="18" y="18.5" class="cg-ring-text">${esc(label)}</text></svg></span>`;
  }
  function cycleHeader(overview){
    const locked=navigationLocked();
    return `<div class="cg-cycle"><div class="cg-cycle-top"><div class="cg-cycle-info"><span class="cg-cycle-label">${getActiveProfile()==='bulk'?'Bulk':'Cut'} · cikel ${getCyc().num} · ${esc(weekLabel(cw))}</span><h1 class="cg-cycle-title">Teden ${cw+1}<span class="cg-cycle-total"> / ${PROG.weeks.length}</span></h1></div><div class="cg-cycle-count"><strong>${overview.done}/${overview.total}</strong><span>treningov</span></div>${button('cycle-menu','⋯','cg-icon cg-cycle-menu-btn',`aria-expanded="${state.cycleMenu}" aria-label="Cikel · možnosti"`)}</div>${state.cycleMenu?`<div class="cg-cycle-menu">${button('cycle-new','Nov cikel','cg-settingsrow',locked?'disabled':'')}<p class="cg-quick-note">Zgodovina ostane.</p>${programUses531V16()?button('tm','5/3/1 · Training max','cg-settingsrow'):''}</div>`:''}</div>`;
  }
  function heroCard(cdOverview,day,total,target,exCount){
    const status=cdOverview.status,zRecord=getSessions().filter(s=>Number(s.dayIdx)===cd).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0],zLabel=zRecord?shortDate(zRecord.date):'—';
    const primaryLabel=stRun?'Zaključi trening':status==='done'?'Ponovi trening':(status==='partial'||status==='active')?'Nadaljuj':'Začni trening';
    const primaryBtn=stRun?button('session-finish',primaryLabel,'cg-hero-finish'):button('session-start',icon('play')+' '+primaryLabel,'cg-hero-start');
    const focusBtn=button('focus',icon('focus')+' Fokus','cg-hero-focus');
    const live=stRun?`<div class="cg-hero-live"><strong data-session-clock>${clock((Date.now()-stStart)/1000)}</strong><span>Trening v teku</span></div>`:'';
    return `<section class="cg-hero"><h2 class="cg-hero-name">${esc(day?.name||'Trening')}</h2>${day?.sub?`<p class="cg-hero-sub">${esc(day.sub)}</p>`:''}${chip(status,cdOverview.done,cdOverview.total,false)}<div class="cg-hero-stats"><div><strong>${exCount}</strong><span>vaj</span></div><div><strong>${total}/${target}</strong><span>serij</span></div><div><strong>${zLabel}</strong><span>zadnjič</span></div></div>${live}<div class="cg-hero-actions">${primaryBtn}${focusBtn}</div></section>`;
  }
  function workout(){
    workoutCache=currentRows();if(!workoutCache.some(e=>e.key===state.active))state.active=workoutCache.find(e=>e.key===localStorage.getItem('wt_active_ex'))?.key||workoutCache[0]?.key||'';
    const active=activeExercise(),index=workoutCache.indexOf(active),total=workoutCache.reduce((n,e)=>n+e.done,0),target=workoutCache.reduce((n,e)=>n+e.target,0),meta=getProgramMetaV6(),day=meta.days[cd];
    if(state.focus){
      // The rest card must stay visible while the set table scrolls. Rather than
      // position:sticky (broken for any descendant here because css/app.css sets
      // `html,body{overflow-x:hidden}` on BOTH elements, which turns body into an
      // inert secondary scroll container and stops sticky from ever engaging —
      // verified with isolated repros, not fixable from this file), the header,
      // progress strip and rest card sit in a non-scrolling top zone and only the
      // exercise content below (title/meta/logger, i.e. the set table) scrolls in
      // its own bounded box. See #cg-app[data-focus] rules in compact-v4.css.
      const header=focusHeader(day,index);
      const strip=`<div class="cg-fprog" aria-hidden="true">${workoutCache.map(e=>`<i class="${e.status}${e.key===state.active?' current':''}"></i>`).join('')}</div>`;
      const restHost=`<div class="cg-rest-host">${restBar()}</div>`;
      if(!active)return header+strip+restHost+'<div class="cg-fscroll"><p class="cg-small cg-empty">Ta dan nima aktivnih vaj.</p></div>';
      const title=`<h1 class="cg-fname">${esc(active.name)}</h1>`;
      const focusMeta=`<div class="cg-focus-meta"><span>Cilj <b>${active.item.targetReps?`${active.target} × ${esc(active.item.targetReps)}`:`${active.target} ${active.target===1?'serija':active.target===2?'seriji':active.target<5?'serije':'serij'}`}</b></span></div>`;
      const scroll=`<div class="cg-fscroll">${title}${focusMeta}${logger(active)}</div>`;
      const steps=focusSteps(index);
      const start=!stRun?button('session-start',icon('play')+' Začni trening','cg-action cg-focus-start'):'';
      return header+strip+restHost+scroll+steps+start;
    }
    const picker=state.focus?'':quickNavigation();
    const overview=weekOverview(cw),cdOverview=overview.days.find(d=>d.dayIndex===cd)||{status:'pending',done:0,total:0,completed:false,date:''};
    const rows=workoutCache.map(e=>{const open=e.key===state.openRow;return `<section class="cg-workrow ${open?'open':''}"><button type="button" class="cg-exrow" data-ex="${e.key}" aria-expanded="${open}">${progressRing(e)}<span class="cg-exrow-main"><span class="cg-exrow-name">${esc(e.name)}${e.item.progMode==='531'?'<span class="cg-tag531">5/3/1</span>':''}</span><span class="cg-exrow-sub">${e.target} serij${e.last?` · zadnjič ${fmt(e.last.kg)}×${esc(e.last.reps)}`:''}</span></span>${icon(open?'up':'down')}</button>${open?logger(e):''}</section>`;}).join('');
    return cycleHeader(overview)+picker+heroCard(cdOverview,day,total,target,workoutCache.length)+'<div class="cg-rest-host">'+restBar()+'</div>'+`<div class="cg-section-label"><span>Vaje</span><span>${workoutCache.filter(e=>e.status==='done').length}/${workoutCache.length} opravljenih</span></div>${rows}${button('program-current','Uredi vaje tega dne','cg-add')}`;
  }
  function activeDayWordV29(n){return n===1?'aktiven dan':n===2?'aktivna dneva':n>=3&&n<=4?'aktivni dnevi':'aktivnih dni';}
  function program(){
    const meta=getProgramMetaV6();if(!meta.days[state.day]||meta.days[state.day].deleted)state.day=meta.days.findIndex(d=>!d.deleted&&d.active!==false);
    const days=meta.days,locked=navigationLocked(),activeCount=days.filter(d=>!d.deleted&&d.active!==false).length;
    const selectedDay=days[state.day]||{},list=dayListFor(state.day,getCyc().num,cw),cyc=getCyc().num,hiddenThisWeek=getHiddenEx(),
      countsThisWeek=(e,i)=>!e.programDisabled&&!hiddenThisWeek[sdk(cyc,cw,state.day,i)],
      activeEx=list.filter(countsThisWeek),setsOf=(e,i)=>exerciseTargetSetsV19(e,PROG.weeks[cw],sdk(cyc,cw,state.day,i)),
      totalSets=list.reduce((n,e,i)=>n+(countsThisWeek(e,i)?setsOf(e,i):0),0);
    const title=`<div class="cg-title-row"><div><h1 class="cg-program-title">Program</h1><p class="cg-sub">${activeCount} ${activeDayWordV29(activeCount)} · Cut/Bulk ne spremeni vaj</p></div></div>`;
    const weeks=`<div class="cg-weeksel" role="group" aria-label="Teden za prikaz vaj">${PROG.weeks.map((_,w)=>`<button type="button" data-quick-week="${w}" class="${w===cw?'selected':''}" aria-pressed="${w===cw}" ${locked?'disabled':''}>T${w+1}</button>`).join('')}</div>`;
    const chips=`<div class="cg-pdays" aria-label="Dnevi programa">${days.map((d,i)=>{
      if(d.deleted)return '';
      const active=d.active!==false,cnt=active?dayListFor(i,getCyc().num,cw).filter(e=>!e.programDisabled).length:0;
      return `<button type="button" class="cg-pchip${active?'':' inactive'}${i===state.day?' selected':''}" data-act="program-day" data-index="${i}" aria-pressed="${i===state.day}"><strong>${esc(d.name||'Dan '+(i+1))}</strong><span>${active?cnt+' vaj':'neaktiven'}</span></button>`;
    }).join('')}${button('day-add','+ Dan','cg-pchip cg-pchip-add',days.length>=7?'disabled':'')}</div>`;
    const dayCard=`<section class="cg-hero cg-pcard"><h2 class="cg-hero-name">${esc(selectedDay.name||'Dan')}</h2>${selectedDay.sub?`<p class="cg-hero-sub">${esc(selectedDay.sub)}</p>`:''}<div class="cg-hero-stats"><div><strong>${activeEx.length}/${list.length}</strong><span>aktivnih vaj</span></div><div><strong>${totalSets}</strong><span>serij</span></div><div><strong>${selectedDay.active!==false?'Da':'Ne'}</strong><span>aktiven dan</span></div></div><div class="cg-hero-actions">${button('day-edit','Uredi dan','cg-quiet cg-nowrap')}</div></section>`;
    const label=`<div class="cg-section-label"><span>Vaje · vrstni red</span><span>stikalo = aktivna</span></div>`;
    const rows=list.map((e,i)=>{
      const off=!!e.programDisabled,n=setsOf(e,i),sub=`${n} ${n===1?'serija':n===2?'seriji':n<5?'serije':'serij'}${e.targetReps?' × '+esc(e.targetReps):''} · počitek ${clock(restForEx(e.id,e.n,e.r||90))}${off?' · neaktivna':''}`;
      return `<div class="cg-prow${off?' off':''}"><span class="cg-order">${i+1}</span>${button('program-edit',`<strong>${esc(e.n)}${e.progMode==='531'?'<span class="cg-tag531">5/3/1</span>':''}</strong><small>${sub}</small>`,'cg-prow-main',`data-index="${i}" aria-label="Uredi ${esc(e.n)}"`)}${button('program-up',icon('up'),'cg-icon',`data-index="${i}" aria-label="Premakni ${esc(e.n)} navzgor" ${i===0?'disabled':''}`)}${button('program-down',icon('down'),'cg-icon',`data-index="${i}" aria-label="Premakni ${esc(e.n)} navzdol" ${i===list.length-1?'disabled':''}`)}<button type="button" class="cg-switch" role="switch" aria-checked="${!off}" data-act="program-toggle" data-index="${i}" aria-label="${off?'Vključi':'Izključi'} vajo ${esc(e.n)}"><span class="cg-switch-knob"></span></button></div>`;
    }).join('');
    const inactiveCount=days.filter(d=>!d.deleted&&d.active===false).length;
    const inactive=days.map((d,i)=>!d.deleted&&d.active===false?`<div class="cg-setrow"><span class="cg-setvalue">${button('inactive-day',esc(d.name),'cg-link',`data-index="${i}"`)}<small class="cg-small">dan ${i+1}</small></span></div>`:'').join('');
    return title+weeks+chips+dayCard+label+rows+button('program-add','+ Dodaj vajo','cg-add cg-add-accent')+`<details><summary>Neaktivni dnevi (${inactiveCount})</summary>${inactive||'<p class="cg-small">Ni neaktivnih dni.</p>'}</details><p class="cg-footnote">Fazo Cut / Bulk urejaš v Nastavitvah. Tvoj seznam vaj ostane isti.</p>`;
  }
  function selectDate(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;const d=new Date(date+'T12:00');if(!Number.isFinite(d.getTime()))return;state.date=date;state.month=d.getMonth();state.year=d.getFullYear();state.session=-1;state.exercise='';}
  function sessions(){const all=getSets();return getSessions().map((s,si)=>({...s,si,exercises:sessionExercisesForStatsV19(s,all)}));}
  function calendar(){
    const first=new Date(state.year,state.month,1),cells=[],byDate=new Map(),seen=new Map(),todayKey=dateKey(new Date());
    sessions().forEach(s=>{if(!byDate.has(s.date))byDate.set(s.date,[]);byDate.get(s.date).push(s);seen.set(s.dayName||'Trening',compactDayColorV26(s.dayName));});
    for(let i=0;i<(first.getDay()+6)%7;i++)cells.push('<span></span>');
    for(let day=1;day<=new Date(state.year,state.month+1,0).getDate();day++){const date=dateKey(new Date(state.year,state.month,day)),records=byDate.get(date)||[];
      cells.push(`<button data-date="${date}" class="${date===state.date?'selected':''} ${date===todayKey?'today':''} ${records.length?'has-session':''}" aria-pressed="${date===state.date}" aria-label="${esc(dateLabel(date)+' · '+(records.map(s=>s.dayName).join(', ')||'brez treninga'))}"><span class="cg-cal-day">${day}</span>${records.slice(0,2).map(s=>`<span class="cg-cal-name" style="--day-color:${compactDayColorV26(s.dayName)}">${esc(s.dayName)}</span>`).join('')}${records.length>2?`<span class="cg-cal-more">+${records.length-2}</span>`:''}</button>`);
    }return `<div class="cg-calendar"><div class="cg-calendar-heading">${button('month-prev',icon('left'),'cg-icon','aria-label="Prejšnji mesec"')}<strong>${first.toLocaleDateString('sl-SI',{month:'long',year:'numeric'})}</strong>${button('month-next',icon('right'),'cg-icon','aria-label="Naslednji mesec"')}</div><div class="cg-calendar-grid">${['P','T','S','Č','P','S','N'].map(d=>`<span class="cg-weekday">${d}</span>`).join('')}${cells.join('')}</div><div class="cg-calendar-legend">${[...seen].map(([n,c])=>`<span><i style="background:${c}"></i>${esc(n)}</span>`).join('')}</div></div>`;
  }
  const refAttr=ref=>esc(JSON.stringify(ref));
  function historyView(){
    const all=sessions(),records=all.filter(s=>s.date===state.date);if(!records.some(s=>s.si===state.session))state.session=records[0]?.si??-1;
    const session=all.find(s=>s.si===state.session),raw=getSessions()[state.session];
    const chips=records.length>1?`<div class="cg-history-chips">${records.map(s=>`<button type="button" class="cg-history-chip${s.si===state.session?' selected':''}" data-history-pick="${s.si}" style="--day-color:${compactDayColorV26(s.dayName)}">${esc((s.startTime||'')+' · '+s.dayName)}</button>`).join('')}</div>`:'';
    let detail='<p class="cg-small cg-empty">Ta dan ni zabeleženega treninga.</p>';
    if(session){
      const stats=sessionStatsV19(session),weekNum=session.weekIdx!=null?Number(session.weekIdx)+1:session.weekNum,cycleNote=session.cycle!=null&&weekNum!=null?` · cikel ${esc(session.cycle)}, teden ${esc(weekNum)}`:'',
        weekday=new Date(session.date+'T12:00').toLocaleDateString('sl-SI',{weekday:'long',day:'numeric',month:'long'});
      detail=`<div class="cg-history-summary"><h2 style="color:${compactDayColorV26(session.dayName)}">${esc(session.dayName)}</h2><p class="cg-sub">${esc(weekday)} · ${esc(session.startTime||'')} · ${fmt(session.durationMin||0)} min · ${stats.setCount} serij${cycleNote}</p>${button('history-meta','Uredi datum in trening','cg-quiet')}</div><label class="cg-field-label">Vaja<select data-history-exercise><option value="">Vse vaje</option>${session.exercises.map((e,i)=>`<option value="${i}" ${state.exercise===String(i)?'selected':''}>${esc(e.name)}</option>`).join('')}</select></label>`;
      detail+=session.exercises.map((ex,ei)=>{
        if(state.exercise!==''&&Number(state.exercise)!==ei)return '';
        const rows=(ex.sets||[]).map((s,ri)=>({s,ri})).filter(({s})=>s.done&&(!state.flagged||Number(s.kg)>250||Number(s.reps)>12));if(!rows.length&&state.flagged)return '';
        return `<details class="cg-history-exercise" open><summary><strong>${esc(ex.name)}</strong><span>${rows.length} serij</span></summary><div class="cg-setrows">${rows.map(({s,ri})=>`<div class="cg-setrow"><span class="cg-setnum">${ri+1}</span><span class="cg-setvalue">${fmt(s.kg)} kg × ${esc(s.reps)}<small>RPE ${esc(s.rpe??'—')}${Number(s.kg)>250?' · preveri vrednost':''}</small></span>${raw?.exercises?.[ei]?.sets?.[ri]?`<button class="cg-link" data-edit-ref="${refAttr({kind:'session',si:state.session,ei,ri})}">Uredi</button>`:'<small>Star vir</small>'}</div>`).join('')}</div>${raw?.exercises?.[ei]?button('history-add','+ Dodaj zabeleženo serijo','cg-link',`data-index="${ei}"`):''}</details>`;
      }).join('');
    }
    return calendar()+`<div class="cg-section-label"><span>${dateLabel(state.date)}</span><span>${records.length} treningov</span></div><label class="cg-field-label cg-date-label">Skoči na datum<input type="date" data-history-date value="${state.date}"></label>${chips}${detail}<details class="cg-filter-details"><summary>Filter</summary><label class="cg-checkline"><input type="checkbox" data-flagged ${state.flagged?'checked':''}> Samo vrednosti za pregled</label></details>${button('history-undo','Razveljavi zadnjo spremembo','cg-link',localStorage.getItem('wt_history_undo_v24')?'':'disabled')}${button('history-sources','Vsi viri in sumljivi PR-ji')}<p class="cg-footnote">Popravek velja samo za izbrani zgodovinski trening, ne za današnji program.</p>`;
  }
  function activeRoster(){const meta=getProgramMetaV6(),rosters={};meta.days.forEach((_,di)=>{rosters[di]=dayListFor(di,getCyc().num,cw);});return compactActiveExercisesV26(meta,rosters);}
  function strengthView(){
    const active=activeRoster(),selected=active.find(e=>e.key===state.strength),all=sessions();
    if(!selected){state.strength='';return `<div class="cg-section-label"><span>Aktivne vaje programa</span><span>${active.length}</span></div><div class="cg-strength-list">${active.map(e=>{const last=compactStrengthSeriesV26(all,e.key).at(-1);return `<button class="cg-strength-row" data-strength="${esc(e.key)}"><span><strong>${esc(e.name)}</strong><small>${esc(e.days.join(' · '))}</small></span><span class="cg-strength-last">${last?`<strong>${fmt(last.kg)} kg</strong><small>${dateLabel(last.date)}</small>`:'<small>—</small>'}</span>${icon('right')}</button>`;}).join('')}</div><p class="cg-footnote">${active.length} aktivnih vaj programa. Neaktivne vaje in dnevi niso vključeni.</p>`;}
    const series=compactStrengthSeriesV26(all,state.strength);if(!series.some(p=>p.si===state.point))state.point=series.at(-1)?.si??-1;
    const p=series.find(p=>p.si===state.point),idx=series.findIndex(x=>x.si===state.point);
    return button('strength-back',icon('left')+' Vse aktivne vaje')+`<h2 class="cg-strength-title">${esc(selected.name)}</h2><p class="cg-sub">${esc(selected.days.join(' · '))}</p>`+(p?`<div class="cg-section-label"><span>Največja teža na trening · kg</span></div><div class="cg-strength-chart"><canvas id="cg-shell-strength" aria-label="Napredek ${esc(selected.name)}" role="img"></canvas></div><div class="cg-strength-readout">${button('strength-prev',icon('left'),'cg-icon',`aria-label="Prejšnji trening" ${idx<=0?'disabled':''}`)}<div class="cg-strength-readout-mid"><strong>${dateLabel(p.date)} · ${fmt(p.kg)} kg × ${p.reps}</strong><small>${p.count} serij · volumen ${fmt(p.volume)} kg</small></div>${button('strength-next',icon('right'),'cg-icon',`aria-label="Naslednji trening" ${idx>=series.length-1?'disabled':''}`)}</div>${p.flagged?'<p class="cg-small cg-danger">Ta trening vsebuje vrednost za pregled.</p>':''}${button('strength-history','Odpri ta trening v zgodovini','cg-add')}<p class="cg-footnote">Zabeležena teža, ne ocenjeni 1RM.</p>`:'<p class="cg-small cg-empty">Za to vajo še ni zabeleženih treningov. Graf se prikaže po prvem vnosu.</p>');
  }
  function weightView(){
    const entries=Object.entries(getBW()).filter(([,v])=>Number.isFinite(Number(v))&&Number(v)>0).sort((a,b)=>a[0].localeCompare(b[0])),phase=getBWPhaseContext(entries),average=avg7d(phase.entries),weekly=compactWeeklyWeightV27(phase.entries),last=entries.at(-1),verdict=weightVerdictV30(phase.type,weekly);
    const tiles=`<div class="cg-tiles"><div class="cg-tile"><span>7-dnevno povprečje</span><strong>${average===null?'—':fmt(average)} <small>kg</small></strong></div><div class="cg-tile"><span>Trend faze</span><strong>${weekly===null?'—':(weekly>0?'+':'')+fmt(weekly)+' kg/ted.'}</strong></div></div>`;
    const verdictBox=`<div class="cg-verdict cg-verdict-${verdict.tone}"><span class="cg-verdict-phase">${esc(phase.label)}${phase.start?' · od '+shortDate(phase.start):''}</span><p>${esc(verdict.text)}</p></div>`;
    const rangeButtons=`<div class="cg-range-seg">${[[30,'30 d'],[90,'90 d'],[0,'Vse']].map(([v,t])=>`<button type="button" data-weight-range="${v}" class="${state.weightDays===v?'selected':''}">${t}</button>`).join('')}</div>`;
    const chart=last?`<div class="cg-strength-chart"><canvas id="cg-shell-weight" role="img" aria-label="Meritve in sedemdnevni trend telesne teže"></canvas></div><div class="cg-chart-legend"><span><i class="cg-legend-dot"></i>Meritev</span><span><i class="cg-legend-line"></i>7-dnevno povprečje</span></div>`:'<p class="cg-small cg-empty">Vnesi prvo meritev za prikaz grafa.</p>';
    const measEntries=Object.entries(getMeas()).sort((a,b)=>a[0].localeCompare(b[0]));
    const measBlock=`<div class="cg-section-label"><span>Telesne mere · cm</span></div>${button('meas-add','+ Vnesi telesne mere','cg-add')}`+(measEntries.length===0?'<p class="cg-small cg-empty">Še ni vnesenih telesnih mer.</p>':`<details><summary>Telesne mere · pregled in urejanje</summary>${measEntries.slice().reverse().map(([date,v])=>`<div class="cg-setrow"><span class="cg-setvalue">${dateLabel(date)}<small>${MEAS_FIELDS.filter(f=>v[f]).map(f=>`${f}: ${fmt(v[f])}cm`).join(' · ')||'—'}</small></span>${button('meas-edit','Uredi','cg-link',`data-date-key="${date}"`)}</div>`).join('')}</details>`);
    return tiles+verdictBox+`<div class="cg-section-label"><span>Telesna teža · kg</span>${rangeButtons}</div>${chart}${button('weight-add','+ Vnesi današnjo težo','cg-add cg-add-accent')}<details><summary>Meritve · pregled in urejanje</summary>${entries.slice().reverse().map(([date,v])=>`<div class="cg-setrow"><span class="cg-setvalue">${dateLabel(date)}<small>${fmt(v)} kg</small></span>${button('weight-edit','Uredi','cg-link',`data-date-key="${date}"`)}</div>`).join('')}</details>`+measBlock;
  }
  function editMeas(date=dateKey(new Date())){
    const old=getMeas(),expected=JSON.stringify(old),existing=old[date]||{};
    const fields=MEAS_FIELDS.map(f=>`<label>${esc(f)} (cm)<input type="number" inputmode="decimal" name="${esc(f)}" min="20" max="200" step="0.5" value="${existing[f]??''}"></label>`).join('');
    sheet('Telesne mere',`<label>Datum<input type="date" name="date" value="${date}" required></label>`+fields,async data=>{
      const next=getMeas();if(JSON.stringify(next)!==expected)throw Error('Meritve so se spremenile.');
      const d=data.get('date'),entry={};
      MEAS_FIELDS.forEach(f=>{const v=data.get(f);if(v!=='' && v!=null)entry[f]=Number(v);});
      if(Object.keys(entry).length===0)throw Error('Vnesi vsaj eno mero.');
      if(d!==date && next[d]!==undefined)throw Error('Na izbrani datum že obstajajo mere. Uredi jih v seznamu.');
      if(d!==date)delete next[date];
      next[d]=entry;
      commitStorageBatch([[LS.meas,JSON.stringify(next)]]);
      notify('Telesne mere shranjene.');
    });
  }
  function progress(){return `<div class="cg-title-row"><div><h1 class="cg-progress-title">Napredek</h1><p class="cg-sub">Tvoj pregled treninga.</p></div></div><div class="cg-seg">${['Teža','Moč','Zgodovina'].map(p=>`<button data-progress="${p}" class="${state.progress===p?'selected':''}">${p}</button>`).join('')}</div>`+({'Teža':weightView,'Moč':strengthView,'Zgodovina':historyView}[state.progress]||weightView)();}
  function subHeader(title,sub){
    return `<div class="cg-shead">${button('settings-back',icon('left')+' Nastavitve','cg-shead-back')}<h1 class="cg-shead-title">${esc(title)}</h1>${sub?`<p class="cg-sub">${esc(sub)}</p>`:''}</div>`;
  }
  function phaseGuidelineCaptionV31(type){
    const g=WEIGHT_GUIDELINES_V30[type==='cut'?'cut':'bulk'],fmtSl=n=>Math.abs(n).toLocaleString('sl-SI',{maximumFractionDigits:2}),sign=type==='cut'?'−':'+';
    return `cilj ${sign}${fmtSl(g.min)} do ${sign}${fmtSl(g.max)} kg/teden`;
  }
  function programSummaryV31(){
    const meta=getProgramMetaV6(),cyc=getCyc().num;let days=0,exercises=0;
    meta.days.forEach((d,i)=>{if(d.deleted||d.active===false)return;days++;exercises+=dayListFor(i,cyc,cw).filter(e=>!e.programDisabled).length;});
    return {days,exercises};
  }
  function equipmentView(){const gym=getGym(),presets=[[20,'Olimpijska palica · 20 kg'],[15,'Olimpijska palica · 15 kg'],[10,'Kratka palica · 10 kg'],[8,'EZ palica · 8 kg'],['custom','Teža po meri']],kind=presets.some(([v])=>v===gym.bar)?gym.bar:'custom';return subHeader('Oprema in plošče')+`<form data-equipment-form class="cg-equipment-form"><label class="cg-checkline"><input type="checkbox" name="show" ${getV6Settings().plateCalculator!==false?'checked':''}> Pokaži kalkulator pri vaji s palico</label><label class="cg-field-label">Vrsta palice<select name="barKind">${presets.map(([v,t])=>`<option value="${v}" ${v===kind?'selected':''}>${t}</option>`).join('')}</select></label><label class="cg-field-label">Teža palice (kg)<input name="bar" type="number" min="1" max="50" step="0.25" value="${gym.bar}" ${kind!=='custom'?'readonly':''} required></label><label class="cg-field-label">Varovalke (par, kg)<input name="collars" type="number" min="0" max="10" step="0.25" value="${getCollars()}" required></label><div class="cg-section-label"><span>Razpoložljive plošče</span></div><div class="cg-plate-choices">${[1.25,2.5,5,10,15,20,25,50].map(p=>`<label class="cg-checkline"><input type="checkbox" name="plate" value="${p}" ${gym.plates.includes(p)?'checked':''}> ${fmt(p)} kg</label>`).join('')}</div><p class="cg-footnote">Označi teže plošč, ki so na voljo v tvojem fitnesu.</p><button type="submit" class="cg-action cg-full">Shrani opremo</button></form>`;}
  function sourceView(){const rows=historyRowsV24().filter(r=>(!state.flagged||r.reasons.length)&&(!state.query||(r.name+' '+r.source).toLowerCase().includes(state.query.toLowerCase())));return subHeader('Vsi zgodovinski viri','Treningi, posamezni vnosi in PR-ji')+`<form data-source-search><label class="cg-field-label">Vaja ali datum<input name="query" value="${esc(state.query)}" placeholder="Npr. bench ali 2026-09"></label><button class="cg-quiet" type="submit">Poišči</button></form><label class="cg-checkline"><input data-flagged type="checkbox" ${state.flagged?'checked':''}> Samo vrednosti za pregled</label><p class="cg-small">${rows.length} zapisov</p>${rows.slice(0,state.limit).map(r=>`<div class="cg-history-summary"><h2>${esc(r.name)}</h2><p class="cg-sub">${esc(r.source)}</p><div class="cg-setrow"><span class="cg-setvalue">${fmt(r.set.kg)} kg × ${esc(r.set.reps)}<small>RPE ${esc(r.set.rpe??'—')}</small></span><button class="cg-link" data-edit-ref="${refAttr(r.ref)}">Uredi</button></div>${r.reasons.map(s=>`<p class="cg-small cg-danger">${esc(s)}</p>`).join('')}</div>`).join('')}${rows.length>state.limit?button('source-more','Prikaži še 50'):''}${button('history-undo','Razveljavi zadnji popravek')}`;}
  function srow(act,title,caption,value,attrs=''){
    return button(act,`<span class="cg-srow-text"><strong>${esc(title)}</strong>${caption?`<small>${esc(caption)}</small>`:''}</span>${value?`<span class="cg-srow-value">${esc(value)}</span>`:''}${icon('right')}`,'cg-srow',attrs);
  }
  function settings(){
    if(state.settings==='equipment')return equipmentView();
    if(state.settings==='sources')return sourceView();
    if(state.settings==='history')return subHeader('Zgodovina','Datum → trening → vaja → serija')+historyView();
    if(state.settings==='phase'){
      const started=!!getBWPhaseContext([]).start;
      const startBtn=!started?button('phase-start','Nastavi datum začetka trenutne faze','cg-add'):'';
      const choices=`<div class="cg-choice-grid">${['cut','bulk'].map(p=>{const selected=getActiveProfile()===p;return `<button type="button" data-profile="${p}" class="cg-choice${selected?' selected':''}" aria-pressed="${selected}"><strong>${p==='cut'?'Cut':'Bulk'}</strong><small>${esc(phaseGuidelineCaptionV31(p))}</small></button>`;}).join('')}</div>`;
      const history=`<div class="cg-section-label"><span>Zgodovina faz</span></div><div class="cg-card">${getPhases().map((p,i)=>`<div class="cg-srow"><span class="cg-srow-text"><strong>${p.type==='bulk'?'Bulk':'Cut'}</strong><small>${esc(slDate(p.start))} → ${p.end?esc(slDate(p.end)):'zdaj'}</small></span>${button('phase-date','Uredi datum','cg-link',`data-index="${i}"`)}</div>`).join('')}</div>`;
      return subHeader('Faza telesne sestave','Faza določa cilj teže in trend. Tvoj seznam vaj ostane enak.')+startBtn+choices+'<p class="cg-footnote">Sprememba začne novo fazo danes. Ne vklopi 5/3/1 in ne menja izbranih vaj.</p>'+history;
    }
    if(state.settings==='backup'){
      const actions=`<div class="cg-backup-actions">${button('export','Prenesi varnostno kopijo (JSON)','cg-action cg-full')}${button('import','Obnovi iz datoteke','cg-quiet cg-full')}${button('snapshot','Shrani lokalno kopijo','cg-quiet cg-full')}</div>`;
      return subHeader('Varnostna kopija')+'<p class="cg-small">Izvozi datoteko JSON v telefon ali oblak. Lokalne kopije ne nadomestijo zunanjega backupa.</p>'+actions+'<div class="cg-section-label"><span>Lokalne kopije</span></div><div data-backup-list class="cg-card">Pridobivam seznam …</div>';
    }
    if(state.settings==='advanced')return advancedView();
    const gym=getGym(),prog=programSummaryV31(),lastExt=localStorage.getItem(V6_KEYS.lastExternal),
      backupCaption=lastExt?`Zadnja: ${new Date(lastExt).toLocaleDateString('sl-SI',{day:'numeric',month:'long',year:'numeric'})}`:'Izvozi JSON v telefon ali oblak.';
    const defaultRest=getDefaultRest();
    const trainingCard=`<div class="cg-card">${srow('phase','Faza telesne sestave','Cilj teže, vaje ostanejo enake',getActiveProfile()==='bulk'?'Bulk':'Cut')}${srow('program','Program in vaje',`${prog.days} aktivnih dni · ${prog.exercises} aktivnih vaj`)}${srow('equipment','Oprema in plošče',`Palica ${fmt(gym.bar)} kg · kalkulator ${getV6Settings().plateCalculator!==false?'vklopljen':'izklopljen'}`)}${srow('default-rest','Privzeti počitek','Velja, dokler vaja nima svojega',defaultRest!=null?clock(defaultRest):'Po vrsti vaje')}</div>`;
    const dataCard=`<div class="cg-card">${srow('backup','Varnostna kopija',backupCaption)}${srow('history','Zgodovina in popravki','Datum → trening → serija')}</div>`;
    const advancedCard=`<div class="cg-card">${programUses531V16()?srow('tm','5/3/1 · Training max'):''}${srow('history-sources','Vsi viri in sumljivi PR-ji')}${srow('pr-check','Preveri rekorde','Primerja shranjene PR-je z dejansko zgodovino')}${srow('advanced','Dodatna orodja')}</div>`;
    return `<div class="cg-shead"><h1 class="cg-shead-title">Nastavitve</h1><p class="cg-sub">Nastavi enkrat. Med treningom jih ne potrebuješ.</p></div><div class="cg-section-label"><span>Trening</span></div>${trainingCard}<div class="cg-section-label"><span>Podatki</span></div>${dataCard}<details class="cg-fold"><summary>Napredno · 5/3/1, viri zgodovine, orodja</summary>${advancedCard}</details><p class="cg-footnote">Workout Tracker ${APP_VERSION} · tvoji podatki ostajajo v napravi.</p>`;
  }
  function advancedView(){
    const alarm=getAlarmSettings(),rules=getV6Settings();
    return subHeader('Dodatna orodja')+`<form data-advanced-form><details class="cg-fold" open><summary>Alarm in počitek</summary>${[['sound','Zvok'],['vibrate','Vibracija'],['notif','Obvestila']].map(([k,t])=>`<label class="cg-checkline"><input type="checkbox" name="${k}" ${alarm[k]?'checked':''}> ${t}</label>`).join('')}<label class="cg-field-label">Glasnost (%)<input name="volume" type="number" min="0" max="100" step="10" value="${alarm.volume}" required></label><label class="cg-field-label">Melodija<select name="melody">${[['default','Trije toni'],['gentle','Nežno'],['urgent','Pet tonov'],['bell','Zvonček']].map(([k,t])=>`<option value="${k}" ${alarm.melody===k?'selected':''}>${t}</option>`).join('')}</select></label>${[['smartRest','Pametni počitek'],['restWarning','Opozorilo za kratek počitek']].map(([k,t])=>`<label class="cg-checkline"><input name="${k}" type="checkbox" ${rules[k]?'checked':''}> ${t}</label>`).join('')}</details><details class="cg-fold"><summary>Pravila progresije</summary><label class="cg-checkline"><input name="progression" type="checkbox" ${rules.progression?'checked':''}> Pametni predlogi</label>${[['rpeUp','RPE meja za povečanje',6],['rpeDown','RPE meja za zmanjšanje',7],['painStop','Meja opozorila za bolečino',1]].map(([k,t,min])=>`<label class="cg-field-label">${t}<input name="${k}" type="number" min="${min}" max="10" step="0.5" value="${rules[k]}" required></label>`).join('')}<p class="cg-small">Povečanje zahteva vse načrtovane delovne serije. Predlogi ne spreminjajo vaj.</p></details><button type="submit" class="cg-action cg-full">Shrani nastavitve</button></form><details class="cg-fold"><summary>Cikli</summary><p class="cg-small">Trenutni cikel: ${getCyc().num}. Novi cikel začne teden 1; stare serije in zgodovina ostanejo.</p>${button('cycle-new','Začni nov cikel','cg-quiet')}${programUses531V16()?`<p class="cg-small">5/3/1 · zamik TM: ${get531CycleOffset()} ciklov</p>${button('tm-advance','5/3/1: naslednji TM')}${button('tm-reset','5/3/1: ponastavi zamik TM')}`:''}</details><div class="cg-section-label"><span>Aplikacija in obnovitev</span></div>${button('update','Preveri posodobitve','cg-settingsrow')}${button('draft-restore','Obnovi vnose pred novo izvedbo','cg-settingsrow')}${button('diagnostics','Kopiraj tehnično diagnostiko','cg-settingsrow')}<p class="cg-footnote">${APP_VERSION} · nov kompaktni vmesnik, ista podatkovna shramba.</p>`;
  }
  function chartTokensV30(){
    const cs=root?getComputedStyle(root):null,get=(name,fb)=>{const v=cs?cs.getPropertyValue(name).trim():'';return v||fb;};
    return {accent:get('--cg-accent','#ff7a1a'),muted:get('--cg-muted','#b4a79b'),line:get('--cg-line','#2f2620'),dim:get('--cg-dim','#8a7d72')};
  }
  function chartOptions(){
    const t=chartTokensV30();
    return {responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false},tooltip:{enabled:true,callbacks:{title:items=>items[0]?dateLabel(items[0].label):''}}},scales:{x:{grid:{display:false},ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:4,color:t.muted,callback:function(v){const date=this.getLabelForValue(v);return new Date(date+'T12:00').toLocaleDateString('sl-SI',{day:'numeric',month:'numeric'});}}},y:{grace:'10%',ticks:{color:t.muted,maxTicksLimit:5,callback:v=>fmt(v)},grid:{color:t.line}}}};
  }
  function drawChart(){
    if(typeof Chart==='undefined')return;
    const strength=$('#cg-shell-strength'),weight=$('#cg-shell-weight'),t=chartTokensV30();
    if(strength){const series=compactStrengthSeriesV26(sessions(),state.strength),options=chartOptions();options.onClick=(_,points)=>{if(points.length){state.point=series[points[0].index].si;render();}};options.plugins.tooltip.callbacks.label=c=>`${fmt(c.raw)} kg × ${series[c.dataIndex].reps}`;chart=new Chart(strength,{type:'line',data:{labels:series.map(p=>p.date),datasets:[{data:series.map(p=>p.kg),borderColor:t.accent,backgroundColor:t.accent,pointRadius:series.map(p=>p.si===state.point?6:3),pointHitRadius:16,borderWidth:2.5,tension:.15}]},options});}
    if(weight){const entries=Object.entries(getBW()).sort((a,b)=>a[0].localeCompare(b[0])),view=bwChartWindowV25(entries,state.weightDays),options=chartOptions();options.plugins.tooltip.callbacks.label=c=>`${c.dataset.label}: ${fmt(c.raw)} kg`;chart=new Chart(weight,{type:'line',data:{labels:view.map(p=>p[0]),datasets:[{label:'Meritve',data:view.map(p=>Number(p[1])),borderColor:t.dim,backgroundColor:t.dim,pointRadius:2,pointHitRadius:10,showLine:false},{label:'7-dnevno povprečje',data:view.map(([d])=>avg7d(entries.filter(([date])=>date<=d))),borderColor:t.accent,backgroundColor:t.accent,pointRadius:0,borderWidth:2.5,tension:.2}]},options});}
  }
  async function renderBackups(){const holder=$('[data-backup-list]');if(!holder)return;try{const list=await getAllBackups();if(!holder.isConnected)return;holder.innerHTML=list.map(b=>`<div class="cg-srow"><span class="cg-srow-text"><strong>${esc(new Date(b.date).toLocaleString('sl-SI'))}</strong><small>${b.sizeKB||'?'} KB · ${esc(b.label||'lokalna kopija')}</small></span>${button('backup-download','Prenesi','cg-link',`data-index="${b.id}"`)}</div>`).join('')||'<p class="cg-small cg-empty">Ni lokalnih kopij.</p>';}catch(e){holder.textContent=e.message;}}
  function render(){
    if(!root)return;if(chart){chart.destroy();chart=null;}
    const oldScroll=window.scrollY,route=[state.page,state.focus,state.settings,state.progress,state.strength].join('|');
    main.innerHTML=({Trening:workout,Program:program,Napredek:progress,Nastavitve:settings}[state.page]||workout)();
    root.dataset.focus=String(state.focus&&state.page==='Trening');nav.hidden=state.focus&&state.page==='Trening';
    nav.innerHTML=[['Trening','dumbbell'],['Program','program'],['Napredek','chart'],['Nastavitve','settings']].map(([p,ic])=>`<button data-page="${p}" ${state.page===p?'aria-current="page"':''}>${icon(ic)}${p}</button>`).join('');
    const e=activeExercise();for(const [selector,set] of [['[data-prescription]',prescriptionOpen]]){const d=$(selector);if(d&&e)d.addEventListener('toggle',()=>{if(d.open)set.add(e.key);else set.delete(e.key);});}
    updatePlates();drawChart();renderBackups();
    if(route!==renderedRoute){window.scrollTo({top:0});renderedRoute=route;}else window.scrollTo({top:oldScroll});
  }
  function queue(){if(queued||!root)return;queued=true;requestAnimationFrame(()=>{queued=false;const focused=root.getRootNode().activeElement;if(!dialog.open&&!(main.contains(focused)&&focused?.matches('input,textarea,select')))render();});}
  function updatePlates(){const el=$('.cg-plates'),e=activeExercise();if(!el||!e)return;if(getV6Settings().plateCalculator===false){el.innerHTML=button('equipment','Kalkulator plošč je izklopljen · nastavi');return;}const kg=Number($('[data-field="kg"]')?.value||valuesFor(e).kg),p=calcPlatesFor(kg);el.innerHTML=`${p?`Na stran: ${esc(p.each)}<br>Palica ${fmt(p.bar)} kg · skupaj ${fmt(p.total)} kg`:kg>0?'Teže ni mogoče sestaviti z izbranimi ploščami.':'Vnesi težo za izračun plošč.'} ${button('equipment','Oprema')}`;}
  function closeSheet(cancel=true){dialog.close();const callback=modalCancel;modalSave=null;modalCancel=null;if(cancel&&callback)callback();}
  function sheet(title,body,save,ok='Shrani',cancel,soloOk=false){
    if(dialog.open)closeSheet(true);modalSave=save;modalCancel=cancel;
    dialog.innerHTML=`<form class="cg-sheet"><div class="cg-dialog-title"><h2>${esc(title)}</h2>${soloOk?'':button('modal-close',icon('x'),'cg-icon','aria-label="Zapri"')}</div>${body}<p class="cg-form-error" role="alert"></p><div class="cg-sheet-actions">${soloOk?'':button('modal-close','Prekliči','cg-quiet')}<button type="submit" class="${soloOk?'cg-quiet':'cg-action'}">${esc(ok)}</button></div></form>`;
    dialog.showModal();dialog.querySelector('form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;const submit=form.querySelector('[type="submit"]');submit.disabled=true;const fn=modalSave;try{await fn(new FormData(form));if(modalSave===fn){closeSheet(false);render();}}catch(error){form.querySelector('[role="alert"]').textContent=error.message;}finally{submit.disabled=false;}});
  }
  function ask(text,ok='Potrdi'){return new Promise(resolve=>sheet('Potrditev',`<p class="cg-small" style="white-space:pre-wrap">${esc(text)}</p>`,()=>resolve(true),ok,()=>resolve(false)));}
  const setFields=s=>`<div class="cg-modal-fields"><div class="cg-two-fields"><label>Teža (kg)<input name="kg" type="number" inputmode="decimal" min="0" max="2000" step="any" value="${esc(s.kg??'')}" required></label><label>Ponovitve<input name="reps" type="number" inputmode="numeric" min="1" max="1000" step="1" value="${esc(s.reps??'')}" required></label></div><label>RPE (neobvezno)<input name="rpe" type="number" inputmode="decimal" min="1" max="10" step="0.5" value="${esc(s.rpe??'')}"></label></div>`;
  function historyData(){return {sets:getSets(),sessions:getSessions(),prs:getPRs()};}
  function commitHistory(before,next){commitStorageBatch([[LS.sets,JSON.stringify(next.sets)],[LS.sessions,JSON.stringify(next.sessions)],[LS.pr,JSON.stringify(next.prs)],['wt_history_undo_v24',JSON.stringify({before,after:next})]]);}
  function editRef(ref,workout=false){
    if(!workout)guardProgram();const before=historyData(),row=historyTargetV24(before,ref);if(!row)throw Error('Zapisa ni več.');const expected=JSON.stringify(row),name=ref.kind==='session'?before.sessions[ref.si].exercises[ref.ei].name:row.exName||(workout?activeExercise()?.name:ref.kind==='pr'?'PR '+ref.key:'Stara vaja');
    sheet(workout?'Uredi opravljeno serijo':'Uredi zgodovinski zapis',`<p class="cg-small">${esc(name)}</p>${workout?'':`<label>Ime vaje<input name="name" value="${esc(name)}" maxlength="160" required></label>`}${setFields(row)}`,data=>{
      if(!workout)guardProgram();const fresh=historyData(),next=historyCorrectionV24(fresh,ref,expected,{kg:data.get('kg'),reps:data.get('reps'),rpe:data.get('rpe'),name:workout?name:data.get('name')});commitHistory(fresh,next);if(workout){window.WTFocusPatchV10.syncFromStorage(ref.key);showDay(cd);}notify('Popravek shranjen. Drugi viri ostanejo nespremenjeni.');
    });
  }
  function savePlanAction(e,action,refresh=true){
    if(!currentRows().some(x=>x.key===e.key))throw Error('Trening se je spremenil.');
    compactCommitPlanV27(e.key,e.target,JSON.stringify(e.rows),action,e.name);draft.delete(e.key);window.WTFocusPatchV10.syncFromStorage(e.key);if(refresh){showDay(cd);setGymFocus(e.key,false);}
  }
  function addPlanned(){const e=activeExercise(),last=e.rows.at(-1)||valuesFor(e);sheet('Dodaj načrtovane serije',`<p class="cg-small">${esc(e.name)} · vpis vnaprej</p><label>Število novih serij<input name="count" type="number" min="1" max="${30-e.target}" value="1" required></label><label>Teža za nove serije (kg)<input name="kg" type="number" min="0" max="2000" step="any" value="${esc(last.kg??'')}" required></label><label>Ponovitve<input name="reps" type="number" min="1" max="1000" value="${esc(last.reps||8)}" required></label>`,data=>{savePlanAction(e,{type:'add',count:Number(data.get('count')),kg:data.get('kg'),reps:data.get('reps')});notify('Serije pripravljene. Vsako težo lahko še spremeniš.');},'Dodaj');}
  function editRestSheet(){const e=activeExercise();sheet('Počitek',`<p class="cg-small">${esc(e.name)}</p><div class="cg-rest-presets">${[60,90,120,180].map(n=>`<button type="button" class="cg-quiet" data-rest-preset="${n}">${clock(n)}</button>`).join('')}</div><div class="cg-two-fields"><label>Minute<input type="number" name="minutes" min="0" max="15" value="${Math.floor(e.rest/60)}" required></label><label>Sekunde<input type="number" name="seconds" min="0" max="59" value="${e.rest%60}" required></label></div>`,data=>{const n=Number(data.get('minutes'))*60+Number(data.get('seconds'));if(n<5||n>900)throw Error('Počitek mora biti 5–900 sekund.');const rests=getCustomRest();rests[e.item.id||e.name]=n;if(!safeSetRaw('wt_custom_rest',JSON.stringify(rests)))throw Error('Počitek ni shranjen.');const t=currentTimerV6();if(t?.key===e.key)startT(e.key,n);notify('Počitek shranjen.');});}
  function defaultRestSheet(){const cur=getDefaultRest(),base=cur??90;sheet('Privzeti počitek',`<p class="cg-small">Velja za vsako vajo brez lastnega počitka.</p><div class="cg-rest-presets">${[60,90,120,180].map(n=>`<button type="button" class="cg-quiet" data-rest-preset="${n}">${clock(n)}</button>`).join('')}</div><div class="cg-two-fields"><label>Minute<input type="number" name="minutes" min="0" max="10" value="${Math.floor(base/60)}" required></label><label>Sekunde<input type="number" name="seconds" min="0" max="59" value="${base%60}" required></label></div>${button('default-rest-reset','Ponastavi (po vrsti vaje)','cg-quiet cg-full')}`,data=>{const n=Number(data.get('minutes'))*60+Number(data.get('seconds'));if(n<30||n>600)throw Error('Privzeti počitek mora biti 30–600 sekund.');if(!safeSetRaw('wt_default_rest',String(n)))throw Error('Privzeti počitek ni shranjen.');notify('Privzeti počitek: '+clock(n)+'.');});}
  function prAuditData(){
    const prog=typeof PROG!=='undefined'?PROG:{days:[]},resolveName=prSlotNameResolver(prog);
    const {best,repBest}=prAuditBestRowsV33(sessions().flatMap(s=>s.exercises),getSets(),resolveName);
    return compactPrAuditV33(getPRs(),getRepPRs(),resolveName,best,repBest);
  }
  function prCheckSheet(){
    const audit=prAuditData(),rows=[...audit.slotDiffs,...audit.repDiffs.map(d=>({...d,isRep:true}))];
    if(!rows.length){sheet('Preveri rekorde','<p class="cg-small">Vsi rekordi se ujemajo z zgodovino.</p>',()=>{},'V redu');return;}
    const rowId=r=>r.isRep?`rep:${r.name}:${r.reps}`:r.key;
    const rowLine=r=>{
      const label=r.isRep?`${esc(r.name)} · ${r.reps} ${r.reps===1?'ponovitev':'ponovitve'}`:esc(r.name||'Neznana vaja (stara shema)');
      const stored=`shranjeno ${fmt(r.storedKg)} kg${r.storedReps!=null?' × '+r.storedReps:''}`;
      const hist=r.noHistory?'brez zapisa v zgodovini':`iz zgodovine ${fmt(r.historyKg)} kg${r.historyReps!=null?' × '+r.historyReps:''}`;
      const check=r.noHistory?`<label class="cg-checkline"><input type="checkbox" name="pr-remove" value="${esc(rowId(r))}"> Odstrani (ni podprto z zgodovino)</label>`:'';
      return `<div class="cg-srow"><span class="cg-srow-text"><strong>${label}</strong><small>${stored} · ${hist}</small></span></div>${check}`;
    };
    sheet('Preveri rekorde',`<p class="cg-small">${rows.length} ${rows.length===1?'razlika':'razlik'} med shranjenimi rekordi in zgodovino.</p>${rows.map(rowLine).join('')}`,async data=>{
      const toRemove=new Set(data.getAll('pr-remove')),fresh=prAuditData();
      if(!await autoBackupToIDB())throw Error('Lokalna varnostna kopija ni uspela. Rekordi niso bili popravljeni.');
      const prs=getPRs(),reps=getRepPRs();let changed=false;
      fresh.slotDiffs.forEach(d=>{
        if(d.noHistory){if(toRemove.has(d.key)){delete prs[d.key];changed=true;}}
        else{prs[d.key]=(typeof prs[d.key]==='object'&&prs[d.key])?{...prs[d.key],kg:d.historyKg,reps:d.historyReps}:d.historyKg;changed=true;}
      });
      fresh.repDiffs.forEach(d=>{
        const id=`rep:${d.name}:${d.reps}`;
        if(d.noHistory){if(toRemove.has(id)&&reps[d.name]){delete reps[d.name][d.reps];if(!Object.keys(reps[d.name]).length)delete reps[d.name];changed=true;}}
        else{reps[d.name]=reps[d.name]||{};reps[d.name][d.reps]=d.historyKg;changed=true;}
      });
      if(!changed){notify('Ni izbranih popravkov.');return;}
      commitStorageBatch([[LS.pr,JSON.stringify(prs)],['wt_rep_prs',JSON.stringify(reps)]]);
      notify('Rekordi popravljeni.');
    },'Popravi rekorde');
  }
  function afterProgram(){applyProgramStateV6();ensureDayLists();showDay(getProgramMetaV6().days[cd]?.active!==false?cd:activeDayIndicesV6()[0]);draft.clear();notify('Program shranjen. Zgodovina ostane ohranjena.');}
  function editProgram(index){
    guardProgram();const di=state.day,list=getDayLists()[di],item=list[index],expected=JSON.stringify(item),name=dispNameForItem(item,getCyc().num,cw);
    sheet('Uredi vajo',`<label>Ime vaje<input name="name" value="${esc(name)}" maxlength="100" required></label><div class="cg-two-fields"><label>Serije (prazno = program)<input type="number" name="sets" min="1" max="12" value="${item.targetSets||''}"></label><label>Ponovitve<input name="reps" value="${esc(item.targetReps||'')}" placeholder="npr. 6–8" maxlength="30"></label></div><label class="cg-checkline"><input name="active" type="checkbox" ${!item.programDisabled?'checked':''}> Aktivna vaja</label><details><summary>Napredne možnosti vaje</summary><label>Progresija<select name="mode">${[['auto','Pametno'],['linear','Linearno'],['double','Dvojna progresija'],['531','5/3/1'],['hold','Brez sprememb']].map(([v,t])=>`<option value="${v}" ${(item.progMode||'auto')===v?'selected':''}>${t}</option>`).join('')}</select></label><label>5/3/1 dvig<select name="lift">${['bench','squat','deadlift','ohp'].map(v=>`<option value="${v}" ${(item.lift531||infer531LiftV16(name))===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Ciljni RPE<input name="targetRpe" type="number" min="5" max="10" step="0.5" value="${item.targetRpe||''}"></label><label>Počitek (sekunde)<input name="rest" type="number" min="5" max="900" value="${item.r||90}" required></label><label class="cg-checkline"><input name="main" type="checkbox" ${item.m?'checked':''}> Glavna vaja</label><label>Navodilo<textarea name="description" maxlength="1000">${esc(item.d||'')}</textarea></label></details>`,data=>{
      guardProgram();const all=getDayLists(),it=all[di]?.[index];if(JSON.stringify(it)!==expected)throw Error('Program se je spremenil. Ponovno odpri vajo.');const n=plainImportedText(data.get('name'),100).trim();if(!n)throw Error('Vnesi ime.');if(n!==name){it.sw=(it.sw||[]).filter(s=>!(s.c===getCyc().num&&s.w===cw));it.sw.push({n,c:getCyc().num,w:cw});}
      Object.assign(it,{targetSets:data.get('sets')?Number(data.get('sets')):undefined,targetReps:plainImportedText(data.get('reps'),30),targetRpe:data.get('targetRpe')?Number(data.get('targetRpe')):undefined,programDisabled:!data.has('active'),progMode:data.get('mode'),r:Number(data.get('rest')),m:data.has('main'),d:plainImportedText(data.get('description'),1000)});if(it.progMode==='531')it.lift531=data.get('lift');else delete it.lift531;if(!saveDayLists(all))throw Error('Program ni shranjen.');afterProgram();
    });
  }
  function exerciseCatalogV29(){return [...new Set([...EXERCISE_DB.map(e=>e.n),...getCustomExercises().map(e=>e.n)])];}
  function exerciseIsOnDayV29(di,name){return (getDayLists()[di]||[]).some(e=>compactNameV26(dispNameForItem(e,getCyc().num,cw))===compactNameV26(name));}
  function exerciseResultsV29(di,query,catalog){
    const q=compactNameV26(query).trim();
    const names=(q?catalog.filter(n=>compactNameV26(n).includes(q)):[]).slice(0,40);
    const exact=names.some(n=>compactNameV26(n)===q);
    const rows=names.map(n=>{const dup=exerciseIsOnDayV29(di,n);return `<button type="button" class="cg-exresult" data-pick-exercise="${esc(n)}" ${dup||programWriteBusy?'disabled':''}>${esc(n)}${dup?'<small>že na tem dnevu</small>':''}</button>`;}).join('');
    const trimmed=query.trim(),nova=(trimmed&&!exact)?`<button type="button" class="cg-exresult cg-exresult-new" data-pick-exercise="${esc(trimmed)}" ${programWriteBusy?'disabled':''}>Nova vaja: ${esc(trimmed)}</button>`:'';
    return `<div class="cg-exresults" data-exercise-results>${rows}${nova}${!rows&&!nova?'<p class="cg-small cg-empty">Ni zadetkov.</p>':''}</div>`;
  }
  function addExercise(){
    guardProgram();const di=state.day,catalog=exerciseCatalogV29();
    sheet('Dodaj vajo',`<label>Iskanje vaje<input name="search" data-exercise-search autocomplete="off" placeholder="Vpiši ime vaje" maxlength="100"></label><input type="hidden" name="name">${exerciseResultsV29(di,'',catalog)}<div class="cg-two-fields"><label>Serije<input type="number" name="sets" min="1" max="12" value="3" required></label><label>Ponovitve<input name="reps" value="8–12" maxlength="30" required></label></div>`,async data=>{
      if(programWriteBusy)return;programWriteBusy=true;
      try{
        const name=plainImportedText(data.get('name')||data.get('search'),100).trim();if(!name)throw Error('Izberi ali vpiši vajo.');
        if(exerciseIsOnDayV29(di,name))throw Error('Vaja je že na tem dnevu.');
        guardProgram();await autoBackupToIDB();guardProgram();
        if(exerciseIsOnDayV29(di,name))throw Error('Vaja je že na tem dnevu.');
        const db=EXERCISE_DB.find(e=>e.n===name);
        mutateDayList(di,rows=>rows.push({id:_newExId(name),n0:name,m:false,r:db?.c==='compound'?120:75,d:db?.d||'',extra:true,progMode:'auto',targetSets:Number(data.get('sets')),targetReps:plainImportedText(data.get('reps'),30)}));
        if(storageHasPendingWrites())throw Error('Vaja ni varno shranjena. Ponovi shranjevanje ali izvozi podatke.');
        afterProgram();
      }finally{programWriteBusy=false;}
    },'Dodaj');
    const searchInput=dialog.querySelector('[data-exercise-search]'),nameField=dialog.querySelector('input[name="name"]'),form=dialog.querySelector('form');
    const wirePickButtons=()=>{dialog.querySelectorAll('[data-pick-exercise]').forEach(btn=>btn.addEventListener('click',()=>{if(programWriteBusy||btn.disabled)return;nameField.value=btn.dataset.pickExercise;form.requestSubmit();}));};
    const updateResults=()=>{const host=dialog.querySelector('[data-exercise-results]');if(host){host.outerHTML=exerciseResultsV29(di,searchInput.value,catalog);wirePickButtons();}};
    searchInput?.addEventListener('input',updateResults);wirePickButtons();
  }
  function editDay(){guardProgram();const index=state.day,meta=getProgramMetaV6(),day=meta.days[index],expected=JSON.stringify(day);sheet('Uredi dan',`<label>Ime dneva<input name="name" value="${esc(day.name)}" maxlength="50" required></label><label>Opis<input name="sub" value="${esc(day.sub||'')}" maxlength="120"></label><label class="cg-checkline"><input type="checkbox" name="active" ${day.active!==false?'checked':''}> Aktiven dan</label>${button('day-duplicate','Podvoji ta dan')}`,data=>{guardProgram();const next=getProgramMetaV6();if(JSON.stringify(next.days[index])!==expected)throw Error('Dan se je spremenil.');if(!data.has('active')&&!next.days.some((d,i)=>i!==index&&d.active!==false&&!d.deleted))throw Error('Vsaj en dan mora ostati aktiven.');Object.assign(next.days[index],{name:plainImportedText(data.get('name'),50),title:plainImportedText(data.get('name'),50),sub:plainImportedText(data.get('sub'),120),active:data.has('active')});commitStorageBatch([[V6_KEYS.metaShared,JSON.stringify(next)]]);afterProgram();});}
  async function addDay(duplicate=false){
    guardProgram();const before=getProgramMetaV6();if(before.days.length>=7)throw Error('Največ 7 dni.');if(duplicate)closeSheet(false);
    sheet(duplicate?'Podvoji dan':'Dodaj dan',`<label>Ime dneva<input name="name" value="${duplicate?esc(before.days[state.day].name+' kopija'):''}" maxlength="50" required></label>`,async data=>{
      if(programWriteBusy)return;programWriteBusy=true;
      try{
        guardProgram();await autoBackupToIDB();guardProgram();
        const meta=getProgramMetaV6(),all=getDayLists();if(meta.days.length!==before.days.length)throw Error('Program se je spremenil.');
        const i=meta.days.length,name=plainImportedText(data.get('name'),50);
        meta.days.push({...duplicate?meta.days[state.day]:{},name,title:name,active:true,deleted:false});
        all[i]=duplicate?(all[state.day]||[]).map(e=>({...JSON.parse(JSON.stringify(e)),id:_newExId(e.n0)})):[];
        commitStorageBatch([[V6_KEYS.metaShared,JSON.stringify(meta)],[_dlKey(),JSON.stringify(all)]]);
        state.day=i;afterProgram();
      }finally{programWriteBusy=false;}
    },'Dodaj');
  }
  function editWeight(date=dateKey(new Date())){const old=getBW(),expected=JSON.stringify(old),value=old[date]??'';sheet('Telesna teža',`<label>Datum<input type="date" name="date" value="${date}" required></label><label>Teža (kg)<input type="number" inputmode="decimal" name="kg" min="30" max="250" step="0.1" value="${value}" required></label>`,data=>{const next=getBW();if(JSON.stringify(next)!==expected)throw Error('Meritve so se spremenile.');const d=data.get('date');if(d!==date&&next[d]!==undefined)throw Error('Na izbrani datum je že meritev. Uredi jo v seznamu.');if(value!==''&&d!==date)delete next[date];next[d]=Number(data.get('kg'));commitStorageBatch([[LS.bw,JSON.stringify(next)],['wt_bw_undo_v27',JSON.stringify(old)]]);notify('Meritev shranjena.');});}
  function editHistoryMeta(){guardProgram();const index=state.session,old=getSessions()[index],expected=JSON.stringify(old);if(!old)return;sheet('Uredi trening',`<label>Datum<input type="date" name="date" value="${esc(old.date)}" required></label><label>Ura<input type="time" name="time" value="${esc(old.startTime||'12:00')}" required></label><label>Ime treninga<input name="name" value="${esc(old.dayName)}" maxlength="100" required></label><label>Trajanje (minute)<input type="number" name="minutes" min="0" max="1440" value="${old.durationMin||0}" required></label>`,data=>{guardProgram();const before=historyData(),next=JSON.parse(JSON.stringify(before));if(JSON.stringify(next.sessions[index])!==expected)throw Error('Trening se je spremenil.');Object.assign(next.sessions[index],{date:data.get('date'),startTime:data.get('time'),dayName:plainImportedText(data.get('name'),100),durationMin:Number(data.get('minutes'))});commitHistory(before,next);selectDate(data.get('date'));state.session=index;notify('Popravljen samo izbrani trening.');});}
  function addHistorySet(ei){guardProgram();const si=state.session,old=getSessions()[si],ex=old?.exercises?.[ei];if(!ex)return;const expected=JSON.stringify(old);sheet('Dodaj serijo v zgodovino',`<p class="cg-small">${esc(old.date+' · '+ex.name)}</p>${setFields(ex.sets.filter(s=>s.done).at(-1)||{kg:'',reps:8})}`,data=>{guardProgram();const before=historyData(),next=JSON.parse(JSON.stringify(before));if(JSON.stringify(next.sessions[si])!==expected)throw Error('Trening se je spremenil.');const rows=next.sessions[si].exercises[ei].sets;rows.push({kg:0,reps:1,done:true,exName:ex.name,type:'work',id:'correction_'+Date.now()});const updated=historyCorrectionV24(next,{kind:'session',si,ei,ri:rows.length-1},JSON.stringify(rows.at(-1)),{kg:data.get('kg'),reps:data.get('reps'),rpe:data.get('rpe'),name:ex.name});commitHistory(before,updated);notify('Serija dodana samo v izbrani zgodovinski trening.');},'Dodaj');}
  async function click(event){
    const b=event.target.closest('button');if(!b||b.disabled)return;
    try{
      if(b.dataset.page){state.page=b.dataset.page;state.settings='';state.query='';state.cycleMenu=false;render();return;}
      if(b.dataset.ex){state.active=b.dataset.ex;state.openRow=state.openRow===b.dataset.ex?'':b.dataset.ex;setGymFocus(state.active,false);render();return;}
      if(b.dataset.quickWeek!==undefined){const programPage=state.page==='Program',candidate=programPage?state.day:cd,day=activeDayIndicesV6().includes(candidate)?candidate:activeDayIndicesV6()[0];selectQuickWorkout(Number(b.dataset.quickWeek),day,programPage);render();return;}
      if(b.dataset.quickDay!==undefined){const day=Number(b.dataset.quickDay);if(b.dataset.quickProgram==='1'){if(!activeDayIndicesV6().includes(day))throw Error('Ta trening ni aktiven.');state.day=day;}else selectQuickWorkout(cw,day);render();return;}
      if(b.dataset.progress){state.progress=b.dataset.progress;render();return;}
      if(b.dataset.date){selectDate(b.dataset.date);render();return;}
      if(b.dataset.weightRange!==undefined){state.weightDays=Number(b.dataset.weightRange);render();return;}
      if(b.dataset.historyPick!==undefined){state.session=Number(b.dataset.historyPick);state.exercise='';render();return;}
      if(b.dataset.strength){state.strength=b.dataset.strength;state.point=-1;render();return;}
      if(b.dataset.editRef){editRef(JSON.parse(b.dataset.editRef));return;}
      if(b.dataset.profile){await switchProfile(b.dataset.profile);render();return;}
      if(b.dataset.onboard){closeSheet(false);finishOnboarding(b.dataset.onboard);return;}
      if(b.dataset.restPreset){const n=Number(b.dataset.restPreset);dialog.querySelector('[name="minutes"]').value=Math.floor(n/60);dialog.querySelector('[name="seconds"]').value=n%60;return;}
      const act=b.dataset.act,index=Number(b.dataset.index),e=activeExercise();if(!act)return;
      if(act==='modal-close'){closeSheet();return;}
      if(act==='storage-retry'){if(!storageHasPendingWrites())return;const ok=retryPendingStorageWrites();setSaveState(ok?'ok':'error');notify(ok?'Shranjeno.':'Shranjevanje ni uspelo. Izvozi podatke v Nastavitvah → Varnostna kopija.',!ok);return;}
      if(act==='focus'){state.focus=!state.focus;setGymMode(state.focus);}
      else if(act==='cycle-menu'){state.cycleMenu=!state.cycleMenu;}
      else if(act==='quick-next')selectQuickWorkout(cw,index);
      else if(act==='recovery-resume'){closeSheet(false);resumeSessionV6();state.focus=true;state.active=localStorage.getItem('wt_active_ex')||'';}
      else if(act==='recovery-discard'){closeSheet(false);await discardSessionV6();if(window.v6RecoveryPending){showRecovery();return;}}
      else if(act==='prev'||act==='next'){const i=workoutCache.indexOf(e)+(act==='next'?1:-1);state.active=workoutCache[Math.max(0,Math.min(workoutCache.length-1,i))].key;setGymFocus(state.active,false);}
      else if(act==='session-start'||act==='session-finish'){if(window.v6RecoveryPending){showRecovery();return;}const wasRunning=stRun;await toggleSess();if(wasRunning&&!stRun){const t=currentTimerV6();if(t)stopT(t.key);state.focus=false;state.openRow='';state.page='Napredek';state.progress='Zgodovina';selectDate(getSessions()[0]?.date||dateKey(new Date()));}if(!wasRunning&&stRun){draft.clear();const first=workoutCache.find(x=>x.status!=='done')||workoutCache[0];state.openRow=first?.key||'';state.active=first?.key||state.active;}}
      else if(act==='set-add-one'){const vals=lastSetValues(e);if(!vals){addPlanned();return;}savePlanAction(e,{type:'add',count:1,kg:vals.kg,reps:vals.reps});notify('Serija dodana.');}
      else if(act==='set-remove-last'){savePlanAction(e,{type:'remove',index:e.target-1});notify('Zadnja serija odstranjena. Opravljene ostanejo.');}
      else if(act==='set-edit'){editRef({kind:'sets',key:e.key,ri:index},true);return;}
      else if(act==='set-undo'){if(!await ask('Razveljavim oznako opravljeno za to serijo? Kilogrami in ponovitve ostanejo v načrtu.','Razveljavi'))return;const rows=getSets()[e.key]||[];if(!rows[index]?.done)return;tgSet(e.key,index,cd,e.ei,getCyc().num);window.WTFocusPatchV10.syncFromStorage(e.key);showDay(cd);}
      else if(act==='rest-settings'){editRestSheet();return;}
      else if(act==='default-rest'){defaultRestSheet();return;}
      else if(act==='default-rest-reset'){if(!safeRemoveRaw('wt_default_rest'))throw Error('Ponastavitev ni uspela.');closeSheet(false);notify('Privzeti počitek odstranjen. Velja počitek po vrsti vaje.');}
      else if(act==='rest-start')startT(e.key,e.rest);
      else if(act==='rest-stop'){const t=currentTimerV6();if(t){restNotifiedId=t.id;stopT(t.key);}}
      else if(act==='rest-toggle'){const t=currentTimerV6();if(t)pauseResumeTimerV6(t.key);}
      else if(act==='rest-minus'||act==='rest-plus')adjustTimerV6(act==='rest-plus'?30:-30);
      else if(act==='exercise-info'){sheet(e.name,`<p class="cg-small">${esc(e.item.d||'Opis še ni dodan.')}</p><p class="cg-footnote">${esc(e.item.tip||'')}</p><label class="cg-checkline"><input name="plate" type="checkbox" ${window.WTReleasePatchV13.plateEnabled(e.key)?'checked':''}> Kalkulator plošč za to vajo</label><label>Bolečina (0–10)<input name="pain" type="number" min="0" max="10" value="${getPain(e.key)}"></label>`,data=>{window.WTReleasePatchV13.setPlateEnabled(e.key,data.has('plate'));setExPain(e.key,Number(data.get('pain')),cd,e.ei,getCyc().num);});return;}
      else if(act==='program-current'){state.page='Program';state.day=cd;}
      else if(act==='program-edit'){editProgram(index);return;}
      else if(act==='program-add'){addExercise();return;}
      else if(act==='program-up'){guardProgram();await autoBackupToIDB();guardProgram();moveBuilderExerciseV6(state.day,index,-1);afterProgram();}
      else if(act==='program-down'){guardProgram();await autoBackupToIDB();guardProgram();moveBuilderExerciseV6(state.day,index,1);afterProgram();}
      else if(act==='program-toggle'){guardProgram();const all=getDayLists(),it=all[state.day]?.[index];if(!it)throw Error('Vaja ni več na tem dnevu.');it.programDisabled=!it.programDisabled;if(!saveDayLists(all))throw Error('Program ni shranjen.');afterProgram();notify(it.programDisabled?'Vaja je neaktivna. Zgodovina ostane.':'Vaja je spet aktivna.');}
      else if(act==='day-edit'){editDay();return;}
      else if(act==='day-add'||act==='day-duplicate'){await addDay(act==='day-duplicate');return;}
      else if(act==='program-day'||act==='inactive-day'){state.day=index;}
      else if(act==='month-prev'||act==='month-next'){const d=new Date(state.year,state.month+(act==='month-next'?1:-1),1);state.year=d.getFullYear();state.month=d.getMonth();}
      else if(act==='history-meta'){editHistoryMeta();return;}
      else if(act==='history-add'){addHistorySet(index);return;}
      else if(act==='history-undo')await undoHistoryEditV24();
      else if(act==='history-sources'){state.page='Nastavitve';state.settings='sources';state.flagged=true;state.limit=50;}
      else if(act==='pr-check'){prCheckSheet();return;}
      else if(act==='source-more')state.limit+=50;
      else if(act==='strength-back'){state.strength='';state.point=-1;}
      else if(act==='strength-prev'||act==='strength-next'){const series=compactStrengthSeriesV26(sessions(),state.strength);state.point=compactStrengthNavV30(series,state.point,act==='strength-next'?'next':'prev');}
      else if(act==='strength-history'){const point=compactStrengthSeriesV26(sessions(),state.strength).find(p=>p.si===state.point);if(point){selectDate(point.date);state.session=point.si;const si=sessions()[point.si];state.exercise=String(si.exercises.findIndex(e=>compactNameV26(e.name)===state.strength));state.progress='Zgodovina';state.flagged=false;}}
      else if(act==='weight-add'||act==='weight-edit'){editWeight(b.dataset.dateKey);return;}
      else if(act==='meas-add'||act==='meas-edit'){editMeas(b.dataset.dateKey);return;}
      else if(act==='program'){state.page='Program';state.settings='';}
      else if(['equipment','history','backup','phase','advanced'].includes(act)){state.page='Nastavitve';state.settings=act;state.flagged=false;}
      else if(act==='update')await window.WTAndroidUpdates.check();
      else if(act==='diagnostics')await copyDiagnosticsV18();
      else if(act==='draft-restore'){guardProgram();await restorePreviousDayDraftV18();}
      else if(act==='tm-advance'||act==='tm-reset'){guardProgram();await (act==='tm-advance'?advance531Cycle():reset531Cycle());}
      else if(act==='cycle-new'){guardProgram();const current=getCyc(),completedWeeks=PROG.weeks.filter((_,i)=>weekOverview(i).status==='done').length;const warning=completedWeeks<PROG.weeks.length?`V ciklu ${current.num} je v celoti opravljenih ${completedWeeks}/${PROG.weeks.length} tednov. `:'';if(!await ask(warning+`Začnem cikel ${Number(current.num)+1}, teden 1? Stare serije in zgodovina ostanejo shranjene. Training max se ne spremeni.`,'Začni cikel'))return;guardProgram();await autoBackupToIDB();guardProgram();const cycle=getCyc(),next=Number(cycle.num)+1;commitStorageBatch([[LS.cycle,JSON.stringify({...cycle,num:next,startDates:{...cycle.startDates,[next]:dateKey(new Date())}})]]);setWeek(0);showDay(activeDayIndicesV6()[0]??0);state.day=cd;state.page='Trening';state.focus=false;setGymMode(false);state.active='';state.openRow='';state.cycleMenu=false;draft.clear();notify('Cikel '+next+' je pripravljen.');}
      else if(act==='settings-back'){state.settings='';}
      else if(act==='phase-start'){guardProgram();const expected=JSON.stringify(getPhases());sheet('Začetek trenutne faze',`<p class="cg-small">${getActiveProfile()==='bulk'?'Bulk':'Cut'} · stare meritve ostanejo shranjene.</p><label>Datum začetka<input name="start" type="date" value="${dateKey(new Date())}" required></label>`,data=>{guardProgram();const phases=getPhases();if(JSON.stringify(phases)!==expected)throw Error('Faze so se spremenile.');const start=data.get('start');phases.forEach(p=>{if(!p.end)p.end=start;});phases.push({type:getActiveProfile(),start,end:null});commitStorageBatch([['wt_phases',JSON.stringify(phases)]]);notify('Začetek faze shranjen.');});return;}
      else if(act==='phase-date'){guardProgram();const phases=getPhases(),expected=JSON.stringify(phases),p=phases[index];sheet('Začetek in konec faze',`<label>Začetek<input name="start" type="date" value="${esc(p.start)}" required></label><label>Konec (prazno = aktivna)<input name="end" type="date" value="${esc(p.end||'')}"></label>`,data=>{guardProgram();if(JSON.stringify(getPhases())!==expected)throw Error('Faze so se spremenile.');const start=data.get('start'),end=data.get('end');if(end&&end<start)throw Error('Konec ne more biti pred začetkom.');phases[index]={...p,start,end:end||null};commitStorageBatch([['wt_phases',JSON.stringify(phases)]]);notify('Datumi faze shranjeni.');});return;}
      else if(act==='tm'){const tms=get531TMs();sheet('5/3/1 · Training max',`<p class="cg-small">Osnovni TM. Obstoječi zamik ciklov ostane ohranjen.</p>${['bench','squat','deadlift','ohp'].map(l=>`<label>${l}<input type="number" name="${l}" value="${tms[l]||''}" min="1" max="500" step="any"></label>`).join('')}`,data=>{guardProgram();const next={...get531TMs()};for(const l of ['bench','squat','deadlift','ohp']){const v=data.get(l);if(v)next[l]=Number(v);else delete next[l];}if(!safeSetRaw('wt_531tm',JSON.stringify(next)))throw Error('TM ni shranjen.');notify('Osnovni TM shranjen.');});return;}
      else if(act==='export')await exportData();
      else if(act==='import')importData();
      else if(act==='snapshot'){const ok=await autoBackupToIDB();notify(ok?'Lokalna kopija shranjena.':'Lokalna kopija ni uspela.',!ok);}
      else if(act==='backup-download')await downloadBackupFromIDB(index);
      render();
    }catch(error){notify(error.message,true);}
  }
  function bind(){
    root.addEventListener('click',click);
    message.addEventListener('click',()=>{if(message.classList.contains('cg-message-error')){message.textContent='';message.classList.remove('cg-message-error');clearTimeout(message._timer);}});
    root.addEventListener('input',event=>{const el=event.target,e=activeExercise();if(el.dataset.field&&e){const values=valuesFor(e);draft.set(e.key,{...values,[el.dataset.field]:el.value});updatePlates();}});
    root.addEventListener('change',event=>{const el=event.target,e=activeExercise();try{
      if(el.hasAttribute('data-plan-index')){if(!el.reportValidity())return;const index=Number(el.dataset.planIndex),row=e.rows[index]||{};savePlanAction(e,{type:'edit',values:[{index,kg:el.dataset.planField==='kg'?el.value:row.kg??'',reps:el.dataset.planField==='reps'?el.value:row.reps??''}]},false);workoutCache=currentRows();const next=valuesFor(activeExercise());for(const field of ['kg','reps','rpe']){const input=$(`[data-field="${field}"]`);if(input)input.value=next[field]??'';}updatePlates();return;}
      if(el.hasAttribute('data-history-date'))selectDate(el.value);
      if(el.hasAttribute('data-history-exercise'))state.exercise=el.value;
      if(el.hasAttribute('data-flagged')){state.flagged=el.checked;state.limit=50;}
      if(el.name==='barKind'){const bar=$('[name="bar"]');bar.readOnly=el.value!=='custom';if(el.value!=='custom')bar.value=el.value;return;}
      if(el.closest('dialog')||el.closest('[data-equipment-form]')||el.hasAttribute('data-field'))return;
      render();
    }catch(error){notify(error.message,true);}});
    root.addEventListener('submit',async event=>{
      const form=event.target;if(form.closest('dialog'))return;event.preventDefault();if(!form.reportValidity())return;
      try{
        if(form.hasAttribute('data-log-form')){if(busy)return;const e=activeExercise(),v=valuesFor(e);busy=true;form.querySelector('[type="submit"]').disabled=true;let started=false;try{
          // Confirming a set starts the workout first, so the set always belongs to a saved session. Values are read before starting.
          if(!stRun){if(window.v6RecoveryPending){showRecovery();return;}if(localStorage.getItem(LS_SESS))throw Error('Najprej obnovi ali zaključi shranjen trening.');await toggleSess();if(!stRun)throw Error('Trening se ni začel. Serija ni zabeležena.');started=true;state.openRow=e.key;state.active=e.key;}
          const ok=await window.WTFocusPatchV10.logValues(e.key,{kg:v.kg,reps:v.reps,rpe:v.rpe},v.index);if(ok){draft.delete(e.key);notify(started?'Trening začet · serija zabeležena.':'Serija zabeležena.');}else notify('Serija ni shranjena. Preveri vnos.',true);}finally{busy=false;}render();}
        if(form.hasAttribute('data-source-search')){state.query=new FormData(form).get('query').trim();state.limit=50;render();}
        if(form.hasAttribute('data-advanced-form')){const data=new FormData(form),alarm={...getAlarmSettings()},rules={...getV6Settings()};for(const k of ['sound','vibrate','notif'])alarm[k]=data.has(k);alarm.volume=Number(data.get('volume'));alarm.melody=data.get('melody');for(const k of ['progression','smartRest','restWarning'])rules[k]=data.has(k);for(const k of ['rpeUp','rpeDown','painStop'])rules[k]=Number(data.get(k));rules.completionUp=100;commitStorageBatch([['wt_alarm6',JSON.stringify(alarm)],[V6_KEYS.settings,JSON.stringify(rules)]]);initAlarmUI();renderV6Settings();notify('Nastavitve shranjene.');render();}
        if(form.hasAttribute('data-equipment-form')){const data=new FormData(form),plates=data.getAll('plate').map(Number);if(!plates.length)throw Error('Označi vsaj eno razpoložljivo ploščo.');const gym={...getGym(),bar:Number(data.get('bar')),plates};commitStorageBatch([[LS.gym,JSON.stringify(gym)],['wt_collars_kg',String(Number(data.get('collars')))],[V6_KEYS.settings,JSON.stringify({...getV6Settings(),plateCalculator:data.has('show')})]]);notify('Oprema shranjena.');render();}
      }catch(error){busy=false;notify(error.message,true);}
    });
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeSheet();});
  }
  function tick(){
    if(!root?.isConnected)return;$$('[data-session-clock]').forEach(el=>el.textContent=clock(stRun?(Date.now()-stStart)/1000:0));
    const host=$('.cg-rest-host');if(host){const t=currentTimerV6(),signature=t?`${t.id}|${t.paused}`:'';if(host.dataset.timer!==signature){host.dataset.timer=signature;host.innerHTML=restBar();}const left=t?(t.paused?t.remainingSec:Math.max(0,Math.ceil((t.endTs-Date.now())/1000))):0;
      const step=restNotifyStep(t,left,restActiveId,restNotifiedId);restActiveId=step.activeId;restNotifiedId=step.notifiedId;if(step.fire)notify('Počitek končan.');
      if(!left)host.innerHTML='';else host.querySelector('[data-rest-clock]')?.replaceChildren(clock(left));}
    setSaveState(storageHasPendingWrites()?'error':'ok');
  }
  function setSaveState(state){
    const btn=$('[data-save-state]');if(!btn)return;
    if(btn.dataset.saveState===state)return;
    btn.dataset.saveState=state;
    const text=$('[data-save-text]');if(text)text.textContent=state==='saving'?'Shranjujem…':state==='error'?'Ni shranjeno':'Shranjeno';
  }
  function showRecovery(){
    if(!window.v6RecoveryPending)return;
    document.getElementById('v6-recovery-pop')?.classList.remove('on');
    const context=v6RecoveryContext;
    sheet('Nedokončan trening',`<p class="cg-small">${esc(context?`${DAY_NAMES[context.dayIdx]||'Trening'} · ${new Date(context.startISO).toLocaleString('sl-SI')}`:'Najden je shranjen aktivni trening.')}<br>Zabeležene serije so shranjene.</p><div class="cg-sheet-actions">${button('recovery-discard','Opusti trening','cg-quiet')}${button('recovery-resume','Nadaljuj','cg-action')}</div>`,()=>{},'Pozneje');
  }
  async function initialize(){
    const host=document.createElement('div');host.id='wt-compact-host';const shadow=host.attachShadow({mode:'open'});document.body.prepend(host);
    const ready=['css/compact-reference.css','css/compact-shell.css','css/compact-v4.css'].map(path=>new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href=new URL(path,document.baseURI);link.onload=resolve;link.onerror=()=>reject(Error('Slog novega vmesnika se ni naložil.'));shadow.append(link);}));
    const flameSvg=`<svg viewBox="0 0 24 24" aria-hidden="true" class="cg-flame"><path fill="#ff7a1a" d="M12 2c.6 3.4 3.2 5 4.6 7.6a7 7 0 1 1-11.4 5.9C5.2 12.6 8.9 11.3 9.4 7c1.3.9 2.1 2.2 2.4 3.7C12.9 9.2 12.3 5.6 12 2z"/><path fill="#ffd08a" d="M12.2 12.2c.9 1.6 2.6 2.4 2.6 4.3A2.8 2.8 0 0 1 9.2 17c0-1.6 1.5-2.3 1.7-4 .6.5 1 1.2 1.3-.8z"/></svg>`;
    const app=document.createElement('div');app.id='cg-app';app.innerHTML=`<div class="cg-shell"><header class="cg-header"><div class="cg-brand">${flameSvg}<span>WORKOUT</span></div>${button('storage-retry','<i class="cg-save-dot" aria-hidden="true"></i><span data-save-text>Shranjeno</span>','cg-savebtn','data-save-state="ok" aria-live="polite"')}</header><div class="cg-message" role="status" aria-live="polite"></div><main class="cg-main"></main><nav class="cg-nav" aria-label="Glavna navigacija"></nav><dialog aria-label="Urejanje"></dialog></div>`;shadow.append(app);root=app;main=$('.cg-main');nav=$('.cg-nav');header=$('.cg-header');message=$('.cg-message');dialog=$('dialog');
    try{await Promise.all(ready);}catch(error){host.remove();toast(error.message,'err');return;}
    document.documentElement.classList.add('compact-shell-v27');state.focus=getGymMode();state.day=cd;state.active=localStorage.getItem('wt_active_ex')||'';
    // Legacy settings nodes remain hidden for the existing data integrations.
    bind();
    const originalToast=window.toast;window.toast=function(text,kind){originalToast.apply(this,arguments);notify(text,kind==='err');};
    const originalMarkSave=window.markSaveStateV15;window.markSaveStateV15=function(state){if(typeof originalMarkSave==='function')originalMarkSave.apply(this,arguments);setSaveState(state==='saved'?'ok':state==='saving'?'saving':'error');};
    setSaveState(storageHasPendingWrites()?'error':'ok');
    window.uiConfirm=ask;window.uiPrompt=(text,value='')=>new Promise(resolve=>sheet('Vnos',`<label>${esc(text)}<input name="value" value="${esc(value??'')}"></label>`,data=>resolve(data.get('value')),'Shrani',()=>resolve(null)));
    window.chooseImportMode=summary=>new Promise(resolve=>sheet('Obnovi varnostno kopijo',`<p class="cg-small" style="white-space:pre-wrap">${esc(summary)}</p><label>Način obnove<select name="mode"><option value="merge">Združi · obdrži trenutne ob konfliktu</option><option value="replace">Zamenjaj vse z varnostno kopijo</option></select></label>`,data=>resolve(data.get('mode')),'Obnovi',()=>resolve(null)));
    window.maybeShowOnboarding=()=>{document.getElementById('onboarding-pop')?.classList.remove('on');if(localStorage.getItem('wt_onboarding_done'))return;
      const choice=(p,label,sub)=>`<button type="button" class="cg-choice" data-onboard="${p}"><strong>${label}</strong><small>${sub}</small></button>`;
      sheet('Dobrodošel',`<p class="cg-small">Izberi fazo telesne sestave. Vaje in zgodovina ostanejo tvoje tudi ob poznejšem preklopu.</p><div class="cg-choice-grid">${choice('cut','Cut','Ohranjanje moči · manj utrujenosti')}${choice('bulk','Bulk','Rast mišic · več delovnih serij')}</div>`,()=>{},'Pozneje',undefined,true);};
    const originalDay=window.showDay;window.showDay=function(){const result=originalDay.apply(this,arguments);queue();return result;};
    const originalPage=window.showPage;window.showPage=function(p){const result=originalPage.apply(this,arguments);if(p==='workout')state.page='Trening';else if(p==='program')state.page='Program';else if(p==='tools')state.page='Nastavitve';else if(['gymlog','bodyweight','stats'].includes(p)){state.page='Napredek';state.progress={gymlog:'Zgodovina',bodyweight:'Teža',stats:'Moč'}[p];}queue();return result;};
    const originalOnboarding=window.finishOnboarding;window.finishOnboarding=function(){const result=originalOnboarding.apply(this,arguments);if(!getPhases().length)commitStorageBatch([['wt_phases',JSON.stringify([{type:getActiveProfile(),start:dateKey(new Date()),end:null}])]]);queue();return result;};
    const originalRestore=window.restoreSession;window.restoreSession=function(){const result=originalRestore.apply(this,arguments);showRecovery();return result;};
    document.addEventListener('visibilitychange',tick);setInterval(tick,500);render();if(window.v6RecoveryPending)showRecovery();else maybeShowOnboarding();
    window.WTCompactShellV27={refresh:render,shadowRoot:shadow};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
