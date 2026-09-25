# Podpis in objava Android posodobitve

Vsaka izdaja mora biti **posodobitev** obstoječe aplikacije:

- applicationId `com.kemal.workouttracker`
- isti release ključ kot prejšnje izdaje, SHA-256 certifikata
  `b0807ab8a94393f22694e927f81e6cced8dadf1ac71ead4758e239bacc7ab086`
- versionCode višji od zadnje objavljene izdaje

## Kje je ključ

Release ključ in `keystore.properties` sta samo na lokalnem računalniku v
`C:\WorkoutTrackerKeys\`. Nista v repozitoriju (`.gitignore` blokira `*.jks`,
`*.keystore`, `keystore.properties`) in **nista** v GitHub Actions secrets.
Workflow `.github/workflows/quality.yml` samo poganja teste; APK-ja ne gradi,
ne podpisuje in ne objavlja.

Posledica: oblačna seja (Claude Code na webu) APK-ja ne more podpisati z
obstoječim ključem. Nikoli ne ustvari novega ključa in nikoli ne objavi APK-ja z
debug podpisom: telefon bi zavrnil posodobitev, pri odstranitvi stare
aplikacije pa bi se izgubili lokalni podatki.

## Postopek na lokalnem računalniku (Windows)

1. Naredi zunanjo JSON varnostno kopijo v aplikaciji (Nastavitve → Varnostna kopija).
2. `git checkout main` in `git pull --ff-only`, nato zaženi `publish-release.bat`.
   Pred tem mora biti v kodi verzija že nastavljena na novo (`package.json`,
   `package-lock.json`, `APP_VERSION` v `js/core/bootstrap.js`, `sw.js`,
   `README-GITHUB.md`, `tests/release-regression.test.js`) in dodan
   `RELEASE_NOTES_<verzija>.md`. Skripta sama poveča samo versionCode in
   versionName v `build.gradle`, opis releasa pa vzame iz te datoteke.
3. Skripta zgradi APK s `build-release.bat` (poveča versionCode) in takoj zažene
   `tools/verify-apk-signature.ps1`:
   - `apksigner verify --print-certs`: shema v2/v3, natanko en podpisnik,
     certifikat SHA-256 se mora ujemati z zgornjim, ni debug podpisa;
   - `aapt2 dump badging`: paket `com.kemal.workouttracker`, versionCode.
   Če preverjanje ne uspe, se APK izbriše in build ustavi.
4. `publish-release.ps1` prebere versionCode zadnje objavljene izdaje iz
   `android/app/build.gradle` njenega Git taga in zahteva višjega. Nato podpis
   preveri še dvakrat: po buildu in tik pred `gh release create`. Če se APK
   vmes spremeni, se objava ustavi.
5. Objava zahteva izrecen vnos `OBJAVI`. Release dobi APK in datoteko SHA-256,
   opombe pa vsebujejo versionCode, certifikat in SHA-256 APK-ja.
6. Po objavi na GitHubu preveri, da sta oba asseta naložena in da se SHA-256
   ujema. APK namesti kot posodobitev, stare aplikacije ne odstranjuj.

Skripte nikoli ne izpišejo gesel, aliasa ali poti do keystoreja. Izpišejo samo
javni SHA-256 certifikata in APK-ja.

## Možnost: podpis v GitHub Actions

Če želiš graditi v oblaku, lahko **lastnik repozitorija sam** doda šifrirane
secrets (keystore v base64 in gesla) v GitHub → Settings → Secrets and variables
→ Actions. Keystoreja in gesel nikoli ne pošiljaj v klepet in jih ne commitaj.
Takšen workflow mora pred objavo zagnati enako preverjanje certifikata in se
ustaviti, če se certifikat ne ujema.
