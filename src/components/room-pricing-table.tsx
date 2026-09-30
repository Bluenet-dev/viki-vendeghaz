import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { dayRates } from "@/db/schema";
import { BASE_GUESTS, type Scope } from "@/lib/booking/constants";
import { addDays, monthLabel, todayBudapest, weekday } from "@/lib/booking/dates";
import { getSettings } from "@/lib/booking/server";

function fmt(n: number) {
  return n.toLocaleString("hu-HU") + " Ft";
}

// A leggyakoribb érték (így az ünnepnapi különár nem torzítja a havi árat).
function mode(values: number[]): number | null {
  if (!values.length) return null;
  const count = new Map<number, number>();
  for (const v of values) count.set(v, (count.get(v) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

// Havi árak a következő 12 hónapra a naptár (day_rates) alapján.
export async function RoomPricingTable({ roomScope }: { roomScope: Scope }) {
  const today = todayBudapest();
  const [rows, settings] = await Promise.all([
    db
      .select()
      .from(dayRates)
      .where(and(eq(dayRates.roomScope, roomScope), gte(dayRates.date, today), lte(dayRates.date, addDays(today, 365)))),
    getSettings(),
  ]);
  if (!rows.length) return null;

  const months = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = r.date.slice(0, 7);
    if (!months.has(key)) months.set(key, []);
    months.get(key)!.push(r);
  }

  const table = [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 12)
    .map(([key, list]) => {
      const sellable = roomScope === "egesz_haz" ? list : list.filter((r) => !r.wholeHouseOnly);
      const priced = sellable.filter((r) => r.price != null);
      // Péntek és szombat éjszaka = hétvége
      const weekend = priced.filter((r) => [5, 6].includes(weekday(r.date))).map((r) => r.price!);
      const weekdays = priced.filter((r) => ![5, 6].includes(weekday(r.date))).map((r) => r.price!);
      const [y, m] = key.split("-").map(Number);
      return {
        key,
        label: monthLabel(y, m - 1).replace(/^\d{4}\. /, ""),
        year: y,
        wholeOnly: sellable.length === 0,
        onRequest: sellable.length > 0 && priced.length === 0,
        weekday: mode(weekdays),
        weekend: mode(weekend),
        minNights: mode(sellable.map((r) => r.minNights)),
      };
    });

  const extra = mode(rows.filter((r) => r.extraPersonPrice != null).map((r) => r.extraPersonPrice!));
  const base = BASE_GUESTS[roomScope];
  const extraFee = roomScope === "egesz_haz" ? settings.over10FeePerNight : extra;
  const cell = "px-4 py-3 text-right";

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-xs uppercase tracking-widest text-[var(--accent2)]">Árak havonta</p>
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface2)]">
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-[var(--text2)]">Hónap</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-[var(--text2)]">Hétköznap</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-[var(--text2)]">Péntek, szombat</th>
                <th className="hidden px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-[var(--text2)] sm:table-cell">Min. éj</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {table.map((t) => (
                <tr key={t.key} className="bg-[var(--surface)]">
                  <td className="px-4 py-3 font-medium capitalize text-[var(--text)]">
                    {t.label} <span className="font-normal text-[var(--text3)]">{t.year}</span>
                  </td>
                  {t.wholeOnly ? (
                    <td colSpan={3} className={`${cell} text-xs text-[var(--accent2)]`}>Csak egész ház foglalható</td>
                  ) : t.onRequest ? (
                    <td colSpan={3} className={`${cell} text-xs text-[var(--text2)]`}>Érdeklődjön</td>
                  ) : (
                    <>
                      <td className={`${cell} font-semibold text-[var(--text)]`}>{t.weekday != null ? fmt(t.weekday) : "–"}</td>
                      <td className={`${cell} font-semibold text-[var(--text)]`}>{t.weekend != null ? fmt(t.weekend) : "–"}</td>
                      <td className={`${cell} hidden text-xs text-[var(--text2)] sm:table-cell`}>{t.minNights ?? 1} éj</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-[var(--text3)]">
          Az árak {base} főre szólnak / éjszaka. Ünnepnapokon eltérő ár lehet – a pontos árat a foglalásnál látja.
        </p>
      </div>

      <div>
        <p className="mb-3 text-xs uppercase tracking-widest text-[var(--accent2)]">Létszám, adó, érkezés</p>
        <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-[var(--text2)]">Az árban benne</span>
            <span className="font-semibold text-[var(--text)]">{base} fő</span>
          </div>
          {extraFee != null && (
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-[var(--text2)]">{roomScope === "egesz_haz" ? "10 fő feletti felár" : "Pótágy / további fő"}</span>
              <span className="font-semibold text-[var(--text)]">{fmt(extraFee)} / fő / éj</span>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-[var(--text2)]">Idegenforgalmi adó (helyszínen)</span>
            <span className="font-semibold text-[var(--text)]">{fmt(settings.ifaPerPersonPerNight)} / fő / éj</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-[var(--text2)]">Érkezés / távozás</span>
            <span className="font-semibold text-[var(--text)]">{settings.checkInFrom}-tól / {settings.checkOutUntil}-ig</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-[var(--text2)]">Előleg</span>
            <span className="font-semibold text-[var(--text)]">{settings.depositPercent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
