import Link from "next/link";
import { db } from "@/db";
import { messages, availability, rooms } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import nextDynamic from "next/dynamic";
const StatsCharts = nextDynamic(() => import("./charts").then((m) => m.StatsCharts), { ssr: false });

export const dynamic = "force-dynamic";
export const metadata = { title: "Statisztikák" };

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

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDateInput(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

interface Bucket {
  label: string;
  start: Date;
  end: Date;
}

function dailyBuckets(start: Date, end: Date): Bucket[] {
  const buckets: Bucket[] = [];
  for (let d = start; d < end; d = addDays(d, 1)) {
    buckets.push({ label: `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}.`, start: d, end: addDays(d, 1) });
  }
  return buckets;
}

function weeklyBuckets(start: Date, end: Date): Bucket[] {
  const buckets: Bucket[] = [];
  for (let d = start; d < end; d = addDays(d, 7)) {
    const bEnd = addDays(d, 7) > end ? end : addDays(d, 7);
    buckets.push({ label: `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}.`, start: d, end: bEnd });
  }
  return buckets;
}

function monthlyBuckets(start: Date, end: Date): Bucket[] {
  const buckets: Bucket[] = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor < end) {
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const bStart = cursor < start ? start : cursor;
    const bEnd = monthEnd > end ? end : monthEnd;
    buckets.push({ label: `${MONTHS_SHORT[cursor.getMonth()]} '${String(cursor.getFullYear()).slice(2)}`, start: bStart, end: bEnd });
    cursor = monthEnd;
  }
  return buckets;
}

function yearlyBuckets(start: Date, end: Date): Bucket[] {
  const buckets: Bucket[] = [];
  let cursor = new Date(start.getFullYear(), 0, 1);
  while (cursor < end) {
    const yearEnd = new Date(cursor.getFullYear() + 1, 0, 1);
    const bStart = cursor < start ? start : cursor;
    const bEnd = yearEnd > end ? end : yearEnd;
    buckets.push({ label: String(cursor.getFullYear()), start: bStart, end: bEnd });
    cursor = yearEnd;
  }
  return buckets;
}

// A bontás (nap/hét/hónap/év) automatikusan a kiválasztott tartomány hosszától függ.
function generateBuckets(start: Date, end: Date): Bucket[] {
  const spanDays = Math.round((end.getTime() - start.getTime()) / 86400000);
  if (spanDays <= 31) return dailyBuckets(start, end);
  if (spanDays <= 120) return weeklyBuckets(start, end);
  if (spanDays <= 731) return monthlyBuckets(start, end);
  return yearlyBuckets(start, end);
}

const LEAD_TIME_BUCKETS = [
  { label: "0–3 nap", min: 0, max: 3 },
  { label: "4–7 nap", min: 4, max: 7 },
  { label: "8–14 nap", min: 8, max: 14 },
  { label: "15–30 nap", min: 15, max: 30 },
  { label: "31–60 nap", min: 31, max: 60 },
  { label: "60+ nap", min: 61, max: Infinity },
];

interface Preset {
  key: string;
  label: string;
  from: Date;
  to: Date;
}

function buildPresets(now: Date): Preset[] {
  const today = startOfDay(now);
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthEnd = addDays(thisMonthStart, -1);
  const yearStart = new Date(today.getFullYear(), 0, 1);
  return [
    { key: "7nap", label: "7 nap", from: addDays(today, -6), to: today },
    { key: "30nap", label: "30 nap", from: addDays(today, -29), to: today },
    { key: "ezahonap", label: "Ez a hónap", from: thisMonthStart, to: today },
    { key: "elozohonap", label: "Előző hónap", from: prevMonthStart, to: prevMonthEnd },
    { key: "ezazev", label: "Ez az év", from: yearStart, to: today },
  ];
}

export default async function AdminStatisztikakPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const presets = buildPresets(now);
  const defaultPreset = presets[1]; // 30 nap

  const fromDate = parseDateInput(sp.from) ?? defaultPreset.from;
  const toDateInclusive = parseDateInput(sp.to) ?? defaultPreset.to;
  const rangeStart = startOfDay(fromDate < toDateInclusive ? fromDate : toDateInclusive);
  const rangeEnd = addDays(startOfDay(fromDate < toDateInclusive ? toDateInclusive : fromDate), 1);
  const rangeLabel = `${toDateInputValue(rangeStart)} – ${toDateInputValue(addDays(rangeEnd, -1))}`;
  const buckets = generateBuckets(rangeStart, rangeEnd);

  const activePreset = presets.find(
    (p) => toDateInputValue(p.from) === toDateInputValue(rangeStart) && toDateInputValue(p.to) === toDateInputValue(addDays(rangeEnd, -1))
  )?.key;

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

  // 3. Foglaltsági arány szobánként a kiválasztott időszakra
  const activeRooms = await db.select().from(rooms).where(eq(rooms.active, true)).orderBy(asc(rooms.sortOrder));
  const rangeStartStr = rangeStart.toISOString().slice(0, 10);
  const rangeEndStr = rangeEnd.toISOString().slice(0, 10);
  const blockedRows = await db.select().from(availability).where(eq(availability.status, "blocked"));
  const totalDaysInRange = Math.max(1, Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000));
  const occupancy = activeRooms.map((r) => {
    const blockedCount = blockedRows.filter(
      (b) => b.roomSlug === r.slug && b.date >= rangeStartStr && b.date < rangeEndStr
    ).length;
    return {
      name: r.name,
      percent: Math.round((blockedCount / totalDaysInRange) * 100),
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
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text)]">Statisztikák</h1>
        <p className="text-sm text-[var(--text2)] mt-1">Foglalási kérések és kapcsolatfelvételek elemzése.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-[0.5px] border-[var(--border)] rounded-[10px] p-4 bg-[var(--surface)]">
        <div className="flex gap-1 flex-wrap">
          {presets.map((p) => (
            <Link
              key={p.key}
              href={`/admin/statisztikak?from=${toDateInputValue(p.from)}&to=${toDateInputValue(p.to)}`}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap ${
                activePreset === p.key ? "bg-[var(--nav-bg)] text-white" : "bg-[var(--surface2)] text-[var(--text2)] hover:text-[var(--text)]"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>

        <form className="flex items-end gap-3 ml-auto">
          <div>
            <label className="text-xs text-[var(--text2)] uppercase tracking-wide block mb-1">Ettől</label>
            <input
              type="date"
              name="from"
              defaultValue={toDateInputValue(rangeStart)}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[14px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text2)] uppercase tracking-wide block mb-1">Eddig</label>
            <input
              type="date"
              name="to"
              defaultValue={toDateInputValue(addDays(rangeEnd, -1))}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[14px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
          <button type="submit" className="px-5 py-2 rounded-md bg-[var(--nav-bg)] text-white text-[14px] font-semibold hover:opacity-90 transition-opacity">
            Mutat
          </button>
        </form>
      </div>

      <p className="text-sm text-[var(--text2)]">Kiválasztott időszak: {rangeLabel}</p>

      {allMessages.length === 0 ? (
        <p className="text-[var(--text3)] text-sm">Még nincs elég adat a statisztikákhoz – várj az első üzenetekre/foglalási kérésekre.</p>
      ) : (
        <StatsCharts
          timeline={timeline}
          roomDistribution={roomDistribution}
          occupancy={occupancy}
          occupancyLabel={rangeLabel}
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
