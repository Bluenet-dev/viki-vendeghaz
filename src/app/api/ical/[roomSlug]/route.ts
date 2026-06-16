import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { availability, rooms } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { generateIcs } from "@/lib/ical-export";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomSlug: string }> }
) {
  const { roomSlug } = await params;

  // Szoba neve
  const [room] = await db.select({ name: rooms.name }).from(rooms).where(eq(rooms.slug, roomSlug));
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Foglalt/blokkolt napok
  const blocked = await db
    .select({ date: availability.date, note: availability.note })
    .from(availability)
    .where(
      and(
        eq(availability.roomSlug, roomSlug),
        eq(availability.status, "blocked")
      )
    );

  const ics = generateIcs(room.name, blocked);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${roomSlug}.ics"`,
      "Cache-Control": "no-cache",
    },
  });
}
