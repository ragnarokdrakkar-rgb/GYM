// Get extra sets for an exercise key
function getExtraSets(exKey){const sc=getSetCounts();return sc[exKey]||0;}
function setExtraSets(exKey,val){const sc=getSetCounts();sc[exKey]=val;saveSetCounts(sc);}

function nsf(di,ei,wk,exKey){
  if(!PROG.days[di]||!PROG.days[di].ex[ei])return Math.max(1,4+getExtraSets(exKey));
  const base=wk.dl?3:(PROG.days[di].ex[ei].m?wk.sM:wk.sA);
  return Math.max(1,base+getExtraSets(exKey));
}

function sdk(c,w,d,e){return `c${c}w${w}d${d}e${e}`;}
function getPeakForExercise(cn,di,ei){
  const all=getSets();let peak=0;
  for(let w=0;w<4;w++){const key=sdk(cn,w,di,ei);if(all[key]){const sets=all[key].filter(s=>s.kg&&s.reps);if(sets.length>0)peak=Math.max(peak,...sets.map(s=>parseFloat(s.kg)||0));}}
  return peak;
}
function getWeek1Weight(cn,di,ei){
  const all=getSets(),key=sdk(cn,0,di,ei);
  if(!all[key])return 0;
  const sets=all[key].filter(s=>s.kg&&s.reps);
  return sets.length===0?0:Math.max(...sets.map(s=>parseFloat(s.kg)||0));
}
function allDone(di,ei){
  const wk=PROG.weeks[cw],exKey=sdk(getCyc().num,cw,di,ei),n=nsf(di,ei,wk,exKey),key=exKey;
  const all=getSets();if(!all[key])return false;
  return all[key].slice(0,n).every(s=>s.done);
}

// Ali so v danem dnevu (cikel cn, teden w) vse VIDNE vaje dokončane? (vsaj 1 vaja z done)
// Zgradi seznam vaj dneva ENAKO kot showDay (dedup + vrstni red + extras) — brez mutacije
// Dedupe po PRIKAZANEM imenu (upošteva zamenjave) — base ima prednost pred extra (base so prvi v seznamu)
function dedupeByDisplayName(list,di,c,w){
  const refKey=sdk(c,w,di,0); // swap lookup uporablja samo dan+ime (ne pozicije), zato je e0 dovolj
  const seen=new Set();
  return list.filter(e=>{
    const disp=getSwappedName(refKey,e.n,e.extra);
    const k=(disp||'').toLowerCase();
    if(seen.has(k))return false;
    seen.add(k);
    return true;
  });
}
// ====== V16 JEDRO: EN SKUPEN SEZNAM VAJ, NEODVISEN OD CUT/BULK FAZE ======
const SHARED_DAYLIST_KEY_V16='wt_daylist_shared_v16';
const DAYLIST_MIGRATION_KEY_V16='wt_daylist_migration_v16';
function _dlKey(){return SHARED_DAYLIST_KEY_V16;}
function _newExId(n){const slug=(n||'ex').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,24);return slug+'-'+Math.random().toString(36).slice(2,7);}
function parseDayListsV16(key){try{const value=JSON.parse(localStorage.getItem(key)||'null');return value&&typeof value==='object'&&!Array.isArray(value)?value:null;}catch{return null;}}
function dayListCustomizationScoreV16(all,template){
  if(!all)return -1;
  let score=0;
  const days=template?.days||[];
  Object.keys(all).forEach(k=>{
    const di=Number(k),list=Array.isArray(all[k])?all[k]:[],base=days[di]?.ex||[];
    score+=Math.abs(list.length-base.length)*3;
    list.forEach((item,i)=>{
      if(String(item?.n0||item?.n||'')!==String(base[i]?.n||''))score+=2;
      if(item?.extra||item?.programDisabled||item?.targetSets||item?.targetReps||item?.targetRpe||item?.progMode&&item.progMode!=='auto'||Array.isArray(item?.sw)&&item.sw.length)score+=2;
    });
  });
  return score;
}
function dayListSetAlignmentScoreV16(all){
  if(!all)return -1;
  let score=0,sets={};
  try{sets=JSON.parse(localStorage.getItem('wt_s6')||'{}');}catch(e){}
  Object.entries(sets).forEach(([key,rows])=>{
    const match=key.match(/^c\d+w\d+d(\d+)e(\d+)$/);if(!match||!Array.isArray(rows))return;
    const item=all[Number(match[1])]?.[Number(match[2])];if(!item)return;
    const names=new Set([item.n0,item.n,...(Array.isArray(item.sw)?item.sw.map(s=>s?.n):[])].filter(Boolean).map(n=>String(n).toLowerCase()));
    rows.forEach(row=>{if(!row?.exName)return;score+=names.has(String(row.exName).toLowerCase())?3:-2;});
  });
  return score;
}
function migrateSharedDayListsV16(){
  const shared=parseDayListsV16(SHARED_DAYLIST_KEY_V16);if(shared)return shared;
  const cut=parseDayListsV16('wt_daylist_cut'),bulk=parseDayListsV16('wt_daylist_bulk');
  if(!cut&&!bulk)return null;
  const cutScore=dayListCustomizationScoreV16(cut,PROG_CUT);
  const bulkScore=dayListCustomizationScoreV16(bulk,PROG_BULK);
  const cutAlignment=dayListSetAlignmentScoreV16(cut),bulkAlignment=dayListSetAlignmentScoreV16(bulk);
  // Ob izenačenju ima Cut prednost: stare izdaje so Bulk pogosto samodejno
  // napolnile z BBB vajami, čeprav jih uporabnik ni izbral.
  const source=bulk&&(bulkAlignment>cutAlignment||(bulkAlignment===cutAlignment&&bulkScore>cutScore))?'bulk':'cut';
  const selected=source==='bulk'?bulk:(cut||bulk);
  if(!selected)return null;
  safeSetRaw(SHARED_DAYLIST_KEY_V16,JSON.stringify(selected));
  safeSetRaw(DAYLIST_MIGRATION_KEY_V16,JSON.stringify({version:1,date:new Date().toISOString(),source,cutScore,bulkScore,cutAlignment,bulkAlignment,legacyPreserved:true}));
  return selected;
}
function getDayLists(){return parseDayListsV16(_dlKey())||migrateSharedDayListsV16();}
function saveDayLists(all){return safeSetRaw(_dlKey(),JSON.stringify(all));}
// Prikazano ime vaje za (cikel,teden) — upošteva zgodovino preimenovanj (sw: [{n,c,w},...])
function dispNameForItem(it,c,w){
  let n=it.n0;
  if(Array.isArray(it.sw)){for(const s of it.sw){if(c>s.c||(c===s.c&&w>=s.w))n=s.n;}}
  return n;
}
// Seznam za prikaz: item + n=prikazano ime za trenutni teden
function getDayList(di){
  const all=getDayLists();
  const arr=(all&&all[di])?all[di]:null;
  if(!arr)return null;
  const c=getCyc().num;
  return arr.map(it=>({...it,n:dispNameForItem(it,c,cw)}));
}
// Seznam za POLJUBEN (cikel,teden) — za DataEditor in preglede preteklih tednov
function dayListFor(di,c,w){
  const all=getDayLists();
  const arr=all&&all[di];
  if(arr)return arr.map(it=>({...it,n:dispNameForItem(it,c,w)}));
  // legacy fallback
  const d=PROG.days[di];if(!d)return [];
  if(d._origEx===undefined)d._origEx=d.ex.slice();
  const origs=(d._origEx||d.ex).map(e=>({...e,extra:false}));
  const extras=getExtraExercises(di).map(e=>({...e,extra:true}));
  let mixed=applyExOrderByName(di,[...origs,...extras]);
  return dedupeByDisplayName(mixed,di,c,w);
}
// ENKRATNA migracija iz starih plasti (program+extras+vrstni red+zamenjave) v en seznam
function ensureDayLists(){
  if(getDayLists())return;
  const all={};
  const c=getCyc().num;
  const swaps=getExSwaps();
  for(let di=0;di<PROG.days.length;di++){
    const d=PROG.days[di];if(!d){all[di]=[];continue;}
    if(d._origEx===undefined)d._origEx=d.ex.slice();
    const origs=(d._origEx||[]).map(e=>({...e,extra:false}));
    const extras=getExtraExercises(di).map(e=>({...e,extra:true}));
    let mixed=[...origs,...extras];
    mixed=dedupeByDisplayName(mixed,di,c,cw);
    mixed=applyExOrderByName(di,mixed);
    all[di]=mixed.map(e=>{
      const it={id:_newExId(e.n),n0:e.n,m:!!e.m,r:e.r||90,rl:e.rl||'90s',d:e.d||'',tip:e.tip||'',extra:!!e.extra,progMode:e.progMode||'auto'};
      if(e.targetSets)it.targetSets=e.targetSets;if(e.targetReps)it.targetReps=e.targetReps;if(e.targetRpe)it.targetRpe=e.targetRpe;
      if(e.fl){it.progMode='531';it.lift531=e.fl;}
      const sw=swaps['d'+di+'|'+e.n];
      if(sw)it.sw=[typeof sw==='string'?{n:sw,c:1,w:0}:sw];
      return it;
    });
  }
  saveDayLists(all);
  // Počisti duhove: pozicijski ključi za dolžino seznama (nedosegljivi) — vsi cikli/tedni
  try{
    const allSets=getSets(),sc=getSetCounts(),hid=getHiddenEx(),pain=getPainData();let ch=false;
    for(let di=0;di<PROG.days.length;di++){
      const len=(all[di]||[]).length;
      for(let cc=1;cc<=c;cc++)for(let w=0;w<4;w++)for(let i=len;i<len+25;i++){
        const k=sdk(cc,w,di,i);
        if(allSets[k]!==undefined){delete allSets[k];ch=true;}
        if(sc[k]!==undefined){delete sc[k];ch=true;}
        if(hid[k]!==undefined){delete hid[k];ch=true;}
        if(pain[k]!==undefined){delete pain[k];ch=true;}
      }
    }
    if(ch){saveSets(allSets);saveSetCounts(sc);saveHiddenEx(hid);savePainData(pain);}
  }catch(e){}
  // Stare plasti so vgrajene v seznam — odstrani (da ne ustvarjajo duhov)
  localStorage.removeItem('wt_extra_ex');
  localStorage.removeItem('wt_ex_ordernames');
  localStorage.removeItem('wt_exswap');
}
// CENTRALNA PORAVNAVA: ob VSAKI spremembi seznama preslika pozicijske podatke (seti,
// dodatne serije, skrite oznake, bolečina, PR-ji) iz starega vrstnega reda ID-jev v novega.
// Deluje za poljubno permutacijo, vstavljanje in brisanje — brez izjem, brez duhov.
function reconcilePositions(di,oldIds,newIds){
  const cyc=getCyc();
  const allSets=getSets(),sc=getSetCounts(),hid=getHiddenEx(),pain=getPainData();
  for(let c=1;c<=cyc.num;c++){
    for(let w=0;w<4;w++){
      const bag={};
      oldIds.forEach((id,i)=>{const k=sdk(c,w,di,i);bag[id]={s:allSets[k],c:sc[k],h:hid[k],p:pain[k]};delete allSets[k];delete sc[k];delete hid[k];delete pain[k];});
      newIds.forEach((id,i)=>{const k=sdk(c,w,di,i);const b=bag[id];if(!b)return;
        if(b.s!==undefined)allSets[k]=b.s;
        if(b.c!==undefined)sc[k]=b.c;
        if(b.h!==undefined)hid[k]=b.h;
        if(b.p!==undefined)pain[k]=b.p;});
    }
  }
  saveSets(allSets);saveSetCounts(sc);saveHiddenEx(hid);savePainData(pain);
  const prs=getPRs();const pb={};
  oldIds.forEach((id,i)=>{const k='pr'+di+i;pb[id]=prs[k];delete prs[k];});
  newIds.forEach((id,i)=>{const k='pr'+di+i;if(pb[id]!==undefined)prs[k]=pb[id];});
  savePRs(prs);
}
// Edina pot za spremembo seznama: mutiraj + shrani + poravnaj podatke
function mutateDayList(di,fn){
  const all=getDayLists()||{};
  const arr=all[di]||[];
  const oldIds=arr.map(x=>x.id);
  fn(arr);
  all[di]=arr;
  saveDayLists(all);
  reconcilePositions(di,oldIds,arr.map(x=>x.id));
}
function buildDayExList(di){
  const L=getDayList(di);
  if(L)return L;
  // fallback (pred migracijo)
  const d=PROG.days[di];
  if(!d)return [];
  if(d._origEx===undefined)d._origEx=d.ex.slice();
  const origs=(d._origEx||d.ex).map(e=>({...e,extra:false}));
  const extras=getExtraExercises(di).map(e=>({...e,extra:true}));
  let mixed=[...origs,...extras];
  mixed=dedupeByDisplayName(mixed,di,getCyc().num,cw);
  mixed=applyExOrderByName(di,mixed);
  return mixed;
}

function isDayComplete(cn,w,di){
  const list=buildDayExList(di);
  if(list.length===0)return false;
  const all=getSets();
  const wk=PROG.weeks[w]||PROG.weeks[cw];
  let anyDone=false;
  for(let ei=0;ei<list.length;ei++){
    const k=sdk(cn,w,di,ei);
    if(getHiddenEx()[k])continue; // skrite ne štejejo
    const sets=all[k];
    if(!sets||sets.length===0)return false;
    // pričakovano št. serij — iz dejanske vaje na tej poziciji (ne iz mutiranega d.ex)
    const base=wk.dl?3:(list[ei].m?wk.sM:wk.sA);
    const n=Math.max(1,base+getExtraSets(k));
    const slice=sets.slice(0,n);
    if(slice.length===0||!slice.every(s=>s.done))return false;
    anyDone=true;
  }
  return anyDone;
}
// Ali so vsi dnevi tedna dokončani?
function isWeekComplete(cn,w){
  for(let di=0;di<PROG.days.length;di++){if(!isDayComplete(cn,w,di))return false;}
  return true;
}
// Posodobi barve tabov (zeleno = dokončano)
function updateTabColors(){
  const cn=getCyc().num;
  document.querySelectorAll('.wt').forEach((t,w)=>{
    t.classList.toggle('done',isWeekComplete(cn,w));
  });
  document.querySelectorAll('.dt').forEach((t,di)=>{
    t.classList.toggle('done',isDayComplete(cn,cw,di));
  });
}

