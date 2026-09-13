# Workout Tracker 1.3.1 — dejanski Compact Gym v3

Ta izdaja zamenja izvedbo vmesnika iz 1.3.0. Postavitev glavnih zaslonov sledi potrjenemu HTML-predogledu: novi zasloni imajo lasten izris in so izolirani od starih slogov.

## Vmesnik

- Trening: zgoščen seznam vaj, ena odprta vaja, manjša vnosna polja in gumb za zapis ob oznaki serije.
- Fokus: isti kompaktni vnos, brez gumba za zaključek celotnega treninga. Navigacija in statusne oznake sta pod vajo, brez odrezanega obroča.
- Program: pregledne vrstice, dnevni zavihki samo za aktivne dneve, ločen dostop do neaktivnih dni. Dodajanje in urejanje uporabljata okna v ospredju.
- Napredek: ločeni Moč, Teža in Zgodovina. Moč prikazuje aktivne vaje in dejansko zabeležene kilograme; graf poveže z izbranim starim treningom.
- Nastavitve: preprost seznam za fazo, opremo, program, zgodovino, kopije in dodatna orodja. Brez vrnitve na stari zaslon nastavitev.

## Delovanje

- Načrtovanje kilogramov in ponovitev za posamezno serijo ter dodajanje več serij v fokusu in običajnem treningu.
- Opravljene serije je mogoče popraviti; načrtovanje jih ne označi kot opravljene in ne izbriše že zapisanih.
- Statusi so stalni: rdeče še brez serij, modro delno, zeleno in kljukica opravljeno.
- Koledar ima barve in imena treningov. Urejanje izbira datum, trening, vajo in točno serijo; na voljo so iskanje vseh virov, sumljivi PR-ji in razveljavitev zgodovinskega popravka.
- Počitek je nastavljiv v fokusu. Po izteku se prikaz umakne. Zaključek treninga odpre novi koledar, obnova nedokončanega treninga uporablja novo okno.
- Cut/Bulk ne menja seznama vaj in ne vklaplja 5/3/1. Manjkajoči datum začetka faze je mogoče določiti v nastavitvah.
- Gym-fire Android ikona z ročko ostaja vključena.

## Namestitev

Prenesi APK te izdaje, ga odpri in izberi **Posodobi**. Aplikacije ne odstranjuj in ne briši njenih podatkov. Priporočen je zunanji JSON backup.

Paket: `com.kemal.workouttracker` · versionCode: **68** · ista podatkovna shramba, brez uvoza vzorčnih podatkov iz predogleda.
