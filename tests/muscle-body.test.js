'use strict';
// Step 15: the clickable body in the exercise picker. Every region maps to a
// MUSCLE_GROUPS_V36 id, sits inside the drawing, and is reachable by keyboard.
// 'other' (whole body) is only on the grid below the figure. Synthetic data only.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const shell=fs.readFileSync(path.join(__dirname,'..','js/compact-shell.js'),'utf8');
function harness(extra={}){const ctx=vm.createContext(extra);vm.runInContext(shell,ctx);return ctx;}
const attrs=(html,re)=>[...html.matchAll(re)].map(m=>m[1]);

test('the body has a front and a back figure whose regions are valid muscle groups; only "other" is missing',()=>{
  const ctx=harness();const html=ctx.muscleBodySvgV37();
  assert.match(html,/^<div class="cg-body-wrap" data-muscle-body><svg class="cg-body" viewBox="0 0 230 202" role="group" aria-label="Telo: tapni mišico">/);
  assert.deepEqual(attrs(html,/<g data-side="(front|back)"/g),['front','back']);
  const ids=ctx.muscleGroupsV36().map(g=>g.id),regions=attrs(html,/<path class="cg-body-m" data-muscle="([a-z]+)"/g);
  assert.equal(regions.length,14);
  for(const id of regions)assert.ok(ids.includes(id),id);
  const union=[...new Set(regions)].sort();
  assert.equal(JSON.stringify(union),JSON.stringify(ids.filter(id=>id!=='other').sort()),'eleven groups on the body');
  const front=html.slice(html.indexOf('data-side="front"'),html.indexOf('data-side="back"')),back=html.slice(html.indexOf('data-side="back"'));
  assert.deepEqual(attrs(front,/data-muscle="([a-z]+)"/g),['shoulders','chest','biceps','forearms','core','quads','calves']);
  assert.deepEqual(attrs(back,/data-muscle="([a-z]+)"/g),['shoulders','back','triceps','forearms','glutes','hams','calves']);
  assert.match(front,/<text x="50" y="199">Spredaj<\/text>/);assert.match(back,/<text x="50" y="199">Zadaj<\/text>/);
});

test('every region is a labelled, focusable button and stays inside its 100×192 figure',()=>{
  const ctx=harness();const html=ctx.muscleBodySvgV37();const names=Object.fromEntries(ctx.muscleGroupsV36().map(g=>[g.id,g.name]));
  for(const m of html.matchAll(/<path class="cg-body-m" data-muscle="([a-z]+)" role="button" tabindex="0" aria-label="([^"]+)" d="([^"]+)"><title>([^<]+)<\/title><\/path>/g)){
    const [,id,label,d,title]=m;assert.equal(label,names[id]);assert.equal(title,names[id]);
    const nums=d.match(/-?\d+(?:\.\d+)?/g).map(Number);
    nums.forEach((v,i)=>{if(i%2===0)assert.ok(v>=0&&v<=100,`${id} x ${v}`);else assert.ok(v>=0&&v<=192,`${id} y ${v}`);});
    assert.ok(/^M[^M]+Z(M[^M]+Z)?$/.test(d),id+' is one or two closed polygons');
  }
  assert.equal((html.match(/role="button"/g)||[]).length,14);
  assert.doesNotMatch(html,/data-act=/,'regions never carry a data-act (the picker wires them itself)');
});

test('the picker shows the body above the grid and wires regions like grid buttons, with keyboard support for the SVG',()=>{
  const start=shell.indexOf('  function exercisePickerSheet('),end=shell.indexOf('\n  function ',start+1);const picker=shell.slice(start,end);
  assert.match(picker,/const groups=muscleBodySvgV37\(\)\+`<div class="cg-muscle-grid" data-muscle-grid>/);
  assert.match(picker,/hint0='Tapni mišico na telesu, izberi skupino spodaj ali poišči vajo\.'/);
  assert.match(picker,/data-picker-hint>\$\{hint0\}<\/p>/);
  assert.match(picker,/hint\.textContent=hint0;body\.innerHTML=groups;wire\(\);/,'back restores body + grid');
  assert.match(picker,/if\(btn\.tagName!=='BUTTON'\)btn\.addEventListener\('keydown',ev=>\{if\(ev\.key==='Enter'\|\|ev\.key===' '\)\{ev\.preventDefault\(\);btn\.dispatchEvent\(new MouseEvent\('click',\{bubbles:true\}\)\);\}\}\);/);
  assert.match(picker,/const g=MUSCLE_GROUPS_V36\.find\(x=>x\.id===btn\.dataset\.muscle\);if\(!g\)return;/);
  const css=fs.readFileSync(path.join(__dirname,'..','css/compact-v4.css'),'utf8');
  assert.match(css,/#cg-app \.cg-body\{[^}]*max-height:min\(44vh,330px\)/,'the grid stays reachable below the figure');
  assert.match(css,/#cg-app \.cg-body \.cg-body-m\{[^}]*cursor:pointer/);
  assert.match(css,/#cg-app \.cg-body \.cg-body-m:hover,#cg-app \.cg-body \.cg-body-m:focus-visible\{/);
  assert.match(css,/#cg-app \.cg-body text\{[^}]*stroke:none/,'labels do not inherit the icon stroke');
});
