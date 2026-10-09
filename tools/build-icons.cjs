// Renders every app icon (PWA + Android launcher, incl. the adaptive foreground)
// from assets/icon/app-icon.svg and app-icon-foreground.svg with the globally
// installed Playwright Chromium. Run: node tools/build-icons.cjs
// The package name, signing and release flow are untouched by icon changes.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const full=fs.readFileSync(path.join(root,'assets/icon/app-icon.svg'),'utf8'),fg=fs.readFileSync(path.join(root,'assets/icon/app-icon-foreground.svg'),'utf8');
// Maskable / legacy round: no rounded corners (the launcher cuts the shape), W scaled into the safe zone.
const maskable=full.replace('rx="112"','rx="0"').replace('<rect x="44" y="44" width="424" height="424" rx="92"','<rect x="84" y="84" width="344" height="344" rx="76"').replace('<!-- big W monogram -->','<!-- big W monogram --><g transform="translate(256 256) scale(0.78) translate(-256 -256)">').replace('<circle cx="300" cy="412" r="9" fill="#8f0a12"/>','<circle cx="300" cy="412" r="9" fill="#8f0a12"/></g>');
(async()=>{
  const b=await chromium.launch();const page=await b.newPage();
  const jobs=[[full,192,'icon-192.png'],[full,512,'icon-512.png'],[maskable,512,'icon-maskable-512.png']];
  for(const [d,launcher,fgSize] of [['mdpi',48,108],['hdpi',72,162],['xhdpi',96,216],['xxhdpi',144,324],['xxxhdpi',192,432]]){
    const dir=`android/app/src/main/res/mipmap-${d}`;
    jobs.push([full,launcher,`${dir}/ic_launcher.png`],[maskable,launcher,`${dir}/ic_launcher_round.png`],[fg,fgSize,`${dir}/ic_launcher_foreground.png`,true]);
  }
  for(const [svg,size,rel,transparent] of jobs){
    await page.setViewportSize({width:size,height:size});
    await page.setContent(`<body style="margin:0;background:transparent">${svg.replace('width="512" height="512"',`width="${size}" height="${size}"`)}</body>`);
    await page.screenshot({path:path.join(root,rel),omitBackground:!!transparent});
    console.log('icon',rel,size+'px');
  }
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
