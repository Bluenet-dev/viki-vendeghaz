"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { closures } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { ALL_SCOPES, ROOM_SCOPES, isScope, type Scope } from "@/lib/booking/constants";
import { diffDays, isIsoDate, todayBudapest } from "@/lib/booking/dates";
import { bulkFill, setRate, toggleClosure } from "@/lib/booking/server";

function assertEditable(date: string) {
  if (!isIsoDate(date)) throw new Error("Érvénytelen dátum.");
  if (date < todayBudapest()) throw new Error("Múltbeli nap nem szerkeszthető.");
}

// Visszaadja a foglalás azonosítóját, ha a nap foglaláshoz tartozik (akkor azt nyitjuk meg).
export async function toggleClosureAction(room: string, date: string): Promise<{ bookingId: number | null }> {
  await requireAdmin();
  assertEditable(date);
  const res = await toggleClosure(room, date);
  revalidatePath("/admin/naptar");
  revalidatePath("/admin");
  return { bookingId: res?.bookingId ?? null };
}

// "Csak egész ház" napon az egész ház cellája mindhárom szobát egyszerre zárja/oldja.
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
  revalidatePath("/admin/naptar");
  revalidatePath("/admin");
  return { bookingId: null };
}

export async function setRateAction(
  scope: string,
  date: string,
  field: "price" | "extraPersonPrice",
  raw: string,
): Promise<{ error?: string }> {
  await requireAdmin();
  assertEditable(date);
  if (!isScope(scope)) return { error: "Ismeretlen szoba." };
  if (field !== "price" && field !== "extraPersonPrice") return { error: "Ismeretlen mező." };
  const clean = raw.replace(/\s|Ft/gi, "");
  if (clean !== "" && !/^\d+$/.test(clean)) return { error: "Csak számot írjon (pl. 16000)." };
  await setRate(scope, date, field, clean === "" ? null : Number(clean));
  revalidatePath("/admin/naptar");
  return {};
}

export interface BulkState {
  ok?: boolean;
  message?: string;
  error?: string;
}

function optionalInt(v: FormDataEntryValue | null): number | null | "invalid" {
  const s = String(v ?? "").replace(/\s|Ft/gi, "");
  if (s === "") return null;
  return /^\d+$/.test(s) ? Number(s) : "invalid";
}

export async function bulkFillAction(_prev: BulkState, formData: FormData): Promise<BulkState> {
  await requireAdmin();
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  const scopeRaw = String(formData.get("scope") ?? "mind");
  if (!isIsoDate(from) || !isIsoDate(to)) return { error: "Adja meg a kezdő és a záró napot." };
  if (to < from) return { error: "A záró nap nem lehet korábbi a kezdőnél." };
  if (from < todayBudapest()) return { error: "Múltbeli nap nem módosítható." };
  if (diffDays(from, to) > 800) return { error: "Egyszerre legfeljebb kb. két évet lehet kitölteni." };

  const price = optionalInt(formData.get("price"));
  const extra = optionalInt(formData.get("extraPersonPrice"));
  const minNights = optionalInt(formData.get("minNights"));
  if (price === "invalid" || extra === "invalid" || minNights === "invalid") return { error: "Az árak és az éjszakák száma csak szám lehet." };
  if (minNights === 0) return { error: "A minimum éjszaka legalább 1." };

  const whole = String(formData.get("wholeHouseOnly") ?? "");
  const closure = String(formData.get("closure") ?? "");
  const scopes: Scope[] = scopeRaw === "mind" ? [...ALL_SCOPES] : isScope(scopeRaw) ? [scopeRaw] : [];
  if (!scopes.length) return { error: "Válassza ki a szobát." };

  const nothing = price == null && extra == null && minNights == null && !whole && !closure;
  if (nothing) return { error: "Töltsön ki legalább egy mezőt." };

  const res = await bulkFill({
    from,
    to,
    scopes,
    price,
    extraPersonPrice: extra,
    minNights,
    wholeHouseOnly: whole === "igen" ? true : whole === "nem" ? false : null,
    closure: closure === "close" ? "close" : closure === "open" ? "open" : null,
  });
  revalidatePath("/admin/naptar");
  revalidatePath("/admin");
  return {
    ok: true,
    message:
      `${res.days} nap frissítve.` +
      (res.skippedBooked ? ` ${res.skippedBooked} foglalt nap zárva maradt, mert foglaláshoz tartozik.` : ""),
  };
}
