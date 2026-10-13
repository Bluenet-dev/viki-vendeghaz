// Szerveroldali adatbetöltés és módosítások a v2 foglaláskezeléshez.
// Az ütközésvédelem a closures (room_scope, date) egyedi indexén múlik: a foglalás
// és a lezárásai egyetlen SQL utasításban jönnek létre, így két egyidejű kérés
// sem tud ugyanarra a napra bekerülni.

import { and, eq, gte, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, closures, dayPrices, dayRates, settings, stayPackages, tariffPrices, tariffs } from "@/db/schema";
import { ALL_SCOPES, ROOM_SCOPES, scopeRooms, targetRooms, type Meal, type Scope, type Source, type Status, type Target } from "./constants";
import { addDays, nightsOf, todayBudapest } from "./dates";
import {
  closedNights,
  computeQuote,
  priceKey,
  rateKey,
  searchOptions,
  type BookingData,
  type PackageRow,
  type Quote,
  type QuoteInput,
  type RateRow,
  type TariffRow,
} from "./quote";

export type Settings = typeof settings.$inferSelect;
export type Booking = typeof bookings.$inferSelect;

export async function getSettings(): Promise<Settings> {
  const [row] = await db.select().from(settings).limit(1);
  if (row) return row;
  const [created] = await db.insert(settings).values({}).returning();
  return created;
}

export async function loadTariffs(): Promise<TariffRow[]> {
  return db
    .select({
      code: tariffs.code,
      name: tariffs.name,
      minNights: tariffs.minNights,
      roomMode: tariffs.roomMode,
      releaseDays: tariffs.releaseDays,
      thirdNightDiscount: tariffs.thirdNightDiscount,
      lastMinuteDiscount: tariffs.lastMinuteDiscount,
      peakDeposit: tariffs.peakDeposit,
      packageGroup: tariffs.packageGroup,
      color: tariffs.color,
    })
    .from(tariffs)
    .orderBy(tariffs.sortOrder);
}

export async function loadPackages(): Promise<PackageRow[]> {
  return db
    .select({
      slug: stayPackages.slug,
      name: stayPackages.name,
      includes: stayPackages.includes,
      priceLow: stayPackages.priceLow,
      priceHigh: stayPackages.priceHigh,
      maxGuests: stayPackages.maxGuests,
      months: stayPackages.months,
      active: stayPackages.active,
    })
    .from(stayPackages)
    .orderBy(stayPackages.sortOrder);
}

export async function loadBookingData(from: string, to: string, s?: Settings): Promise<BookingData> {
  const [rateRows, priceRows, closureRows, tariffRows, packages, st] = await Promise.all([
    db
      .select({
        roomScope: dayRates.roomScope,
        date: dayRates.date,
        price: dayRates.price,
        extraPersonPrice: dayRates.extraPersonPrice,
        minNights: dayRates.minNights,
        wholeHouseOnly: dayRates.wholeHouseOnly,
        tariffCode: dayRates.tariffCode,
        label: dayRates.label,
      })
      .from(dayRates)
      .where(and(gte(dayRates.date, from), lte(dayRates.date, to))),
    db
      .select({ roomScope: dayPrices.roomScope, date: dayPrices.date, guests: dayPrices.guests, price: dayPrices.price })
      .from(dayPrices)
      .where(and(gte(dayPrices.date, from), lte(dayPrices.date, to))),
    db
      .select({ roomScope: closures.roomScope, date: closures.date, bookingId: closures.bookingId })
      .from(closures)
      .where(and(gte(closures.date, from), lte(closures.date, to))),
    loadTariffs(),
    loadPackages(),
    s ? Promise.resolve(s) : getSettings(),
  ]);

  const rates = new Map<string, RateRow>();
  for (const r of rateRows) rates.set(rateKey(r.roomScope, r.date), r);
  const prices = new Map<string, number>();
  for (const p of priceRows) prices.set(priceKey(p.roomScope, p.date, p.guests), p.price);
  const closed = new Map<string, number | null>();
  for (const c of closureRows) closed.set(rateKey(c.roomScope, c.date), c.bookingId);
  return {
    rates,
    prices,
    closed,
    tariffs: new Map(tariffRows.map((t) => [t.code, t])),
    packages,
    settings: st,
    today: todayBudapest(),
  };
}

export async function quoteFor(input: QuoteInput): Promise<Quote> {
  const data = await loadBookingData(input.checkIn, input.checkOut);
  return computeQuote(input, data);
}

// A kért időszakhoz legközelebbi (előre és hátra is keresve) szabad időszakok,
// azonos éjszakaszámmal. Egymással nem fedik át egymást.
export async function findNearestFreeWindows(
  checkIn: string,
  nights: number,
  guests: number,
  count = 2,
): Promise<{ checkIn: string; checkOut: string }[]> {
  const today = todayBudapest();
  const RANGE = 180;
  const data = await loadBookingData(addDays(checkIn, -RANGE), addDays(checkIn, RANGE + nights));
  const found: { checkIn: string; checkOut: string }[] = [];

  for (let step = 1; step <= RANGE && found.length < count; step++) {
    for (const offset of [step, -step]) {
      if (found.length >= count) break;
      const start = addDays(checkIn, offset);
      if (start <= today) continue;
      const end = addDays(start, nights);
      if (found.some((w) => start < w.checkOut && end > w.checkIn)) continue;
      if (searchOptions(start, end, guests, data).options.length > 0) found.push({ checkIn: start, checkOut: end });
    }
  }
  return found.sort((a, b) => a.checkIn.localeCompare(b.checkIn));
}

// Legalacsonyabb ár scope-onként a következő évre ("-tól" feliratokhoz).
export async function lowestPrices(): Promise<Record<Scope, number | null>> {
  const today = todayBudapest();
  const rows = await db
    .select({
      scope: dayRates.roomScope,
      min: sql<number | null>`min(${dayRates.price}) filter (where ${dayRates.price} > 0 and (${dayRates.roomScope} = 'egesz_haz' or not ${dayRates.wholeHouseOnly}))`,
    })
    .from(dayRates)
    .where(and(gte(dayRates.date, today), lte(dayRates.date, addDays(today, 365))))
    .groupBy(dayRates.roomScope);
  const out = Object.fromEntries(ALL_SCOPES.map((s) => [s, null])) as Record<Scope, number | null>;
  for (const r of rows) if ((ALL_SCOPES as readonly string[]).includes(r.scope)) out[r.scope as Scope] = r.min != null ? Number(r.min) : null;
  return out;
}

// ─── Módosítások ────────────────────────────────────────────────────────────

function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23505" || err?.cause?.code === "23505";
}

async function busyDates(scope: Target, checkIn: string, checkOut: string, ignoreBookingId?: number): Promise<string[]> {
  const nights = nightsOf(checkIn, checkOut);
  const rows = await db
    .select({ roomScope: closures.roomScope, date: closures.date, bookingId: closures.bookingId })
    .from(closures)
    .where(and(inArray(closures.roomScope, targetRooms(scope)), gte(closures.date, checkIn), lte(closures.date, nights[nights.length - 1])));
  const closed = new Map<string, number | null>();
  for (const r of rows) if (ignoreBookingId == null || r.bookingId !== ignoreBookingId) closed.set(rateKey(r.roomScope, r.date), r.bookingId);
  return closedNights(scope, nights, closed);
}

// A lezárandó (szoba, nap) párok EGYETLEN JSON-paraméterként – a drizzle `sql`
// sablon a JS-tömböket rekordlistává bontaná, ezért tömbparaméter itt nem használható.
function closurePairsJson(scope: Target, checkIn: string, checkOut: string): string {
  const rows: { scope: string; d: string }[] = [];
  for (const d of nightsOf(checkIn, checkOut)) {
    for (const room of targetRooms(scope)) rows.push({ scope: room, d });
  }
  return JSON.stringify(rows);
}

export type MutationResult = { ok: true; id: number } | { ok: false; error: string; busy?: string[] };

export interface NewBooking {
  name: string;
  email?: string | null;
  phone?: string | null;
  scope: Target; // szoba, kombináció ("szoba-1,superior") vagy egész ház
  checkIn: string;
  checkOut: string;
  guests: number;
  meal: Meal;
  mealGuests: number | null;
  total: number | null;
  depositAmount?: number | null;
  source: Source;
  status: Status;
  guestMessage?: string | null;
  note?: string | null;
  // 2027-es árazás
  adults?: number | null;
  teens?: number | null;
  children?: number | null;
  infants?: number | null;
  packageSlug?: string | null;
  extras?: { saunaDays?: number; tubCount?: number } | null;
  lines?: { label: string; amount: number }[] | null;
  depositPercent?: number | null;
  pricingRegime?: string | null;
}

// closeDays = true: a foglalás és a napok lezárása egyetlen atomikus utasítás.
export async function createBooking(b: NewBooking, closeDays: boolean): Promise<MutationResult> {
  if (!closeDays) {
    const [row] = await db
      .insert(bookings)
      .values({
        name: b.name,
        email: b.email || null,
        phone: b.phone || null,
        roomScope: b.scope,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        guests: b.guests,
        meal: b.meal,
        mealGuests: b.mealGuests,
        total: b.total,
        depositAmount: b.depositAmount ?? null,
        source: b.source,
        status: b.status,
        guestMessage: b.guestMessage || null,
        note: b.note || null,
        adults: b.adults ?? null,
        teens: b.teens ?? null,
        children: b.children ?? null,
        infants: b.infants ?? null,
        packageSlug: b.packageSlug ?? null,
        extras: b.extras ?? null,
        lines: b.lines ?? null,
        depositPercent: b.depositPercent ?? null,
        pricingRegime: b.pricingRegime ?? null,
      })
      .returning({ id: bookings.id });
    return { ok: true, id: row.id };
  }

  const busy = await busyDates(b.scope, b.checkIn, b.checkOut);
  if (busy.length) return { ok: false, error: "busy", busy };

  const rows = closurePairsJson(b.scope, b.checkIn, b.checkOut);
  const acceptedAt = b.status === "valaszra_var" ? null : new Date().toISOString();
  try {
    const res = await db.execute<{ id: number }>(sql`
      WITH nb AS (
        INSERT INTO bookings (name, email, phone, room_scope, check_in, check_out, guests, meal, meal_guests,
                              total, deposit_amount, source, status, guest_message, note, accepted_at,
                              adults, teens, children, infants, package_slug, extras, lines, deposit_percent, pricing_regime)
        VALUES (${b.name}, ${b.email || null}, ${b.phone || null}, ${b.scope}, ${b.checkIn}, ${b.checkOut},
                ${b.guests}, ${b.meal}, ${b.mealGuests}, ${b.total}, ${b.depositAmount ?? null}, ${b.source},
                ${b.status}, ${b.guestMessage || null}, ${b.note || null}, ${acceptedAt},
                ${b.adults ?? null}, ${b.teens ?? null}, ${b.children ?? null}, ${b.infants ?? null}, ${b.packageSlug ?? null},
                ${b.extras ? JSON.stringify(b.extras) : null}::jsonb, ${b.lines ? JSON.stringify(b.lines) : null}::jsonb,
                ${b.depositPercent ?? null}, ${b.pricingRegime ?? null})
        RETURNING id
      ), nc AS (
        INSERT INTO closures (room_scope, date, booking_id)
        SELECT c.scope, c.d, nb.id FROM nb
        CROSS JOIN jsonb_to_recordset(${rows}::jsonb) AS c(scope text, d date)
      )
      SELECT id FROM nb
    `);
    return { ok: true, id: Number(res.rows[0].id) };
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { ok: false, error: "busy", busy: await busyDates(b.scope, b.checkIn, b.checkOut) };
    }
    throw e;
  }
}

export async function getBooking(id: number): Promise<Booking | null> {
  const [row] = await db.select().from(bookings).where(eq(bookings.id, id));
  return row ?? null;
}

// Válaszra váró → Előlegre vár: a napok lezárulnak (atomikusan az állapotváltással).
export async function confirmBooking(id: number): Promise<MutationResult> {
  const b = await getBooking(id);
  if (!b) return { ok: false, error: "A foglalás nem található." };
  if (b.status !== "valaszra_var") return { ok: false, error: "Ez a foglalás már nem vár válaszra." };
  const scope: Target = b.roomScope;

  const busy = await busyDates(scope, b.checkIn, b.checkOut, id);
  if (busy.length) return { ok: false, error: "busy", busy };

  const s = await getSettings();
  // A foglaló a foglaláskor rögzített százalékkal (2027: 30/50%); régi foglalásnál a beállítással.
  const deposit = b.depositAmount ?? (b.total != null ? Math.round((b.total * (b.depositPercent ?? s.depositPercent)) / 100) : null);
  const rows = closurePairsJson(scope, b.checkIn, b.checkOut);
  try {
    // Ütközésnél az egyedi index hibát dob, és az állapotváltás is visszagördül.
    await db.execute(sql`
      WITH ub AS (
        UPDATE bookings SET status = 'elfogadva', accepted_at = now(), deposit_amount = ${deposit}
        WHERE id = ${id} AND status = 'valaszra_var'
        RETURNING id
      )
      INSERT INTO closures (room_scope, date, booking_id)
      SELECT c.scope, c.d, ub.id FROM ub
      CROSS JOIN jsonb_to_recordset(${rows}::jsonb) AS c(scope text, d date)
    `);
    return { ok: true, id };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "busy", busy: await busyDates(scope, b.checkIn, b.checkOut, id) };
    throw e;
  }
}

export async function markDepositReceived(id: number, amount?: number | null): Promise<void> {
  const b = await getBooking(id);
  if (!b || b.status !== "elfogadva") return;
  await db
    .update(bookings)
    .set({
      status: "visszaigazolt",
      depositReceivedAt: todayBudapest(),
      depositAmount: amount ?? b.depositAmount,
    })
    .where(eq(bookings.id, id));
}

export async function cancelBooking(id: number, releaseDays: boolean): Promise<void> {
  const ops = [
    db.update(bookings).set({ status: "lemondott", cancelledAt: new Date() }).where(eq(bookings.id, id)),
    releaseDays
      ? db.delete(closures).where(eq(closures.bookingId, id))
      : // Ha a napok lezárva maradnak, kézi lezárássá válnak (így később egy kattintással feloldhatók).
        db.update(closures).set({ bookingId: null, note: "Lemondott foglalás napja" }).where(eq(closures.bookingId, id)),
  ] as const;
  await db.batch(ops);
}

// Naptár-cella: szabad ↔ kézi lezárás. Foglaláshoz tartozó napot nem old fel.
export async function toggleClosure(room: string, date: string): Promise<{ bookingId: number | null } | null> {
  if (!(ROOM_SCOPES as readonly string[]).includes(room)) return null;
  const [existing] = await db.select().from(closures).where(and(eq(closures.roomScope, room), eq(closures.date, date)));
  if (existing?.bookingId) return { bookingId: existing.bookingId };
  if (existing) await db.delete(closures).where(eq(closures.id, existing.id));
  else await db.insert(closures).values({ roomScope: room, date, note: "Kézi lezárás" }).onConflictDoNothing();
  return { bookingId: null };
}

// A létszám szerinti napi ár kézi felülírása (null = törlés). A 2 fős (szoba) és az
// 1–8 fős (ház) ár a day_rates.price-ba is bekerül – a "-tól" feliratok innen számolnak.
export async function setDayPrice(scope: Scope, date: string, guests: number, value: number | null): Promise<void> {
  const key = and(eq(dayPrices.roomScope, scope), eq(dayPrices.date, date), eq(dayPrices.guests, guests));
  if (value == null) await db.delete(dayPrices).where(key);
  else {
    await db
      .insert(dayPrices)
      .values({ roomScope: scope, date, guests, price: value })
      .onConflictDoUpdate({ target: [dayPrices.roomScope, dayPrices.date, dayPrices.guests], set: { price: value } });
  }
  if (guests === (scope === "egesz_haz" ? 8 : 2)) {
    await db
      .insert(dayRates)
      .values({ roomScope: scope, date, price: value })
      .onConflictDoUpdate({ target: [dayRates.roomScope, dayRates.date], set: { price: value } });
  }
}

// Tarifa alkalmazása a megadott napokra: betű, min. éjszaka, szobák nyitása és MINDEN
// létszámár a tarifatáblából. Lezáráshoz és foglaláshoz nem nyúl.
export async function applyTariff(code: string, dates: string[], scopes: Scope[]): Promise<void> {
  if (!dates.length || !scopes.length) return;
  const [t] = await db.select().from(tariffs).where(eq(tariffs.code, code));
  if (!t) throw new Error(`Ismeretlen tarifa: ${code}`);
  const tp = await db.select().from(tariffPrices).where(eq(tariffPrices.tariffCode, code));

  const rateRows = scopes.flatMap((scope) => {
    const base = tp.find((p) => p.roomScope === scope && p.guests === (scope === "egesz_haz" ? 8 : 2))?.price ?? null;
    return dates.map((date) => ({
      roomScope: scope,
      date,
      tariffCode: code,
      minNights: t.minNights,
      wholeHouseOnly: scope !== "egesz_haz" && t.roomMode !== "open",
      price: base,
      extraPersonPrice: null,
    }));
  });
  for (let i = 0; i < rateRows.length; i += 500) {
    await db
      .insert(dayRates)
      .values(rateRows.slice(i, i + 500))
      .onConflictDoUpdate({
        target: [dayRates.roomScope, dayRates.date],
        set: {
          tariffCode: sql`excluded.tariff_code`,
          minNights: sql`excluded.min_nights`,
          wholeHouseOnly: sql`excluded.whole_house_only`,
          price: sql`excluded.price`,
          extraPersonPrice: null,
        },
      });
  }

  for (let i = 0; i < dates.length; i += 400) {
    await db.delete(dayPrices).where(and(inArray(dayPrices.roomScope, scopes), inArray(dayPrices.date, dates.slice(i, i + 400))));
  }
  const priceRows = scopes.flatMap((scope) =>
    tp.filter((p) => p.roomScope === scope).flatMap((p) => dates.map((date) => ({ roomScope: scope, date, guests: p.guests, price: p.price }))),
  );
  for (let i = 0; i < priceRows.length; i += 500) await db.insert(dayPrices).values(priceRows.slice(i, i + 500));
}

// A tarifa minden jövőbeli napjára újra kiírja az árakat (Beállítások → Tarifák).
export async function reapplyTariffToFutureDays(code: string): Promise<number> {
  const rows = await db
    .selectDistinct({ date: dayRates.date })
    .from(dayRates)
    .where(and(eq(dayRates.tariffCode, code), gte(dayRates.date, todayBudapest())));
  const dates = rows.map((r) => r.date);
  await applyTariff(code, dates, [...ALL_SCOPES]);
  return dates.length;
}

// "Több nap beállítása": a kijelölt napokra (hétnap-szűrés után) és szállásokra egyszerre.
export interface DaysChange {
  dates: string[];
  scopes: Scope[];
  prices?: { scope: Scope; guests: number; price: number }[]; // csak a kitöltött árak
  tariff?: string | null; // árlista: minden ár + min. éjszaka + szobák nyitása
  closure?: "close" | "open" | null;
  minNights?: number | null;
  label?: string | null; // ünnep/esemény neve; "" = törlés; null = nem változik
}

// A napok közül mennyin van már foglalás az érintett szobákban.
export async function bookedDaysAmong(dates: string[], scopes: Scope[]): Promise<number> {
  const rooms = Array.from(new Set(scopes.flatMap((s) => scopeRooms(s))));
  if (!dates.length || !rooms.length) return 0;
  let n = 0;
  for (let i = 0; i < dates.length; i += 400) {
    const [row] = await db
      .select({ n: sql<number>`count(distinct ${closures.date})::int` })
      .from(closures)
      .where(and(inArray(closures.roomScope, rooms), inArray(closures.date, dates.slice(i, i + 400)), isNotNull(closures.bookingId)));
    n += Number(row.n);
  }
  return n;
}

export async function applyToDays(c: DaysChange): Promise<{ days: number; booked: number }> {
  const { dates, scopes } = c;
  const booked = await bookedDaysAmong(dates, scopes);
  if (!dates.length || !scopes.length) return { days: 0, booked };

  if (c.tariff) await applyTariff(c.tariff, dates, scopes);

  if (c.prices?.length) {
    const rows = c.prices.flatMap((p) => dates.map((date) => ({ roomScope: p.scope, date, guests: p.guests, price: p.price })));
    for (let i = 0; i < rows.length; i += 500) {
      await db
        .insert(dayPrices)
        .values(rows.slice(i, i + 500))
        .onConflictDoUpdate({ target: [dayPrices.roomScope, dayPrices.date, dayPrices.guests], set: { price: sql`excluded.price` } });
    }
    // A 2 fős (szoba) és az 1–8 fős (ház) ár a day_rates.price-ba is ("-tól" feliratok).
    const base = c.prices.filter((p) => p.guests === (p.scope === "egesz_haz" ? 8 : 2));
    const rateRows = base.flatMap((p) => dates.map((date) => ({ roomScope: p.scope, date, price: p.price })));
    for (let i = 0; i < rateRows.length; i += 500) {
      await db
        .insert(dayRates)
        .values(rateRows.slice(i, i + 500))
        .onConflictDoUpdate({ target: [dayRates.roomScope, dayRates.date], set: { price: sql`excluded.price` } });
    }
  }

  // Min. éjszaka a kijelölt szállásokra; az ünnep neve napra szól, ezért mindegyikre.
  const updates: { scopes: readonly Scope[]; set: Partial<typeof dayRates.$inferInsert> }[] = [];
  if (c.minNights != null) updates.push({ scopes, set: { minNights: c.minNights } });
  if (c.label != null) updates.push({ scopes: ALL_SCOPES, set: { label: c.label === "" ? null : c.label } });
  for (const u of updates) {
    const rows = u.scopes.flatMap((scope) => dates.map((date) => ({ roomScope: scope, date, ...u.set })));
    for (let i = 0; i < rows.length; i += 500) {
      await db.insert(dayRates).values(rows.slice(i, i + 500)).onConflictDoUpdate({ target: [dayRates.roomScope, dayRates.date], set: u.set });
    }
  }

  // Lezárás / feloldás. Foglaláshoz tartozó nap zárva marad.
  const rooms = Array.from(new Set(scopes.flatMap((s) => scopeRooms(s))));
  if (c.closure === "close" && rooms.length) {
    const rows = rooms.flatMap((room) => dates.map((date) => ({ roomScope: room, date, note: "Kézi lezárás" })));
    for (let i = 0; i < rows.length; i += 500) await db.insert(closures).values(rows.slice(i, i + 500)).onConflictDoNothing();
  } else if (c.closure === "open" && rooms.length) {
    for (let i = 0; i < dates.length; i += 400) {
      await db
        .delete(closures)
        .where(and(inArray(closures.roomScope, rooms), inArray(closures.date, dates.slice(i, i + 400)), isNull(closures.bookingId)));
    }
  }
  return { days: dates.length, booked };
}
