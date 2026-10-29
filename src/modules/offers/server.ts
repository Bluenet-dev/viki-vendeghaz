// Az árajánlat modul szerveroldali logikája. Az árat KIZÁRÓLAG a közös árazómotor adja
// (computeQuote), az elérhetőséget a closures + a szobanyitási szabály.

import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray, like, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { offers } from "@/db/schema";
import { ROOM_SCOPES, isMeal, normalizeTarget, targetRooms, type Meal } from "@/lib/booking/constants";
import { addDays, diffDays, nightsOf, todayBudapest } from "@/lib/booking/dates";
import { COMBOS, computeQuote, type BookingData, type Party, type Quote } from "@/lib/booking/quote";
import { findNearestFreeWindows, getSettings, loadBookingData, type Settings } from "@/lib/booking/server";
import { siteUrl } from "@/lib/mail/send";
import { freshCheck } from "@/lib/ical/server";
import { applyOverrides, quoteInput, requestUrl, type OfferTotals } from "./pricing";
import { scopesToTarget, targetToScopes, type Extras, type OfferDraft, type OfferKind, type OfferLine, type Window } from "./types";
import { brandFrom, buildOfferView, type OfferView } from "./view";

export type Offer = typeof offers.$inferSelect;

// ─── Segédek ────────────────────────────────────────────────────────────────

export function partyOf(o: Pick<Offer, "adults" | "teens" | "children" | "infants">): Party {
  return { adults: o.adults, teens: o.teens, children: o.children, infants: o.infants };
}

export function payingGuests(p: Party): number {
  return p.adults + p.teens + p.children;
}

export function extrasOf(o: Offer): Extras {
  const e = (o.extras ?? {}) as Extras;
  return { saunaDays: Number(e.saunaDays) || 0, tubCount: Number(e.tubCount) || 0 };
}

export function draftOf(o: Offer, s: Settings): OfferDraft {
  return {
    party: partyOf(o),
    scope: scopesToTarget(o.roomScopes),
    packageSlug: o.packageSlug,
    extras: extrasOf(o),
    meal: isMeal(o.meal) ? o.meal : "nincs",
    mealGuests: o.mealGuests ?? payingGuests(partyOf(o)),
    overrides: (o.overrides ?? {}) as Record<string, number>,
    personalMessage: o.personalMessage ?? "",
    validDays: o.validDays ?? s.offerValidDays,
    kind: o.kind === "betelt" ? "betelt" : "ajanlat",
  };
}

// Az ajánlat időszakának árai és lezárásai. A saját (már elfogadott) foglalás napjai
// nem számítanak foglaltnak.
export async function offerData(o: { checkIn: string; checkOut: string; bookingId?: number | null }, s?: Settings): Promise<BookingData> {
  const data = await loadBookingData(o.checkIn, o.checkOut, s);
  if (o.bookingId) for (const [k, v] of [...data.closed]) if (v === o.bookingId) data.closed.delete(k);
  return data;
}

const AVAILABILITY = new Set(["closed", "whole_house_only", "not_released", "no_rate"]);

export function isAvailabilityProblem(q: Quote): boolean {
  return q.problems.some((p) => AVAILABILITY.has(p.kind));
}

// ─── Tervezet: mit ajánljunk? ───────────────────────────────────────────────
// A kért egység, ha szabad. Ha nem: szobák helyett az egész ház (vagy fordítva / két
// szoba). Ha semmi nem szabad: "betelt" levél a legközelebbi 2 szabad időszakkal.
export async function planDraft(
  req: { checkIn: string; checkOut: string; requested: string; party: Party; packageSlug: string | null; extras: Extras; meal: Meal; mealGuests: number },
  data: BookingData,
): Promise<{ scope: string; kind: OfferKind; alternatives: Window[] }> {
  const base = { party: req.party, meal: req.meal, mealGuests: req.mealGuests, packageSlug: req.packageSlug, extras: req.extras };
  const q = computeQuote(quoteInput(req, { ...base, scope: req.requested }), data);
  // A min. éjszaka és a csomag nem foglaltság – azt a tulajdonos a szerkesztőben rendezi.
  const blocking = q.problems.filter((p) => p.kind !== "min_nights" && p.kind !== "package");
  if (!blocking.length) return { scope: req.requested, kind: "ajanlat", alternatives: [] };

  const others = [...(req.requested === "egesz_haz" ? [] : ["egesz_haz"]), ...ROOM_SCOPES, ...COMBOS].filter((t) => t !== req.requested);
  const ok = others
    .map((scope) => computeQuote(quoteInput(req, { ...base, scope }), data))
    .filter((x) => x.ok && x.total != null);
  const house = ok.find((x) => x.scope === "egesz_haz");
  const pick = req.requested !== "egesz_haz" && house ? house : ok.sort((a, b) => a.total! - b.total!)[0];
  if (pick) return { scope: pick.scope, kind: "ajanlat", alternatives: [] };

  const alternatives = await findNearestFreeWindows(req.checkIn, diffDays(req.checkIn, req.checkOut), payingGuests(req.party), 2);
  return { scope: req.requested, kind: "betelt", alternatives };
}

// Tételek a motorból + kézi felülírások.
export function totalsFor(o: { checkIn: string; checkOut: string }, d: OfferDraft, data: BookingData): { quote: Quote; totals: OfferTotals } {
  const quote = computeQuote(quoteInput(o, d), data);
  return { quote, totals: applyOverrides(quote, d.overrides) };
}

// ─── Nézet (levél, PDF, weboldal) ───────────────────────────────────────────

export function acceptUrl(token: string): string {
  return `${siteUrl()}/ajanlat/${token}`;
}

export function requestUrlFor(w: Window, p: Party): string {
  return requestUrl(siteUrl(), w, p);
}

// A tárolt (elküldött) ajánlat nézete – az elmentett tételekkel, nem újraszámolva.
export function storedView(o: Offer, s: Settings): OfferView {
  return buildOfferView(
    {
      number: o.number,
      kind: o.kind === "betelt" ? "betelt" : "ajanlat",
      name: o.name,
      checkIn: o.checkIn,
      checkOut: o.checkOut,
      party: partyOf(o),
      scope: scopesToTarget(o.roomScopes),
      meal: isMeal(o.meal) ? o.meal : "nincs",
      mealGuests: o.mealGuests ?? payingGuests(partyOf(o)),
      lines: (o.lines ?? []) as OfferLine[],
      total: o.total,
      deposit: o.deposit,
      depositPercent: o.depositPercent ?? 0,
      personalMessage: o.personalMessage ?? "",
      validUntil: o.validUntil,
      validDays: o.validDays ?? s.offerValidDays,
      acceptUrl: acceptUrl(o.acceptToken),
      alternatives: (o.alternatives ?? []) as Window[],
      requestUrlFor: (w) => requestUrlFor(w, partyOf(o)),
    },
    brandFrom(s),
  );
}

// ─── Lekérdezések ───────────────────────────────────────────────────────────

export async function getOffer(id: number): Promise<Offer | null> {
  const [row] = await db.select().from(offers).where(eq(offers.id, id));
  return row ?? null;
}

export async function getOfferByToken(token: string): Promise<Offer | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [row] = await db.select().from(offers).where(eq(offers.acceptToken, token));
  return row ?? null;
}

export async function listOffers(): Promise<Offer[]> {
  return db.select().from(offers).orderBy(desc(offers.createdAt));
}

// Lejárt-e (az elküldött ajánlat érvényessége elmúlt). A napi cron ezt írja is.
export function isExpired(o: Pick<Offer, "status" | "validUntil">, today = todayBudapest()): boolean {
  return o.status === "lejart" || (o.status === "elkuldve" && o.validUntil != null && o.validUntil < today);
}

export function effectiveStatus(o: Offer, today = todayBudapest()): string {
  return isExpired(o, today) ? "lejart" : o.status;
}

// ─── Létrehozás ─────────────────────────────────────────────────────────────

function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23505" || err?.cause?.code === "23505";
}

async function nextNumber(): Promise<string> {
  const year = todayBudapest().slice(0, 4);
  const [row] = await db
    .select({ n: sql<number>`coalesce(max(substring(${offers.number} from 6)::int), 0)::int` })
    .from(offers)
    .where(like(offers.number, `${year}-%`));
  return `${year}-${String(Number(row.n) + 1).padStart(3, "0")}`;
}

export interface NewOffer {
  source: "weboldal" | "kezi";
  name: string;
  email: string | null;
  phone: string | null;
  checkIn: string;
  checkOut: string;
  party: Party;
  requested: string; // kanonikus cél ("egesz_haz" | "szoba-1" | "szoba-1,superior")
  packageSlug: string | null;
  extras: Extras;
  meal: Meal;
  mealGuests: number | null;
  message: string | null;
}

// Új ajánlatkérés: azonnal elkészül a tervezet (mit ajánlunk + tételek a motorból).
export async function createOffer(n: NewOffer): Promise<Offer> {
  const s = await getSettings();
  const data = await offerData(n, s);
  const mealGuests = n.mealGuests ?? payingGuests(n.party);
  const plan = await planDraft({ ...n, mealGuests }, data);
  const draft: OfferDraft = {
    party: n.party,
    scope: plan.scope,
    packageSlug: plan.scope === "egesz_haz" ? n.packageSlug : null,
    extras: n.extras,
    meal: n.meal,
    mealGuests,
    overrides: {},
    personalMessage: "",
    validDays: s.offerValidDays,
    kind: plan.kind,
  };
  const { quote, totals } = totalsFor(n, draft, data);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [row] = await db
        .insert(offers)
        .values({
          number: await nextNumber(),
          status: "uj",
          source: n.source,
          name: n.name,
          email: n.email,
          phone: n.phone,
          checkIn: n.checkIn,
          checkOut: n.checkOut,
          adults: n.party.adults,
          teens: n.party.teens,
          children: n.party.children,
          infants: n.party.infants,
          requestedScopes: targetToScopes(n.requested),
          roomScopes: targetToScopes(plan.scope),
          packageSlug: draft.packageSlug,
          extras: n.extras,
          meal: n.meal,
          mealGuests: n.meal === "nincs" ? null : mealGuests,
          message: n.message,
          request: { party: n.party, scope: n.requested, packageSlug: n.packageSlug, extras: n.extras, meal: n.meal, mealGuests: n.meal === "nincs" ? null : mealGuests },
          kind: plan.kind,
          alternatives: plan.alternatives,
          lines: totals.lines,
          overrides: {},
          total: totals.total,
          deposit: totals.deposit,
          depositPercent: totals.depositPercent,
          pricingRegime: quote.regime,
          validDays: s.offerValidDays,
          acceptToken: randomBytes(24).toString("base64url"),
        })
        .returning();
      return row;
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
    }
  }
  throw new Error("Nem sikerült ajánlatszámot adni.");
}

// ─── Szerkesztés ────────────────────────────────────────────────────────────

// A szerkesztő állapotának mentése – az árat a szerver számolja újra a motorral.
export async function saveDraft(o: Offer, d: OfferDraft, alternatives?: Window[]): Promise<OfferTotals> {
  const s = await getSettings();
  const data = await offerData(o, s);
  const { quote, totals } = totalsFor(o, d, data);
  await db
    .update(offers)
    .set({
      adults: d.party.adults,
      teens: d.party.teens,
      children: d.party.children,
      infants: d.party.infants,
      roomScopes: targetToScopes(d.scope),
      packageSlug: d.scope === "egesz_haz" ? d.packageSlug : null,
      extras: d.extras,
      meal: d.meal,
      mealGuests: d.meal === "nincs" ? null : d.mealGuests,
      overrides: d.overrides,
      lines: totals.lines,
      total: totals.total,
      deposit: totals.deposit,
      depositPercent: totals.depositPercent,
      pricingRegime: quote.regime,
      personalMessage: d.personalMessage || null,
      validDays: d.validDays,
      kind: d.kind,
      ...(alternatives ? { alternatives } : {}),
      updatedAt: new Date(),
    })
    .where(eq(offers.id, o.id));
  return totals;
}

export async function markSent(id: number, validDays: number): Promise<void> {
  const today = todayBudapest();
  await db
    .update(offers)
    .set({ status: "elkuldve", sentAt: new Date(), validUntil: addDays(today, validDays), updatedAt: new Date() })
    .where(eq(offers.id, id));
}

// mailed: ment-e levél a vendégnek (betelt levél vagy elutasító levél).
export async function markDeclined(id: number, message: string, mailed: boolean): Promise<void> {
  await db
    .update(offers)
    .set({ status: "elutasitva", declinedAt: new Date(), declineMessage: message, ...(mailed ? { sentAt: new Date() } : {}), updatedAt: new Date() })
    .where(eq(offers.id, id));
}

// ─── Elfogadás ──────────────────────────────────────────────────────────────

export type AcceptResult = { ok: true; bookingId: number } | { ok: false; reason: "busy" | "expired" | "state" };

function closurePairsJson(target: string, checkIn: string, checkOut: string): string {
  const rows: { scope: string; d: string }[] = [];
  for (const d of nightsOf(checkIn, checkOut)) for (const room of targetRooms(target)) rows.push({ scope: room, d });
  return JSON.stringify(rows);
}

// Az ajánlat elfogadása: foglalás ("Előlegre vár") + a napok lezárása EGYETLEN SQL
// utasításban. Csak elküldött (adminnál lejárt is) ajánlat fogadható el – a második
// kattintás már nem talál elfogadható ajánlatot, így nem jön létre még egy foglalás.
// Ha közben valaki lefoglalta a napot, a lezárás egyedi indexe az egészet visszagördíti.
export async function acceptOffer(o: Offer, by: "guest" | "admin"): Promise<AcceptResult> {
  const today = todayBudapest();
  if (by === "guest" && isExpired(o, today)) return { ok: false, reason: "expired" };
  if (!(o.status === "elkuldve" || (by === "admin" && o.status === "lejart"))) return { ok: false, reason: "state" };

  const target = normalizeTarget(scopesToTarget(o.roomScopes));
  if (!target) return { ok: false, reason: "state" };
  // Foglalás előtti friss iCal-ellenőrzés: a portálon közben megjelent foglalás a
  // lenti atomikus beszúrásnál ütközésként ("busy") jelentkezik.
  await freshCheck(target);
  const p = partyOf(o);
  const rows = closurePairsJson(target, o.checkIn, o.checkOut);
  const statusCond = by === "admin" ? sql`status IN ('elkuldve', 'lejart')` : sql`status = 'elkuldve' AND (valid_until IS NULL OR valid_until >= ${today})`;
  try {
    const res = await db.execute<{ id: number }>(sql`
      WITH uo AS (
        UPDATE offers SET status = 'elfogadva', accepted_at = now(), updated_at = now()
        WHERE id = ${o.id} AND ${statusCond}
        RETURNING id
      ), nb AS (
        INSERT INTO bookings (name, email, phone, room_scope, check_in, check_out, guests, meal, meal_guests,
                              total, deposit_amount, source, status, guest_message, note, accepted_at,
                              adults, teens, children, infants, package_slug, extras, lines, deposit_percent, pricing_regime)
        SELECT ${o.name}, ${o.email}, ${o.phone}, ${target}, ${o.checkIn}, ${o.checkOut}, ${payingGuests(p)},
               ${o.meal}, ${o.mealGuests}, ${o.total}, ${o.deposit}, 'ajanlat', 'elfogadva', ${o.message},
               ${`Ajánlat ${o.number}`}, now(), ${p.adults}, ${p.teens}, ${p.children}, ${p.infants}, ${o.packageSlug},
               ${o.extras ? JSON.stringify(o.extras) : null}::jsonb, ${o.lines ? JSON.stringify(o.lines) : null}::jsonb,
               ${o.depositPercent}, ${o.pricingRegime}
        FROM uo
        RETURNING id
      ), nc AS (
        INSERT INTO closures (room_scope, date, booking_id)
        SELECT c.scope, c.d, nb.id FROM nb
        CROSS JOIN jsonb_to_recordset(${rows}::jsonb) AS c(scope text, d date)
      )
      SELECT id FROM nb
    `);
    const bookingId = res.rows[0]?.id != null ? Number(res.rows[0].id) : null;
    if (bookingId == null) return { ok: false, reason: "state" };
    await db.update(offers).set({ bookingId }).where(eq(offers.id, o.id));
    return { ok: true, bookingId };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, reason: "busy" };
    throw e;
  }
}

// ─── Lejárat (napi cron) ────────────────────────────────────────────────────

export async function expireOffers(): Promise<number> {
  const rows = await db
    .update(offers)
    .set({ status: "lejart", updatedAt: new Date() })
    .where(and(eq(offers.status, "elkuldve"), lt(offers.validUntil, todayBudapest())))
    .returning({ id: offers.id });
  return rows.length;
}

export async function countNewOffers(): Promise<number> {
  return db.$count(offers, eq(offers.status, "uj"));
}

export async function offersByStatus(statuses: string[]): Promise<Offer[]> {
  return db.select().from(offers).where(inArray(offers.status, statuses)).orderBy(desc(offers.createdAt));
}

// Ajánlatból jött foglalás ajánlatszáma (az utalás közleményéhez).
export async function offerNumberForBooking(bookingId: number): Promise<string | undefined> {
  const [row] = await db.select({ number: offers.number }).from(offers).where(eq(offers.bookingId, bookingId));
  return row?.number;
}

// "Előleg megérkezett" → az ajánlat Foglalás állapotba lép.
export async function markOfferBooked(bookingId: number): Promise<void> {
  await db
    .update(offers)
    .set({ status: "foglalas", updatedAt: new Date() })
    .where(and(eq(offers.bookingId, bookingId), eq(offers.status, "elfogadva")));
}
