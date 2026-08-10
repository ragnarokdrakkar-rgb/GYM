# Workout Tracker 1.0.48 — namestitev na GitHub Pages

## Datoteke v tem paketu

- `index.html` — nova različica aplikacije.
- `sw.js` — service worker za posodobitve, offline fallback in obvestilo timerja.
- `.nojekyll` — GitHub Pages naj datoteke objavi neposredno, brez Jekyll obdelave.

Paket namenoma ne vsebuje `manifest.json`, `icon-192.png` in `icon-512.png`, ker jih moraš obdržati iz obstoječega repozitorija. `index.html` se nanje še vedno sklicuje.

## Preden karkoli zamenjaš

1. V stari aplikaciji izberi **Nastavitve → Izvoz**.
2. Shrani JSON backup na telefon ali računalnik.
3. V GitHub repozitoriju po želji prenesi tudi star `index.html` kot dodatno kopijo.

Lokalni IndexedDB snapshoti niso zunanji backup. Ob brisanju podatkov strani ali odstranitvi aplikacije se lahko izgubijo.

## Posodobitev obstoječega GitHub repozitorija prek brskalnika

1. Odpri svoj GitHub repozitorij.
2. Preveri, da si na branchu, iz katerega GitHub Pages objavlja stran — običajno `main`.
3. Klikni **Add file → Upload files**.
4. Iz tega paketa naloži:
   - `index.html`
   - `sw.js`
   - `.nojekyll`
5. Ko GitHub opozori, da datoteki že obstajata, je to pravilno: novi datoteki ju morata zamenjati.
6. V polje za commit napiši na primer: `Workout Tracker 1.0.48`.
7. Izberi commit neposredno v `main` in potrdi **Commit changes**.
8. Ne briši obstoječih:
   - `manifest.json`
   - `icon-192.png`
   - `icon-512.png`

## Prva nastavitev GitHub Pages

Če Pages še ni vključen:

1. V repozitoriju odpri **Settings → Pages**.
2. Pri **Build and deployment** izberi **Deploy from a branch**.
3. Izberi branch `main` in mapo `/(root)`.
4. Klikni **Save**.

`index.html` mora biti v korenu izbrane objavne mape, ne v dodatni podmapi.

## Po objavi

1. Na GitHubu odpri **Actions** in počakaj, da je Pages deployment zelen.
2. Odpri javni URL aplikacije v običajnem brskalniku.
3. Preveri, da je v aplikaciji prikazana različica `1.0.48`.
4. Če je še vedno prikazana stara različica:
   - popolnoma zapri aplikacijo oziroma zavihek;
   - ponovno odpri URL;
   - če to ne pomaga, v nastavitvah brskalnika izbriši podatke samo za to GitHub Pages stran in jo ponovno odpri;
   - pri nameščeni PWA je v skrajnem primeru potrebna odstranitev in ponovna namestitev.

Pred brisanjem podatkov strani vedno naredi JSON export, saj to izbriše lokalne trening podatke.

## Hiter funkcionalni pregled po posodobitvi

- Spodaj so samo trije zavihki: **Trening**, **Napredek**, **Nastavitve**.
- AI modul in Google Sheets modul nista več prisotna.
- Na strani Trening je kartica današnjega treninga.
- Fokus pokaže eno aktivno vajo in omogoča prejšnjo/naslednjo vajo.
- Med aktivno sesijo ni mogoče zamenjati tedna, dneva ali profila.
- Uvoz ponudi **Združi** ali **Zamenjaj vse**.
- Po koncu treninga se ustvari lokalni snapshot.

## Pomembna omejitev obvestil timerja

Obvestilo ob koncu odmora je odvisno od dovoljenj in pravil Androida/brskalnika. Nobena navadna spletna PWA ne more zagotoviti, da bo service worker ostal živ ves čas, zato naj bo vidni timer še vedno glavni vir resnice.
