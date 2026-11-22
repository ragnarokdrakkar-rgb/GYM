'use strict';
// 1.7.0: suggestion from the last workout, undo toast, workout summary, swipe,
// exercise note, colour themes and the silent rest notification. Synthetic data only.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const shell=read('js/compact-shell.js'),css=read('css/compact-v4.css'),host=read('css/compact-host.css');
function top(){const ctx=vm.createContext({});vm.runInContext(shell,ctx);return ctx;}

test('the last result becomes a suggestion only when it is a usable kg/reps pair',()=>{
  const {lastSuggestionV41:s,withSuggestionV41:w}=top();
  assert.equal(JSON.stringify(s({kg:60,reps:8})),'{"kg":"60","reps":"8"}');
  assert.equal(JSON.stringify(s({kg:'62,5',reps:'8'})),'{"kg":"62.5","reps":"8"}');
  assert.equal(JSON.stringify(s({kg:0,reps:8})),'{"kg":"0","reps":"8"}','bodyweight (0 kg) is a valid suggestion');
  for(const bad of [null,{kg:'',reps:8},{kg:60,reps:''},{kg:60,reps:0},{kg:60,reps:7.5},{kg:-1,reps:5},{kg:'x',reps:5}])assert.equal(s(bad),null,JSON.stringify(bad));
  const sug={kg:'60',reps:'8'};
  assert.equal(JSON.stringify(w({index:0,kg:'',reps:'',rpe:''},sug)),'{"index":0,"kg":"60","reps":"8","rpe":""}');
  assert.equal(JSON.stringify(w({index:0,kg:'62.5',reps:' ',rpe:'8'},sug)),'{"index":0,"kg":"62.5","reps":"8","rpe":"8"}','typed values always win');
  assert.equal(JSON.stringify(w({index:0,kg:'',reps:''},null)),'{"index":0,"kg":"","reps":""}');
});

test('the current set shows the suggestion as a grey placeholder (not required), and confirming uses it',()=>{
  const row=shell.slice(shell.indexOf('    if(i===cur){'),shell.indexOf('    const hint=valuesFor(e);'));
  assert.match(row,/const v=valuesFor\(e\),sug=lastSuggestionV41\(e\.last\)/);
  assert.match(row,/\$\{hint\?` placeholder="\$\{esc\(hint\)\}" data-suggested="1"`:' required'\}/,'a field with a suggestion is not required');
  assert.match(shell,/const e=activeExercise\(\),v=withSuggestionV41\(valuesFor\(e\),lastSuggestionV41\(e\.last\)\);/);
  assert.match(shell,/compactStepValueV34\(input\.value!==''\?input\.value:\(input\.placeholder\|\|''\),/,'± starts from the suggestion');
  assert.match(css,/#cg-app \.cg-setrow2\.suggested input::placeholder\{color:var\(--cg-dim\);opacity:1;font-style:italic;\}/);
});

test('a logged set gives a short vibration and a toast with "Razveljavi" that undoes exactly that set',()=>{
  assert.match(shell,/if\(ok\)\{draft\.delete\(e\.key\);hapticV41\(\);lastLoggedV41=\{key:e\.key,index:v\.index,ei:e\.ei,cn:getCyc\(\)\.num,at:Date\.now\(\)\};render\(\);notify\(started\?'Trening začet · serija zabeležena\.':'Serija zabeležena\.',false,\{act:'toast-undo',label:'Razveljavi'\}\);return;\}/);
  const undo=shell.slice(shell.indexOf("else if(act==='toast-undo')"),shell.indexOf("else if(act==='exercise-note')"));
  assert.match(undo,/if\(!u\|\|Date\.now\(\)-u\.at>20000\)return;/,'stale undo does nothing');
  assert.match(undo,/if\(!rows\[u\.index\]\?\.done\)return;tgSet\(u\.key,u\.index,cd,u\.ei,u\.cn\);/);
  assert.match(undo,/if\(t&&t\.key===u\.key\)\{restNotifiedId=t\.id;stopT\(t\.key\);\}/,'its rest stops without a "Počitek končan" toast');
  assert.match(shell,/if\(action&&text\)\{const b=document\.createElement\('button'\);b\.type='button';b\.className='cg-message-action';b\.dataset\.act=action\.act;b\.textContent=action\.label;message\.append\(b\);\}/);
});

test('workout summary: totals without warm-ups, comparison with the previous run of the same day, heavier sets as records',()=>{
  const {workoutSummaryDataV41:sum}=top();
  const ex=(name,sets)=>({name,sets:sets.map(([kg,reps,done=true,type='work'])=>({kg:String(kg),reps:String(reps),done,type}))});
  const rec={id:'c',dayIdx:1,dayName:'Pull A',durationMin:52,exercises:[ex('Veslanje',[[20,10,true,'warmup'],[70,8],[72.5,6],[80,1,false]]),ex('Zgibi',[[0,8],[0,7]]),ex('Curl',[])]};
  const prev={id:'b',dayIdx:1,dayName:'Pull A',date:'2026-11-15',exercises:[ex('Veslanje',[[70,8],[70,8]]),ex('Zgibi',[[0,8]])]};
  const other={id:'a',dayIdx:0,dayName:'Push A',date:'2026-11-14',exercises:[ex('Veslanje',[[75,3]])]};
  const d=sum(rec,[rec,prev,other]);
  assert.equal(d.durationMin,52);assert.equal(d.sets,4,'warm-up and unfinished sets do not count');assert.equal(d.tonnage,995);assert.equal(d.exercises,2);
  assert.equal(JSON.stringify(d.prev),'{"date":"2026-11-15","dayName":"Pull A","sets":3,"tonnage":1120,"dSets":1,"dTonnage":-125}');
  assert.equal(JSON.stringify(d.records),'[]','72,5 is below the 75 done on another day');
  const d2=sum({...rec,exercises:[ex('Veslanje',[[77.5,5]])]},[prev,other]);
  assert.equal(JSON.stringify(d2.records),'[{"name":"Veslanje","kg":77.5,"prev":75}]');
  const first=sum({id:'x',dayIdx:3,dayName:'Noge',exercises:[ex('Počep',[[100,5]])]},[prev]);
  assert.equal(first.prev,null);assert.equal(JSON.stringify(first.records),'[]','no history = no record');
  assert.match(shell,/if\(wasRunning&&!stRun\)\{const t=currentTimerV6\(\);if\(t\)stopT\(t\.key\);state\.focus=false;state\.openRow='';const rec=getSessions\(\)\[0\];if\(rec\)\{render\(\);workoutSummaryV41\(rec\);return;\}\}/);
  assert.match(shell,/<b>\$\{sign\(d\.prev\.dSets\)\}<\/b> \$\{serij\(Math\.abs\(d\.prev\.dSets\)\)\}, <b>\$\{sign\(d\.prev\.dTonnage\)\} kg<\/b> tonaže\./);
  assert.match(shell,/else if\(act==='summary-history'\)\{const date=b\.dataset\.summaryDate;/,'not data-date, which the calendar branch would catch first');
});

test('swipe in Focus: a quick, mostly horizontal drag of 60 px or more moves one exercise',()=>{
  const {compactSwipeDirV41:sw}=top();
  assert.equal(sw(-80,10,200),1);assert.equal(sw(90,-20,300),-1);
  assert.equal(sw(-59,0,100),0);assert.equal(sw(-80,60,200),0,'too diagonal');assert.equal(sw(-200,0,900),0,'too slow');
  assert.match(shell,/if\(!t\.closest\?\.\('\.cg-fscroll'\)\|\|t\.closest\('input,textarea,select'\)\)return;/,'never while typing');
  assert.match(shell,/const i=workoutCache\.indexOf\(activeExercise\(\)\)\+dir;if\(i<0\|\|i>=workoutCache\.length\)return;/);
});

test('exercise note: stored on the roster row (all weeks, in backups), shown in Focus and on the Trening card, editable during a workout',()=>{
  const ctx=vm.createContext({esc:s=>String(s)});const a=shell.indexOf('  function exerciseNoteV41(');vm.runInContext(shell.slice(a,shell.indexOf('\n  }\n',a)+4),ctx);
  assert.equal(ctx.exerciseNoteV41({item:{note:'Sedež 4'}}),'<p class="cg-ex-note"><b>Opomba:</b> Sedež 4</p>');
  assert.equal(ctx.exerciseNoteV41({item:{note:'  '}}),'');assert.equal(ctx.exerciseNoteV41({item:{}}),'');
  const edit=shell.slice(shell.indexOf('  function editExerciseNoteV41('),shell.indexOf('  function workoutSummaryV41('));
  assert.match(edit,/if\(!it\|\|it\.id!==id\)throw Error\('Vaja ni več na tem dnevu\.'\);/);
  assert.match(edit,/const note=plainImportedText\(data\.get\('note'\)\|\|'',200\)\.trim\(\);if\(note\)it\.note=note;else delete it\.note;/);
  assert.doesNotMatch(edit,/guardProgram/,'a note can be written during a workout');
});

test('colours: red is for action and selection, "not done" is neutral, errors use --cg-danger; four complete themes',()=>{
  assert.match(css,/--cg-pending:#8f7f7f;--cg-danger:#ff5c5c;/);
  for(const sel of ['.cg-menu-item.cg-menu-danger strong','.cg-exercise-actions .cg-danger-btn','.cg-history-summary .cg-danger-btn','.cg-setrow2 input:user-invalid'])assert.ok(css.includes(`#cg-app ${sel}{`)&&new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\{[^}]*--cg-danger').test(css),sel);
  const tokens=['--cg-bg','--cg-panel','--cg-raised','--cg-line','--cg-line2','--cg-text','--cg-muted','--cg-dim','--cg-accent','--cg-accent-fill','--cg-accent2','--cg-on-accent','--cg-ok','--cg-partial','--cg-pending','--cg-danger'];
  for(const id of ['grafit','modra','svetla']){const m=css.match(new RegExp(`#cg-app\\[data-cg-theme="${id}"\\]\\{([^}]*)\\}`));assert.ok(m,id);for(const t of tokens)assert.match(m[1],new RegExp(t+':#[0-9a-f]{6};'),id+' '+t);assert.match(host,new RegExp(`\\.compact-shell-v27\\[data-cg-theme="${id}"\\] body\\{background:`));}
  const {uiThemeIdV41:id}=top();assert.equal(id({uiTheme:'modra'}),'modra');assert.equal(id({uiTheme:'x'}),'rdeca');assert.equal(id(null),'rdeca');
  assert.match(shell,/else if\(act==='theme-set'\)\{const id=uiThemeIdV41\(\{uiTheme:b\.dataset\.theme\}\);commitStorageBatch\(\[\[V6_KEYS\.settings,JSON\.stringify\(\{\.\.\.getV6Settings\(\),uiTheme:id\}\)\]\]\);/,'saved in V6 settings, which every backup carries');
  assert.match(css,/#cg-app \.cg-step,#cg-app \.cg-settable \.cg-step\{background:transparent;border-color:var\(--cg-line\);color:var\(--cg-muted\);/,'calm ± buttons win over the settable button colour');
});

function restCtx(){
  const calls=[];const fake={checkPermissions:async()=>({display:'granted'}),areEnabled:async()=>({value:true}),checkExactNotificationSetting:async()=>({exact_alarm:'granted'}),
    createChannel:async c=>calls.push(['channel',c.id,c.importance,!!c.sound]),schedule:async o=>{calls.push(['schedule',o.notifications]);return {};},cancel:async o=>calls.push(['cancel',o.notifications.map(n=>n.id)]),
    getDeliveredNotifications:async()=>({notifications:[]}),removeDeliveredNotifications:async()=>{},getPending:async()=>({notifications:[]})};
  const ctx=vm.createContext({console:{log(){},warn(){},error(){}},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},document:{addEventListener(){},visibilityState:'visible'},Date,Promise,Math,Number,Boolean,Array});
  ctx.window=ctx;Object.assign(ctx,{__WT_ANDROID_APP__:true,Capacitor:{isNativePlatform:()=>true,Plugins:{LocalNotifications:fake}},startT:()=>'started',stopT:()=>'stopped',alertEnd:()=>'ended',getAlarmSettings:()=>({notif:true}),toast(){}});
  vm.runInContext(read('js/rest-native-notifications.js'),ctx);ctx.calls=calls;return ctx;
}
const flush=()=>new Promise(r=>setTimeout(r,20));
test('during a rest the lock screen gets a silent ongoing notification with the end time; stop removes it with the end alarm',async()=>{
  const ctx=restCtx();await flush();ctx.calls.length=0;
  assert.equal(ctx.window.startT('c1w0d0e0',90),'started');await flush();
  const sched=ctx.calls.filter(c=>c[0]==='schedule').map(c=>c[1][0]);
  const end=sched.find(n=>n.id===42002),prog=sched.find(n=>n.id===42003);
  assert.ok(end&&end.schedule&&end.schedule.at,'the loud end notification is still scheduled');
  assert.ok(prog,'progress notification shown');assert.equal(prog.ongoing,true);assert.equal(prog.autoCancel,false);assert.equal(prog.channelId,'workout_rest_progress_v1');assert.equal(prog.schedule,undefined,'shown now');
  assert.match(prog.title,/^Odmor do \d{2}:\d{2}$/);
  assert.ok(ctx.calls.some(c=>c[0]==='channel'&&c[1]==='workout_rest_progress_v1'&&c[2]===2&&c[3]===false),'low-importance channel without sound');
  ctx.calls.length=0;ctx.window.stopT('c1w0d0e0');await flush();
  assert.ok(ctx.calls.some(c=>c[0]==='cancel'&&c[1].includes(42002)&&c[1].includes(42003)));
});
