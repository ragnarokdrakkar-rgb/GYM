# Workout Tracker 1.2.3 — Program, odmor in trend teže

- Okni »Izberi vajo« in »Ustvari novo vajo« sta pred Program builderjem, ne skriti za njim. Odpravljena podvojena sprožitev prek fokusa; gumb jasno odpre izbiro in dodajanje.
- Nova vaja in njen vnos v dan se shranita skupaj. Ob neuspelem shranjevanju ostane okno odprto brez lažnega sporočila o uspehu. Obstoječa vaja se ne doda dvakrat.
- Podvajanje dneva shrani podatke dneva in kopije vaj skupaj. Glavni Program se po zaprtju urejevalnika osveži takoj.
- Odmor v fokusu: »KONEC« se samodejno umakne po približno 2,5 sekunde tudi po ustavitvi intervala ali vrnitvi v aplikacijo. Gumb × zapre tudi že končan odmor.
- Trend teže: večji graf, izbor 30 / 90 dni / vse, redkejše vodoravne oznake datumov, razločna dnevna meritev / 7-dnevni trend / cilj, večji tooltip z datumom in kg.
- Oddaljeni cilj ne stisne meritev v ravno črto; cilj zunaj območja ostane jasno zapisan nad grafom. Celotna zgodovina ostaja shranjena, fazni izračuni Cut/Bulk so nespremenjeni.

Android versionCode 66. Posodobite obstoječo aplikacijo, ne odstranjujte je. Pred posodobitvijo priporočamo izvoz backupa.

Preverjeno z avtomatiziranimi testi in lokalnim UI preizkusom. Obnašanje na fizičnem telefonu, sistemske prekinitve in tipkovnico je treba potrditi na napravi.
