const PROG_CUT={
  weeks:[
    {reps:"5–8",rpe:"RPE 7–8",sM:5,sA:4,pill:"bl",rb:"rh",dl:false},
    {reps:"6–8",rpe:"RPE 7–8",sM:4,sA:4,pill:"gr",rb:"rm",dl:false},
    {reps:"8–10",rpe:"RPE 7",sM:4,sA:4,pill:"am",rb:"rl",dl:false},
    {reps:"8–10",rpe:"RPE 5",sM:3,sA:3,pill:"gr",rb:"rl",dl:true}
  ],
  days:[
    {title:"Push A — prsa",sub:"Prsa · ramena · tricepsi",tags:[{t:"Prsa",p:1},{t:"Ramena",p:0},{t:"Tricepsi",p:0}],ex:[
      {n:"Barbell bench press",m:1,r:REST_T.main,rl:"3 min",d:"Kontrolirana izvedba. Napor prilagodi današnjemu ciljnemu RPE; ne sili do odpovedi.",tip:""},
      {n:"Incline dumbbell press",m:0,r:REST_T.acc,rl:"90s",d:"30–45° naklon. Polni razteg na dnu.",tip:""},
      {n:"Cable chest fly",m:0,r:REST_T.iso,rl:"60s",d:"Izolacija. Lahka teža, močan stisk.",tip:""},
      {n:"Seated DB shoulder press",m:0,r:REST_T.acc,rl:"90s",d:"Polni razpon nad glavo.",tip:""},
      {n:"Lateral raises",m:0,r:REST_T.lat,rl:"45s",d:"Stroga tehnika, rahlo upognjen komolec.",tip:""},
      {n:"Tricep pushdown — rope",m:0,r:REST_T.iso,rl:"60s",d:"Komolci prikovani. Razširi vrv na dnu.",tip:""},
    ]},
    {title:"Pull A — širina hrbta",sub:"Hrbet · bicepsi · zadnji deltoid",tags:[{t:"Hrbet",p:1},{t:"Bicepsi",p:0},{t:"Zadnji deltoid",p:0}],ex:[
      {n:"Weighted pull-ups",m:1,r:REST_T.main,rl:"3 min",d:"Polni visok, brada nad palico. Dodaj utež.",tip:""},
      {n:"Barbell row",m:1,r:REST_T.main,rl:"3 min",d:"Nadprijemni prijem. Vleči k spodnjim prsim.",tip:""},
      {n:"Seated cable row",m:0,r:REST_T.acc,rl:"90s",d:"Komolci blizu, stisni lopatice na koncu.",tip:""},
      {n:"Face pulls",m:0,r:REST_T.iso,rl:"60s",d:"Kabel v višini glave, vleči k ušesom.",tip:""},
      {n:"Barbell curl",m:0,r:REST_T.iso,rl:"60s",d:"Polni razpon, kontroliran spust.",tip:""},
      {n:"Hammer curl",m:0,r:REST_T.iso,rl:"60s",d:"Nevtralni prijem, debelina rok.",tip:""},
    ]},
    {title:"Noge — celo spodnje telo",sub:"Kvadricepsi · hamstringi · gluteusi · mečni",tags:[{t:"Kvadricepsi",p:1},{t:"Hamstringi",p:1},{t:"Gluteusi",p:0},{t:"Mečni",p:0}],ex:[
      {n:"Barbell squat",m:1,r:REST_T.main,rl:"3 min",d:"Stabilen trup in nadzorovan razpon. Breme prilagodi svoji izvedbi in ciljnemu naporu.",tip:""},
      {n:"Romanian deadlift",m:1,r:REST_T.main,rl:"3 min",d:"Hamstringi in gluteusi. Čuti razteg, ne upogibaj spodnjega hrbta.",tip:""},
      {n:"Leg press",m:0,r:REST_T.acc,rl:"90s",d:"Nadzorovan razpon brez dvigovanja medenice. Upoštevaj ciljne ponovitve in RPE.",tip:""},
      {n:"Leg curl — seated",m:0,r:REST_T.iso,rl:"60s",d:"Polni razpon. Počasen 3s spust.",tip:""},
      {n:"Leg extension",m:0,r:REST_T.iso,rl:"60s",d:"Izolacija kvadricepsov. Stisni 1s zgoraj.",tip:""},
      {n:"Standing calf raise",m:0,r:REST_T.lat,rl:"45s",d:"Polni razteg na dnu, zadrži 1s zgoraj.",tip:""},
    ]},
    {title:"Push B — ramena",sub:"Ramena · prsa · tricepsi",tags:[{t:"Ramena",p:1},{t:"Prsa",p:0},{t:"Tricepsi",p:0}],ex:[
      {n:"Overhead press — barbell",m:1,r:REST_T.main,rl:"3 min",d:"Glavni dvig za rame. Polna zaklenitev.",tip:"Gluteusi stisnjeni zgoraj."},
      {n:"Dumbbell bench press",m:0,r:REST_T.acc,rl:"90s",d:"Večji razpon kot palica. Globok razteg.",tip:""},
      {n:"Arnold press",m:0,r:REST_T.acc,rl:"90s",d:"Vse tri glave deltoida. Zavrti dlani.",tip:""},
      {n:"Cable lateral raise",m:0,r:REST_T.lat,rl:"45s",d:"Kabel ohranja pritisk spodaj.",tip:""},
      {n:"Weighted dips",m:0,r:REST_T.acc,rl:"90s",d:"Nadzorovana izvedba v nebolečem razponu. Dodatno breme izberi glede na cilj ponovitev in napora.",tip:""},
      {n:"Overhead tricep extension",m:0,r:REST_T.iso,rl:"60s",d:"Samo dolga glava raztegnjena nad glavo.",tip:""},
    ]},
    {title:"Pull B — hrbet + noge",sub:"Hrbet · noge · bicepsi",tags:[{t:"Hrbet",p:1},{t:"Kvadricepsi",p:1},{t:"Bicepsi",p:0}],ex:[
      {n:"Deadlift",m:1,r:REST_T.main,rl:"3 min",d:"Glavni dvig za zadnjo verigo. Nevtralen hrbet, drive skozi pete.",tip:"Reset med ponovitvami — brez bounce."},
      {n:"Single-arm DB row",m:0,r:REST_T.acc,rl:"90s",d:"Unilateralno — odpravlja neravnovesje.",tip:""},
      {n:"Lat pulldown — close grip",m:0,r:REST_T.acc,rl:"90s",d:"Nevtralni prijem. Komolci dol k bokom.",tip:""},
      {n:"Reverse fly — machine",m:0,r:REST_T.iso,rl:"60s",d:"Zadnji deltoid izolacija. Lahka, stroga tehnika.",tip:""},
      {n:"Incline dumbbell curl",m:0,r:REST_T.iso,rl:"60s",d:"Raztegne biceps na dnu.",tip:""},
      {n:"Leg press",m:0,r:REST_T.acc,rl:"2 min",d:"2. dan za noge ta teden (2 dni po Nogah). Kvadricepsi — ohranjanje mase med cutom.",tip:"Stopala v sredini platforme."},
      {n:"Leg extension",m:0,r:REST_T.iso,rl:"60s",d:"Kvadricepsi izolacija. Močan stisk na vrhu.",tip:""},
    ]},
  ]
};

// ============== BULK PROGRAM (5/3/1 BBB) ==============
// Tedni ustrezajo 5/3/1 ciklu: 5s / 3s / 531 / deload
// fl=glavni 531 dvig (uporablja TM), bbb=BBB 5×10 dodatek
const W531=[
  {pct:[0.65,0.75,0.85],reps:["5","5","5+"]},   // teden 1: 5s
  {pct:[0.70,0.80,0.90],reps:["3","3","3+"]},   // teden 2: 3s
  {pct:[0.75,0.85,0.95],reps:["5","3","1+"]},   // teden 3: 531
  {pct:[0.40,0.50,0.60],reps:["5","5","5"]}     // teden 4: deload
];
const PROG_BULK={
  is531:true,
  weeks:[
    {reps:"5/3/1",rpe:"5s teden",sM:3,sA:4,pill:"bl",rb:"rh",dl:false,label:"5s"},
    {reps:"5/3/1",rpe:"3s teden",sM:3,sA:4,pill:"gr",rb:"rm",dl:false,label:"3s"},
    {reps:"5/3/1",rpe:"531 teden",sM:3,sA:4,pill:"am",rb:"rh",dl:false,label:"531"},
    {reps:"deload",rpe:"Deload",sM:3,sA:3,pill:"gr",rb:"rl",dl:true,label:"deload"}
  ],
  days:[
    {title:"Push A — Bench 5/3/1",sub:"Prsa · tricepsi · rame",tags:[{t:"Prsa",p:1},{t:"Tricepsi",p:0},{t:"Ramena",p:0}],ex:[
      {n:"Barbell bench press",m:1,fl:"bench",r:REST_T.main,rl:"3 min",d:"Glavni 5/3/1 dvig. Zadnji set max ponovitev (+).",tip:"Lopatice nazaj, noge v tla."},
      {n:"Barbell bench press — BBB",m:0,bbb:"bench",r:REST_T.acc,rl:"90s",d:"5×10 pri ~50% TM. Volumen za hipertrofijo.",tip:""},
      {n:"Incline dumbbell press",m:0,r:REST_T.acc,rl:"90s",d:"30–45° naklon. 3×10.",tip:""},
      {n:"Lateral raises",m:0,r:REST_T.lat,rl:"45s",d:"3×12-15. Stroga tehnika.",tip:""},
      {n:"Tricep pushdown — rope",m:0,r:REST_T.iso,rl:"60s",d:"3×12. Komolci prikovani.",tip:""},
    ]},
    {title:"Pull A — širina hrbta",sub:"Hrbet · bicepsi",tags:[{t:"Hrbet",p:1},{t:"Bicepsi",p:0}],ex:[
      {n:"Weighted pull-ups",m:1,r:REST_T.main,rl:"3 min",d:"4×8-10. Dodaj utež.",tip:""},
      {n:"Barbell row",m:1,r:REST_T.main,rl:"3 min",d:"4×8-10. Vleči k spodnjim prsim.",tip:""},
      {n:"Seated cable row",m:0,r:REST_T.acc,rl:"90s",d:"3×10. Stisni lopatice.",tip:""},
      {n:"Face pulls",m:0,r:REST_T.iso,rl:"60s",d:"3×15. Zdravje ramen.",tip:""},
      {n:"Barbell curl",m:0,r:REST_T.iso,rl:"60s",d:"3×12.",tip:""},
      {n:"Hammer curl",m:0,r:REST_T.iso,rl:"60s",d:"3×12. Debelina rok.",tip:""},
    ]},
    {title:"Noge — Squat 5/3/1",sub:"Kvadricepsi · hamstringi · gluteusi",tags:[{t:"Kvadricepsi",p:1},{t:"Hamstringi",p:1},{t:"Gluteusi",p:0}],ex:[
      {n:"Barbell squat",m:1,fl:"squat",r:REST_T.main,rl:"3 min",d:"Glavni 5/3/1 dvig. Globina pod vzporedno.",tip:"Trd trup, kolena ven."},
      {n:"Barbell squat — BBB",m:0,bbb:"squat",r:REST_T.acc,rl:"90s",d:"5×10 pri ~50% TM.",tip:""},
      {n:"Romanian deadlift",m:1,r:REST_T.acc,rl:"90s",d:"3×10. Hamstringi/gluteusi.",tip:""},
      {n:"Leg curl — seated",m:0,r:REST_T.iso,rl:"60s",d:"3×12.",tip:""},
      {n:"Leg extension",m:0,r:REST_T.iso,rl:"60s",d:"3×12.",tip:""},
      {n:"Standing calf raise",m:0,r:REST_T.lat,rl:"45s",d:"4×15.",tip:""},
    ]},
    {title:"Push B — OHP 5/3/1",sub:"Ramena · prsa · tricepsi",tags:[{t:"Ramena",p:1},{t:"Prsa",p:0},{t:"Tricepsi",p:0}],ex:[
      {n:"Overhead press — barbell",m:1,fl:"ohp",r:REST_T.main,rl:"3 min",d:"Glavni 5/3/1 dvig. Polna zaklenitev.",tip:"Gluteusi stisnjeni."},
      {n:"Overhead press — BBB",m:0,bbb:"ohp",r:REST_T.acc,rl:"90s",d:"5×10 pri ~50% TM.",tip:""},
      {n:"Incline dumbbell press",m:0,r:REST_T.acc,rl:"90s",d:"3×10.",tip:""},
      {n:"Lateral raises",m:0,r:REST_T.lat,rl:"45s",d:"3×15.",tip:""},
      {n:"Overhead tricep extension",m:0,r:REST_T.iso,rl:"60s",d:"3×12.",tip:""},
    ]},
    {title:"Pull B — Deadlift 5/3/1",sub:"Hrbet · hamstringi · bicepsi",tags:[{t:"Hrbet",p:1},{t:"Hamstringi",p:0},{t:"Bicepsi",p:0}],ex:[
      {n:"Deadlift",m:1,fl:"deadlift",r:REST_T.main,rl:"3 min",d:"Glavni 5/3/1 dvig. Nevtralni hrbet.",tip:"Palica ob telesu, potisni v tla."},
      {n:"Deadlift — BBB",m:0,bbb:"deadlift",bbbSets:5,bbbReps:5,r:REST_T.acc,rl:"2 min",d:"5×5 pri ~50% TM (deadlift BBB je 5×5, ne 5×10).",tip:""},
      {n:"Lat pulldown — close grip",m:0,r:REST_T.acc,rl:"90s",d:"3×10.",tip:""},
      {n:"Single-arm DB row",m:0,r:REST_T.acc,rl:"90s",d:"3×10. Unilateralno.",tip:""},
      {n:"Reverse fly — machine",m:0,r:REST_T.iso,rl:"60s",d:"3×15. Zadnji deltoid.",tip:""},
      {n:"Cable curl 21s",m:0,r:REST_T.iso,rl:"60s",d:"3× (7+7+7).",tip:""},
    ]}
  ]
};
