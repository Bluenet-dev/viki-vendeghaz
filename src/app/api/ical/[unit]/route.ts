import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { closures, rooms } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { generateIcs } from "@/lib/ical-export";

// RÉGI, token nélküli export (/api/ical/<szoba-slug>) – csak azért marad, hogy egy
// esetleg már beillesztett portál-link ne álljon le. Az új, titkos, platformonkénti
// feed: /api/ical/<unitId>/<platform>/<token>.ics (Naptár-szinkron panel).
// Visszhang ellen az iCal-importból származó napokat nem adja ki, és belső
// megjegyzés sem kerül a feedbe (a SUMMARY mindig "Foglalt").
export async function GET(_req: NextRequest, { params }: { params: Promise<{ unit: string }> }) {
  const { unit: roomSlug } = await params;

  const [room] = await db.select({ name: rooms.name }).from(rooms).where(eq(rooms.slug, roomSlug));
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const blocked = await db
    .select({ date: closures.date })
    .from(closures)
    .where(and(eq(closures.roomScope, roomSlug), isNull(closures.externalBlockId)));

  const ics = generateIcs(room.name, blocked);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${roomSlug}.ics"`,
      "Cache-Control": "no-cache",
    },
  });
}
