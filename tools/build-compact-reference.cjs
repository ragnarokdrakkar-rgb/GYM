// Reproduce the approved preview CSS, not an approximation layered over the old UI.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const reference=fs.readFileSync(path.join(root,'design/compact-gym-v3-reference.html'),'utf8');
const styles=[...reference.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
if(!styles.includes('#cg-preview .cg-fields'))throw Error('Approved design source missing');
fs.writeFileSync(path.join(root,'css/compact-reference.css'),'/* Generated from the approved Compact Gym v3 design. */\n'+styles.replaceAll('#cg-preview','#cg-app').trim()+'\n');
