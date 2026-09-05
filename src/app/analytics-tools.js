// GYM LOG
function renderSessHist(){
  const sessions=getSessions();
  const el=document.getElementById('sess-hist-content');if(!el)return;
  // Filter po dnevu
  const filter=(document.getElementById('sess-filter')||{}).value||'';
  // Render dolgoročni pregled + duration graf (vedno, neodvisno od filtra)
  renderLongtermStats();
  renderConsistency();
  renderDurationChart();
  let filtered=sessions;
  if(filter)filtered=sessions.filter(s=>s.dayName===filter);
  if(filtered.length===0){el.innerHTML='<div style="font-size:12px;color:var(--text3);">'+(filter?'Ni treningov za "'+filter+'".':'Še ni treningov.')+'</div>';return;}
  const all=getSets();
  const dayColor={"Push A":"#1d9e75","Pull A":"#3b82f6","Noge":"#f59e0b","Push B":"#10b981","Pull B":"#6366f1"};
  const monthNames=["Januar","Februar","Marec","April","Maj","Junij","Julij","Avgust","September","Oktober","November","December"];
  // Grupiraj po mesecu (YYYY-MM)
  const byMonth={};
  filtered.forEach(s=>{
    const mk=s.date.slice(0,7);
    if(!byMonth[mk])byMonth[mk]=[];
    byMonth[mk].push(s);
  });
  const months=Object.keys(byMonth).sort().reverse();
  const curMonth=new Date().toISOString().slice(0,7);
  // Pomožna: izračun tonaže/setov za sesijo
  function sessStats(s){
    const di=DAY_NAMES.indexOf(s.dayName);
    let tonnage=0,setCount=0;
    if(di>=0){
      const w=Math.max(0,(s.weekNum||1)-1);
      for(let ei=0;ei<20;ei++){
        const k=sdk(s.cycle,w,di,ei);
        if(all[k])all[k].filter(x=>x.done&&x.kg&&x.reps).forEach(x=>{
          tonnage+=(parseFloat(x.kg)||0)*(parseFloat(x.reps)||0);setCount++;
        });
      }
    }
    return {tonnage,setCount};
  }
  let html='';
  months.forEach(mk=>{
    const [y,m]=mk.split('-');
    const monthLabel=`${monthNames[parseInt(m)-1]} ${y}`;
    const sess=byMonth[mk];
    const isOpen=(mk===curMonth)||(months.length===1);
    // Mesečni povzetek
    let monthTon=0;
    sess.forEach(s=>{monthTon+=sessStats(s).tonnage;});
    const rows=sess.map(s=>{
      const idx=sessions.indexOf(s);
      const st=sessStats(s);
      const col=dayColor[s.dayName]||'var(--green-text)';
      return `<div class="sess-entry">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:2px;background:${col};display:inline-block;"></span><span class="sess-day">${s.dayName}</span><span style="font-size:10px;color:var(--text3);">T${s.weekNum} · C${s.cycle}</span></div>
            <div class="sess-meta">${s.date} · ${s.startTime||'–'}–${s.endTime||'–'}</div>
            <div style="display:flex;gap:10px;margin-top:4px;font-size:11px;">
              <span style="color:var(--green-text);">⏱ ${s.durationMin}min</span>
              ${st.setCount>0?`<span style="color:var(--blue-text);">${st.setCount} setov</span>`:''}
              ${st.tonnage>0?`<span style="color:var(--purple-text);">${(st.tonnage/1000).toFixed(1)}t</span>`:''}
            </div>
          </div>
          <div style="display:flex;gap:4px;">
            <button class="bk-item-btn" style="font-size:11px;" onclick="editSession(${idx})" title="Uredi">✎</button>
            <button class="bk-item-btn del" style="font-size:11px;" onclick="deleteSession(${idx})" title="Izbriši">×</button>
          </div>
        </div>
      </div>`;
    }).join('');
    html+=`<div class="month-group" style="margin-bottom:8px;">
      <div onclick="this.parentNode.classList.toggle('open')" style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:var(--bg3);border-radius:8px;cursor:pointer;">
        <span style="font-size:13px;font-weight:600;color:var(--text);">${monthLabel}</span>
        <span style="font-size:11px;color:var(--text3);">${sess.length} treningov · ${(monthTon/1000).toFixed(1)}t <span class="month-arrow">▾</span></span>
      </div>
      <div class="month-body">${rows}</div>
    </div>`;
    // Označi odprtost preko inline (dodamo open class spodaj prek JS)
    if(isOpen)html=html.replace('<div class="month-group" style="margin-bottom:8px;">','<div class="month-group open" style="margin-bottom:8px;">');
  });
  el.innerHTML=html;
}

// Dolgoročni pregled
function renderLongtermStats(){
  const el=document.getElementById('longterm-stats');if(!el)return;
  const sessions=getSessions();
  if(sessions.length===0){el.innerHTML='<div style="font-size:12px;color:var(--text3);">Ni podatkov.</div>';return;}
  const total=sessions.length;
  const durations=sessions.filter(s=>s.durationMin>0).map(s=>s.durationMin);
  const avgDur=durations.length?Math.round(durations.reduce((a,b)=>a+b,0)/durations.length):0;
  const maxDur=durations.length?Math.max(...durations):0;
  const minDur=durations.length?Math.min(...durations):0;
  // Treningov na teden (povprečje zadnjih 4 tednov)
  const now=Date.now();
  const last4w=sessions.filter(s=>now-new Date(s.date).getTime()<=28*86400000).length;
  const perWeek=(last4w/4).toFixed(1);
  // Najpogostejši dan
  const dayCounts={};
  sessions.forEach(s=>{dayCounts[s.dayName]=(dayCounts[s.dayName]||0)+1;});
  // Prvi trening datum
  const firstDate=sessions[sessions.length-1].date;
  const daysSince=Math.floor((now-new Date(firstDate).getTime())/86400000);
  return el.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
      <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:700;color:var(--green-text);">${total}</div><div style="font-size:10px;color:var(--text3);">treningov skupaj</div></div>
      <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:700;color:var(--blue-text);">${perWeek}</div><div style="font-size:10px;color:var(--text3);">na teden (4t avg)</div></div>
      <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:700;color:var(--purple-text);">${avgDur}</div><div style="font-size:10px;color:var(--text3);">povp. minut</div></div>
    </div>
    <div style="font-size:11px;color:var(--text3);margin-top:8px;text-align:center;">Najkrajši ${minDur}min · najdaljši ${maxDur}min · ${daysSince} dni od prvega treninga</div>`;
}

// Konsistenca po dnevih (zadnjih 8 tednov)
function renderConsistency(){
  const el=document.getElementById('consistency-stats');if(!el)return;
  const sessions=getSessions();
  const now=Date.now();
  const weeks=8;
  const since=now-weeks*7*86400000;
  const recent=sessions.filter(s=>new Date(s.date).getTime()>=since);
  if(recent.length===0){el.innerHTML='<div style="font-size:12px;color:var(--text3);">Ni treningov v zadnjih 8 tednih.</div>';return;}
  const colors={"Push A":"#1d9e75","Pull A":"#3b82f6","Noge":"#f59e0b","Push B":"#10b981","Pull B":"#6366f1"};
  // Preštej vsak dan
  const counts={};
  DAY_NAMES.forEach(d=>counts[d]=0);
  recent.forEach(s=>{if(counts[s.dayName]!==undefined)counts[s.dayName]++;});
  const maxCount=Math.max(weeks,...Object.values(counts));
  el.innerHTML=DAY_NAMES.map(d=>{
    const c=counts[d];
    const pct=Math.round((c/weeks)*100);
    const barW=Math.round((c/maxCount)*100);
    const color=colors[d]||'#1d9e75';
    return `<div style="margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;"><span style="color:var(--text2);">${d}</span><span style="color:var(--text3);">${c}× · ${pct}%</span></div>
      <div style="height:8px;background:var(--bg3);border-radius:4px;overflow:hidden;"><div style="height:100%;width:${barW}%;background:${color};border-radius:4px;"></div></div>
    </div>`;
  }).join('');
  // Najboljši/najslabši dan
  const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const best=sorted[0],worst=sorted[sorted.length-1];
  if(best[1]>0&&best[1]!==worst[1]){
    el.innerHTML+=`<div style="font-size:11px;color:var(--text3);margin-top:8px;text-align:center;">Najpogosteje: <strong style="color:var(--green-text);">${best[0]}</strong> · najredkeje: <strong style="color:var(--amber-text);">${worst[0]}</strong></div>`;
  }
}

// Trajanje treningov graf
let durationChart=null;
function renderDurationChart(){
  const canvas=document.getElementById('duration-chart');
  const empty=document.getElementById('duration-empty');
  if(!canvas)return;
  const sessions=getSessions().slice().reverse().filter(s=>s.durationMin>0);
  if(sessions.length<2){if(empty)empty.style.display='block';canvas.style.display='none';if(durationChart){durationChart.destroy();durationChart=null;}return;}
  if(empty)empty.style.display='none';canvas.style.display='block';
  if(durationChart)durationChart.destroy();
  const isDark=document.documentElement.getAttribute('data-theme')!=='light';
  const recent=sessions.slice(-20);
  durationChart=new Chart(canvas.getContext('2d'),{
    type:'line',
    data:{labels:recent.map(s=>s.date.slice(5)),datasets:[{label:'Min',data:recent.map(s=>s.durationMin),borderColor:'#7f77dd',backgroundColor:'rgba(127,119,221,0.1)',fill:true,tension:0.3,pointRadius:3}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{color:isDark?'#9da3ae':'#666'},grid:{color:isDark?'#2e3035':'#eee'}},x:{ticks:{color:isDark?'#9da3ae':'#666'},grid:{display:false}}}}
  });
}

async function editSession(idx){
  const sessions=getSessions();
  const s=sessions[idx];if(!s)return;
  const newDur=await uiPrompt(`Trajanje sesije v minutah:\n${s.dayName} ${s.date}`,s.durationMin);
  if(newDur===null)return;
  const n=parseInt(newDur);
  if(isNaN(n)||n<1||n>500){toast('Napačna vrednost (1-500 min)','err');return;}
  s.durationMin=n;
  // Posodobi tudi končni čas, če imamo začetni
  if(s.startTime){
    try{
      const [h,m]=s.startTime.split(':').map(Number);
      const endMs=new Date();endMs.setHours(h,m+n,0,0);
      s.endTime=endMs.toLocaleTimeString('sl-SI',{hour:'2-digit',minute:'2-digit'});
    }catch(e){}
  }
  saveSessions(sessions);
  renderSessHist();renderWeeklySummary();
  toast('✓ Sesija posodobljena','ok');
}

async function deleteSession(idx){
  const sessions=getSessions();
  const s=sessions[idx];if(!s)return;
  if(!await uiConfirm(`Izbrišem sesijo ${s.dayName} ${s.date}?`))return;
  sessions.splice(idx,1);
  saveSessions(sessions);
  renderSessHist();renderWeeklySummary();
  toast('Izbrisana','ok');
}

async function addManualSession(){
  const date=await uiPrompt('Datum (npr. '+new Date().toISOString().split('T')[0]+'):',new Date().toISOString().split('T')[0]);
  if(!date)return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){toast('Format mora biti YYYY-MM-DD','err');return;}
  const dayChoice=await uiPrompt('Kateri dan?\n1 = Push A\n2 = Pull A\n3 = Noge\n4 = Push B\n5 = Pull B','1');
  const dayIdx=parseInt(dayChoice)-1;
  if(isNaN(dayIdx)||dayIdx<0||dayIdx>4){toast('Napačen dan','err');return;}
  const dur=await uiPrompt('Trajanje v minutah:','60');
  const durMin=parseInt(dur);
  if(isNaN(durMin)||durMin<1||durMin>500){toast('Napačno trajanje','err');return;}
  const week=await uiPrompt('Teden v ciklu (1-4):',String(cw+1));
  const wn=parseInt(week);
  if(isNaN(wn)||wn<1||wn>4){toast('Napačen teden','err');return;}
  const sessions=getSessions();
  const cyc=getCyc();
  sessions.unshift({
    date,
    dayName:DAY_NAMES[dayIdx],
    weekNum:wn,
    cycle:cyc.num,
    startTime:'',
    endTime:'',
    durationMin:durMin
  });
  saveSessions(sessions);
  renderSessHist();renderWeeklySummary();
  toast('✓ Sesija dodana','ok');
}

function renderWeeklySummary(){
  const sessions=getSessions();
  const all=getSets();
  const el=document.getElementById('sum-grid');const det=document.getElementById('sum-detail');if(!el)return;
  const now=new Date();
  const weekAgo=new Date(now-7*24*3600*1000);
  const prevWeekAgo=new Date(now-14*24*3600*1000);
  const thisWeekSess=sessions.filter(s=>new Date(s.date)>=weekAgo);
  const prevWeekSess=sessions.filter(s=>new Date(s.date)>=prevWeekAgo&&new Date(s.date)<weekAgo);
  // Helper za štetje setov in volumna iz seznama sesij
  function calcSetsAndVol(sessList){
    let s=0,v=0;
    sessList.forEach(sess=>{
      const di=DAY_NAMES.indexOf(sess.dayName);
      if(di<0||!PROG.days[di])return;
      // SAMO pravi teden te sesije
      const w=Math.max(0,(sess.weekNum||1)-1);
      for(let ei=0;ei<PROG.days[di].ex.length;ei++){
        const key=sdk(sess.cycle,w,di,ei);
        if(all[key]){all[key].filter(x=>x.done).forEach(x=>{s++;v+=(parseFloat(x.kg)||0)*(parseFloat(x.reps)||0);});}
      }
    });
    return {sets:s,vol:v};
  }
  const thisStats=calcSetsAndVol(thisWeekSess);
  const prevStats=calcSetsAndVol(prevWeekSess);
  const trainDays=thisWeekSess.length;
  const totalMin=thisWeekSess.reduce((a,b)=>a+(b.durationMin||0),0);
  const prevDays=prevWeekSess.length;
  const prevMin=prevWeekSess.reduce((a,b)=>a+(b.durationMin||0),0);
  function diff(cur,prev,unit){if(prev===0&&cur===0)return'';if(prev===0)return'';const d=cur-prev;const sign=d>0?'+':'';return`<span class="${d>0?'sum-up':d<0?'sum-down':'sum-same'}">${sign}${d}${unit}</span>`;}
  // Streak — zaporedni tedni s vsaj 1 sesijo
  const streak=calcStreak(sessions);
  // Skupna statistika cikla
  const cyc=getCyc();
  const cycleSess=sessions.filter(s=>s.cycle===cyc.num);
  const cycleStats=calcSetsAndVol(cycleSess);
  const cycleMin=cycleSess.reduce((a,b)=>a+(b.durationMin||0),0);
  el.innerHTML=`
    <div class="sum-card"><div class="sum-val">${trainDays}</div><div class="sum-lbl">Treningi ta teden</div><div class="sum-diff">${diff(trainDays,prevDays,'')}</div></div>
    <div class="sum-card"><div class="sum-val">${totalMin}</div><div class="sum-lbl">Skupaj minut</div><div class="sum-diff">${diff(totalMin,prevMin,'min')}</div></div>
    <div class="sum-card"><div class="sum-val">${thisStats.sets}</div><div class="sum-lbl">Opravljene serije</div><div class="sum-diff">${diff(thisStats.sets,prevStats.sets,'')}</div></div>
    <div class="sum-card"><div class="sum-val">${thisStats.vol>0?(thisStats.vol>=1000?Math.round(thisStats.vol/1000)+'t':Math.round(thisStats.vol)+'kg'):'—'}</div><div class="sum-lbl">Skupni volumen</div><div class="sum-diff">${prevStats.vol>0?diff(Math.round(thisStats.vol),Math.round(prevStats.vol),'kg'):''}</div></div>
    <div class="sum-card"><div class="sum-val">🔥 ${streak}</div><div class="sum-lbl">Streak (tedni)</div><div class="sum-diff" style="font-size:10px;">${streak>=4?'odlično!':streak>=2?'gradiš ritem':'zacni nov streak'}</div></div>
    <div class="sum-card"><div class="sum-val">${cycleSess.length}</div><div class="sum-lbl">Sesij v ciklu ${cyc.num}</div><div class="sum-diff" style="font-size:10px;">${cycleStats.vol>0?Math.round(cycleStats.vol/1000)+'t · '+cycleMin+' min':''}</div></div>
  `;
  if(det)det.innerHTML=thisWeekSess.length>0?thisWeekSess.map(s=>`${s.date}: <strong>${s.dayName}</strong> (${s.durationMin}min)`).join(' · '):'Ni treningov ta teden.';
}

// Streak — koliko zaporednih tednov je vsaj 1 sesija
function calcStreak(sessions){
  if(sessions.length===0)return 0;
  const now=new Date();
  let streak=0;
  for(let w=0;w<104;w++){
    const start=new Date(now-7*(w+1)*86400000);
    const end=new Date(now-7*w*86400000);
    const has=sessions.some(s=>{const d=new Date(s.date);return d>=start&&d<end;});
    if(has)streak++;
    else if(w===0)continue;  // ta teden še lahko trenira
    else break;
  }
  return streak;
}

function renderRestPlan(){
  const plan=getRestPlan();
  const grid=document.getElementById('rest-grid');if(!grid)return;
  // Cikel opcij: počitek, 5 treningov, kardio
  const colors={rest:'var(--bg3)','Push A':'#1d9e75','Pull A':'#3b82f6','Noge':'#f59e0b','Push B':'#10b981','Pull B':'#6366f1',cardio:'#ec4899'};
  const labels={rest:'Počitek','Push A':'Push A','Pull A':'Pull A','Noge':'Noge','Push B':'Push B','Pull B':'Pull B',cardio:'Kardio'};
  grid.innerHTML=WEEK_DAYS.map((d,i)=>{
    const type=plan[i]||'rest';
    const isTrain=type!=='rest'&&type!=='cardio';
    const bg=colors[type]||'var(--bg3)';
    const txtColor=(type==='rest')?'var(--text2)':'#fff';
    return`<div onclick="toggleRestDay(${i})" style="padding:8px 2px;text-align:center;border-radius:8px;background:${bg};cursor:pointer;min-height:46px;display:flex;flex-direction:column;justify-content:center;${type==='rest'?'border:.5px solid var(--border);':''}">
      <div style="font-size:10px;color:${type==='rest'?'var(--text3)':'rgba(255,255,255,.85)'};margin-bottom:3px;">${d}</div>
      <div style="font-size:10px;font-weight:600;color:${txtColor};line-height:1.1;">${labels[type]}</div>
    </div>`;
  }).join('');
  // Povzetek
  const trainDays=plan.filter(t=>t&&t!=='rest'&&t!=='cardio').length;
  const cardioDays=plan.filter(t=>t==='cardio').length;
  const restDays=7-trainDays-cardioDays;
  const sum=document.getElementById('plan-summary');
  if(sum)sum.textContent=`${trainDays} treningov · ${cardioDays} kardio · ${restDays} počitka na teden`;
}

const PLAN_CYCLE=['rest','Push A','Pull A','Noge','Push B','Pull B','cardio'];
function toggleRestDay(idx){
  const plan=getRestPlan();
  const cur=plan[idx]||'rest';
  const ci=PLAN_CYCLE.indexOf(cur);
  plan[idx]=PLAN_CYCLE[(ci+1)%PLAN_CYCLE.length];
  saveRestPlan(plan);renderRestPlan();
}

// BODYWEIGHT
function getBWGoal(){const v=parseFloat(localStorage.getItem('wt_bwgoal'));return isNaN(v)?80:v;}
function saveBWGoal(v){const n=parseFloat(v);if(!isNaN(n)&&n>40&&n<200){localStorage.setItem('wt_bwgoal',n);renderBW();}}
function initBWGoal(){const g=getBWGoal();const el=document.getElementById('bw-goal');if(el)el.value=g;}
async function editBW(date,curKg){
  const newVal=await uiPrompt(`Nova teža za ${date}:`,curKg);
  if(newVal===null)return;
  const n=parseFloat(newVal);
  if(isNaN(n)||n<30||n>250){toast('Napačna vrednost','err');return;}
  const d=getBW();d[date]=n;saveBW(d);renderBW();
  toast('✓ Teža posodobljena','ok');
}
async function deleteBW(date){
  if(!await uiConfirm(`Izbrišem vnos teže za ${date}?`))return;
  const d=getBW();delete d[date];saveBW(d);renderBW();
  toast('Izbrisano','ok');
}

function logBW(){
  const val=parseFloat(document.getElementById('bw-in').value);
  if(isNaN(val)||val<40||val>200)return;
  const d=getBW();d[new Date().toISOString().split('T')[0]]=val;saveBW(d);
  document.getElementById('bw-in').value='';renderBW();
}
function renderBW(){
  const data=getBW(),entries=Object.entries(data).sort((a,b)=>a[0].localeCompare(b[0]));
  if(entries.length===0)return;
  const goal=getBWGoal();
  const first=parseFloat(entries[0][1]);
  const latest=parseFloat(entries[entries.length-1][1]);
  // Za napredek uporabi 7-dnevno povprečje PO DATUMIH (stabilno, konsistentno s statistiko)
  const avg7=avg7d(entries);
  const isLoss=goal<first;
  const total=Math.abs(first-goal);
  const done=isLoss?Math.max(0,first-avg7):Math.max(0,avg7-first);
  const pct=total>0?Math.min(100,Math.round((done/total)*100)):0;
  document.getElementById('bw-prog-wrap').style.display='block';
  document.getElementById('bw-chart-card').style.display='block';
  document.getElementById('bw-log-card').style.display='block';
  document.getElementById('bw-pf').style.width=pct+'%';
  document.getElementById('bw-pt').textContent=done.toFixed(1)+'kg '+(isLoss?'izgubljeno':'pridobljeno')+' · '+pct+'%';
  const pl=document.getElementById('bw-prog-label');if(pl)pl.textContent=`Napredek do ${goal}kg`;
  const sl=document.getElementById('bw-start-label');if(sl)sl.textContent=`Start: ${first}kg`;
  const gl=document.getElementById('bw-goal-label');if(gl)gl.textContent=`Cilj: ${goal}kg`;
  const bwRev=entries.slice().reverse();
  const bwRow=(e,i,arr)=>{const prev=arr[i+1];const diff=prev?parseFloat(e[1])-parseFloat(prev[1]):0;const ds=diff!==0?`<span style="font-size:11px;color:${diff<0?'var(--green-text)':'var(--red-text)'}">${diff<0?'↓':'↑'}${Math.abs(diff).toFixed(1)}kg</span>`:'';return`<div class="bwe"><span>${e[0]}</span><span style="display:flex;gap:8px;align-items:center;">${ds}<strong style="color:var(--text);">${e[1]}kg</strong><button class="bk-item-btn" style="font-size:11px;padding:2px 6px;" onclick="editBW('${e[0]}',${e[1]})" title="Uredi">✎</button><button class="bk-item-btn del" style="font-size:11px;padding:2px 6px;" onclick="deleteBW('${e[0]}')" title="Izbriši">×</button></span></div>`;};
  const bwShown=bwRev.slice(0,10).map((e,i)=>bwRow(e,i,bwRev)).join('');
  const bwRest=bwRev.slice(10).map((e,i)=>bwRow(e,i+10,bwRev)).join('');
  let bwHtml=bwShown;
  if(bwRest){
    bwHtml+=`<div id="bw-log-rest" style="display:none;">${bwRest}</div>
    <button class="sb" onclick="const r=document.getElementById('bw-log-rest');const open=r.style.display!=='none';r.style.display=open?'none':'block';this.textContent=open?'▾ Prikaži vse (${bwRev.length})':'▴ Skrij';" style="width:100%;margin-top:.5rem;background:var(--bg3);font-size:12px;">▾ Prikaži vse (${bwRev.length})</button>`;
  }
  document.getElementById('bw-log').innerHTML=bwHtml;
  const labels=entries.map(e=>e[0].slice(5)),vals=entries.map(e=>parseFloat(e[1]));
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  const gc=isDark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.06)',tc=isDark?'#9da3ae':'#666';
  const ctx=document.getElementById('bw-chart').getContext('2d');
  if(bwChart)bwChart.destroy();
  const allVals=[...vals,goal];
  const yMin=Math.floor(Math.min(...allVals)-1),yMax=Math.ceil(Math.max(...allVals)+1);
  bwChart=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'Teža',data:vals,borderColor:'#1d9e75',backgroundColor:'rgba(29,158,117,0.1)',tension:0.3,pointRadius:3,pointBackgroundColor:'#1d9e75',borderWidth:1.5},{label:'7-dnevno povprečje',data:movingAvgDate(entries,7),borderColor:'#7f77dd',backgroundColor:'transparent',tension:0.4,pointRadius:0,borderWidth:2.5},{label:'Cilj',data:Array(labels.length).fill(goal),borderColor:'#ef9f27',borderDash:[4,4],borderWidth:1.5,pointRadius:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,labels:{color:tc,font:{size:10},boxWidth:12}}},scales:{y:{min:yMin,max:yMax,ticks:{color:tc,font:{size:11}},grid:{color:gc},border:{color:gc}},x:{ticks:{color:tc,font:{size:10},maxRotation:45},grid:{display:false},border:{color:gc}}}}});
  // Statistika + faze
  renderBWStats(entries,goal);
  renderPhases();
}

// 7-dnevno povprečje PO DATUMIH (zadnjih 7 dni od zadnjega vnosa)
function avg7d(entries){
  if(!entries||entries.length===0)return null;
  const lastT=new Date(entries[entries.length-1][0]).getTime();
  let win=entries.filter(e=>lastT-new Date(e[0]).getTime()<=6.5*86400000);
  if(win.length<2)win=entries.slice(-Math.min(7,entries.length));
  return win.reduce((a,e)=>a+parseFloat(e[1]),0)/win.length;
}
// Drseče povprečje PO DATUMIH za graf (za vsako točko: vnosi zadnjih `days` dni)
function movingAvgDate(entries,days){
  return entries.map((e,i)=>{
    const t=new Date(e[0]).getTime();
    let s=0,c=0;
    for(let j=i;j>=0;j--){
      if(t-new Date(entries[j][0]).getTime()>(days-0.5)*86400000)break;
      s+=parseFloat(entries[j][1]);c++;
    }
    return Math.round(s/c*100)/100;
  });
}
// (staro, po vnosih — ohranjeno za kompatibilnost)
function movingAvg(arr,window){
  return arr.map((_,i)=>{
    const start=Math.max(0,i-window+1);
    const slice=arr.slice(start,i+1);
    return Math.round(slice.reduce((a,b)=>a+b,0)/slice.length*100)/100;
  });
}

function renderBWStats(entries,goal){
  const card=document.getElementById('bw-stats-card');
  const el=document.getElementById('bw-stats');
  if(!el)return;
  if(entries.length<2){card.style.display='none';return;}
  card.style.display='block';
  const vals=entries.map(e=>parseFloat(e[1]));
  const dates=entries.map(e=>new Date(e[0]));
  // 7-dnevno povprečje — PO DATUMIH (zadnjih 7 dni), ne po vnosih
  const avg7=avg7d(entries);
  // Tedenska sprememba — LINEARNA REGRESIJA (zgladi dnevno nihanje); okno 21 dni, razširi na 35 če premalo točk
  const now=dates[dates.length-1].getTime();
  let weeklyChange=null;
  for(const winDays of [21,35]){
    const recentWindow=entries.filter(e=>now-new Date(e[0]).getTime()<=winDays*86400000);
    if(recentWindow.length>=3){
      const pts=recentWindow.map(e=>({x:(new Date(e[0]).getTime()-now)/86400000,y:parseFloat(e[1])}));
      const nP=pts.length;
      const sumX=pts.reduce((a,p)=>a+p.x,0), sumY=pts.reduce((a,p)=>a+p.y,0);
      const sumXY=pts.reduce((a,p)=>a+p.x*p.y,0), sumXX=pts.reduce((a,p)=>a+p.x*p.x,0);
      const denom=nP*sumXX-sumX*sumX;
      if(Math.abs(denom)>0.0001){weeklyChange=((nP*sumXY-sumX*sumY)/denom)*7;break;}
    }
  }
  if(weeklyChange===null&&vals.length>=2){
    const daySpan=(dates[dates.length-1]-dates[0])/86400000||1;
    weeklyChange=((vals[vals.length-1]-vals[0])/daySpan)*7;
  }
  // Napoved do cilja — upošteva SMER trenda
  let forecast='';
  if(weeklyChange!==null&&Math.abs(weeklyChange)>0.05){
    const remaining=goal-avg7;
    if(Math.abs(remaining)<=0.2){
      forecast=`✓ Cilj dosežen!`;
    } else {
      const movingToward=(remaining<0&&weeklyChange<0)||(remaining>0&&weeklyChange>0);
      if(movingToward){
        const weeksNeeded=remaining/weeklyChange;
        if(weeksNeeded<260){
          const reachDate=new Date(now+weeksNeeded*7*86400000);
          forecast=`📅 Pri tem tempu dosežeš ${goal}kg okoli <strong>${reachDate.toLocaleDateString('sl-SI')}</strong> (~${Math.round(weeksNeeded)} tednov)`;
        } else forecast=`Tempo prepočasen za realno napoved`;
      } else {
        forecast=`⚠ Trend gre trenutno <strong>stran od cilja</strong> (${weeklyChange>0?'+':''}${weeklyChange.toFixed(2)}kg/teden)`;
      }
    }
  }
  // Tempo ocena za cut
  let tempoNote='';
  if(weeklyChange!==null&&weeklyChange<0){
    const rate=Math.abs(weeklyChange);
    if(rate>0.8)tempoNote='<span style="color:var(--red-text);">⚠ Hitro — tvegaš izgubo mišice. Razmisli o manjšem deficitu.</span>';
    else if(rate>=0.3&&rate<=0.7)tempoNote='<span style="color:var(--green-text);">✓ Idealen tempo za cut (0.3-0.7kg/teden)</span>';
    else if(rate<0.3)tempoNote='<span style="color:var(--amber-text);">Počasen tempo — ok če si blizu cilja</span>';
  }
  const wcColor=weeklyChange<0?'var(--green-text)':weeklyChange>0?'var(--red-text)':'var(--text2)';
  const wcStr=weeklyChange!==null?`${weeklyChange>0?'+':''}${weeklyChange.toFixed(2)}kg`:'—';
  el.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:.5rem;">
      <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:700;color:var(--purple-text);">${avg7.toFixed(1)}kg</div>
        <div style="font-size:11px;color:var(--text3);">7-dnevno povprečje</div>
      </div>
      <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:700;color:${wcColor};">${wcStr}</div>
        <div style="font-size:11px;color:var(--text3);">Tedenska sprememba</div>
      </div>
    </div>
    ${tempoNote?`<div style="font-size:12px;padding:6px 0;">${tempoNote}</div>`:''}
    ${forecast?`<div style="font-size:12px;color:var(--text2);padding:6px;background:var(--bg3);border-radius:6px;">${forecast}</div>`:''}
    <div style="font-size:10px;color:var(--text3);margin-top:6px;">Dnevna teža niha ±1-2kg (voda, hrana). Sledi 7-dnevnemu povprečju, ne posameznim dnevom.</div>`;
}

// === FAZE (cut/bulk/maintenance) ===
function getPhases(){try{return JSON.parse(localStorage.getItem('wt_phases')||'[]');}catch{return [];}}
function savePhases(p){localStorage.setItem('wt_phases',JSON.stringify(p));}
function startPhase(){
  showPage('tools');
  document.getElementById('profile-status')?.scrollIntoView({block:'center',behavior:'smooth'});
}
function endPhase(idx){
  startPhase();
}
function deletePhase(idx){
  const phases=getPhases();
  if(phases[idx]&&!phases[idx].end){toast('Aktivno fazo spremeni v Nastavitvah.','err');return;}
  phases.splice(idx,1);savePhases(phases);renderPhases();
}
function renderPhases(){
  const el=document.getElementById('phase-list');if(!el)return;
  const phases=getPhases().slice().reverse();
  if(phases.length===0){el.innerHTML='<div style="font-size:11px;color:var(--text3);padding:.4rem;">Ni faz.</div>';return;}
  const labels={cut:'🔻 Cut',bulk:'🔺 Bulk',maintain:'➖ Maintenance'};
  const bw=getBW();
  el.innerHTML=phases.map((p,ri)=>{
    const idx=getPhases().length-1-ri;
    const active=!p.end;
    // Sprememba teže v fazi
    let change='';
    const inPhase=Object.entries(bw).filter(([d])=>d>=p.start&&(!p.end||d<=p.end)).sort();
    if(inPhase.length>=2){
      const diff=parseFloat(inPhase[inPhase.length-1][1])-parseFloat(inPhase[0][1]);
      change=` · ${diff>0?'+':''}${diff.toFixed(1)}kg`;
    }
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:.5px solid var(--border);font-size:12px;">
      <div><strong>${labels[p.type]||p.type}</strong><div style="font-size:10px;color:var(--text3);">${p.start} → ${p.end||'zdaj'}${change}</div></div>
      <div style="display:flex;gap:4px;">${active?`<button class="bk-item-btn" style="font-size:10px;" onclick="endPhase(${idx})">Končaj</button>`:''}<button class="bk-item-btn del" style="font-size:10px;" onclick="deletePhase(${idx})">×</button></div>
    </div>`;
  }).join('');
}

// MEASUREMENTS — neck removed
function renderMeas(){
  const inp=document.getElementById('meas-inputs');
  if(inp)inp.innerHTML=MEAS_FIELDS.map(f=>`<div style="display:flex;flex-direction:column;gap:4px;"><label style="font-size:11px;color:var(--text2);">${f} (cm)</label><input class="meas-in" type="number" id="mi-${f}" placeholder="cm" min="20" max="200" step="0.5"></div>`).join('');
  const data=getMeas(),entries=Object.entries(data).sort((a,b)=>a[0].localeCompare(b[0]));
  if(entries.length===0)return;
  document.getElementById('meas-curr-card').style.display='block';
  const latest=entries[entries.length-1][1],prev=entries.length>1?entries[entries.length-2][1]:null;
  document.getElementById('meas-curr').innerHTML=MEAS_FIELDS.map(f=>{const v=latest[f]||null;const pv=prev?prev[f]:null;const diff=pv&&v?parseFloat(v)-parseFloat(pv):null;const ds=diff!==null?`<div class="meas-sub" style="color:${diff<0?'var(--green-text)':'var(--amber-text)'}">${diff<0?'↓':'↑'}${Math.abs(diff).toFixed(1)}cm</div>`:'';return`<div class="meas-card"><div class="meas-lbl">${f}</div><div class="meas-val">${v?v+'cm':'—'}</div>${ds}</div>`;}).join('');
  if(entries.length>1){document.getElementById('meas-hist-card').style.display='block';document.getElementById('meas-hist').innerHTML=entries.slice().reverse().slice(0,6).map(e=>`<div style="padding:8px 0;border-bottom:.5px solid var(--border);"><div style="font-size:12px;font-weight:500;color:var(--text);margin-bottom:4px;">${e[0]}</div><div style="display:flex;flex-wrap:wrap;gap:8px;">${MEAS_FIELDS.filter(f=>e[1][f]).map(f=>`<span style="font-size:11px;color:var(--text2);">${f}: <strong style="color:var(--text);">${e[1][f]}cm</strong></span>`).join('')}</div></div>`).join('');}
}
function saveMeasurements(){
  const data=getMeas(),today=new Date().toISOString().split('T')[0],entry={};
  MEAS_FIELDS.forEach(f=>{const v=document.getElementById('mi-'+f)?.value;if(v)entry[f]=parseFloat(v);});
  if(Object.keys(entry).length===0){toast('Vnesi vsaj eno mero','err');return;}
  data[today]=entry;saveMeas(data);renderMeas();
  MEAS_FIELDS.forEach(f=>{const el=document.getElementById('mi-'+f);if(el)el.value='';});
}

// TOOLS
function barChanged(){
  const sel=document.getElementById('bar-w'),ci=document.getElementById('bar-custom');
  if(sel.value==='custom'){ci.style.display='';}
  else{ci.style.display='none';const g=getGym();g.bar=parseFloat(sel.value)||20;saveGym(g);}
}
function saveBarCustom(){const g=getGym();g.bar=parseFloat(document.getElementById('bar-custom').value)||20;saveGym(g);}
function initPlates(){
  const gym=getGym();
  const barSel=document.getElementById('bar-w');if(barSel)barSel.value=String(gym.bar);
  const chips=document.getElementById('plate-chips');
  if(chips)chips.innerHTML=([1.25,2.5,5,10,15,20,25,50]).map(p=>`<div class="plate-chip${gym.plates.includes(p)?' on':''}" onclick="togglePlate(${p})">${p}kg</div>`).join('');
}
function togglePlate(p){
  const g=getGym();
  if(g.plates.includes(p))g.plates=g.plates.filter(x=>x!==p);
  else g.plates=[...g.plates,p].sort((a,b)=>a-b);
  saveGym(g);
  const chips=document.getElementById('plate-chips');
  if(chips)chips.innerHTML=([1.25,2.5,5,10,15,20,25,50]).map(pl=>`<div class="plate-chip${g.plates.includes(pl)?' on':''}" onclick="togglePlate(${pl})">${pl}kg</div>`).join('');
}
function calcPlatesManual(){
  const target=parseFloat(document.getElementById('plate-target').value);
  if(isNaN(target)||target<=0){toast('Vnesi ciljno težo','err');return;}
  const pl=calcPlatesFor(target);
  const res=document.getElementById('plate-result');
  if(!pl){res.innerHTML=`Ni možno sestaviti ${target}kg.`;res.classList.add('visible');return;}
  res.innerHTML=`<strong>Vsaka stran:</strong> ${pl.each}<br><span style="font-size:11px;">Palica ${pl.bar}kg + ${pl.perSide*2}kg = ${pl.total}kg</span>`;
  res.classList.add('visible');
}
function calcORM(){
  const kg=parseFloat(document.getElementById('orm-kg').value),reps=parseFloat(document.getElementById('orm-reps').value);
  if(isNaN(kg)||isNaN(reps)||reps<1||kg<=0)return;
  const epley=Math.round(kg*(1+reps/30)),brzycki=reps===1?kg:Math.round(kg/(1.0278-0.0278*reps)),avg=Math.round((epley+brzycki)/2);
  const pcts=[100,95,90,85,80,75,70].map(p=>`${p}%→${Math.round(avg*p/100/2.5)*2.5}kg`).join(' · ');
  const res=document.getElementById('orm-res');res.innerHTML=`<strong>Ocenjeni 1RM: ${avg}kg</strong><br><br><span style="font-size:11px;line-height:2;">${pcts}</span>`;res.classList.add('visible');
}
function calcWU(){
  const kg=parseFloat(document.getElementById('wu-kg').value),type=document.getElementById('wu-t').value;
  if(isNaN(kg)||kg<=0)return;
  const wu=buildWU(kg,type);
  const res=document.getElementById('wu-res');
  res.innerHTML='<strong>Ogrevanje:</strong><br><br>'+wu.map((w,i)=>`<div style="padding:5px 0;border-bottom:.5px solid var(--border);font-size:12px;">S${i+1}: <strong>${w.kg}kg</strong> × ${w.reps} ${w.pct===0?'(palica)':'('+w.pct+'%)'}</div>`).join('');
  res.classList.add('visible');
}

async function exportData(){
  // Najprej zberi photos iz IndexedDB
  let photos=[];
  try{photos=await getAllPhotos();}catch(e){console.warn('Ni fotografij:',e);}
  // Export kot JSON — ohrani vse podatke popolnoma
  const backup={
    version:5,
    schemaVersion:5,
    date:new Date().toISOString(),
    sets:getSets(),
    pr:getPRs(),
    notes:getNotes(),
    bw:getBW(),
    cycle:getCyc(),
    meas:getMeas(),
    gym:getGym(),
    sessions:getSessions(),
    pain:getPainData(),
    cynotes:getCyNotes(),
    restplan:getRestPlan(),
    setcounts:getSetCounts(),
    bwgoal:getBWGoal(),
    theme:localStorage.getItem(LS.theme)||'dark',
    // Nove dodatne nastavitve
    alarm:getAlarmSettings(),
    // bilateral removed
    collars:getCollars(),
    photos:photos,  // [{id, date, blob (base64)}]
    swaps:JSON.parse(localStorage.getItem('wt_exswap')||'{}'),
    sugs:JSON.parse(localStorage.getItem('wt_sugs6')||'{}'),
    extra_ex:JSON.parse(localStorage.getItem('wt_extra_ex')||'{}'),
    hidden_ex:JSON.parse(localStorage.getItem('wt_hidden_ex')||'{}'),
    daylists:{shared:JSON.parse(localStorage.getItem('wt_daylist_shared_v16')||'null'),cut:JSON.parse(localStorage.getItem('wt_daylist_cut')||'null'),bulk:JSON.parse(localStorage.getItem('wt_daylist_bulk')||'null')},
    ex_ordernames:JSON.parse(localStorage.getItem('wt_ex_ordernames')||'{}'),
    rep_prs:JSON.parse(localStorage.getItem('wt_rep_prs')||'{}'),
    phases:JSON.parse(localStorage.getItem('wt_phases')||'[]'),
    profile:getActiveProfile(),
    tm531:get531TMs(),
    offset531:get531CycleOffset(),
    goals:JSON.parse(localStorage.getItem('wt_goals')||'[]'),
    daylog:JSON.parse(localStorage.getItem('wt_daylog')||'{}'),
    custom_ex:JSON.parse(localStorage.getItem(CUST_KEY)||'[]'),
    kg_step:localStorage.getItem('wt_kg_step'),
    reps_step:localStorage.getItem('wt_reps_step'),
    colors:getStoredColors(),
    custom_rest:getCustomRest(),
    compact:isCompact(),
    gym_mode:getGymMode()
  };
  const json=JSON.stringify(backup,null,2);
  const blob=new Blob([json],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`workout_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();URL.revokeObjectURL(url);
  // Zapomnimo si datum zadnjega backupa
  localStorage.setItem('wt_last_backup',new Date().toISOString());
  // Also export CSV for readability
  exportCSV();
  toast('💾 Backup prenesen','ok');
}

function exportCSV(){
  const all=getSets(),bw=getBW(),meas=getMeas(),prs=getPRs(),sessions=getSessions();
  let csv='TRENINGI\nKljuč,Serija,Teža(kg),Ponovitve,Opravljeno\n';
  Object.entries(all).forEach(([k,sets])=>{sets.forEach((s,i)=>{csv+=`${k},${i+1},${s.kg||''},${s.reps||''},${s.done?'da':'ne'}\n`;});});
  csv+='\nTELESNA TEŽA\nDatum,Teža(kg)\n';
  Object.entries(bw).sort().forEach(([d,v])=>{csv+=`${d},${v}\n`;});
  csv+='\nMERE\nDatum,'+MEAS_FIELDS.join(',')+'\n';
  Object.entries(meas).sort().forEach(([d,v])=>{csv+=`${d},${MEAS_FIELDS.map(f=>v[f]||'').join(',')}\n`;});
  csv+='\nSESSIONS\nDatum,Dan,Teden,Cikel,Začetek,Konec,Trajanje(min)\n';
  sessions.forEach(s=>{csv+=`${s.date},${s.dayName},${s.weekNum},${s.cycle},${s.startTime||''},${s.endTime||''},${s.durationMin}\n`;});
  csv+='\nPR-JI\nKljuč,Teža(kg)\n';
  Object.entries(prs).forEach(([k,v])=>{csv+=`${k},${v}\n`;});
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`workout_${new Date().toISOString().split('T')[0]}.csv`;a.click();URL.revokeObjectURL(url);
}

let _pendingImport=null,_importChoiceResolve=null;
function chooseImportMode(summary){return new Promise(res=>{_importChoiceResolve=res;document.getElementById('import-mode-summary').textContent=summary;document.getElementById('import-mode-pop').classList.add('on');});}
function finishImportChoice(choice){document.getElementById('import-mode-pop').classList.remove('on');if(_importChoiceResolve){_importChoiceResolve(choice);_importChoiceResolve=null;}}
function importData(){
  if(stRun){toast('Najprej zaključi aktivno sesijo.','err');return;}
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
  input.onchange=e=>{const file=e.target.files[0];if(!file)return;if(file.size>80*1024*1024){toast('Datoteka je večja od 80 MB.','err');return;}const reader=new FileReader();reader.onload=async ev=>{try{const backup=JSON.parse(ev.target.result),v=validateBackupP1(backup);if(!v.ok){toast('Napačna backup datoteka: '+v.msg,'err');return;}const mode=await chooseImportMode(backupSummaryP1(backup));if(!mode)return;const rollback=await buildBackupJSON(false);await saveBackupToIDB(rollback,'rollback-before-import');await restoreBackupObjectP1(backup,{photos:true,mode});await autoBackupToIDB();toast(mode==='replace'?'✓ Podatki popolnoma obnovljeni':'✓ Podatki združeni','ok');}catch(err){toast('Napaka pri uvozu: '+err.message,'err');}};reader.onerror=()=>toast('Datoteke ni mogoče prebrati.','err');reader.readAsText(file);};input.click();
}
async function clearAll(){
  if(stRun){toast('Najprej zaključi aktivno sesijo.','err');return;}
  if(await uiConfirm('Ponastavi vse podatke? Pred brisanjem bom naredil lokalni rollback snapshot.','Ponastavi')){await autoBackupToIDB();clearManagedData();localStorage.removeItem(LS_SESS);showDay(cd);toast('Podatki ponastavljeni. Rollback je v lokalnih snapshotih.','ok');}
}


// Toast notifikacija
function toast(msg,type){
  const t=document.getElementById('toast-el');if(!t)return;
  t.textContent=String(msg??'');t.className='show'+(type?' '+type:'');
  clearTimeout(t._tm);t._tm=setTimeout(()=>t.className='',2200);
}

// Alarm settings v localStorage
const ALARM_DEFAULTS={sound:true,vibrate:true,notif:true,volume:90,melody:'default'};
function getAlarmSettings(){
  try{return {...ALARM_DEFAULTS,...JSON.parse(localStorage.getItem('wt_alarm6')||'{}')};}
  catch{return {...ALARM_DEFAULTS};}
}
function saveAlarmSettings(s){localStorage.setItem('wt_alarm6',JSON.stringify(s));}
function toggleAlarmOpt(opt){
  const s=getAlarmSettings();s[opt]=!s[opt];saveAlarmSettings(s);
  if(opt==='notif'&&s.notif&&'Notification' in window&&Notification.permission==='default'){
    Notification.requestPermission();
  }
  initAlarmUI();
}
function setVolume(v){const s=getAlarmSettings();s.volume=parseInt(v);saveAlarmSettings(s);document.getElementById('vol-label').textContent=v+'%';}
function setMelody(m){const s=getAlarmSettings();s.melody=m;saveAlarmSettings(s);}
function initAlarmUI(){
  const s=getAlarmSettings();
  ['sound','vibrate','notif'].forEach(k=>{
    const el=document.getElementById('tg-'+(k==='vibrate'?'vib':k));
    if(el)el.classList.toggle('on',!!s[k]);
  });
  const vs=document.getElementById('vol-slider');if(vs)vs.value=s.volume;
  const vl=document.getElementById('vol-label');if(vl)vl.textContent=s.volume+'%';
  const ms=document.getElementById('melody-sel');if(ms)ms.value=s.melody;
}
function testAlarm(){alertEnd('test-key');toast('▶ Test alarma','ok');}

// Melodije — vsaka vrne array tonov {f:freq, d:delay, len:trajanje, vol:0-1}
const MELODIES={
  default:[{f:880,d:0,len:.22,vol:.9},{f:880,d:.32,len:.22,vol:.9},{f:1320,d:.65,len:.5,vol:1.0}],
  gentle:[{f:660,d:0,len:.4,vol:.6},{f:880,d:.5,len:.6,vol:.7}],
  urgent:[{f:1100,d:0,len:.15,vol:1.0},{f:1100,d:.2,len:.15,vol:1.0},{f:1100,d:.4,len:.15,vol:1.0},{f:1100,d:.6,len:.15,vol:1.0},{f:1100,d:.8,len:.3,vol:1.0}],
  bell:[{f:523,d:0,len:.2,vol:.7},{f:659,d:.18,len:.2,vol:.8},{f:784,d:.36,len:.2,vol:.9},{f:1047,d:.54,len:.6,vol:1.0}]
};

// Najdi zadnji set (prejšnji teden ali prejšnji cikel) za to vajo
function getLastSession(di,ei,curCn,curCw){
  const all=getSets();
  for(let c=curCn;c>=1;c--){
    const wStart=(c===curCn)?curCw-1:3;
    for(let w=wStart;w>=0;w--){
      const k=sdk(c,w,di,ei);
      if(all[k]){
        const doneSets=all[k].filter(s=>s.kg&&s.reps);
        if(doneSets.length>0){
          const top=doneSets.reduce((a,b)=>parseFloat(b.kg)>parseFloat(a.kg)?b:a);
          // Datum iz sessions
          let dateStr='';
          const sessions=getSessions();
          const sess=sessions.find(s=>s.cycle===c&&s.dayName===DAY_NAMES[di]);
          if(sess){
            const d=Math.floor((Date.now()-new Date(sess.date).getTime())/(86400000));
            dateStr=d===0?'danes':d===1?'včeraj':`pred ${d} dnevi`;
          }
          return {kg:parseFloat(top.kg),reps:parseInt(top.reps),date:dateStr,c,w};
        }
      }
    }
  }
  return null;
}

// === ZGODOVINA VAJE (ločena po imenu — sledi pravi vaji ob zamenjavi) ===
function getExerciseHistory(di,ei,wantName){
  const all=getSets();
  const sessions=getSessions();
  const cyc=getCyc();
  const origName=PROG.days[di]&&PROG.days[di]._origEx?(PROG.days[di]._origEx[ei]?PROG.days[di]._origEx[ei].n:null):(PROG.days[di].ex[ei]?PROG.days[di].ex[ei].n:null);
  const out=[];
  for(let c=1;c<=cyc.num;c++){
    for(let w=0;w<4;w++){
      const k=sdk(c,w,di,ei);
      if(!all[k])continue;
      const done=all[k].filter(s=>s.kg&&s.reps&&s.done);
      if(done.length===0)continue;
      // Ime te sesije: iz exName setov (najpogostejši), sicer originalno ime pozicije
      const named=done.filter(s=>s.exName);
      let sessName;
      if(named.length>0){
        // najpogostejši exName
        const counts={};named.forEach(s=>{counts[s.exName]=(counts[s.exName]||0)+1;});
        sessName=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
      } else {
        sessName=origName; // stari sety brez imena → originalna vaja
      }
      // Vključi samo če ustreza iskani vaji
      if(wantName&&sessName!==wantName)continue;
      const sess=sessions.find(s=>s.cycle===c&&Math.max(0,(s.weekNum||1)-1)===w&&DAY_NAMES.indexOf(s.dayName)===di);
      const top=done.reduce((a,b)=>parseFloat(b.kg)>parseFloat(a.kg)?b:a);
      const totalVol=done.reduce((a,b)=>a+(parseFloat(b.kg)||0)*(parseFloat(b.reps)||0),0);
      const e1rm=Math.round(parseFloat(top.kg)*(1+parseFloat(top.reps)/30));
      out.push({c,w,date:sess?sess.date:null,sets:done.map(s=>({kg:parseFloat(s.kg),reps:parseInt(s.reps)})),top:{kg:parseFloat(top.kg),reps:parseInt(top.reps)},totalVol:Math.round(totalVol),e1rm});
    }
  }
  out.sort((a,b)=> b.c-a.c || b.w-a.w);
  return out;
}

const WEEK_LBL=['T1 Težko','T2 Težko','T3 Zmerno','T4 Deload'];
function openExHistory(di,ei){
  const exKey=sdk(getCyc().num,cw,di,ei);
  const e=PROG.days[di].ex[ei];
  const name=getSwappedName(exKey,e?e.n:'Vaja',e&&e.extra);
  document.getElementById('ex-hist-title').textContent='📊 '+name;
  const hist=getExerciseHistory(di,ei,name);
  const sumEl=document.getElementById('ex-hist-summary');
  const el=document.getElementById('ex-hist-content');
  if(hist.length===0){
    sumEl.textContent='';
    el.innerHTML='<div style="font-size:13px;color:var(--text3);padding:1rem;text-align:center;">Še ni zabeleženih podatkov za to vajo.</div>';
    document.getElementById('ex-hist-pop').classList.add('on');
    return;
  }
  // Povzetek: vseh-časov najboljši e1RM, najtežja teža
  const bestE1RM=Math.max(...hist.map(h=>h.e1rm));
  const heaviest=Math.max(...hist.map(h=>h.top.kg));
  const firstE=hist[hist.length-1].e1rm, lastE=hist[0].e1rm;
  const trend=lastE-firstE;
  sumEl.innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap;">
    <span style="background:var(--bg3);border-radius:6px;padding:4px 8px;">🏆 Best e1RM: <strong style="color:var(--green-text);">${bestE1RM}kg</strong></span>
    <span style="background:var(--bg3);border-radius:6px;padding:4px 8px;">💪 Najtežje: <strong>${heaviest}kg</strong></span>
    ${hist.length>=2?`<span style="background:var(--bg3);border-radius:6px;padding:4px 8px;">${trend>=0?'📈':'📉'} <strong style="color:${trend>=0?'var(--green-text)':'var(--amber-text)'};">${trend>=0?'+':''}${trend}kg</strong></span>`:''}
  </div>`;
  el.innerHTML=hist.map(h=>{
    const dateNice=h.date?new Date(h.date).toLocaleDateString('sl-SI'):'';
    const setsStr=h.sets.map(s=>`${s.kg}×${s.reps}`).join(' · ');
    const isBest=h.e1rm===bestE1RM;
    return `<div style="background:var(--bg3);border-radius:8px;padding:10px;margin-bottom:8px;${isBest?'border:1px solid var(--green);':''}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:12px;font-weight:600;color:var(--text);">C${h.c} · ${WEEK_LBL[h.w]}</span>
        <span style="font-size:11px;color:var(--text3);">${dateNice}</span>
      </div>
      <div style="font-size:13px;color:var(--text2);">${setsStr}</div>
      <div style="display:flex;gap:12px;margin-top:4px;font-size:11px;">
        <span style="color:var(--purple-text);">e1RM ${h.e1rm}kg${isBest?' 🏆':''}</span>
        <span style="color:var(--text3);">Vol ${h.totalVol}kg</span>
      </div>
    </div>`;
  }).join('');
  document.getElementById('ex-hist-pop').classList.add('on');
}

// Helper: nastavi kg vrednost in sproži update logiko
function setKgVal(exKey,si,di,ei,cn,kg){
  const isBarbell=BARBELL_EX.includes(PROG.days[di].ex[ei].n);
  const inp=document.querySelector(`#row-${exKey}-${si} .wi`);
  if(inp)inp.value=kg;
  sv(exKey,si,'kg',String(kg),di,ei,cn,isBarbell?1:0);
}

// Long-press na kg input — kopira težo iz prejšnjega tedna
let lpTimer=null,lpStarted=false;
function lpStart(e){
  const inp=e.target;
  if(!inp.classList||!inp.classList.contains('wi'))return;
  lpStarted=false;
  lpTimer=setTimeout(()=>{
    lpStarted=true;
    handleLongPress(inp);
  },550);
}
function lpCancel(){if(lpTimer){clearTimeout(lpTimer);lpTimer=null;}}
function handleLongPress(inp){
  const row=inp.closest('tr');if(!row)return;
  const m=row.id.match(/^row-c(\d+)w(\d+)d(\d+)e(\d+)-(\d+)$/);
  if(!m)return;
  const cn=+m[1],cwCur=+m[2],di=+m[3],ei=+m[4],si=+m[5];
  let prevC=cn,prevW=cwCur-1;
  if(prevW<0){prevC=cn-1;prevW=3;}
  if(prevC<1){toast('Ni prejšnjega tedna','err');return;}
  const prevKey=`c${prevC}w${prevW}d${di}e${ei}`;
  const all=getSets();
  let useSet=all[prevKey]&&all[prevKey][si]&&all[prevKey][si].kg?all[prevKey][si]:null;
  // Fallback na S1 prejšnjega tedna
  if(!useSet&&all[prevKey]&&all[prevKey][0]&&all[prevKey][0].kg)useSet=all[prevKey][0];
  if(!useSet){toast(`T${prevW+1}: prazno`,'err');return;}
  const exKey=`c${cn}w${cwCur}d${di}e${ei}`;
  setKgVal(exKey,si,di,ei,cn,useSet.kg);
  toast(`↺ ${useSet.kg}kg iz T${prevW+1}`,'ok');
  if(navigator.vibrate)navigator.vibrate(50);
}
// Event delegation — delujem na celem dokumentu
document.addEventListener('touchstart',lpStart,{passive:true});
document.addEventListener('touchend',lpCancel);
document.addEventListener('touchmove',lpCancel);
document.addEventListener('mousedown',lpStart);
document.addEventListener('mouseup',lpCancel);
document.addEventListener('mouseleave',lpCancel);

// ============== NEW FEATURES ==============

// --- RPE per set ---
function setRpe(key,si,rpe,di,ei,cn){
  const all=getSets();
  if(!all[key])all[key]=[];
  while(all[key].length<=si)all[key].push({kg:'',reps:'',done:false});
  all[key][si].rpe=all[key][si].rpe===rpe?null:rpe;
  saveSets(all);
  // Re-render samo RPE row
  const rpeRow=document.getElementById(`rpe-${key}-${si}`);
  if(rpeRow){
    const cur=all[key][si].rpe;
    rpeRow.querySelectorAll('.rpe-chip').forEach(c=>{
      const n=parseInt(c.textContent);
      const sel=cur===n;
      c.className='rpe-chip'+(sel?(n>=9?' sel high':n>=8?' sel med':' sel'):'');
    });
  }
}

// --- Drop set toggle (long-press / right-click na Log gumb) ---
function toggleDrop(key,si,di,ei,cn){
  const all=getSets();
  if(!all[key])all[key]=[];
  while(all[key].length<=si)all[key].push({kg:'',reps:'',done:false});
  all[key][si].drop=!all[key][si].drop;
  saveSets(all);
  toast(all[key][si].drop?'D Drop set':'Navaden set','ok');
  // Re-render row
  const wk=PROG.weeks[cw],n=nsf(di,ei,wk,key);
  rebuildRows(key,di,ei,wk,n,all[key]);
  // Force full re-render row class (drop styling)
  const tr=document.getElementById(`row-${key}-${si}`);
  if(tr)tr.classList.toggle('is-drop',!!all[key][si].drop);
  // Update set number cell
  const sn=tr&&tr.querySelector('.sn');
  if(sn)sn.innerHTML=`${si+1}${all[key][si].drop?'<span class="set-type drop">D</span>':''}`;
}

// --- Note per set ---
let noteCtx=null;
function openNote(key,si,di,ei,cn){
  noteCtx={key,si,di,ei,cn};
  const all=getSets();
  const cur=(all[key]&&all[key][si]&&all[key][si].note)||'';
  document.getElementById('note-input').value=cur;
  document.getElementById('note-pop').classList.add('on');
  setTimeout(()=>document.getElementById('note-input').focus(),100);
}
function closeNote(){
  document.getElementById('note-pop').classList.remove('on');
  noteCtx=null;
}
function saveNotePop(){
  if(!noteCtx)return;
  const {key,si}=noteCtx;
  const val=plainImportedText(document.getElementById('note-input').value.trim(),2000);
  const all=getSets();
  if(!all[key])all[key]=[];
  while(all[key].length<=si)all[key].push({kg:'',reps:'',done:false});
  all[key][si].note=val||undefined;
  saveSets(all);
  // Update icon
  const cell=document.querySelector(`#row-${key}-${si} .note-icon`);
  if(cell){cell.classList.toggle('has',!!val);cell.textContent=val?'📝':'＋';}
  closeNote();
  if(val)toast('💾 Opomba shranjena','ok');
}

// --- Quick weight chips ---
function getRecentWeights(exName,limit=3){
  // Iz vseh setov za to vajo, preštej najpogostejše teže
  const all=getSets();
  const counts={};
  Object.keys(all).forEach(key=>{
    const m=key.match(/^c(\d+)w(\d+)d(\d+)e(\d+)$/);
    if(!m)return;
    const di=+m[3],ei=+m[4];
    if(!PROG.days[di]||!PROG.days[di].ex[ei])return;
    if(PROG.days[di].ex[ei].n!==exName)return;
    (all[key]||[]).forEach(s=>{
      if(s.kg){const w=parseFloat(s.kg);if(w>0)counts[w]=(counts[w]||0)+1;}
    });
  });
  return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,limit).map(e=>parseFloat(e[0]));
}
function renderQuickWeights(exKey,si,di,ei,cn,exName){
  const recent=getRecentWeights(exName,3);
  if(recent.length===0)return '';
  return `<div class="qw-row">${recent.map(w=>`<button class="qw-chip" onclick="quickKg('${exKey}',${si},${di},${ei},${cn},${w})">${w}kg</button>`).join('')}</div>`;
}
function quickKg(exKey,si,di,ei,cn,kg){
  const isBarbell=BARBELL_EX.includes(PROG.days[di].ex[ei].n);
  const inp=document.querySelector(`#row-${exKey}-${si} .wi`);
  if(inp)inp.value=kg;
  sv(exKey,si,'kg',String(kg),di,ei,cn,isBarbell?1:0);
}

// --- Plate calc collars ---
function getCollars(){return parseFloat(localStorage.getItem('wt_collars_kg')||'0');}
function setCollars(v){localStorage.setItem('wt_collars_kg',String(v));toast('💾 Shranjeno','ok');}
function initCollarsUI(){
  const inp=document.getElementById('collars-kg');
  if(inp)inp.value=getCollars()||'';
}

// --- Smart deload detection ---
function checkDeloadNeeded(di,ei,cn){
  const exName=PROG.days[di].ex[ei].n;
  if(!PROG.days[di].ex[ei].m)return;  // samo glavne vaje
  // Zberi performance zadnjih 3 sesij za to vajo
  const all=getSets();
  const sess=[];
  for(let c=cn;c>=Math.max(1,cn-1);c--){
    for(let w=3;w>=0;w--){
      const k=`c${c}w${w}d${di}e${ei}`;
      if(all[k]){
        const done=all[k].filter(s=>s.done&&s.kg&&s.reps);
        if(done.length>0){
          const top=done.reduce((a,b)=>parseFloat(b.kg)>parseFloat(a.kg)?b:a);
          sess.push({c,w,kg:parseFloat(top.kg),reps:parseInt(top.reps),e1rm:parseFloat(top.kg)*(1+parseInt(top.reps)/30)});
          if(sess.length>=3)break;
        }
      }
    }
    if(sess.length>=3)break;
  }
  if(sess.length<3)return;
  // Če e1RM pada 2 sesije zapored
  const drops=(sess[0].e1rm<sess[1].e1rm)&&(sess[1].e1rm<sess[2].e1rm);
  if(drops){
    const key=`deload_warn_${exName}_c${cn}w${cw}`;
    if(localStorage.getItem(key))return;  // ne spamiraj
    localStorage.setItem(key,'1');
    setTimeout(()=>{
      const card=document.getElementById('ec-'+sdk(cn,cw,di,ei));
      if(!card)return;
      const w=document.createElement('div');
      w.className='deload-warn';
      w.innerHTML=`<span>📉 Stagnacija na <strong>${exName}</strong> — 3 sesije zapored padec. Razmisli o deloadu.</span><button onclick="this.parentElement.remove()">OK</button>`;
      card.querySelector('.bdg').after(w);
    },300);
  }
}

// --- Volume per muscle group ---
function calcVolumeThisWeek(){
  const all=getSets();
  const cn=getCyc().num;
  const groups={};
  const customs=getCustomExercises();
  PROG.days.forEach((d,di)=>{
    const allEx=buildDayExList(di);
    allEx.forEach((e,ei)=>{
      let map=EX_MAP[e.n];
      // Če ni v EX_MAP, poišči v built-in DB ali custom
      if(!map){
        const dbEx=EXERCISE_DB.find(x=>x.n===e.n);
        if(dbEx){map={p:[dbEx.m],s:dbEx.s?dbEx.s.split(', '):[]};}
        else{const cu=customs.find(x=>x.n===e.n);if(cu)map={p:[cu.muscle],s:[]};}
      }
      if(!map)return;
      const k=`c${cn}w${cw}d${di}e${ei}`;
      const sets=(all[k]||[]).filter(s=>s.done&&s.kg&&s.reps&&!s.drop);
      const cnt=sets.length;
      if(cnt===0)return;
      map.p.forEach(m=>{groups[m]=(groups[m]||0)+cnt;});
      (map.s||[]).forEach(m=>{groups[m]=(groups[m]||0)+cnt*0.5;});
    });
  });
  return groups;
}
function renderVolumeView(){
  const groups=calcVolumeThisWeek();
  const allMuscles=[...new Set([...Object.keys(VOL_TARGETS),...Object.keys(groups)])];
  const sorted=allMuscles.sort((a,b)=>(groups[b]||0)-(groups[a]||0));
  if(sorted.length===0)return '<div style="color:var(--text3);font-size:12px;padding:.5rem;">Ni opravljenih vaj ta teden.</div>';
  const maxX=Math.max(20,...sorted.map(m=>groups[m]||0));
  const html=sorted.map(m=>{
    const cnt=groups[m]||0;
    const t=VOL_TARGETS[m]||{min:0,max:20};
    const pct=Math.min(100,(cnt/maxX)*100);
    let cls='under',tag='',tagcls='';
    if(cnt<t.min){cls='under';tag='pod MEV';tagcls='vl-low';}
    else if(cnt>=t.min&&cnt<=t.max){cls='optimal';tag='optimal';tagcls='vl-opt';}
    else if(cnt>t.max&&cnt<=t.max*1.3){cls='high';tag='visoko';tagcls='vl-high';}
    else{cls='over';tag='MRV+';tagcls='vl-over';}
    return `<div class="vol-grp-row"><span class="vol-grp-name">${m}<span class="vl-tag ${tagcls}">${tag}</span></span><div class="vol-grp-bar"><div class="vol-grp-fill ${cls}" style="width:${pct}%;"></div></div><span class="vol-grp-cnt">${cnt%1===0?cnt:cnt.toFixed(1)}</span></div>`;
  }).join('');
  return `<div style="font-size:10px;color:var(--text3);margin-bottom:6px;">MEV=minimum za rast · optimal=10-20 setov · MRV=meja okrevanja</div><div class="vol-grp">${html}</div><div class="vol-legend"><span><i style="background:var(--blue);"></i>Pod MEV</span><span><i style="background:var(--green);"></i>Optimalno</span><span><i style="background:var(--amber);"></i>Visoko</span><span><i style="background:var(--red);"></i>MRV+</span></div>`;
}

// === MIŠIČNI HEATMAP ===
function renderMuscleHeatmap(){
  const groups=calcVolumeThisWeek();
  const muscles=Object.keys(VOL_TARGETS);
  const withData=muscles.filter(m=>(groups[m]||0)>0);
  if(withData.length===0)return '<div style="color:var(--text3);font-size:12px;padding:.5rem;text-align:center;">Ni opravljenih vaj ta teden.</div>';
  const sorted=muscles.sort((a,b)=>(groups[b]||0)-(groups[a]||0));
  const rows=sorted.map(m=>{
    const cnt=groups[m]||0;
    const t=VOL_TARGETS[m]||{min:8,max:20};
    const mrv=t.max*1.3;
    let color,status;
    if(cnt===0){color='var(--bg4)';status='—';}
    else if(cnt<t.min){color='#378add';status='premalo';}
    else if(cnt<=t.max){color='#1d9e75';status='optimal ✓';}
    else if(cnt<=mrv){color='#ef9f27';status='veliko';}
    else{color='#e24b4a';status='preveč';}
    const pct=Math.min(100,(cnt/(mrv||20))*100);
    return `<div class="mh-row"><span class="mh-name">${m}</span><div class="mh-bar-bg"><div class="mh-bar" style="width:${pct}%;background:${color};">${cnt>0?(cnt%1===0?cnt:cnt.toFixed(1)):''}</div></div><span class="mh-status" style="color:${color};">${status}</span></div>`;
  }).join('');
  return `<div class="mh-wrap">${rows}</div><div class="mh-legend"><span><i style="background:#378add;"></i>Premalo</span><span><i style="background:#1d9e75;"></i>Optimal</span><span><i style="background:#ef9f27;"></i>Veliko</span><span><i style="background:#e24b4a;"></i>Preveč</span></div>`;
}

// === MESEČNI KOLEDAR TRENINGOV ===
let mcalOffset=0; // 0 = trenutni mesec, -1 = prejšnji, ...
// Barva za vsak dan treninga
const DAY_COLORS={"Push A":"#1d9e75","Pull A":"#3b82f6","Noge":"#f59e0b","Push B":"#10b981","Pull B":"#6366f1"};
// Kratka oznaka
const DAY_SHORT={"Push A":"Push A","Pull A":"Pull A","Noge":"Noge","Push B":"Push B","Pull B":"Pull B"};

function changeMcalMonth(delta){
  mcalOffset+=delta;
  if(mcalOffset>0)mcalOffset=0; // ne v prihodnost
  const el=document.getElementById('train-calendar');
  if(el)el.innerHTML=renderTrainCalendar();
}

function renderTrainCalendar(){
  const sessions=getSessions();
  if(sessions.length===0)return '<div style="color:var(--text3);font-size:12px;padding:.5rem;text-align:center;">Še ni treningov.</div>';
  // Map datum -> seznam dni treninga (lahko več treningov isti dan)
  const byDate={};
  sessions.forEach(s=>{
    if(!byDate[s.date])byDate[s.date]=[];
    byDate[s.date].push(s.dayName);
  });
  // Izračunaj prikazani mesec
  const today=new Date();today.setHours(0,0,0,0);
  const view=new Date(today.getFullYear(),today.getMonth()+mcalOffset,1);
  const year=view.getFullYear(),month=view.getMonth();
  const monthNames=["Januar","Februar","Marec","April","Maj","Junij","Julij","Avgust","September","Oktober","November","December"];
  const firstDow=(new Date(year,month,1).getDay()+6)%7; // pon=0
  const daysInMonth=new Date(year,month+1,0).getDate();
  const todayStr=today.toISOString().split('T')[0];
  // Glava z navigacijo
  let html=`<div class="mcal-head">
    <button class="mcal-nav" onclick="changeMcalMonth(-1)">‹</button>
    <div class="mcal-title">${monthNames[month]} ${year}</div>
    <button class="mcal-nav" onclick="changeMcalMonth(1)" ${mcalOffset>=0?'style="opacity:.3;"':''}>›</button>
  </div>`;
  // Dnevi v tednu
  html+=`<div class="mcal-grid">`;
  ["P","T","S","Č","P","S","N"].forEach(d=>{html+=`<div class="mcal-dow">${d}</div>`;});
  // Prazne celice pred 1.
  for(let i=0;i<firstDow;i++)html+=`<div class="mcal-day empty"></div>`;
  // Dnevi
  let trainCount=0;
  for(let day=1;day<=daysInMonth;day++){
    const dateStr=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const trainings=byDate[dateStr]||[];
    const isToday=dateStr===todayStr;
    if(trainings.length>0){
      trainCount++;
      const firstDay=trainings[0];
      const color=DAY_COLORS[firstDay]||"#1d9e75";
      const tag=trainings.length>1?`${trainings.length}×`:(DAY_SHORT[firstDay]||firstDay);
      html+=`<div class="mcal-day trained ${isToday?'today':''}" style="background:${color};" title="${dateStr}: ${trainings.join(', ')}">
        <div class="mcal-daynum">${day}</div>
        <div class="mcal-daytag">${tag}</div>
      </div>`;
    } else {
      html+=`<div class="mcal-day ${isToday?'today':''}"><div class="mcal-daynum">${day}</div></div>`;
    }
  }
  html+=`</div>`;
  // Legenda
  html+=`<div class="mcal-legend">`;
  Object.entries(DAY_COLORS).forEach(([name,color])=>{
    html+=`<span><i class="mcal-dot" style="background:${color};"></i>${name}</span>`;
  });
  html+=`</div>`;
  html+=`<div style="font-size:11px;color:var(--text3);margin-top:.5rem;text-align:center;">${trainCount} treningov v ${monthNames[month].toLowerCase()}u</div>`;
  return html;
}

// === e1RM TREND GRAF ===
let e1rmChart=null,e1rmActiveLift=0;
function getE1RMHistory(){
  const all=getSets();
  const lifts={};
  Object.entries(BIG_LIFTS).forEach(([key,exName])=>{lifts[exName]=[];});
  const sessions=getSessions().slice().reverse();
  sessions.forEach(s=>{
    if(Array.isArray(s.exercises)){
      // Locked snapshots are the historical source of truth, even after
      // another execution replaces the editable rows for this day/week.
      s.exercises.forEach(ex=>{
        if(ex.loadType==='bodyweight'||ex.loadType==='assisted')return;
        const sets=(ex.sets||[]).filter(x=>x.done&&x.type!=='warmup'&&!x.warm&&!x.drop&&Number(x.kg)>0&&Number(x.reps)>0);
        if(!sets.length)return;
        const best=Math.max(...sets.map(x=>Number(x.kg)*(1+Number(x.reps)/30)));
        if(!lifts[ex.name])lifts[ex.name]=[];
        lifts[ex.name].push({date:s.date,e1rm:Math.round(best)});
      });
      return;
    }
    const di=DAY_NAMES.indexOf(s.dayName);if(di<0)return;
    // SAMO pravi teden te sesije
    const w=Math.max(0,(s.weekNum||1)-1);
    PROG.days[di]&&PROG.days[di].ex.forEach((e,ei)=>{
      const k=sdk(s.cycle,w,di,ei);
      if(all[k]){
        const done=all[k].filter(x=>x.done&&x.kg&&x.reps);
        if(done.length>0){
          const best=done.reduce((mx,x)=>{const e1=parseFloat(x.kg)*(1+parseInt(x.reps)/30);return e1>mx?e1:mx;},0);
          if(best>0){
            if(!lifts[e.n])lifts[e.n]=[];
            lifts[e.n].push({date:s.date,e1rm:Math.round(best)});
          }
        }
      }
    });
  });
  // Obdrži samo vaje z >=2 točkama
  Object.keys(lifts).forEach(k=>{if(lifts[k].length<2)delete lifts[k];});
  return lifts;
}
function renderE1RMChart(){
  const hist=getE1RMHistory();
  const liftNames=Object.keys(hist);
  const chipsEl=document.getElementById('e1rm-lift-chips');
  const emptyEl=document.getElementById('e1rm-empty');
  const canvas=document.getElementById('e1rm-chart');
  if(liftNames.length===0){
    if(chipsEl)chipsEl.innerHTML='';
    if(emptyEl)emptyEl.style.display='block';
    if(canvas)canvas.style.display='none';
    if(e1rmChart){e1rmChart.destroy();e1rmChart=null;}
    return;
  }
  if(emptyEl)emptyEl.style.display='none';
  if(canvas)canvas.style.display='block';
  if(e1rmActiveLift>=liftNames.length)e1rmActiveLift=0;
  // Chips
  if(chipsEl)chipsEl.innerHTML=liftNames.map((n,i)=>`<button class="lift-chip${i===e1rmActiveLift?' on':''}" onclick="selectE1RMLift(${i})">${n.length>18?n.slice(0,16)+'…':n}</button>`).join('');
  const activeName=liftNames[e1rmActiveLift];
  const data=hist[activeName];
  if(e1rmChart)e1rmChart.destroy();
  const ctx=canvas.getContext('2d');
  const isDark=document.documentElement.getAttribute('data-theme')!=='light';
  e1rmChart=new Chart(ctx,{
    type:'line',
    data:{
      labels:data.map(d=>d.date.slice(5)),
      datasets:[{
        label:activeName+' e1RM (kg)',
        data:data.map(d=>d.e1rm),
        borderColor:'#1d9e75',
        backgroundColor:'rgba(29,158,117,0.1)',
        fill:true,tension:0.3,pointRadius:4,pointBackgroundColor:'#1d9e75'
      }]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        y:{ticks:{color:isDark?'#9da3ae':'#666'},grid:{color:isDark?'#2e3035':'#eee'}},
        x:{ticks:{color:isDark?'#9da3ae':'#666'},grid:{display:false}}
      }
    }
  });
}
function selectE1RMLift(i){e1rmActiveLift=i;renderE1RMChart();}

// --- PR feed timeline ---
function renderPRFeed(){
  const prs=getPRs();
  const items=[];
  Object.entries(prs).forEach(([k,v])=>{
    if(typeof v==='object'){
      const exName=v.exName||k;
      if(Array.isArray(v.history)){
        v.history.forEach(h=>items.push({exName,...h}));
      } else if(v.kg) {
        items.push({exName,kg:v.kg,reps:v.reps||1,date:v.date||''});
      }
    } else if(typeof v==='number'&&v>0){
      // Stari format — fallback z imenom iz keya prXY (di,ei)
      const m=k.match(/^pr(\d)(\d+)$/);
      if(m){
        const di=+m[1],ei=+m[2];
        const exName=(PROG.days[di]&&PROG.days[di].ex[ei])?PROG.days[di].ex[ei].n:'Vaja';
        items.push({exName,kg:v,reps:1,date:''});
      }
    }
  });
  items.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(items.length===0)return '<div style="color:var(--text3);font-size:12px;padding:.5rem;">Še brez PR-jev.</div>';
  const renderItem=i=>{
    const e1rm=Math.round((parseFloat(i.kg)||0)*(1+(parseInt(i.reps)||1)/30));
    const dateNice=i.date?new Date(i.date).toLocaleDateString('sl-SI'):'';
    return `<div class="pr-item"><div class="pr-item-l"><div class="pr-item-name">${i.exName}</div><div class="pr-item-date">${dateNice}</div></div><div class="pr-item-r"><div class="pr-item-val">${i.kg}kg × ${i.reps||1}</div><div class="pr-item-delta">e1RM ${e1rm}kg</div></div></div>`;
  };
  const shown=items.slice(0,8).map(renderItem).join('');
  const rest=items.slice(8).map(renderItem).join('');
  let html=shown;
  if(rest){
    html+=`<div id="pr-feed-rest" style="display:none;">${rest}</div>
    <button class="sb" onclick="const r=document.getElementById('pr-feed-rest');const open=r.style.display!=='none';r.style.display=open?'none':'block';this.textContent=open?'▾ Prikaži vse (${items.length})':'▴ Skrij';" style="width:100%;margin-top:.5rem;background:var(--bg3);font-size:12px;">▾ Prikaži vse (${items.length})</button>`;
  }
  return html;
}

// --- Strength ratios ---
function renderStrengthRatios(){
  // Vzemi zadnjo BW iz history-a
  let bw=0;
  try{
    const data=getBW();
    const entries=Object.entries(data).sort((a,b)=>a[0].localeCompare(b[0]));
    if(entries.length>0)bw=parseFloat(entries[entries.length-1][1])||0;
  }catch(e){}
  if(!bw){return '<div style="color:var(--text3);font-size:12px;">Vnesi telesno težo v Teža section za prikaz.</div>';}
  const prs=getPRs();
  // Najdi PR po imenu — strukturira se po prDIEI keys, najdimo z exName ali iščimo v PROG
  function findPR(exName){
    for(const k in prs){
      const v=prs[k];
      if(typeof v==='object'&&v.exName===exName)return v;
    }
    // Fallback: poišči indeks v PROG, vzemi prXY
    for(let di=0;di<PROG.days.length;di++){
      for(let ei=0;ei<PROG.days[di].ex.length;ei++){
        if(PROG.days[di].ex[ei].n===exName){
          const v=prs[`pr${di}${ei}`];
          if(typeof v==='object')return v;
          if(typeof v==='number'&&v>0)return {kg:v,reps:1};
        }
      }
    }
    return null;
  }
  const rows=Object.entries(BIG_LIFTS).map(([key,exName])=>{
    const pr=findPR(exName);
    if(!pr||!pr.kg)return null;
    const kg=parseFloat(pr.kg);
    const e1rm=Math.round(kg*(1+(parseInt(pr.reps)||1)/30));
    const ratio=(e1rm/bw).toFixed(2);
    const tiers=STRENGTH_TIERS[key];
    let tierIdx=0,tierLabel='Začetnik',tierCls='tier-beg';
    for(let i=tiers.length-1;i>=0;i--){
      if(parseFloat(ratio)>=tiers[i].r){
        tierIdx=i;tierLabel=tiers[i].l;
        tierCls=['tier-beg','tier-nov','tier-int','tier-adv','tier-elite'][i];
        break;
      }
    }
    const liftName={bench:"Bench",squat:"Squat",deadlift:"Deadlift",ohp:"OHP"}[key];
    return `<tr><td class="sr-name">${liftName}</td><td class="sr-kg">${e1rm}kg</td><td class="sr-ratio">${ratio}× BW</td><td><span class="sr-tier ${tierCls}">${tierLabel}</span></td></tr>`;
  }).filter(Boolean).join('');
  if(!rows)return '<div style="color:var(--text3);font-size:12px;">Še brez PR-jev za big lift-e.</div>';
  return `<div style="font-size:11px;color:var(--text3);margin-bottom:.5rem;">BW: ${bw}kg · e1RM razmerja</div><table class="sr-table">${rows}</table>`;
}

// --- Body part readiness ---
function renderBodyReadiness(){
  // Za vsak dan, kdaj zadnjič treniran
  const sessions=getSessions();
  const now=Date.now();
  const html=PROG.days.map((d,di)=>{
    const last=sessions.find(s=>s.dayName===DAY_NAMES[di]);
    if(!last)return `<div class="bpr-row"><span>${d.title}</span><span class="bpr-stat">Ni podatkov</span></div>`;
    const days=Math.floor((now-new Date(last.date).getTime())/86400000);
    let cls='fresh',msg;
    if(days===0)msg='danes';
    else if(days===1){msg='včeraj';cls='soon';}
    else if(days<3){msg=`pred ${days} dnevi`;cls='soon';}
    else if(days<=5){msg=`pred ${days} dnevi`;cls='ready';}
    else if(days<=8){msg=`pred ${days} dnevi`;cls='fresh';}
    else {msg=`pred ${days} dnevi`;cls='warn';}
    return `<div class="bpr-row"><span>${d.title}</span><span class="bpr-stat ${cls}">${msg}</span></div>`;
  }).join('');
  return html;
}

// --- Photos (IndexedDB) ---
const DB_NAME='wt_photos',DB_STORE='photos',BK_STORE='backups';
let _db=null;
function openPhotoDB(){
  return new Promise((res,rej)=>{
    if(_db)return res(_db);
    // Verzija 2 — dodam backups store
    const r=indexedDB.open(DB_NAME,2);
    r.onupgradeneeded=(ev)=>{
      const db=r.result;
      if(!db.objectStoreNames.contains(DB_STORE))db.createObjectStore(DB_STORE,{keyPath:'id',autoIncrement:true});
      if(!db.objectStoreNames.contains(BK_STORE))db.createObjectStore(BK_STORE,{keyPath:'id',autoIncrement:true});
    };
    r.onsuccess=()=>{_db=r.result;res(_db);};
    r.onerror=()=>rej(r.error);
  });
}
async function savePhoto(file){
  const db=await openPhotoDB();
  const reader=new FileReader();
  return new Promise((res,rej)=>{
    reader.onload=()=>{
      const tx=db.transaction(DB_STORE,'readwrite');
      tx.objectStore(DB_STORE).add({date:new Date().toISOString(),blob:reader.result});
      tx.oncomplete=()=>res();
      tx.onerror=()=>rej(tx.error);
    };
    reader.readAsDataURL(file);
  });
}
async function getAllPhotos(){
  const db=await openPhotoDB();
  return new Promise(res=>{
    const tx=db.transaction(DB_STORE,'readonly');
    const r=tx.objectStore(DB_STORE).getAll();
    r.onsuccess=()=>res(r.result.sort((a,b)=>b.date.localeCompare(a.date)));
    r.onerror=()=>res([]);
  });
}
async function deletePhoto(id){
  const db=await openPhotoDB();
  return new Promise(res=>{
    const tx=db.transaction(DB_STORE,'readwrite');
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete=res;
  });
}
async function renderPhotos(){
  const grid=document.getElementById('photo-grid');if(!grid)return;
  const photos=await getAllPhotos();
  if(photos.length===0){grid.innerHTML='<div style="grid-column:1/-1;color:var(--text3);font-size:12px;padding:1rem;text-align:center;">Še brez fotografij.</div>';return;}
  grid.innerHTML=photos.map(p=>{
    const d=new Date(p.date).toLocaleDateString('sl-SI',{day:'numeric',month:'numeric'});
    return `<div class="photo-thumb"><img src="${p.blob}" onclick="viewPhoto('${p.blob}')" alt=""><div class="photo-date">${d}</div><button class="photo-del" onclick="event.stopPropagation();delPhotoConfirm(${p.id})">×</button></div>`;
  }).join('');
}
function viewPhoto(src){
  const v=document.getElementById('photo-viewer');
  document.getElementById('photo-viewer-img').src=src;
  v.classList.add('on');
}
function closePhotoViewer(){document.getElementById('photo-viewer').classList.remove('on');}
async function delPhotoConfirm(id){
  if(!await uiConfirm('Izbriši fotko?'))return;
  await deletePhoto(id);await renderPhotos();
}
async function handlePhotoUpload(input){
  const f=input.files[0];if(!f)return;
  await savePhoto(f);
  input.value='';
  await renderPhotos();
  toast('📸 Shranjena','ok');
}

// === TEDENSKI BACKUP REMINDER ===
function getDaysSinceLastBackup(){
  const last=localStorage.getItem('wt_last_backup');
  if(!last)return null;
  return Math.floor((Date.now()-new Date(last).getTime())/86400000);
}

// === IDB BACKUP STORAGE — local snapshots; clearing app/site data removes them ===
async function saveBackupToIDB(blob,label){
  const db=await openPhotoDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction(BK_STORE,'readwrite');
    const obj={date:new Date().toISOString(),label:label||'auto',blob:blob,sizeKB:Math.round(blob.length/1024)};
    tx.objectStore(BK_STORE).add(obj);
    tx.oncomplete=()=>{
      res(); // The acknowledged snapshot is valid even if later housekeeping fails.
      pruneOldBackups(12).catch(error=>console.warn('Snapshot cleanup failed',error.name));
    };
    tx.onerror=()=>rej(tx.error);
    tx.onabort=()=>rej(tx.error||new Error('Snapshot transaction aborted'));
  });
}

async function getAllBackups(){
  const db=await openPhotoDB();
  return new Promise(res=>{
    const tx=db.transaction(BK_STORE,'readonly');
    const r=tx.objectStore(BK_STORE).getAll();
    r.onsuccess=()=>res(r.result.sort((a,b)=>b.date.localeCompare(a.date)));
    r.onerror=()=>res([]);
  });
}

async function deleteBackup(id){
  const db=await openPhotoDB();
  return new Promise(res=>{
    const tx=db.transaction(BK_STORE,'readwrite');
    tx.objectStore(BK_STORE).delete(id);
    tx.oncomplete=res;
  });
}

async function pruneOldBackups(keep){
  const all=await getAllBackups();
  if(all.length<=keep)return;
  // Briši najstarejše (all je sortiran desc)
  for(let i=keep;i<all.length;i++){
    await deleteBackup(all[i].id);
  }
}

// Ustvari backup JSON brez photos (za IDB — fotke so že v IDB)
async function buildBackupJSON(includePhotos){
  let photos=[];
  if(includePhotos){
    try{photos=await getAllPhotos();}catch(e){}
  }
  return JSON.stringify({
    version:5,
    schemaVersion:5,
    date:new Date().toISOString(),
    sets:getSets(),
    pr:getPRs(),
    notes:getNotes(),
    bw:getBW(),
    cycle:getCyc(),
    meas:getMeas(),
    gym:getGym(),
    sessions:getSessions(),
    pain:getPainData(),
    cynotes:getCyNotes(),
    restplan:getRestPlan(),
    setcounts:getSetCounts(),
    bwgoal:getBWGoal(),
    theme:localStorage.getItem(LS.theme)||'dark',
    alarm:getAlarmSettings(),
    // bilateral removed
    collars:getCollars(),
    photos:photos,
    swaps:JSON.parse(localStorage.getItem('wt_exswap')||'{}'),
    sugs:JSON.parse(localStorage.getItem('wt_sugs6')||'{}'),
    extra_ex:JSON.parse(localStorage.getItem('wt_extra_ex')||'{}'),
    hidden_ex:JSON.parse(localStorage.getItem('wt_hidden_ex')||'{}'),
    daylists:{shared:JSON.parse(localStorage.getItem('wt_daylist_shared_v16')||'null'),cut:JSON.parse(localStorage.getItem('wt_daylist_cut')||'null'),bulk:JSON.parse(localStorage.getItem('wt_daylist_bulk')||'null')},
    ex_ordernames:JSON.parse(localStorage.getItem('wt_ex_ordernames')||'{}'),
    rep_prs:JSON.parse(localStorage.getItem('wt_rep_prs')||'{}'),
    phases:JSON.parse(localStorage.getItem('wt_phases')||'[]'),
    profile:getActiveProfile(),
    tm531:get531TMs(),
    offset531:get531CycleOffset(),
    goals:JSON.parse(localStorage.getItem('wt_goals')||'[]'),
    daylog:JSON.parse(localStorage.getItem('wt_daylog')||'{}'),
    custom_ex:JSON.parse(localStorage.getItem(CUST_KEY)||'[]'),
    kg_step:localStorage.getItem('wt_kg_step'),
    reps_step:localStorage.getItem('wt_reps_step'),
    colors:getStoredColors(),
    custom_rest:getCustomRest(),
    compact:isCompact(),
    gym_mode:getGymMode()
  });
}

// Auto-shrani backup v IDB (brez photos — varčuje prostor)
async function autoBackupToIDB(){
  try{
    const json=await buildBackupJSON(false);
    await saveBackupToIDB(json,'auto');
    localStorage.setItem('wt_last_idb_backup',new Date().toISOString());
    return true;
  }catch(e){console.warn('IDB backup failed:',e);return false;}
}

function checkBackupReminder(){
  const banner=document.getElementById('bk-banner'),txt=document.getElementById('bk-banner-text');if(!banner||!txt)return;
  const days=getDaysSinceLastBackup(),sess=getSessions();banner.classList.remove('show','urgent');
  if(days===null&&sess.length>=3){txt.innerHTML=`<strong>Prenesi prvi zunanji backup</strong>${sess.length} sessionov je varovanih le lokalno.`;banner.classList.add('show','urgent');return;}
  if(days!==null&&days>=7){txt.innerHTML=`<strong>${days>=14?'Zunanji backup je prestar':'Tedenski zunanji backup'}</strong>${days} dni od zadnjega prenosa JSON.`;banner.classList.add('show');if(days>=14)banner.classList.add('urgent');}
}

async function doWeeklyBackup(){
  await exportData();
  const banner=document.getElementById('bk-banner');
  if(banner)banner.classList.remove('show','urgent');
}

function snoozeBackup(){
  const banner=document.getElementById('bk-banner');
  if(banner)banner.classList.remove('show','urgent');
}

// === UI ZA TOOLS — UPRAVLJANJE BACKUPOV ===
async function renderBackupList(){
  const el=document.getElementById('backup-list');
  if(!el)return;
  const list=await getAllBackups();
  if(list.length===0){
    el.innerHTML='<div style="font-size:12px;color:var(--text3);padding:.5rem;">Ni shranjenih lokalnih snapshotov.</div>';
    return;
  }
  el.innerHTML=list.map(b=>{
    const d=new Date(b.date);
    const dateStr=d.toLocaleDateString('sl-SI')+' '+d.toLocaleTimeString('sl-SI',{hour:'2-digit',minute:'2-digit'});
    const days=Math.floor((Date.now()-d.getTime())/86400000);
    const ago=days===0?'danes':days===1?'včeraj':`pred ${days} dnevi`;
    return `<div class="bk-item">
      <div class="bk-item-l">
        <div class="bk-item-date">${dateStr}</div>
        <div class="bk-item-meta">${ago} · ${b.sizeKB||'?'}KB · ${b.label}</div>
      </div>
      <div class="bk-item-r">
        <button class="bk-item-btn" onclick="downloadBackupFromIDB(${b.id})">⬇</button>
        <button class="bk-item-btn" onclick="restoreBackupFromIDB(${b.id})">↺</button>
        <button class="bk-item-btn del" onclick="delBackupConfirm(${b.id})">×</button>
      </div>
    </div>`;
  }).join('');
}

async function downloadBackupFromIDB(id){
  const list=await getAllBackups();
  const b=list.find(x=>x.id===id);if(!b)return;
  const blob=new Blob([b.blob],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`workout_backup_${b.date.split('T')[0]}.json`;
  a.click();URL.revokeObjectURL(url);
  toast('💾 Backup prenesen','ok');
}

async function restoreBackupFromIDB(id){
  const list=await getAllBackups();
  const b=list.find(x=>x.id===id);if(!b)return;
  try{
    const backup=JSON.parse(b.blob);
    const v=validateBackupP1(backup);
    if(!v.ok){toast('Backup je pokvarjen: '+v.msg,'err');return;}
    if(!await uiConfirm(backupSummaryP1(backup)))return;
    await restoreBackupObjectP1(backup,{photos:false,mode:'replace'});
    toast('✓ Obnovljeno iz backupa','ok');
  }catch(e){toast('Napaka pri obnovi: '+e.message,'err');}
}


async function delBackupConfirm(id){
  if(!await uiConfirm('Izbriši ta backup?'))return;
  await deleteBackup(id);
  await renderBackupList();
  toast('Izbrisan','ok');
}

async function manualAutoBackup(){
  const ok=await autoBackupToIDB();
  if(ok){
    toast('💾 Backup shranjen v napravi','ok');
    await renderBackupList();
  }else{
    toast('Napaka','err');
  }
}

// === Swipe med vajami (samo v gym mode) ===
(function(){
  let tsX=0,tsY=0,startCard=null;
  const dc=document.getElementById('day-content');
  if(!dc)return;
  dc.addEventListener('touchstart',e=>{
    if(!document.body.classList.contains('gym-mode'))return;
    const t=e.touches[0];
    tsX=t.clientX;tsY=t.clientY;
    startCard=e.target.closest('tr[id^="row-"]')?null:e.target.closest('.exc');
  },{passive:true});
  dc.addEventListener('touchend',e=>{
    if(!document.body.classList.contains('gym-mode')||!startCard)return;
    const t=e.changedTouches[0];
    const dx=t.clientX-tsX,dy=t.clientY-tsY;
    const card=startCard;startCard=null;
    if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.4)return; // premalo horizontalno
    const startEl=document.elementFromPoint(tsX,tsY);
    if(startEl&&startEl.closest('input,button,select,textarea'))return; // ne moti tipkanja/gumbov
    const cards=Array.from(dc.querySelectorAll('.exc'));
    const idx=cards.indexOf(card);
    if(idx<0)return;
    const next=dx<0?cards[idx+1]:cards[idx-1]; // levo=naslednja, desno=prejšnja
    if(next)setGymFocus(next.id.replace(/^ec-/,''),true);
  },{passive:true});
})();

