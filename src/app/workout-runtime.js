function renderEx(e,ei,di,wk,cn,isExtra){
  const exKey=sdk(cn,cw,di,ei);
  const n=nsf(di,ei,wk,exKey);
  const all=getSets();
  if(!all[exKey]) all[exKey]=Array.from({length:Math.max(n,5)},()=>({kg:'',reps:'',done:false}));
  while(all[exKey].length<n) all[exKey].push({kg:'',reps:'',done:false});
  saveSets(all);
  const sets=all[exKey],prs=getPRs(),prk=`pr${di}${ei}`,cpr=prs[prk]||0;
  const displayName=e.n; // kanoničen seznam že nosi prikazano ime
  const isSwapped=e.n0?(e.n!==e.n0):false;
  const use531=e.progMode==='531';
  const lift531=e.lift531||infer531LiftV16(displayName);
  // Prev cycle hint
  let ph='';
  if(cn>1&&!isSwapped){const pp=getPeakForExercise(cn-1,di,ei);if(pp>0)ph=`<div class="ph">Prejšnji cikel peak: ${pp}kg</div>`;}
  // Last session hint (prejšnji teden ali prejšnji cikel) — najbolj koristen za izbiro teže
  let lhHtml='';
  const last=isSwapped?null:getLastSession(di,ei,cn,cw);
  if(last){
    const meta=last.date?` · ${last.date}`:'';
    lhHtml=`<div class="last-hint"><span>↺ Zadnjič: <strong>${last.kg}kg × ${last.reps}</strong></span><span class="lh-meta">T${last.w+1} C${last.c}${meta}</span></div>`;
  }
  // Week suggestion
  let sugHtml='';
  if(e.m&&cw>0&&!use531){
    const sug=getWeek1Weight(cn,di,ei);
    if(sug>0){
      const sugKg=Math.round(sug*WEEK_PCTS[cw]/2.5)*2.5;
      const pcts=['','90%','82%','62%'];
      const lbls=['','Moderate','Volume','Deload'];
      sugHtml=`<div class="sug-box">💡 ${lbls[cw]} (${pcts[cw]} od T1): <strong>${sugKg}kg</strong></div>`;
    }
  }
  const maxKg=Math.max(0,...sets.map(s=>parseFloat(s.kg)||0));
  const isPR=maxKg>0&&maxKg>cpr;
  const tv=sets.slice(0,n).reduce((s,x)=>(parseFloat(x.kg)||0)*(parseFloat(x.reps)||0)+s,0);
  const isBarbell=BARBELL_EX.includes(e.n);
  const firstKg=parseFloat(sets[0]?.kg)||0;
  let plateHtml='';
  if(isBarbell){
    if(firstKg>0){const pl=calcPlatesFor(firstKg);plateHtml=pl?`<div class="platebox" id="pb-${exKey}"><strong>Vsaka stran:</strong> ${pl.each}<span class="pl-each">Palica ${pl.bar}kg + ${pl.perSide*2}kg = ${pl.total}kg</span></div>`:`<div class="platebox" id="pb-${exKey}">Ni možno sestaviti ${firstKg}kg s trenutnimi ploščami.</div>`;}
    else plateHtml=`<div class="platebox" id="pb-${exKey}" style="color:var(--text3);">Vnesi težo v S1 za prikaz plošč</div>`;
  }
  const rows=Array.from({length:n},(_,si)=>{
    const s=sets[si]||{kg:'',reps:'',done:false};
    const kgVal=parseFloat(s.kg)||0;
    const repsVal=parseFloat(s.reps)||0;
    const isDrop=!!s.drop;
    const isNextSet=!s.done&&sets.slice(0,si).every(x=>x.done);
    const vol=Math.round(kgVal*repsVal);
    const orm=s.kg&&s.reps?Math.round(kgVal*(1+repsVal/30)):'';
    const pls=isBarbell?platesShort(kgVal):{text:'',cls:''};
    const plMini=isBarbell?`<div class="pl-mini ${pls.cls}" id="pl-${exKey}-${si}">${pls.text}</div>`:'';
    const dropMark=isDrop?'<span class="set-type drop">D</span>':'';
    const kgStep=getKgStep();
    const repsStep=getRepsStep();
    const setNo=si+1;
    const kgInputHtml=`<div class="stp-wrap"><button class="stp-btn" aria-label="Zmanjšaj težo v setu ${setNo}" onclick="stepKg('${exKey}',${si},${di},${ei},${cn},-${kgStep},${isBarbell?1:0})">−</button><input class="wi" aria-label="Teža v kilogramih, set ${setNo}" type="number" inputmode="decimal" placeholder="kg" value="${safeHtml(s.kg)}" min="0" step="${kgStep}" onchange="sv('${exKey}',${si},'kg',this.value,${di},${ei},${cn},${isBarbell?1:0})"><button class="stp-btn" aria-label="Povečaj težo v setu ${setNo}" onclick="stepKg('${exKey}',${si},${di},${ei},${cn},${kgStep},${isBarbell?1:0})">+</button></div>`;
    const repsInputHtml=`<div class="stp-wrap"><button class="stp-btn" aria-label="Zmanjšaj ponovitve v setu ${setNo}" onclick="stepReps('${exKey}',${si},${di},${ei},${cn},-${repsStep})">−</button><input class="ri" aria-label="Ponovitve, set ${setNo}" type="number" inputmode="numeric" placeholder="pon" value="${safeHtml(s.reps)}" min="0" step="${repsStep}" onchange="sv('${exKey}',${si},'reps',this.value,${di},${ei},${cn},0)"><button class="stp-btn" aria-label="Povečaj ponovitve v setu ${setNo}" onclick="stepReps('${exKey}',${si},${di},${ei},${cn},${repsStep})">+</button></div>`;
    return `<tr id="row-${exKey}-${si}" class="${isDrop?'is-drop':''}${isNextSet?' next-set':''}"><td class="sn">${setNo}${dropMark}</td><td class="kg-cell">${kgInputHtml}${plMini}</td><td>${repsInputHtml}</td><td class="vc${vol>0?' hv':''}">${vol>0?vol+'kg':''}</td><td class="oc">${orm?orm+'kg':''}</td><td><button class="lb${s.done?' done':''}" aria-label="${s.done?'Razveljavi':'Zabeleži'} set ${setNo}" onclick="tgSet('${exKey}',${si},${di},${ei},${cn})" oncontextmenu="event.preventDefault();toggleDrop('${exKey}',${si},${di},${ei},${cn})">${s.done?'✓':'Zapiši'}</button></td></tr>`;
  }).join('');
  const baseN=wk.dl?3:(e.m?wk.sM:wk.sA);
  const extra=getExtraSets(exKey);
  const swHasData=SWAPS_DB[e.n];
  // 5/3/1 je prostovoljna nastavitev posamezne vaje, ne Bulk profil.
  let p531Html='';
  if(use531&&lift531){
    const presc=get531Prescription(lift531,cw);
    if(presc){
      const weekLabel=W531[cw]?.reps?.join('/')||`Teden ${cw+1}`;
      p531Html=`<div class="p531-box"><div class="p531-title">5/3/1 · ${weekLabel}</div>${presc.map((s,i)=>`<div class="p531-row"><span>Set ${i+1}</span><span class="p531-pct">${s.pct}%</span><strong>${s.kg}kg</strong><span>× ${s.reps}</span></div>`).join('')}<div class="p531-note">Zadnji set z znakom +: naredi največ kakovostnih ponovitev, brez izgube tehnike.</div></div>`;
    } else {
      p531Html=`<div class="p531-box p531-warn">Za izračun 5/3/1 v Nastavitvah vnesi 1RM za ${safeHtml(lift531)}. Vaja in drugi podatki ostanejo nespremenjeni.</div>`;
    }
  }
  // Preveri če je vaja že v celoti zaključena (samo ob render-u — collapse stanje)
  const isAllDone=sets.length>=n&&sets.slice(0,n).every(s=>s.done);
  const userFold=isFolded(exKey);
  const collapsed=userFold===null?isAllDone:userFold;
  // Summary stats za collapsed view
  const doneSets=sets.filter(s=>s.done&&s.kg&&s.reps);
  const topSet=doneSets.length>0?doneSets.reduce((a,b)=>parseFloat(b.kg)>parseFloat(a.kg)?b:a):null;
  const totalVol=doneSets.reduce((a,b)=>a+(parseFloat(b.kg)||0)*(parseFloat(b.reps)||0),0);
  const summaryHtml=topSet?`<div class="exc-summary"><span class="es-stats">✓ ${doneSets.length}/${n} · top ${topSet.kg}kg×${topSet.reps} · ${Math.round(totalVol)}kg</span><button class="toggle-fold" onclick="toggleFold('${exKey}')">razširi ▾</button></div>`:'';
  const painHtml=renderPainBox(exKey,displayName,di,ei,cn);
  const activeCls=(typeof isActiveGymEx==='function'&&isActiveGymEx(exKey))?' active-ex':'';
  return `<div class="exc${isPR?' pr-card':''}${collapsed?' col-done':''}${activeCls}" id="ec-${exKey}">
    <div class="ex-top">
      <div class="ex-name-wrap"><div class="ex-name" id="exn-${exKey}">${safeHtml(displayName)}</div><button class="info-btn" onclick="toggleExInfo('${exKey}')" title="Opis vaje">ⓘ</button><button class="hist-btn" onclick="openExHistory(${di},${ei})" title="Zgodovina vaje">📊</button></div>
      <div class="sp ${wk.pill}">${n} × ${wk.reps}</div>
    </div>
    ${summaryHtml}
    <div class="ex-body">
    <div class="bdg"><span class="b ${wk.rb}">${wk.rpe}</span>${e.m?'<span class="b mb">Glavna</span>':''}${isExtra?'<span class="b" style="background:var(--blue-bg);color:var(--blue-text);">+ Extra</span>':''}${isPR?'<span class="b prb">PR</span>':''}<button class="restbtn" onclick="startT('${exKey}',${restForEx(e.id,displayName,e.r)})" oncontextmenu="event.preventDefault();editRest('${displayName.replace(/'/g,"\\'")}',${e.r},'${exKey}','${e.id||''}')" title="Dolg pritisk = nastavi počitek">${fmtRest(restForEx(e.id,displayName,e.r))} ▶</button>${isExtra?'':`<button class="swbtn" onclick="toggleSwap('${exKey}')">Zamenjave ▾</button>`}<button class="ex-menu-btn" onclick="toggleExMenu('${exKey}')" title="Več možnosti">⋯</button>${isAllDone?`<button class="toggle-fold" onclick="toggleFold('${exKey}')">skrči ▴</button>`:''}</div>
    <div class="ex-menu" id="exm-${exKey}">${(!isExtra&&isSwapped)?`<button class="ex-menu-item" onclick="clearSwap('${exKey}','${(e.n0||e.n).replace(/'/g,"\\'")}')">↺ Original vaja</button>`:''}<button class="ex-menu-item" onclick="moveExUp(${di},${ei})">↑ Premakni gor</button><button class="ex-menu-item" onclick="moveExDown(${di},${ei})">↓ Premakni dol</button>${isExtra?`<button class="ex-menu-item danger" onclick="removeExtraByName(${di},'${e.n.replace(/'/g,"\\'")}')">× Odstrani vajo</button>`:`<button class="ex-menu-item danger" onclick="removeExForWeek('${exKey}')">🗑 Odstrani za ta teden</button>`}</div>
    <div class="sw-panel" id="sw-${exKey}">
      <input class="sw-custom-in" type="text" placeholder="🔍 Išči vajo (npr. squat, biceps)..." id="swsr-${exKey}" oninput="filterSwapDB('${exKey}','${(e.n0||e.n).replace(/'/g,"\\'")}',this.value)" style="width:100%;margin-bottom:8px;">
      <div id="swdb-${exKey}" class="sw-lazy-v15" data-loaded="0" style="max-height:280px;overflow-y:auto;"><div class="sw-lazy-note-v15">Seznam se naloži ob odprtju.</div></div>
      <div class="sw-custom-row">
        <input class="sw-custom-in" type="text" placeholder="Ali vpiši svojo..." id="swci-${exKey}">
        <button class="sw-custom-btn" onclick="useCustomSwap('${exKey}','${(e.n0||e.n).replace(/'/g,"\\'")}')">Uporabi</button>
      </div>
    </div>
    ${sugHtml}
    ${p531Html}
    <div id="wu-dyn-${exKey}"></div>
    <div class="ex-d">${safeHtml(e.d||'')}</div>${e.tip?`<div class="ex-tip">${safeHtml(e.tip)}</div>`:''}${painHtml}
    <table class="st"><thead><tr><th>S</th><th>Teža</th><th>Pon</th><th>Vol</th><th>1RM</th><th></th></tr></thead><tbody id="rows-${exKey}">${rows}</tbody></table>
    ${tv>0?`<div class="vol-total" style="font-size:11px;color:var(--green-text);margin-top:4px;text-align:right;">Skupaj: ${Math.round(tv).toLocaleString()} kg</div>`:''}
    <div class="set-ctrl">
      <button class="set-ctrl-btn add" onclick="addSet('${exKey}',${di},${ei},${cn})">+</button>
      <span class="set-count-label">${n} serij${extra>0?` (+${extra})`:extra<0?` (${extra})`:''}</span>
      <button class="set-ctrl-btn rem" onclick="removeSet('${exKey}',${di},${ei},${cn})">−</button>
    </div>
    <div class="tbar" id="tb-${exKey}"><div class="tc" id="tc-${exKey}">—</div><div class="tl2">${fmtRest(restForEx(e.id,displayName,e.r))} odmor</div><button class="txb" onclick="stopT('${exKey}')">X</button></div>
    </div>
  </div>`;
}

// Fold state per exercise (override avto-collapse) — samo session storage
const foldState={};
function isFolded(key){return key in foldState?foldState[key]:null;}
function toggleExMenu(key){
  const p=document.getElementById('exm-'+key);
  if(p)p.classList.toggle('open');
}
// === DIAGNOSTIKA (samo za branje — nič ne spremeni) ===
// Primerja exName, ki je bil zabeležen ob vnosu seta, s trenutnim imenom vaje na tisti poziciji.
// Neujemanje = dokaz da so podatki "podedovani" od prej odstranjene/premaknjene vaje.
function diagnoseExNameMismatches(){
  const allSets=getSets();
  const out=[];
  Object.keys(allSets).forEach(k=>{
    const m=k.match(/^c(\d+)w(\d+)d(\d+)e(\d+)$/);
    if(!m)return;
    const [,c,w,di,ei]=m.map(Number);
    const d=PROG.days[di];if(!d)return;
    const list=d.ex||d._origEx;
    const curEx=list&&list[ei];
    const curName=curEx?getSwappedName(k,curEx.n,curEx.extra):null;
    const sets=allSets[k]||[];
    const tagged=sets.filter(s=>s&&s.exName&&s.kg&&s.reps);
    if(tagged.length===0||!curName)return;
    const mismatched=tagged.filter(s=>s.exName!==curName);
    if(mismatched.length>0){
      out.push({key:k,cikel:c,teden:w+1,dan:DAY_NAMES[di]||('Dan '+(di+1)),trenutnoIme:curName,zabeleženoIme:mismatched[0].exName,steviloSetov:mismatched.length});
    }
  });
  return out;
}
// Poišče na kateri poziciji TA TRENUTEK (za dan dan c/w) dejansko živi vaja z imenom wantName
function findCurrentPosForName(di,c,w,wantName){
  const list=buildDayExList(di);
  for(let i=0;i<list.length;i++){
    const k=sdk(c,w,di,i);
    const nm=getSwappedName(k,list[i].n,list[i].extra);
    if(nm===wantName)return i;
  }
  return -1;
}
// Popravi EN najden primer neskladja: prestavi podatke na pravo pozicijo (ali izbriši, če vaje ni več)
async function fixMismatchItem(wrongKey,wantName,silent){
  const m=wrongKey.match(/^c(\d+)w(\d+)d(\d+)e(\d+)$/);
  if(!m){if(!silent)toast('Napačen ključ','err');return 'error';}
  const c=+m[1],w=+m[2],di=+m[3],wrongEi=+m[4];
  const correctEi=findCurrentPosForName(di,c,w,wantName);
  if(correctEi<0){
    if(!silent&&!await uiConfirm(`Vaja "${wantName}" ne obstaja več na tem dnevu — podatkov ni kam prestaviti. Izbrišem jih?`))return 'skipped';
    if(silent)return 'orphan'; // pri "popravi vse" osirotelih ne brišemo samodejno brez potrditve
    const allSets=getSets();delete allSets[wrongKey];saveSets(allSets);
    const sc=getSetCounts();delete sc[wrongKey];saveSetCounts(sc);
    const hidden=getHiddenEx();delete hidden[wrongKey];saveHiddenEx(hidden);
    const pain=getPainData();delete pain[wrongKey];savePainData(pain);
    if(!silent)toast('🗑 Osiroteli podatki izbrisani','ok');
    return 'deleted';
  }
  if(correctEi===wrongEi)return 'already-ok';
  const correctKey=sdk(c,w,di,correctEi);
  const allSets=getSets();
  const destHasData=allSets[correctKey]&&allSets[correctKey].some(s=>s&&s.kg&&s.reps);
  if(destHasData){
    if(!silent)toast('⚠ Na pravi poziciji že obstajajo podatki — preveri ročno','err');
    return 'conflict';
  }
  if(allSets[wrongKey]!==undefined){allSets[correctKey]=allSets[wrongKey];delete allSets[wrongKey];saveSets(allSets);}
  const sc=getSetCounts();if(sc[wrongKey]!==undefined){sc[correctKey]=sc[wrongKey];delete sc[wrongKey];saveSetCounts(sc);}
  const hidden=getHiddenEx();if(hidden[wrongKey]!==undefined){hidden[correctKey]=hidden[wrongKey];delete hidden[wrongKey];saveHiddenEx(hidden);}
  const pain=getPainData();if(pain[wrongKey]!==undefined){pain[correctKey]=pain[wrongKey];delete pain[wrongKey];savePainData(pain);}
  if(!silent)toast('✓ Podatki prestavljeni na pravo vajo','ok');
  return 'fixed';
}
async function fixOneAndRefresh(wrongKey,wantName){
  await fixMismatchItem(wrongKey,wantName,false);
  runDataDiagnostic();
  if(cd!==null&&cd!==undefined)showDay(cd);
}
// Popravi VSE najdene primere naenkrat (varno — konflikte in osirotele preskoči, samo poroča)
async function fixAllMismatches(){
  const results=diagnoseExNameMismatches();
  if(results.length===0)return;
  if(!await uiConfirm(`Popravim ${results.length} najdenih neskladij? Prestavi podatke na pravo vajo. Konflikte in osirotele podatke preskoči (tiste ročno).`))return;
  let fixed=0,conflict=0,orphan=0;
  for(const r of results){
    const res=await fixMismatchItem(r.key,r.zabeleženoIme,true);
    if(res==='fixed')fixed++;else if(res==='conflict')conflict++;else if(res==='orphan')orphan++;
  }
  toast(`✓ Popravljenih: ${fixed}${conflict?' · Konfliktov: '+conflict:''}${orphan?' · Osirotelih (preveri ročno): '+orphan:''}`,'ok');
  runDataDiagnostic();
  if(cd!==null&&cd!==undefined)showDay(cd);
}
function runDataDiagnostic(){
  const results=diagnoseExNameMismatches();
  const el=document.getElementById('diag-results');
  if(!el)return;
  if(results.length===0){
    el.innerHTML='<div style="font-size:12px;color:var(--green-text);padding:.5rem;">✓ Ni najdenih neskladij — podatki so v redu.</div>';
    return;
  }
  el.innerHTML=`<div style="font-size:12px;color:var(--amber-text);margin-bottom:.5rem;">⚠ Najdenih ${results.length} neskladij:</div>`+
    `<button class="sb" style="width:100%;margin-bottom:.5rem;background:var(--green-bg);border-color:var(--green);color:var(--green-text);" onclick="fixAllMismatches()">🔧 Popravi vse (varno)</button>`+
    results.map(r=>`<div style="font-size:11px;color:var(--text2);padding:6px 8px;background:var(--bg3);border-radius:6px;margin-bottom:4px;">
      <div style="margin-bottom:5px;"><strong>${r.dan}</strong>, Cikel ${r.cikel}, Teden ${r.teden} — na poziciji je zdaj <strong>${r.trenutnoIme}</strong>, a ${r.steviloSetov} set(ov) je zabeleženih pod imenom <strong>${r.zabeleženoIme}</strong>.</div>
      <button class="sb" style="font-size:10px;padding:4px 10px;" onclick="fixOneAndRefresh('${r.key}','${r.zabeleženoIme.replace(/'/g,"\\'")}')">Popravi to</button>
    </div>`).join('')+
    `<div style="font-size:10px;color:var(--text3);margin-top:6px;">Vzrok: v starejši verziji je odstranjevanje/premikanje vaj lahko zamenjalo podatke med pozicijami. Od te verzije naprej se to ne more več zgoditi. "Popravi" prestavi podatke na pravo vajo (ali vpraša za brisanje, če vaje ni več).</div>`;
}
function toggleFold(key){
  const card=document.getElementById('ec-'+key);if(!card)return;
  const cur=card.classList.contains('col-done');
  foldState[key]=!cur;
  card.classList.toggle('col-done',!cur);
  // Posodobi gumbe znotraj
  const btns=card.querySelectorAll('.toggle-fold');
  btns.forEach(b=>{b.textContent=!cur?'razširi ▾':'skrči ▴';});
}

function addSet(exKey,di,ei,cn){
  const extra=getExtraSets(exKey);setExtraSets(exKey,extra+1);
  const wk=PROG.weeks[cw];
  const n=nsf(di,ei,wk,exKey);
  const all=getSets();
  if(!all[exKey]) all[exKey]=[];
  // Copy last set's kg as default
  const lastKg=all[exKey].length>0?all[exKey][all[exKey].length-1].kg:'';
  all[exKey].push({kg:lastKg,reps:'',done:false});
  saveSets(all);
  // Re-render just this exercise
  const card=document.getElementById('ec-'+exKey);
  if(card){const tmp=document.createElement('div');tmp.innerHTML=renderEx(PROG.days[di].ex[ei],ei,di,wk,cn);card.replaceWith(tmp.firstChild);}
}

function removeSet(exKey,di,ei,cn){
  const wk=PROG.weeks[cw];
  const baseN=wk.dl?3:(PROG.days[di].ex[ei].m?wk.sM:wk.sA);
  const extra=getExtraSets(exKey);
  if(baseN+extra<=1)return;
  setExtraSets(exKey,extra-1);
  const n=nsf(di,ei,wk,exKey);
  const all=getSets();
  if(all[exKey]&&all[exKey].length>n) all[exKey]=all[exKey].slice(0,n);
  saveSets(all);
  const card=document.getElementById('ec-'+exKey);
  if(card){const tmp=document.createElement('div');tmp.innerHTML=renderEx(PROG.days[di].ex[ei],ei,di,wk,cn);card.replaceWith(tmp.firstChild);}
}

function toggleSwap(key){
  const p=document.getElementById('sw-'+key);if(!p)return;
  swOpen[key]=!swOpen[key];p.classList.toggle('open',swOpen[key]);
  if(!swOpen[key])return;
  const list=document.getElementById('swdb-'+key);
  if(!list||list.dataset.loaded==='1')return;
  const m=String(key).match(/^c\d+w\d+d(\d+)e(\d+)$/);
  const di=m?Number(m[1]):cd,ei=m?Number(m[2]):0;
  const item=buildDayExList(di)?.[ei];
  const original=item?.n0||item?.n||currentExerciseName(di,ei,key)||'Vaja';
  list.innerHTML=renderSwapDBList(key,original,'');
  list.dataset.loaded='1';
}
function getExSwaps(){try{return JSON.parse(localStorage.getItem('wt_exswap')||'{}');}catch{return {};}}
function saveExSwaps(s){localStorage.setItem('wt_exswap',JSON.stringify(s));}
// Swap je vezan na DAN + ORIGINALNO IME vaje (stabilno ob premikanju). Velja od tedna nastanka NAPREJ.
function swapPosKey(exKey){const m=String(exKey).match(/d(\d+)e(\d+)$/);return m?`d${m[1]}e${m[2]}`:exKey;}
function diFromKey(exKey){const m=String(exKey).match(/d(\d+)e\d+$/);return m?+m[1]:-1;}
function cwFromKey(exKey){const m=String(exKey).match(/c(\d+)w(\d+)d\d+e\d+/);return m?{c:+m[1],w:+m[2]}:{c:1,w:0};}
function origNameForKey(exKey){
  const m=String(exKey).match(/d(\d+)e(\d+)$/);if(!m)return null;
  const di=+m[1],ei=+m[2];
  const all=getDayLists();const arr=all&&all[di];
  if(arr&&arr[ei])return arr[ei].n0;
  const d=PROG.days[di];if(!d)return null;
  const list=d._origEx||d.ex;const e=list&&list[ei];
  return e?(e.n0||e.n):null;
}
function getSwappedName(exKey,origName,isExtra){
  const di=diFromKey(exKey);
  const cwk=cwFromKey(exKey);
  const all=getDayLists();
  const arr=all&&all[di];
  if(arr){
    const it=arr.find(x=>x.n0===origName)||arr.find(x=>dispNameForItem(x,cwk.c,cwk.w)===origName);
    if(it)return dispNameForItem(it,cwk.c,cwk.w);
    return origName;
  }
  // fallback pred migracijo (stari wt_exswap format)
  if(isExtra)return origName;
  const s=getExSwaps();
  const entry=s[`d${di}|${origName}`];
  if(!entry)return origName;
  if(typeof entry==='string')return entry;
  if(cwk.c>entry.c||(cwk.c===entry.c&&cwk.w>=entry.w))return entry.n;
  return origName;
}
// Enkratna migracija starih pozicijskih/polnih swap ključev → ime-osnovani
function migrateSwaps(){
  const s=getExSwaps();let changed=false;
  Object.keys(s).forEach(k=>{
    if(k.indexOf('|')>=0)return;
    const m=k.match(/d(\d+)e(\d+)$/);
    if(!m){delete s[k];changed=true;return;}
    const di=+m[1],ei=+m[2];
    const d=PROG.days[di];const list=d?(d._origEx||d.ex):null;const orig=list&&list[ei];
    if(orig&&orig.n&&!s[`d${di}|${orig.n}`]){s[`d${di}|${orig.n}`]=s[k];}
    delete s[k];changed=true;
  });
  if(changed)saveExSwaps(s);
}

// === SKRIVANJE VAJE ZA DOLOČEN TEDEN+CIKEL ===
function getHiddenEx(){try{return JSON.parse(localStorage.getItem('wt_hidden_ex')||'{}');}catch{return {};}}
function saveHiddenEx(h){localStorage.setItem('wt_hidden_ex',JSON.stringify(h));}
function isExHidden(exKey){return !!getHiddenEx()[exKey];}
async function removeExForWeek(exKey){
  if(!await uiConfirm('Odstrani to vajo samo za ta teden? (ostane v drugih tednih, podatki se ohranijo)'))return;
  const h=getHiddenEx();h[exKey]=true;saveHiddenEx(h);
  showDay(cd);toast('🗑 Vaja odstranjena za ta teden','ok');
}
function restoreHiddenWeek(di){
  const h=getHiddenEx();const cn=getCyc().num;const pre=`c${cn}w${cw}d${di}e`;
  let cnt=0;Object.keys(h).forEach(k=>{if(k.startsWith(pre)){delete h[k];cnt++;}});
  saveHiddenEx(h);showDay(cd);toast(`↩ Povrnjenih ${cnt} vaj`,'ok');
}

// === STEPPER za kg in pon ===
function getKgStep(){return parseFloat(localStorage.getItem('wt_kg_step')||'2.5');}
function getRepsStep(){return parseInt(localStorage.getItem('wt_reps_step')||'1');}
function setKgStep(v){localStorage.setItem('wt_kg_step',String(parseFloat(v)||2.5));toast('💾 Shranjeno','ok');}
function setRepsStep(v){localStorage.setItem('wt_reps_step',String(parseInt(v)||1));toast('💾 Shranjeno','ok');}

// === BUILT-IN EXERCISE DATABASE (100 vaj) ===
// Polja: n=ime, m=primary muscle, s=secondary, c=compound/isolation, eq=equipment, d=opis
const EXERCISE_DB=[
  // ========== CHEST (12) ==========
  {n:"Barbell Bench Press",m:"Chest",s:"Triceps, Front Delt",c:"compound",eq:"barbell",d:"Lie flat, grip slightly wider than shoulders. Lower bar to mid-chest, press up explosively. Keep shoulder blades retracted."},
  {n:"Incline Barbell Press",m:"Chest",s:"Front Delt, Triceps",c:"compound",eq:"barbell",d:"Bench at 30-45°. Lower to upper chest, drive feet into floor. Targets upper chest."},
  {n:"Decline Barbell Press",m:"Chest",s:"Triceps",c:"compound",eq:"barbell",d:"Bench at -15-30°. Lower to lower chest. Targets lower pec fibers."},
  {n:"Dumbbell Bench Press",m:"Chest",s:"Triceps, Front Delt",c:"compound",eq:"dumbbell",d:"Allows greater range of motion than barbell. Press dumbbells together at top for peak contraction."},
  {n:"Incline Dumbbell Press",m:"Chest",s:"Front Delt, Triceps",c:"compound",eq:"dumbbell",d:"Incline 30-45°. Better stretch on upper chest than barbell version."},
  {n:"Dumbbell Fly",m:"Chest",s:"",c:"isolation",eq:"dumbbell",d:"Slight elbow bend, arc dumbbells out and down. Squeeze chest at top. Don't go too low — protect shoulders."},
  {n:"Cable Crossover",m:"Chest",s:"",c:"isolation",eq:"cable",d:"Stand between cables, slight forward lean. Pull handles down and across. Continuous tension throughout."},
  {n:"Cable Chest Fly",m:"Chest",s:"",c:"isolation",eq:"cable",d:"Adjust cables to chest height. Sweep handles together in arc. Full stretch at start, full squeeze at end."},
  {n:"Pec Deck Machine",m:"Chest",s:"",c:"isolation",eq:"machine",d:"Sit upright, elbows on pads. Bring arms together, squeeze chest. Great for finishing pump."},
  {n:"Push-Ups",m:"Chest",s:"Triceps, Core",c:"compound",eq:"bodyweight",d:"Hands shoulder-width, body straight from head to heels. Lower chest to floor, press up."},
  {n:"Weighted Dips",m:"Chest",s:"Triceps, Front Delt",c:"compound",eq:"bodyweight",d:"Lean forward for chest emphasis. Lower until shoulders below elbows. Add weight via belt."},
  {n:"Machine Chest Press",m:"Chest",s:"Triceps, Front Delt",c:"compound",eq:"machine",d:"Adjust seat so handles align with mid-chest. Safer for beginners or heavy work without spotter."},

  // ========== BACK (15) ==========
  {n:"Conventional Deadlift",m:"Back",s:"Hamstrings, Glutes, Traps",c:"compound",eq:"barbell",d:"Bar over mid-foot. Hinge at hips, neutral spine. Drive through heels, lock out at top. King of strength."},
  {n:"Sumo Deadlift",m:"Back",s:"Glutes, Quads, Adductors",c:"compound",eq:"barbell",d:"Wide stance, toes out. Shorter ROM, more hip drive. Better for tall lifters or hip mobility issues."},
  {n:"Romanian Deadlift",m:"Hamstrings",s:"Glutes, Back",c:"compound",eq:"barbell",d:"Slight knee bend, push hips back. Bar slides down legs. Stop when stretch in hams. Don't go to floor."},
  {n:"Pull-Ups",m:"Back",s:"Biceps",c:"compound",eq:"bodyweight",d:"Hang from bar, palms forward. Pull until chin over bar. Engage lats by pulling elbows down."},
  {n:"Chin-Ups",m:"Back",s:"Biceps",c:"compound",eq:"bodyweight",d:"Underhand grip, palms toward you. More biceps involvement than pull-ups. Easier for most."},
  {n:"Lat Pulldown",m:"Back",s:"Biceps",c:"compound",eq:"cable",d:"Wide grip, slight backward lean. Pull bar to upper chest. Don't lean back excessively."},
  {n:"Close-Grip Lat Pulldown",m:"Back",s:"Biceps",c:"compound",eq:"cable",d:"V-handle or close neutral grip. More biceps and lower lat activation."},
  {n:"Barbell Row",m:"Back",s:"Biceps, Rear Delt",c:"compound",eq:"barbell",d:"Hinge ~45°, row bar to lower chest. Keep back flat. Drive elbows up and back."},
  {n:"Pendlay Row",m:"Back",s:"Biceps, Rear Delt",c:"compound",eq:"barbell",d:"Bar starts on floor every rep. Strict, explosive pull. Less momentum than barbell row."},
  {n:"T-Bar Row",m:"Back",s:"Biceps, Rear Delt",c:"compound",eq:"barbell",d:"Anchor one end, load other. Chest supported version safer for lower back."},
  {n:"Dumbbell Row",m:"Back",s:"Biceps",c:"compound",eq:"dumbbell",d:"Knee and hand on bench, opposite arm rows. Pull dumbbell toward hip, squeeze back."},
  {n:"Single-Arm DB Row",m:"Back",s:"Biceps",c:"compound",eq:"dumbbell",d:"Same as DB row but emphasize unilateral work. Great for fixing imbalances."},
  {n:"Seated Cable Row",m:"Back",s:"Biceps",c:"compound",eq:"cable",d:"Sit upright, V-handle. Pull to lower abs, squeeze shoulder blades. Don't rock back."},
  {n:"Face Pulls",m:"Rear Delt",s:"Back, Traps",c:"isolation",eq:"cable",d:"Rope at face height. Pull to face, externally rotate at end. Crucial for shoulder health."},
  {n:"Shrugs",m:"Traps",s:"",c:"isolation",eq:"dumbbell",d:"Heavy weight, shrug straight up. Hold at top 1 sec. No rolling — straight up and down."},

  // ========== SHOULDERS (10) ==========
  {n:"Overhead Press (OHP)",m:"Shoulders",s:"Triceps, Upper Chest",c:"compound",eq:"barbell",d:"Stand tall, bar at shoulders. Press overhead, lock out. Squeeze glutes to protect lower back."},
  {n:"Push Press",m:"Shoulders",s:"Triceps, Legs",c:"compound",eq:"barbell",d:"Use slight leg drive to assist press. Allows heavier weight than strict press."},
  {n:"Seated DB Shoulder Press",m:"Shoulders",s:"Triceps",c:"compound",eq:"dumbbell",d:"Back support reduces lower back stress. Press dumbbells from shoulder to overhead."},
  {n:"Arnold Press",m:"Shoulders",s:"Triceps",c:"compound",eq:"dumbbell",d:"Start palms facing you, rotate to facing forward as you press. Hits all three delt heads."},
  {n:"Lateral Raises",m:"Shoulders",s:"",c:"isolation",eq:"dumbbell",d:"Slight bend at elbow. Raise to shoulder height. Lead with elbows, not hands. Light weight, strict form."},
  {n:"Cable Lateral Raise",m:"Shoulders",s:"",c:"isolation",eq:"cable",d:"Cable from low pulley, behind body. Raise out to side. Constant tension throughout."},
  {n:"Front Raises",m:"Front Delt",s:"",c:"isolation",eq:"dumbbell",d:"Raise weight in front to shoulder height. Often unnecessary — bench press already hits front delts."},
  {n:"Rear Delt Fly",m:"Rear Delt",s:"",c:"isolation",eq:"dumbbell",d:"Bent over or face-down on incline. Raise dumbbells out wide. Lead with pinkies, not thumbs."},
  {n:"Reverse Pec Deck",m:"Rear Delt",s:"",c:"isolation",eq:"machine",d:"Reverse position on pec deck. Open arms wide, squeeze rear delts. Easier form than fly."},
  {n:"Upright Row",m:"Shoulders",s:"Traps, Biceps",c:"compound",eq:"barbell",d:"Pull bar up to chest, elbows high. Wider grip safer for shoulders. Stop at chest height."},

  // ========== BICEPS (8) ==========
  {n:"Barbell Curl",m:"Biceps",s:"",c:"isolation",eq:"barbell",d:"Stand, shoulder-width grip. Curl to chest, full ROM. No swinging — strict reps."},
  {n:"EZ-Bar Curl",m:"Biceps",s:"",c:"isolation",eq:"barbell",d:"Easier on wrists than straight bar. Inner grip = outer biceps, outer grip = inner."},
  {n:"Dumbbell Curl",m:"Biceps",s:"",c:"isolation",eq:"dumbbell",d:"Alternating or both at once. Supinate (rotate palm up) for max biceps activation."},
  {n:"Hammer Curl",m:"Biceps",s:"Brachialis, Forearm",c:"isolation",eq:"dumbbell",d:"Neutral grip (palms facing each other). Hits brachialis and brachioradialis. Builds arm thickness."},
  {n:"Incline Dumbbell Curl",m:"Biceps",s:"",c:"isolation",eq:"dumbbell",d:"Bench at 45-60°. Greater stretch on long head of biceps. Strict form essential."},
  {n:"Preacher Curl",m:"Biceps",s:"",c:"isolation",eq:"barbell",d:"Arms on pad. Isolates biceps with no swing. Don't lock out fully at bottom."},
  {n:"Cable Curl",m:"Biceps",s:"",c:"isolation",eq:"cable",d:"Constant tension throughout ROM. Try rope, straight bar, or single-handle variations."},
  {n:"Concentration Curl",m:"Biceps",s:"",c:"isolation",eq:"dumbbell",d:"Seated, elbow on inner thigh. Slow, strict reps. Peak biceps contraction."},

  // ========== TRICEPS (8) ==========
  {n:"Close-Grip Bench Press",m:"Triceps",s:"Chest, Front Delt",c:"compound",eq:"barbell",d:"Hands shoulder-width or slightly closer. Tucked elbows. Best mass-builder for triceps."},
  {n:"Tricep Pushdown (Rope)",m:"Triceps",s:"",c:"isolation",eq:"cable",d:"Rope on high pulley. Push down, spread rope at bottom. Keep elbows tucked."},
  {n:"Tricep Pushdown (Bar)",m:"Triceps",s:"",c:"isolation",eq:"cable",d:"Straight or V-bar. Push down to full extension. Don't flare elbows."},
  {n:"Skull Crushers",m:"Triceps",s:"",c:"isolation",eq:"barbell",d:"Lying on bench, EZ bar overhead. Lower to forehead, extend up. Elbows pointed up."},
  {n:"Overhead Tricep Extension",m:"Triceps",s:"",c:"isolation",eq:"dumbbell",d:"Stand or sit, dumbbell overhead with both hands. Lower behind head, extend up. Long head focus."},
  {n:"Tricep Kickback",m:"Triceps",s:"",c:"isolation",eq:"dumbbell",d:"Hinge over, upper arm parallel to floor. Extend forearm back. Squeeze at top."},
  {n:"Diamond Push-Ups",m:"Triceps",s:"Chest",c:"compound",eq:"bodyweight",d:"Hands form diamond under chest. More triceps than wide push-ups. Hard for most."},
  {n:"Dips (Vertical Body)",m:"Triceps",s:"Chest, Front Delt",c:"compound",eq:"bodyweight",d:"Body upright (not leaning). Lower until 90° at elbow. Press back up. Add weight when easy."},

  // ========== QUADS (8) ==========
  {n:"Barbell Back Squat",m:"Quads",s:"Glutes, Hamstrings, Core",c:"compound",eq:"barbell",d:"Bar on traps, feet shoulder-width. Sit back and down, knees track over toes. Drive up through heels."},
  {n:"Front Squat",m:"Quads",s:"Glutes, Core",c:"compound",eq:"barbell",d:"Bar on front delts. More upright torso, more quad-dominant. Need shoulder/wrist mobility."},
  {n:"Leg Press",m:"Quads",s:"Glutes, Hamstrings",c:"compound",eq:"machine",d:"Feet shoulder-width on platform. Lower until knees ~90°. Don't lock out fully at top."},
  {n:"Bulgarian Split Squat",m:"Quads",s:"Glutes",c:"compound",eq:"dumbbell",d:"Rear foot elevated on bench. Lower into lunge. Front leg does most of work. Brutal but effective."},
  {n:"Walking Lunges",m:"Quads",s:"Glutes, Hamstrings",c:"compound",eq:"dumbbell",d:"Step forward, lower back knee toward floor. Step through. Continuous walking motion."},
  {n:"Goblet Squat",m:"Quads",s:"Glutes, Core",c:"compound",eq:"dumbbell",d:"Hold dumbbell at chest. Squat deep. Great for learning squat pattern."},
  {n:"Leg Extension",m:"Quads",s:"",c:"isolation",eq:"machine",d:"Sit on machine, pad on shins. Extend legs fully. Squeeze quads at top."},
  {n:"Hack Squat",m:"Quads",s:"Glutes",c:"compound",eq:"machine",d:"Back against pad. More quad-isolated than back squat. Easier on lower back."},

  // ========== HAMSTRINGS / GLUTES (8) ==========
  {n:"Stiff-Leg Deadlift",m:"Hamstrings",s:"Glutes, Back",c:"compound",eq:"barbell",d:"Minimal knee bend. Hinge at hips. More hamstring stretch than RDL."},
  {n:"Seated Leg Curl",m:"Hamstrings",s:"",c:"isolation",eq:"machine",d:"Pad above ankles. Curl heels under. Squeeze hamstrings at bottom."},
  {n:"Lying Leg Curl",m:"Hamstrings",s:"",c:"isolation",eq:"machine",d:"Face down. Curl heels to glutes. Hips stay on pad — don't raise."},
  {n:"Hip Thrust",m:"Glutes",s:"Hamstrings",c:"compound",eq:"barbell",d:"Upper back on bench, bar across hips. Drive hips up, squeeze glutes hard. Best glute builder."},
  {n:"Glute Bridge",m:"Glutes",s:"Hamstrings",c:"compound",eq:"barbell",d:"On floor, bar across hips. Drive up, squeeze. Easier setup than hip thrust."},
  {n:"Cable Pull-Through",m:"Glutes",s:"Hamstrings",c:"compound",eq:"cable",d:"Cable between legs from low pulley. Hinge forward, drive hips through. Great teaching tool for hinge pattern."},
  {n:"Good Morning",m:"Hamstrings",s:"Glutes, Lower Back",c:"compound",eq:"barbell",d:"Bar on traps. Hinge forward keeping back flat. Excellent for posterior chain."},
  {n:"Single-Leg Romanian DL",m:"Hamstrings",s:"Glutes, Core",c:"compound",eq:"dumbbell",d:"One foot off ground. Hinge with stance leg. Improves balance and unilateral strength."},

  // ========== CALVES (3) ==========
  {n:"Standing Calf Raise",m:"Calves",s:"",c:"isolation",eq:"machine",d:"Stand on platform, weight on shoulders. Rise up on toes, full ROM. Hold contraction 1 sec."},
  {n:"Seated Calf Raise",m:"Calves",s:"",c:"isolation",eq:"machine",d:"Hits soleus more than gastrocnemius. Higher reps work better."},
  {n:"Donkey Calf Raise",m:"Calves",s:"",c:"isolation",eq:"machine",d:"Bent-over position, weight on hips/lower back. Greater stretch on calves."},

  // ========== CORE (10) ==========
  {n:"Plank",m:"Core",s:"Shoulders, Glutes",c:"isolation",eq:"bodyweight",d:"Forearms on floor, body straight line. Squeeze glutes and core. Hold for time."},
  {n:"Side Plank",m:"Core",s:"Glutes, Shoulders",c:"isolation",eq:"bodyweight",d:"Side position, body straight. Hold each side. Targets obliques."},
  {n:"Hanging Leg Raise",m:"Core",s:"Hip Flexors",c:"isolation",eq:"bodyweight",d:"Hang from bar. Raise legs to 90° (or higher for advanced). Don't swing."},
  {n:"Ab Wheel Rollout",m:"Core",s:"Shoulders",c:"isolation",eq:"other",d:"Knees on floor, roll wheel out. Keep core tight, don't sag. One of best ab exercises."},
  {n:"Cable Crunch",m:"Core",s:"",c:"isolation",eq:"cable",d:"Kneel below cable, rope behind head. Crunch elbows toward knees. Don't pull with arms."},
  {n:"Russian Twist",m:"Core",s:"",c:"isolation",eq:"dumbbell",d:"Sit, lean back, feet up. Twist torso side to side. Add weight when easy."},
  {n:"Decline Sit-Up",m:"Core",s:"Hip Flexors",c:"isolation",eq:"bodyweight",d:"Decline bench. Add plate on chest for resistance. Full ROM crunch."},
  {n:"Dead Bug",m:"Core",s:"",c:"isolation",eq:"bodyweight",d:"On back, arms up, knees bent. Lower opposite arm and leg. Keep back flat. Great for stability."},
  {n:"Pallof Press",m:"Core",s:"",c:"isolation",eq:"cable",d:"Stand sideways to cable. Press handle out, resist rotation. Anti-rotation core work."},
  {n:"Mountain Climbers",m:"Core",s:"Shoulders, Cardio",c:"compound",eq:"bodyweight",d:"Push-up position. Drive knees toward chest alternately. Fast pace = cardio. Slow = core."},

  // ========== FOREARMS / GRIP (3) ==========
  {n:"Wrist Curl",m:"Forearms",s:"",c:"isolation",eq:"dumbbell",d:"Forearms on bench, palms up. Curl wrists. Strict, slow reps."},
  {n:"Reverse Wrist Curl",m:"Forearms",s:"",c:"isolation",eq:"dumbbell",d:"Palms down version. Hits extensors. Critical for balanced forearm development."},
  {n:"Farmer's Walk",m:"Forearms",s:"Traps, Core",c:"compound",eq:"dumbbell",d:"Heavy dumbbells in each hand. Walk for distance or time. Builds grip and traps massively."},

  // ========== FULL BODY / POWER (5) ==========
  {n:"Power Clean",m:"Back",s:"Glutes, Hamstrings, Traps",c:"compound",eq:"barbell",d:"Explosive pull from floor to shoulders. Catch in front rack. Develops power and athleticism."},
  {n:"Clean and Press",m:"Shoulders",s:"Back, Legs",c:"compound",eq:"barbell",d:"Power clean to shoulders, then overhead press. Full body movement."},
  {n:"Snatch",m:"Back",s:"Shoulders, Legs, Glutes",c:"compound",eq:"barbell",d:"Floor to overhead in one motion. Most technical lift. Coach recommended."},
  {n:"Kettlebell Swing",m:"Glutes",s:"Hamstrings, Back, Core",c:"compound",eq:"other",d:"Hinge, hike kettlebell back. Snap hips forward, kettlebell to chest height. Power from hips, not arms."},
  {n:"Burpee",m:"Full Body",s:"Cardio",c:"compound",eq:"bodyweight",d:"Squat down, jump back to plank, push-up, jump forward, jump up. Brutal conditioning tool."}
];

// === CUSTOM EXERCISE DB ===
const CUST_KEY='wt_custom_ex';
function getCustomExercises(){try{return JSON.parse(localStorage.getItem(CUST_KEY)||'[]');}catch{return [];}}
function saveCustomExercises(arr){localStorage.setItem(CUST_KEY,JSON.stringify(arr));}
function addCustomExercise(){
  const name=plainImportedText(document.getElementById('cust-name').value.trim(),100);
  if(!name){toast('Vnesi ime','err');return;}
  const muscle=document.getElementById('cust-muscle').value;
  const cat=document.getElementById('cust-cat').value;
  const desc=plainImportedText(document.getElementById('cust-desc').value.trim(),1000);
  const list=getCustomExercises();
  if(list.find(e=>e.n.toLowerCase()===name.toLowerCase())){toast('Vaja že obstaja','err');return;}
  list.push({n:name,muscle,cat,desc,created:new Date().toISOString()});
  saveCustomExercises(list);
  document.getElementById('cust-name').value='';
  document.getElementById('cust-desc').value='';
  toast('✓ Vaja dodana','ok');
  renderCustomExList();
}
async function deleteCustomExercise(name){
  if(!await uiConfirm('Izbrišem vajo "'+name+'"?'))return;
  const list=getCustomExercises().filter(e=>e.n!==name);
  saveCustomExercises(list);
  renderCustomExList();
  toast('Izbrisana','ok');
}
function renderCustomExList(){
  const el=document.getElementById('custom-ex-list');if(!el)return;
  const list=getCustomExercises();
  if(list.length===0){el.innerHTML='<div style="font-size:11px;color:var(--text3);padding:.4rem;">Nobene shranjene vaje.</div>';return;}
  el.innerHTML=list.map(e=>`<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;padding:6px;border-bottom:.5px solid var(--border);font-size:12px;">
    <div style="flex:1;min-width:0;">
      <div style="color:var(--text);font-weight:500;">${safeHtml(e.n)}</div>
      <div style="color:var(--text3);font-size:10px;margin-top:2px;">${safeHtml(e.muscle)} · ${e.cat==='compound'?'compound':'izolacija'}</div>
      ${e.desc?`<div style="color:var(--text2);font-size:11px;margin-top:3px;line-height:1.3;">${safeHtml(e.desc)}</div>`:''}
    </div>
    <button class="bk-item-btn del" onclick="deleteCustomExercise(decodeURIComponent('${encodeURIComponent(e.n)}'))">×</button>
  </div>`).join('');
}
function initStepUI(){
  const ks=document.getElementById('kg-step-sel');if(ks)ks.value=String(getKgStep());
  const rs=document.getElementById('reps-step-sel');if(rs)rs.value=String(getRepsStep());
}
function stepKg(exKey,si,di,ei,cn,delta,isBarbell){
  const inp=document.querySelector(`#row-${exKey}-${si} .wi`);
  if(!inp)return;
  const cur=parseFloat(inp.value)||0;
  const newVal=Math.max(0,Math.round((cur+delta)*100)/100);
  inp.value=newVal;
  sv(exKey,si,'kg',String(newVal),di,ei,cn,isBarbell?1:0);
}
function stepReps(exKey,si,di,ei,cn,delta){
  const inp=document.querySelector(`#row-${exKey}-${si} .ri`);
  if(!inp)return;
  const cur=parseInt(inp.value)||0;
  const newVal=Math.max(0,cur+delta);
  inp.value=newVal;
  sv(exKey,si,'reps',String(newVal),di,ei,cn,0);
}
function useSwap(key,name,origName){
  if(!origName)origName=origNameForKey(key);
  if(!origName){toast('Te vaje ni mogoče zamenjati','err');return;}
  const di=diFromKey(key);
  const all=getDayLists();const arr=all&&all[di];
  if(!arr){toast('Napaka seznama','err');return;}
  const c=getCyc().num;
  const it=arr.find(x=>x.n0===origName)||arr.find(x=>dispNameForItem(x,c,cw)===origName);
  if(!it){toast('Vaja ni najdena','err');return;}
  // Blokiraj kolizijo: novo ime ne sme biti enako prikazu KATEREKOLI druge vaje tega dne
  const clash=arr.some(x=>x.id!==it.id&&dispNameForItem(x,c,cw).toLowerCase()===name.toLowerCase());
  if(clash){toast('Ta vaja že obstaja na tem dnevu — izberi drugo','err');return;}
  mutateDayList(di,list=>{
    const t=list.find(x=>x.id===it.id);
    if(!t)return;
    if(!Array.isArray(t.sw))t.sw=[];
    const last=t.sw[t.sw.length-1];
    if(last&&last.c===c&&last.w===cw)last.n=name; // isti teden: prepiši zadnji vnos
    else t.sw.push({n:name,c:c,w:cw});
  });
  showDay(cd);
  toast('✓ Zamenjano (ta in naslednji tedni)','ok');
}
function useCustomSwap(key,origName){const inp=document.getElementById('swci-'+key);if(!inp||!inp.value.trim())return;useSwap(key,inp.value.trim(),origName);}

// === SWAP DB LIST + SEARCH ===
function renderSwapDBList(exKey,origName,query){
  const q=(query||'').toLowerCase().trim();
  // Združi: custom (z ⭐) + built-in DB
  const customs=getCustomExercises().map(c=>({n:c.n,m:c.muscle,c:c.cat,d:c.desc||'',custom:true}));
  const builtins=EXERCISE_DB.map(e=>({n:e.n,m:e.m,c:e.c,d:e.d,s:e.s,eq:e.eq,custom:false}));
  let all=[...customs,...builtins];
  if(q){
    all=all.filter(e=>e.n.toLowerCase().includes(q)||e.m.toLowerCase().includes(q)||(e.s&&e.s.toLowerCase().includes(q))||(e.eq&&e.eq.toLowerCase().includes(q)));
  }
  if(all.length===0)return '<div style="font-size:11px;color:var(--text3);padding:.5rem;text-align:center;">Ni zadetkov.</div>';
  const onEsc=(origName||'').replace(/'/g,"\\'");
  return all.slice(0,50).map(e=>{
    const star=e.custom?'⭐ ':'';
    const eqIcon={barbell:'🏋',dumbbell:'🔔',cable:'🔗',machine:'⚙',bodyweight:'🤸',other:''}[e.eq]||'';
    const meta=`${e.m}${e.s?' · '+e.s:''} · ${e.c==='compound'?'compound':'isolation'}`;
    return `<div class="sw-item" onclick="useSwap('${exKey}','${e.n.replace(/'/g,"\\'")}','${onEsc}')">
      <div class="sw-item-name">${star}${eqIcon} ${e.n}</div>
      <div class="sw-item-note">${meta}</div>
      ${e.d?`<div style="font-size:10px;color:var(--text3);margin-top:3px;line-height:1.3;">${e.d.slice(0,140)}${e.d.length>140?'…':''}</div>`:''}
    </div>`;
  }).join('');
}

function filterSwapDB(exKey,origName,query){
  const el=document.getElementById('swdb-'+exKey);
  if(el)el.innerHTML=renderSwapDBList(exKey,origName,query);
}
function clearSwap(key,origName){
  if(!origName)origName=origNameForKey(key);
  if(!origName)return;
  const di=diFromKey(key);
  const all=getDayLists();const arr=all&&all[di];
  if(!arr)return;
  const c=getCyc().num;
  const it=arr.find(x=>dispNameForItem(x,c,cw).toLowerCase()!==x.n0.toLowerCase()&&(x.n0===origName||dispNameForItem(x,c,cw)===origName));
  if(!it)return;
  mutateDayList(di,list=>{
    const t=list.find(x=>x.id===it.id);
    if(!t||!Array.isArray(t.sw))return;
    const last=t.sw[t.sw.length-1];
    if(last&&last.c===c&&last.w===cw)t.sw.pop(); // swap iz istega tedna: samo razveljavi
    else t.sw.push({n:t.n0,c:c,w:cw}); // sicer: revert od zdaj naprej (pretekli tedni ostanejo)
    if(t.sw.length===0)delete t.sw;
  });
  showDay(cd);
  toast('↺ Original','ok');
}

function wuHint(e,sets){
  const fkg=parseFloat(sets[0]?.kg)||0;
  if(fkg<=0)return`<div class="wubox">Vnesi težo v S1 za ogrevanje</div>`;
  const type=e.n.toLowerCase().includes('squat')||e.n.toLowerCase().includes('deadlift')||e.n.toLowerCase().includes('leg press')?'lower':'upper';
  const wu=buildWU(fkg,type);
  return`<div class="wubox"><strong>Ogrevanje:</strong> ${wu.map(w=>`${w.pct===0?'Palica':w.pct+'%'}→${w.kg}kg×${w.reps}`).join(' · ')}</div>`;
}
function buildWU(wkg,type){
  const bar=20;
  if(type==='lower')return[{pct:0,kg:bar,reps:10},{pct:40,kg:rnd(wkg*.4),reps:8},{pct:60,kg:rnd(wkg*.6),reps:5},{pct:75,kg:rnd(wkg*.75),reps:3},{pct:90,kg:rnd(wkg*.9),reps:1}];
  return[{pct:0,kg:bar,reps:10},{pct:50,kg:rnd(wkg*.5),reps:8},{pct:70,kg:rnd(wkg*.7),reps:5},{pct:85,kg:rnd(wkg*.85),reps:2}];
}
function rnd(n){return Math.round(n/2.5)*2.5;}

// === DINAMIČNO OGREVANJE za vsako vajo ===
function showDynWarmup(exKey,di,ei){
  const box=document.getElementById('wu-dyn-'+exKey);
  if(!box)return;
  if(box.innerHTML){box.innerHTML='';return;}
  const all=getSets();
  const fkg=parseFloat((all[exKey]&&all[exKey][0]&&all[exKey][0].kg)||0);
  if(fkg<=0){box.innerHTML='<div class="wubox">Vnesi delovno težo v 1. serijo</div>';return;}
  const exName=(PROG.days[di].ex[ei]||{}).n||'';
  const lower=/squat|deadlift|leg press|lunge|hip thrust|rdl|romanian/i.test(exName);
  const wu=buildWU(fkg,lower?'lower':'upper');
  box.innerHTML=`<div class="wubox"><strong>Ogrevanje do ${fkg}kg:</strong><br>${wu.map(w=>`${w.pct===0?'Palica':w.pct+'%'} → <strong>${w.kg}kg</strong> × ${w.reps}`).join('<br>')}</div>`;
}

// === PRE-FILL naslednje sesije ===
function prefillFromLastSession(di){
  const all=getSets();
  const cyc=getCyc();
  let filled=0;
  PROG.days[di].ex.forEach((e,ei)=>{
    const curKey=sdk(cyc.num,cw,di,ei);
    const cur=all[curKey];
    if(cur&&cur.some(s=>s.kg))return;
    let lastKg=null;
    outer:
    for(let c=cyc.num;c>=1;c--){
      const wStart=(c===cyc.num)?cw-1:3;
      for(let w=wStart;w>=0;w--){
        const k=sdk(c,w,di,ei);
        if(all[k]){
          const done=all[k].filter(s=>s.done&&s.kg);
          if(done.length>0){
            const top=done.reduce((a,b)=>parseFloat(b.kg)>parseFloat(a.kg)?b:a);
            lastKg=parseFloat(top.kg);
            break outer;
          }
        }
      }
    }
    if(lastKg){
      const n=nsf(di,ei,PROG.weeks[cw],curKey);
      if(!all[curKey])all[curKey]=Array.from({length:n},()=>({kg:'',reps:'',done:false}));
      for(let i=0;i<n;i++){
        if(!all[curKey][i])all[curKey][i]={kg:'',reps:'',done:false};
        if(!all[curKey][i].kg)all[curKey][i].kg=String(lastKg);
      }
      filled++;
    }
  });
  if(filled>0){saveSets(all);showDay(di);toast(`✓ Predizpolnjeno ${filled} vaj`,'ok');}
  else toast('Ni prejšnjih podatkov','err');
}

// === REP PR tracking ===
function getRepPRs(){try{return JSON.parse(localStorage.getItem('wt_rep_prs')||'{}');}catch{return {};}}
function saveRepPRs(d){localStorage.setItem('wt_rep_prs',JSON.stringify(d));}
function checkRepPR(exName,kg,reps){
  if(!exName||!kg||!reps)return false;
  const prs=getRepPRs();
  if(!prs[exName])prs[exName]={};
  const cur=prs[exName][reps]||0;
  if(kg>cur){prs[exName][reps]=kg;saveRepPRs(prs);return cur>0;}
  return false;
}

// === TONNAGE TREND ===
function getTonnageHistory(){
  const sessions=getSessions().slice().reverse();
  const all=getSets();
  return sessions.map(s=>{
    const di=DAY_NAMES.indexOf(s.dayName);
    let tonnage=0;
    if(di>=0){
      // SAMO pravi teden te sesije (weekNum je 1-indexed)
      const w=Math.max(0,(s.weekNum||1)-1);
      for(let ei=0;ei<20;ei++){
        const k=sdk(s.cycle,w,di,ei);
        if(all[k])all[k].filter(x=>x.done&&x.kg&&x.reps).forEach(x=>{
          tonnage+=(parseFloat(x.kg)||0)*(parseFloat(x.reps)||0);
        });
      }
    }
    return {date:s.date,day:s.dayName,tonnage:Math.round(tonnage)};
  }).filter(t=>t.tonnage>0);
}
let tonnageChart=null;
function renderTonnageChart(){
  const hist=getTonnageHistory();
  const canvas=document.getElementById('tonnage-chart');
  const empty=document.getElementById('tonnage-empty');
  if(!canvas)return;
  if(hist.length<2){
    if(empty)empty.style.display='block';canvas.style.display='none';
    if(tonnageChart){tonnageChart.destroy();tonnageChart=null;}
    return;
  }
  if(empty)empty.style.display='none';canvas.style.display='block';
  if(tonnageChart)tonnageChart.destroy();
  const isDark=document.documentElement.getAttribute('data-theme')!=='light';
  tonnageChart=new Chart(canvas.getContext('2d'),{
    type:'bar',
    data:{labels:hist.slice(-20).map(h=>h.date.slice(5)),datasets:[{label:'Tonaža (kg)',data:hist.slice(-20).map(h=>h.tonnage),backgroundColor:'#378add'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{color:isDark?'#9da3ae':'#666'},grid:{color:isDark?'#2e3035':'#eee'}},x:{ticks:{color:isDark?'#9da3ae':'#666'},grid:{display:false}}}}
  });
}

// === FREKVENCA MIŠIC ===
function renderMuscleFrequency(){
  const sessions=getSessions();
  const weekAgo=Date.now()-7*86400000;
  const recent=sessions.filter(s=>new Date(s.date).getTime()>=weekAgo);
  const freq={};
  recent.forEach(s=>{
    const di=DAY_NAMES.indexOf(s.dayName);if(di<0)return;
    const seen=new Set();
    PROG.days[di]&&PROG.days[di].ex.forEach(e=>{
      let map=EX_MAP[e.n];
      if(!map){const db=EXERCISE_DB.find(x=>x.n===e.n);if(db)map={p:[db.m]};}
      if(map&&map.p)map.p.forEach(m=>seen.add(m));
    });
    seen.forEach(m=>{freq[m]=(freq[m]||0)+1;});
  });
  const muscles=Object.keys(VOL_TARGETS);
  const rows=muscles.map(m=>{
    const f=freq[m]||0;
    let cls,msg;
    if(f===0){cls='vl-low';msg='0× ni treniran';}
    else if(f===1){cls='vl-high';msg='1× — lahko 2×';}
    else{cls='vl-opt';msg=`${f}× ✓`;}
    return `<div class="bpr-row"><span>${m}</span><span class="vl-tag ${cls}">${msg}</span></div>`;
  }).join('');
  return `<div style="font-size:10px;color:var(--text3);margin-bottom:6px;">2× tedensko je za večino bolje kot 1×</div>${rows}`;
}

// === CILJI + NAPOVED ===
function getGoals(){try{return JSON.parse(localStorage.getItem('wt_goals')||'[]');}catch{return [];}}
function saveGoals(g){localStorage.setItem('wt_goals',JSON.stringify(g));}
function addGoal(){
  const ex=document.getElementById('goal-ex').value;
  const target=parseFloat(document.getElementById('goal-target').value);
  const date=document.getElementById('goal-date').value;
  if(!ex||!target||!date){toast('Izpolni vsa polja','err');return;}
  const goals=getGoals();
  goals.push({ex,target,date});
  saveGoals(goals);
  document.getElementById('goal-target').value='';
  renderGoals();
  toast('✓ Cilj dodan','ok');
}
function deleteGoal(idx){const g=getGoals();g.splice(idx,1);saveGoals(g);renderGoals();}
function renderGoals(){
  const el=document.getElementById('goals-list');if(!el)return;
  const sel=document.getElementById('goal-ex');
  if(sel&&!sel._filled){
    const allNames=[...new Set([...Object.values(BIG_LIFTS),...EXERCISE_DB.map(e=>e.n)])];
    sel.innerHTML=allNames.map(n=>`<option value="${n}">${n}</option>`).join('');
    sel._filled=true;
  }
  const goals=getGoals();
  if(goals.length===0){el.innerHTML='<div style="font-size:12px;color:var(--text3);padding:.5rem;">Ni ciljev.</div>';return;}
  const hist=getE1RMHistory();
  el.innerHTML=goals.map((g,idx)=>{
    let cur=0;
    if(hist[g.ex]&&hist[g.ex].length>0)cur=hist[g.ex][hist[g.ex].length-1].e1rm;
    const pct=Math.min(100,Math.round((cur/g.target)*100));
    const daysLeft=Math.ceil((new Date(g.date)-Date.now())/86400000);
    let forecast='';
    if(hist[g.ex]&&hist[g.ex].length>=2){
      const data=hist[g.ex];
      const first=data[0],last=data[data.length-1];
      const daysSpan=(new Date(last.date)-new Date(first.date))/86400000||1;
      const ratePerDay=(last.e1rm-first.e1rm)/daysSpan;
      if(ratePerDay>0){
        const daysToGoal=(g.target-cur)/ratePerDay;
        const reachDate=new Date(Date.now()+daysToGoal*86400000);
        forecast=daysToGoal<=daysLeft?`✓ Na pravi poti (~${reachDate.toLocaleDateString('sl-SI')})`:`⚠ Prepočasi (~${reachDate.toLocaleDateString('sl-SI')})`;
      }else forecast='Stagnacija — ni napredka';
    }
    return `<div style="padding:8px;border-bottom:.5px solid var(--border);">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong style="font-size:13px;">${g.ex}</strong>
        <button class="bk-item-btn del" style="font-size:11px;" onclick="deleteGoal(${idx})">×</button>
      </div>
      <div style="font-size:11px;color:var(--text2);margin:3px 0;">Cilj ${g.target}kg · trenutno ${cur||'?'}kg · ${daysLeft>0?daysLeft+' dni':'rok potekel'}</div>
      <div style="height:8px;background:var(--bg3);border-radius:4px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${pct>=100?'var(--green)':'var(--blue)'};"></div></div>
      ${forecast?`<div style="font-size:10px;color:var(--text3);margin-top:3px;">${forecast}</div>`:''}
    </div>`;
  }).join('');
}

// === ENERGIJA / INJURY LOG ===
function getDayLog(){try{return JSON.parse(localStorage.getItem('wt_daylog')||'{}');}catch{return {};}}
function saveDayLog(d){localStorage.setItem('wt_daylog',JSON.stringify(d));}
function setEnergy(val){
  const log=getDayLog();
  const today=new Date().toISOString().split('T')[0];
  if(!log[today])log[today]={};
  log[today].energy=val;
  saveDayLog(log);
  document.querySelectorAll('.energy-btn').forEach((b,i)=>b.classList.toggle('on',i+1===val));
  toast('✓ Energija '+val+'/5','ok');
}
// === KOFEIN & SPANJE ===
function logCaffeineSleep(){
  const caf=parseFloat(document.getElementById('caffeine-in').value);
  const slp=parseFloat(document.getElementById('sleep-in').value);
  if((isNaN(caf)||caf<0)&&(isNaN(slp)||slp<0)){toast('Vnesi kofein ali spanje','err');return;}
  const log=getDayLog();
  const today=new Date().toISOString().split('T')[0];
  if(!log[today])log[today]={};
  if(!isNaN(caf)&&caf>=0)log[today].caffeine=caf;
  if(!isNaN(slp)&&slp>=0)log[today].sleep=slp;
  saveDayLog(log);
  document.getElementById('caffeine-in').value='';
  document.getElementById('sleep-in').value='';
  renderCaffeineSleep();
  toast('✓ Zabeleženo za danes','ok');
}
function renderCaffeineSleep(){
  const el=document.getElementById('cs-log');if(!el)return;
  const log=getDayLog();
  const today=new Date().toISOString().split('T')[0];
  // Današnji vnos
  const t=log[today]||{};
  let todayHtml='';
  if(t.caffeine!==undefined||t.sleep!==undefined){
    todayHtml=`<div style="font-size:12px;color:var(--text2);background:var(--bg3);padding:8px;border-radius:6px;margin:8px 0;text-align:center;">Danes: ${t.caffeine!==undefined?`☕ ${t.caffeine}mg`:''} ${t.caffeine!==undefined&&t.sleep!==undefined?'·':''} ${t.sleep!==undefined?`😴 ${t.sleep}h`:''}</div>`;
  }
  // Zgodovina zadnjih 14 dni
  const entries=Object.entries(log).filter(([d,v])=>v.caffeine!==undefined||v.sleep!==undefined).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,14);
  if(entries.length===0){el.innerHTML=todayHtml||'<div style="font-size:11px;color:var(--text3);padding:.4rem;">Ni zapisov.</div>';return;}
  // Povprečja
  const cafVals=entries.filter(([d,v])=>v.caffeine!==undefined).map(([d,v])=>v.caffeine);
  const slpVals=entries.filter(([d,v])=>v.sleep!==undefined).map(([d,v])=>v.sleep);
  const avgCaf=cafVals.length?Math.round(cafVals.reduce((a,b)=>a+b,0)/cafVals.length):null;
  const avgSlp=slpVals.length?(slpVals.reduce((a,b)=>a+b,0)/slpVals.length).toFixed(1):null;
  let html=todayHtml;
  if(avgCaf!==null||avgSlp!==null){
    html+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0;">
      ${avgCaf!==null?`<div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:700;color:#a16207;">${avgCaf}mg</div><div style="font-size:10px;color:var(--text3);">povp. kofein</div></div>`:''}
      ${avgSlp!==null?`<div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:700;color:var(--blue-text);">${avgSlp}h</div><div style="font-size:10px;color:var(--text3);">povp. spanje</div></div>`:''}
    </div>`;
  }
  html+=entries.map(([date,v])=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:.5px solid var(--border);">
    <span style="color:var(--text3);font-size:11px;">${new Date(date).toLocaleDateString('sl-SI')}</span>
    <span>${v.caffeine!==undefined?`☕ ${v.caffeine}mg`:''} ${v.sleep!==undefined?`<span style="color:var(--blue-text);margin-left:8px;">😴 ${v.sleep}h</span>`:''}</span>
  </div>`).join('');
  el.innerHTML=html;
}

async function sv(key,si,field,val,di,ei,cn,isBarbell){
  // Validacija
  let inpSel='.ri';
  if(field==='kg'||field==='kgR'){
    inpSel=field==='kgR'?'.wi:nth-of-type(2)':'.wi';
  }
  const inpEl=document.querySelector(`#row-${key}-${si} ${inpSel}`);
  if(val!==''&&val!==undefined&&val!==null){
    const num=parseFloat(val);
    if(isNaN(num)||num<0){
      toast((field==='kg'||field==='kgR')?'Negativna teža?':'Negativne pon?','err');
      if(inpEl){inpEl.value='';inpEl.classList.add('invalid');setTimeout(()=>inpEl.classList.remove('invalid'),1500);}
      return;
    }
    if((field==='kg'||field==='kgR')&&num>500){
      if(!await uiConfirm(`${num}kg — si prepričan? (verjetno tipkarska napaka)`)){
        if(inpEl)inpEl.value='';return;
      }
    }
    if(field==='reps'&&num>100){
      if(!await uiConfirm(`${num} ponovitev — si prepričan?`)){
        if(inpEl)inpEl.value='';return;
      }
    }
  }
  if(inpEl)inpEl.classList.remove('invalid');
  const wk=PROG.weeks[cw],n=nsf(di,ei,wk,key),all=getSets();
  if(!all[key])all[key]=Array.from({length:n},()=>({kg:'',reps:'',done:false}));
  while(all[key].length<=si)all[key].push({kg:'',reps:'',done:false});
  all[key][si][field]=val;
  // Shrani ime vaje ob vnosu (za ločeno zgodovino po vaji ob zamenjavi)
  const _exObj=PROG.days[di].ex[ei];
  const _curName=getSwappedName(key,_exObj?_exObj.n:'',_exObj&&_exObj.extra);
  if(_curName){all[key][si].exName=_curName;all[key][si].exerciseId=exStableId(_curName);}
  saveSets(all);
  rebuildRows(key,di,ei,wk,n,all[key]);checkPR(key,di,ei,all[key]);
  if(field==='kg'){
    const kg=parseFloat(val)||0;
    if(kg>0){
      const cur=getSets();
      for(let i=si+1;i<n;i++){
        if(!cur[key][i])cur[key][i]={kg:'',reps:'',done:false};
        if(!cur[key][i].kg&&!cur[key][i].done){
          cur[key][i].kg=val;
          const inp=document.querySelector(`#row-${key}-${i} .wi`);
          if(inp)inp.value=val;
        }
      }
      saveSets(cur);
    }
    if(PROG.days[di].ex[ei].m&&cw===0){const box=document.querySelector(`#ec-${key} .wubox`);if(box){const fkg=parseFloat(all[key][0]?.kg)||0;if(fkg>0){const type=PROG.days[di].ex[ei].n.toLowerCase().includes('squat')||PROG.days[di].ex[ei].n.toLowerCase().includes('deadlift')||PROG.days[di].ex[ei].n.toLowerCase().includes('leg press')?'lower':'upper';const wu=buildWU(fkg,type);box.innerHTML=`<strong>Ogrevanje:</strong> ${wu.map(w=>`${w.pct===0?'Palica':w.pct+'%'}→${w.kg}kg×${w.reps}`).join(' · ')}`;}}}
    if(isBarbell){
      updatePlMini(key,si,kg);
      // Posodobi velik plate box ne glede na set — kaže zadnjo vneseno težo
      if(kg>0)updatePlateBox(key,kg);
      // Posodobi tudi vrstice, ki so dobile auto-fill enako težo
      if(kg>0){
        for(let i=si+1;i<n;i++){
          const inp=document.querySelector(`#row-${key}-${i} .wi`);
          if(inp&&parseFloat(inp.value)===kg)updatePlMini(key,i,kg);
        }
      }
    }
  }
}

function updatePlateBox(key,kg){
  const pb=document.getElementById('pb-'+key);if(!pb)return;
  if(kg<=0){pb.innerHTML='<span style="color:var(--text3);">Vnesi težo v S1 za prikaz plošč</span>';return;}
  const pl=calcPlatesFor(kg);
  if(pl)pb.innerHTML=`<strong>Vsaka stran:</strong> ${pl.each}<span class="pl-each">Palica ${pl.bar}kg + ${pl.perSide*2}kg = ${pl.total}kg</span>`;
  else pb.innerHTML=`Ni možno sestaviti ${kg}kg s trenutnimi ploščami.`;
}

// Posodobi mini prikaz plošč pod posameznim setom (varno tudi za non-barbell — element ne obstaja)
function updatePlMini(key,si,kg){
  const el=document.getElementById(`pl-${key}-${si}`);
  if(!el)return;
  const pls=platesShort(kg);
  el.textContent=pls.text;
  el.className='pl-mini '+pls.cls;
}

function rebuildRows(key,di,ei,wk,n,sets){
  const tb=document.getElementById('rows-'+key);if(!tb)return;
  tb.querySelectorAll('tr').forEach((row,si)=>{if(si>=n)return;const s=sets[si]||{};const vol=Math.round((parseFloat(s.kg)||0)*(parseFloat(s.reps)||0));const orm=s.kg&&s.reps?Math.round(parseFloat(s.kg)*(1+parseFloat(s.reps)/30)):'';const vc=row.querySelector('.vc'),oc=row.querySelector('.oc');if(vc){vc.textContent=vol>0?vol+'kg':'';vc.className='vc'+(vol>0?' hv':'');}if(oc)oc.textContent=orm?orm+'kg':'';});
  const tv=sets.slice(0,n).reduce((s,x)=>(parseFloat(x.kg)||0)*(parseFloat(x.reps)||0)+s,0);
  const card=document.getElementById('ec-'+key);
  if(card){let vt=card.querySelector('.vol-total');if(!vt){vt=document.createElement('div');vt.className='vol-total';vt.style.cssText='font-size:11px;color:var(--green-text);margin-top:4px;text-align:right;';card.querySelector('.st').after(vt);}vt.textContent=tv>0?'Skupaj: '+Math.round(tv).toLocaleString()+' kg':'';}
}

// Posodobi summary stats + toggle gumb v kartici (brez full re-rendera)
function rerenderExCard(key,di,ei,cn){
  const card=document.getElementById('ec-'+key);if(!card)return;
  const wk=PROG.weeks[cw],n=nsf(di,ei,wk,key);
  const sets=(getSets()[key]||[]).slice(0,n);
  const doneSets=sets.filter(s=>s.done&&s.kg&&s.reps);
  const topSet=doneSets.length>0?doneSets.reduce((a,b)=>parseFloat(b.kg)>parseFloat(a.kg)?b:a):null;
  const totalVol=doneSets.reduce((a,b)=>a+(parseFloat(b.kg)||0)*(parseFloat(b.reps)||0),0);
  const isAllDone=sets.length>=n&&sets.every(s=>s.done);
  // Update / create summary
  let sm=card.querySelector('.exc-summary');
  if(topSet){
    const sumHTML=`<span class="es-stats">✓ ${doneSets.length}/${n} · top ${topSet.kg}kg×${topSet.reps} · ${Math.round(totalVol)}kg</span><button class="toggle-fold" onclick="toggleFold('${key}')">${card.classList.contains('col-done')?'razširi ▾':'skrči ▴'}</button>`;
    if(!sm){sm=document.createElement('div');sm.className='exc-summary';card.querySelector('.ex-top').after(sm);}
    sm.innerHTML=sumHTML;
  }
  // Toggle gumb v .bdg če je all done
  let inlineFold=card.querySelector('.bdg .toggle-fold');
  if(isAllDone&&!inlineFold){
    const bdg=card.querySelector('.bdg');
    if(bdg){const b=document.createElement('button');b.className='toggle-fold';b.textContent='skrči ▴';b.setAttribute('onclick',`toggleFold('${key}')`);bdg.appendChild(b);}
  } else if(!isAllDone&&inlineFold){
    inlineFold.remove();
  }
}

function checkPR(key,di,ei,sets){
  const prs=getPRs(),prk=`pr${di}${ei}`;
  const cpr=typeof prs[prk]==='object'?prs[prk].kg:(prs[prk]||0);
  // Najdi top set (max kg, ali pri tied max e1RM)
  let bestSet=null,bestE1=0;
  sets.forEach(s=>{
    if(!s.kg||!s.reps)return;
    const e1=parseFloat(s.kg)*(1+parseInt(s.reps)/30);
    if(e1>bestE1){bestE1=e1;bestSet=s;}
  });
  const maxKg=bestSet?parseFloat(bestSet.kg):0;
  const card=document.getElementById('ec-'+key);if(!card)return;
  const exName=(PROG.days[di].ex[ei]||{}).n||'Vaja';
  // Rep PR — preveri vsak opravljeni set posebej
  let repPRhit=false;
  sets.forEach(s=>{
    if(s.done&&s.kg&&s.reps){
      if(checkRepPR(exName,parseFloat(s.kg),parseInt(s.reps)))repPRhit=true;
    }
  });
  if(maxKg>cpr&&maxKg>0){
    const history=(typeof prs[prk]==='object'&&Array.isArray(prs[prk].history))?prs[prk].history:[];
    history.unshift({kg:maxKg,reps:parseInt(bestSet.reps),date:new Date().toISOString().split('T')[0]});
    prs[prk]={kg:maxKg,reps:parseInt(bestSet.reps),date:new Date().toISOString().split('T')[0],exName,history:history.slice(0,20)};
    savePRs(prs);
    card.classList.add('pr-card');
    let pb=card.querySelector('.prb');
    if(!pb){pb=document.createElement('span');pb.className='b prb';pb.textContent='PR';card.querySelector('.bdg').appendChild(pb);}
    const bn=document.getElementById('pr-banner');
    if(bn){bn.textContent=`Nov PR: ${exName} — ${maxKg}kg × ${bestSet.reps}! 💪`;bn.classList.add('visible');setTimeout(()=>bn.classList.remove('visible'),4000);}
  } else if(repPRhit){
    const bn=document.getElementById('pr-banner');
    if(bn){bn.textContent=`Rep PR: ${exName}! 💪`;bn.classList.add('visible');setTimeout(()=>bn.classList.remove('visible'),3000);}
  }
}

// Premakni zeleni "next-set" poudarek na prvo nedokončano serijo (gym mode)
function updateNextSetHighlight(key){
  const all=getSets();
  const sets=all[key]||[];
  let nextSi=-1;
  for(let i=0;i<sets.length;i++){if(!sets[i].done){nextSi=i;break;}}
  let i=0;
  while(true){
    const r=document.getElementById(`row-${key}-${i}`);
    if(!r)break;
    r.classList.toggle('next-set',i===nextSi);
    i++;
  }
}

function tgSet(key,si,di,ei,cn){
  const wk=PROG.weeks[cw],n=nsf(di,ei,wk,key),all=getSets();
  if(!all[key])all[key]=Array.from({length:n},()=>({kg:'',reps:'',done:false}));
  all[key][si].done=!all[key][si].done;
  if(all[key][si].done&&navigator.vibrate)navigator.vibrate(25);
  // Shrani ime vaje (za ločeno zgodovino ob zamenjavi)
  const _exO=PROG.days[di].ex[ei];
  const _cn=getSwappedName(key,_exO?_exO.n:'',_exO&&_exO.extra);
  if(_cn){all[key][si].exName=_cn;all[key][si].exerciseId=exStableId(_cn);}
  saveSets(all);
  const btns=document.querySelectorAll(`#ec-${key} .lb`);
  if(btns[si]){btns[si].classList.toggle('done',all[key][si].done);btns[si].textContent=all[key][si].done?'✓':'Zapiši';btns[si].setAttribute('aria-label',(all[key][si].done?'Razveljavi':'Zabeleži')+' set '+(si+1));}
  if(all[key][si].done){
    // Drop set ne sproži timer-ja (gre takoj naprej)
    if(!all[key][si].drop){
      const _e=PROG.days[di].ex[ei];
      const _nm=getSwappedName(key,_e?_e.n:'',_e&&_e.extra);
      startT(key,restForEx(_e&&_e.id,_nm,_e?_e.r:90));
    }
    const nextSi=si+1;
    if(nextSi<n){
      if(!all[key][nextSi])all[key][nextSi]={kg:'',reps:'',done:false};
      const curKg=all[key][si].kg,curReps=all[key][si].reps;
      // Pri drop setu NE auto-filla naslednjega — manj teže pričakovano
      if(!all[key][si].drop){
        if(curKg&&!all[key][nextSi].kg){all[key][nextSi].kg=curKg;const iw=document.querySelector(`#row-${key}-${nextSi} .wi`);if(iw)iw.value=curKg;updatePlMini(key,nextSi,parseFloat(curKg)||0);}
        if(curReps&&!all[key][nextSi].reps){all[key][nextSi].reps=curReps;const ir=document.querySelector(`#row-${key}-${nextSi} .ri`);if(ir)ir.value=curReps;}
      }
      saveSets(all);
    }
  }
  const cnt=PROG.days[di].ex.filter((_,i)=>!isExHidden(sdk(cn,cw,di,i))&&allDone(di,i)).length;
  const el=document.getElementById('ex-done');if(el)el.textContent=cnt;
  if(typeof updateNextSetHighlight==='function')updateNextSetHighlight(key);
  if(typeof updateTabColors==='function')updateTabColors();
  if(typeof refreshGymTarget==='function')refreshGymTarget();
  // Auto-scroll na naslednjo nedokončano vajo, ko se trenutna v celoti zaključi
  if(allDone(di,ei)){
    // Auto-collapse trenutno (razen če je user ročno razširil)
    if(foldState[key]!==false){
      const card=document.getElementById('ec-'+key);
      if(card){
        // Posodobi summary preden skrčimo
        rerenderExCard(key,di,ei,cn);
        setTimeout(()=>{
          const c=document.getElementById('ec-'+key);
          if(c)c.classList.add('col-done');
        },400);
      }
    }
    let nextEi=-1;
    for(let i=ei+1;i<PROG.days[di].ex.length;i++){
      if(!allDone(di,i)&&!isExHidden(sdk(cn,cw,di,i))){nextEi=i;break;}
    }
    if(nextEi<0){
      for(let i=0;i<ei;i++){if(!allDone(di,i)&&!isExHidden(sdk(cn,cw,di,i))){nextEi=i;break;}}
    }
    if(nextEi>=0){
      const nextKey=sdk(cn,cw,di,nextEi);
      const nextCard=document.getElementById('ec-'+nextKey);
      if(nextCard){
        setTimeout(()=>{
          nextCard.scrollIntoView({behavior:'smooth',block:'start'});
          // Subtle highlight
          nextCard.style.transition='box-shadow .4s';
          nextCard.style.boxShadow='0 0 0 2px var(--green)';
          setTimeout(()=>nextCard.style.boxShadow='',1500);
        },600);
      }
    } else {
      toast('💪 Vse vaje zaključene!','ok');
    }
  }
}

function saveNote(nk,val){const n=getNotes();n[nk]=val;saveNotes(n);}

// 3-tonska sekvenca, glasnejša od prejšnjega beep-a
function beepSequence(){
  const s=getAlarmSettings();
  if(!s.sound)return;
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    if(ctx.state==='suspended')ctx.resume();
    const tones=MELODIES[s.melody]||MELODIES.default;
    const volMult=(s.volume||90)/100;
    tones.forEach(t=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);
      o.type='sine';o.frequency.value=t.f;
      const start=ctx.currentTime+t.d;
      g.gain.setValueAtTime(0,start);
      g.gain.linearRampToValueAtTime(t.vol*volMult,start+.02);
      g.gain.exponentialRampToValueAtTime(.001,start+t.len);
      o.start(start);o.stop(start+t.len);
    });
  }catch(e){}
}

function alertEnd(key){
  const s=getAlarmSettings();
  const bar=document.getElementById('tb-'+key);
  // Vibracija
  if(s.vibrate&&navigator.vibrate)navigator.vibrate([400,150,400,150,600]);
  // Zvok
  beepSequence();
  // Vizualni flash
  if(bar){
    bar.classList.add('flash');
    const cnt=document.getElementById('tc-'+key);
    if(cnt)cnt.textContent='✓ KONEC';
    setTimeout(()=>{
      if(bar){bar.classList.remove('flash');bar.classList.remove('on');}
      if(cnt)cnt.textContent='—';
    },5000);
  }
  // Push notification
  if(s.notif&&'Notification' in window && Notification.permission==='granted'){
    try{new Notification('Konec odmora 💪',{body:'Naslednja serija!',tag:'workout-rest',renotify:true});}catch(e){}
  }
}

// Active rest timer state (persistira preko reload-a)
const LS_TIMER='wt_active_timer';

function startT(key,secs){
  if(TM[key])clearInterval(TM[key]);
  // Preveri notification permission ob vsakem startu — če manjka, prosi
  if('Notification' in window){
    if(Notification.permission==='default'){
      Notification.requestPermission().then(p=>{
        if(p!=='granted')toast('⚠️ Brez dovoljenja: ni zvoka pri zaklenjenem zaslonu','err');
      });
    } else if(Notification.permission==='denied'){
      // Samo enkrat opozori — ne na vsakem timer startu
      if(!localStorage.getItem('wt_notif_warned')){
        toast('⚠️ Notif blokirane v Settings — ni zvoka v ozadju','err');
        localStorage.setItem('wt_notif_warned','1');
      }
    }
  }
  const endTs=Date.now()+secs*1000;
  localStorage.setItem(LS_TIMER,JSON.stringify({key,endTs}));
  const bar=document.getElementById('tb-'+key),cnt=document.getElementById('tc-'+key);
  if(!bar||!cnt)return;
  bar.classList.add('on');bar.classList.remove('flash');
  scheduleNotification(secs);
  const tick=()=>{
    const rem=Math.max(0,Math.ceil((endTs-Date.now())/1000));
    cnt.textContent=rem;
    if(rem<=0){
      clearInterval(TM[key]);TM[key]=null;
      localStorage.removeItem(LS_TIMER);
      alertEnd(key);
    }
  };
  tick();
  TM[key]=setInterval(tick,250);
}
function stopT(key){
  if(TM[key]){clearInterval(TM[key]);TM[key]=null;}
  localStorage.removeItem(LS_TIMER);
  cancelScheduledNotification();
  const b=document.getElementById('tb-'+key);
  if(b){b.classList.remove('on');b.classList.remove('flash');}
  const c=document.getElementById('tc-'+key);if(c)c.textContent='—';
}

// Scheduled notification — pošlje SW-ju, ki garantirano sproži notif
// tudi če je app v ozadju ali zaslon ugasnjen
let pendingNotifTimeout=null;
let activeTimerId=null;
function scheduleNotification(secs){
  cancelScheduledNotification();
  const s=getAlarmSettings();
  if(!s.notif||!('Notification' in window)||Notification.permission!=='granted')return;
  activeTimerId='t'+Date.now();
  // Pot 1: Service Worker (deluje v ozadju)
  const swOk=swMessage({
    type:'SCHEDULE_REST_END',
    id:activeTimerId,
    delayMs:secs*1000,
    label:'Naslednja serija — gremo!'
  });
  // Pot 2 (fallback): direct setTimeout — če SW ni na voljo
  if(!swOk){
    pendingNotifTimeout=setTimeout(()=>{
      try{
        new Notification('⏰ Konec odmora!',{
          body:'Naslednja serija — gremo!',
          tag:'workout-rest',
          renotify:true,
          vibrate:[400,150,400,150,600],
          requireInteraction:true,
          silent:false
        });
      }catch(e){}
    },secs*1000);
  }
}
function cancelScheduledNotification(){
  if(pendingNotifTimeout){clearTimeout(pendingNotifTimeout);pendingNotifTimeout=null;}
  if(activeTimerId){
    swMessage({type:'CANCEL_REST_END',id:activeTimerId});
    activeTimerId=null;
  }
}

// Obnovi rest timer po reload-u
function restoreTimer(){
  const raw=localStorage.getItem(LS_TIMER);if(!raw)return;
  try{
    const t=JSON.parse(raw);
    const rem=Math.ceil((t.endTs-Date.now())/1000);
    if(rem<=0){localStorage.removeItem(LS_TIMER);return;}
    // Počisti morebitni obstoječi interval za ta key (proti podvajanju ob re-renderju)
    if(TM[t.key]){clearInterval(TM[t.key]);TM[t.key]=null;}
    // Počakaj da DOM zariše vajo, potem zagon
    setTimeout(()=>{
      const bar=document.getElementById('tb-'+t.key);
      if(!bar){return;}  // vaja ni (več) na zaslonu — pusti LS_TIMER, lahko se vrne
      const cnt=document.getElementById('tc-'+t.key);
      bar.classList.add('on');bar.classList.remove('flash');
      if(TM[t.key]){clearInterval(TM[t.key]);}
      const tick=()=>{
        const r=Math.max(0,Math.ceil((t.endTs-Date.now())/1000));
        if(cnt)cnt.textContent=r;
        if(r<=0){clearInterval(TM[t.key]);TM[t.key]=null;localStorage.removeItem(LS_TIMER);alertEnd(t.key);}
      };
      tick();TM[t.key]=setInterval(tick,250);
    },50);
  }catch(e){localStorage.removeItem(LS_TIMER);}
}
function pad(n){return String(n).padStart(2,'0');}

// === SERVICE WORKER REGISTRACIJA ===
let swReg=null;
if('serviceWorker' in navigator){
  // Ko nov SW prevzame nadzor → samodejno osveži stran (dobiš novo vsebino brez ročnega reloada)
  let _swRefreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(_swRefreshing)return;
    _swRefreshing=true;
    window.location.reload();
  });
  window.addEventListener('load',()=>{
    // updateViaCache:'none' → brskalnik VEDNO preveri sw.js po mreži (ne iz HTTP predpomnilnika)
    navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>{
      swReg=reg;
      console.log('SW registriran');
      reg.update(); // takoj preveri za novo verzijo
      reg.addEventListener('updatefound',()=>{
        const nw=reg.installing;
        if(nw){nw.addEventListener('statechange',()=>{
          if(nw.state==='installed'&&navigator.serviceWorker.controller){
            toast('🔄 Posodabljam na novo verzijo...','ok');
          }
        });}
      });
    }).catch(err=>console.warn('SW registracija ni uspela:',err));
    navigator.serviceWorker.ready.then(reg=>{swReg=reg;});
  });
}

// Helper za pošiljanje sporočila SW-ju
function swMessage(msg){
  if(swReg&&swReg.active){
    swReg.active.postMessage(msg);
    return true;
  }
  if(navigator.serviceWorker&&navigator.serviceWorker.controller){
    navigator.serviceWorker.controller.postMessage(msg);
    return true;
  }
  return false;
}

// === SESSION PERSISTENCE ===
const LS_SESS='wt_active_sess';

let activeSessionContext=null;
function tickSessionClock(){const el=document.getElementById('st-d');if(!el||!stStart)return;const d=Math.max(0,Math.floor((Date.now()-stStart)/1000));el.textContent=pad(Math.floor(d/3600))+':'+pad(Math.floor((d%3600)/60))+':'+pad(d%60);}
async function toggleSess(){
  const dot=document.getElementById('sess-dot');
  if(!stRun){
    if('Notification' in window&&Notification.permission==='default'){try{Notification.requestPermission();}catch(e){}}
    sessStart=new Date();stStart=Date.now();stRun=true;activeSessionContext={startMs:stStart,startISO:sessStart.toISOString(),dayIdx:cd,weekIdx:cw,cycle:getCyc().num,profile:getActiveProfile()};
    safeSetRaw(LS_SESS,JSON.stringify(activeSessionContext));
    if(dot)dot.classList.add('on');document.getElementById('st-b').textContent='Zaključi';document.getElementById('st-b').classList.add('active');document.getElementById('st-s').textContent=`${sessStart.toLocaleTimeString('sl-SI',{hour:'2-digit',minute:'2-digit'})} · ${DAY_NAMES[activeSessionContext.dayIdx]}`;
    clearInterval(stInt);stInt=setInterval(tickSessionClock,1000);tickSessionClock();renderTodayCard();return;
  }
  const ctx=activeSessionContext||JSON.parse(localStorage.getItem(LS_SESS)||'{}');
  if(!await uiConfirm(`Zaključi trening ${DAY_NAMES[ctx.dayIdx??cd]}?`,'Zaključi'))return;
  clearInterval(stInt);stRun=false;localStorage.removeItem(LS_SESS);if(dot)dot.classList.remove('on');
  const end=new Date(),dur=Math.floor((end-sessStart)/1000),durMin=Math.max(0,Math.floor(dur/60)),record=buildImmutableSessionRecord(sessStart,end,durMin,ctx),sessions=getSessions();sessions.unshift(record);saveSessions(sessions);
  document.getElementById('st-b').textContent='Začni trening';document.getElementById('st-b').classList.remove('active');document.getElementById('st-d').textContent='00:00:00';document.getElementById('st-s').textContent=`Zadnji: ${durMin}min · ${record.dayName}`;
  sessStart=null;activeSessionContext=null;await autoBackupToIDB();setGymMode(false);renderTodayCard();toast('✓ Trening shranjen + lokalni snapshot','ok');
}
function restoreSession(){
  const raw=localStorage.getItem(LS_SESS);if(!raw)return;
  try{const s=JSON.parse(raw);if(!s.startISO||!Number.isFinite(Number(s.startMs)))throw new Error('bad session');activeSessionContext={...s,cycle:Number(s.cycle)||getCyc().num,profile:s.profile||getActiveProfile()};sessStart=new Date(s.startISO);stStart=Number(s.startMs);stRun=true;if(typeof s.dayIdx==='number')cd=s.dayIdx;if(typeof s.weekIdx==='number')cw=s.weekIdx;
    const dot=document.getElementById('sess-dot');if(dot)dot.classList.add('on');const btn=document.getElementById('st-b');if(btn){btn.textContent='Zaključi';btn.classList.add('active');}const ss=document.getElementById('st-s');if(ss)ss.textContent=`${sessStart.toLocaleTimeString('sl-SI',{hour:'2-digit',minute:'2-digit'})} · ${DAY_NAMES[cd]} (obnovljeno)`;clearInterval(stInt);stInt=setInterval(tickSessionClock,1000);tickSessionClock();showDay(cd);toast('↺ Sesija obnovljena','ok');
  }catch(e){localStorage.removeItem(LS_SESS);activeSessionContext=null;}
}
function cycleExerciseMetrics(cn,di,ei){
  const all=getSets();let done=0,total=0,maxRpe=0,maxPain=0,bestE1rm=0,peak=0;
  for(let w=0;w<4;w++){const key=sdk(cn,w,di,ei),sets=all[key]||[];maxPain=Math.max(maxPain,getPain(key));const n=Math.min(sets.length,nsf(di,ei,PROG.weeks[w],key));sets.slice(0,n).forEach(s=>{total++;if(s.done)done++;const kg=parseFloat(s.kg)||0,reps=parseInt(s.reps)||0,rpe=parseFloat(s.rpe)||0;if(s.done&&kg>0&&reps>0){peak=Math.max(peak,kg);bestE1rm=Math.max(bestE1rm,kg*(1+reps/30));}maxRpe=Math.max(maxRpe,rpe);});}
  return {done,total,completion:total?done/total:0,maxRpe,maxPain,bestE1rm,peak};
}
function smartCycleSuggestion(cn,di,ei,name){
  const cur=cycleExerciseMetrics(cn,di,ei),prev=cn>1?cycleExerciseMetrics(cn-1,di,ei):null,prev2=cn>2?cycleExerciseMetrics(cn-2,di,ei):null,lower=/squat|deadlift|rdl|leg press/i.test(name),inc=lower?5:2.5,base=cur.peak||getWeek1Weight(cn,di,ei)||0;
  if(!base)return {skg:0,sc:'ss',sl:'Brez podatkov',reason:'Ni opravljenih delovnih setov',...cur};
  const trend=prev&&prev.bestE1rm?((cur.bestE1rm-prev.bestE1rm)/prev.bestE1rm)*100:0;
  const twoDrops=prev&&prev2&&prev.bestE1rm<prev2.bestE1rm*.98&&cur.bestE1rm<prev.bestE1rm*.98;
  if(cur.maxPain>=4)return {skg:Math.max(0,roundToPlate(base*.9)),sc:'sd2',sl:'-10%',reason:`Bolečina ${cur.maxPain}/10`,...cur,trend};
  if(twoDrops)return {skg:Math.max(0,base-inc),sc:'sd2',sl:`-${inc}kg`,reason:'Dva zaporedna padca e1RM',...cur,trend};
  if(cur.completion<.7||cur.maxRpe>=10||trend<-4)return {skg:Math.max(0,base-inc),sc:'sd2',sl:`-${inc}kg`,reason:cur.completion<.7?'Preveč zgrešenih setov':cur.maxRpe>=10?'Več grinderjev / RPE 10':'e1RM je opazno padel',...cur,trend};
  if(cur.completion>=.9&&(cur.maxRpe===0||cur.maxRpe<=8.5)&&trend>=-1)return {skg:base+inc,sc:'su',sl:`+${inc}kg`,reason:'Visoka izvedba, nadzorovan RPE in stabilen e1RM',...cur,trend};
  return {skg:base,sc:'ss',sl:'Ohrani',reason:cur.maxRpe>8.5?'RPE je že visok':'Najprej potrdi stabilen napredek',...cur,trend};
}
function renderCycle(){
  const cyc=getCyc(),cn=cyc.num;document.getElementById('cy-title').textContent='Cikel '+cn;document.getElementById('cy-badge').textContent='Cikel '+cn;document.getElementById('next-num').textContent=cn+1;const sd=cyc.startDates||{};document.getElementById('cy-date-label').textContent=sd[cn]?`Začetek: ${sd[cn]}`:'';
  const mainEx=[];PROG.days.forEach((d,di)=>d.ex.forEach((e,ei)=>{if(e.m)mainEx.push({n:e.n,di,ei});}));
  let html=`<div class="cyrow"><div class="cyl" style="color:var(--text3);">Vaja</div><div class="cyh">Peak</div><div class="cyh">Predlog</div><div class="cyh">Akcija</div></div>`;const sugs=[];
  mainEx.forEach(({n,di,ei})=>{const s=smartCycleSuggestion(cn,di,ei,n);sugs.push({n,di,ei,peak:s.peak,skg:s.skg,sc:s.sc,sl:s.sl,reason:s.reason,completion:s.completion,maxRpe:s.maxRpe,maxPain:s.maxPain,trend:s.trend});html+=`<div class="cyrow" title="${safeHtml(s.reason)}"><div class="cyl">${safeHtml(n.split(' ').slice(0,3).join(' '))}</div><div class="cyv">${s.peak>0?s.peak+'kg':'—'}</div><div class="cyv ${s.sc}">${s.skg>0?s.skg+'kg':'—'}</div><div class="cyv ${s.sc}" style="font-size:11px;">${s.skg>0?s.sl:'—'}</div></div>${s.skg>0?`<div style="font-size:10px;color:var(--text3);padding:0 0 6px 4px;">${safeHtml(s.reason)} · ${Math.round(s.completion*100)}% setov${s.maxRpe?' · max RPE '+s.maxRpe:''}${s.maxPain?' · bolečina '+s.maxPain+'/10':''}</div>`:''}`;});
  document.getElementById('cy-content').innerHTML=html;const hasData=sugs.some(s=>s.skg>0),nc=document.getElementById('cy-next-card');
  if(hasData){nc.style.display='block';document.getElementById('cy-next-content').innerHTML=sugs.filter(s=>s.skg>0).map(s=>`<div class="mr"><span class="mk">${safeHtml(s.n.split(' ').slice(0,3).join(' '))}<br><small style="color:var(--text3)">${safeHtml(s.reason)}</small></span><span class="mv ${s.sc}">${s.skg}kg <span style="font-size:11px;">(${s.sl})</span></span></div>`).join('');localStorage.setItem('wt_sugs6',JSON.stringify(sugs));}else nc.style.display='none';
  if(cn>1){document.getElementById('cy-hist-card').style.display='block';const sel=document.getElementById('lift-selector');sel.innerHTML=MAIN_LIFTS.map((l,i)=>`<div class="lift-chip${i===activeLift?' on':''}" onclick="selectLift(${i})">${safeHtml(l.split(' ').slice(0,2).join(' '))}</div>`).join('');renderStrengthChart();let hhtml=`<div class="ch-row">${[''].concat(Array.from({length:Math.min(cn,5)},(_,i)=>`C${cn-Math.min(cn,5)+1+i}`)).map((h,i)=>`<div class="${i===0?'ch-hd':'ch-cy'}">${h}</div>`).join('')}</div>`;mainEx.forEach(({n,di,ei})=>{hhtml+=`<div class="ch-row"><div style="font-size:10px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${safeHtml(n.split(' ').slice(0,2).join(' '))}</div>`;for(let c=Math.max(1,cn-4);c<=cn;c++){const v=getPeakForExercise(c,di,ei),prev=c>1?getPeakForExercise(c-1,di,ei):0;hhtml+=`<div class="ch-val ${v>prev&&v>0?'ch-up':''}">${v>0?v+'kg':'—'}</div>`;}hhtml+='</div>';});document.getElementById('cy-hist-content').innerHTML=hhtml;}else document.getElementById('cy-hist-card').style.display='none';
  const cynotes=getCyNotes(),noteEntries=Object.entries(cynotes).filter(([,v])=>v);if(noteEntries.length>0){document.getElementById('cy-notes-hist-card').style.display='block';document.getElementById('cy-notes-hist').innerHTML=noteEntries.map(([k,v])=>`<div style="padding:8px 0;border-bottom:.5px solid var(--border);"><div style="font-size:11px;color:var(--purple-text);margin-bottom:3px;">Cikel ${safeHtml(k)}</div><div style="font-size:12px;color:var(--text2);">${safeHtml(v)}</div></div>`).join('');}else document.getElementById('cy-notes-hist-card').style.display='none';
}
function selectLift(idx){activeLift=idx;document.querySelectorAll('.lift-chip').forEach((c,i)=>c.classList.toggle('on',i===idx));renderStrengthChart();}

function renderStrengthChart(){
  const cyc=getCyc(),cn=cyc.num;if(cn<2)return;
  const liftName=MAIN_LIFTS[activeLift];
  let di=-1,ei=-1;
  PROG.days.forEach((d,dIdx)=>d.ex.forEach((e,eIdx)=>{if(e.n===liftName){di=dIdx;ei=eIdx;}}));
  if(di<0)return;
  const labels=[],vals=[];
  for(let c=1;c<=cn;c++){const v=getPeakForExercise(c,di,ei);labels.push('C'+c);vals.push(v>0?v:null);}
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  const gc=isDark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.06)',tc=isDark?'#9da3ae':'#666';
  const ctx=document.getElementById('strength-chart')?.getContext('2d');if(!ctx)return;
  if(strengthChart)strengthChart.destroy();
  strengthChart=new Chart(ctx,{type:'line',data:{labels,datasets:[{data:vals,borderColor:'#7f77dd',backgroundColor:'rgba(127,119,221,0.1)',tension:0.3,pointRadius:5,pointBackgroundColor:'#7f77dd',borderWidth:2,spanGaps:true}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{color:tc,font:{size:11}},grid:{color:gc},border:{color:gc}},x:{ticks:{color:tc,font:{size:11}},grid:{display:false},border:{color:gc}}}}});
}

async function confirmNext(){
  await autoBackupToIDB();
  const cyc=getCyc(),newN=cyc.num+1;
  const noteVal=document.getElementById('cy-note-input')?.value||'';
  if(noteVal.trim()){const cn=getCyNotes();cn[cyc.num]=noteVal.trim();saveCyNotes(cn);}
  const startDates=cyc.startDates||{};
  startDates[String(newN)]=new Date().toISOString().split('T')[0];
  saveCyc({num:newN,startDates});
  // Safe parse suggestions
  let sugs=[];
  try{const raw=localStorage.getItem('wt_sugs6');if(raw){const p=JSON.parse(raw);if(Array.isArray(p))sugs=p;}}catch(e){sugs=[];}
  const all=getSets();
  if(sugs.length>0){
    sugs.forEach(s=>{
      if(s&&typeof s.skg==='number'&&s.skg>0&&typeof s.di==='number'&&typeof s.ei==='number'){
        const nk=sdk(newN,0,s.di,s.ei);
        const wk=PROG.weeks[0];
        const baseN=PROG.days[s.di].ex[s.ei].m?wk.sM:wk.sA;
        // Fill all sets with suggested weight
        all[nk]=Array.from({length:Math.max(baseN,5)},()=>({kg:String(s.skg),reps:'',done:false}));
      }
    });
    saveSets(all);
  }
  cw=0;cd=0;
  document.querySelectorAll('.wt').forEach((t,i)=>t.classList.toggle('active',i===0));
  showPage('workout');showDay(0);
  toast(`Cikel ${newN} začet! Teže predizpolnjene v T1.`,'ok');
}

