// Szerveroldali adatbetöltés és módosítások a v2 foglaláskezeléshez.
// Az ütközésvédelem a closures (room_scope, date) egyedi indexén múlik: a foglalás
// és a lezárásai egyetlen SQL utasításban jönnek létre, így két egyidejű kérés
// sem tud ugyanarra a napra bekerülni.

import { and, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, closures, dayRates, settings } from "@/db/schema";
import { ALL_SCOPES, ROOM_SCOPES, scopeRooms, targetRooms, type Meal, type Scope, type Source, type Status, type Target } from "./constants";
import { addDays, nightsOf, todayBudapest } from "./dates";
import { closedNights, computeQuote, rateKey, searchOptions, type BookingData, type Quote, type RateRow } from "./quote";

export type Settings = typeof settings.$inferSelect;
export type Booking = typeof bookings.$inferSelect;

export async function getSettings(): Promise<Settings> {
  const [row] = await db.select().from(settings).limit(1);
  if (row) return row;
  const [created] = await db.insert(settings).values({}).returning();
  return created;
}

export async function loadBookingData(from: string, to: string, s?: Settings): Promise<BookingData> {
  const [rateRows, closureRows, st] = await Promise.all([
    db
      .select({
        roomScope: dayRates.roomScope,
        date: dayRates.date,
        price: dayRates.price,
        extraPersonPrice: dayRates.extraPersonPrice,
        minNights: dayRates.minNights,
        wholeHouseOnly: dayRates.wholeHouseOnly,
      })
      .from(dayRates)
      .where(and(gte(dayRates.date, from), lte(dayRates.date, to))),
    db
      .select({ roomScope: closures.roomScope, date: closures.date, bookingId: closures.bookingId })
      .from(closures)
      .where(and(gte(closures.date, from), lte(closures.date, to))),
    s ? Promise.resolve(s) : getSettings(),
  ]);

  const rates = new Map<string, RateRow>();
  for (const r of rateRows) rates.set(rateKey(r.roomScope, r.date), r);
  const closed = new Map<string, number | null>();
  for (const c of closureRows) closed.set(rateKey(c.roomScope, c.date), c.bookingId);
  return { rates, closed, settings: st };
}

export async function quoteFor(input: {
  scope: Target;
  checkIn: string;
  checkOut: string;
  guests: number;
  meal?: Meal;
  mealGuests?: number;
}): Promise<Quote> {
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

function closureArrays(scope: Target, checkIn: string, checkOut: string) {
  const scopes: string[] = [];
  const dates: string[] = [];
  for (const d of nightsOf(checkIn, checkOut)) {
    for (const room of targetRooms(scope)) {
      scopes.push(room);
      dates.push(d);
    }
  }
  return { scopes, dates };
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
      })
      .returning({ id: bookings.id });
    return { ok: true, id: row.id };
  }

  const busy = await busyDates(b.scope, b.checkIn, b.checkOut);
  if (busy.length) return { ok: false, error: "busy", busy };

  const { scopes, dates } = closureArrays(b.scope, b.checkIn, b.checkOut);
  const acceptedAt = b.status === "valaszra_var" ? null : new Date().toISOString();
  try {
    const res = await db.execute<{ id: number }>(sql`
      WITH nb AS (
        INSERT INTO bookings (name, email, phone, room_scope, check_in, check_out, guests, meal, meal_guests,
                              total, deposit_amount, source, status, guest_message, note, accepted_at)
        VALUES (${b.name}, ${b.email || null}, ${b.phone || null}, ${b.scope}, ${b.checkIn}, ${b.checkOut},
                ${b.guests}, ${b.meal}, ${b.mealGuests}, ${b.total}, ${b.depositAmount ?? null}, ${b.source},
                ${b.status}, ${b.guestMessage || null}, ${b.note || null}, ${acceptedAt})
        RETURNING id
      ), nc AS (
        INSERT INTO closures (room_scope, date, booking_id)
        SELECT c.scope, c.d, nb.id FROM nb
        CROSS JOIN unnest(${scopes}::text[], ${dates}::date[]) AS c(scope, d)
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
  const deposit = b.depositAmount ?? (b.total != null ? Math.round((b.total * s.depositPercent) / 100) : null);
  const { scopes, dates } = closureArrays(scope, b.checkIn, b.checkOut);
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
      CROSS JOIN unnest(${scopes}::text[], ${dates}::date[]) AS c(scope, d)
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

export async function setRate(scope: Scope, date: string, field: "price" | "extraPersonPrice", value: number | null): Promise<void> {
  await db
    .insert(dayRates)
    .values({ roomScope: scope, date, [field]: value })
    .onConflictDoUpdate({ target: [dayRates.roomScope, dayRates.date], set: { [field]: value } });
}

export interface BulkFill {
  from: string;
  to: string;
  scopes: Scope[];
  price?: number | null;
  extraPersonPrice?: number | null;
  minNights?: number | null;
  wholeHouseOnly?: boolean | null;
  closure?: "close" | "open" | null;
}

// Csak a kitöltött mezők íródnak felül; a feloldás foglaláshoz tartozó napot nem érint.
export async function bulkFill(f: BulkFill): Promise<{ days: number; skippedBooked: number }> {
  const days = nightsOf(f.from, addDays(f.to, 1));
  const set: Partial<typeof dayRates.$inferInsert> = {};
  if (f.price !== undefined && f.price !== null) set.price = f.price;
  if (f.extraPersonPrice !== undefined && f.extraPersonPrice !== null) set.extraPersonPrice = f.extraPersonPrice;
  if (f.minNights !== undefined && f.minNights !== null) set.minNights = f.minNights;
  if (f.wholeHouseOnly !== undefined && f.wholeHouseOnly !== null) set.wholeHouseOnly = f.wholeHouseOnly;

  if (Object.keys(set).length) {
    const rows = f.scopes.flatMap((scope) => days.map((date) => ({ roomScope: scope, date, ...set })));
    for (let i = 0; i < rows.length; i += 500) {
      await db
        .insert(dayRates)
        .values(rows.slice(i, i + 500))
        .onConflictDoUpdate({ target: [dayRates.roomScope, dayRates.date], set });
    }
  }

  let skippedBooked = 0;
  const rooms = Array.from(new Set(f.scopes.flatMap((s) => scopeRooms(s))));
  if (f.closure === "close" && rooms.length) {
    const rows = rooms.flatMap((room) => days.map((date) => ({ roomScope: room, date, note: "Kézi lezárás" })));
    for (let i = 0; i < rows.length; i += 500) await db.insert(closures).values(rows.slice(i, i + 500)).onConflictDoNothing();
  } else if (f.closure === "open" && rooms.length) {
    const range = and(inArray(closures.roomScope, rooms), gte(closures.date, f.from), lte(closures.date, f.to));
    skippedBooked = await db.$count(closures, and(range, sql`${closures.bookingId} is not null`));
    await db.delete(closures).where(and(range, isNull(closures.bookingId)));
  }
  return { days: days.length, skippedBooked };
}
