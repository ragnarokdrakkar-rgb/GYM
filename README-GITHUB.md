# Workout Tracker 1.1.0 — Redline

Android aplikacija in lokalno delujoči spletni vmesnik za zapisovanje treningov.

## Posodobitev na telefonu

1. Pred nadgradnjo izvozi JSON kopijo v Nastavitvah in jo shrani zunaj aplikacije.
2. Na [GitHub Releases](https://github.com/ragnarokdrakkar-rgb/GYM/releases/latest) prenesi `Workout-Tracker-v1.1.0.apk`.
3. Odpri APK in izberi **Posodobi**. Stare aplikacije ne odstranjuj in ne briši njenih podatkov.

Identiteta paketa ostaja `com.kemal.workouttracker`; versionCode je 59. APK mora biti podpisan z istim obstoječim ključem. Ključ in njegove nastavitve niso del repozitorija.

## Novo v 1.1.0

- Črna/rdeča/oranžna postavitev s štirimi zavihki: Trening, Program, Napredek, Nastavitve.
- Cut/Bulk samo v Nastavitvah. Preklop ohrani vaje, vrstni red, ročne cilje in zgodovino; 5/3/1 ostaja izbira posamezne vaje.
- En vnos seta: kg, ponovitve, ročni RPE. Pregled in popravki opravljenih setov se odprejo posebej.
- Fokus z eno vajo, odmor, razlaga predloga bremena in povzetek zaključenega treninga.
- Strožja progresija: za povečanje so potrebni vsi delovni seti, dosežen cilj ponovitev in RPE. Lastna teža in asistenca ne dobita samodejnega predloga dodatnih kg.
- Neposredno urejanje osnovnega TM brez ponavljajoče pretvorbe na 90 %.
- Vidna napaka shranjevanja do uspešnega ponovnega poskusa. Neuspešen zaključek ohrani aktivni trening.
- Validacija kopije pred uvozom, obnovitveni dnevnik zapisov in združevanje s prednostjo trenutnih konfliktnih zapisov.
- Nova izvedba istega dne ima svoj ID in sete. Prejšnji zaključeni zapis ter obnovitveni osnutek ostaneta ohranjena.

## Razvoj in preverjanje

```powershell
npm ci
npm run build:bundle
npm test
npm run preview
```

`src/app/` vsebuje izvorne module; `js/app.js` je sestavljen runtime. Po spremembi modulov vedno sestavi bundle. Predogled posluša samo na `127.0.0.1:4173` in ne streže podpisnih datotek ali metapodatkov repozitorija.

Za lokalno podpisano sestavo v konfiguriranem Windows okolju:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/build-candidate.ps1
```

Skripta izvede teste, oba Release Guard pregleda, pripravo spletnih datotek, Capacitor copy in offline Gradle release build. Ne objavlja na GitHub. Zahteva obstoječi Android SDK/JDK, Gradle predpomnilnik in podpisne nastavitve.

## Omejitve

- Lokalni IndexedDB snapshot ni zunanji backup. Izvoz shrani tudi zunaj aplikacije.
- Ob napaki shrambe so neuspešni vnosi v pomnilniku za ponovni poskus/izvoz. Ne zapiraj aplikacije, dokler napake ne odpraviš ali podatkov ne izvoziš.
- Predlogi progresije so pomoč pri beleženju, ne zagotovilo varnega bremena ali zdravstvena ocena.
- Nadgradnja na telefonu, tipkovnica Android WebView, dovoljenja in alarm pri zaklenjenem zaslonu potrebujejo preverjanje na napravi.
- Za GitHub Pages objavi celoten spletni runtime (`index.html`, `css/`, `js/`, `vendor/`, ikone, manifest in `sw.js`), ne samo HTML.
