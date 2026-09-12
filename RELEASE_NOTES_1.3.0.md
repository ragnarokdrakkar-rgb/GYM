# Workout Tracker 1.3.0 — Compact Gym

## Novosti

- Nov kompakten uporabniški vmesnik: ena razširjena vaja, manjši gumbi, temno-siva podlaga in oranžni poudarki. Nastavitve so zložene v skupine, dodatna statistika ostane pod razširitvijo.
- Koledar takoj pokaže ime in barvo treninga: Push A oranžno, Pull A modro, Noge vijolično, Push B zeleno in Pull B rožnato. Imena po meri imajo stalno barvo. Več treningov istega dne ostane ločenih.
- Načrtovanje serij v fokusu in običajnem treningu: kg in ponovitve za vsako serijo vnaprej, dodajanje več serij naenkrat ter odstranitev posamezne neopravljene serije. Opravljene serije ostanejo nedotaknjene. Načrt ni opravljeno delo in ne ustvarja rekorda.
- Naslednji vnos uporabi svojo načrtovano težo; prejšnja serija je ne prepiše. RPE je ročen in neobvezen.
- V fokusu ni zaključevanja celotnega treninga ali start/stop gumba posamezne vaje. Počitek ima neposredno nastavitev trajanja. Spodnja navigacija ne prekriva urejanja serij.
- Zgodovina: izbor datuma, posameznega treninga istega dne in vaje. Popravek odpre obstoječi varen urejevalnik nad koledarjem. Vsi viri, PR-ji in filter sumljivih vrednosti ostanejo dosegljivi v Nastavitvah.
- Moč: seznam vseh aktivnih vaj iz aktivnih dni programa. Klik prikaže graf dejansko zabeleženih kilogramov, izbiro treninga in povezavo do natančnega zgodovinskega vira. Brez izmišljene zgodovine ali zamenjave teže z oceno 1RM.
- Nova Android in spletna ikona: ročka z ognjenim poudarkom. Velikosti so pripravljene tudi za krožne in prilagodljive Android ikone.

## Namestitev

Prenesi `Workout-Tracker-v1.3.0.apk` in izberi **Posodobi**. Aplikacije ne odstranjuj in ne briši podatkov. Pred nadgradnjo priporočamo izvoz JSON kopije.

Paket ostaja `com.kemal.workouttracker`, versionCode 67, isti obstoječi podpis. Sprememba UI ne zamenjuje uporabnikove zgodovine z demo podatki in ne uvaja migracije shrambe.

Preverjeno z regresijskimi testi in lokalnim mobilnim UI preizkusom. Fizični Android telefon, sistemska tipkovnica in obnašanje ob zaklenjenem zaslonu niso bili neposredno preizkušeni v tej izdaji.
