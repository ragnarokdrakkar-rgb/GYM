'use strict';
// Keeps docs/STORAGE_MODEL.md honest: every `wt_...` localStorage key literal that appears
// anywhere in the app's own source (js/core, src/app, top-level js/*.js) must also appear,
// as a plain substring, somewhere in the doc. This is intentionally loose (substring match,
// not "is documented as a top-level key") so that a key mentioned as part of a longer name,
// a dynamic prefix (e.g. `wt_daylist_` used as `'wt_daylist_'+phase`), or a fragment used only
// inside a regex (e.g. `wt_`) still passes as long as some real key containing it is written up.
// What it catches is the case that actually causes drift: a brand-new `wt_...` key added to the
// code that nobody wrote a single word about in the doc.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

function listJsFiles(dir){
  return fs.readdirSync(path.join(root,dir))
    .filter(name=>name.endsWith('.js'))
    .map(name=>path.join(dir,name));
}

const SOURCE_FILES=[
  ...listJsFiles('js/core'),
  ...listJsFiles('src/app'),
  ...listJsFiles('js'), // top-level js/*.js only (js/core/* is already listed above)
];

const KEY_PATTERN=/wt_[a-zA-Z0-9_]*/g;

function extractKeyLiterals(file){
  const text=fs.readFileSync(path.join(root,file),'utf8');
  const found=new Set();
  for(const match of text.matchAll(KEY_PATTERN)){
    found.add(match[0]);
  }
  return found;
}

test('every wt_ localStorage key literal in js/core, src/app and js/*.js is mentioned in docs/STORAGE_MODEL.md',()=>{
  assert.ok(fs.existsSync(path.join(root,'docs/STORAGE_MODEL.md')),'docs/STORAGE_MODEL.md must exist');
  const doc=fs.readFileSync(path.join(root,'docs/STORAGE_MODEL.md'),'utf8');
  const allKeys=new Set();
  for(const file of SOURCE_FILES){
    for(const key of extractKeyLiterals(file))allKeys.add(key);
  }
  // Sanity check: the scan itself must actually be finding real keys (regression guard for the
  // test's own file discovery, e.g. if directory layout changes).
  assert.ok(allKeys.has('wt_s6'),'sanity check: expected to find wt_s6 while scanning source files');
  assert.ok(allKeys.size>40,'sanity check: expected to find dozens of wt_ key literals');
  const missing=[...allKeys].filter(key=>!doc.includes(key)).sort();
  assert.deepEqual(missing,[],
    `docs/STORAGE_MODEL.md is missing these wt_ key literals found in source: ${missing.join(', ')}`);
});
