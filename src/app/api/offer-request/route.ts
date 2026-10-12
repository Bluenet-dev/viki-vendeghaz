import { NextRequest, NextResponse } from "next/server";
import { isMeal, isTarget } from "@/lib/booking/constants";
import { diffDays, isIsoDate, todayBudapest } from "@/lib/booking/dates";
import type { Party } from "@/lib/booking/quote";
import { getSettings } from "@/lib/booking/server";
import { offersEnabled } from "@/modules/offers/flag";
import { sendRequestReceivedMails } from "@/modules/offers/mail";
import { createOffer } from "@/modules/offers/server";

// Weboldalas ajánlatkérés: azonnal elkészül a tervezet (Új állapot), a tulajdonos
// értesítőt, a vendég "Megkaptuk a kérését" levelet kap.
export async function POST(req: NextRequest) {
  if (!offersEnabled()) return NextResponse.json({ error: "Nem található." }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Hibás kérés." }, { status: 400 });
  }
  // Honeypot: ember nem tölti ki.
  if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ ok: true });

  const name = String(body.name ?? "").trim().slice(0, 120);
  const email = String(body.email ?? "").trim().slice(0, 200);
  const phone = String(body.phone ?? "").trim().slice(0, 40);
  const message = String(body.message ?? "").trim().slice(0, 2000);
  const { checkIn, checkOut, scope, meal } = body;
  const count = (v: unknown, max = 12) => (Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= max ? Number(v) : NaN);
  const p = (body.party ?? {}) as Record<string, unknown>;
  const party: Party = { adults: count(p.adults), teens: count(p.teens), children: count(p.children), infants: count(p.infants, 6) };
  const guests = party.adults + party.teens + party.children;
  const ex = (body.extras ?? {}) as Record<string, unknown>;

  if (!name) return NextResponse.json({ error: "Kérjük, adja meg a nevét." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Kérjük, adjon meg érvényes e-mail címet." }, { status: 400 });
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut) || checkOut <= checkIn) {
    return NextResponse.json({ error: "Kérjük, adja meg az érkezés és a távozás napját." }, { status: 400 });
  }
  if (checkIn <= todayBudapest()) return NextResponse.json({ error: "Az érkezés legkorábban holnap lehet." }, { status: 400 });
  if (diffDays(checkIn, checkOut) > 30) return NextResponse.json({ error: "30 éjszakánál hosszabb tartózkodásra kérjük, hívjon minket." }, { status: 400 });
  if (!Number.isInteger(guests) || party.adults < 1 || guests > 12) return NextResponse.json({ error: "Kérjük, adja meg a vendégek számát (legfeljebb 12 fő)." }, { status: 400 });
  if (!isTarget(scope)) return NextResponse.json({ error: "Válassza ki, hol szállnának meg." }, { status: 400 });

  const m = isMeal(meal) ? meal : "nincs";
  const offer = await createOffer({
    source: "weboldal",
    name,
    email,
    phone: phone || null,
    checkIn,
    checkOut,
    party,
    requested: scope,
    packageSlug: scope === "egesz_haz" && typeof body.packageSlug === "string" && body.packageSlug ? body.packageSlug.slice(0, 60) : null,
    extras: { saunaDays: scope === "egesz_haz" ? count(ex.saunaDays, 60) || 0 : 0, tubCount: count(ex.tubCount, 120) || 0 },
    meal: m,
    mealGuests: m === "nincs" ? null : Math.max(1, count(body.mealGuests, 18) || guests),
    message: message || null,
  });

  // Levelek: hibájuk nem akaszthatja meg a kérést.
  try {
    await sendRequestReceivedMails(offer, await getSettings());
  } catch (e) {
    console.error("Ajánlatkérés levél hiba:", e);
  }
  return NextResponse.json({ ok: true });
}
