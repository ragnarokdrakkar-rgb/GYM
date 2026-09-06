# Workout Tracker 1.1.2 — popravek backupa

- Odpravljena napaka »Backup ni bil shranjen: Polje sugs mora biti objekt.« Predlogi naslednjega cikla se pravilno sprejmejo kot seznam; stare kopije z objektno obliko ostanejo združljive.
- Izvoz in obnova ohranita predloge, serije in zgodovino. Ni migracije ali brisanja podatkov.
- Dodani regresijski testi za izvoz, obnovo, stare kopije in neuspešno shranjevanje datoteke. Varnostna validacija ostaja vključena.

Podpisani APK uporablja isti paket `com.kemal.workouttracker`, različico `1.1.2` in versionCode `61`.

Namesti kot **Posodobi**. Stare aplikacije ne odstranjuj in ne briši njenih podatkov. Po nadgradnji znova izvozi JSON varnostno kopijo. Če izvoz v stari izdaji odpove s to napako, ohrani obstoječe podatke in lokalne posnetke.

Testiranje na fizičnem telefonu ni bilo opravljeno.

Vseh 66 avtomatiziranih testov, statični pregled kode ter Source in Android Release Guard so uspešni.

SHA-256 APK: `b509cf51a52bf52be541739e9f6f92183b305a9adc05bbc295fd3ff939d6449a`
