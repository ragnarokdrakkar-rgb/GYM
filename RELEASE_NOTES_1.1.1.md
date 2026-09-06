# Workout Tracker 1.1.1 — kljukice treninga in Bulk statistika

## Popravki

- Kljukica opravljenega treninga upošteva samo aktivne, vidne vaje. Deaktivirane vaje ostanejo v programu in ne blokirajo zaključka ali vplivajo na trenutno statistiko.
- Kartice vaj, kljukica dneva in shranjeni trening uporabljajo isti cilj serij — tudi za 5/3/1, ročne cilje in deload.
- Ob dodajanju ali zmanjšanju cilja serij se kljukica osveži takoj. Zmanjšanje cilja ne izbriše že opravljenih serij; prikaz nad ciljem je jasen, na primer »3 opravljenih · cilj 1«.
- Bulk in Cut statistika uporabljata samo meritve od začetka trenutne faze. Bulk ne prikazuje več »idealnega tempa za Cut«. Nova faza brez dovolj podatkov pokaže pojasnilo namesto napačnega trenda.
- Odstranjena stran Mere/obsegi; Telesna teža ostaja. Zgodovina, shranjene meritve in podpora varnostnim kopijam se ohranijo.
- Statistika zaključenih treningov uporablja njihove shranjene posnetke, ne današnjega spremenjenega programa.

## Preverjanje

- 63 uspešnih avtomatiziranih testov, statični pregled kode ter Source in Android Release Guard.
- Mobilni brskalniški pregled Bulk statistike, odstranitve mer in kljukice dneva z deaktiviranimi vajami.
- Podpisani APK: `com.kemal.workouttracker`, različica `1.1.1`, versionCode `60`. Podpis se ujema z izdajo 1.1.0.

Nadgradnja na fizičnem telefonu, Android tipkovnica in alarm pri zaklenjenem zaslonu niso bili preizkušeni.

## Posodobitev telefona

1. V stari aplikaciji izvozi JSON varnostno kopijo in jo shrani zunaj aplikacije.
2. Prenesi `Workout-Tracker-v1.1.1.apk` iz te izdaje.
3. Odpri APK in izberi **Posodobi**. Stare aplikacije ne odstranjuj in ne briši njenih podatkov.

SHA-256 APK: `63a0c51fe058adf1f97eb7b5750965ad2a15183a043d103c55d13eb243a2466f`
