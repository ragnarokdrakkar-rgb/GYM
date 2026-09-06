/* Backup schema and restore planning. Pure validation precedes every mutation. */
function validateBackupV18(backup){
  const obj=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
  const bad=msg=>({ok:false,msg});
  const numeric=(value,min,max,integer=false)=>{
    if(value===undefined||value===null||value==='')return true;
    if(!['string','number'].includes(typeof value)||typeof value==='string'&&!value.trim())return false;
    const number=Number(value);
    return Number.isFinite(number)&&number>=min&&number<=max&&(!integer||Number.isInteger(number));
  };
  if(!obj(backup)||!obj(backup.sets))return bad('Backup mora biti objekt z veljavnimi sets podatki.');
  const version=Number(backup.schemaVersion??backup.version??1);
  if(!Number.isInteger(version)||version<1||version>7)return bad('Nepodprta shema backupa.');
  let count=0;
  function validateRows(rows){
    if(!Array.isArray(rows)||(count+=rows.length)>250000)return false;
    return rows.every(s=>obj(s)&&numeric(s.kg,0,1500)&&numeric(s.reps,0,1000,true)&&numeric(s.rpe,0,10)&&(s.done===undefined||typeof s.done==='boolean'));
  }
  for(const [key,rows] of Object.entries(backup.sets)){
    if(!/^c\d+w\d+d\d+e\d+$/.test(key)||!validateRows(rows))return bad('Neveljaven ključ ali vrednosti seta: '+key);
  }
  if(backup.sessions!==undefined){
    if(!Array.isArray(backup.sessions)||backup.sessions.length>100000)return bad('Neveljavna zgodovina treningov.');
    for(const session of backup.sessions){
      if(!obj(session)||!numeric(session.durationMin,0,100000)||session.exercises!==undefined&&!Array.isArray(session.exercises))return bad('Neveljaven zapis treninga.');
      for(const exercise of session.exercises||[]){
        if(!obj(exercise)||!validateRows(exercise.sets||[])||!numeric(exercise.targetSets,0,100,true))return bad('Neveljavni seti v zgodovini.');
      }
    }
  }
  for(const key of ['pr','notes','bw','meas','gym','pain','cynotes','restplan','setcounts','swaps','extra_ex','hidden_ex','ex_ordernames','rep_prs','daylog','colors','custom_rest','tm531','v6settings','platePrefsV13']){
    if(backup[key]!==undefined&&backup[key]!==null&&!obj(backup[key]))return bad('Polje '+key+' mora biti objekt.');
  }
  // renderCycle writes an array; older backups use {} when no suggestions exist.
  // Preserve both representations unchanged during validation and restoration.
  if(backup.sugs!==undefined&&backup.sugs!==null){
    const suggestions=backup.sugs;
    if(Array.isArray(suggestions)){
      if(suggestions.length>100000||suggestions.some(item=>!obj(item)))return bad('Neveljaven seznam predlogov cikla.');
    }else if(!obj(suggestions))return bad('Predlogi cikla morajo biti seznam ali objekt.');
  }
  for(const key of ['phases','goals','custom_ex','restLog','photos']){
    if(backup[key]!==undefined&&!Array.isArray(backup[key]))return bad('Polje '+key+' mora biti seznam.');
  }
  if(backup.cycle!==undefined&&(!obj(backup.cycle)||!numeric(backup.cycle.num,1,100000,true)))return bad('Neveljaven cikel.');
  const phase=backup.phase?.active??backup.profile;
  if(phase!==undefined&&!['cut','bulk','maintain'].includes(phase))return bad('Neveljavna faza.');
  if(backup.daylists!==undefined){
    if(!obj(backup.daylists))return bad('Neveljaven program.');
    for(const roster of Object.values(backup.daylists)){
      if(roster===null)continue;
      if(!obj(roster))return bad('Seznam dni mora biti objekt.');
      for(const [day,items] of Object.entries(roster)){
        if(!/^\d+$/.test(day)||Number(day)>99||!Array.isArray(items)||items.length>100)return bad('Neveljaven dan programa.');
        for(const e of items){
          if(!obj(e)||typeof (e.n0??e.n)!=='string'||!(e.n0??e.n).trim()||!numeric(e.targetSets,0,100,true)||!numeric(e.increment,0,100)||e.sw!==undefined&&!Array.isArray(e.sw))return bad('Neveljavna vaja v programu.');
        }
      }
    }
  }
  if(backup.programMeta!==undefined){
    if(!obj(backup.programMeta))return bad('Neveljavne nastavitve programa.');
    for(const meta of Object.values(backup.programMeta)){
      if(meta===null)continue;
      if(!obj(meta)||!Array.isArray(meta.days)||meta.days.length>100||meta.days.some(d=>!obj(d)))return bad('Neveljavni dnevi programa.');
    }
  }
  const checkKeys=(value,depth=0)=>{
    if(depth>40)return false;
    if(!value||typeof value!=='object')return true;
    return Object.entries(value).every(([key,v])=>!['__proto__','prototype','constructor'].includes(key)&&checkKeys(v,depth+1));
  };
  if(!checkKeys(backup))return bad('Backup vsebuje nedovoljene ključe.');
  return {ok:true,msg:'Shema, program in številske vrednosti so veljavni.'};
}

function buildRestorePlanV18(backup,mode='replace'){
  const checked=validateBackupV18(backup);if(!checked.ok)throw new Error(checked.msg);
  if(!['replace','merge'].includes(mode))throw new Error('Neveljaven način obnove.');
  const merge=mode==='merge',plan=new Map();
  const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'{}');}catch{return {};}};
  const put=(key,value,mergeObject=false)=>{
    if(value===undefined||value===null)return;
    if(merge&&mergeObject)value={...value,...read(key)}; // Existing conflicts win, never silently overwrite current work.
    plan.set(key,typeof value==='string'?value:JSON.stringify(value));
  };
  const managed=[...MANAGED_LOCAL_KEYS,...Object.values(V6_KEYS),'wt_plate_calc_exercises_v13','wt_active_sess','wt_last_week','wt_last_day','wt_session_draft_v6','wt_undo_v15','wt_previous_day_draft_v18'];
  if(!merge)managed.forEach(key=>plan.set(key,null));
  const maps={sets:LS.sets,pr:LS.pr,notes:LS.notes,bw:LS.bw,meas:LS.meas,gym:LS.gym,pain:LS.pain,cynotes:LS.cynotes,restplan:LS.restplan,setcounts:LS.setcounts,swaps:'wt_exswap',extra_ex:'wt_extra_ex',hidden_ex:'wt_hidden_ex',ex_ordernames:'wt_ex_ordernames',rep_prs:'wt_rep_prs',daylog:'wt_daylog',custom_rest:'wt_custom_rest',platePrefsV13:'wt_plate_calc_exercises_v13'};
  Object.entries(maps).forEach(([field,key])=>put(key,backup[field],true));
  put(LS.sessions,merge?mergeSessions(backup.sessions||[],getSessions()):backup.sessions||[]);
  if(backup.cycle){const current=getCyc();put(LS.cycle,merge?{...current,num:Math.max(current.num||1,backup.cycle.num||1),startDates:{...backup.cycle.startDates,...current.startDates}}:backup.cycle);}
  // Merge imports history; the current training program, phase and preferences stay authoritative.
  if(!merge){
    for(const [field,key] of Object.entries({bwgoal:'wt_bwgoal',alarm:'wt_alarm6',collars:'wt_collars_kg',phases:'wt_phases',tm531:'wt_531tm',offset531:'wt_531offset',goals:'wt_goals',custom_ex:CUST_KEY,kg_step:'wt_kg_step',reps_step:'wt_reps_step',sugs:'wt_sugs6',colors:'wt_colors',v6settings:V6_KEYS.settings,lastExternal:V6_KEYS.lastExternal}))put(key,backup[field]);
    put('wt_profile',backup.phase?.active||backup.profile||'cut');
    for(const phase of ['cut','bulk','shared'])if(backup.daylists?.[phase])put(phase==='shared'?'wt_daylist_shared_v16':'wt_daylist_'+phase,backup.daylists[phase]);
    put(V6_KEYS.metaShared,backup.programMeta?.shared||backup.programMeta?.cut||backup.programMeta?.bulk);
    put(V6_KEYS.restLog,backup.restLog||[]);
    let theme=backup.theme;if(theme==='"dark"'||theme==='"light"')theme=JSON.parse(theme);
    if(theme==='dark'||theme==='light')put(LS.theme,theme);
    if(backup.compact!==undefined)put('wt_compact',backup.compact?'1':'0');
    if(backup.gym_mode!==undefined)put('wt_gym_mode',backup.gym_mode?'1':'0');
    put('wt_last_week','0');put('wt_last_day','0');
  }else if(Array.isArray(backup.restLog)){
    const map=new Map();[...backup.restLog,...getRestLogV6()].forEach(r=>map.set(r.id||JSON.stringify(r),r));
    put(V6_KEYS.restLog,[...map.values()]);
  }
  return plan;
}
