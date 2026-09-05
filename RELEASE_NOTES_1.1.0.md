# Workout Tracker 1.1.0 — Redline

## UI in trening

- Nova črna/rdeča/oranžna struktura: Trening / Program / Napredek / Nastavitve.
- Cut/Bulk samo v Nastavitvah, s predogledom tedenskih ciljev; brez menjave izbranih vaj in brez samodejnega 5/3/1.
- Enoten vnos kg/ponovitev/ročnega RPE; opravljene serije v ločenem pregledu.
- Fokus, stanje vaj, odmor in povzetek zaključenega treninga.
- Razlaga predlogov bremena na dotik. Povečanje zahteva dosežen cilj v vseh delovnih setih in vnesen RPE.
- Vrsta bremena pri vaji: skupno breme, ročka, dodatna lastna teža ali asistenca.
- TM se shrani neposredno in se ob ponovnem shranjevanju ne zmanjša.

## Podatki

- Vidna napaka ob neuspešnem shranjevanju, ponovni poskus in izvoz neshranjenih vnosov iz pomnilnika.
- Zaključevanje treninga in uvoz uporabljata obnovitveni dnevnik; neuspešen zaključek ne odstrani aktivnega treninga.
- Strožja validacija kopij; pri združevanju imajo trenutni konfliktni zapisi prednost.
- Nova izvedba istega dne ohrani prejšnji zaključeni trening. Graf e1RM bere zaklenjene zgodovinske posnetke.

## Preverjanje

- 41 avtomatiziranih testov in statični pregled kode.
- Source in Android Release Guard.
- Mobilni brskalniški potek: preklop faze, zapis seta, odmor, ponovno odprtje, obnova treninga in zaključni povzetek.
- Podpisana Android sestava: paket `com.kemal.workouttracker`, versionCode 59.

Telefon ni bil priključen: nadgradnja na fizični napravi, Android tipkovnica in alarm pri zaklenjenem zaslonu še niso potrjeni. Obvestila so odvisna tudi od dovoljenj in nastavitev baterije.

## Namestitev

Najprej izvozi JSON backup iz stare aplikacije. Prenesi APK in izberi **Posodobi**. Stare aplikacije ne odstranjuj in ne briši njenih podatkov. Lokalni snapshot ni nadomestilo za zunanji backup.
