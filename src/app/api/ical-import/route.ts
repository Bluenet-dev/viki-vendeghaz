import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { closures, icalSources } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { fetchAndParseIcal } from "@/lib/ical-import";

// Admin jelszóval védett endpoint. Az iCal-szinkron jelenleg szándékosan inaktív
// (nincs rá gomb az adminban); ha aktiválják, a closures táblába ír.
export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sources = await db
    .select()
    .from(icalSources)
    .where(eq(icalSources.active, true));

  const results: string[] = [];

  for (const source of sources) {
    const note = `iCal: ${source.name}`;
    try {
      const events = await fetchAndParseIcal(source.url);

      // A korábban ebből a forrásból importált (foglaláshoz nem kötött) napok törlése
      await db
        .delete(closures)
        .where(and(eq(closures.roomScope, source.roomSlug), eq(closures.note, note), isNull(closures.bookingId)));

      for (const event of events) {
        await db
          .insert(closures)
          .values({ roomScope: source.roomSlug, date: event.date, note })
          .onConflictDoNothing();
      }

      await db
        .update(icalSources)
        .set({ lastFetched: new Date() })
        .where(eq(icalSources.id, source.id));

      results.push(`OK: ${source.name} – ${events.length} nap importálva`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push(`ERR: ${source.name} – ${msg.slice(0, 80)}`);
    }
  }

  return NextResponse.json({ results });
}
