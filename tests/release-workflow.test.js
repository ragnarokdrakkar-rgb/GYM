'use strict';
// The cloud release workflow may only publish an APK signed with the EXISTING
// release key. These checks lock its safety gates.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const wf=fs.readFileSync(path.join(__dirname,'..','.github/workflows/release-android.yml'),'utf8');
const step=name=>{const a=wf.indexOf(`- name: ${name}`);assert.ok(a>=0,name);const b=wf.indexOf('\n      - ',a+1);return wf.slice(a,b<0?undefined:b);};

test('started by hand only, only from main, write access only where it publishes',()=>{
  assert.match(wf,/^on:\n  workflow_dispatch:/m);
  assert.doesNotMatch(wf,/^\s+(push|pull_request|schedule|workflow_run):/m);
  assert.equal((wf.match(/if: github\.ref == 'refs\/heads\/main'/g)||[]).length,2);
  assert.match(wf,/^permissions:\n  contents: read\n/m);
  assert.match(wf,/build-sign-publish:[\s\S]*?permissions:\n      contents: write/);
});

test('publishes only after the existing certificate, package and a higher versionCode are verified',()=>{
  assert.match(wf,/EXPECTED_CERT_SHA256: b0807ab8a94393f22694e927f81e6cced8dadf1ac71ead4758e239bacc7ab086/);
  const verify=step('Verify signature, package and versionCode');
  assert.match(verify,/tools\/verify-apk-signature\.ps1 -ApkPath \$apkPath -ExpectedCertSha256 \$env:EXPECTED_CERT_SHA256 -MinVersionCodeExclusive \$env:PUBLISHED_CODE -ExpectedVersionCode \$env:VERSION_CODE/);
  assert.match(verify,/if \(\$LASTEXITCODE -ne 0\) \{ Remove-Item \$apk -Force; throw/);
  assert.ok(wf.indexOf('- name: Verify signature, package and versionCode')<wf.indexOf('- name: Publish GitHub release'),'verify before publish');
  const version=step('Version, release notes and versionCode');
  assert.match(version,/if \(\$code -le \$published\) \{ throw/);
  assert.match(version,/Release v\$v already exists/);
  const after=step('Verify the published APK');
  assert.match(after,/if \(\$got -ne \$env:APK_SHA256\) \{ throw/);
});

test('the key comes only from encrypted secrets, is never printed and is always removed',()=>{
  const uses=wf.match(/\$\{\{ secrets\.[A-Z_0-9]+ \}\}/g)||[];
  assert.deepEqual([...new Set(uses)].sort(),['${{ secrets.WT_RELEASE_KEYSTORE_B64 }}','${{ secrets.WT_RELEASE_KEYSTORE_PROPERTIES }}']);
  assert.doesNotMatch(wf,/(Write-Host|echo|Write-Output)[^\n]*KEYSTORE/i);
  assert.match(step('Remove the signing key'),/if: always\(\)[\s\S]*Remove-Item -Recurse -Force 'C:\\WorkoutTrackerKeys'/);
  const dry=step('Dry run - compile the release variant without any key');
  assert.doesNotMatch(dry,/secrets\./);assert.match(dry,/missing\.jks/);assert.doesNotMatch(dry,/assembleRelease|gh release/);
  for(const name of ['Write the existing signing key (never printed)','Gradle release build','Verify signature, package and versionCode','Publish GitHub release','Verify the published APK'])
    assert.match(step(name),/if: env\.DRY_RUN != 'true'/,name);
});

test('the release version in code has a higher versionCode than the last published one (70)',()=>{
  const gradle=fs.readFileSync(path.join(__dirname,'..','android/app/build.gradle'),'utf8');
  assert.ok(Number(gradle.match(/versionCode (\d+)/)[1])>70);
});
