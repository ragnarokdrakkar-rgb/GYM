/* Compact Gym 1.3: production UI over the existing durable workout stores.
   No demo data, roster migration, destructive reset or second set logger. */
function compactNameV26(value){return String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('sl-SI');}
function compactDayColorV26(name){
  const known={'push a':'#fb923c','pull a':'#60a5fa','noge':'#c084fc','push b':'#4ade80','pull b':'#f472b6'};
  const key=compactNameV26(name);if(known[key])return known[key];
  let hash=0;for(const ch of key)hash=(hash*31+ch.charCodeAt(0))>>>0;
  return ['#facc15','#22d3ee','#a3e635','#f87171','#a78bfa','#2dd4bf'][hash%6];
}
function compactActiveExercisesV26(meta,rosters){
  const out=new Map();(meta.days||[]).forEach((day,di)=>{
    if(day.active===false||day.deleted===true)return;
    (rosters[di]||[]).forEach((e,ei)=>{if(e.programDisabled)return;const name=e.n||e.n0,key=compactNameV26(name);if(!key)return;
      if(!out.has(key))out.set(key,{key,name,di,ei,days:[]});
      const label=day.name||day.title||('Dan '+(di+1));if(!out.get(key).days.includes(label))out.get(key).days.push(label);
    });
  });return [...out.values()];
}
function compactStrengthSeriesV26(sessions,key){
  const points=[];sessions.forEach((session,si)=>{
    const sets=(session.exercises||[]).filter(e=>compactNameV26(e.name)===key).flatMap(e=>e.sets||[])
      .filter(s=>s?.done&&!s.warm&&s.type!=='warmup'&&s.kg!==''&&s.kg!==null&&Number.isFinite(Number(s.kg))&&Number(s.kg)>=0&&Number.isInteger(Number(s.reps))&&Number(s.reps)>0);
    if(!sets.length)return;
    const top=sets.reduce((a,b)=>Number(b.kg)>Number(a.kg)||Number(b.kg)===Number(a.kg)&&Number(b.reps)>Number(a.reps)?b:a);
    points.push({si,date:session.date,time:session.startTime||'',day:session.dayName||'',kg:Number(top.kg),reps:Number(top.reps),count:sets.length,volume:sets.reduce((n,s)=>n+Number(s.kg)*Number(s.reps),0),flagged:Number(top.kg)>250||Number(top.reps)>30});
  });return points.sort((a,b)=>(a.date+' '+a.time).localeCompare(b.date+' '+b.time));
}
function compactPlanChangeV26(rows,target,action){
  const next=JSON.parse(JSON.stringify(rows||[]));
  const kept=next.reduce((n,s,i)=>s?.done?Math.max(n,i+1):n,target);
  while(next.length<kept)next.push({kg:'',reps:'',done:false});
  let count=kept;
  const numeric=(v,kind)=>{if(v==='')return '';const n=Number(String(v).replace(',','.'));if(!Number.isFinite(n)||n<0||n>2000||kind==='reps'&&(!Number.isInteger(n)||n>1000||n<1))throw Error('Preveri težo in ponovitve.');return String(n);};
  if(action.type==='edit'){
    for(const item of action.values){if(!Number.isInteger(item.index)||item.index<0||item.index>=count)throw Error('Serija ni več na voljo.');
      if(next[item.index]?.done)continue;
      next[item.index]={...next[item.index],kg:numeric(item.kg,'kg'),reps:numeric(item.reps,'reps'),done:false};
    }
  }else if(action.type==='add'){
    const n=Number(action.count);if(!Number.isInteger(n)||n<1||count+n>30)throw Error('Izberi 1–30 serij skupaj.');
    const kg=numeric(action.kg,'kg'),reps=numeric(action.reps,'reps');
    const slots=Array.from({length:n},()=>({kg,reps,done:false}));next.splice(count,0,...slots);count+=n;
  }else if(action.type==='remove'){
    if(count<=1||!Number.isInteger(action.index)||action.index<0||action.index>=count||next[action.index]?.done)throw Error('Opravljene ali zadnje serije ni mogoče odstraniti iz načrta.');
    next.splice(action.index,1);count--;
  }else throw Error('Neveljavna sprememba načrta.');
  return {rows:next,target:count};
}

if(typeof document!=='undefined') (function(){
  'use strict';
  const esc=safeHtml,$=s=>document.querySelector(s),fmt=n=>Number(n).toLocaleString('sl-SI',{maximumFractionDigits:2});
  const dayKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const dateText=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)?new Date(d+'T12:00').toLocaleDateString('sl-SI',{day:'numeric',month:'long',year:'numeric'}):String(d||'Brez datuma');
  let historyDate=dayKey(new Date()),historyIndex=-1,historyExercise='',strengthKey='',strengthIndex=-1,strengthChartCompact=null,queued=false;
  const plansOpen=new Set();let planCtx=null;
  const parseKey=key=>{const m=String(key).match(/^c(\d+)w(\d+)d(\d+)e(\d+)$/);return m?{cn:+m[1],w:+m[2],di:+m[3],ei:+m[4]}:null;};
  const action=(act,label,attrs='')=>`<button type="button" class="cg-button" data-cg="${act}" ${attrs}>${label}</button>`;
  function notify(error){toast(error.message||String(error),'err');}
  function readActive(){const meta=getProgramMetaV6(),rosters={};meta.days.forEach((_,di)=>{rosters[di]=dayListFor(di,getCyc().num,cw);});return compactActiveExercisesV26(meta,rosters);}
  function sessionsForGraph(){const all=getSets();return getSessions().map(s=>({...s,exercises:sessionExercisesForStatsV19(s,all)}));}
  function openHistory(si,key=''){
    const s=getSessions()[si];if(!s)return;historyIndex=si;historyDate=s.date;historyExercise=key;
    const d=new Date(s.date+'T12:00'),now=new Date();mcalOffset=(d.getFullYear()-now.getFullYear())*12+d.getMonth()-now.getMonth();
    showPage('gymlog');renderCalendar();renderHistory();
  }
  function calendarMarkup(){
    const sessions=getSessions(),now=new Date(),view=new Date(now.getFullYear(),now.getMonth()+mcalOffset,1),year=view.getFullYear(),month=view.getMonth();
    const byDate=new Map();sessions.forEach((s,si)=>{if(!byDate.has(s.date))byDate.set(s.date,[]);byDate.get(s.date).push({...s,si});});
    let html=`<div class="cg-calendar-head">${action('month-prev','‹','aria-label="Prejšnji mesec"')}<strong>${view.toLocaleDateString('sl-SI',{month:'long',year:'numeric'})}</strong>${action('month-next','›','aria-label="Naslednji mesec"')}</div><div class="cg-calendar-grid">${['P','T','S','Č','P','S','N'].map(t=>`<span class="cg-weekday">${t}</span>`).join('')}`;
    for(let i=0;i<(view.getDay()+6)%7;i++)html+='<span></span>';
    const seen=new Set();for(let day=1;day<=new Date(year,month+1,0).getDate();day++){
      const date=dayKey(new Date(year,month,day)),records=byDate.get(date)||[];records.forEach(s=>seen.add(s.dayName||'Trening'));
      html+=`<button type="button" class="cg-calendar-date ${date===historyDate?'selected':''} ${date===dayKey(now)?'today':''}" data-cg-date="${date}" aria-pressed="${date===historyDate}" aria-label="${esc(dateText(date)+' · '+(records.map(s=>s.dayName).join(', ')||'brez treninga'))}"><span>${day}</span>${records.slice(0,2).map(s=>`<span class="cg-calendar-tag" style="--day-color:${compactDayColorV26(s.dayName)}">${esc(s.dayName||'Trening')}</span>`).join('')}${records.length>2?`<small>+${records.length-2}</small>`:''}</button>`;
    }
    return html+`</div><div class="cg-calendar-legend">${[...seen].map(name=>`<span><i style="background:${compactDayColorV26(name)}"></i>${esc(name)}</span>`).join('')}</div>`;
  }
  function renderCalendar(){const host=$('#train-calendar');if(host)host.innerHTML=calendarMarkup();}
  function renderHistory(){
    const host=$('#cg-history');if(!host)return;
    const sessions=getSessions(),records=sessions.map((s,si)=>({s,si})).filter(x=>x.s.date===historyDate);
    if(!records.some(x=>x.si===historyIndex))historyIndex=records.at(-1)?.si??-1;
    const session=sessions[historyIndex];
    let html=`<label class="cg-field">Izberi datum<input type="date" data-cg-history-date value="${esc(historyDate)}"></label><div class="cg-section-heading"><strong>${esc(dateText(historyDate))}</strong><span>${records.length} treningov</span></div>`;
    if(records.length>1)html+=`<label class="cg-field">Trening tega dne<select data-cg-history-session>${records.map(x=>`<option value="${x.si}" ${x.si===historyIndex?'selected':''}>${esc((x.s.startTime||'')+' · '+x.s.dayName)}</option>`).join('')}</select></label>`;
    if(!session||!records.length){host.innerHTML=html+'<p class="cg-muted">Na ta dan ni zabeleženega treninga.</p>';return;}
    const exs=sessionExercisesForStatsV19(session),stats=sessionStatsV19(session);
    html+=`<div class="cg-section-heading"><div><h2>${esc(session.dayName)}</h2><p>${esc(session.startTime||'')} · ${fmt(session.durationMin||0)} min · ${stats.setCount} serij</p></div></div><label class="cg-field">Vaja<select data-cg-history-exercise><option value="">Vse vaje</option>${exs.map(e=>`<option value="${esc(compactNameV26(e.name))}" ${historyExercise===compactNameV26(e.name)?'selected':''}>${esc(e.name)}</option>`).join('')}</select></label>`;
    const rows=historyRowsV24();historyVisibleV24=rows;
    exs.forEach((ex,ei)=>{if(historyExercise&&compactNameV26(ex.name)!==historyExercise)return;
      html+=`<details class="cg-history-ex" ${historyExercise||exs.length===1?'open':''}><summary>${esc(ex.name)} <span>${(ex.sets||[]).filter(s=>s.done).length} serij</span></summary>`;
      (ex.sets||[]).forEach((set,ri)=>{
        if(!set.done&&!set.kg&&!set.reps)return;
        const rowIndex=rows.findIndex(r=>r.ref.kind==='session'&&r.ref.si===historyIndex&&r.ref.ei===ei&&r.ref.ri===ri);
        html+=`<div class="cg-history-set"><span>${ri+1}</span><div><strong>${esc(set.kg)} kg × ${esc(set.reps)}</strong><small>RPE ${esc(set.rpe??'—')}${set.done?' · opravljeno':' · načrt'}${Number(set.kg)>250?' · preveri težo':''}</small></div>${rowIndex>=0?action('history-edit','Uredi',`data-row="${rowIndex}"`):'<small>Star vir</small>'}</div>`;
      });html+='</details>';
    });
    html+=`<p class="cg-muted">Popravek velja samo za izbrani zgodovinski trening, ne za današnji program.</p>${action('history-advanced','Vsi viri in sumljive vrednosti')}`;host.innerHTML=html;
  }
  function renderStrength(){
    const host=$('#cg-strength');if(!host)return;
    if(strengthChartCompact){strengthChartCompact.destroy();strengthChartCompact=null;}
    const active=readActive(),selected=active.find(e=>e.key===strengthKey),sessions=sessionsForGraph();
    if(!selected){strengthKey='';host.innerHTML=`<div class="cg-section-heading"><strong>Aktivne vaje programa</strong><span>${active.length}</span></div>`+active.map(e=>{const last=compactStrengthSeriesV26(sessions,e.key).at(-1);return `<button class="cg-strength-row" type="button" data-cg-strength="${esc(e.key)}"><span><strong>${esc(e.name)}</strong><small>${esc(e.days.join(' · '))}</small><small>${last?fmt(last.kg)+' kg × '+last.reps+' · '+esc(dateText(last.date)):'Še brez zabeleženih serij'}</small></span><span aria-hidden="true">›</span></button>`;}).join('')+'<p class="cg-muted">Izberi vajo za graf. Neaktivne vaje in dnevi niso vključeni.</p>';return;}
    const series=compactStrengthSeriesV26(sessions,strengthKey);if(!series.some(p=>p.si===strengthIndex))strengthIndex=series.at(-1)?.si??-1;
    const current=series.find(p=>p.si===strengthIndex);
    host.innerHTML=action('strength-back','‹ Vse aktivne vaje')+`<h2 class="cg-chart-title">${esc(selected.name)}</h2><p class="cg-muted">${esc(selected.days.join(' · '))}</p>`+(current?`<p>Največja zabeležena teža · kg</p><div class="cg-chart"><canvas id="cg-strength-chart" role="img" aria-label="Napredek zabeležene teže za ${esc(selected.name)}"></canvas></div><label class="cg-field">Trening na grafu<select data-cg-strength-session>${series.map(p=>`<option value="${p.si}" ${p.si===strengthIndex?'selected':''}>${esc(dateText(p.date))} · ${esc(p.time)}</option>`).join('')}</select></label><div class="cg-chart-value"><strong>${fmt(current.kg)} kg × ${current.reps}</strong><span>${current.count} serij · ${fmt(current.volume)} kg volumna</span></div>${current.flagged?'<p class="cg-warning">Nenavadna vrednost — preveri izvorni vnos.</p>':''}${action('strength-history','Odpri ta trening v zgodovini')}<p class="cg-muted">Zabeležena teža, ne ocenjeni 1RM.</p>`:'<p class="cg-muted">Za to vajo še ni zabeleženih treningov. Graf se prikaže po prvem vnosu.</p>');
    if(!current||typeof Chart==='undefined')return;
    strengthChartCompact=new Chart($('#cg-strength-chart'),{type:'line',data:{labels:series.map(p=>p.date),datasets:[{label:'Zabeležena teža (kg)',data:series.map(p=>p.kg),borderColor:'#fb923c',backgroundColor:'#fb923c',pointBackgroundColor:series.map(p=>p.flagged?'#fb7185':'#fb923c'),pointRadius:series.map(p=>p.si===strengthIndex?6:3),pointHitRadius:18,tension:.15,borderWidth:2,fill:false}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false},tooltip:{callbacks:{title:items=>dateText(items[0].label),label:item=>`${fmt(item.raw)} kg × ${series[item.dataIndex].reps}`}}},scales:{x:{grid:{display:false},ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:3,color:'#a8afb2',callback:function(value){const date=this.getLabelForValue(value);return new Date(date+'T12:00').toLocaleDateString('sl-SI',{day:'numeric',month:'numeric'});}}},y:{title:{display:true,text:'kg',color:'#a8afb2'},grace:'10%',ticks:{maxTicksLimit:5,color:'#a8afb2'},grid:{color:'#303538'}}},onClick:(_,elements)=>{if(elements.length){strengthIndex=series[elements[0].index].si;renderStrength();}}}});
  }
  function planEditor(key){
    const p=parseKey(key),e=PROG.days[p?.di]?.ex?.[p?.ei];if(!e)return;
    const rows=getSets()[key]||[],target=nsf(p.di,p.ei,PROG.weeks[p.w],key);
    planCtx={key,p,name:e.n,expected:JSON.stringify(rows),target};
    const count=rows.reduce((n,s,i)=>s?.done?Math.max(n,i+1):n,target);
    const dialog=$('#cg-plan-dialog');
    dialog.innerHTML=`<form id="cg-plan-form"><div class="cg-dialog-head"><h2>Načrt serij</h2>${action('plan-close','×','aria-label="Zapri"')}</div><p>${esc(e.n)}</p><div class="cg-plan-head"><span>Ser.</span><span>kg</span><span>Pon.</span><span></span></div>${Array.from({length:count},(_,i)=>{const s=rows[i]||{};return `<div class="cg-plan-row" data-plan-row="${i}"><span>${i+1}${s.done?' ✓':''}</span><input type="number" inputmode="decimal" min="0" max="2000" step="any" aria-label="Serija ${i+1} kg" data-plan-kg value="${esc(s.kg??'')}" ${s.done?'disabled':''}><input type="number" inputmode="numeric" min="1" max="1000" step="1" aria-label="Serija ${i+1} ponovitve" data-plan-reps value="${esc(s.reps??'')}" ${s.done?'disabled':''}>${s.done?'<span class="cg-done">✓</span>':action('plan-remove','×',`data-index="${i}" aria-label="Odstrani načrtovano serijo ${i+1}" ${count<=1?'disabled':''}`)}</div>`;}).join('')}<p class="cg-muted">Vnos vnaprej ne šteje kot opravljeno. Opravljene serije popravi v pregledu serij.</p><button type="submit" class="cg-button primary">Shrani načrt</button><details class="cg-plan-add"><summary>+ Dodaj več serij</summary><label class="cg-field">Število novih serij<input name="count" type="number" min="1" max="30" value="1"></label><div class="cg-two-fields"><label class="cg-field">kg<input name="kg" type="number" min="0" max="2000" step="any" inputmode="decimal"></label><label class="cg-field">Ponovitve<input name="reps" type="number" min="1" max="1000" step="1" inputmode="numeric"></label></div>${action('plan-add','Dodaj serije')}</details><p role="alert" class="cg-warning" id="cg-plan-error"></p></form>`;
    dialog.querySelector('form').addEventListener('submit',event=>{event.preventDefault();savePlan('edit');});
    if(!dialog.open)dialog.showModal();
  }
  function savePlan(type,index){
    if(!planCtx)return;try{
      const {key,p,name,expected,target}=planCtx,all=getSets(),counts=getSetCounts();
      if(getCyc().num!==p.cn||cw!==p.w||cd!==p.di||JSON.stringify(all[key]||[])!==expected||nsf(p.di,p.ei,PROG.weeks[p.w],key)!==target)throw Error('Vnosi so se spremenili. Ponovno odpri načrt.');
      const form=$('#cg-plan-form'),values=[...form.querySelectorAll('[data-plan-row]')].map(row=>({index:Number(row.dataset.planRow),kg:row.querySelector('[data-plan-kg]').value,reps:row.querySelector('[data-plan-reps]').value}));
      const edited=compactPlanChangeV26(all[key],target,{type:'edit',values});
      const result=type==='edit'?edited:compactPlanChangeV26(edited.rows,edited.target,{type,index,count:form.elements.count.value,kg:form.elements.kg.value,reps:form.elements.reps.value});
      const before={rows:all[key],count:counts[key]};
      all[key]=result.rows.map(s=>({...s,exName:s.exName||name,exerciseId:s.exerciseId||exStableId(name)}));
      counts[key]=(Number(counts[key])||0)+result.target-target;
      commitStorageBatch([[LS.sets,JSON.stringify(all)],[LS.setcounts,JSON.stringify(counts)],['wt_plan_undo_v26',JSON.stringify({key,before,after:{rows:all[key],count:counts[key]}})]]);
      $('#cg-plan-dialog').close();window.WTFocusPatchV10?.syncFromStorage(key);showDay(p.di);setGymFocus(key,false);window.WTFocusPatchV10?.refresh();
      if(type==='edit')toast('Načrt shranjen. Serije še niso opravljene.','ok');else planEditor(key);
      queue();
    }catch(error){$('#cg-plan-error').textContent=error.message;}
  }
  function enhanceWorkout(){
    const cards=[...document.querySelectorAll('#day-content .exc')],focus=getGymMode();
    let active=cards.find(c=>c.classList.contains('active-ex'))||cards[0];
    const day=PROG.days[cd];let title=$('#cg-workout-title');if(!title){title=document.createElement('div');title.id='cg-workout-title';title.className='cg-title';$('#page-workout').prepend(title);}
    const heading=focus?'Fokus':day?.title||DAY_NAMES[cd]||'Trening',sub=focus?`${Math.max(0,cards.indexOf(active))+1} od ${cards.length} vaj`:`Teden ${cw+1} · ${day?.sub||'Tvoj trening'}`;
    const signature=heading+'|'+sub;if(title.dataset.signature!==signature){title.dataset.signature=signature;title.innerHTML=`<h1>${esc(heading)}</h1><p>${esc(sub)}</p>`;}
    cards.forEach(card=>{
      const key=card.id.slice(3),p=parseKey(key),e=PROG.days[p?.di]?.ex?.[p?.ei];if(!e)return;
      const progress=exerciseProgressV20(key),top=card.querySelector('.ex-top');
      card.classList.toggle('cg-expanded',card===active);card.dataset.cgStatus=progress.state;
      if(top&&!top.querySelector('.cg-ex-toggle')){
        const button=document.createElement('button');button.type='button';button.className='cg-ex-toggle';button.dataset.cgKey=key;
        const name=card.querySelector('.ex-name');button.append(document.createElement('i'));const text=document.createElement('span');text.textContent=name?.textContent||e.n;button.append(text,document.createElement('small'));top.prepend(button);
      }
      const toggle=top?.querySelector('.cg-ex-toggle');if(toggle){toggle.setAttribute('aria-expanded',String(card===active));const count=`${progress.done}/${progress.total}`;if(toggle.querySelector('small').textContent!==count)toggle.querySelector('small').textContent=count;}
      const quick=card.querySelector('.quick-log-v6'),review=card.querySelector('.set-review-v18');
      if(quick&&!card.querySelector('.cg-plan-toolbar')){
        const toolbar=document.createElement('div');toolbar.className='cg-plan-toolbar';
        toolbar.innerHTML=action('rest-edit','Počitek '+fmtRest(restForEx(e.id,e.n,e.r)),`data-key="${key}"`)+action('rest-start','▷',`data-key="${key}" aria-label="Začni počitek"`)+action('plan','Načrt serij · vpiši vnaprej',`data-key="${key}"`);
        quick.after(toolbar);
      }
      if(review&&!review.dataset.compactBound){review.dataset.compactBound='1';review.open=plansOpen.has(key);review.addEventListener('toggle',()=>{if(review.open)plansOpen.add(key);else plansOpen.delete(key);});}
      if(review){const summary=review.querySelector('summary');const label=`Serije · ${progress.done} opravljenih · uredi`;if(summary.textContent!==label)summary.textContent=label;}
      quick?.querySelectorAll('input[data-field]').forEach(input=>input.setAttribute('aria-label',({kg:'Kilogrami',reps:'Ponovitve',rpe:'RPE'})[input.dataset.field]));
    });
  }
  function organize(){
    document.documentElement.classList.add('compact-v26');
    // A modal opened from the calendar must not live in the hidden Settings page.
    const historyDialog=$('#history-dialog-v24');if(historyDialog&&historyDialog.parentElement!==document.body)document.body.append(historyDialog);
    const stats=$('#page-stats');if(stats&&!$('#cg-strength')){const host=document.createElement('div');host.id='cg-strength';stats.querySelector('.progress-subnav').after(host);const details=document.createElement('details');details.className='cg-advanced';details.innerHTML='<summary>Napredna statistika</summary>';[...stats.children].filter(c=>c!==host&&!c.classList.contains('progress-subnav')).forEach(c=>details.append(c));stats.append(details);}
    const gym=$('#page-gymlog'),calendar=$('#train-calendar')?.closest('.card');
    gym?.classList.remove('empty-v22');$('#empty-note-v22')?.remove();
    if(gym&&calendar&&!$('#cg-history')){const host=document.createElement('div');host.id='cg-history';calendar.append(host);const details=document.createElement('details');details.className='cg-advanced';details.innerHTML='<summary>Povzetki in dodatna statistika</summary>';[...gym.children].filter(c=>c!==calendar&&!c.classList.contains('progress-subnav')&&!c.classList.contains('page-heading-v17')).forEach(c=>details.append(c));gym.append(details);gym.querySelector('.page-heading-v17').after(calendar);}
    document.querySelectorAll('.progress-subnav').forEach(nav=>{nav.querySelector('[data-progress="gymlog"]').textContent='Zgodovina';const cycle=nav.querySelector('[data-progress="cycle"]');if(cycle)cycle.textContent='Cikli';});
    const tools=$('#page-tools');
    if(tools&&!tools.dataset.compactOrganized){tools.dataset.compactOrganized='1';
      tools.querySelectorAll(':scope > .card').forEach(card=>{const heading=card.querySelector('.ct');if(!heading)return;const details=document.createElement('details');details.className='settings-detail-v18 cg-settings-group';const summary=document.createElement('summary');summary.textContent=heading.textContent.trim();card.before(details);details.append(summary,card);heading.hidden=true;});
      const row=document.createElement('div');row.className='cg-settings-shortcuts';row.innerHTML=action('settings-history','Pregled in urejanje zgodovine')+action('settings-equipment','Oprema in plošče')+action('settings-program','Program in vaje');tools.querySelector('.page-heading-v17')?.after(row);
    }
    if(!$('#cg-plan-dialog')){const dialog=document.createElement('dialog');dialog.id='cg-plan-dialog';dialog.className='cg-dialog';dialog.setAttribute('aria-label','Načrt serij');document.body.append(dialog);}
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhanceWorkout();});}
  function initialize(){
    organize();enhanceWorkout();
    const original=window.showPage;window.showPage=function(p){const result=original.apply(this,arguments);if(p==='gymlog'){renderCalendar();renderHistory();}if(p==='stats')renderStrength();queue();return result;};
    window.renderTrainCalendar=calendarMarkup;
    const saveHistory=window.saveHistoryEditV24;window.saveHistoryEditV24=function(){const r=saveHistory.apply(this,arguments);renderHistory();if(document.body.dataset.page==='stats')renderStrength();return r;};
    const undoHistory=window.undoHistoryEditV24;window.undoHistoryEditV24=async function(){await undoHistory.apply(this,arguments);renderHistory();};
    new MutationObserver(queue).observe($('#day-content'),{childList:true,subtree:true});
    document.addEventListener('click',event=>{
      const b=event.target.closest('button');if(!b)return;
      if(b.dataset.cgKey){setGymFocus(b.dataset.cgKey,false);queue();return;}
      if(b.dataset.cgDate){historyDate=b.dataset.cgDate;historyIndex=-1;historyExercise='';renderCalendar();renderHistory();return;}
      if(b.dataset.cgStrength){strengthKey=b.dataset.cgStrength;strengthIndex=-1;renderStrength();return;}
      const act=b.dataset.cg;if(!act)return;
      if(act==='month-prev'||act==='month-next'){mcalOffset+=act==='month-prev'?-1:1;renderCalendar();}
      else if(act==='history-edit')openHistoryEditV24(Number(b.dataset.row));
      else if(act==='history-advanced'){showPage('tools');const input=$('#history-query-v24');input.closest('details').open=true;input.closest('.settings-detail-v18').open=true;renderHistoryEditorV24();input.scrollIntoView({block:'center'});}
      else if(act==='strength-back'){strengthKey='';renderStrength();}
      else if(act==='strength-history')openHistory(strengthIndex,strengthKey);
      else if(act==='plan')planEditor(b.dataset.key);
      else if(act==='plan-close')$('#cg-plan-dialog').close();
      else if(act==='plan-add')savePlan('add');
      else if(act==='plan-remove')savePlan('remove',Number(b.dataset.index));
      else if(act==='rest-edit'||act==='rest-start'){const p=parseKey(b.dataset.key),e=PROG.days[p.di].ex[p.ei];if(act==='rest-edit')editRest(e.n,e.r,b.dataset.key,e.id);else startT(b.dataset.key,restForEx(e.id,e.n,e.r));}
      else if(act==='settings-history')showPage('gymlog');
      else if(act==='settings-program')showPage('program');
      else if(act==='settings-equipment'){const card=$('#bar-w').closest('.settings-detail-v18');card.open=true;card.scrollIntoView({block:'start',behavior:'smooth'});}
      queue();
    });
    document.addEventListener('change',event=>{const el=event.target;
      if(el.hasAttribute('data-cg-history-date')){historyDate=el.value;historyIndex=-1;historyExercise='';const date=new Date(historyDate+'T12:00'),now=new Date();if(Number.isFinite(date.getTime()))mcalOffset=(date.getFullYear()-now.getFullYear())*12+date.getMonth()-now.getMonth();renderCalendar();renderHistory();}
      if(el.hasAttribute('data-cg-history-session')){historyIndex=Number(el.value);historyExercise='';renderHistory();}
      if(el.hasAttribute('data-cg-history-exercise')){historyExercise=el.value;renderHistory();}
      if(el.hasAttribute('data-cg-strength-session')){strengthIndex=Number(el.value);renderStrength();}
      queue();
    });
    document.addEventListener('click',queue);window.WTCompactV26={refresh:queue,openHistory,renderStrength,renderHistory};
    if(document.body.dataset.page==='gymlog'){renderCalendar();renderHistory();}if(document.body.dataset.page==='stats')renderStrength();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
