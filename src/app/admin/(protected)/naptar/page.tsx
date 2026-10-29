import Link from "next/link";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { bookings, closures, dayPrices, dayRates, tariffPrices } from "@/db/schema";
import { ROOM_SCOPES } from "@/lib/booking/constants";
import { addDays, fmtShort, monthLabel, todayBudapest } from "@/lib/booking/dates";
import { loadTariffs } from "@/lib/booking/server";
import { CalendarGrid, type DayInfo } from "./grid";
import type { PanelTariff } from "./days-panel";
import { scheduleStaleRefresh } from "@/lib/ical/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Naptár és árak" };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default async function NaptarPage({ searchParams }: { searchParams: Promise<{ ho?: string }> }) {
  // Elavult portál-naptár → háttérfrissítés (a megjelenítést nem lassítja).
  scheduleStaleRefresh();
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

  const [rateRows, priceRows, closureRows, flagRows, tariffList, tariffPriceRows] = await Promise.all([
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
    db.select().from(tariffPrices),
  ]);

  const tariffMap = new Map(tariffList.map((t) => [t.code, t]));
  const prices: Record<string, number> = {};
  for (const p of priceRows) prices[`${p.roomScope}|${p.date}|${p.guests}`] = p.price;
  const closed: Record<string, { bookingId: number | null; name: string | null }> = {};
  for (const c of closureRows) closed[`${c.room}|${c.date}`] = { bookingId: c.bookingId, name: c.name };

  // Naponként: tarifa, ünnep neve, és a szobák nyitásának szabálya. Hogy egy "nyíló" nap
  // éppen nyitva van-e, a böngésző számolja (a ház szabadságától függ, ami lezáráskor változik).
  const info: Record<string, DayInfo> = {};
  for (const d of days) {
    const r = rateRows.find((x) => x.date === d);
    const t = r?.tariffCode ? tariffMap.get(r.tariffCode) : undefined;
    if (t) {
      const opensOn = t.roomMode === "release" ? addDays(d, -(t.releaseDays ?? 0)) : null;
      info[d] = {
        tariff: { code: t.code, name: t.name, color: t.color },
        label: r?.label ?? null,
        rule: t.roomMode === "open" ? "open" : t.roomMode === "never" ? "never" : "release",
        opensOn: opensOn && today < opensOn ? opensOn : null,
      };
    } else {
      info[d] = { tariff: null, label: r?.label ?? null, rule: r?.wholeHouseOnly ? "legacyWhole" : "open", opensOn: null };
    }
  }

  // Árlisták a "Több nap beállítása" panelhez: érthető név, ház ára, szoba legkisebb ára.
  const panelTariffs: PanelTariff[] = tariffList.map((t) => {
    const rows = tariffPriceRows.filter((p) => p.tariffCode === t.code);
    const house = rows.find((p) => p.roomScope === "egesz_haz" && p.guests === 8)?.price ?? null;
    const roomPrices = rows.filter((p) => (ROOM_SCOPES as readonly string[]).includes(p.roomScope)).map((p) => p.price);
    return {
      code: t.code,
      name: t.name,
      color: t.color,
      minNights: t.minNights,
      housePrice: house,
      roomFrom: roomPrices.length ? Math.min(...roomPrices) : null,
      roomsBookable: t.roomMode === "open" ? "yes" : t.roomMode === "never" ? "no" : "late",
    };
  });

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
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold text-[var(--text)]">Naptár és árak</h1>
        <Link href="/admin/naptar/szinkron" className="text-sm text-[var(--accent)] hover:underline">
          Naptár-szinkron (Booking, Szállás.hu) →
        </Link>
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
          Csak egész ház: {fmtShort(r.from).replace(/.$/, "")} – {fmtShort(r.to).replace(/.$/, "")}
        </div>
      ))}

      <CalendarGrid
        days={days}
        today={today}
        info={info}
        prices={prices}
        closed={closed}
        nav={{
          title: monthLabel(y, m - 1),
          prevHref: `/admin/naptar?ho=${prev}`,
          nextHref: `/admin/naptar?ho=${next}`,
          showToday: first > today || last < today,
        }}
        tariffs={panelTariffs}
        defaultRange={{ from: first < today ? today : first, to: last < today ? today : last }}
      />
    </div>
  );
}
