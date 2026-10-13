"use server";

// A naptár műveletei. Szándékosan NINCS revalidatePath: az oldal újrarenderelése a
// görgetést a tetejére ugratná. A cellák a böngészőben azonnal (optimistán) frissülnek;
// a "Több nap beállítása" után a kliens maga kér frissítést, a görgetés megtartásával.
// Az admin oldalak force-dynamic-ok, így más oldalra lépve mindig friss adat jön.

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { closures, tariffs } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { ALL_SCOPES, MAX_GUESTS, ROOM_SCOPES, isScope, type Scope } from "@/lib/booking/constants";
import { isIsoDate, todayBudapest } from "@/lib/booking/dates";
import { applyToDays, bookedDaysAmong, setDayPrice, toggleClosure } from "@/lib/booking/server";

function assertEditable(date: string) {
  if (!isIsoDate(date)) throw new Error("Érvénytelen dátum.");
  if (date < todayBudapest()) throw new Error("Múltbeli nap nem szerkeszthető.");
}

// Visszaadja a foglalás azonosítóját, ha a nap foglaláshoz tartozik (akkor azt nyitjuk meg).
export async function toggleClosureAction(room: string, date: string): Promise<{ bookingId: number | null }> {
  await requireAdmin();
  assertEditable(date);
  const res = await toggleClosure(room, date);
  return { bookingId: res?.bookingId ?? null };
}

// Szobánként nem foglalható napon az egész ház cellája mindhárom szobát egyszerre zárja/oldja.
export async function toggleHouseAction(date: string): Promise<{ bookingId: number | null }> {
  await requireAdmin();
  assertEditable(date);
  const rows = await db.select().from(closures).where(and(eq(closures.date, date), inArray(closures.roomScope, [...ROOM_SCOPES])));
  const booked = rows.find((r) => r.bookingId);
  if (booked) return { bookingId: booked.bookingId };
  if (rows.length === ROOM_SCOPES.length) {
    await db.delete(closures).where(and(eq(closures.date, date), inArray(closures.roomScope, [...ROOM_SCOPES])));
  } else {
    await db
      .insert(closures)
      .values(ROOM_SCOPES.map((room) => ({ roomScope: room, date, note: "Kézi lezárás" })))
      .onConflictDoNothing();
  }
  return { bookingId: null };
}

function allowedGuests(scope: Scope): number[] {
  return scope === "egesz_haz" ? [8, 9, 10, 11, 12] : Array.from({ length: MAX_GUESTS[scope] }, (_, i) => i + 1);
}

// "18 000", "18000 Ft" → 18000; üres vagy hibás → null
function parsePrice(raw: string): number | null {
  const clean = String(raw ?? "").replace(/\s|ft/gi, "");
  return /^\d{1,7}$/.test(clean) ? Number(clean) : null;
}

// Egy cella ára.
export async function setDayPriceAction(scope: string, date: string, guests: number, raw: string): Promise<{ error?: string; price?: number }> {
  await requireAdmin();
  assertEditable(date);
  if (!isScope(scope)) return { error: "Ismeretlen szoba." };
  if (!allowedGuests(scope).includes(guests)) return { error: "Ismeretlen létszám." };
  const price = parsePrice(raw);
  if (price == null) return { error: "Csak számot írjon be." };
  await setDayPrice(scope, date, guests, price);
  return { price };
}

// ─── Több nap beállítása ────────────────────────────────────────────────────

export interface DaysInput {
  dates: string[];
  scopes: string[];
  mode: "prices" | "tariff" | "close" | "open" | null;
  prices?: { scope: string; guests: number; value: string }[];
  tariff?: string | null;
  minNights?: string;
  label?: string;
  clearLabel?: boolean;
}

type Clean = {
  dates: string[];
  scopes: Scope[];
  prices: { scope: Scope; guests: number; price: number }[];
  tariff: string | null;
  closure: "close" | "open" | null;
  minNights: number | null;
  label: string | null;
};

async function clean(input: DaysInput): Promise<Clean | { error: string }> {
  const today = todayBudapest();
  const dates = Array.from(new Set((input.dates ?? []).filter((d) => isIsoDate(d) && d >= today))).sort();
  if (!dates.length) return { error: "Válasszon ki legalább egy mai vagy későbbi napot." };
  if (dates.length > 800) return { error: "Egyszerre legfeljebb kb. két évet lehet beállítani." };
  const scopes = (input.scopes ?? []).filter(isScope);
  if (!scopes.length) return { error: "Jelölje be, melyik szállásra vonatkozik." };

  const prices: Clean["prices"] = [];
  if (input.mode === "prices") {
    for (const p of input.prices ?? []) {
      if (!String(p.value ?? "").trim()) continue; // üres = nem változik
      if (!isScope(p.scope) || !scopes.includes(p.scope) || !allowedGuests(p.scope).includes(p.guests)) continue;
      const price = parsePrice(p.value);
      if (price == null) return { error: "Az árakhoz csak számot írjon (pl. 18 000)." };
      prices.push({ scope: p.scope, guests: p.guests, price });
    }
  }

  let tariff: string | null = null;
  if (input.mode === "tariff") {
    const code = String(input.tariff ?? "").toUpperCase();
    const [t] = code ? await db.select({ code: tariffs.code }).from(tariffs).where(eq(tariffs.code, code)) : [];
    if (!t) return { error: "Válasszon egy árlistát." };
    tariff = t.code;
  }

  let minNights: number | null = null;
  const mn = String(input.minNights ?? "").trim();
  if (mn) {
    if (!/^\d{1,2}$/.test(mn) || Number(mn) < 1) return { error: "Az éjszakák száma 1 és 99 közötti szám legyen." };
    minNights = Number(mn);
  }
  const name = String(input.label ?? "").trim().slice(0, 40);
  const label = input.clearLabel ? "" : name || null;

  const closure = input.mode === "close" ? "close" : input.mode === "open" ? "open" : null;
  if (input.mode === "prices" && !prices.length && minNights == null && label == null) return { error: "Írjon be legalább egy árat." };
  if (!input.mode && minNights == null && label == null) return { error: "Válassza ki, mit szeretne beállítani." };
  return { dates, scopes, prices, tariff, closure, minNights, label };
}

// Az összefoglalóhoz: hány nap, és hányon van már foglalás.
export async function previewDaysAction(input: Pick<DaysInput, "dates" | "scopes">): Promise<{ days: number; booked: number }> {
  await requireAdmin();
  const today = todayBudapest();
  const dates = (input.dates ?? []).filter((d) => isIsoDate(d) && d >= today).slice(0, 800);
  const scopes = (input.scopes ?? []).filter(isScope);
  return { days: dates.length, booked: await bookedDaysAmong(dates, scopes.length ? scopes : [...ALL_SCOPES]) };
}

export async function applyDaysAction(input: DaysInput): Promise<{ ok?: boolean; message?: string; error?: string }> {
  await requireAdmin();
  const c = await clean(input);
  if ("error" in c) return { error: c.error };
  const res = await applyToDays({
    dates: c.dates,
    scopes: c.scopes,
    prices: c.prices,
    tariff: c.tariff,
    closure: c.closure,
    minNights: c.minNights,
    label: c.label,
  });
  let message = `Elmentve, ${res.days} nap módosult.`;
  if (res.booked) {
    const one = res.booked === 1;
    message +=
      c.closure === "open"
        ? ` ${res.booked} napon foglalás van, ${one ? "ez zárva maradt" : "ezek zárva maradtak"}.`
        : c.closure === "close"
          ? ` ${res.booked} napon már foglalás volt, ${one ? "ez eddig is zárva volt" : "ezek eddig is zárva voltak"}.`
          : ` ${res.booked} napon már van foglalás, ${one ? "ennél" : "ezeknél"} a meglévő foglalás összege nem változott.`;
  }
  return { ok: true, message };
}
