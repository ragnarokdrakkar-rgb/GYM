function setWeek(w){if(stRun&&activeSessionContext&&w!==activeSessionContext.weekIdx){toast('Teden je med aktivno sesijo zaklenjen.','err');return;}cw=w;localStorage.setItem('wt_last_week',String(w));document.querySelectorAll('.wt').forEach((t,i)=>t.classList.toggle('active',i===w));showDay(cd);}

// Pomožna funkcija: aktivni ex array za dan (privzete + extra)
function getDayExercises(di){
  if(!PROG.days[di])return [];
  const extras=getExtraExercises(di);
  return [...PROG.days[di].ex, ...extras];
}

function showDay(idx){
  if(stRun&&activeSessionContext&&idx!==activeSessionContext.dayIdx){toast('Dan je med aktivno sesijo zaklenjen.','err');return;}
  cd=idx;
  localStorage.setItem('wt_last_day',String(idx));
  document.querySelectorAll('.dt').forEach((t,i)=>t.classList.toggle('active',i===idx));
  const d=PROG.days[idx],wk=PROG.weeks[cw],cyc=getCyc();
  // Shrani originalni seznam vaj ENKRAT (preden se d.ex kdaj prepiše z mixed)
  if(d._origEx===undefined)d._origEx=d.ex.slice();
  if(d._origLen===undefined)d._origLen=d._origEx.length;
  // Original vaje (vedno prisotne) + extra (uporabnikove) — vedno iz stabilnega vira
  let mixed=buildDayExList(idx);
  d.ex=mixed;
  const allEx=d.ex;
  const visIdx=allEx.map((_,i)=>i).filter(i=>!isExHidden(sdk(cyc.num,cw,idx,i)));
  const done=visIdx.filter(i=>allDone(idx,i)).length;
  const nk=`notes-c${cyc.num}w${cw}d${idx}`;
  const nv=getNotes()[nk]||'';
  let html=`<div class="day-title">${safeHtml(d.title)}</div><div class="day-sub">${safeHtml(d.sub)}</div><div class="tags">${d.tags.map(t=>`<span class="tag ${t.p?'tag-p':'tag-s'}">${safeHtml(t.t)}</span>`).join('')}</div><div class="gym-target" id="gym-target">Fokus: najprej začni trening, nato zabeleži naslednji set.</div>`;
  if(wk.dl){html+=`<div class="dbox">Deload teden — 60–65% teže iz tedna 1. Ustavi 4–5 pon. pred odpovedjo. Maks 3 serije.</div>`;}
  else{html+=`<div class="pg"><div class="pc"><div class="pn">${visIdx.length}</div><div class="pl-label">vaj</div></div><div class="pc"><div class="pn" id="ex-done">${done}</div><div class="pl-label">opravljenih</div></div><div class="pc"><div class="pn">${wk.reps}</div><div class="pl-label">ponovitve</div></div><div class="pc"><div class="pn">${wk.rpe}</div><div class="pl-label">intenzivnost</div></div></div>`;}
  html+=allEx.map((e,i)=>{
    const _ek=sdk(cyc.num,cw,idx,i);
    if(isExHidden(_ek))return '';
    return renderEx(e,i,idx,wk,cyc.num,!!e.extra);
  }).join('');
  // Koliko vaj je skritih za ta teden
  const cnHidden=Object.keys(getHiddenEx()).filter(k=>k.startsWith(`c${cyc.num}w${cw}d${idx}e`)).length;
  html+=`<div style="display:flex;gap:6px;margin-top:.75rem;flex-wrap:wrap;">
    <button class="sb" style="flex:1;background:var(--bg3);border:1px dashed var(--border2);" onclick="openAddExercise(${idx})">+ Dodaj vajo</button>
    ${cnHidden>0?`<button class="sb" style="flex:1;background:var(--bg3);border:1px solid var(--border2);color:var(--text3);" onclick="restoreHiddenWeek(${idx})">↩ Povrni ${cnHidden} odstranjenih</button>`:''}
  </div>`;
  document.getElementById('day-content').innerHTML=html;
  // Obnovi aktivni rest timer, če teče (re-render je uničil njegov UI)
  if(typeof restoreTimer==='function')restoreTimer();
  if(typeof updateTabColors==='function')updateTabColors();
  if(typeof refreshGymTarget==='function')refreshGymTarget();
  if(typeof renderTodayCard==='function')renderTodayCard();
}

// Vrstni red shranjen kot SEZNAM IMEN vaj per dan
function getExOrderNames(){try{return JSON.parse(localStorage.getItem('wt_ex_ordernames')||'{}');}catch{return {};}}
function saveExOrderNames(o){localStorage.setItem('wt_ex_ordernames',JSON.stringify(o));}

function applyExOrderByName(di,exArray){
  const orders=getExOrderNames();
  const order=orders[di];
  if(!order)return exArray;
  // Preuredi po imenu; vaje, ki niso v shranjenem vrstnem redu, gredo na konec
  const byName={};
  exArray.forEach(e=>{byName[e.n]=e;});
  const result=[];
  order.forEach(name=>{if(byName[name]){result.push(byName[name]);delete byName[name];}});
  // Dodaj preostale (nove, ki jih v shranjenem redu ni)
  exArray.forEach(e=>{if(byName[e.n]){result.push(e);delete byName[e.n];}});
  return result;
}

// Extra vaje — shranjene per dan, vidne v vseh ciklih in tednih
function getExtraExercises(di){
  try{const all=JSON.parse(localStorage.getItem('wt_extra_ex')||'{}');return all[di]||[];}
  catch{return [];}
}
function saveExtraExercises(di,arr){
  try{const all=JSON.parse(localStorage.getItem('wt_extra_ex')||'{}');
    all[di]=arr;localStorage.setItem('wt_extra_ex',JSON.stringify(all));
  }catch{}
}

// Popup za izbiro vaje iz baze
function openAddExercise(di){
  const popup=document.getElementById('add-ex-pop');
  popup.classList.add('on');
  popup.dataset.di=di;
  document.getElementById('add-ex-search').value='';
  renderAddExList('');
  setTimeout(()=>document.getElementById('add-ex-search').focus(),100);
}
function closeAddExercise(){document.getElementById('add-ex-pop').classList.remove('on');}

// ============== UREJEVALNIK PRETEKLIH PODATKOV ==============
function openDataEditor(){
  const cyc=getCyc();
  // Zagotovi _origLen za vse dni (da extra vaje pravilno ločimo)
  PROG.days.forEach(d=>{if(d._origLen===undefined)d._origLen=d.ex.length;});
  // Napolni cikle (1..trenutni)
  const cycSel=document.getElementById('de-cycle');
  cycSel.innerHTML='';
  for(let c=1;c<=cyc.num;c++){
    cycSel.innerHTML+=`<option value="${c}">Cikel ${c}</option>`;
  }
  cycSel.value=cyc.num;
  // Napolni dneve
  const daySel=document.getElementById('de-day');
  daySel.innerHTML=DAY_NAMES.map((n,i)=>`<option value="${i}">${n}</option>`).join('');
  daySel.value=cd;
  // Privzeti teden = trenutni
  document.getElementById('de-week').value=cw;
  renderDataEditor();
  document.getElementById('data-edit-pop').classList.add('on');
}
function closeDataEditor(){document.getElementById('data-edit-pop').classList.remove('on');}

function renderDataEditor(){
  const c=parseInt(document.getElementById('de-cycle').value);
  const w=parseInt(document.getElementById('de-week').value);
  const di=parseInt(document.getElementById('de-day').value);
  const el=document.getElementById('de-content');
  // Vaje tega dne v PRAVILNEM vrstnem redu (ujema exKey e0,e1... indekse).
  // d.ex vzdržuje showDay kot urejen mixed; dodamo morebitne manjkajoče extra.
  const mixed=dayListFor(di,c,w);
  const all=getSets();
  let html='';
  mixed.forEach((e,ei)=>{
    const key=sdk(c,w,di,ei);
    const sets=all[key]||[];
    const dispName=getSwappedName(key,e.n,e.extra);
    const hasData=sets.some(s=>s.kg||s.reps);
    html+=`<div style="background:var(--bg3);border-radius:8px;padding:8px;margin-bottom:8px;">
      <div style="font-size:13px;font-weight:600;margin-bottom:6px;color:${hasData?'var(--text)':'var(--text3)'};">${dispName}${e.extra?' <span style="font-size:10px;color:var(--blue-text);">+extra</span>':''}</div>`;
    if(sets.length===0){
      html+=`<div style="font-size:11px;color:var(--text3);">Ni setov.</div>`;
    } else {
      html+=`<table style="width:100%;font-size:12px;border-collapse:collapse;"><thead><tr style="color:var(--text3);font-size:10px;"><th style="text-align:left;padding:2px;">Set</th><th style="padding:2px;">Kg</th><th style="padding:2px;">Pon</th><th style="padding:2px;">✓</th></tr></thead><tbody>`;
      sets.forEach((s,si)=>{
        html+=`<tr>
          <td style="padding:2px;color:var(--text3);">${si+1}</td>
          <td style="padding:2px;"><input type="number" step="0.5" value="${s.kg||''}" id="de-${key}-${si}-kg" style="width:60px;padding:4px;background:var(--bg2);border:.5px solid var(--border);border-radius:4px;color:var(--text);text-align:center;font-size:12px;"></td>
          <td style="padding:2px;"><input type="number" value="${s.reps||''}" id="de-${key}-${si}-reps" style="width:50px;padding:4px;background:var(--bg2);border:.5px solid var(--border);border-radius:4px;color:var(--text);text-align:center;font-size:12px;"></td>
          <td style="padding:2px;text-align:center;"><input type="checkbox" ${s.done?'checked':''} id="de-${key}-${si}-done" style="width:16px;height:16px;"></td>
        </tr>`;
      });
      html+=`</tbody></table>`;
    }
    html+=`</div>`;
  });
  if(!html)html='<div style="font-size:12px;color:var(--text3);padding:1rem;text-align:center;">Ni vaj za ta dan.</div>';
  el.innerHTML=html;
  el.dataset.keys=JSON.stringify(mixed.map((e,ei)=>sdk(c,w,di,ei)));
}

function saveDataEditor(){
  const el=document.getElementById('de-content');
  const keys=JSON.parse(el.dataset.keys||'[]');
  const all=getSets();
  let changed=0;
  keys.forEach(key=>{
    if(!all[key])return;
    all[key].forEach((s,si)=>{
      const kgEl=document.getElementById(`de-${key}-${si}-kg`);
      const repsEl=document.getElementById(`de-${key}-${si}-reps`);
      const doneEl=document.getElementById(`de-${key}-${si}-done`);
      if(kgEl){
        const newKg=kgEl.value;
        const newReps=repsEl?repsEl.value:s.reps;
        const newDone=doneEl?doneEl.checked:s.done;
        if(String(s.kg)!==String(newKg)||String(s.reps)!==String(newReps)||s.done!==newDone){
          s.kg=newKg;s.reps=newReps;s.done=newDone;changed++;
        }
      }
    });
  });
  saveSets(all);
  toast(`✓ Shranjeno (${changed} sprememb)`,'ok');
  // Osveži prikaze
  if(typeof showDay==='function')showDay(cd);
}

function renderAddExList(query){
  const q=(query||'').toLowerCase().trim();
  const customs=getCustomExercises().map(c=>({n:c.n,m:c.muscle,c:c.cat,d:c.desc||'',custom:true}));
  const builtins=EXERCISE_DB.map(e=>({n:e.n,m:e.m,c:e.c,d:e.d,s:e.s,eq:e.eq,custom:false}));
  let all=[...customs,...builtins];
  if(q){all=all.filter(e=>e.n.toLowerCase().includes(q)||e.m.toLowerCase().includes(q)||(e.s&&e.s.toLowerCase().includes(q))||(e.eq&&e.eq.toLowerCase().includes(q)));}
  const list=document.getElementById('add-ex-list');
  if(all.length===0){list.innerHTML='<div style="color:var(--text3);font-size:12px;padding:.5rem;text-align:center;">Ni zadetkov.</div>';return;}
  list.innerHTML=all.slice(0,50).map(e=>{
    const star=e.custom?'⭐ ':'';
    const eqIcon={barbell:'🏋',dumbbell:'🔔',cable:'🔗',machine:'⚙',bodyweight:'🤸',other:''}[e.eq]||'';
    return `<div class="sw-item" onclick="confirmAddExercise('${e.n.replace(/'/g,"\\'")}','${e.m}',${e.custom||e.c==='compound'?1:0})">
      <div class="sw-item-name">${star}${eqIcon} ${e.n}</div>
      <div class="sw-item-note">${e.m}${e.s?' · '+e.s:''} · ${e.c==='compound'?'compound':'isolation'}</div>
    </div>`;
  }).join('');
}
function confirmAddExercise(name,muscle,isMain){
  const popup=document.getElementById('add-ex-pop');
  const di=parseInt(popup.dataset.di);
  if(isNaN(di))return;
  ensureDayLists();

  const all=getDayLists()||{};
  const arr=all[di]||[];
  const cN=getCyc().num;
  const wanted=String(name||'').trim().toLowerCase();
  const existingIdx=arr.findIndex(x=>{
    const shown=String(dispNameForItem(x,cN,cw)||'').trim().toLowerCase();
    const original=String(x.n0||'').trim().toLowerCase();
    return shown===wanted||original===wanted;
  });

  if(existingIdx>=0){
    const existing=arr[existingIdx];
    const exKey=sdk(cN,cw,di,existingIdx);
    const hidden=getHiddenEx();

    // Vaja je že v programu, vendar je bila odstranjena samo za ta teden.
    // Namesto napačnega opozorila jo ob izbiri preprosto povrni.
    if(hidden[exKey]){
      delete hidden[exKey];
      saveHiddenEx(hidden);
      closeAddExercise();
      showDay(di);
      toast('↩ Vaja povrnjena za ta teden','ok');
      return;
    }

    // Vaja je arhivirana v program builderju: ponovno jo aktiviraj.
    if(existing.programDisabled){
      existing.programDisabled=false;
      all[di]=arr;
      saveDayLists(all);
      closeAddExercise();
      showDay(di);
      toast('↩ Vaja ponovno aktivirana','ok');
      return;
    }

    toast('Ta vaja je že vidna na tem dnevu','err');
    return;
  }

  const db=EXERCISE_DB.find(x=>String(x.n).toLowerCase()===wanted);
  const custom=getCustomExercises().find(x=>String(x.n).toLowerCase()===wanted);
  const isCompound=(db&&db.c==='compound')||(custom&&custom.cat==='compound')||!!isMain;
  const desc=(db&&db.d)||(custom&&custom.desc)||`${muscle} — moja dodatna vaja`;
  const rest=isCompound?120:75;

  mutateDayList(di,list=>{
    list.push({id:_newExId(name),n0:name,m:!!isMain,r:rest,rl:rest+'s',d:desc,tip:'',extra:true,progMode:'auto'});
  });
  closeAddExercise();
  showDay(di);
  toast('✓ Vaja dodana','ok');
}
async function removeExtraExercise(di,localIdx){
  ensureDayLists();
  const arr=(getDayLists()||{})[di]||[];
  const extras=arr.filter(x=>x.extra);
  if(localIdx<0||localIdx>=extras.length){toast('Napaka pri odstranjevanju','err');return;}
  return removeExtraByName(di,extras[localIdx].n0);
}

// Zanesljivo briše po imenu — neodvisno od indeksov
async function removeExtraByName(di,name){
  if(!await uiConfirm(`Odstranim "${name}"? Vsi vneseni podatki bodo izgubljeni.`))return;
  ensureDayLists();
  const arr=(getDayLists()||{})[di]||[];
  const cN=getCyc().num;
  const it=arr.find(x=>x.extra&&(x.n0===name||dispNameForItem(x,cN,cw)===name));
  if(!it){toast('Vaja ni najdena','err');return;}
  mutateDayList(di,list=>{const i=list.findIndex(x=>x.id===it.id);if(i>=0)list.splice(i,1);});
  showDay(di);
  toast('✓ Odstranjena','ok');
}

// === VRSTNI RED VAJ — shranjen per dan (po imenih, glej applyExOrderByName) ===

function moveExUp(di,ei){
  if(ei===0){toast('Že na vrhu','err');return;}
  ensureDayLists();
  mutateDayList(di,list=>{if(ei>0&&ei<list.length)[list[ei-1],list[ei]]=[list[ei],list[ei-1]];});
  showDay(di);
}
function moveExDown(di,ei){
  ensureDayLists();
  const L=(getDayLists()||{})[di]||[];
  if(ei>=L.length-1){toast('Že na dnu','err');return;}
  mutateDayList(di,list=>{if(ei>=0&&ei<list.length-1)[list[ei],list[ei+1]]=[list[ei+1],list[ei]];});
  showDay(di);
}



