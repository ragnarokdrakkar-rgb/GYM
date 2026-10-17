# Za naslednji popravek (po 1.6.2)

Zabeleženo iz uporabe na telefonu; še ni programirano.

## 1. Fokus: pike vaj na dnu se pri 8+ vajah prelomijo in odrežejo

**Simptom (posnetek 17. 10., dan Noge, 8 vaj):** v spodnjem pasu Fokusa so pike 1–7 v eni vrstici,
pika 8 pade v drugo vrstico in jo spodnji rob odreže. Pojavi se takoj, ko ima dan 8 ali več vaj
(zdaj lažje, ker vajo lahko dodaš med treningom).

**Vzrok:** `#cg-app .cg-focus-steps` je mreža `52px 1fr 52px`; `.cg-dots` ima `flex-wrap:wrap`,
pike so fiksnih `30px` z razmikom `6px`. Na 412 px širokem zaslonu ostane srednjemu stolpcu
približno 270 px, kar zadošča za 7 pik (7×30 + 6×6 = 246 px), ne pa za 8 (282 px). Spodnji pas
Fokusa ima fiksno višino (`#cg-app[data-focus] .cg-focus-steps` v nepomičnem območju), zato je
druga vrstica odrezana. Glej `css/compact-v4.css` vrstice 179–184 in `focusSteps()` v
`js/compact-shell.js`.

**Predlog popravka (izberi enega, prvi je najpreprostejši):**
1. Brez preloma in samodejno manjše pike: `.cg-dots{flex-wrap:nowrap;}` in
   `.cg-dots button{width:clamp(22px,calc((100% - 9*4px)/10),30px);…}` ali razred
   `cg-dots-dense` iz `focusSteps()`, ko je vaj več kot 7 (26 px pike, 4 px razmik; pri 10+ vajah
   24 px). Do 10 vaj mora iti v eno vrstico tudi na 360 px širokem zaslonu.
2. Vodoravno drsenje: `.cg-dots{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}` in po
   vsakem renderju aktivno piko pomakni v vidno polje (`scrollIntoView({inline:'center'})`).
3. Pri 11+ vajah namesto pik pokaži števec »vaja 2/11« z napredkom (že obstaja v glavi), pike skrij.

**Preverjanje:** Playwright na Pixel 7 in na 360 px širini z dnevom, ki ima 8 in 10 vaj: vse pike v
eni vrstici, nobena odrezana (`boundingBox` vsake pike znotraj `.cg-focus-steps`), aktivna pika vidna.
Test v `tests/focus-options.test.js` ali novem `tests/focus-steps.test.js`.

## 2. Manjše, opaženo na istem posnetku

- Obvestilo »Serija zabeležena.« prekrije vrstico »+ Serija · − Zadnja serija«. Obvestilo je pri
  `bottom:calc(96px + env(safe-area-inset-bottom))`; ko so pike v dveh vrsticah, je pas višji in
  obvestilo pade na vsebino. S popravkom št. 1 to večinoma izgine; sicer obvestilo premakni nad pas
  glede na dejansko višino pasu (`--cg-steps-h` iz `ResizeObserver`).
