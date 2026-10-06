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
   Če se `APP_VERSION` ali verzija v `package.json` ne ujema z vpisano
   verzijo, release guard build ustavi, preden se APK zgradi.
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

## Podpis in objava v GitHub Actions (workflow »Android release«)

Workflow `.github/workflows/release-android.yml` naredi isto kot `publish-release.bat`,
samo v oblaku: testi, priprava `www`, release guard, Capacitor sync, Gradle build,
preverjanje podpisa (`tools/verify-apk-signature.ps1`) in objava. Zažene se samo
ročno in samo z veje `main`. Objavi samo APK, ki:

- ima natanko enega podpisnika s certifikatom SHA-256
  `b0807ab8a94393f22694e927f81e6cced8dadf1ac71ead4758e239bacc7ab086`,
- ima paket `com.kemal.workouttracker`,
- ima versionCode višji od zadnje objavljene izdaje.

Po objavi APK prenese nazaj in preveri, da se SHA-256 ujema. Ključ se na koncu
vedno izbriše s strežnika (strežnik je tudi sicer enkraten).

### Enkratna nastavitev (naredi jo lastnik sam, nikoli prek klepeta)

Ključ in gesli gredo samo v šifrirane GitHub Secrets. Na svojem računalniku v
PowerShellu:

1. Ključ kot base64 v odložišče:
   `[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\WorkoutTrackerKeys\workout-tracker-release.jks')) | Set-Clipboard`
2. Na GitHubu: repozitorij → Settings → Secrets and variables → Actions →
   New repository secret. Ime `WT_RELEASE_KEYSTORE_B64`, vrednost prilepi, Add secret.
3. Vsebina nastavitev v odložišče:
   `Get-Content 'C:\WorkoutTrackerKeys\keystore.properties' -Raw | Set-Clipboard`
4. Nov secret z imenom `WT_RELEASE_KEYSTORE_PROPERTIES`, vrednost prilepi, Add secret.
5. Počisti odložišče: `Set-Clipboard -Value ' '`.

Tveganje: ključ je potem tudi v GitHubu. Kdor bi prevzel GitHub račun z
dostopom do repozitorija, bi lahko podpisal posodobitev. Zato naj ima račun
vklopljeno dvostopenjsko prijavo. Secret lahko kadarkoli izbrišeš v istem meniju.

### Objava

GitHub → Actions → **Android release** → Run workflow → `version` (npr. `1.5.0`).
Z `dry_run` se preveri vse do prevajanja, brez ključa in brez objave. Verzija v
kodi (`package.json`, `APP_VERSION`, `build.gradle` versionName in versionCode)
in `RELEASE_NOTES_<verzija>.md` morata biti pripravljena na `main` že pred zagonom.
