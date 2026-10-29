import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { buildIcs } from "@/lib/ical/export";
import { loadExport } from "@/lib/ical/server";
import { tokensEqual } from "@/lib/ical/token";
import { isExportPlatform } from "@/lib/ical/types";

export const dynamic = "force-dynamic";

// Titkos, platformonkénti export: GET /api/ical/<unitId>/<platform>/<token>.ics
// Bármilyen hiba (ismeretlen egység, platform vagy token) → ugyanaz a 404, hogy ne
// derüljön ki, létezik-e az egység.
const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_req: NextRequest, { params }: { params: Promise<{ unit: string; platform: string; token: string }> }) {
  const { unit, platform, token: rawToken } = await params;
  const token = rawToken.endsWith(".ics") ? rawToken.slice(0, -4) : rawToken;
  const unitId = Number(unit);
  if (!/^\d+$/.test(unit) || !Number.isSafeInteger(unitId) || !isExportPlatform(platform) || token.length < 32) return notFound();

  const [room] = await db
    .select({ id: rooms.id, slug: rooms.slug, name: rooms.name, token: rooms.icalExportToken })
    .from(rooms)
    .where(eq(rooms.id, unitId));
  if (!room || !tokensEqual(room.token, token)) return notFound();

  const events = await loadExport(room, platform);
  return new Response(buildIcs(room.name, events), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
