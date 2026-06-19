import Link from "next/link";
import { db } from "@/db";
import { messages, availability, rooms } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { StatsCharts } from "./charts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Statisztikák" };

type Period = "het" | "honap" | "ev";

const ROOM_LABELS: Record<string, string> = {
  "szoba-1": "1-es szoba",
  "szoba-2": "2-es szoba",
  superior: "Superior",
};

const MONTHS_SHORT = ["jan", "feb", "márc", "ápr", "máj", "jún", "júl", "aug", "szept", "okt", "nov", "dec"];

function normalizeRoomLabel(roomSlug: string | null): string {
  if (!roomSlug) return "Ismeretlen";
  if (roomSlug === "egész vendégház") return "Egész ház";
  if (roomSlug.includes(",")) return "Több szoba";
  return ROOM_LABELS[roomSlug] ?? roomSlug;
}

interface Bucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

function generateBuckets(period: Period, now: Date): Bucket[] {
  const buckets: Bucket[] = [];
  if (period === "het") {
    const todayEnd = new Date(now);
    todayEnd.setHours(0, 0, 0, 0);
    todayEnd.setDate(todayEnd.getDate() + 1);
    for (let i = 11; i >= 0; i--) {
      const end = new Date(todayEnd);
      end.setDate(end.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 7);
      const labelDate = new Date(end);
      labelDate.setDate(labelDate.getDate() - 1);
      const label = `${String(labelDate.getMonth() + 1).padStart(2, "0")}.${String(labelDate.getDate()).padStart(2, "0")}.`;
      buckets.push({ key: `w-${i}`, label, start, end });
    }
  } else if (period === "honap") {
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      buckets.push({ key: `${start.getFullYear()}-${start.getMonth()}`, label: `${MONTHS_SHORT[start.getMonth()]} '${String(start.getFullYear()).slice(2)}`, start, end });
    }
  } else {
    for (let i = 4; i >= 0; i--) {
      const y = now.getFullYear() - i;
      buckets.push({ key: String(y), label: String(y), start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) });
    }
  }
  return buckets;
}

function currentWindow(period: Period, now: Date): { start: Date; end: Date; label: string } {
  if (period === "het") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    const end = new Date(now);
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    return { start, end, label: "az elmúlt 7 napra" };
  }
  if (period === "honap") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end, label: "a jelenlegi hónapra" };
  }
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear() + 1, 0, 1);
  return { start, end, label: "a jelenlegi évre" };
}

const LEAD_TIME_BUCKETS = [
  { label: "0–3 nap", min: 0, max: 3 },
  { label: "4–7 nap", min: 4, max: 7 },
  { label: "8–14 nap", min: 8, max: 14 },
  { label: "15–30 nap", min: 15, max: 30 },
  { label: "31–60 nap", min: 31, max: 60 },
  { label: "60+ nap", min: 61, max: Infinity },
];

export default async function AdminStatisztikakPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const period: Period = sp.period === "het" || sp.period === "ev" ? sp.period : "honap";

  const now = new Date();
  const buckets = generateBuckets(period, now);
  const rangeStart = buckets[0].start;
  const rangeEnd = buckets[buckets.length - 1].end;

  const allMessages = await db.select().from(messages);
  const inRange = allMessages.filter((m) => {
    if (!m.createdAt) return false;
    const t = new Date(m.createdAt);
    return t >= rangeStart && t < rangeEnd;
  });

  // 1. & 6. Idővonal: foglalási kérés vs. kapcsolat, bucketonként
  const timeline = buckets.map((b) => {
    const inBucket = inRange.filter((m) => {
      const t = new Date(m.createdAt!);
      return t >= b.start && t < b.end;
    });
    return {
      label: b.label,
      foglalas: inBucket.filter((m) => m.type === "booking_request").length,
      kapcsolat: inBucket.filter((m) => m.type === "contact").length,
    };
  });

  const bookingRequests = inRange.filter((m) => m.type === "booking_request");

  // 2. Szoba szerinti megoszlás
  const roomCounts = new Map<string, number>();
  for (const m of bookingRequests) {
    const label = normalizeRoomLabel(m.roomSlug);
    roomCounts.set(label, (roomCounts.get(label) ?? 0) + 1);
  }
  const roomDistribution = Array.from(roomCounts.entries()).map(([name, value]) => ({ name, value }));

  // 3. Foglaltsági arány szobánként (aktuális időszakra)
  const activeRooms = await db.select().from(rooms).where(eq(rooms.active, true)).orderBy(asc(rooms.sortOrder));
  const win = currentWindow(period, now);
  const winStartStr = win.start.toISOString().slice(0, 10);
  const winEndStr = win.end.toISOString().slice(0, 10);
  const blockedRows = await db.select().from(availability).where(eq(availability.status, "blocked"));
  const totalDaysInWindow = Math.max(1, Math.round((win.end.getTime() - win.start.getTime()) / 86400000));
  const occupancy = activeRooms.map((r) => {
    const blockedCount = blockedRows.filter(
      (b) => b.roomSlug === r.slug && b.date >= winStartStr && b.date < winEndStr
    ).length;
    return {
      name: r.name,
      percent: Math.round((blockedCount / totalDaysInWindow) * 100),
    };
  });

  // 4. KPI-k
  const nightsList = bookingRequests
    .filter((m) => m.checkIn && m.checkOut)
    .map((m) => Math.round((new Date(m.checkOut!).getTime() - new Date(m.checkIn!).getTime()) / 86400000))
    .filter((n) => n > 0);
  const guestsList = bookingRequests.map((m) => m.guests).filter((g): g is number => g != null);
  const avgNights = nightsList.length > 0 ? nightsList.reduce((a, b) => a + b, 0) / nightsList.length : null;
  const avgGuests = guestsList.length > 0 ? guestsList.reduce((a, b) => a + b, 0) / guestsList.length : null;

  // 5. Előfutási idő hisztogram
  const leadDays = bookingRequests
    .filter((m) => m.checkIn && m.createdAt)
    .map((m) => Math.round((new Date(m.checkIn!).getTime() - new Date(m.createdAt!).getTime()) / 86400000))
    .filter((d) => d >= 0);
  const leadTimeHistogram = LEAD_TIME_BUCKETS.map((b) => ({
    label: b.label,
    count: leadDays.filter((d) => d >= b.min && d <= b.max).length,
  }));

  // 7. Szezonalitás: érkezési hónap eloszlása
  const seasonality = MONTHS_SHORT.map((label, i) => ({
    label,
    count: bookingRequests.filter((m) => m.checkIn && new Date(m.checkIn).getMonth() === i).length,
  }));

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-display font-semibold">Statisztikák</h1>
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-800">
          {(["het", "honap", "ev"] as Period[]).map((p) => (
            <Link
              key={p}
              href={`/admin/statisztikak?period=${p}`}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                period === p ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {p === "het" ? "Hét" : p === "honap" ? "Hónap" : "Év"}
            </Link>
          ))}
        </div>
      </div>

      {allMessages.length === 0 ? (
        <p className="text-gray-500 text-sm">Még nincs elég adat a statisztikákhoz – várj az első üzenetekre/foglalási kérésekre.</p>
      ) : (
        <StatsCharts
          timeline={timeline}
          roomDistribution={roomDistribution}
          occupancy={occupancy}
          occupancyLabel={win.label}
          leadTimeHistogram={leadTimeHistogram}
          seasonality={seasonality}
          kpis={{
            totalRequests: bookingRequests.length,
            avgNights,
            avgGuests,
          }}
        />
      )}
    </div>
  );
}
