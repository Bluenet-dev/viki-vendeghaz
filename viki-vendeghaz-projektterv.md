# Viki Vendégház – projektterv és fázisok

> Ez a dokumentum a vikivendeghaz.hu megújításának munkadokumentuma. Két célt szolgál:
> 1. **Áttekintő** – hol állunk, mi van eldöntve, mi van soron.
> 2. **Munkamód-referencia Claude számára** – ha ez bekerül a projekt instrukciói/tudásbázisa közé, egy új beszélgetés is innen tudja folytatni anélkül, hogy a kontextust újra el kellene magyarázni.
>
> A dokumentum élő: a fejlesztés közben felmerülő döntéseket/módosításokat ide kell visszaírni, hogy ne vesszen el a kontextus.

---

## 1. Projekt összefoglaló

- **Mi**: a vikivendeghaz.hu (Szilvásvárad, 3 szoba + sóbarlang + wellness) teljes megújítása új szerveren.
- **Tech stack**: Next.js (App Router) + Vercel, saját Postgres adatbázis (Neon vagy Vercel Postgres) + Drizzle ORM.
- **Admin/CMS**: egyedi, Next.js-be épített admin felület – cél, hogy egy laikus szállásadó is profin tudjon kezelni majdnem mindent (árak, szövegek, képek, blog, foglalási kérések, árajánlatok).
- **Foglalás/naptár**: saját, ingyenes megoldás, iCal-szinkronnal a Booking.com és Szállás.hu felé – **nincs fizetős havidíjas channel manager (Beds24/Lodgify kizárva)**.
- **Design-nyelv**: új, a mockuptól független vizuális identitás ("sóbarlang-fény" koncepció – részletek lent).
- **Forrásanyagok**: jelenlegi WordPress oldal (vikivendeghaz.hu) szövegei/képei, AI-mockup HTML (strukturális referencia), checklist-kép (funkció-lista), üzleti terv docx (piaci elemzés, SEO-prioritások, árstruktúra-javaslat).

---

## 2. Rögzített architektúra-döntések

### 2.1 Admin/CMS
- Egyedi admin (`/admin`, jelszavas session-auth – egyszemélyes vállalkozás, nem kell multi-user/role-rendszer).
- Adatmodell-entitások (Fázis 1-ben pontosítva):
  - **Szobák**: leírás, képek, "-tól" árak (marketing/SEO megjelenítéshez)
  - **Csomagok**: tartalom, ár, érvényesség, szezon
  - **Blog posztok**: cím, slug, tartalom, kép, kategória
  - **Galéria képek**: kategóriával (szobák, wellness, sóbarlang, udvar, természet)
  - **GYIK**: kérdés-válasz párok
  - **Árajánlat-sablonok + generátor**: szolgáltatás/csomag-választó → email küldés (Resend)
  - **Beérkező üzenetek**: kapcsolat-form + foglalási kérések, admin-inbox nézet
  - **Elérhetőség/naptár**: szobánként dátum-szintű foglalt/szabad állapot

### 2.2 Foglalás & naptár (iCal-alapú, ingyenes)
- Saját naptár-adatmodell szobánként (1-es, 2-es, Superior, + "egész ház" mint kombinált egység).
- Admin felület: kézi zárás/foglalás bevitel.
- **Export**: minden szobához egyedi `.ics` URL, amit a Booking.com és Szállás.hu "Naptár szinkron (iCal)" mezőjébe kell beilleszteni → a mi oldalunkon történő foglalás zárolja a dátumot az OTA-kon is.
- **Import**: a Booking.com/Szállás.hu által adott export-linkeket az admin-ban tároljuk, és időszakosan (cron vagy "Frissítés most" admin-gomb) lekérjük/feldolgozzuk → az OTA-kon történő foglalások megjelennek a saját naptárunkban.
- **Nyitott implementációs kérdés (Fázis 5)**: ha az "egész ház" külön egységként is szerepel az OTA-kon, a foglalási logikának kezelnie kell, hogy az egész ház foglalása mind a 3 szoba-naptárat zárolja, és fordítva.
- `/foglalas` oldal: naptár + ár-kalkulátor (a mockup logikájára épülve) + foglalási kérés form → DB-be ír + email-értesítés.

### 2.3 Design-nyelv – "Sóbarlang-fény"
A mockup csak strukturális referencia, a vizuális nyelv új. Jóváhagyott irány (hero-koncepció elkészült):

- **Paletta**: `--ink #1A231E` (sötét erdő-éjszaka), `--stone #F2ECE2` (meleg mészkő-krém), `--salt #E7AE8E` (sóbarlang-fény, jelzőszín), `--moss #5E7E62` (mohazöld), `--mist #C7D1C5` (halvány zöldes-szürke szöveg sötét alapon), `--bark #2B2620` (sötét szöveg világos alapon).
- **Tipográfia**: `Fraunces` (display/címsorok), `Work Sans` (body/UI), `IBM Plex Mono` (eyebrow-feliratok, "túrajelzés" stílusú apró elemek).
- **Signature motívum**: a "sóbarlang-fény" – meleg, halvány izzás sötét háttéren (radial glow), ami a sóbarlangba lépés élményéből indul ki.
- **Másodlagos motívum**: "blaze" csíkok (kétszínű, mohazöld+sóbarlang-szín téglalapok) – utalás a Bükki Nemzeti Park turistajelzéseire, wellness-lista és later programok/blog "mérföldkő" elemeihez használható.
- Elkészült artifact: `viki-vendeghaz-design-koncepcio.html` (hero + "öt útjelző" szekció).

### 2.4 Sitemap (Next.js route-ok)
| Route | Tartalom |
|---|---|
| `/` | Főoldal – hero+foglalás-widget, wellness 5 kártya, szobák, csomagok, étkezés sáv, vélemények, programok teaser |
| `/szobak` | Szobák & szezonális árak, összehasonlító táblázat, egész ház |
| `/wellness` | Összesítő + linkek az aloldalakra |
| `/wellness/sobarlang`, `/finn-szauna`, `/infraszauna`, `/dezsafurdo`, `/kert-medence` | Önálló SEO-aloldalak |
| `/csomagok` | Csomagajánlatok, akciók |
| `/etkezes` | Gasthaus-partnerség, reggeli/félpanzió |
| `/szilvasvarad` | Helyi programok/látnivalók |
| `/blog` + `/blog/[slug]` | SEO-tartalom, CMS-ből |
| `/galeria` | Valós fotók, kategória-szűrés |
| `/foglalas` | Naptár + ár-kalkulátor + foglalási kérés |
| `/kapcsolat` | Kapcsolat form, elérhetőségek, térkép |
| `/rolunk` | Történet (jelenlegi oldalról adaptálva) |
| `/gyik` | GYIK |
| `/adatvedelem`, `/impresszum` | Jogi oldalak (NTAK szám, adószám stb.) |

---

## 3. Fázisok

### Fázis 0 – Tervezés `[folyamatban]`
**Cél**: architektúra, sitemap, design-nyelv, adatmodell-irány, fejlesztési útiterv.

Eddig kész:
- [x] Forrásanyagok átnézve (mockup, üzleti terv, checklist)
- [x] Tech stack + admin/CMS megközelítés
- [x] Foglalás/naptár megközelítés (iCal, ingyenes)
- [x] Design-nyelv iránya + hero-koncepció
- [x] Sitemap

Még nyitott (lásd 4. szakasz):
- [ ] Valós, végleges szezonális árak
- [ ] Tartalom-inventár (mi jön át a jelenlegi oldalról)
- [ ] "Kajákról kitenni képet" pontosítása
- [ ] Domain/DNS-átállás terve

**Kész, ha**: a fenti nyitott pontok közül legalább az árak és a tartalom-inventár tisztázva van, és nekiállunk Fázis 1-nek.

---

### Fázis 1 – Alapozás
**Cél**: futóképes Next.js projekt, design-tokenek kódban, alap adatbázis.

- [ ] Next.js (App Router, TypeScript) projekt scaffold
- [ ] Vercel projekt + deploy pipeline
- [ ] Design tokenek (2.3 szakasz) Tailwind config / CSS custom properties formában
- [ ] Alap layout komponensek: navigáció, footer, gombok, kártyák – az új design-nyelv szerint
- [ ] Adatbázis felállítása (Neon Postgres + Drizzle), kezdeti séma: szobák, csomagok, blog, galéria, GYIK, üzenetek, naptár
- [ ] Admin alap: bejelentkezés (jelszavas session)

**Kész, ha**: van egy üres, de a design-nyelvet hordozó, élesen elérhető Next.js oldal, és az admin-ba be lehet lépni.

---

### Fázis 2 – Publikus oldalak (tartalmi/marketing)
**Cél**: a 2.4 sitemap minden route-ja létezik, valódi (vagy átmeneti) tartalommal.

- [ ] Layout integrálása minden oldalra (nav/footer minden route-on)
- [ ] Főoldal felépítése
- [ ] `/szobak`, `/wellness` + 5 aloldal, `/etkezes`, `/csomagok`, `/rolunk`, `/gyik`, `/kapcsolat`, `/szilvasvarad`
- [ ] Jelenlegi oldal szövegeinek átnézése/adaptálása az új hangra és struktúrára
- [ ] `/adatvedelem`, `/impresszum` alapverzió (NTAK, adószám, bankszámla – meglévő adatokkal)
- [ ] Reszponzív/mobil finomítás

**Kész, ha**: minden tervezett aloldal elérhető, mobilon is rendben néz ki, tartalom (akár ideiglenes) mindenhol van.

---

### Fázis 3 – Admin/CMS funkciók
**Cél**: a tulajdonos önállóan tudja szerkeszteni a tartalmat.

- [ ] Admin felület: szobák & árak szerkesztése
- [ ] Admin felület: csomagok szerkesztése
- [ ] Admin felület: galéria – kép-feltöltés (Vercel Blob vagy hasonló ingyenes tárhely) + kategorizálás
- [ ] Admin felület: GYIK szerkesztő
- [ ] Publikus oldalak DB-ből húzzák a tartalmat (ISR/revalidate, hogy gyors maradjon)

**Kész, ha**: a tulajdonos minden, Fázis 2-ben statikusan beírt szöveget/árat/képet admin-on keresztül tud módosítani, kódérintés nélkül.

---

### Fázis 4 – Blog & SEO
**Cél**: az üzleti terv #1 problémájának (Google-láthatóság) technikai megoldása.

- [ ] Blog rendszer admin-szerkesztővel (`/blog`, `/blog/[slug]`)
- [ ] Next.js Metadata API – egyedi title/description minden route-hoz
- [ ] schema.org/LodgingBusiness JSON-LD
- [ ] `sitemap.xml`, `robots.txt`
- [ ] Első 2-3 blog-cikk + `/szilvasvarad` tartalom (Szalajka-völgy útmutató stb.)

**Kész, ha**: Google Search Console-ba beküldhető a sitemap, a structured data hibamentes, és van legalább 2-3 helyi SEO-tartalom.

---

### Fázis 5 – Foglalási rendszer & naptár
**Cél**: a 2.2 szakaszban leírt iCal-alapú, ingyenes foglalási rendszer megépítése.

- [ ] Elérhetőség-adatmodell (szobánként, dátum-szintű), "egész ház" kombinált logika
- [ ] Admin: kézi zárás/foglalás bevitel
- [ ] iCal export endpoint szobánként (`.ics` generálás)
- [ ] iCal import: Booking.com/Szállás.hu linkek tárolása + időszakos feldolgozás
- [ ] `/foglalas` oldal: naptár + ár-kalkulátor + foglalási kérés form
- [ ] Árajánlat-generátor + email küldés (Resend)

**Kész, ha**: a saját oldalon történő foglalás megjelenik a Booking.com/Szállás.hu naptárban (és vissza), és az árajánlat-funkció működik.

---

### Fázis 6 – Valós tartalom feltöltése
**Cél**: a végleges adatok bekerülnek a rendszerbe.

- [ ] Valós fotók feltöltése/galéria véglegesítése
- [ ] Végleges szezonális árak admin-on keresztül
- [ ] Szövegek/csomagok véglegesítése

**Kész, ha**: nincs több placeholder szöveg/kép/ár az oldalon.

---

### Fázis 7 – Tesztelés, optimalizálás, indulás
**Cél**: élesítés.

- [ ] Performance (Lighthouse), mobil, akadálymentesség check
- [ ] SEO végső checklist (Google Business Profile összekötés, structured data validálás, sitemap beküldés)
- [ ] Jogi oldalak véglegesítése
- [ ] Domain/DNS átállás a régi WordPress oldalról

**Kész, ha**: az új oldal él a vikivendeghaz.hu domainen, és a Search Console nem jelez kritikus hibát.

---

### Fázis 8 – Indulás utáni marketing (opcionális, üzleti terv 90 napos terve)
Ez már túlnyúlik a weboldal-fejlesztésen, de az üzleti terv tartalmazza: Google Business Profile, Booking.com Genius program, közösségi média ritmus, Google Ads teszt stb. Csak referenciaként itt, ha a beszélgetés később ide is kiterjed.

---

## 4. Nyitott kérdések

1. **Árak**: az üzleti terv 4.2-es táblázata és az AI-mockup `/szobak` árai eltérnek egymástól (pl. szezonon kívüli hétköznap 1-es szoba: 14 000 vs 18 000 Ft). Mik a jelenlegi valós árak, amiket meg szeretnél jeleníteni?
2. **Tartalom-inventár**: a jelenlegi WordPress oldalon van "Rólunk", "Szilvásvárad története", "Látnivalók" tartalom – ezeket adaptáljuk az új oldalra, vagy újraírjuk?
3. **"Kajákról kitenni képet"** (checklist) – valódi kajakokra/csónakázásra gondoltál, vagy a Bükki Nemzeti Park "Kajla" pecsételő-pontjára (gyerek-túraprogram)?
4. **Domain**: a vikivendeghaz.hu domain hol van regisztrálva, és ki tudja kezelni a DNS-átállást, amikor Fázis 7-hez érünk?

---

## 5. Munkamód ebben a projektben

- A fejlesztés ebben a beszélgetésben (projektben) folyik – ez a dokumentum a memóriánk.
- Minden munka előtt nézzük, melyik fázisnál állunk (3. szakasz), és arra fókuszálunk.
- Ha a fejlesztés közben egy korábbi döntés módosul (pl. adatmodell, design-token, sitemap-elem), ezt a dokumentumot frissítjük – ne csak a chatben maradjon meg a változás.
- Az új nyitott kérdéseket a 4. szakaszba vesszük fel, a megválaszoltakat áthúzzuk/archiváljuk.
- A fázisok sorrendje irányadó, nem szigorú – ha logikus egy korábbi fázisba visszanyúlni (pl. egy admin-funkciót hamarabb megépíteni, mert úgy könnyebb tesztelni a publikus oldalt), az rendben van, csak jegyezzük fel itt.
