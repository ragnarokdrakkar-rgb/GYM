/* Redline UI: one workout action, one set logger, secondary detail on demand. */
function renderProgramPageV18(){
  const el=document.getElementById('program-overview-v18');if(!el)return;
  const meta=getProgramMetaV6(),roster=getDayLists()||{};
  el.innerHTML=meta.days.map((day,di)=>({day,di})).filter(({day})=>day.active!==false&&day.deleted!==true).map(({day,di})=>{
    const exercises=roster[di]||[];
    return '<section class="program-day-v18"><div class="program-day-head"><div><span>Dan '+(di+1)+(day.active===false?' · neaktiven':'')+'</span><h2>'+safeHtml(day.name||day.title)+'</h2></div><button class="sb" onclick="openProgramDayV18('+di+')">Odpri trening →</button></div><ol>'+exercises.filter(e=>!e.programDisabled).map(e=>'<li><strong>'+safeHtml(e.n0||e.n)+'</strong><span>'+safeHtml(e.targetSets?e.targetSets+' serij':'Tedenski cilji')+' · '+safeHtml(e.targetReps||'Po tednu')+' · '+safeHtml(e.progMode==='531'?'5/3/1':e.progMode==='double'?'Dvojna progresija':'Prilagojeno vaji')+'</span></li>').join('')+'</ol></section>';
  }).join('')+renderArchivedDaysV22(meta);
}
function renderArchivedDaysV22(meta){
  const archived=meta.days.map((day,di)=>({day,di})).filter(({day})=>day.active===false&&day.deleted!==true);
  if(!archived.length)return '';
  return '<details class="archived-days-v22"><summary>Arhivirani dnevi ('+archived.length+')</summary><ul>'+archived.map(({day,di})=>'<li><span>'+safeHtml(day.name||day.title||('Dan '+(di+1)))+'</span><button type="button" class="sb" onclick="restoreProgramDayV22('+di+')">Ponovno aktiviraj</button></li>').join('')+'</ul><p>Obnovljen dan se vrne v isti vrstni red; zgodovina se ne spremeni.</p></details>';
}
function restoreProgramDayV22(di){
  if((typeof stRun!=='undefined'&&stRun)||window.v6RecoveryPending){toast('Program med aktivno sesijo ostane zaklenjen.','err');return;}
  const meta=getProgramMetaV6(),day=meta.days[di];
  if(!Number.isInteger(di)||!day||day.deleted===true||day.active!==false)return;
  day.active=true;
  if(!safeSetRaw(V6_KEYS.metaShared,JSON.stringify({...meta,version:2,shared:true})))return;
  applyProgramStateV6();renderDayTabsV6();renderProgramPageV18();toast('Dan je spet aktiven.','ok');
}
function openProgramDayV18(di){showPage('workout');showDay(di);document.querySelector('.plan-picker-v18')?.removeAttribute('open');}
function setExerciseLoadTypeV18(di,ei,value){
  if(stRun){toast('Vrsto bremena spremeni med treningi.','err');return;}
  if(!['external','dumbbell','bodyweight','assisted'].includes(value))return;
  const list=getDayLists();if(!list?.[di]?.[ei])return;
  list[di][ei].loadType=value;
  if(!saveDayLists(list))return;
  showDay(di);toast('Vrsta bremena shranjena. Stara zgodovina ni preračunana.','ok');
}
async function copyDiagnosticsV18(){
  const data={appVersion:typeof APP_VERSION==='string'?APP_VERSION:'unknown',native:!!window.__WT_ANDROID_APP__,online:navigator.onLine,unsavedWrites:storageHasPendingWrites()};
  try{
    await navigator.clipboard.writeText(JSON.stringify(data,null,2));
    toast('Diagnostika kopirana brez vsebine treningov.','ok');
  }catch(error){toast('Kopiranje ni na voljo. Verzija: '+data.appVersion+' · '+(data.online?'online':'offline'),'err');}
}
(function(){
  'use strict';
  let queued=false;
  const text=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value;};
  function enhance(){
    queued=false;
    const toolsPage=document.getElementById('page-tools');
    if(toolsPage&&!toolsPage.dataset.organizedV18){
      toolsPage.dataset.organizedV18='true';
      const appCard=toolsPage.querySelector('#wt-update-settings')?.closest('.card');
      const phaseCard=toolsPage.querySelector('#prof-cut-btn')?.closest('.card');
      if(appCard&&phaseCard)appCard.before(phaseCard);
      toolsPage.querySelectorAll(':scope > .card').forEach(card=>{
        const heading=card.querySelector('.ct'),title=heading?.textContent?.trim();
        if(card===appCard||card===phaseCard||!title||/Backup/.test(title))return;
        const details=document.createElement('details');details.className='settings-detail-v18';
        const summary=document.createElement('summary');summary.textContent=title;
        heading.hidden=true;card.before(details);details.append(summary,card);
      });
    }
    // Preserve the existing settings controls and handlers while giving them
    // native keyboard and screen-reader semantics.
    document.querySelectorAll('div.toggle-sw').forEach(old=>{
      const button=document.createElement('button');
      for(const attr of old.attributes)button.setAttribute(attr.name,attr.value);
      button.type='button';button.setAttribute('role','switch');
      button.setAttribute('aria-label',old.parentElement.querySelector('.sl-l')?.firstChild?.textContent?.trim()||'Nastavitev');
      old.replaceWith(button);
    });
    document.querySelectorAll('.toggle-sw').forEach(b=>b.setAttribute('aria-checked',b.classList.contains('on')?'true':'false'));
    document.querySelectorAll('#day-content .exc').forEach(card=>{
      const key=card.id.slice(3),m=key.match(/^c(\d+)w(\d+)d(\d+)e(\d+)$/);if(!m)return;
      const di=Number(m[3]),ei=Number(m[4]),e=PROG.days[di]?.ex?.[ei];if(!e)return;
      const quick=card.querySelector('.quick-log-v6'),table=card.querySelector('table.st');
      if(quick&&table&&!table.closest('.set-review-v18')){
        const details=document.createElement('details');details.className='set-review-v18';
        const summary=document.createElement('summary');summary.textContent='Preglej in popravi serije';
        table.before(details);details.append(summary,table);
      }
      if(!card.querySelector('.previous-v18')){
        const previous=document.createElement('div');previous.className='previous-v18';
        const history=getExerciseTimelineV6(di,ei,e.n),last=history[0];
        previous.textContent=last?'Zadnjič '+last.topKg+' kg × '+last.topReps+(last.avgRpe?' · RPE '+last.avgRpe.toFixed(1):' · RPE manjka'):'Zadnjič: še ni zaključenega zapisa';
        card.querySelector('.ex-top')?.after(previous);
      }
      const info=card.querySelector('.info-btn'),hist=card.querySelector('.hist-btn');
      const progression=card.querySelector('.prog-dir-v10');
      if(progression&&!progression.dataset.accessibleV18){
        progression.dataset.accessibleV18='true';
        progression.setAttribute('role','button');progression.tabIndex=0;
        progression.setAttribute('aria-label','Razlaga predloga za '+e.n);
        const explain=()=>{
          const result=progressionForExerciseV6(di,ei,currentExerciseName(di,ei,key));
          uiConfirm(result.label+'\n\n'+result.reasons.join('\n\n')+'\n\nZanesljivost: '+result.confidence+'. Predlog se ne uporabi samodejno.','Razumem');
        };
        progression.addEventListener('click',explain);
        progression.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();explain();}});
      }
      info?.setAttribute('aria-label','Opis in nastavitve vaje '+e.n);
      hist?.setAttribute('aria-label','Zgodovina vaje '+e.n);
      if(!card.querySelector('.load-settings-v18')){
        const settings=document.createElement('div');settings.className='load-settings-v18';
        const label=document.createElement('label');label.textContent='Pomen kilogramov';
        const select=document.createElement('select');
        select.setAttribute('aria-label','Vrsta bremena za '+e.n);
        for(const [value,title] of [['external','Skupno zunanje breme'],['dumbbell','Ročka — kg za eno roko'],['bodyweight','Lastna teža — dodatni kg'],['assisted','Asistenca — kg pomoči']]){
          const option=document.createElement('option');option.value=value;option.textContent=title;select.append(option);
        }
        select.value=e.loadType||'external';select.disabled=stRun;
        select.addEventListener('change',()=>setExerciseLoadTypeV18(di,ei,select.value));
        label.append(select);settings.append(label);card.querySelector('.ex-d')?.after(settings);
      }
      const status=card.querySelector('.set-review-v18 summary');
      const rows=getSets()[key]||[],done=rows.filter(s=>s.done).length;
      card.querySelectorAll('table.st tbody tr').forEach(row=>{
        const si=Number(row.id.split('-').pop()),cell=row.querySelector('.kg-cell');
        if(!cell||!Number.isInteger(si)||cell.querySelector('.review-rpe-v23'))return;
        const label=document.createElement('label');label.className='review-rpe-v23';label.textContent='RPE ';
        const input=document.createElement('input');input.type='number';input.min='1';input.max='10';input.step='0.5';input.inputMode='decimal';
        input.value=rows[si]?.rpe||'';input.placeholder='—';input.setAttribute('aria-label','RPE, serija '+(si+1));
        input.addEventListener('change',()=>{
          const value=input.value===''?null:Number(input.value),current=getSets()[key]?.[si]?.rpe||null;
          if(value!==null&&(!Number.isFinite(value)||value<1||value>10)){input.value=current||'';toast('RPE mora biti med 1 in 10.','err');return;}
          if(value!==current)setRpe(key,si,value,di,ei,Number(m[1]));
        });
        label.append(input);cell.append(label);
      });
      text(status,'Serije ('+done+' opravljene) · pregled in popravek');
      const log=card.querySelector('.compact-log-v10');
      if(log&&!log.disabled)text(log,'Zabeleži set');
    });
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(enhance);}
  const root=document.getElementById('day-content');
  if(root)new MutationObserver(queue).observe(root,{childList:true,subtree:true});
  document.addEventListener('click',queue);
  document.addEventListener('change',queue);
  window.addEventListener('resize',queue);
  if(window.visualViewport)window.visualViewport.addEventListener('resize',()=>{
    const keyboard=window.innerHeight-window.visualViewport.height>150;
    document.body.classList.toggle('keyboard-open-v18',keyboard);
  });
  // Program editing has its own home. Existing pop-up editor remains available.
  const builderButton=document.querySelector('#page-tools button[onclick="openProgramBuilderV6()"]');
  if(builderButton)builderButton.closest('.card')?.remove();
  document.body.dataset.page='workout';
  queue();
})();
/* === V22 MOLTEN — vedenjski sloj UI (kandidat 1.2.0) ===
   Ne spreminja podatkov ne obstoječih handlerjev. Doda: čiščenje emojijev v
   naslovih, obroč napredka odmora, žig ob zabeleženem setu, štetje KPI in
   toplo paleto grafov. Vse spoštuje prefers-reduced-motion. */
(function(){
  'use strict';
  const root=document.documentElement;
  root.classList.add('molten-v22');
  const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cssVar=name=>getComputedStyle(root).getPropertyValue(name).trim();

  // 1) Naslovi brez emojijev: ikone nosi navigacija, besedilo nosi pomen.
  const EMOJI_LEAD=/^(?:[\p{Extended_Pictographic}\p{Emoji_Presentation}\u{1F3FB}-\u{1F3FF}\u200D\uFE0F\u20E3]|[\u2190-\u21FF\u2300-\u23FF\u25A0-\u27BF\u2934\u2935\u2B05-\u2B55\u3030\u303D\u3297\u3299]\uFE0F?)+\s*/u;
  const TITLE_SEL='.ct,.note-pop-card h3,.settings-detail-v18>summary,.v6-card-title h3,#ex-hist-title,.sum-val,.program-day-head span,.today-eyebrow';
  function stripEmoji(node){
    for(const child of node.childNodes){
      if(child.nodeType!==3)continue;
      const cleaned=child.nodeValue.replace(EMOJI_LEAD,'');
      if(cleaned!==child.nodeValue){child.nodeValue=cleaned;}
      break;
    }
  }
  function cleanTitles(scope){
    (scope||document).querySelectorAll(TITLE_SEL).forEach(stripEmoji);
  }

  // 2) Obroč odmora: --rest-p = preostanek / načrt (bere obstoječi timer).
  function parseClock(text){
    const t=String(text||'').trim();
    if(!/^\d+(?::\d{2})?$/.test(t))return null;
    const parts=t.split(':').map(Number);
    return parts.length===2?parts[0]*60+parts[1]:parts[0];
  }
  let restPlan=0;
  function updateRestRing(){
    const bar=document.getElementById('wt-global-timer-v10');
    if(!bar||!bar.classList.contains('on'))return;
    const remaining=parseClock(document.getElementById('wt-global-time-v10')?.textContent);
    let plan=0;
    try{plan=Number((typeof currentTimerV6==='function'&&currentTimerV6()||{}).plannedSec)||0;}catch(_){plan=0;}
    if(plan>0)restPlan=plan;
    if(remaining===null){bar.style.setProperty('--rest-p','1');return;}
    if(remaining>restPlan)restPlan=remaining;
    const p=restPlan>0?Math.max(0,Math.min(1,remaining/restPlan)):0;
    bar.style.setProperty('--rest-p',p.toFixed(3));
  }

  // 3) Žig: kratek sij toplotne letve ob zabeleženem setu.
  document.addEventListener('click',event=>{
    const button=event.target.closest('.compact-log-v10');
    if(!button||button.disabled||reduced)return;
    const card=button.closest('.exc');
    if(!card)return;
    card.classList.remove('stamp');
    void card.offsetWidth;
    card.classList.add('stamp');
    setTimeout(()=>card.classList.remove('stamp'),800);
  },true);

  // 4) KPI štetje: ena orkestrirana animacija ob prihodu na Napredek.
  function countUp(el){
    const raw=el.textContent.trim();
    if(!/^\d{1,6}$/.test(raw))return;
    const target=Number(raw);
    if(!target||reduced){return;}
    if(el.dataset.moltenCounted===raw)return;
    el.dataset.moltenCounted=raw;
    const start=performance.now(),duration=620;
    el.classList.add('counting');
    function frame(now){
      const t=Math.min(1,(now-start)/duration),eased=1-Math.pow(1-t,3);
      el.textContent=String(Math.round(target*eased));
      if(t<1)requestAnimationFrame(frame);
      else{el.textContent=raw;el.classList.remove('counting');}
    }
    requestAnimationFrame(frame);
  }
  function countVisibleKpis(){
    document.querySelectorAll('.page.active .sum-val,.page.active .pn').forEach(countUp);
  }

  // 5) Grafi: topla paleta in tema iz CSS žetonov, brez poseganja v podatke.
  function registerChartPalette(){
    if(typeof Chart==='undefined'||!Chart.register||Chart.__moltenPalette)return;
    Chart.__moltenPalette=true;
    const heatFor=i=>['#ff5a1f','#ffb229','#ff8a5c','#7ee0a5'][i%4];
    Chart.register({
      id:'moltenPalette',
      beforeInit(chart){
        const text3=cssVar('--text3')||'#8c7a6c',border=cssVar('--border')||'rgba(255,226,196,.09)';
        const scales=chart.options&&chart.options.scales||{};
        Object.values(scales).forEach(scale=>{
          if(!scale)return;
          scale.ticks=Object.assign({},scale.ticks,{color:text3,font:{size:11,weight:'600'}});
          if(scale.grid&&scale.grid.display!==false)scale.grid=Object.assign({},scale.grid,{color:border,drawBorder:false});
          scale.border=Object.assign({},scale.border,{display:false});
        });
        const isBar=chart.config.type==='bar';
        (chart.config.data&&chart.config.data.datasets||[]).forEach((ds,i)=>{
          const c=heatFor(i);
          ds.borderColor=c;ds.pointBackgroundColor=c;ds.pointBorderColor=c;ds.borderWidth=2.5;
          if(isBar){ds.borderRadius=6;ds.borderSkipped=false;ds.borderWidth=0;}
          ds.backgroundColor=ctx=>{
            const area=ctx.chart.chartArea;
            if(!area)return isBar?'#ff8a1f':c+'33';
            const g=ctx.chart.ctx.createLinearGradient(0,area.top,0,area.bottom);
            if(isBar){g.addColorStop(0,'#ffb229');g.addColorStop(1,'#ff5a1f');}
            else{g.addColorStop(0,c+'66');g.addColorStop(1,c+'00');}
            return g;
          };
        });
      }
    });
    if(Chart.defaults){Chart.defaults.font=Object.assign({},Chart.defaults.font,{family:getComputedStyle(document.body).fontFamily});Chart.defaults.color=cssVar('--text3');}
  }

  // 6) Opazovanje: naslovi in obroč se posodabljajo ob vsaki spremembi DOM.
  let queued=false;
  function run(){
    queued=false;
    cleanTitles();
    updateRestRing();
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(run);}
  new MutationObserver(mutations=>{
    let kpi=false;
    for(const m of mutations){
      if(m.target&&m.target.id==='sum-grid')kpi=true;
      if(m.type==='attributes'&&m.target.classList&&m.target.classList.contains('page')&&m.target.classList.contains('active'))kpi=true;
    }
    queue();
    if(kpi)requestAnimationFrame(countVisibleKpis);
  }).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('DOMContentLoaded',()=>{registerChartPalette();run();});
  registerChartPalette();
  run();
})();
/* === V22.1 MOLTEN DYNAMICS — vedenje ob treningu, program, napredek ===
   Vse teče kot prekrivni sloj nad obstoječimi funkcijami (getSets, PROG,
   getExerciseTimelineV6, getKgStep, getSessions, get531TMs, getCurrentTM,
   openProgramDayV18). Nič ne piše v shrambo mimo obstoječih handlerjev. */
(function(){
  'use strict';
  const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const safe=(fn,fallback)=>{try{const v=fn();return v===undefined?fallback:v;}catch(_){return fallback;}};
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmt=n=>{const v=Number(n);return Number.isFinite(v)?String(Math.round(v*100)/100).replace('.',','):esc(n);};

  // --- Haptika: ob zabeleženem setu in ob koncu odmora ---
  function haptic(kind){
    const H=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Haptics;
    if(H){Promise.resolve(safe(()=>kind==='success'?H.notification({type:'SUCCESS'}):H.impact({style:kind==='heavy'?'HEAVY':'LIGHT'}))).catch(()=>{});return;}
    if(navigator.vibrate)safe(()=>navigator.vibrate(kind==='success'?[110,60,110]:kind==='heavy'?50:12));
  }
  let timerWasFinished=false;
  function watchTimer(){
    const t=document.getElementById('wt-global-timer-v10');
    const finished=!!(t&&t.classList.contains('finished'));
    if(finished&&!timerWasFinished)haptic('success');
    timerWasFinished=finished;
  }
  document.addEventListener('click',event=>{
    const b=event.target.closest('.compact-log-v10');
    if(b&&!b.disabled)haptic('light');
  },true);

  // --- Vaja: trak opravljenih serij, predlog iz zadnjega treninga, koraki ---
  const parseKey=key=>{const m=String(key).match(/^c(\d+)w(\d+)d(\d+)e(\d+)$/);return m?{cn:+m[1],w:+m[2],di:+m[3],ei:+m[4]}:null;};
  function renderStrip(card,key,quick){
    const rows=safe(()=>getSets()[key],[])||[];
    const done=rows.map((s,i)=>({s,i})).filter(x=>x.s&&x.s.done);
    let strip=card.querySelector('.set-strip-v22');
    if(!done.length){if(strip)strip.remove();return;}
    if(!strip){strip=document.createElement('div');strip.className='set-strip-v22';strip.setAttribute('aria-label','Opravljene serije');quick.before(strip);}
    const sig=done.map(x=>x.i+':'+x.s.kg+':'+x.s.reps+':'+(x.s.rpe||'')+':'+(x.s.drop?1:0)).join('|');
    if(strip.dataset.sig===sig)return;
    const grew=strip.dataset.sig&&strip.dataset.sig.split('|').length<done.length;
    strip.dataset.sig=sig;
    strip.innerHTML=done.map(x=>'<span class="set-chip-v22'+(x.s.drop?' drop':'')+'"><b>'+(x.i+1)+'</b>'+fmt(x.s.kg)+'<i>×</i>'+fmt(x.s.reps)+(x.s.rpe?'<em>@'+fmt(x.s.rpe)+'</em>':'')+'</span>').join('');
    if(grew&&!reduced&&strip.lastElementChild)strip.lastElementChild.classList.add('pop');
  }
  function prefill(card,key,quick,k){
    const kg=quick.querySelector('input[data-field="kg"]'),reps=quick.querySelector('input[data-field="reps"]');
    if(!kg||!reps)return;
    if(!quick.dataset.prefillHook){
      quick.dataset.prefillHook='1';
      quick.addEventListener('input',event=>{if(event.isTrusted)event.target.classList.remove('prefill-v22');});
    }
    if(kg.value||reps.value||kg.dataset.prefillV22)return;
    const doneAny=(safe(()=>getSets()[key],[])||[]).some(s=>s&&s.done);
    if(doneAny)return;
    kg.dataset.prefillV22='1';
    const e=safe(()=>PROG.days[k.di].ex[k.ei]);if(!e)return;
    const name=safe(()=>currentExerciseName(k.di,k.ei,key),e.n);
    const last=(safe(()=>getExerciseTimelineV6(k.di,k.ei,name),[])||[])[0];
    if(!last||!(last.topKg>0)||!(last.topReps>0))return;
    kg.value=String(last.topKg);reps.value=String(last.topReps);
    kg.dispatchEvent(new Event('input',{bubbles:true}));reps.dispatchEvent(new Event('input',{bubbles:true}));
    kg.classList.add('prefill-v22');reps.classList.add('prefill-v22');
  }
  function steppers(quick){
    if(quick.querySelector('.step-strip-v22'))return;
    const kg=quick.querySelector('input[data-field="kg"]'),reps=quick.querySelector('input[data-field="reps"]');
    if(!kg||!reps)return;
    const ks=safe(()=>getKgStep(),2.5)||2.5,rs=safe(()=>getRepsStep(),1)||1;
    const make=(input,step,decimal)=>{
      const b=document.createElement('button');b.type='button';b.className='step-btn-v22';
      b.textContent=(step>0?'+':'−')+fmt(Math.abs(step));
      b.setAttribute('aria-label',(step>0?'Povečaj ':'Zmanjšaj ')+(decimal?'težo za '+fmt(Math.abs(step))+' kg':'ponovitve za '+fmt(Math.abs(step))));
      b.addEventListener('click',()=>{
        if(input.disabled)return;
        const v=parseFloat(String(input.value).replace(',','.'))||0;
        const n=Math.max(0,v+step);
        input.value=decimal?String(Math.round(n*100)/100):String(Math.round(n));
        input.classList.remove('prefill-v22');
        input.dispatchEvent(new Event('input',{bubbles:true}));
        haptic('light');
      });
      return b;
    };
    const wrap=document.createElement('div');wrap.className='step-strip-v22';
    const g1=document.createElement('div');g1.append(make(kg,-ks,true),make(kg,ks,true));
    const g2=document.createElement('div');g2.append(make(reps,-rs,false),make(reps,rs,false));
    wrap.append(g1,g2,document.createElement('div'));
    const anchor=quick.querySelector('.platebox')||quick.querySelector('.compact-log-v10');
    if(anchor)anchor.before(wrap);
  }
  function enhanceCards(){
    document.querySelectorAll('#day-content .exc').forEach(card=>{
      const key=card.id.replace(/^ec-/,''),k=parseKey(key);if(!k)return;
      const quick=card.querySelector('.quick-log-v6');if(!quick)return;
      renderStrip(card,key,quick);
      prefill(card,key,quick,k);
      steppers(quick);
    });
    const deload=!!document.querySelector('.wtabs .wt.active.deload');
    document.body.classList.toggle('deload-v22',deload);
  }

  // --- Program: pregled tedna in naslednji trening ---
  function renderWeekStrip(){
    const overview=document.getElementById('program-overview-v18');if(!overview)return;
    const meta=getProgramMetaV6();
    const days=Array.from(document.querySelectorAll('.dtabs .dt[data-day-index]')).filter(d=>{
      const day=meta.days[Number(d.dataset.dayIndex)];
      return day&&day.active!==false&&day.deleted!==true;
    });
    const week=document.querySelector('.wtabs .wt.active');
    let strip=document.getElementById('week-strip-v22');
    if(!days.length){if(strip)strip.remove();return;}
    if(!strip){strip=document.createElement('section');strip.id='week-strip-v22';strip.className='week-strip-v22';overview.before(strip);}
    const items=days.map(d=>{
      const i=Number(d.dataset.dayIndex);
      const label=(d.querySelector('.dt-l')||d).textContent.trim();
      return {i,label,done:d.classList.contains('done'),active:d.classList.contains('active')};
    });
    const next=items.find(x=>!x.done);
    const doneCount=items.filter(x=>x.done).length;
    const weekLabel=week?Array.from(week.childNodes).map(n=>n.textContent.trim()).filter(Boolean).join(' · '):'Ta teden';
    const sig=JSON.stringify([items,weekLabel]);
    if(strip.dataset.sig===sig)return;
    strip.dataset.sig=sig;
    strip.innerHTML=
      '<div class="week-strip-head"><span>'+esc(weekLabel)+'</span><strong>'+doneCount+' / '+items.length+' opravljenih</strong></div>'+
      '<div class="week-strip-days">'+items.map(x=>'<button type="button" class="week-day'+(x.done?' done':'')+(x.active?' active':'')+'" onclick="openProgramDayV18('+x.i+')"><span>'+(x.done?'✓':x.i+1)+'</span>'+esc(x.label)+'</button>').join('')+'</div>'+
      (next?'<button type="button" class="week-next primary-v18" onclick="openProgramDayV18('+next.i+')">Odpri naslednji trening: '+esc(next.label)+'</button>':'<div class="week-done">Vsi dnevi tega tedna so opravljeni. Izberi naslednji teden v izbirniku.</div>');
  }

  // --- Napredek: eno prazno stanje, koledar na vrh ---
  function progressLayout(){
    const page=document.getElementById('page-gymlog');if(!page)return;
    const summary=document.getElementById('summary-card');
    const calendar=document.getElementById('train-calendar');
    if(summary&&calendar){const card=calendar.closest('.card');if(card&&card.previousElementSibling!==summary)summary.after(card);}
    const sessions=safe(()=>getSessions(),[])||[];
    const empty=sessions.length<2;
    page.classList.toggle('empty-v22',empty);
    let note=document.getElementById('empty-note-v22');
    if(empty&&summary){
      if(!note){note=document.createElement('div');note.id='empty-note-v22';note.className='empty-note-v22';summary.after(note);}
      const html='<strong>'+(sessions.length?'Še en trening':'Prva dva treninga')+'</strong><span>Po dveh zaključenih treningih se tu pokažejo koledar, trajanje, tonaža in zgodovina.</span>';
      if(note.innerHTML!==html)note.innerHTML=html;
    }else if(note){note.remove();}
  }

  // --- Grafi: TM cilj in oznaka PR na e1RM grafu ---
  function liftKeyFor(name){
    const n=String(name||'').toLowerCase();
    if(/bench/.test(n)&&!/incline|decline|dumbbell|db/.test(n))return 'bench';
    if(/squat/.test(n)&&!/split|hack|front|goblet/.test(n))return 'squat';
    if(/deadlift|mrtv/.test(n)&&!/romanian|rdl|stiff/.test(n))return 'deadlift';
    if(/ohp|overhead|military|press/.test(n)&&/ohp|overhead|military/.test(n))return 'ohp';
    return null;
  }
  function registerGoalPlugin(){
    if(typeof Chart==='undefined'||!Chart.register||Chart.__moltenGoal)return;
    Chart.__moltenGoal=true;
    Chart.register({
      id:'moltenGoal',
      beforeUpdate(chart){
        if(chart.canvas.id!=='e1rm-chart')return;
        const ds=chart.data.datasets[0];if(!ds)return;
        const key=liftKeyFor(ds.label);
        const tm=key?Number(safe(()=>getCurrentTM(key),0)):0;
        chart.__moltenTm=tm>0?tm:0;
        if(tm>0&&chart.options.scales&&chart.options.scales.y){chart.options.scales.y.suggestedMax=tm*1.06;}
      },
      afterDatasetsDraw(chart){
        if(chart.canvas.id!=='e1rm-chart')return;
        const ds=chart.data.datasets[0];if(!ds||!ds.data.length)return;
        const ctx=chart.ctx,area=chart.chartArea,y=chart.scales.y,x=chart.scales.x;if(!area||!y||!x)return;
        const styles=getComputedStyle(document.documentElement);
        const flare=(styles.getPropertyValue('--flare')||'#ffb229').trim(),text2=(styles.getPropertyValue('--text2')||'#cdbcac').trim();
        ctx.save();
        const tm=chart.__moltenTm;
        if(tm>0){
          const py=y.getPixelForValue(tm);
          if(py>area.top-1&&py<area.bottom+1){
            ctx.setLineDash([5,5]);ctx.strokeStyle=flare;ctx.globalAlpha=.7;ctx.lineWidth=1;
            ctx.beginPath();ctx.moveTo(area.left,py);ctx.lineTo(area.right,py);ctx.stroke();
            ctx.setLineDash([]);ctx.globalAlpha=1;ctx.fillStyle=flare;ctx.font='600 11px '+getComputedStyle(document.body).fontFamily;ctx.textAlign='right';ctx.textBaseline='bottom';
            ctx.fillText('TM '+fmt(tm)+' kg',area.right,py-4);
          }
        }
        let best=-1,bi=-1;ds.data.forEach((v,i)=>{if(Number(v)>best){best=Number(v);bi=i;}});
        if(bi>=0){
          const px=x.getPixelForValue(bi),py=y.getPixelForValue(best);
          ctx.shadowColor=flare;ctx.shadowBlur=14;ctx.fillStyle=flare;
          ctx.beginPath();ctx.arc(px,py,6,0,Math.PI*2);ctx.fill();
          ctx.shadowBlur=0;ctx.fillStyle='#1a0d05';ctx.beginPath();ctx.arc(px,py,2.5,0,Math.PI*2);ctx.fill();
          ctx.fillStyle=text2;ctx.font='700 11px '+getComputedStyle(document.body).fontFamily;ctx.textBaseline='bottom';
          ctx.textAlign=px>area.left+area.width*.7?'right':'left';
          ctx.fillText('PR '+fmt(best)+' kg',px+(ctx.textAlign==='right'?-9:9),py-6);
        }
        ctx.restore();
      }
    });
  }

  // --- Zanka ---
  let queued=false;
  function run(){
    queued=false;
    enhanceCards();
    renderWeekStrip();
    progressLayout();
    watchTimer();
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(run);}
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('click',queue);
  document.addEventListener('change',queue);
  document.addEventListener('DOMContentLoaded',()=>{registerGoalPlugin();queue();});
  registerGoalPlugin();
  queue();
})();
