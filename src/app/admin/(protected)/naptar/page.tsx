import { db } from "@/db";
import { availability, rooms, icalSources } from "@/db/schema";
import { asc, eq, and, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Naptár" };

async function toggleDate(formData: FormData) {
  "use server";
  const roomSlug = String(formData.get("roomSlug"));
  const date = String(formData.get("date"));
  const currentStatus = String(formData.get("currentStatus"));

  if (currentStatus === "blocked_manual") {
    await db.delete(availability).where(
      and(eq(availability.roomSlug, roomSlug), eq(availability.date, date), eq(availability.source, "manual"))
    );
  } else if (currentStatus === "free") {
    await db.insert(availability).values({
      roomSlug, date, status: "blocked", source: "manual", note: "Manuálisan zárva"
    });
  }
  revalidatePath("/admin/naptar");
}

async function syncIcal() {
  "use server";
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  await fetch(`${base}/api/ical-import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }),
  });
  revalidatePath("/admin/naptar");
}

const MONTHS_HU = ["Január","Február","Március","Április","Május","Június",
  "Július","Augusztus","Szeptember","Október","November","December"];

export default async function AdminNaptarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const year = sp.year ? Number(sp.year) : now.getFullYear();
  const month = sp.month ? Number(sp.month) : now.getMonth(); // 0-indexed

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstStr = firstDay.toISOString().slice(0, 10);
  const lastStr = lastDay.toISOString().slice(0, 10);

  const allRooms = await db.select().from(rooms).where(eq(rooms.active, true)).orderBy(asc(rooms.sortOrder));
  const sources = await db.select().from(icalSources);

  const blocked = await db.select().from(availability).where(
    and(
      eq(availability.status, "blocked"),
      gte(availability.date, firstStr),
      lte(availability.date, lastStr)
    )
  );

  // blocked map: roomSlug -> Set<date>
  const blockedMap: Record<string, Record<string, { source: string; note: string | null }>> = {};
  for (const b of blocked) {
    if (!blockedMap[b.roomSlug]) blockedMap[b.roomSlug] = {};
    blockedMap[b.roomSlug][b.date] = { source: b.source ?? "manual", note: b.note };
  }

  // Naptár napjai
  const daysInMonth = lastDay.getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    return d.toISOString().slice(0, 10);
  });

  // Előző/következő hónap
  const prevDate = new Date(year, month - 1, 1);
  const nextDate = new Date(year, month + 1, 1);
  const prevHref = `/admin/naptar?year=${prevDate.getFullYear()}&month=${prevDate.getMonth()}`;
  const nextHref = `/admin/naptar?year=${nextDate.getFullYear()}&month=${nextDate.getMonth()}`;

  const today = now.toISOString().slice(0, 10);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-[var(--text)]">Naptár</h1>
        <p className="text-sm text-[var(--text2)] mt-1">Szobánkénti elérhetőség – kattints egy napra a zárolásához.</p>
        {/* iCal szinkron – ideiglenesen inaktív (aktiváláshoz: töröld a hidden class-t)
        <div className="flex gap-2 mt-3">
          <form action={syncIcal}>
            <button type="submit" className="px-4 py-2 rounded-md border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] text-[14px] transition-colors">
              ↻ iCal szinkron
            </button>
          </form>
          <Link href="/admin/naptar/ical-sources" className="px-4 py-2 rounded-md border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] text-[14px] transition-colors">
            ⚙ Beállítások
          </Link>
        </div>
        */}
      </div>

      {/* Hónap navigáció */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={prevHref} className="px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] text-sm transition-colors">← Előző</Link>
        <h2 className="text-lg font-medium text-[var(--text)]">{MONTHS_HU[month]} {year}</h2>
        <Link href={nextHref} className="px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] text-sm transition-colors">Következő →</Link>
        {(year !== now.getFullYear() || month !== now.getMonth()) && (
          <Link href="/admin/naptar" className="text-xs text-[var(--accent)] hover:underline ml-2">Ma</Link>
        )}
      </div>

      {/* Jelmagyarázat */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs text-[var(--text2)]">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[var(--surface2)] border border-[var(--border)] inline-block" />Szabad</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#F3C7C7] inline-block" />Manuálisan zárva</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#F4D2BC] inline-block" />OTA foglalt</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-[var(--accent)] inline-block" />Mai nap</span>
      </div>

      {/* Naptár grid */}
      <div className="overflow-x-auto rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[var(--surface2)]">
              <th className="px-3 py-2 text-left text-[var(--text2)] font-semibold sticky left-0 bg-[var(--surface2)] z-10 min-w-36">Szoba</th>
              {days.map((d) => {
                const dayNum = Number(d.slice(8));
                const dayOfWeek = new Date(d).getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isToday = d === today;
                return (
                  <th key={d} className={`px-1 py-2 text-center min-w-8 ${isWeekend ? "text-[var(--text)] font-semibold" : "text-[var(--text2)]"} ${isToday ? "bg-[var(--accent-bg)]" : ""}`}>
                    {dayNum}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {allRooms.map((room) => (
              <tr key={room.id} className="border-t-[0.5px] border-[var(--border)] hover:bg-[var(--surface2)]">
                <td className="px-3 py-2 font-medium sticky left-0 bg-[var(--surface)] z-10 border-r-[0.5px] border-[var(--border)] whitespace-nowrap text-[var(--text)]">
                  <div>{room.name}</div>
                  <a href={`/api/ical/${room.slug}`} target="_blank" className="text-xs text-[var(--accent)] hover:underline">
                    .ics ↗
                  </a>
                </td>
                {days.map((d) => {
                  const entry = blockedMap[room.slug ?? ""]?.[d];
                  const isOta = entry && entry.source !== "manual";
                  const isManual = entry && entry.source === "manual";
                  const isToday = d === today;
                  const isPast = d < today;

                  let cellClass = "bg-[var(--surface2)] hover:bg-[var(--accent-bg)] cursor-pointer";
                  let title = "Szabad – kattints a záráshoz";
                  let status = "free";

                  if (isOta) {
                    cellClass = "bg-[#F4D2BC] cursor-default";
                    title = `OTA foglalt: ${entry.source} – ${entry.note ?? ""}`;
                    status = "blocked_ota";
                  } else if (isManual) {
                    cellClass = "bg-[#F3C7C7] hover:bg-[#EEB6B6] cursor-pointer";
                    title = `Manuálisan zárva: ${entry.note ?? ""} – kattints a feloldáshoz`;
                    status = "blocked_manual";
                  }

                  if (isToday) cellClass += " ring-1 ring-inset ring-[var(--accent)]";
                  if (isPast) cellClass = "opacity-40 cursor-default " + cellClass;

                  return (
                    <td key={d} className="p-0 text-center">
                      {isPast || isOta ? (
                        <div className={`w-full h-8 flex items-center justify-center ${cellClass}`} title={title}>
                          {isOta && <span className="text-[#8A4A22] text-xs">●</span>}
                          {isManual && isPast && <span className="text-[#C44] text-xs">●</span>}
                        </div>
                      ) : (
                        <form action={toggleDate}>
                          <input type="hidden" name="roomSlug" value={room.slug ?? ""} />
                          <input type="hidden" name="date" value={d} />
                          <input type="hidden" name="currentStatus" value={status} />
                          <button type="submit" className={`w-full h-8 flex items-center justify-center transition-colors ${cellClass}`} title={title}>
                            {isManual && <span className="text-[#C44] text-xs">●</span>}
                          </button>
                        </form>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* iCal sources összefoglaló */}
      {sources.length > 0 && (
        <div className="mt-6 text-xs text-[var(--text3)]">
          Aktív iCal források: {sources.filter(s => s.active).map(s => s.name).join(", ") || "—"}
        </div>
      )}
    </div>
  );
}
