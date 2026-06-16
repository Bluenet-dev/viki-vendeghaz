import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { availability, icalSources } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { fetchAndParseIcal } from "@/lib/ical-import";

// Admin jelszóval védett endpoint – admin gombból hívható
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
    try {
      const events = await fetchAndParseIcal(source.url);

      // Töröljük a régi importált bejegyzéseket ehhez a szobához/forráshoz
      await db
        .delete(availability)
        .where(
          and(
            eq(availability.roomSlug, source.roomSlug),
            eq(availability.source, source.name)
          )
        );

      // Írjuk be az újakat
      for (const event of events) {
        await db.insert(availability).values({
          roomSlug: source.roomSlug,
          date: event.date,
          status: "blocked",
          source: source.name,
          note: event.summary,
        }).onConflictDoNothing();
      }

      // lastFetched frissítés
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
