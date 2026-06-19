import Link from "next/link";
import { db } from "@/db";
import { messages, availability, rooms } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { StatsCharts } from "./charts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Statisztikák" };

type View = "30nap" | "het" | "honap" | "ev";

const ROOM_LABELS: Record<string, string> = {
  "szoba-1": "1-es szoba",
  "szoba-2": "2-es szoba",
  superior: "Superior",
};

const MONTHS_SHORT = ["jan", "feb", "márc", "ápr", "máj", "jún", "júl", "aug", "szept", "okt", "nov", "dec"];
const MONTHS_FULL = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];
const WEEKDAYS_SHORT = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];

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

// ISO 8601 hét-szám, helyi időzónában (admin egy időzónában használja).
function getISOWeekString(d: Date): string {
  const date = startOfDay(d);
  const dayNum = (date.getDay() + 6) % 7; // hétfő = 0
  date.setDate(date.getDate() - dayNum + 3); // a hét csütörtöke
  const firstThursday = new Date(date.getFullYear(), 0, 4);
  const fdDayNum = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - fdDayNum + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function isoWeekToMonday(weekStr: string): Date {
  const [yearStr, wStr] = weekStr.split("-W");
  const year = Number(yearStr);
  const week = Number(wStr);
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const week1Monday = addDays(jan4, -jan4Day);
  return startOfDay(addDays(week1Monday, (week - 1) * 7));
}

interface Bucket {
  label: string;
  start: Date;
  end: Date;
}

interface RangeInfo {
  rangeStart: Date;
  rangeEnd: Date;
  rangeLabel: string;
  buckets: Bucket[];
}

function dailyBuckets(start: Date, end: Date, labelFn: (d: Date) => string): Bucket[] {
  const buckets: Bucket[] = [];
  for (let d = startOfDay(start); d < end; d = addDays(d, 1)) {
    buckets.push({ label: labelFn(d), start: d, end: addDays(d, 1) });
  }
  return buckets;
}

function resolveRange(view: View, at: string | undefined, now: Date): RangeInfo {
  if (view === "het") {
    const weekStr = at && /^\d{4}-W\d{2}$/.test(at) ? at : getISOWeekString(now);
    const monday = isoWeekToMonday(weekStr);
    const rangeEnd = addDays(monday, 7);
    return {
      rangeStart: monday,
      rangeEnd,
      rangeLabel: `${monday.getFullYear()}. ${weekStr.split("-W")[1]}. hét (${toDateInputValue(monday)} – ${toDateInputValue(addDays(rangeEnd, -1))})`,
      buckets: dailyBuckets(monday, rangeEnd, (d) => WEEKDAYS_SHORT[(d.getDay() + 6) % 7]),
    };
  }

  if (view === "honap") {
    const match = at && /^\d{4}-\d{2}$/.test(at) ? at : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const [yearStr, monthStr] = match.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    const rangeStart = new Date(year, month, 1);
    const rangeEnd = new Date(year, month + 1, 1);
    return {
      rangeStart,
      rangeEnd,
      rangeLabel: `${year}. ${MONTHS_FULL[month]}`,
      buckets: dailyBuckets(rangeStart, rangeEnd, (d) => String(d.getDate())),
    };
  }

  if (view === "ev") {
    const year = at && /^\d{4}$/.test(at) ? Number(at) : now.getFullYear();
    const rangeStart = new Date(year, 0, 1);
    const rangeEnd = new Date(year + 1, 0, 1);
    const buckets: Bucket[] = [];
    for (let m = 0; m < 12; m++) {
      buckets.push({ label: MONTHS_SHORT[m], start: new Date(year, m, 1), end: new Date(year, m + 1, 1) });
    }
    return { rangeStart, rangeEnd, rangeLabel: String(year), buckets };
  }

  // 30nap (alapértelmezett)
  const rangeEnd = addDays(startOfDay(now), 1);
  const rangeStart = addDays(rangeEnd, -30);
  return {
    rangeStart,
    rangeEnd,
    rangeLabel: "Elmúlt 30 nap",
    buckets: dailyBuckets(rangeStart, rangeEnd, (d) => `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}.`),
  };
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
  searchParams: Promise<{ view?: string; at?: string }>;
}) {
  const sp = await searchParams;
  const view: View = sp.view === "het" || sp.view === "honap" || sp.view === "ev" ? sp.view : "30nap";

  const now = new Date();
  const { rangeStart, rangeEnd, rangeLabel, buckets } = resolveRange(view, sp.at, now);

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

  const defaultWeek = getISOWeekString(now);
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const defaultYear = now.getFullYear();
  const currentAt = sp.at;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-display font-semibold">Statisztikák</h1>
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-800">
          {(["30nap", "het", "honap", "ev"] as View[]).map((v) => (
            <Link
              key={v}
              href={`/admin/statisztikak?view=${v}`}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                view === v ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {v === "30nap" ? "Elmúlt 30 nap" : v === "het" ? "Hét" : v === "honap" ? "Hónap" : "Év"}
            </Link>
          ))}
        </div>
      </div>

      {view !== "30nap" && (
        <form className="flex items-end gap-3 border border-gray-800 rounded-xl p-4 bg-gray-900/40">
          <input type="hidden" name="view" value={view} />
          {view === "het" && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Hét</label>
              <input
                type="week"
                name="at"
                defaultValue={currentAt && /^\d{4}-W\d{2}$/.test(currentAt) ? currentAt : defaultWeek}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          {view === "honap" && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Hónap</label>
              <input
                type="month"
                name="at"
                defaultValue={currentAt && /^\d{4}-\d{2}$/.test(currentAt) ? currentAt : defaultMonth}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          {view === "ev" && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Év</label>
              <input
                type="number"
                name="at"
                min={2020}
                max={2099}
                defaultValue={currentAt && /^\d{4}$/.test(currentAt) ? currentAt : defaultYear}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
            Mutat
          </button>
          <span className="text-sm text-gray-400 ml-2 self-center">{rangeLabel}</span>
        </form>
      )}

      {allMessages.length === 0 ? (
        <p className="text-gray-500 text-sm">Még nincs elég adat a statisztikákhoz – várj az első üzenetekre/foglalási kérésekre.</p>
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
