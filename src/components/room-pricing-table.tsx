import { db } from "@/db";
import {
  seasons,
  pricingRules,
  roomCapacityPricing,
  pricingSettings,
  holidayOverrides,
  holidayPrices,
} from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import type { RoomScope } from "@/lib/pricing";

function fmt(n: number) {
  return n.toLocaleString("hu-HU") + " Ft";
}

export async function RoomPricingTable({ roomScope }: { roomScope: RoomScope }) {
  const [allSeasons, allRules, capacityRows, settingsRows, allHolidays, allHolidayPrices] =
    await Promise.all([
      db.select().from(seasons).where(eq(seasons.active, true)).orderBy(asc(seasons.sortOrder)),
      db.select().from(pricingRules),
      db.select().from(roomCapacityPricing),
      db.select().from(pricingSettings).limit(1),
      db.select().from(holidayOverrides).where(eq(holidayOverrides.active, true)).orderBy(asc(holidayOverrides.sortOrder)),
      db.select().from(holidayPrices),
    ]);

  const settings = settingsRows[0] ?? null;
  const capacityRow = capacityRows.find((c) => c.roomScope === roomScope);
  const baseCapacity = capacityRow?.baseCapacity ?? 2;
  const extraFee = capacityRow?.extraGuestFeePerNight ?? 7000;

  // Szezonos árak ennél a szobánál
  const seasonRows = allSeasons
    .map((s) => {
      const weekday = allRules.find(
        (r) => r.seasonId === s.id && r.dayType === "weekday" && r.roomScope === roomScope
      );
      const weekend = allRules.find(
        (r) => r.seasonId === s.id && r.dayType === "weekend" && r.roomScope === roomScope
      );
      return { season: s, weekday, weekend };
    })
    .filter((r) => r.weekday || r.weekend);

  // Ünnepnapi különárak
  const holidayRows = allHolidays
    .filter((h) => !h.wholeHouseOnly)
    .map((h) => {
      const price = allHolidayPrices.find(
        (p) => p.holidayId === h.id && p.roomScope === roomScope
      );
      return { holiday: h, price };
    })
    .filter((r) => r.price?.pricePerNight != null || r.holiday.priceOnRequest);

  if (seasonRows.length === 0 && holidayRows.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Szezonos árak táblázat */}
      {seasonRows.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-3">Szezonos árak</p>
          <div className="rounded-xl border border-[var(--border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--surface2)] border-b border-[var(--border)]">
                  <th className="text-left px-4 py-2.5 font-medium text-[var(--text2)] text-xs uppercase tracking-wide">Szezon</th>
                  <th className="text-right px-4 py-2.5 font-medium text-[var(--text2)] text-xs uppercase tracking-wide">Hétköznap</th>
                  <th className="text-right px-4 py-2.5 font-medium text-[var(--text2)] text-xs uppercase tracking-wide">Hétvége / péntek</th>
                  <th className="text-right px-4 py-2.5 font-medium text-[var(--text2)] text-xs uppercase tracking-wide hidden sm:table-cell">Min. éj</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {seasonRows.map(({ season, weekday, weekend }) => {
                  const wholeHouseOnly = season.wholeHouseOnly;
                  return (
                    <tr key={season.id} className="bg-[var(--surface)]">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--text)]">{season.name}</p>
                        {wholeHouseOnly && (
                          <p className="text-[11px] text-[var(--accent2)] mt-0.5">Csak egész ház</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--text)]">
                        {wholeHouseOnly ? (
                          <span className="text-[var(--text3)] text-xs">–</span>
                        ) : weekday?.priceOnRequest ? (
                          <span className="text-[var(--text2)] text-xs">Érdeklődjön</span>
                        ) : weekday?.pricePerNight != null ? (
                          <span className="font-semibold">{fmt(weekday.pricePerNight)}</span>
                        ) : (
                          <span className="text-[var(--text3)] text-xs">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--text)]">
                        {wholeHouseOnly ? (
                          <span className="text-[var(--text3)] text-xs">–</span>
                        ) : weekend?.priceOnRequest ? (
                          <span className="text-[var(--text2)] text-xs">Érdeklődjön</span>
                        ) : weekend?.pricePerNight != null ? (
                          <span className="font-semibold">{fmt(weekend.pricePerNight)}</span>
                        ) : (
                          <span className="text-[var(--text3)] text-xs">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--text2)] text-xs hidden sm:table-cell">
                        {season.minStayNights} éj
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[var(--text3)] mt-2">Az árak {baseCapacity} főre szólnak / éjszaka.</p>
        </div>
      )}

      {/* Ünnepnapi árak */}
      {holidayRows.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-3">Ünnepnapok & hosszú hétvégék</p>
          <div className="rounded-xl border border-[var(--border)] overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[var(--border)]">
                {holidayRows.map(({ holiday, price }) => (
                  <tr key={holiday.id} className="bg-[var(--surface)]">
                    <td className="px-4 py-3 text-[var(--text)]">{holiday.name}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--text)]">
                      {holiday.priceOnRequest ? (
                        <span className="text-[var(--text2)] font-normal text-xs">Érdeklődjön</span>
                      ) : price?.pricePerNight != null ? (
                        fmt(price.pricePerNight)
                      ) : (
                        <span className="text-[var(--text3)] text-xs">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text2)] text-xs hidden sm:table-cell">
                      min. {holiday.minStayNights} éj
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Létszám & pótágy */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-3">Létszám & pótágy</p>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
          <div className="flex justify-between items-center px-4 py-3 text-sm">
            <span className="text-[var(--text2)]">Alaplétszám (árban benne)</span>
            <span className="font-semibold text-[var(--text)]">{baseCapacity} fő</span>
          </div>
          <div className="flex justify-between items-center px-4 py-3 text-sm">
            <span className="text-[var(--text2)]">Pótágy / extra fő felár</span>
            <span className="font-semibold text-[var(--text)]">{fmt(extraFee)} / fő / éj</span>
          </div>
          {settings && (
            <div className="flex justify-between items-center px-4 py-3 text-sm">
              <span className="text-[var(--text2)]">IFA (idegenforgalmi adó, 18+ év)</span>
              <span className="font-semibold text-[var(--text)]">{fmt(settings.ifaPerPersonPerNight)} / fő / éj</span>
            </div>
          )}
        </div>
      </div>

      {/* Check-in / check-out */}
      {settings && (
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-3">Érkezés & távozás</p>
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
            <div className="flex justify-between items-center px-4 py-3 text-sm">
              <span className="text-[var(--text2)]">Check-in</span>
              <span className="font-semibold text-[var(--text)]">{settings.checkInFrom} – {settings.checkInTo}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 text-sm">
              <span className="text-[var(--text2)]">Check-out</span>
              <span className="font-semibold text-[var(--text)]">{settings.checkOutUntil}-ig</span>
            </div>
            {settings.depositPercent > 0 && (
              <div className="flex justify-between items-center px-4 py-3 text-sm">
                <span className="text-[var(--text2)]">Foglaló</span>
                <span className="font-semibold text-[var(--text)]">{settings.depositPercent}%</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
