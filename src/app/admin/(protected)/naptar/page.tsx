import Link from "next/link";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { bookings, closures, dayPrices, dayRates } from "@/db/schema";
import { ROOM_SCOPES } from "@/lib/booking/constants";
import { addDays, fmtShort, monthLabel, todayBudapest } from "@/lib/booking/dates";
import { loadTariffs } from "@/lib/booking/server";
import { BulkFillButton } from "./bulk";
import { CalendarGrid, type DayInfo } from "./grid";

export const dynamic = "force-dynamic";
export const metadata = { title: "Naptár és árak" };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default async function NaptarPage({ searchParams }: { searchParams: Promise<{ ho?: string }> }) {
  const { ho } = await searchParams;
  const today = todayBudapest();
  const [y, m] = /^\d{4}-\d{2}$/.test(ho ?? "") ? ho!.split("-").map(Number) : today.split("-").slice(0, 2).map(Number);
  const first = `${y}-${pad(m)}-01`;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const last = `${y}-${pad(m)}-${pad(daysInMonth)}`;
  const days = Array.from({ length: daysInMonth }, (_, i) => addDays(first, i));

  const prev = m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;

  // A régi (2026-os, tarifa nélküli) "csak egész ház" sáv a teljes összefüggő időszakot mutatja.
  const wideFrom = addDays(first, -120);
  const wideTo = addDays(last, 120);

  const [rateRows, priceRows, closureRows, flagRows, tariffList] = await Promise.all([
    db.select().from(dayRates).where(and(eq(dayRates.roomScope, "szoba-1"), gte(dayRates.date, first), lte(dayRates.date, last))),
    db.select().from(dayPrices).where(and(gte(dayPrices.date, first), lte(dayPrices.date, last))),
    db
      .select({ room: closures.roomScope, date: closures.date, bookingId: closures.bookingId, name: bookings.name })
      .from(closures)
      .leftJoin(bookings, eq(bookings.id, closures.bookingId))
      .where(and(gte(closures.date, first), lte(closures.date, last))),
    db
      .select({ date: dayRates.date, whole: dayRates.wholeHouseOnly })
      .from(dayRates)
      .where(and(eq(dayRates.roomScope, "szoba-1"), isNull(dayRates.tariffCode), gte(dayRates.date, wideFrom), lte(dayRates.date, wideTo))),
    loadTariffs(),
  ]);

  const tariffMap = new Map(tariffList.map((t) => [t.code, t]));
  const prices: Record<string, number> = {};
  for (const p of priceRows) prices[`${p.roomScope}|${p.date}|${p.guests}`] = p.price;
  const closed: Record<string, { bookingId: number | null; name: string | null }> = {};
  for (const c of closureRows) closed[`${c.room}|${c.date}`] = { bookingId: c.bookingId, name: c.name };

  // Naponként: tarifa, címke, és hogy a szobák szobánként foglalhatók-e.
  const info: Record<string, DayInfo> = {};
  for (const d of days) {
    const r = rateRows.find((x) => x.date === d);
    const t = r?.tariffCode ? tariffMap.get(r.tariffCode) : undefined;
    const houseFree = ROOM_SCOPES.every((room) => !closed[`${room}|${d}`]);
    if (t) {
      const opensOn = t.roomMode === "release" ? addDays(d, -(t.releaseDays ?? 0)) : null;
      info[d] = {
        tariff: { code: t.code, name: t.name, color: t.color },
        label: r?.label ?? null,
        mode: t.roomMode === "open" ? "open" : t.roomMode === "never" ? "never" : today >= opensOn! && houseFree ? "open" : "release",
        opensOn: opensOn && today < opensOn ? opensOn : null,
      };
    } else {
      info[d] = { tariff: null, label: r?.label ?? null, mode: r?.wholeHouseOnly ? "legacyWhole" : "open", opensOn: null };
    }
  }

  // Régi, összefüggő "csak egész ház" időszakok (2026), amelyek érintik a hónapot.
  const flags = new Set(flagRows.filter((r) => r.whole).map((r) => r.date));
  const ranges: { from: string; to: string }[] = [];
  for (let d = wideFrom; d <= wideTo; d = addDays(d, 1)) {
    if (!flags.has(d)) continue;
    const lastRange = ranges[ranges.length - 1];
    if (lastRange && addDays(lastRange.to, 1) === d) lastRange.to = d;
    else ranges.push({ from: d, to: d });
  }
  const visible = ranges.filter((r) => r.to >= first && r.from <= last);
  const isWeekendOnly = (r: { from: string; to: string }) => {
    for (let d = r.from; d <= r.to; d = addDays(d, 1)) {
      const w = new Date(`${d}T12:00:00Z`).getUTCDay();
      if (w !== 5 && w !== 6) return false;
    }
    return true;
  };
  const hasWeekendRule = visible.some(isWeekendOnly);
  const visibleRanges = visible.filter((r) => !isWeekendOnly(r));

  // A hónapban előforduló tarifák (a fejléc betűinek feloldása)
  const monthTariffs = tariffList.filter((t) => days.some((d) => info[d]?.tariff?.code === t.code));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-[var(--text)]">Naptár és árak</h1>
        <BulkFillButton
          defaultFrom={first < today ? today : first}
          defaultTo={last < today ? today : last}
          tariffs={tariffList.map((t) => ({ code: t.code, name: t.name }))}
        />
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Link href={`/admin/naptar?ho=${prev}`} aria-label="Előző hónap" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[15px] text-[var(--text2)] hover:text-[var(--text)]">
          ←
        </Link>
        <h2 className="min-w-44 text-center text-[17px] font-semibold capitalize text-[var(--text)]">{monthLabel(y, m - 1)}</h2>
        <Link href={`/admin/naptar?ho=${next}`} aria-label="Következő hónap" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[15px] text-[var(--text2)] hover:text-[var(--text)]">
          →
        </Link>
        {first > today || last < today ? (
          <Link href="/admin/naptar" className="ml-2 text-[14px] text-[var(--accent)] hover:underline">Vissza a mai naphoz</Link>
        ) : null}
      </div>

      {monthTariffs.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-[var(--text2)]">
          {monthTariffs.map((t) => (
            <span key={t.code} className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded text-[12px] font-bold text-[var(--text)]" style={{ backgroundColor: t.color }}>
                {t.code}
              </span>
              {t.name}
            </span>
          ))}
        </div>
      )}

      {hasWeekendRule && (
        <div className="mb-3 rounded-md border border-[#C5D5C5] bg-[var(--accent-bg)] px-4 py-2 text-[14px] text-[#3A5A3C]">
          Csak egész ház: péntek és szombat éjszaka
        </div>
      )}
      {visibleRanges.map((r) => (
        <div key={r.from} className="mb-3 rounded-md border border-[#C5D5C5] bg-[var(--accent-bg)] px-4 py-2 text-[14px] text-[#3A5A3C]">
          Csak egész ház: {fmtShort(r.from).replace(/\.$/, "")} – {fmtShort(r.to).replace(/\.$/, "")}
        </div>
      ))}

      <CalendarGrid days={days} today={today} info={info} prices={prices} closed={closed} />
    </div>
  );
}
