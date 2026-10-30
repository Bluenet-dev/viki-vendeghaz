import { NextRequest } from "next/server";
import { buildIcs } from "@/lib/ical/export";
import { exportTokenOf, loadExport, unitName } from "@/lib/ical/server";
import { tokensEqual } from "@/lib/ical/token";
import { isExportPlatform, isUnit } from "@/lib/ical/types";

export const dynamic = "force-dynamic";

// Titkos, egységenkénti és platformonkénti export: GET /api/ical/<egység>/<platform>/<token>.ics
// (egység: szoba-1 | szoba-2 | superior | egesz_haz). Bármilyen hiba → ugyanaz a 404.
const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_req: NextRequest, { params }: { params: Promise<{ unit: string; platform: string; token: string }> }) {
  const { unit, platform, token: rawToken } = await params;
  const token = rawToken.endsWith(".ics") ? rawToken.slice(0, -4) : rawToken;
  if (!isUnit(unit) || !isExportPlatform(platform) || token.length < 32) return notFound();
  if (!tokensEqual(await exportTokenOf(unit), token)) return notFound();

  const events = await loadExport(unit, platform);
  return new Response(buildIcs(unitName(unit), events), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" },
  });
}
