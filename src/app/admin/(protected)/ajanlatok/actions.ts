"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { isMeal, isTarget, normalizeTarget, type Meal } from "@/lib/booking/constants";
import { addDays, diffDays, isIsoDate, todayBudapest } from "@/lib/booking/dates";
import type { Party } from "@/lib/booking/quote";
import { findNearestFreeWindows, getSettings } from "@/lib/booking/server";
import { GMAIL_ERROR, MailError } from "@/lib/mail/send";
import { offersEnabled } from "@/modules/offers/flag";
import { sendAcceptanceMails, sendDeclineMail, sendOfferMail } from "@/modules/offers/mail";
import { acceptOffer, createOffer, getOffer, markDeclined, markSent, payingGuests, saveDraft } from "@/modules/offers/server";
import type { OfferDraft, Window } from "@/modules/offers/types";

export interface OfferActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}

async function guard(): Promise<void> {
  await requireAdmin();
  if (!offersEnabled()) throw new Error("Az árajánlat modul nincs bekapcsolva.");
}

function revalidateOffers(id?: number) {
  revalidatePath("/admin");
  revalidatePath("/admin/ajanlatok");
  if (id) revalidatePath(`/admin/ajanlatok/${id}`);
}

const count = (v: unknown, max = 12) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= max ? n : 0;
};

// A böngészőből jövő szerkesztő-állapot ellenőrzése (sosem bízunk benne vakon).
function cleanDraft(d: OfferDraft): OfferDraft | string {
  const party: Party = { adults: count(d.party?.adults), teens: count(d.party?.teens), children: count(d.party?.children), infants: count(d.party?.infants, 6) };
  if (party.adults < 1) return "Legalább egy felnőtt legyen.";
  const scope = normalizeTarget(d.scope);
  if (!scope) return "Válassza ki, mit ajánl (szoba vagy egész ház).";
  const overrides: Record<string, number> = {};
  for (const [k, v] of Object.entries(d.overrides ?? {})) {
    if (typeof k === "string" && k.length < 80 && Number.isInteger(v) && Math.abs(v) <= 10_000_000) overrides[k] = v;
  }
  const meal: Meal = isMeal(d.meal) ? d.meal : "nincs";
  return {
    party,
    scope,
    packageSlug: typeof d.packageSlug === "string" && d.packageSlug ? d.packageSlug.slice(0, 60) : null,
    extras: { saunaDays: count(d.extras?.saunaDays, 60), tubCount: count(d.extras?.tubCount, 120) },
    meal,
    mealGuests: Math.max(1, count(d.mealGuests, 18) || payingGuests(party)),
    overrides,
    personalMessage: String(d.personalMessage ?? "").slice(0, 3000),
    validDays: Math.min(60, Math.max(1, count(d.validDays, 60) || 3)),
    kind: d.kind === "betelt" ? "betelt" : "ajanlat",
  };
}

export async function saveOfferAction(id: number, draft: OfferDraft): Promise<OfferActionState> {
  await guard();
  const o = await getOffer(id);
  if (!o || o.status !== "uj") return { error: "Ez az ajánlat már nem szerkeszthető." };
  const d = cleanDraft(draft);
  if (typeof d === "string") return { error: d };
  await saveDraft(o, d);
  revalidateOffers(id);
  return { ok: true, message: "Elmentve. Később folytathatja." };
}

export async function sendOfferAction(id: number, draft: OfferDraft): Promise<OfferActionState> {
  await guard();
  const o = await getOffer(id);
  if (!o || o.status !== "uj") return { error: "Ez az ajánlat már el lett küldve." };
  if (!o.email) return { error: "A vendégnek nincs e-mail címe. Adja meg, vagy hívja fel." };
  const d = cleanDraft(draft);
  if (typeof d === "string") return { error: d };
  const totals = await saveDraft(o, d);
  if (d.kind === "ajanlat" && totals.total == null) return { error: "Erre az időszakra nincs ár a naptárban. Írja be kézzel a tételeket, vagy küldjön betelt levelet." };

  const fresh = (await getOffer(id))!;
  const s = await getSettings();
  try {
    // A levél és a PDF már a konkrét lejárati napot mutatja.
    await sendOfferMail({ ...fresh, validUntil: addDays(todayBudapest(), d.validDays) }, s);
  } catch (e) {
    return { error: e instanceof MailError ? e.message : GMAIL_ERROR };
  }
  // A betelt levél egyben válasz is – nincs mit elfogadni.
  if (d.kind === "betelt") await markDeclined(id, "Betelt levél, alternatív időpontokkal.", true);
  else await markSent(id, d.validDays);
  revalidateOffers(id);
  return { ok: true };
}

export async function declineOfferAction(id: number, message: string): Promise<OfferActionState> {
  await guard();
  const o = await getOffer(id);
  if (!o || o.status !== "uj") return { error: "Ez az ajánlat már nem utasítható el." };
  const text = String(message ?? "").trim().slice(0, 3000);
  if (!text) return { error: "Írjon pár sort a vendégnek." };
  if (o.email) {
    try {
      await sendDeclineMail(o, await getSettings(), text);
    } catch (e) {
      return { error: e instanceof MailError ? e.message : GMAIL_ERROR };
    }
  }
  await markDeclined(id, text, Boolean(o.email));
  revalidateOffers(id);
  return { ok: true };
}

export async function findAlternativesAction(id: number): Promise<Window[]> {
  await guard();
  const o = await getOffer(id);
  if (!o) return [];
  return findNearestFreeWindows(o.checkIn, diffDays(o.checkIn, o.checkOut), o.adults + o.teens + o.children, 2);
}

// "Elfogadta" – ha a vendég válaszlevélben vagy telefonon fogadta el. Ugyanaz történik,
// mint a levél gombjánál: foglalás (Előlegre vár), lezárt napok, foglaló-levél.
export async function adminAcceptOfferAction(_prev: OfferActionState, formData: FormData): Promise<OfferActionState> {
  await guard();
  const id = Number(formData.get("id"));
  const o = await getOffer(id);
  if (!o) return { error: "Az ajánlat nem található." };
  const res = await acceptOffer(o, "admin");
  if (!res.ok) {
    if (res.reason === "busy") return { error: "Közben valaki lefoglalta ezeket a napokat. Nézze meg a naptárt." };
    return { error: "Ez az ajánlat már nem fogadható el." };
  }
  await sendAcceptanceMails(o, await getSettings(), res.bookingId, false);
  revalidateOffers(id);
  revalidatePath("/admin/foglalasok", "layout");
  revalidatePath("/admin/naptar");
  redirect(`/admin/foglalasok/${res.bookingId}`);
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// Admin "Új ajánlat" (telefonos, e-mailes kérésből).
export async function createOfferAction(_prev: OfferActionState, formData: FormData): Promise<OfferActionState> {
  await guard();
  const name = str(formData, "name");
  const email = str(formData, "email");
  const checkIn = str(formData, "checkIn");
  const checkOut = str(formData, "checkOut");
  const scope = str(formData, "scope");
  const party: Party = {
    adults: count(str(formData, "adults")),
    teens: count(str(formData, "teens")),
    children: count(str(formData, "children")),
    infants: count(str(formData, "infants"), 6),
  };
  if (!name) return { error: "Adja meg a vendég nevét." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Az e-mail cím nem tűnik helyesnek." };
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) return { error: "Adja meg az érkezés és a távozás napját." };
  if (checkOut <= checkIn) return { error: "A távozás napja legyen későbbi, mint az érkezésé." };
  if (!isTarget(scope)) return { error: "Válassza ki, mit kér a vendég." };
  if (party.adults < 1) return { error: "Legalább egy felnőtt legyen." };

  const o = await createOffer({
    source: "kezi",
    name,
    email: email || null,
    phone: str(formData, "phone") || null,
    checkIn,
    checkOut,
    party,
    requested: scope,
    packageSlug: null,
    extras: { saunaDays: 0, tubCount: 0 },
    meal: "nincs",
    mealGuests: null,
    message: str(formData, "message") || null,
  });
  revalidateOffers();
  redirect(`/admin/ajanlatok/${o.id}`);
}
