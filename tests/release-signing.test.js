'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const CERT='b0807ab8a94393f22694e927f81e6cced8dadf1ac71ead4758e239bacc7ab086';

test('APK verification requires the existing release certificate, package and a higher versionCode',()=>{
  const v=read('tools/verify-apk-signature.ps1');
  assert.ok(v.includes(`'${CERT}'`));assert.ok(v.includes("'com.kemal.workouttracker'"));
  assert.match(v,/apksigner\.bat/);assert.match(v,/verify --verbose --print-certs/);assert.match(v,/Select-Object -Unique/);
  // The digest pattern must accept both apksigner output formats and reject other lines.
  const pattern=new RegExp(v.match(/'(\^Signer[^']+)'/)[1]);
  const d='b0:80:7a:b8:a9:43:93:f2:26:94:e9:27:f8:1e:6c:ce:d8:da:df:1a:c7:1e:ad:47:58:e2:39:ba:cc:7a:b0:86';
  assert.equal(pattern.exec('Signer #1 certificate SHA-256 digest: '+d)[1],d);
  assert.equal(pattern.exec('Signer (minSdkVersion=24, maxSdkVersion=2147483647) certificate SHA-256 digest: b0807ab8a94393f22694e927f81e6cced8dadf1ac71ead4758e239bacc7ab086')[1],'b0807ab8a94393f22694e927f81e6cced8dadf1ac71ead4758e239bacc7ab086');
  assert.equal(pattern.exec('Signer #1 certificate SHA-1 digest: abcd'),null);
  assert.equal(pattern.exec('Signer #1 public key SHA-256 digest: '+d),null);
  assert.match(v,/\$Digests\.Count -ne 1/);assert.match(v,/CN=Android Debug/);assert.match(v,/VersionCode -le \$MinVersionCodeExclusive/);
  assert.doesNotMatch(v,/storePassword|keyPassword|keystore\.properties|\.jks/i,'the verifier must never touch signing secrets');
  assert.doesNotMatch(v,/[^\x00-\x7F]/,'Windows PowerShell 5.1 reads BOM-less scripts as ANSI');
});
test('Build and publish scripts stop before release when the signature check fails',()=>{
  const bat=read('build-release.bat'),pub=read('publish-release.ps1');
  assert.ok(bat.indexOf('verify-apk-signature.ps1')>0&&bat.indexOf('verify-apk-signature.ps1')<bat.indexOf('[6/6] Racunam SHA-256'));
  const verify=pub.indexOf('Test-ReleaseApkSignature\n$VerifiedApkHash'),reverify=pub.lastIndexOf('Test-ReleaseApkSignature'),create=pub.indexOf("'release',\n        'create'");
  assert.ok(verify>0&&reverify>verify&&create>reverify,'verify after build and again right before gh release create');
  assert.match(pub,/BuiltVersionCode -le \$PublishedVersionCode/);assert.ok(pub.includes(CERT));
});
test('No CI workflow signs or publishes APKs with a generated or debug key',()=>{
  const dir=path.join(__dirname,'..','.github','workflows');
  for(const f of fs.readdirSync(dir)){const y=fs.readFileSync(path.join(dir,f),'utf8');assert.doesNotMatch(y,/assembleRelease|keytool -genkey|release create/i,f);}
  assert.doesNotMatch(read('.gitignore'),/^!.*\.jks/m);assert.match(read('.gitignore'),/^\*\.jks$/m);
});
