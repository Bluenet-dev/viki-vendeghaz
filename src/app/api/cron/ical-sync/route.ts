import { NextRequest, NextResponse } from "next/server";
import { syncAllFeeds } from "@/lib/ical/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 15 percenkénti Vercel cron: minden aktív portál-feed lehúzása és reconcile-ja.
// Csak az "Authorization: Bearer <CRON_SECRET>" fejléccel fut (a Vercel cron ezt
// küldi); enélkül – vagy ha nincs beállítva a titok – 401.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Nincs jogosultság." }, { status: 401 });
  }
  const results = await syncAllFeeds();
  return NextResponse.json({
    ok: true,
    feeds: results.length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
