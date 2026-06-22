import Link from "next/link";
import { db } from "@/db";
import {
  seasons,
  pricingRules,
  holidayOverrides,
  holidayPrices,
  pricingSettings,
  roomCapacityPricing,
} from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const metadata = { title: "Árazás" };

const ROOM_SCOPES = ["szoba-1", "szoba-2", "superior", "egesz_haz"] as const;
const DAY_TYPES = ["weekday", "weekend"] as const;
const ROOM_SCOPE_LABELS: Record<string, string> = {
  "szoba-1": "1-es szoba",
  "szoba-2": "2-es szoba",
  superior: "Superior",
  egesz_haz: "Egész ház",
};

async function createSeason(formData: FormData) {
  "use server";
  const name = String(formData.get("name"));
  const sibling = await db.select().from(seasons).where(eq(seasons.name, name)).limit(1);
  const sortOrder = sibling[0]?.sortOrder ?? 100;

  const [season] = await db
    .insert(seasons)
    .values({
      slug: String(formData.get("slug")),
      name,
      year: Number(formData.get("year")),
      startMonth: Number(formData.get("startMonth")),
      startDay: Number(formData.get("startDay")),
      endMonth: Number(formData.get("endMonth")),
      endDay: Number(formData.get("endDay")),
      wholeHouseOnly: formData.get("wholeHouseOnly") === "on",
      minStayNights: Number(formData.get("minStayNights") || 2),
      sortOrder,
    })
    .returning();

  // Alap ár-sorokat is létrehozunk üresen, hogy az admin azonnal tudja szerkeszteni.
  for (const scope of ROOM_SCOPES) {
    if (season.wholeHouseOnly && scope !== "egesz_haz") continue;
    for (const dayType of DAY_TYPES) {
      await db.insert(pricingRules).values({ seasonId: season.id, dayType, roomScope: scope });
    }
  }

  revalidatePath("/admin/arazas");
  revalidatePath("/foglalas");
  revalidatePath("/szobak");
}

async function deleteSeason(formData: FormData) {
  "use server";
  const id = Number(formData.get("seasonId"));
  await db.delete(pricingRules).where(eq(pricingRules.seasonId, id));
  await db.delete(seasons).where(eq(seasons.id, id));
  revalidatePath("/admin/arazas");
  revalidatePath("/foglalas");
  revalidatePath("/szobak");
}

async function updateSeason(formData: FormData) {
  "use server";
  const id = Number(formData.get("seasonId"));
  await db
    .update(seasons)
    .set({
      year: Number(formData.get("year")),
      startMonth: Number(formData.get("startMonth")),
      startDay: Number(formData.get("startDay")),
      endMonth: Number(formData.get("endMonth")),
      endDay: Number(formData.get("endDay")),
      wholeHouseOnly: formData.get("wholeHouseOnly") === "on",
      minStayNights: Number(formData.get("minStayNights")),
      minStayWholeHouseException: formData.get("minStayWholeHouseException")
        ? Number(formData.get("minStayWholeHouseException"))
        : null,
    })
    .where(eq(seasons.id, id));

  for (const scope of ROOM_SCOPES) {
    for (const dayType of DAY_TYPES) {
      const ruleId = formData.get(`rule_${scope}_${dayType}_id`);
      const price = formData.get(`rule_${scope}_${dayType}_price`);
      if (ruleId) {
        await db
          .update(pricingRules)
          .set({ pricePerNight: price ? Number(price) : null })
          .where(eq(pricingRules.id, Number(ruleId)));
      } else if (price) {
        await db.insert(pricingRules).values({ seasonId: id, dayType, roomScope: scope, pricePerNight: Number(price) });
      }
    }
  }

  revalidatePath("/admin/arazas");
  revalidatePath("/foglalas");
  revalidatePath("/szobak");
}

async function updateHoliday(formData: FormData) {
  "use server";
  const id = Number(formData.get("holidayId"));
  const recurring = formData.get("recurring") === "on";
  await db
    .update(holidayOverrides)
    .set({
      name: String(formData.get("name")),
      recurring,
      startMonth: recurring && formData.get("startMonth") ? Number(formData.get("startMonth")) : null,
      startDay: recurring && formData.get("startDay") ? Number(formData.get("startDay")) : null,
      endMonth: recurring && formData.get("endMonth") ? Number(formData.get("endMonth")) : null,
      endDay: recurring && formData.get("endDay") ? Number(formData.get("endDay")) : null,
      startDate: !recurring && formData.get("startDate") ? String(formData.get("startDate")) : null,
      endDate: !recurring && formData.get("endDate") ? String(formData.get("endDate")) : null,
      wholeHouseOnly: formData.get("wholeHouseOnly") === "on",
      minStayNights: Number(formData.get("minStayNights")),
      priceOnRequest: formData.get("priceOnRequest") === "on",
    })
    .where(eq(holidayOverrides.id, id));

  for (const scope of ROOM_SCOPES) {
    const price = formData.get(`price_${scope}`);
    const existing = await db
      .select()
      .from(holidayPrices)
      .where(eq(holidayPrices.holidayId, id));
    const row = existing.find((r) => r.roomScope === scope);
    if (price) {
      if (row) {
        await db.update(holidayPrices).set({ pricePerNight: Number(price) }).where(eq(holidayPrices.id, row.id));
      } else {
        await db.insert(holidayPrices).values({ holidayId: id, roomScope: scope, pricePerNight: Number(price) });
      }
    } else if (row) {
      await db.delete(holidayPrices).where(eq(holidayPrices.id, row.id));
    }
  }

  revalidatePath("/admin/arazas");
  revalidatePath("/foglalas");
  revalidatePath("/szobak");
}

async function updateRoomCapacity(formData: FormData) {
  "use server";
  const id = Number(formData.get("capacityId"));
  await db
    .update(roomCapacityPricing)
    .set({
      baseCapacity: Number(formData.get("baseCapacity")),
      extraGuestFeePerNight: Number(formData.get("extraGuestFeePerNight")),
    })
    .where(eq(roomCapacityPricing.id, id));

  revalidatePath("/admin/arazas");
  revalidatePath("/foglalas");
}

async function updateSettings(formData: FormData) {
  "use server";
  const id = Number(formData.get("settingsId"));
  await db
    .update(pricingSettings)
    .set({
      depositPercent: Number(formData.get("depositPercent")),
      ifaPerPersonPerNight: Number(formData.get("ifaPerPersonPerNight")),
      cancellationFreeHours: Number(formData.get("cancellationFreeHours")),
      checkInFrom: String(formData.get("checkInFrom")),
      checkInTo: String(formData.get("checkInTo")),
      checkOutUntil: String(formData.get("checkOutUntil")),
    })
    .where(eq(pricingSettings.id, id));

  revalidatePath("/admin/arazas");
  revalidatePath("/foglalas");
}

function formatMonthDay(month: number | null, day: number | null) {
  if (!month || !day) return "—";
  return `${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}.`;
}

export default async function AdminArazasPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "beallitasok" ? "beallitasok" : "attekintes";

  const allSeasons = await db
    .select()
    .from(seasons)
    .orderBy(asc(seasons.sortOrder), asc(seasons.year), asc(seasons.id));
  const allRules = await db.select().from(pricingRules);
  const allHolidays = await db.select().from(holidayOverrides).orderBy(asc(holidayOverrides.sortOrder));
  const allHolidayPrices = await db.select().from(holidayPrices);
  const [settings] = await db.select().from(pricingSettings).limit(1);
  const allRoomCapacities = await db.select().from(roomCapacityPricing).orderBy(asc(roomCapacityPricing.id));

  const currentYear = new Date().getFullYear();
  const yearOptions = new Set<number>();
  for (let y = currentYear - 1; y <= currentYear + 4; y++) yearOptions.add(y);
  for (const s of allSeasons) if (s.year) yearOptions.add(s.year);
  const sortedYearOptions = Array.from(yearOptions).sort((a, b) => a - b);

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Árazás</h1>
          <p className="text-sm text-[var(--text2)] mt-1">Szezonok, ünnepnapok, kapacitás és globális beállítások.</p>
        </div>
        <div className="flex gap-1 bg-[var(--surface2)] rounded-lg p-1 border border-[var(--border)]">
          <Link
            href="/admin/arazas?tab=attekintes"
            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
              activeTab === "attekintes" ? "bg-[var(--nav-bg)] text-white" : "text-[var(--text2)] hover:text-[var(--text)]"
            }`}
          >
            Áttekintés
          </Link>
          <Link
            href="/admin/arazas?tab=beallitasok"
            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
              activeTab === "beallitasok" ? "bg-[var(--nav-bg)] text-white" : "text-[var(--text2)] hover:text-[var(--text)]"
            }`}
          >
            Beállítások
          </Link>
        </div>
      </div>

      {activeTab === "attekintes" ? (
        <div className="space-y-10">
          {/* Szezonok összefoglaló */}
          <section>
            <h2 className="text-lg font-medium mb-3">Szezonok</h2>
            <div className="space-y-6">
              {allSeasons.map((season) => {
                const rulesForSeason = allRules.filter((r) => r.seasonId === season.id);
                return (
                  <div key={season.id} className="border border-[var(--border)] rounded-xl p-5">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                      <h3 className="font-medium">
                        {season.name}{" "}
                        <span className="text-[var(--text3)] text-sm font-normal">({season.year})</span>
                      </h3>
                      <span className="text-xs text-[var(--text2)]">
                        {formatMonthDay(season.startMonth, season.startDay)} –{" "}
                        {formatMonthDay(season.endMonth, season.endDay)}
                        {season.wholeHouseOnly ? " · csak egész ház" : ""} · min. {season.minStayNights} éj
                        {season.minStayWholeHouseException
                          ? ` (egész háznál min. ${season.minStayWholeHouseException} éj)`
                          : ""}
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[var(--text2)] text-xs uppercase tracking-wide">
                          <th className="py-1.5">Szoba</th>
                          <th className="py-1.5">Hétköznap</th>
                          <th className="py-1.5">Hétvége</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {ROOM_SCOPES.map((scope) => {
                          if (season.wholeHouseOnly && scope !== "egesz_haz") return null;
                          const weekday = rulesForSeason.find((r) => r.roomScope === scope && r.dayType === "weekday");
                          const weekend = rulesForSeason.find((r) => r.roomScope === scope && r.dayType === "weekend");
                          return (
                            <tr key={scope}>
                              <td className="py-2 text-[var(--text)]">{ROOM_SCOPE_LABELS[scope]}</td>
                              <td className="py-2 text-[var(--accent)]">
                                {weekday?.pricePerNight != null ? `${weekday.pricePerNight.toLocaleString("hu")} Ft` : "—"}
                              </td>
                              <td className="py-2 text-[var(--accent)]">
                                {weekend?.pricePerNight != null ? `${weekend.pricePerNight.toLocaleString("hu")} Ft` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
              {allSeasons.length === 0 && <p className="text-[var(--text3)] text-sm">Még nincs szezon beállítva.</p>}
            </div>
          </section>

          {/* Ünnepnapok összefoglaló */}
          <section>
            <h2 className="text-lg font-medium mb-3">Ünnepnapok &amp; hosszú hétvégék</h2>
            <div className="border border-[var(--border)] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--text2)] text-xs uppercase tracking-wide bg-[var(--surface2)]">
                    <th className="py-2 px-3">Ünnep</th>
                    <th className="py-2 px-3">Időszak</th>
                    <th className="py-2 px-3">Min. éj</th>
                    <th className="py-2 px-3">1-es</th>
                    <th className="py-2 px-3">2-es</th>
                    <th className="py-2 px-3">Superior</th>
                    <th className="py-2 px-3">Egész ház</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {allHolidays.map((h) => {
                    const prices = allHolidayPrices.filter((p) => p.holidayId === h.id);
                    const period = h.recurring
                      ? `${formatMonthDay(h.startMonth, h.startDay)} – ${formatMonthDay(h.endMonth, h.endDay)} (évente)`
                      : `${h.startDate ?? "?"} – ${h.endDate ?? "?"}`;
                    const priceFor = (scope: string) => {
                      if (h.priceOnRequest) return "Egyedi ajánlat";
                      const p = prices.find((pr) => pr.roomScope === scope);
                      return p?.pricePerNight != null ? `${p.pricePerNight.toLocaleString("hu")} Ft` : "—";
                    };
                    return (
                      <tr key={h.id}>
                        <td className="py-2 px-3 text-[var(--text)]">{h.name}</td>
                        <td className="py-2 px-3 text-[var(--text2)] text-xs">{period}</td>
                        <td className="py-2 px-3 text-[var(--text2)]">{h.minStayNights}</td>
                        <td className="py-2 px-3 text-[var(--accent)]">{h.wholeHouseOnly ? "—" : priceFor("szoba-1")}</td>
                        <td className="py-2 px-3 text-[var(--accent)]">{h.wholeHouseOnly ? "—" : priceFor("szoba-2")}</td>
                        <td className="py-2 px-3 text-[var(--accent)]">{h.wholeHouseOnly ? "—" : priceFor("superior")}</td>
                        <td className="py-2 px-3 text-[var(--accent)]">{priceFor("egesz_haz")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Szoba-kapacitás & pótágy-díj összefoglaló */}
          <section>
            <h2 className="text-lg font-medium mb-3">Szoba-kapacitás &amp; pótágy-díj</h2>
            <div className="border border-[var(--border)] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--text2)] text-xs uppercase tracking-wide bg-[var(--surface2)]">
                    <th className="py-2 px-3">Szoba</th>
                    <th className="py-2 px-3">Alap létszám</th>
                    <th className="py-2 px-3">Pótágy-díj/fő/éj</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {allRoomCapacities.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 px-3 text-[var(--text)]">{ROOM_SCOPE_LABELS[c.roomScope] ?? c.roomScope}</td>
                      <td className="py-2 px-3 text-[var(--text2)]">{c.baseCapacity} fő</td>
                      <td className="py-2 px-3 text-[var(--accent)]">{c.extraGuestFeePerNight.toLocaleString("hu")} Ft</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Globális beállítások összefoglaló */}
          {settings && (
            <section>
              <h2 className="text-lg font-medium mb-3">Globális beállítások</h2>
              <div className="border border-[var(--border)] rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-[var(--text3)] text-xs uppercase tracking-wide">Előleg</p>
                  <p className="text-[var(--text)]">{settings.depositPercent} %</p>
                </div>
                <div>
                  <p className="text-[var(--text3)] text-xs uppercase tracking-wide">IFA</p>
                  <p className="text-[var(--text)]">{settings.ifaPerPersonPerNight.toLocaleString("hu")} Ft/fő/éj</p>
                </div>
                <div>
                  <p className="text-[var(--text3)] text-xs uppercase tracking-wide">Ingyenes lemondás</p>
                  <p className="text-[var(--text)]">{settings.cancellationFreeHours} óra</p>
                </div>
                <div>
                  <p className="text-[var(--text3)] text-xs uppercase tracking-wide">Bejelentkezés</p>
                  <p className="text-[var(--text)]">{settings.checkInFrom}–{settings.checkInTo}</p>
                </div>
                <div>
                  <p className="text-[var(--text3)] text-xs uppercase tracking-wide">Kijelentkezés</p>
                  <p className="text-[var(--text)]">{settings.checkOutUntil}-ig</p>
                </div>
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {/* Új szezon */}
          <section>
            <details className="border border-[var(--border)] rounded-xl">
              <summary className="px-5 py-3 cursor-pointer text-sm text-[var(--accent)] hover:underline">
                + Új szezon hozzáadása (pl. egy következő év árainak felvétele)
              </summary>
              <form action={createSeason} className="px-5 pb-5 pt-3 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={label}>Melyik évre vonatkozik?</label>
                    <select name="year" required className={input} defaultValue={currentYear}>
                      {sortedYearOptions.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={label}>Név</label>
                    <input name="name" required placeholder="pl. Nyár – június" className={input} />
                    <p className="text-xs text-[var(--text3)] mt-1">
                      Ha egy meglévő szezon következő évi árát viszed fel, használd pontosan
                      ugyanazt a nevet (pl. „Nyár – június”) – így az Áttekintésben egymás
                      mellett, az évek szerint sorba rendezve jelennek meg.
                    </p>
                  </div>
                  <div>
                    <label className={label}>Slug (egyedi azonosító)</label>
                    <input name="slug" required placeholder="pl. nyar-junius-2027" className={input} />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className={label}>Kezdő hónap</label>
                    <input name="startMonth" type="number" min={1} max={12} required className={input} />
                  </div>
                  <div>
                    <label className={label}>Kezdő nap</label>
                    <input name="startDay" type="number" min={1} max={31} required className={input} />
                  </div>
                  <div>
                    <label className={label}>Záró hónap</label>
                    <input name="endMonth" type="number" min={1} max={12} required className={input} />
                  </div>
                  <div>
                    <label className={label}>Záró nap</label>
                    <input name="endDay" type="number" min={1} max={31} required className={input} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Min. éjszaka</label>
                    <input name="minStayNights" type="number" min={1} defaultValue={2} className={input} />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[var(--text2)] mt-5">
                    <input type="checkbox" name="wholeHouseOnly" /> Csak egész ház foglalható
                  </label>
                </div>
                <button type="submit" className={saveBtn}>Hozzáadás</button>
              </form>
            </details>
          </section>

          {/* Szezonok szerkesztése */}
          <section>
            <h2 className="text-lg font-medium mb-3">Szezonok &amp; árak</h2>
            <div className="space-y-4">
              {allSeasons.map((season) => {
                const rulesForSeason = allRules.filter((r) => r.seasonId === season.id);
                return (
                  <form
                    key={season.id}
                    action={updateSeason}
                    className="border border-[var(--border)] rounded-xl p-5 space-y-4"
                  >
                    <input type="hidden" name="seasonId" value={season.id} />
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="font-medium">
                        {season.name} <span className="text-[var(--text3)] text-sm font-normal">({season.year})</span>
                      </h3>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-xs text-[var(--text2)]">
                          <input type="checkbox" name="wholeHouseOnly" defaultChecked={!!season.wholeHouseOnly} />
                          Csak egész ház foglalható
                        </label>
                        <form action={deleteSeason}>
                          <input type="hidden" name="seasonId" value={season.id} />
                          <button type="submit" className="text-[#C44] hover:bg-[#FCEBEB] text-xs px-2 py-1 rounded transition-colors">
                            Törlés
                          </button>
                        </form>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-3">
                      <div>
                        <label className={label}>Melyik évre vonatkozik?</label>
                        <select name="year" required className={input} defaultValue={season.year}>
                          {sortedYearOptions.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={label}>Kezdő hónap</label>
                        <input name="startMonth" type="number" min={1} max={12} defaultValue={season.startMonth} className={input} />
                      </div>
                      <div>
                        <label className={label}>Kezdő nap</label>
                        <input name="startDay" type="number" min={1} max={31} defaultValue={season.startDay} className={input} />
                      </div>
                      <div>
                        <label className={label}>Záró hónap</label>
                        <input name="endMonth" type="number" min={1} max={12} defaultValue={season.endMonth} className={input} />
                      </div>
                      <div>
                        <label className={label}>Záró nap</label>
                        <input name="endDay" type="number" min={1} max={31} defaultValue={season.endDay} className={input} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={label}>Min. éjszaka</label>
                        <input name="minStayNights" type="number" min={1} defaultValue={season.minStayNights} className={input} />
                      </div>
                      <div>
                        <label className={label}>Min. éjszaka kivétel egész háznál (üres = nincs)</label>
                        <input
                          name="minStayWholeHouseException"
                          type="number"
                          min={1}
                          defaultValue={season.minStayWholeHouseException ?? ""}
                          className={input}
                        />
                      </div>
                    </div>

                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[var(--text2)] text-xs uppercase tracking-wide">
                          <th className="py-1.5">Szoba</th>
                          <th className="py-1.5">Hétköznap (Ft/éj)</th>
                          <th className="py-1.5">Hétvége (Ft/éj)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {ROOM_SCOPES.map((scope) => {
                          if (season.wholeHouseOnly && scope !== "egesz_haz") return null;
                          const weekday = rulesForSeason.find((r) => r.roomScope === scope && r.dayType === "weekday");
                          const weekend = rulesForSeason.find((r) => r.roomScope === scope && r.dayType === "weekend");
                          return (
                            <tr key={scope}>
                              <td className="py-2 text-[var(--text)]">{ROOM_SCOPE_LABELS[scope]}</td>
                              <td className="py-2">
                                {weekday && <input type="hidden" name={`rule_${scope}_weekday_id`} value={weekday.id} />}
                                <input
                                  name={`rule_${scope}_weekday_price`}
                                  type="number"
                                  defaultValue={weekday?.pricePerNight ?? ""}
                                  className={input}
                                />
                              </td>
                              <td className="py-2">
                                {weekend && <input type="hidden" name={`rule_${scope}_weekend_id`} value={weekend.id} />}
                                <input
                                  name={`rule_${scope}_weekend_price`}
                                  type="number"
                                  defaultValue={weekend?.pricePerNight ?? ""}
                                  className={input}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <button type="submit" className={saveBtn}>
                      Mentés
                    </button>
                  </form>
                );
              })}
            </div>
          </section>

          {/* Ünnepnapok */}
          <section>
            <h2 className="text-lg font-medium mb-3">Ünnepnapok &amp; hosszú hétvégék</h2>
            <div className="space-y-4">
              {allHolidays.map((h) => {
                const pricesForHoliday = allHolidayPrices.filter((p) => p.holidayId === h.id);
                return (
                  <form key={h.id} action={updateHoliday} className="border border-[var(--border)] rounded-xl p-5 space-y-4">
                    <input type="hidden" name="holidayId" value={h.id} />
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <input name="name" defaultValue={h.name} className={`${input} max-w-xs`} />
                      <div className="flex items-center gap-4 text-xs text-[var(--text2)]">
                        <label className="flex items-center gap-1.5">
                          <input type="checkbox" name="recurring" defaultChecked={h.recurring} /> Évente ismétlődő
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input type="checkbox" name="wholeHouseOnly" defaultChecked={!!h.wholeHouseOnly} /> Csak egész ház
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input type="checkbox" name="priceOnRequest" defaultChecked={!!h.priceOnRequest} /> Egyedi ajánlat
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className={label}>Hó (tól)</label>
                          <input name="startMonth" type="number" min={1} max={12} defaultValue={h.startMonth ?? ""} className={input} />
                        </div>
                        <div>
                          <label className={label}>Nap (tól)</label>
                          <input name="startDay" type="number" min={1} max={31} defaultValue={h.startDay ?? ""} className={input} />
                        </div>
                        <div>
                          <label className={label}>Hó (ig)</label>
                          <input name="endMonth" type="number" min={1} max={12} defaultValue={h.endMonth ?? ""} className={input} />
                        </div>
                        <div>
                          <label className={label}>Nap (ig)</label>
                          <input name="endDay" type="number" min={1} max={31} defaultValue={h.endDay ?? ""} className={input} />
                        </div>
                        <p className="col-span-4 text-xs text-[var(--text3)]">Évente ismétlődő ünnepekhez (pl. Karácsony).</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={label}>Dátum (tól)</label>
                          <input name="startDate" type="date" defaultValue={h.startDate ?? ""} className={input} />
                        </div>
                        <div>
                          <label className={label}>Dátum (ig)</label>
                          <input name="endDate" type="date" defaultValue={h.endDate ?? ""} className={input} />
                        </div>
                        <p className="col-span-2 text-xs text-[var(--text3)]">Mozgó ünnepekhez (Húsvét, Pünkösd) – évente frissítendő.</p>
                      </div>
                    </div>

                    <div>
                      <label className={label}>Min. éjszaka</label>
                      <input name="minStayNights" type="number" min={1} defaultValue={h.minStayNights} className={`${input} max-w-[120px]`} />
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {ROOM_SCOPES.map((scope) => {
                        if (h.wholeHouseOnly && scope !== "egesz_haz") return null;
                        const existing = pricesForHoliday.find((p) => p.roomScope === scope);
                        return (
                          <div key={scope}>
                            <label className={label}>{ROOM_SCOPE_LABELS[scope]} (Ft/éj)</label>
                            <input
                              name={`price_${scope}`}
                              type="number"
                              defaultValue={existing?.pricePerNight ?? ""}
                              className={input}
                              disabled={!!h.priceOnRequest}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <button type="submit" className={saveBtn}>
                      Mentés
                    </button>
                  </form>
                );
              })}
            </div>
          </section>

          {/* Szoba-kapacitás & pótágy-díj */}
          <section>
            <h2 className="text-lg font-medium mb-3">Szoba-kapacitás &amp; pótágy-díj</h2>
            <p className="text-xs text-[var(--text3)] mb-3">
              Az "Alap létszám" fölötti minden további vendég (pl. pótágy, kihúzható kanapé) után
              a megadott pótágy-díj számolódik fel éjszakánként, az adott szoba alapárán felül.
            </p>
            <div className="space-y-3">
              {allRoomCapacities.map((c) => (
                <form
                  key={c.id}
                  action={updateRoomCapacity}
                  className="border border-[var(--border)] rounded-xl p-4 flex items-end gap-4 flex-wrap"
                >
                  <input type="hidden" name="capacityId" value={c.id} />
                  <p className="font-medium text-sm w-32 shrink-0">{ROOM_SCOPE_LABELS[c.roomScope] ?? c.roomScope}</p>
                  <div>
                    <label className={label}>Alap létszám (fő)</label>
                    <input name="baseCapacity" type="number" min={1} defaultValue={c.baseCapacity} className={input} />
                  </div>
                  <div>
                    <label className={label}>Pótágy-díj (Ft/fő/éj)</label>
                    <input name="extraGuestFeePerNight" type="number" min={0} defaultValue={c.extraGuestFeePerNight} className={input} />
                  </div>
                  <button type="submit" className={saveBtn}>Mentés</button>
                </form>
              ))}
            </div>
          </section>

          {/* Globális beállítások */}
          {settings && (
            <section>
              <h2 className="text-lg font-medium mb-3">Globális beállítások</h2>
              <form action={updateSettings} className="border border-[var(--border)] rounded-xl p-5 space-y-4 max-w-2xl">
                <input type="hidden" name="settingsId" value={settings.id} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Előleg (%)</label>
                    <input name="depositPercent" type="number" defaultValue={settings.depositPercent} className={input} />
                  </div>
                  <div>
                    <label className={label}>IFA (Ft/fő/éj)</label>
                    <input name="ifaPerPersonPerNight" type="number" defaultValue={settings.ifaPerPersonPerNight} className={input} />
                  </div>
                  <div>
                    <label className={label}>Ingyenes lemondás (óra)</label>
                    <input name="cancellationFreeHours" type="number" defaultValue={settings.cancellationFreeHours} className={input} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={label}>Bejelentkezés tól</label>
                    <input name="checkInFrom" defaultValue={settings.checkInFrom ?? ""} className={input} />
                  </div>
                  <div>
                    <label className={label}>Bejelentkezés ig</label>
                    <input name="checkInTo" defaultValue={settings.checkInTo ?? ""} className={input} />
                  </div>
                  <div>
                    <label className={label}>Kijelentkezés ig</label>
                    <input name="checkOutUntil" defaultValue={settings.checkOutUntil ?? ""} className={input} />
                  </div>
                </div>
                <button type="submit" className={saveBtn}>
                  Mentés
                </button>
              </form>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

const input = "mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[14px] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] block disabled:opacity-40";
const label = "text-xs text-[var(--text2)] uppercase tracking-wide";
const saveBtn = "px-5 py-2 rounded-md bg-[var(--nav-bg)] text-white text-[14px] font-semibold hover:opacity-90 transition-opacity";
