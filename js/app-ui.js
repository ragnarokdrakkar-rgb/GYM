/* Redline UI: one workout action, one set logger, secondary detail on demand. */
function renderProgramPageV18(){
  const el=document.getElementById('program-overview-v18');if(!el)return;
  const meta=getProgramMetaV6(),roster=getDayLists()||{};
  el.innerHTML=meta.days.map((day,di)=>{
    const exercises=roster[di]||[];
    return '<section class="program-day-v18"><div class="program-day-head"><div><span>Dan '+(di+1)+(day.active===false?' · neaktiven':'')+'</span><h2>'+safeHtml(day.name||day.title)+'</h2></div><button class="sb" onclick="openProgramDayV18('+di+')">Odpri trening →</button></div><ol>'+exercises.filter(e=>!e.programDisabled).map(e=>'<li><strong>'+safeHtml(e.n0||e.n)+'</strong><span>'+safeHtml(e.targetSets?e.targetSets+' serij':'Tedenski cilji')+' · '+safeHtml(e.targetReps||'Po tednu')+' · '+safeHtml(e.progMode==='531'?'5/3/1':e.progMode==='double'?'Dvojna progresija':'Prilagojeno vaji')+'</span></li>').join('')+'</ol></section>';
  }).join('');
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
