'use strict';
// v5 "dark red" theme: tokens, primary-action gradient, selection recipe, red
// atmosphere, document-level colors and WCAG contrast guards for the tokens.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const v4=read('css/compact-v4.css'),host=read('css/compact-host.css'),index=read('index.html'),manifest=JSON.parse(read('manifest.json'));

// Minimal CSS reader: every innermost `selectors{declarations}` block, comments stripped.
const rules=[];
for(const m of v4.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g))
  rules.push({selectors:m[1].split(',').map(s=>s.trim()),body:m[2].trim()});
const bodiesOf=selector=>rules.filter(r=>r.selectors.includes(selector)).map(r=>r.body);
const body=selector=>{const all=bodiesOf(selector);assert.ok(all.length,'no rule for '+selector);return all.join(';');};
const tokens=Object.fromEntries([...body('#cg-app').matchAll(/(--[\w-]+):([^;]+);/g)].map(m=>[m[1],m[2].trim()]));

const GRADIENT='linear-gradient(135deg,var(--cg-accent-fill),var(--cg-accent2))';
const SELECT_BG='background:color-mix(in srgb,var(--cg-accent) 10%,var(--cg-raised))';
const SELECT_SHADOW='box-shadow:inset 0 0 0 1px var(--cg-accent),0 6px 20px -12px var(--cg-accent)';

test('v5 tokens on #cg-app: black + deep red palette incl. --cg-accent-fill and a white --cg-on-accent',()=>{
  const expected={'--cg-bg':'#050404','--cg-panel':'#0e0909','--cg-raised':'#170e0e','--cg-line':'#271818','--cg-line2':'#3a2222',
    '--cg-text':'#f8f3f3','--cg-muted':'#bba9a9','--cg-dim':'#8c7676','--cg-accent':'#ff3b3b','--cg-accent-fill':'#e3232b','--cg-accent2':'#8f0a12',
    '--cg-on-accent':'#ffffff','--cg-ok':'#34d27b','--cg-partial':'#4ea4ff','--cg-pending':'#ff5c5c'};
  for(const [name,value] of Object.entries(expected))assert.equal(tokens[name],value,name);
  assert.match(v4,/#cg-app\{--cg-bg:#050404;/,'the token rule stays the first rule of the file');
});

test('v5 block sits directly after the token rule and before the Step 7 rules',()=>{
  const tokenEnd=v4.indexOf('background:var(--cg-bg);}'),marker=v4.indexOf('/* v5 dark red theme */'),step7=v4.indexOf('/* Step 7: typography');
  assert.ok(tokenEnd>0&&marker>tokenEnd&&step7>marker);
});

test('compact-v4.css no longer contains the old orange accent/gradient values',()=>{
  assert.doesNotMatch(v4,/#ff7a1a/i);
  assert.doesNotMatch(v4,/#e5381d/i);
  assert.doesNotMatch(v4,/linear-gradient\(135deg,var\(--cg-accent\),var\(--cg-accent2\)\)/);
  assert.doesNotMatch(v4,/--cg-on-accent:#150a04/i);
});

test('primary actions (hero start, current-set tick, .cg-action incl. dialog submit) use the accent-fill -> accent2 gradient with on-accent text',()=>{
  for(const selector of ['#cg-app .cg-hero-start','#cg-app .cg-setrow-tick.cg-tick-current','#cg-app .cg-action']){
    const b=body(selector);
    assert.ok(b.includes('background:'+GRADIENT),selector+' gradient');
    assert.ok(b.includes('color:var(--cg-on-accent)'),selector+' on-accent text');
  }
  assert.ok((v4.match(/linear-gradient\(135deg,var\(--cg-accent-fill\),var\(--cg-accent2\)\)/g)||[]).length>=3);
});

test('green (done) fills never use the white on-accent text; they keep the near-black background color',()=>{
  assert.ok(body('#cg-app .cg-setrow-tick.cg-tick-done').includes('color:var(--cg-bg)'));
  assert.ok(body('#cg-app .cg-dots button.done').includes('color:var(--cg-bg)'));
  for(const r of rules)if(/background:var\(--cg-ok\)/.test(r.body))assert.doesNotMatch(r.body,/var\(--cg-on-accent\)/,r.selectors.join(','));
});

test('selection = accent border + 10% accent tint + soft glow on every picker, chip and calendar date',()=>{
  const full=['#cg-app .cg-week.selected','#cg-app .cg-day.selected','#cg-app .cg-weeksel button.selected','#cg-app .cg-pchip.selected',
    '#cg-app .cg-range-seg button.selected','#cg-app .cg-history-chip.selected','#cg-app .cg-choice.selected',
    '#cg-app .cg-quick-weeks button.selected','#cg-app .cg-quick-days button.selected','#cg-app .cg-quick-weeks button[aria-pressed="true"]','#cg-app .cg-quick-days button[aria-pressed="true"]'];
  for(const selector of full){
    const b=body(selector);
    assert.ok(b.includes('border-color:var(--cg-accent)'),selector+' border');
    assert.ok(b.includes(SELECT_BG),selector+' tint');
    assert.ok(b.includes(SELECT_SHADOW),selector+' glow');
  }
  const cal=body('#cg-app .cg-calendar-grid button.selected');
  assert.ok(cal.includes(SELECT_BG)&&cal.includes(SELECT_SHADOW));
  assert.ok(body('#cg-app .cg-seg button.selected').includes(SELECT_BG));
  // the shell's done tint paints the day BUTTON only (never the status icon inside it), and on a selected day the selection tint above
  // (same specificity, this file loads later) replaces it, so a selected day shows no green patch
  const shellCss=read('css/compact-shell.css');
  assert.match(shellCss,/#cg-app \.cg-quick-days button\.done\{background:color-mix\(in srgb,var\(--cg-ok\) 9%,var\(--cg-panel\)\);\}/);
  assert.doesNotMatch(shellCss,/\.cg-quick-days \.done/);
  assert.match(body('#cg-app .cg-dot.done'),/background:var\(--cg-ok\)/);
  assert.ok(body('#cg-app .cg-seg button.selected::after').includes('background:var(--cg-accent)'));
});

test('status colors stay semantic and hollow: pending is an outline/ring/label, never a solid red fill',()=>{
  assert.match(body('#cg-app .cg-dot.pending'),/background:transparent;border:1\.5px solid var\(--cg-pending\)/);
  assert.match(body('#cg-app .cg-pips i.pending'),/background:transparent;box-shadow:inset 0 0 0 1px var\(--cg-pending\)/);
  assert.match(body('#cg-app .cg-dots button'),/background:transparent;border:1\.5px solid var\(--cg-pending\);color:var\(--cg-pending\)/);
  assert.match(body('#cg-app .cg-chip.pending'),/color:var\(--cg-pending\)/);
  assert.match(body('#cg-app .cg-ring.pending .cg-ring-arc'),/stroke:var\(--cg-pending\)/);
  assert.match(body('#cg-app .cg-dot.done'),/background:var\(--cg-ok\)/);
  assert.match(body('#cg-app .cg-dot.partial'),/var\(--cg-partial\)/);
  // (the 7px save-state indicator dot is the one deliberate solid red mark)
  for(const r of rules)if(!r.selectors.some(s=>s.includes('.cg-save-dot')))assert.doesNotMatch(r.body,/(^|;)background:var\(--cg-pending\)/,'solid pending fill in '+r.selectors.join(','));
  // the current-exercise dot is separated from its status outline by a page-colored gap ring
  assert.ok(body('#cg-app .cg-dots button.current').includes('box-shadow:0 0 0 2px var(--cg-bg),0 0 0 4px var(--cg-accent)'));
});

test('atmosphere: red glow on hero/program card, dark-red rest card with accent border, red bottom-nav tab',()=>{
  const hero=body('#cg-app .cg-hero');
  assert.ok(hero.includes('radial-gradient(120% 90% at 0% 0%,color-mix(in srgb,var(--cg-accent-fill) 16%,transparent),transparent 60%),var(--cg-panel)'));
  const rest=body('#cg-app .cg-rest');
  assert.ok(rest.includes('linear-gradient(135deg,color-mix(in srgb,var(--cg-accent-fill)')&&rest.includes('var(--cg-accent2)')&&rest.includes('border:1px solid var(--cg-accent)'));
  assert.ok(body('#cg-app .cg-nav button[aria-current="page"]').includes('color:var(--cg-accent)'));
  assert.ok(bodiesOf('#cg-app .cg-nav button[aria-current="page"]').some(b=>/background:color-mix\(in srgb,var\(--cg-accent\) \d+%,transparent\)/.test(b)));
  assert.match(body('#cg-app .cg-nav button[aria-current="page"]::before'),/background:var\(--cg-accent\)/);
});

test('inputs: black field, line2 border, accent focus-visible ring',()=>{
  for(const selector of ['#cg-app .cg-setrow2 input','#cg-app .cg-rpe-field input']){
    const b=body(selector);
    assert.ok(b.includes('background:var(--cg-bg)')&&b.includes('border:1px solid var(--cg-line2)'),selector);
  }
  for(const selector of ['#cg-app .cg-sheet input','#cg-app .cg-sheet select','#cg-app .cg-sheet textarea','#cg-app .cg-field-label input','#cg-app .cg-field-label select']){
    const b=body(selector);
    assert.ok(b.includes('background:var(--cg-bg)')&&b.includes('border-color:var(--cg-line2)'),selector);
  }
  assert.match(v4,/#cg-app input:focus-visible[^{]*\{outline:2px solid var\(--cg-accent\);outline-offset:2px;\}/);
});

test('document level: body, update banner and download button use the dark-red palette',()=>{
  assert.match(host,/\.compact-shell-v27 body\{[^}]*background:#050404!important/);
  assert.match(host,/#wt-update-banner\{background:#0e0909!important;color:#f8f3f3!important;border:1px solid #271818!important/);
  assert.match(host,/#wt-update-download\{background:linear-gradient\(135deg,#e3232b,#8f0a12\)!important;color:#ffffff!important;border-color:#e3232b!important;\}/);
  for(const old of ['#0a0807','#ff883e','#1c2024','#353b41','#121416'])assert.ok(!host.includes(old),'old color '+old);
});

test('index.html theme-color and manifest colors are #050404',()=>{
  assert.match(index,/<meta name="theme-color" content="#050404">/);
  assert.equal(manifest.background_color,'#050404');
  assert.equal(manifest.theme_color,'#050404');
});

// ---- WCAG contrast guards computed from the tokens in the stylesheet ----
const rgb=hex=>{assert.match(hex,/^#[0-9a-f]{6}$/i,hex);return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));};
const lin=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
const lum=hex=>{const [r,g,b]=rgb(hex);return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);};
const ratio=(a,b)=>{const [hi,lo]=[lum(a),lum(b)].sort((x,y)=>y-x);return (hi+0.05)/(lo+0.05);};
// sRGB mix of `a` at share p over `b` (same math as color-mix(in srgb,...) / opacity compositing)
const mix=(a,p,b)=>'#'+rgb(a).map((v,i)=>Math.round(v*p+rgb(b)[i]*(1-p)).toString(16).padStart(2,'0')).join('');

test('contrast: text/muted/accent/ok/partial/pending >= 4.5:1 and dim >= 3:1 on bg, panel and raised',()=>{
  for(const [name,min] of [['text',4.5],['muted',4.5],['accent',4.5],['ok',4.5],['partial',4.5],['pending',4.5],['dim',3]])
    for(const surface of ['bg','panel','raised']){
      const r=ratio(tokens['--cg-'+name],tokens['--cg-'+surface]);
      assert.ok(r>=min,`--cg-${name} on --cg-${surface}: ${r.toFixed(2)} < ${min}`);
    }
});

test('contrast: on-accent text on the lightest gradient stop, dark text on green fills, accent/text on the selection tint (all >= 4.5:1)',()=>{
  const onFill=ratio(tokens['--cg-on-accent'],tokens['--cg-accent-fill']);
  assert.ok(onFill>=4.5,'on-accent on accent-fill '+onFill.toFixed(2));
  assert.ok(lum(tokens['--cg-accent-fill'])>lum(tokens['--cg-accent2']),'accent-fill is the lighter gradient stop');
  // dark text on green fills (done ticks/dots)
  assert.ok(ratio(tokens['--cg-bg'],tokens['--cg-ok'])>=4.5);
  // accent text on the 10% accent selection tint over raised (rendered color computed with the same sRGB mix as color-mix)
  const tint=mix(tokens['--cg-accent'],0.10,tokens['--cg-raised']);
  assert.ok(ratio(tokens['--cg-accent'],tint)>=4.5,'accent on selection tint '+ratio(tokens['--cg-accent'],tint).toFixed(2));
  assert.ok(ratio(tokens['--cg-text'],tint)>=4.5);
});

test('contrast: the set-row placeholder (dim at its opacity) still reaches 3:1 on the black input field',()=>{
  const opacity=Number(/opacity:([\d.]+)/.exec(body('#cg-app .cg-setrow2 input::placeholder'))[1]);
  const rendered=mix(tokens['--cg-dim'],opacity,tokens['--cg-bg']);
  assert.ok(ratio(rendered,tokens['--cg-bg'])>=3,'placeholder '+ratio(rendered,tokens['--cg-bg']).toFixed(2));
});
