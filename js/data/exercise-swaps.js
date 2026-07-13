const SWAPS_DB={
  "Barbell bench press":[
    {n:"Dumbbell bench press",note:"Večji razpon gibanja, boljši razteg prsi"},
    {n:"Machine chest press",note:"Varen, dobro za utrujene sklepe"},
    {n:"Push-ups weighted",note:"Dodaj utežni pas ali ploščo na hrbet"},
    {n:"Smith machine bench",note:"Dober za vadbo brez spotter-ja"}
  ],
  "Incline dumbbell press":[
    {n:"Incline barbell press",note:"Bolj stabilno, večja obremenitev"},
    {n:"Cable incline fly",note:"Konstanten pritisk skozi cel gibalni razpon"},
    {n:"Smith machine incline",note:"Varen brez spotter-ja"}
  ],
  "Cable chest fly":[
    {n:"Pec deck machine",note:"Izolacija, manj obremenitve sklepov"},
    {n:"Dumbbell fly",note:"Globok razteg na klopi"},
    {n:"Resistance band fly",note:"Doma ali ko je kabel zaseden"}
  ],
  "Seated DB shoulder press":[
    {n:"Barbell overhead press",note:"Večja obremenitev, zahteva stabilizacijo"},
    {n:"Machine shoulder press",note:"Varen, primeren za visok rep range"},
    {n:"Arnold press",note:"Zadene vse tri glave deltoida"}
  ],
  "Lateral raises":[
    {n:"Cable lateral raise",note:"Konstanten pritisk pri spodnji poziciji"},
    {n:"Machine lateral raise",note:"Bolj izoliran, manj kvaranja"},
    {n:"Leaning cable lateral",note:"Boljši razteg glave deltoida"}
  ],
  "Tricep pushdown — rope":[
    {n:"Skull crushers",note:"Dober za dolgo glavo tricepsa"},
    {n:"Dips bodyweight",note:"Compound gibanje, dodaj utež če prelahko"},
    {n:"Overhead tricep extension",note:"Edina vaja ki popolnoma raztegne dolgo glavo"}
  ],
  "Weighted pull-ups":[
    {n:"Lat pulldown",note:"Isti vzorec gibanja, nastavljiva teža"},
    {n:"Assisted pull-up machine",note:"Ko so pull-upi prezahtevni"},
    {n:"Band-assisted pull-ups",note:"Naravnejše kot asistirana naprava"}
  ],
  "Barbell row":[
    {n:"Chest supported DB row",note:"Odstrani momentum, izolira hrbet"},
    {n:"Cable row",note:"Konstanten pritisk skozi cel razpon"},
    {n:"T-bar row",note:"Alternativa z večjo obremenitvijo"}
  ],
  "Seated cable row":[
    {n:"DB row",note:"Unilateralno — popravlja neravnovesje"},
    {n:"Machine row",note:"Enostavno nastavljiva teža"},
    {n:"Resistance band row",note:"Doma ali ko je kabel zaseden"}
  ],
  "Face pulls":[
    {n:"Reverse fly machine",note:"Isti mišici, stabilnejši položaj"},
    {n:"Band face pull",note:"Poceni alternativa brez kabla"},
    {n:"Rear delt DB fly",note:"Uleži se na klopco za čisto izolacijo"}
  ],
  "Barbell curl":[
    {n:"Dumbbell curl",note:"Neodvisno gibanje vsake roke"},
    {n:"Cable curl",note:"Konstanten pritisk, dober na koncu treninga"},
    {n:"EZ bar curl",note:"Manj stresa na zapestja"}
  ],
  "Hammer curl":[
    {n:"Cross-body curl",note:"Različen kot — bolj izolira brachialis"},
    {n:"Rope cable curl",note:"Konstanten pritisk"},
    {n:"Neutral grip DB curl",note:"Enako kot hammer, isti prijem"}
  ],
  "Barbell squat":[
    {n:"Leg press",note:"Ko je hrbet utrujen ali boli koleno"},
    {n:"Goblet squat",note:"Dober za tehniko in mobilnost"},
    {n:"Smith machine squat",note:"Varen brez spotter-ja"}
  ],
  "Romanian deadlift":[
    {n:"Leg curl seated",note:"Čista izolacija hamstringov"},
    {n:"Good mornings",note:"Podoben vzorec, bolj spodnji hrbet"},
    {n:"Single-leg RDL",note:"Unilateralno, popravlja neravnovesje"}
  ],
  "Leg press":[
    {n:"Hack squat",note:"Bolj kvadricepsi, manj spodnjega hrbta"},
    {n:"Belt squat",note:"Popolnoma brez obremenitve hrbta"},
    {n:"Leg extension superset",note:"Kombiniraj za burnout"}
  ],
  "Leg curl — seated":[
    {n:"Lying leg curl",note:"Bolj izoliran položaj"},
    {n:"Nordic hamstring curl",note:"Ekscentrično, zelo učinkovito"},
    {n:"Single-leg curl",note:"Popravlja asimetrijo"}
  ],
  "Leg extension":[
    {n:"Terminal knee extension",note:"Z elastiko, manj stresa na koleno"},
    {n:"Step-ups",note:"Funkcionalno, dobro za enojno nogo"},
    {n:"Bulgarian split squat",note:"Odlično za noge + ravnotežje"}
  ],
  "Standing calf raise":[
    {n:"Seated calf raise",note:"Bolj izolira soleus mišico"},
    {n:"Leg press calf raise",note:"Visoka obremenitev, manj ravnotežja"},
    {n:"Single-leg calf raise",note:"Popravlja asimetrijo"}
  ],
  "Overhead press — barbell":[
    {n:"Dumbbell shoulder press",note:"Večji razpon gibanja"},
    {n:"Smith machine OHP",note:"Varen brez spotter-ja"},
    {n:"Seated machine press",note:"Varen, dober za visok rep range"}
  ],
  "Dumbbell bench press":[
    {n:"Barbell bench press",note:"Večja obremenitev"},
    {n:"Cable fly",note:"Konstanten pritisk"},
    {n:"Machine press",note:"Varen in stabilen"}
  ],
  "Arnold press":[
    {n:"Seated DB press",note:"Enostavnejša različica"},
    {n:"Landmine press",note:"Prijazen do ramen, dober kot zamenjava"},
    {n:"Cable shoulder press",note:"Konstanten pritisk"}
  ],
  "Cable lateral raise":[
    {n:"DB lateral raise",note:"Klasika, vsepovsod dostopno"},
    {n:"Machine lateral",note:"Boljša izolacija kot kabel"},
    {n:"Upright row light",note:"Zadene tudi trapez"}
  ],
  "Weighted dips":[
    {n:"Close grip bench",note:"Bolj prsni in tricepsi"},
    {n:"Diamond push-ups",note:"Brez opreme"},
    {n:"Tricep machine press",note:"Izoliran pritisk"}
  ],
  "Overhead tricep extension":[
    {n:"Skull crushers",note:"Klasika za dolgo glavo"},
    {n:"Cable overhead ext",note:"Konstanten pritisk"},
    {n:"Single-arm DB ext",note:"Unilateralno — popravlja neravnovesje"}
  ],
  "Deadlift":[
    {n:"Trap bar deadlift",note:"Manj stresa na spodnji hrbet"},
    {n:"Rack pull",note:"Krajši razpon — bolj hrbet kot noge"},
    {n:"Romanian deadlift",note:"Manj obremenitve CNS"}
  ],
  "Single-arm DB row":[
    {n:"Cable row",note:"Konstanten pritisk"},
    {n:"Machine row",note:"Stabilen, enostavna nastavitev"},
    {n:"Chest supported row",note:"Odstrani momentum"}
  ],
  "Lat pulldown — close grip":[
    {n:"Wide grip pulldown",note:"Bolj širina hrbta"},
    {n:"Straight arm pulldown",note:"Izolira lat, ne biceps"},
    {n:"Cable pull-over",note:"Odličen razteg lata"}
  ],
  "Reverse fly — machine":[
    {n:"Face pulls",note:"Zadene zadnji deltoid in mišice manšete"},
    {n:"Bent over DB fly",note:"Brez naprave"},
    {n:"Band pull-apart",note:"Enostavno in poceni"}
  ],
  "Incline dumbbell curl":[
    {n:"Preacher curl",note:"Podoben razteg bicepsa"},
    {n:"Cable curl",note:"Konstanten pritisk"},
    {n:"Spider curl",note:"Ekscentrično — odličen peak"}
  ],
  "Cable curl 21s":[
    {n:"DB 21s",note:"Enako z dumbbells brez kabla"},
    {n:"Barbell curl drop set",note:"3 težje, potem drop"},
    {n:"Concentration curl",note:"Izolacija, odličen peak stisnjanje"}
  ]
};
