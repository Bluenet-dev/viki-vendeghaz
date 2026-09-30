import { NextRequest, NextResponse } from "next/server";
import { isMeal, isTarget } from "@/lib/booking/constants";
import { isIsoDate, todayBudapest } from "@/lib/booking/dates";
import { computeQuote } from "@/lib/booking/quote";
import { createBooking, getBooking, getSettings, loadBookingData } from "@/lib/booking/server";
import { OWNER_EMAIL, sendViaResend, siteUrl } from "@/lib/mail/send";
import { guestReceivedMail, ownerNewRequestMail } from "@/lib/mail/templates";

// Weboldalas foglalási kérés. Az árat és az elérhetőséget a szerver számolja
// újra – a kliens csak a választást küldi, az általa látott ár nem mérvadó.
// A napok itt NEM zárnak le; a tulajdonos visszaigazolásakor zárulnak.
export async function POST(req: NextRequest) {
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
  const { scope, checkIn, checkOut, meal } = body;
  const guests = Number(body.guests);
  const mealGuests = Number(body.mealGuests);

  if (!name) return NextResponse.json({ error: "Kérjük, adja meg a nevét." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Kérjük, adjon meg érvényes e-mail címet." }, { status: 400 });
  if (!isTarget(scope) || !isIsoDate(checkIn) || !isIsoDate(checkOut) || !Number.isInteger(guests) || guests < 1) {
    return NextResponse.json({ error: "Hiányos foglalási adatok. Kérjük, kezdje újra a keresést." }, { status: 400 });
  }
  if (checkIn <= todayBudapest()) return NextResponse.json({ error: "Az érkezés legkorábban holnap lehet." }, { status: 400 });

  const m = isMeal(meal) ? meal : "nincs";
  const data = await loadBookingData(checkIn, checkOut);
  const quote = computeQuote({ scope, checkIn, checkOut, guests, meal: m, mealGuests: Number.isFinite(mealGuests) ? mealGuests : guests }, data);

  if (!quote.ok) {
    const closed = quote.problems.some((p) => p.kind === "closed");
    return NextResponse.json(
      {
        error: closed
          ? "Sajnos ez az időpont közben betelt. Kérjük, válasszon másik időpontot."
          : "Ez az időszak így nem foglalható. Kérjük, kezdje újra a keresést.",
        code: closed ? "busy" : "invalid",
      },
      { status: 409 },
    );
  }

  const res = await createBooking(
    {
      name,
      email,
      phone: phone || null,
      scope,
      checkIn,
      checkOut,
      guests,
      meal: m,
      mealGuests: m === "nincs" ? null : quote.mealGuests,
      total: quote.total,
      source: "weboldal",
      status: "valaszra_var",
      guestMessage: message || null,
    },
    false,
  );
  if (!res.ok) return NextResponse.json({ error: "Nem sikerült elmenteni. Kérjük, hívjon minket." }, { status: 500 });

  // Levelek: hibájuk nem akaszthatja meg a kérést.
  const [b, s] = await Promise.all([getBooking(res.id), getSettings()]);
  if (b) {
    const owner = ownerNewRequestMail(b, s, `${siteUrl()}/admin/foglalasok/${b.id}`);
    await Promise.all([sendViaResend({ ...owner, to: OWNER_EMAIL }), sendViaResend(guestReceivedMail(b, s))]);
  }

  return NextResponse.json({ ok: true });
}
