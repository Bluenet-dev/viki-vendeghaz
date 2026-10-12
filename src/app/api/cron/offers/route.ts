import { NextRequest, NextResponse } from "next/server";
import { expireOffers } from "@/modules/offers/server";

// Napi Vercel cron: a lejárt, elküldött ajánlatok "Lejárt" állapotba kerülnek.
// Automatikus emlékeztető a vendégnek nincs. Ha a CRON_SECRET be van állítva, a
// Vercel ezt küldi a fejlécben – más nem futtathatja.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Nincs jogosultság." }, { status: 401 });
  }
  const expired = await expireOffers();
  return NextResponse.json({ ok: true, expired });
}
