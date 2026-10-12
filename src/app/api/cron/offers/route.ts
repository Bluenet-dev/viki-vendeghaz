import { NextRequest, NextResponse } from "next/server";
import { expireOffers } from "@/modules/offers/server";

// Napi Vercel cron: a lejárt, elküldött ajánlatok "Lejárt" állapotba kerülnek.
// Automatikus emlékeztető a vendégnek nincs. Csak az "Authorization: Bearer <CRON_SECRET>"
// fejléccel fut (a Vercel cron ezt küldi); enélkül – vagy ha nincs beállítva a titok – 401.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Nincs jogosultság." }, { status: 401 });
  }
  const expired = await expireOffers();
  return NextResponse.json({ ok: true, expired });
}
