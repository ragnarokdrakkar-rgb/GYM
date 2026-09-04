# Workout Tracker 1.0.49

## Glavne spremembe

- Cut in Bulk sta ločeni fazi istega programa. Preklop ne zamenja več vaj, vrstnega reda ali zgodovine.
- Ob prvi nadgradnji se obstoječi prilagojeni seznam vaj varno preseli v skupni program. Stari Cut/Bulk seznami ostanejo ohranjeni kot rezerva.
- Bulk uporablja jasen štiritedenski načrt za rast: osnova, volumen, napredek in deload.
- 5/3/1 ni več samodejno vezan na Bulk. V Program builderju ga lahko vključiš samo na želeni glavni vaji.
- Backup shema 7 shrani skupni seznam vaj, skupne programske dneve, aktivno fazo in nastavitve 5/3/1.
- Prenovljen crisp mobilni UI z jasno Cut/Bulk kartico, večjimi kontrolami in mirnejšo hierarhijo kartic.
- Izračun plošč ostaja mogoče vklopiti ali izklopiti za posamezno vajo.

## Varnost podatkov

- Nadgradnja ne briše starih profilnih seznamov vaj.
- Migracija pri izbiri izvornega seznama upošteva prilagoditve in imena že shranjenih setov.
- Dodani so regresijski testi za ločitev faze, ohranitev vaj, opcijski 5/3/1 in backup shemo 7.

## Namestitev

Prenesi `Workout-Tracker-v1.0.49.apk` in ga namesti čez obstoječo različico. Android `versionCode` je 57.
