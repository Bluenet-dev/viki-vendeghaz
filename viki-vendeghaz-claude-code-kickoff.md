# Viki Vendégház – Claude Code kickoff

> Ez a dokumentum egy Claude Code munkamenet indító kontextusa. A teljes projektterv (architektúra, fázisok, döntések) a `viki-vendeghaz-projektterv.md` / `.docx` fájlban van – **azt is olvasd be elsőként**, ez itt csak a Fázis 1 konkrét, gyakorlati indítási instrukciója.

---

## Mi ez a projekt

A vikivendeghaz.hu (Szilvásvárad, 3 szoba + sóbarlang + wellness vendégház) teljes megújítása. Next.js (App Router) + Vercel + saját Postgres (Neon) + Drizzle ORM. Egyedi admin/CMS, saját ingyenes iCal-alapú foglalási naptár (nincs fizetős channel manager), új "Sóbarlang-fény" design-nyelv. A teljes részletes tervet, a design-tokeneket és a sitemap-et lásd a projektterv-dokumentumban.

A tervezési fázis (Fázis 0) egy másik Claude beszélgetésben (claude.ai chat) készült, ott vannak a forrásanyagok (jelenlegi WordPress-oldal tartalma, üzleti terv, AI-mockup HTML mint strukturális referencia) és a döntési kontextus is. **Ez a Claude Code munkamenet nem fér hozzá ahhoz a beszélgetéshez** – minden, ami a munkához szükséges, ebbe a repóba van/lesz kimásolva (projektterv + design-koncepció fájl). Ha valami hiányzik vagy nem egyértelmű, kérdezz rá, ne találgass.

---

## Hol állunk most

**Fázis 0 (Tervezés) lezárva.** Most **Fázis 1 (Alapozás)** indul: futóképes Next.js projekt, design-tokenek kódban, alap adatbázis-séma.

A projektterv-dokumentum "Kész, ha" feltételei Fázis 1-hez:
> Van egy üres, de a design-nyelvet hordozó, élesen elérhető Next.js oldal, és az admin-ba be lehet lépni.

---

## FONTOS: ne scaffoldolj Next.js projektet a semmiből

**Van egy működő boilerplate, amit ehelyett kell használni.** A nulláról induló `create-next-app` / Tailwind-init gyakran függőségi hibákba fut – ezért készült egy előre bekonfigurált, működő alap.

- **Repo**: `bluenet-core`, a **`bluenetdev`** GitHub organization alatt.
- **Tartalma**: Next.js (App Router) alapok + Tailwind már beállítva + alap projekt-konfiguráció (tehát a build/dependency-réteg már működik).
- **Nem tartalmaz**: navigációt, footer-t, kártya-komponenseket, design-tokeneket – ezeket ebben a munkamenetben építjük rá, a "Sóbarlang-fény" design-nyelv szerint, nulláról.

### Lépések
1. Klónozd a `bluenetdev/bluenet-core` repót, ebbe a projektbe (vagy hozz létre belőle egy új repót a Viki Vendégház projekthez – kérdezd meg a felhasználót, ha nem világos, hogy fork/clone/template-as-new-repo a cél).
2. Telepítsd a függőségeket, futtasd le a dev servert, és **ellenőrizd, hogy a boilerplate önmagában hibátlanul elindul**, mielőtt bármilyen egyedi munkát ráépítenél. Ha bármilyen hiba van már itt, állj meg és jelezd – ne próbálj a boilerplate-en kívül workaround-ot építeni.
3. Csak ezután kezdd a Fázis 1 tényleges munkáját.

---

## Fázis 1 – konkrét feladatok

A projektterv 3. szakasza (Fázis 1) szerint:

1. **Design tokenek** – a projektterv 2.3 szakaszában lévő paletta és tipográfia bekötése Tailwind configba / CSS custom properties-be:
   - Színek: `--ink #1A231E`, `--stone #F2ECE2`, `--salt #E7AE8E`, `--moss #5E7E62`, `--mist #C7D1C5`, `--bark #2B2620`
   - Fontok: `Fraunces` (display/címsorok), `Work Sans` (body/UI), `IBM Plex Mono` (eyebrow/apró feliratok)
   - Vizuális referencia: a mellékelt `viki-vendeghaz-design-koncepcio.html` fájl (hero + "öt útjelző" szekció) – ez mutatja a "sóbarlang-fény" glow-motívumot, a "blaze" kétszínű csíkokat, és az általános hangulatot. **Ezt nem kell pixel-pontosan lemásolni**, hanez stílus-referenciaként szolgál.

2. **Alap layout-komponensek** az új design-nyelv szerint: navigáció, footer, gombok (fill/outline variánsok, lásd a referencia-HTML-ben), kártyák.

3. **Adatbázis felállítása**: Neon Postgres + Drizzle ORM. Kezdeti séma-entitások (a projektterv 2.1 szakasza szerint):
   - Szobák (leírás, képek, "-tól" árak)
   - Csomagok (tartalom, ár, érvényesség, szezon)
   - Blog posztok (cím, slug, tartalom, kép, kategória)
   - Galéria képek (kategóriával: szobák, wellness, sóbarlang, udvar, természet)
   - GYIK (kérdés-válasz)
   - Üzenetek (kapcsolat-form + foglalási kérések)
   - Naptár/elérhetőség (szobánként dátum-szintű foglalt/szabad állapot)

   Megjegyzés: a konkrét szoba-árak még nem érkeztek meg (lásd projektterv 4. szakasz, "Szoba-árak + díjszabás-szabályok") – a séma legyen erre felkészítve (pl. nullable/placeholder ár-mezők), de ez nem blokkolja a séma megépítését.

4. **Admin alap**: egyszerű jelszavas session-auth a `/admin` alá (egyszemélyes vállalkozás, nincs szükség multi-user/role-rendszerre).

---

## Munkamód / visszacsatolás

- Ha egy korábbi döntés (design-token, adatmodell, sitemap-elem) módosul a munka során, ezt **vissza kell jelezni** a felhasználónak, hogy a claude.ai-os projektterv-dokumentumot frissíthesse – a Claude Code munkamenet ezt a dokumentumot nem tudja automatikusan szerkeszteni a másik oldalon.
- Fázis lezáráskor (pl. "Fázis 1 kész") adj egy rövid, másolható összefoglalót, amit a felhasználó át tud vinni a tervező-beszélgetésbe.
- Ha bizonytalan vagy egy döntésben, ami nincs egyértelműen leírva a projekttervben, kérdezz rá, ne találgass.
