import { db } from "@/db";
import { availability, rooms, icalSources } from "@/db/schema";
import { asc, eq, and, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Naptár & elérhetőség" };

async function blockDate(formData: FormData) {
  "use server";
  const roomSlug = String(formData.get("roomSlug"));
  const date = String(formData.get("date"));
  const note = String(formData.get("note") || "Manuálisan zárva");

  // Ha már létezik, update; ha nem, insert
  const existing = await db
    .select()
    .from(availability)
    .where(and(eq(availability.roomSlug, roomSlug), eq(availability.date, date)));

  if (existing.length > 0) {
    await db
      .update(availability)
      .set({ status: "blocked", note, source: "manual" })
      .where(and(eq(availability.roomSlug, roomSlug), eq(availability.date, date)));
  } else {
    await db.insert(availability).values({ roomSlug, date, status: "blocked", source: "manual", note });
  }
  revalidatePath("/admin/naptar");
}

async function unblockDate(formData: FormData) {
  "use server";
  const roomSlug = String(formData.get("roomSlug"));
  const date = String(formData.get("date"));
  await db
    .delete(availability)
    .where(and(eq(availability.roomSlug, roomSlug), eq(availability.date, date)));
  revalidatePath("/admin/naptar");
}

async function syncIcal(formData: FormData) {
  "use server";
  const password = process.env.ADMIN_PASSWORD!;
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/ical-import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  revalidatePath("/admin/naptar");
}

export default async function AdminNaptarPage() {
  const allRooms = await db.select().from(rooms).where(eq(rooms.active, true)).orderBy(asc(rooms.sortOrder));
  const sources = await db.select().from(icalSources).orderBy(asc(icalSources.roomSlug));

  // Mai naptól 90 napig
  const today = new Date().toISOString().slice(0, 10);
  const future = new Date();
  future.setDate(future.getDate() + 90);
  const futureStr = future.toISOString().slice(0, 10);

  const blocked = await db
    .select()
    .from(availability)
    .where(and(eq(availability.status, "blocked"), gte(availability.date, today)));

  const blockedByRoom: Record<string, typeof blocked> = {};
  for (const b of blocked) {
    if (!blockedByRoom[b.roomSlug]) blockedByRoom[b.roomSlug] = [];
    blockedByRoom[b.roomSlug].push(b);
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-display font-semibold">Naptár & elérhetőség</h1>
        <form action={syncIcal}>
          <button type="submit" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm rounded-lg transition-colors">
            ↻ iCal szinkron most
          </button>
        </form>
      </div>

      {/* Dátum zárás */}
      <div className="border border-gray-800 rounded-xl p-5 mb-8">
        <h2 className="text-sm font-medium text-gray-300 mb-4">Dátum manuális zárása</h2>
        <form action={blockDate} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className={lbl}>Szoba</label>
            <select name="roomSlug" className={input}>
              {allRooms.map((r) => (
                <option key={r.slug} value={r.slug ?? ""}>{r.name}</option>
              ))}
              <option value="mind">Összes szoba (egész ház)</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Dátum</label>
            <input type="date" name="date" min={today} className={input} required />
          </div>
          <div>
            <label className={lbl}>Megjegyzés</label>
            <input name="note" placeholder="pl. Saját használat" className={input} />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors self-end">
            Zár
          </button>
        </form>
      </div>

      {/* Szobánkénti foglalt napok */}
      {allRooms.map((room) => {
        const roomBlocked = (blockedByRoom[room.slug ?? ""] ?? []).sort((a, b) => a.date.localeCompare(b.date));
        return (
          <div key={room.id} className="border border-gray-800 rounded-xl mb-4 overflow-hidden">
            <div className="px-5 py-3 bg-gray-900 flex items-center justify-between">
              <h3 className="font-medium text-sm">{room.name}</h3>
              <a
                href={`/api/ical/${room.slug}`}
                className="text-xs text-blue-400 hover:text-blue-300 font-mono"
                target="_blank"
              >
                .ics export ↗
              </a>
            </div>
            {roomBlocked.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-500">Nincs zárolt nap a következő 90 napban.</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {roomBlocked.map((b) => (
                  <div key={b.id} className="px-5 py-3 flex items-center justify-between gap-4 text-sm">
                    <div>
                      <span className="font-mono text-gray-200">{b.date}</span>
                      {b.note && <span className="ml-3 text-gray-400 text-xs">{b.note}</span>}
                      <span className="ml-3 text-xs text-gray-600">[{b.source}]</span>
                    </div>
                    <form action={unblockDate}>
                      <input type="hidden" name="roomSlug" value={b.roomSlug} />
                      <input type="hidden" name="date" value={b.date} />
                      <button type="submit" className="text-xs text-red-400 hover:text-red-300">
                        Felold
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* iCal import forrás kezelés */}
      <div className="mt-8 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 bg-gray-900 flex items-center justify-between">
          <h3 className="font-medium text-sm">iCal import URL-ek</h3>
          <Link href="/admin/naptar/ical-sources" className="text-xs text-blue-400 hover:text-blue-300">
            Kezelés →
          </Link>
        </div>
        {sources.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-500">Még nincs iCal forrás. Adj hozzá Booking.com / Szállás.hu feed-eket.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {sources.map((s) => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="text-gray-200">{s.name}</span>
                  <span className="ml-2 text-xs text-gray-500">({s.roomSlug})</span>
                  {s.lastFetched && (
                    <span className="ml-3 text-xs text-gray-600">
                      utoljára: {new Date(s.lastFetched).toLocaleDateString("hu")}
                    </span>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.active ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-400"}`}>
                  {s.active ? "Aktív" : "Inaktív"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const input = "mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 block";
const lbl = "text-xs text-gray-400 uppercase tracking-wide";
