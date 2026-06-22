# Fázis 6 – Feature log

> Részletes, kronologikus összefoglaló **a teljes Fázis 6 munkamenetről**, a kickoff-dokumentum (`viki-vendeghaz-fazis6-arazas-kickoff.md`) beolvasásától és az árazási szabály-motor első sorának megírásától egészen a legutóbbi admin-finomításokig – nem csak az utolsó néhány javítás. A `viki-vendeghaz-projektterv.md`-ben szereplő Fázis 6 eredeti scope-ja ("valós tartalom feltöltése") jelentősen kibővült egy teljes árazási szabály-motorral és admin-statisztikai felülettel.

---

## 1. Árazási szabály-motor

### 1.1 Adatmodell (`src/db/schema.ts`)

Új táblák, amik a korábbi egyetlen `rooms.priceFrom` mezőt váltják fel:

| Tábla | Szerep |
|---|---|
| `seasons` | Szezonok (nyár, tavasz, ősz, tél), hónap/nap tartománnyal **és kötelező évvel** (lásd 1.4) |
| `pricing_rules` | Ár-sorok: szezon × nap-típus (hétköznap/hétvége) × szoba-scope |
| `holiday_overrides` | Ünnepnapok/hosszú hétvégék, amik felülírják az adott napi szezon-árat |
| `holiday_prices` | Ünnepnaponkénti ár szoba-scope-onként |
| `pricing_settings` | Globális beállítások (előleg %, IFA, lemondási határidő, check-in/out idők) |
| `room_capacity_pricing` | Szoba-szintű alap-létszám és pótágy-felár (lásd 4. szakasz) |

A `roomScope` mező mindenhol szabad szöveg (`"szoba-1"`, `"szoba-2"`, `"superior"`, `"egesz_haz"`), nem idegenkulcs – az "egész ház" egy virtuális, nem a `rooms` táblában létező entitás.

### 1.2 Árkalkulátor (`src/lib/pricing.ts`)

Tiszta, DB-független TypeScript-függvények:
- `resolveRateForDate` – adott napra (szoba-scope szerint) megkeresi az érvényes árat: előbb ünnepnap, majd szezon alapján.
- `calculateBookingPrice` – check-in/check-out közti teljes ár, pótágy-felárral.
- `getMinStay` – minimum éjszaka-szabály (szezon/ünnep szerint, "egész ház 1 éj is OK" kivétellel nyáron).
- `isWholeHouseOnlyForDate` – "csak egész ház foglalható" napok azonosítása.
- `getLowestPriceForScope` – legalacsonyabb elérhető ár ("-tól" jelzéshez).

Seed script: `scripts/seed-pricing.mjs` (az eredeti árlista-dokumentum teljes adattartalmával).

### 1.3 Publikus oldal integráció

- **`/foglalas`**: dinamikus ár-kalkuláció valós időben a kiválasztott dátumokra; automatikus "csak egész ház" kényszerítés nyáron/Karácsonykor/Szilveszterkor (egyedi szoba-választás letiltva ilyenkor); "Egyedi ajánlat – hívjon" felirat Szilveszterre (nincs fix ár); minimum éjszaka-szabály dinamikusan.
- **`/szobak`**: a "-tól" ár a `pricing_rules`-ból számolt legalacsonyabb ár, nem statikus szám.

### 1.4 Szezonok – kötelező év (architektúra-módosítás útközben)

Eredetileg a szezonoknak volt egy "minden évben érvényes" (`year = null`) alapértelmezése, évre-specifikus felülírás lehetőségével. **Ezt a felhasználó kérésére leegyszerűsítettük**: a `year` mező mostantól **kötelező** minden szezon-soron, nincs "minden évre" eset – ez sokkal egyszerűbben érthető egy laikus admin-felhasználó számára. Ha jövőbeli évre kell ár, admin egy új sort vesz fel **ugyanazzal a névvel**, más évvel – ezek az Áttekintésben automatikusan egymás mellett, év szerint rendezve jelennek meg.

A téli szezon (november–március, évhatárt átlépő) speciális kezelést kapott a `pricing.ts`-ben: a "horgony év" számítás figyelembe veszi, hogy január-március a *megelőző* év téli szezonjához tartozik.

---

## 2. Wellness admin-szerkeszthetősége

### 2.1 Adatmodell

- `wellness_services` – szolgáltatásonként (sóbarlang, finn szauna, infraszauna, dézsafürdő, kert & medence): szállóvendég-ár, külsős-ár, nyitvatartás, megjegyzés.
- `wellness_price_tiers` – sóbarlang részletes tarifatáblázata (egyedi jegy + bérlet sorok).

### 2.2 Publikus oldalak

Mind az 5 wellness aloldal és a `/wellness` hub a hardkódolt JSX-tömbök helyett a fenti táblákból olvas.

### 2.3 Admin (`/admin/wellness`)

Szolgáltatásonkénti szerkesztő-form + sóbarlang tarifasor CRUD (hozzáadás/törlés).

**Hibajavítás**: a szolgáltatás-szerkesztő formban a "Megnevezés" mező eredetileg csak egy statikus `<h3>` volt, nem szerepelt a `<form>`-ban – emiatt mentéskor a hiányzó mező `"null"` szövegként került elmentésre (ezért jelent meg "null" a `/wellness` oldalon Sóbarlang és Finn szauna helyén). Javítva: a Megnevezés is valódi, szerkeszthető input mezővé vált; a hibás adatok javítva az adatbázisban.

---

## 3. Galéria és képek

- `/galeria` valós `gallery` táblából olvas, kategóriánként csoportosítva (korábban statikus "hamarosan" placeholder volt).
- Admin galéria-feltöltő (`/admin/galeria`) kategória-listája bővítve: külön kategória minden wellness aloldalhoz (finn-szauna, infraszauna, dezsafurdo, kert-medence), nem csak egy általános "wellness".
- `next.config.ts`: Vercel Blob (`*.public.blob.vercel-storage.com`) hozzáadva a megengedett kép-domainekhez, hogy a feltöltött képek valóban megjelenjenek.
- `/szobak` szoba-kártyák kép-területtel bővültek (Vercel Blob `gallery` kategória `szobak` alapján, placeholder ha nincs kép).
- Új `WellnessHeroImage` komponens: hero-kép terület minden wellness aloldal tetején.

---

## 4. Foglalási logika finomítások

### 4.1 Szoba-kapacitás és pótágy-felár

A `rooms.capacity` mező javítva a valós adatok szerint (korábban tévesen mindhárom szoba 2 fő volt beállítva):
- 1-es szoba: 3 fő (2 fő + 1 pótágy)
- 2-es szoba: 3 fő (2 fő + 1 pótágy)
- Superior: 4 fő (2 fő + 2 fő pótágy/kihúzható kanapé)

Új **szoba-szintű pótágy-felár** rendszer (`room_capacity_pricing` tábla, lásd 1.1): minden szoba-típushoz saját alap-létszám és pótágy-díj tartozik:
- 1-es/2-es szoba: 2 fő felett **+7 000 Ft/fő/éj**
- Superior: 2 fő felett **+8 000 Ft/fő/éj** (a 3. és 4. főre is)
- Egész ház: 10 fő felett **+7 000 Ft/fő/éj** (változatlan)

Ha valaki egyszerre **több egyedi szobát** foglal, a vendégek egyenlően kerülnek elosztásra a szobák közt, mindegyik a saját pótágy-díját számolva a rá eső részre.

A `/foglalas` oldalon a pótágy-felár összege külön sorban is megjelenik a végösszeg alatt.

### 4.2 Ár-megjelenítés időbeli egyértelműsítése

Korábbi probléma: a szoba-választó kártyák egy statikus `priceFrom` árat mutattak, ami megtévesztő lehetett (nem volt egyértelmű, melyik időszakra vonatkozik). Megoldás:
- Dátum-választás **előtt**: a legalacsonyabb elérhető ár ("-tól"), egy magyarázó szöveggel, hogy az ár szezontól/naptípustól függ.
- Dátum-választás **után**: a kártyák automatikusan a ténylegesen kiválasztott időszakra számolt árra váltanak ("X Ft/éj – a választott dátumra"), vagy "Egyedi ajánlat" / "Nem foglalható ekkor" jelzésre.

---

## 5. Admin "szoba CRUD" – tudatosan elvetve

Felmerült egy funkció-igény ("szobák hozzáadása/törlése adminból"), amihez best practice javaslatot adtam (deaktiválás `active=false` mezővel, vs. feltételes végleges törlés; "Egész ház" kapacitás automatikus újraszámítása). **A felhasználó úgy döntött, hogy ezt elvetjük** – a szobákat manuálisan, az adatbázisban viszi fel/kezeli az oldal építése során, nincs szükség admin-felületi szoba-kezelésre. Az alkalmazás kódja (RoomScope típus, ROOM_SCOPES listák) emiatt szándékosan **fix, 3+1 (szoba-1/szoba-2/superior/egesz_haz) listára** épül, nem dinamikus.

---

## 6. Admin Üzenetek – törlés funkció

Az `/admin/uzenetek` oldalon minden beérkező üzenethez (kapcsolat-form vagy foglalási kérés) **Törlés gomb** került, ami azonnal eltávolítja az üzenetet az adatbázisból.

---

## 7. Admin Statisztikák – új menüpont (`/admin/statisztikak`)

Teljesen új admin-oldal, `recharts` library-vel (újonnan hozzáadott függőség, React 19 + Next 16 kompatibilis).

### 7.1 Megjelenített grafikonok/KPI-k

1. **Idővonal-grafikon** – foglalási kérések és kapcsolatfelvételek száma időben.
2. **Szoba szerinti megoszlás** (kördiagram) – melyik szobát/kombinációt kérték a legtöbbször.
3. **Foglaltsági arány szobánként** (oszlopdiagram) – a naptár blokkolt napjai alapján, a kiválasztott időszakra.
4. **KPI-kártyák** – összes kérés száma, átlagos foglalt éjszaka, átlagos létszám.
5. **Előfutási idő hisztogram** – hány nappal érkezés előtt érkezik be a foglalási kérés.
6. **Kapcsolat vs. foglalási kérés arány** időben (ugyanaz az idővonal-grafikon, két adatsorral).
7. **Szezonalitás** (oszlopdiagram) – érkezési dátumok hónap szerinti eloszlása, évektől függetlenül.

Bevétel-alapú statisztika **tudatosan nincs benne** – jelenleg nincs ár/fizetés eltárolva foglalásonként, ez egy jövőbeli bővítési lehetőség.

### 7.2 Időszak-szűrés – három iteráció

A szűrő-UX a felhasználói visszajelzések alapján háromszor finomodott:

1. **1. verzió**: fix "Hét / Hónap / Év" váltó, mindig az "utolsó 12 hét/hónap/5 év" gördülő ablakkal.
2. **2. verzió**: minden nézethez natív dátumválasztó (`<input type="week">`, `type="month">`, év-mező), hogy *konkrét* hetet/hónapot/évet lehessen kiválasztani, ne csak a gördülő ablakot.
3. **3. (végleges) verzió**: a felhasználó kérésére **Google Ads-stílusú, szabad dátum-tartomány választó** – két dátummező ("Ettől"–"Eddig"), bármilyen tetszőleges intervallum (pl. "2 hét", "május–június"), plusz gyorsgombok (7 nap, 30 nap, Ez a hónap, Előző hónap, Ez az év). A grafikonok bontása (nap/hét/hónap/év) **automatikusan** igazodik a kiválasztott tartomány hosszához.

---

## 8. Egyéb apró javítások

- Dátum-formátum az `/admin/arazas` Áttekintésében `nap.hónap` helyett `hónap.nap` formátumra javítva (magyar olvasók számára kevésbé zavaró).
- Az `/admin/arazas` szezon-szerkesztőben az Év mező szabad szövegbeviteltől legördülő listára váltott (jelenlegi év körüli évek + a ténylegesen használt évek).
- `/admin/arazas` két fülre bontva: **Áttekintés** (csak-olvasható összefoglaló az összes beállításról egyben) és **Beállítások** (a tényleges szerkesztő-formok) – könnyebb átláthatóság.

### 8.1 Adatbázis seed/javító scriptek (`scripts/`)

A Fázis 6 során létrehozott, egyszeri lefuttatásra szánt scriptek:
- `seed-pricing.mjs` – a teljes szezon/ár/ünnepnap/wellness adatkészlet feltöltése a hiteles árlista-dokumentum alapján.
- `seed-room-capacity.mjs` – a `room_capacity_pricing` tábla feltöltése (alap-létszám + pótágy-díj szobánként).

(Néhány ideiglenes, egyszer használatos javító script – pl. a szezon-évek utólagos beállítása, a wellness "null" név hiba javítása, a szoba-kapacitások korrigálása – a feladat elvégzése után törlésre került, nincs a repóban.)

---

## Commit-történet (Fázis 6, kronologikusan)

| Commit | Üzenet |
|---|---|
| `2cea208` | feat: Fázis 6 – árazási szabály-motor, wellness/galéria admin |
| `b262390` | feat: szoba-szintű pótágy-felár (1-es/2-es szoba +7000 Ft, Superior +8000 Ft) |
| `2f60b79` | feat: üzenet törlése az admin felületről |
| `8d4d18e` | feat: admin Statisztikák oldal grafikonos foglalási adatokkal |
| `018e507` | feat: konkrét hét/hónap/év választó a Statisztikák oldalon |
| `39e0918` | feat: szabad dátum-tartomány választó a Statisztikák oldalon (Google Ads-stílus) |

---

## Új admin menüpontok összesen (Fázis 6 után)

```
Áttekintés · Szobák · Árazás · Wellness · Csomagok · Naptár ·
Statisztikák · Blog · GYIK · Galéria · Üzenetek
```

(Vastaggal a Fázis 6-ban újonnan hozzáadott menüpontok: **Árazás**, **Wellness**, **Statisztikák**.)
