// Cross-platform equivalent of build-app-bundle.ps1: concatenates src/app in the
// same order, checks the required tokens and syntax, then writes js/app.js.
// `--check` only verifies that js/app.js is up to date with src/app.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),out=path.join(root,'js','app.js');
const files=['ui-shell','workout-model','profile-strength','workout-ui','gym-session-core','v6-core','workout-runtime','analytics-tools','main'].map(n=>path.join(root,'src','app',n+'.js'));
const combined=files.map(f=>fs.readFileSync(f,'utf8')).join('');
for(const token of ['function toggleTheme(){','function showPage(p){','function getExtraSets(','// ============== PROFIL SISTEM ==============','const EX_MAP =']){
  if(!combined.includes(token))throw Error('APP BUNDLE: manjka obvezni token: '+token);
}
new vm.Script(combined,{filename:'js/app.js'});
if(process.argv.includes('--check')){
  if(fs.readFileSync(out,'utf8')!==combined){console.error('APP BUNDLE: js/app.js ni usklajen z src/app. Zaženi node tools/build-app-bundle.cjs');process.exit(1);}
  console.log('APP BUNDLE: js/app.js je usklajen.');
}else{fs.writeFileSync(out,combined);console.log('APP BUNDLE: js/app.js zapisan ('+combined.length+' znakov).');}
