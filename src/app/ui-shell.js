function toggleTheme(){
  const html=document.documentElement,isDark=html.getAttribute('data-theme')==='dark';
  const next=isDark?'light':'dark';
  html.setAttribute('data-theme',next);
  document.getElementById('theme-btn').textContent=next==='dark'?'☀ Svetla':'● Temna';
  safeSetRaw(LS.theme,next);
  applyAllColors();
  if(bwChart)renderBW();if(strengthChart)renderStrengthChart();
}
// === BARVE PER SEGMENT (prosta izbira) ===
const COLOR_FAMILIES=[
  {k:'green',n:'Glavna (gumbi, poudarki, ✓)'},
  {k:'blue',n:'Info škatle / timer'},
  {k:'amber',n:'Deload / naslednja serija'},
  {k:'purple',n:'Posebno (drop seti, značke)'},
  {k:'red',n:'Opozorila / brisanje'},
];
const COLOR_DEFAULTS={green:'#ff4b23',blue:'#ff7a00',amber:'#ffb000',purple:'#ff334f',red:'#ff2d20'};
function _h2r(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function _r2h(a){return '#'+a.map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join('');}
function _mix(a,b,t){return a.map((v,i)=>v+(b[i]-v)*t);}
function deriveShades(hex,isDark){
  const c=_h2r(hex);
  if(isDark)return [hex,_r2h(_mix(c,[26,28,32],0.58)),_r2h(_mix(c,[255,255,255],0.32))];
  return [hex,_r2h(_mix(c,[255,255,255],0.80)),_r2h(_mix(c,[0,0,0],0.40))];
}
function getStoredColors(){try{return JSON.parse(localStorage.getItem('wt_colors')||'{}');}catch{return {};}}
function applyAllColors(){
  const stored=getStoredColors();
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  const r=document.documentElement.style;
  COLOR_FAMILIES.forEach(f=>{
    if(stored[f.k]){
      const [g,bg,txt]=deriveShades(stored[f.k],isDark);
      r.setProperty('--'+f.k,g);r.setProperty('--'+f.k+'-bg',bg);r.setProperty('--'+f.k+'-text',txt);
    }
  });
}
function setColorFamily(k,hex){
  const stored=getStoredColors();stored[k]=hex;safeSetRaw('wt_colors',JSON.stringify(stored));
  applyAllColors();
}
function resetColors(){
  localStorage.removeItem('wt_colors');
  const r=document.documentElement.style;
  COLOR_FAMILIES.forEach(f=>{r.removeProperty('--'+f.k);r.removeProperty('--'+f.k+'-bg');r.removeProperty('--'+f.k+'-text');});
  renderColorPickersInto();
  toast('↺ Barve ponastavljene','ok');
}
function renderColorPickers(){
  const stored=getStoredColors();
  return COLOR_FAMILIES.map(f=>{
    const val=stored[f.k]||COLOR_DEFAULTS[f.k];
    return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:11px;">
      <input type="color" value="${val}" onchange="setColorFamily('${f.k}',this.value)" style="width:48px;height:38px;border:none;border-radius:8px;background:none;cursor:pointer;padding:0;flex:none;">
      <span style="font-size:12.5px;color:var(--text2);">${f.n}</span>
    </div>`;
  }).join('')+`<button class="sb" onclick="resetColors()" style="background:var(--bg3);margin-top:6px;">↺ Ponastavi vse barve</button>`;
}
function renderColorPickersInto(){const el=document.getElementById('color-pickers');if(el)el.innerHTML=renderColorPickers();}
// Združljivost s starim klicem
function applyAccent(){applyAllColors();}

// === Hitre barvne teme (presети) ===
const COLOR_PRESETS={
  default:{n:'Forge',c:{green:'#ff4b23',blue:'#ff7a00',amber:'#ffb000',purple:'#ff334f',red:'#ff2d20'}},
  fire:{n:'Ognjena',c:{green:'#ff5330',blue:'#ff9500',amber:'#ffb020',purple:'#ff2d55',red:'#ff3b30'}},
  ice:{n:'Ledena',c:{green:'#22a7ff',blue:'#00d4ff',amber:'#38bdf8',purple:'#6c8cff',red:'#ff5566'}},
  neon:{n:'Neon',c:{green:'#00e676',blue:'#00e5ff',amber:'#ffea00',purple:'#e040fb',red:'#ff1744'}},
  violet:{n:'Vijolična',c:{green:'#b14dff',blue:'#7c6cff',amber:'#ff9500',purple:'#d926ff',red:'#ff4081'}},
  gold:{n:'Zlata',c:{green:'#ffb300',blue:'#ff9500',amber:'#ffd54f',purple:'#ff7043',red:'#f4511e'}},
};
function applyColorPreset(key){
  if(key==='default'){resetColors();return;} // vrne točno originalne CSS barve
  const p=COLOR_PRESETS[key];if(!p)return;
  const stored=getStoredColors();
  Object.keys(p.c).forEach(k=>stored[k]=p.c[k]);
  safeSetRaw('wt_colors',JSON.stringify(stored));
  applyAllColors();
  renderColorPickersInto();
  toast('✓ Tema: '+p.n,'ok');
}
function renderColorPresets(){
  return Object.keys(COLOR_PRESETS).map(k=>{
    const p=COLOR_PRESETS[k];
    const dots=Object.values(p.c).map(c=>`<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${c};margin-right:1px;"></span>`).join('');
    return `<button class="sb" onclick="applyColorPreset('${k}')" style="background:var(--bg3);display:inline-flex;align-items:center;gap:6px;">${dots}<span>${p.n}</span></button>`;
  }).join('');
}
function initTheme(){
  let t=localStorage.getItem(LS.theme)||'dark';
  // Migracija stare verzije, ki je shranila JSON niz z narekovaji.
  if(t==='"dark"'||t==='"light"'){try{t=JSON.parse(t);}catch(e){t='dark';}safeSetRaw(LS.theme,t);}
  if(t!=='dark'&&t!=='light')t='dark';
  document.documentElement.setAttribute('data-theme',t);
  const btn=document.getElementById('theme-btn');if(btn)btn.textContent=t==='dark'?'☀ Svetla':'● Temna';
}

function calcPlatesFor(targetKg){
  const gym=getGym(),bar=gym.bar,collars=getCollars();
  if(targetKg<=0||targetKg<bar+collars)return null;
  // Collars sta skupaj — odštejemo iz target preden delimo na 2
  let rem=Math.round((targetKg-bar-collars)/2*100)/100;
  const avail=[...gym.plates].sort((a,b)=>b-a);const used=[];
  for(const p of avail){while(rem>=p-0.001){rem=Math.round((rem-p)*100)/100;used.push(p);}}
  if(Math.abs(rem)>0.1)return null;
  if(used.length===0)return{each:collars>0?'Samo palica + collars':'Samo palica',total:bar+collars,bar,perSide:0};
  const grouped={};used.forEach(p=>grouped[p]=(grouped[p]||0)+1);
  const each=Object.entries(grouped).sort((a,b)=>parseFloat(b[0])-parseFloat(a[0])).map(([p,c])=>`${c}×${p}kg`).join('+');
  return{each,total:targetKg,bar,perSide:used.reduce((a,b)=>a+b,0),collars};
}

// Kratek format plošč za prikaz pod vsakim setom
function platesShort(kg){
  if(!kg||kg<=0)return {text:'',cls:''};
  const pl=calcPlatesFor(kg);
  if(!pl)return {text:'✗ ni možno',cls:'bad'};
  if(pl.perSide===0)return {text:'palica',cls:'ok'};
  const t=pl.each.split('+').map(p=>{
    const m=p.match(/^(\d+)×([\d.]+)kg$/);
    if(!m)return p;
    return m[1]==='1'?m[2]:`${m[1]}×${m[2]}`;
  }).join('+');
  return {text:t,cls:'ok'};
}

function showProgressPage(p){showPage(p||'gymlog');}
function setProgressNavActive(p){
  document.querySelectorAll('.progress-subnav button').forEach(b=>b.classList.toggle('active',b.dataset.progress===p));
}
function showPage(p){
  if(p==='body')p='bodyweight'; // Retired measurements route, including restored navigation.
  const page=document.getElementById('page-'+p);if(!page)return;
  document.querySelectorAll('.page').forEach(e=>e.classList.remove('active'));
  page.classList.add('active');
  const isProgress=['cycle','gymlog','bodyweight','stats'].includes(p);
  document.querySelectorAll('.nt').forEach(e=>e.classList.remove('active'));
  const nav=document.querySelector(`.nt[data-nav="${isProgress?'progress':p==='tools'?'tools':p==='program'?'program':'workout'}"]`);if(nav)nav.classList.add('active');
  if(isProgress)setProgressNavActive(p);
  document.body.dataset.page=p;
  if(p==='program'&&typeof renderProgramPageV18==='function')renderProgramPageV18();
  safeSetRaw('wt_last_page',p);
  if(p==='bodyweight'){initBWGoal();renderBW();renderPhases();}
  if(p==='cycle')renderCycle();
  if(p==='tools'){initProfileUI();initPlates();initAlarmUI();initCollarsUI();renderBackupList();initStepUI();renderCustomExList();renderColorPickersInto();initDisplayUI();const _cp=document.getElementById('color-presets');if(_cp)_cp.innerHTML=renderColorPresets();}
  if(p==='gymlog'){renderSessHist();renderWeeklySummary();renderTonnageChart();const _tc=document.getElementById('train-calendar');if(_tc)_tc.innerHTML=renderTrainCalendar();}
  if(p==='stats'){
    document.getElementById('vol-grp-view').innerHTML=renderVolumeView();
    document.getElementById('strength-ratios').innerHTML=renderStrengthRatios();
    renderE1RMChart();
  }
  window.scrollTo({top:0,behavior:'instant'});
}

