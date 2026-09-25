'use strict';
/*
 * Manual/rerunnable Playwright script exercising the real backup/restore UI in a browser.
 * NOT part of `npm test` (node:test doesn't know about it, and it needs a running preview
 * server + a real Chromium). Run it like this:
 *
 *   WT_PREVIEW_PORT=4182 node tools/preview-server.cjs &
 *   node tests/e2e/backup-ui.e2e.cjs
 *
 * It drives the compact shell (open shadow root under #wt-compact-host) to:
 *   1. create synthetic data (log a set, finish a workout, add a body-weight entry),
 *   2. build a backup JSON via the page's own buildBackupJSON(true),
 *   3. mutate storage, then restore that file through Settings -> Varnostna kopija ->
 *      "Obnovi iz datoteke" using the real <input type=file> filechooser and the real
 *      in-app import-mode <dialog> (merge/replace),
 *   4. verify localStorage afterwards for both modes, plus a corrupt-file error case.
 *
 * Screenshots (360x780) are written to SCREENSHOT_DIR for a human to review.
 */
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');

const PORT=process.env.WT_PREVIEW_PORT||'4182';
const BASE_URL=`http://127.0.0.1:${PORT}/index.html`;
const SCREENSHOT_DIR=process.env.WT_SCREENSHOT_DIR||
  '/tmp/claude-0/-home-user-GYM/fc16d0ae-b105-534d-82aa-6c8f9f4f1bf9/scratchpad/phase3b';
const TMP_DIR=process.env.WT_TMP_DIR||'/tmp/claude-0/-home-user-GYM/fc16d0ae-b105-534d-82aa-6c8f9f4f1bf9/scratchpad';

const playwrightRoot=require('node:child_process').execSync('npm root -g').toString().trim();
const {chromium}=require(path.join(playwrightRoot,'playwright'));

fs.mkdirSync(SCREENSHOT_DIR,{recursive:true});
let shotIndex=0;
async function shot(page,name){
  shotIndex+=1;
  const file=path.join(SCREENSHOT_DIR,`${String(shotIndex).padStart(2,'0')}-${name}.png`);
  await page.screenshot({path:file});
  console.log('screenshot:',file);
}

async function newPage(browser){
  const context=await browser.newContext({
    viewport:{width:360,height:780},
    serviceWorkers:'block',
  });
  await context.addInitScript(()=>{
    try{
      localStorage.setItem('wt_onboarding_done','1');
      localStorage.setItem('wt_profile','bulk');
    }catch(e){}
  });
  const page=await context.newPage();
  page.on('pageerror',error=>console.log('[pageerror]',error.message));
  page.on('console',msg=>{if(msg.type()==='error')console.log('[console.error]',msg.text());});
  return {context,page};
}

async function waitForShell(page){
  await page.goto(BASE_URL,{waitUntil:'load'});
  await page.locator('#wt-compact-host').waitFor({state:'attached',timeout:15000});
  // The shell's own render() runs on a rAF; give it a moment before probing content.
  await page.locator('[data-page]').first().waitFor({state:'visible',timeout:15000});
}

async function readStorage(page){
  return page.evaluate(()=>{
    const out={};
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      out[key]=localStorage.getItem(key);
    }
    return out;
  });
}

async function logASet(page){
  // Open the first exercise row on the Trening (workout) page and log its first set.
  await page.locator('button.cg-exrow').first().click();
  const form=page.locator('form[data-log-form]').first();
  await form.waitFor({state:'visible'});
  await form.locator('[data-field="kg"]').fill('62.5');
  await form.locator('[data-field="reps"]').fill('8');
  await form.locator('button[type="submit"]').click();
  // Logging the first set of the day auto-starts the session (no confirm dialog).
  await page.locator('[data-act="session-finish"]').first().waitFor({state:'visible',timeout:5000});
}

async function finishWorkout(page){
  await page.locator('[data-act="session-finish"]').first().click();
  const dialog=page.locator('#wt-compact-host dialog[open], #wt-compact-host dialog');
  await dialog.waitFor({state:'visible',timeout:5000});
  await dialog.locator('button[type="submit"]').click();
  await dialog.waitFor({state:'hidden',timeout:5000}).catch(()=>{});
}

async function addBodyWeight(page,kg){
  await page.locator('button[data-page="Napredek"]').click();
  await page.locator('[data-progress="Teža"]').click().catch(()=>{});
  await page.locator('[data-act="weight-add"]').first().click();
  const dialog=page.locator('#wt-compact-host dialog[open], #wt-compact-host dialog');
  await dialog.waitFor({state:'visible',timeout:5000});
  await dialog.locator('input[name="kg"]').fill(String(kg));
  await dialog.locator('button[type="submit"]').click();
  await dialog.waitFor({state:'hidden',timeout:5000}).catch(()=>{});
}

async function openBackupSettings(page){
  await page.locator('button[data-page="Nastavitve"]').click();
  await page.locator('[data-act="backup"]').first().click();
  await page.locator('[data-act="import"]').first().waitFor({state:'visible',timeout:5000});
}

async function restoreFromFile(page,filePath,mode){
  const [chooser]=await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('[data-act="import"]').first().click(),
  ]);
  await chooser.setFiles(filePath);
  const dialog=page.locator('#wt-compact-host dialog[open], #wt-compact-host dialog');
  await dialog.waitFor({state:'visible',timeout:5000});
  await shot(page,`import-mode-dialog-${mode}`);
  await dialog.locator('select[name="mode"]').selectOption(mode);
  await dialog.locator('button[type="submit"]').click();
  // A photo-import confirm sheet may follow (only if the backup carries photos); this
  // synthetic backup carries none, so it should not appear, but wait briefly just in case.
  await page.waitForTimeout(300);
  const maybePhotoDialog=page.locator('#wt-compact-host dialog[open]');
  if(await maybePhotoDialog.isVisible().catch(()=>false)){
    await maybePhotoDialog.locator('button[type="submit"]').click().catch(()=>{});
  }
  await page.waitForTimeout(300);
}

async function buildSyntheticDataAndBackup(browser){
  const {context,page}=await newPage(browser);
  await waitForShell(page);
  await shot(page,'loaded');

  await logASet(page);
  await shot(page,'set-logged');

  await finishWorkout(page);
  await shot(page,'workout-finished');

  await addBodyWeight(page,'82.4');
  await shot(page,'bodyweight-added');

  const storageBeforeExport=await readStorage(page);
  assert.ok(JSON.parse(storageBeforeExport.wt_sess6||'[]').length>=1,'expected at least one finished session');
  assert.ok(Object.keys(JSON.parse(storageBeforeExport.wt_bw6||'{}')).length>=1,'expected at least one body-weight entry');

  const backupJson=await page.evaluate(async()=>window.buildBackupJSON(true));
  const backup=JSON.parse(backupJson);
  assert.ok(Array.isArray(backup.sessions)&&backup.sessions.length>=1,'backup must contain the finished session');
  assert.ok(backup.sets&&Object.keys(backup.sets).length>=1,'backup must contain the logged set');
  assert.ok(backup.bw&&Object.keys(backup.bw).length>=1,'backup must contain the body-weight entry');

  const backupPath=path.join(TMP_DIR,'wt-backup-ui-e2e.json');
  fs.writeFileSync(backupPath,backupJson);
  console.log('wrote backup file:',backupPath, `(${backup.sessions.length} session(s), ${Object.keys(backup.sets).length} set-key(s))`);

  await context.close();
  return {backupPath,backup,storageBeforeExport};
}

async function runMergeScenario(browser,backupPath,originalBackup){
  console.log('\n=== merge (Združi) restore ===');
  const {context,page}=await newPage(browser);
  await waitForShell(page);

  // Alter/clear some data before restoring, to make the merge meaningfully different
  // from a no-op: a different current body-weight entry (should survive) and no sessions.
  await page.evaluate(()=>{
    localStorage.setItem('wt_bw6',JSON.stringify({'2020-01-01':50}));
    localStorage.removeItem('wt_sess6');
    localStorage.removeItem('wt_s6');
  });
  await page.reload({waitUntil:'load'});
  await page.locator('#wt-compact-host').waitFor({state:'attached'});

  await openBackupSettings(page);
  await shot(page,'settings-backup-page-merge');
  await restoreFromFile(page,backupPath,'merge');
  await shot(page,'after-merge-restore');

  const storage=await readStorage(page);
  const sessions=JSON.parse(storage.wt_sess6||'[]');
  const sets=JSON.parse(storage.wt_s6||'{}');
  const bw=JSON.parse(storage.wt_bw6||'{}');

  assert.ok(sessions.some(s=>s.id===originalBackup.sessions[0].id),'merge must bring in the backed-up session');
  assert.ok(Object.keys(sets).length>=1,'merge must bring in the backed-up sets');
  assert.equal(bw['2020-01-01'],50,'merge must keep the current (newer) body-weight entry on conflict');
  assert.ok(Object.keys(bw).length>=2,'merge must add the backup body-weight entry alongside the current one');
  assert.equal(storage.wt_profile,'bulk','merge must not overwrite the current profile');
  console.log('merge OK: sessions=%d sets-keys=%d bw-entries=%d profile=%s',
    sessions.length,Object.keys(sets).length,Object.keys(bw).length,storage.wt_profile);

  await context.close();
}

async function runReplaceScenario(browser,backupPath,originalBackup){
  console.log('\n=== replace (Zamenjaj) restore ===');
  const {context,page}=await newPage(browser);
  await waitForShell(page);

  await page.evaluate(()=>{
    localStorage.setItem('wt_bw6',JSON.stringify({'2020-01-01':50}));
    localStorage.setItem('wt_sess6','[]');
    localStorage.setItem('wt_s6','{}');
  });
  await page.reload({waitUntil:'load'});
  await page.locator('#wt-compact-host').waitFor({state:'attached'});

  // Confirm a local backup snapshot is taken before the destructive restore, by
  // counting IndexedDB `backups` store entries before and after.
  const backupsBefore=await page.evaluate(async()=>{
    const db=await window.openPhotoDB();
    return new Promise(res=>{
      const tx=db.transaction('backups','readonly');
      tx.objectStore('backups').getAll().onsuccess=e=>res(e.target.result.length);
    });
  });

  await openBackupSettings(page);
  await shot(page,'settings-backup-page-replace');
  await restoreFromFile(page,backupPath,'replace');
  await shot(page,'after-replace-restore');

  const storage=await readStorage(page);
  const sessions=JSON.parse(storage.wt_sess6||'[]');
  const sets=JSON.parse(storage.wt_s6||'{}');
  const bw=JSON.parse(storage.wt_bw6||'{}');

  assert.deepEqual(sessions.map(s=>s.id).sort(),originalBackup.sessions.map(s=>s.id).sort(),
    'replace must make sessions match the backup exactly');
  assert.deepEqual(Object.keys(sets).sort(),Object.keys(originalBackup.sets).sort(),
    'replace must make set-keys match the backup exactly');
  assert.deepEqual(bw,originalBackup.bw,'replace must overwrite body-weight with the backup verbatim');
  assert.equal(bw['2020-01-01'],undefined,'replace must drop the pre-restore body-weight entry');

  const backupsAfter=await page.evaluate(async()=>{
    const db=await window.openPhotoDB();
    return new Promise(res=>{
      const tx=db.transaction('backups','readonly');
      tx.objectStore('backups').getAll().onsuccess=e=>res(e.target.result);
    });
  });
  assert.ok(backupsAfter.length>backupsBefore,'replace must save a local rollback snapshot to IndexedDB before restoring');
  assert.ok(backupsAfter.some(b=>b.label==='rollback-before-import'),
    'the pre-restore snapshot must be labeled rollback-before-import');
  console.log('replace OK: sessions=%d sets-keys=%d idb-backups %d -> %d (rollback snapshot present)',
    sessions.length,Object.keys(sets).length,backupsBefore,backupsAfter.length);

  await context.close();
}

async function runCorruptFileScenario(browser){
  console.log('\n=== corrupt JSON file ===');
  const {context,page}=await newPage(browser);
  await waitForShell(page);
  const before=await readStorage(page);

  const corruptPath=path.join(TMP_DIR,'wt-backup-ui-e2e-corrupt.json');
  fs.writeFileSync(corruptPath,'{ this is not valid json ');

  await openBackupSettings(page);
  const [chooser]=await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('[data-act="import"]').first().click(),
  ]);
  await chooser.setFiles(corruptPath);
  // importData() reports the error via toast(), rendered by the shell's notify()/message area.
  const message=page.locator('#wt-compact-host [role="alert"], #wt-compact-host [role="status"]').first();
  await message.waitFor({state:'visible',timeout:5000});
  const text=(await message.textContent())||'';
  await shot(page,'corrupt-file-error');
  console.log('corrupt-file message:',JSON.stringify(text));
  assert.match(text,/napak|ni mogoče|ni veljaven|Napačna/i);

  const after=await readStorage(page);
  assert.deepEqual(after,before,'a corrupt backup file must leave storage completely unchanged');
  console.log('corrupt-file OK: storage unchanged, error message shown');

  await context.close();
}

(async()=>{
  const browser=await chromium.launch();
  try{
    const {backupPath,backup}=await buildSyntheticDataAndBackup(browser);
    await runMergeScenario(browser,backupPath,backup);
    await runReplaceScenario(browser,backupPath,backup);
    await runCorruptFileScenario(browser);
    console.log('\nAll backup-restore UI scenarios passed.');
  }finally{
    await browser.close();
  }
})().catch(error=>{
  console.error('backup-ui e2e FAILED:',error);
  process.exitCode=1;
});
