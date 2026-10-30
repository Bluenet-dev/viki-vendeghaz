# iCal-naptárszinkron – élő tesztprotokoll (T1–T7)

**Hol:** vikivendeghaz.hu (éles), Booking.com Extranet, Szállás.hu Admin
**Ki mit csinál:** **TE** = a portálokon és az adminban kattintasz · **ÉN** = a CMS-oldalt ellenőrzöm, mérek, jegyzőkönyvezek
**Előfeltétel:** migráció az éles DB-re → merge `main` → deploy → füstteszt rendben.

## Tesztdátumok és egység

Minden teszt a **jövőben, forgalmat nem zavaró** dátumon fut. Javaslat: **2027. november** (holtszezon). Ha valamelyik nap már foglalt, szólj, és másikat választunk.

| Teszt | Egység | Dátum (érkezés → távozás) |
|---|---|---|
| T1, T4 | Komfort Kétágyas (`szoba-1`) | 2027-11-08 → 2027-11-10 (2 éjszaka) |
| T2 | Komfort Kétágyas | 2027-11-15 (1 éjszaka) |
| T3 | Komfort Kétágyas | 2027-11-17 (1 éjszaka) |
| T5 | Komfort Kétágyas | 2027-11-22 (1 éjszaka) |
| T6 | Komfort Kétágyas, Szállás.hu import | – |
| T7 | Egész ház | 2027-11-29 → 2027-12-01 |

**Időmérés:** minden lépésnél írd be a chatbe a pontos időt (óra:perc), amikor kattintasz. Én ehhez mérem a késleltetést.

---

## T0 – Beállítás (egyszer, a tesztek előtt)

Minden egységnél (3 szoba + egész ház) és mindkét portálon:

**Booking.com – egységenként (szobatípusonként / az egész ház hirdetésénél):**
1. TE: Admin → **Naptár és árak** → jobb felül **Naptár-szinkron (Booking, Szállás.hu) →**.
2. TE: Az egység kártyáján a **Booking.com** export linknél **Másolás**.
3. TE: Booking Extranet → **Árak és elérhetőség → Naptár → Naptárak szinkronizálása** → az adott szobatípusnál **Naptár importálása** → beilleszted a linket → név: „BlueNet CMS” → mentés.
4. TE: Ugyanott **Naptár exportálása** → opció:
   - **szobáknál: „Booked and closed dates”**
   - **egész háznál: „Booked dates only”** (a szezonon kívüli lezárás ne zárja a szobákat – lásd T7)
   → link másolása.
5. TE: Vissza a Naptár-szinkron panelre → az egység **Import – Booking.com** mezőjébe beilleszted → **Mentés**. Elvárt: zöld „Mentve. A naptárban N esemény található.”

**Szállás.hu – egységenként:**
6. TE: Panelen az egység **Szállás.hu** export linkje → **Másolás**.
7. TE: Szállás.hu Admin → **Árak és kapacitás → Naptár szinkron (iCal) → Naptár importálása** → beilleszted → mentés.
8. TE: Szállás.hu Admin → **Naptár exportálás** → az egység linkje → másolás.
9. TE: Panelen az egység **Import – Szállás.hu** mezőjébe → **Mentés**.

10. ÉN: ellenőrzöm, hogy mind a 8 import-feed sikeresen frissült, és a meglévő portál-foglalások megjelentek a CMS naptárában.
11. TE: Ha a régi, token nélküli link (`…/api/ical/szoba-1` stb.) be volt állítva valamelyik portálon, **most töröld onnan**, és szólj – utána külön commitban kiveszem a kódból.

---

## T1 – CMS-foglalás → megjelenik a portálokon

1. TE: Admin → **Foglalások → Új foglalás**: név „TESZT T1”, egység Komfort Kétágyas, 2027-11-08 → 2027-11-10, forrás **Telefon**, 2 fő → mentés („Mentéskor a napok automatikusan lezáródnak a naptárban”). **Idő: t0.**
2. ÉN: ellenőrzöm, hogy a foglalás benne van a Komfort Kétágyas Booking- és Szállás.hu-export feedjében.
3. TE (Booking): Naptárak szinkronizálása → az importált „BlueNet CMS” naptárnál **Import now** → majd a naptárban 11-08 és 11-09 lezárt? **Idő: t1-Booking.**
4. TE (Szállás.hu): itt nincs kézi import gomb – **5 percenként** frissítsd a naptárat, amíg 11-08 és 11-09 foglalt nem lesz. **Idő: t1-Szállás.**
5. ÉN: jegyzőkönyv: Booking késleltetés (Import now után), Szállás.hu késleltetés (automatikus).

## T2 – Bookingon zárt nap → CMS és Szállás.hu (hub)

1. TE: Booking naptár → Komfort Kétágyas → **2027-11-15** lezárása. **Idő: t0.**
2. ÉN: percenként ellenőrzöm a CMS-t: mikor jelenik meg a blokk (cron 15 percenként). Elvárt: **≤ 15 perc** + a Booking saját export-késleltetése.
3. ÉN: ellenőrzöm, hogy a Komfort Kétágyas **Szállás.hu-export** feedjében benne van (hub), a Booking-exportban **nincs** (visszhang).
4. TE: Szállás.hu naptár 5 percenként, amíg 11-15 foglalt nem lesz. **Idő: t2-Szállás.**

## T3 – Szállás.hun zárt nap → CMS és Booking

1. TE: Szállás.hu → Komfort Kétágyas → **2027-11-17** lezárása. **Idő: t0.**
2. ÉN: mérem, mikor jelenik meg a CMS-ben; ellenőrzöm, hogy a **Booking-export** feedben benne van, a Szállás.hu-exportban nincs.
3. TE: Booking → **Import now** → 11-17 lezárt? **Idő: t3-Booking.**

## T4 – A tesztfoglalás törlése → mindenhonnan eltűnik

1. TE: Admin → „TESZT T1” → **Lemondás** → „Felszabadítsam a napokat?” → **Igen, újra foglalhatók**. **Idő: t0.**
2. ÉN: ellenőrzöm, hogy mindkét export-feedből azonnal kikerült.
3. TE (Booking): **Import now** → 11-08, 11-09 újra szabad? **Idő: t4-Booking.**
4. TE (Szállás.hu): 5 percenként, amíg szabad nem lesz. **Idő: t4-Szállás.**

## T5 – Foglalás előtti friss ellenőrzés

A cél: a portálon frissen lezárt napot a saját oldal akkor is elutasítsa, ha a 15 perces szinkron még nem hozta be.

1. TE: Booking → Komfort Kétágyas → **2027-11-22** lezárása. **Idő: t0.**
2. TE: **azonnal (2 percen belül)**: vikivendeghaz.hu → Foglalás → Komfort Kétágyas, 2027-11-22 → 11-23, 2 fő → kérés elküldése (név: „TESZT T5”, saját e-mail).
3. Elvárt üzenet, szó szerint: **„Ez az időpont időközben foglalttá vált. Kérjük, válasszon másik dátumot.”**
4. ÉN: ellenőrzöm, hogy nem jött létre foglalás, és a blokk a friss ellenőrzés miatt már a CMS-ben van.
5. Ha mégis létrejön a kérés: az azt jelenti, hogy a Booking export-feedje még nem tartalmazta a lezárást (a Booking oldali késleltetés). Ezt is jegyzőkönyvezzük, és a kérést törlöm.

## T6 – Elrontott import link → hiba-e-mail, a blokkok megmaradnak

A panel csak érvényes iCal-linket ment, ezért a hibát az adatbázisban szimulálom.

1. ÉN: a Komfort Kétágyas **Szállás.hu import** linkjét az adatbázisban egy 404-et adó címre írom át. **Idő: t0.** (A T3-as 11-17-i blokk ekkor még benne van a CMS-ben.)
2. ÉN: 3 cron-kört várok (~45 perc), közben ellenőrzöm: a 11-17-i blokk **megmarad**.
3. TE: megjött az e-mail? Tárgy: **„A Szállás.hu-naptár nem frissül – Komfort Kétágyas”**. **Idő: t6-mail.**
4. TE: a panelen a Szállás.hu sorban piros hibaüzenet és „3× egymás után” látszik?
5. ÉN: visszaírom az eredeti linket → **Frissítés most** → a hiba eltűnik, a számláló nullázódik.

## T7 – Egész ház: szezonon kívüli lezárás nem zárhatja a szobákat

1. TE: Booking → **egész ház hirdetése** → **2027-11-29 → 12-01** lezárása (foglalás nélkül). **Idő: t0.** (A Booking egész házas exportja „Booked dates only” – T0/4.)
2. ÉN: 20 perc múlva ellenőrzöm: a CMS-ben a **három szoba ezeken a napokon NEM zárult le**.
3. TE: Szállás.hu → **egész ház** hirdetése → ugyanezen napok lezárása. **Idő: t0'.**
4. ÉN: lekérem a Szállás.hu egész házas feedjét, és megnézem, benne van-e a lezárás, és megkülönböztethető-e a foglalástól (SUMMARY).
   - **Ha nincs benne / megkülönböztethető:** rendben, a szobák nem zárulnak.
   - **Ha benne van, és nem megkülönböztethető:** a szobák lezárulnak → jelzem, és döntünk (pl. a Szállás.hu egész házas importot csak főszezonban kapcsoljuk be).
5. TE: mindkét portálon feloldod a 11-29 → 12-01 lezárást.

---

## Takarítás (kötelező)

- [ ] TE: Booking – 11-15, 11-22, 11-29…11-30 lezárás feloldva (Komfort Kétágyas és egész ház)
- [ ] TE: Szállás.hu – 11-17, 11-29…11-30 lezárás feloldva
- [ ] ÉN: „TESZT T1” lemondva (T4), esetleges „TESZT T5” kérés törölve
- [ ] ÉN: T6 import link visszaállítva, a feed hibátlan
- [ ] ÉN: a CMS-ben a teszt-dátumokon nincs maradék blokk

## Jegyzőkönyv – mért késleltetések (ebből készül a sales-szöveg)

| Teszt | Irány | Platform | Kattintás (t0) | Megjelent | Késleltetés (perc) |
|---|---|---|---|---|---|
| T1 | CMS → portál | Booking (Import now után) | | | |
| T1 | CMS → portál | Szállás.hu (automatikus) | | | |
| T2 | portál → CMS | Booking → CMS | | | |
| T2 | portál → portál (hub) | Booking → CMS → Szállás.hu | | | |
| T3 | portál → CMS | Szállás.hu → CMS | | | |
| T3 | portál → portál (hub) | Szállás.hu → CMS → Booking | | | |
| T4 | törlés | Booking | | | |
| T4 | törlés | Szállás.hu | | | |
| T5 | friss ellenőrzés | Booking → saját oldal | | | elutasítva? |
| T6 | hiba-e-mail | – | | | |
| T7 | egész ház lezárás | Booking / Szállás.hu | | | szobák zárultak? |
