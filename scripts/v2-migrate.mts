// BlueNet CMS v2 – egyszeri migráció a régi árazási motorból az új modellre.
//
//   node --env-file=<env> scripts/v2-migrate.mts --confirm-host=<db-host> [--dry-run]
//
// Előfeltétel: az új táblák léteznek (drizzle-kit push). A script idempotens:
// újrafuttatva nem ír felül már meglévő day_rates / closures / bookings sort.
//
//  1. settings        ← pricing_settings + room_capacity_pricing (egész ház felár)
//  2. day_rates       ← szezonok, szabályok, ünnepnapok a következő 730 napra, szobánként
//                       (a szezonok hónap/nap alapján a következő évekre is kivetítve)
//  3. closures        ← availability (blocked) sorok
//  4. bookings        ← messages (booking_request); ha minden éjszaka le volt zárva,
//                       "visszaigazolt" és a lezárások a foglaláshoz kötődnek

import { neon } from "@neondatabase/serverless";
import {
  getMinStay,
  isWholeHouseOnlyForDate,
  resolveRateForDate,
  type PricingData,
  type RoomScope as OldScope,
  type SeasonRow,
} from "../src/lib/pricing.ts";

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"] as const;
  }),
);
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL hiányzik.");
const host = new URL(url).hostname;
if (args.get("confirm-host") !== host) {
  console.error(`Cél-adatbázis: ${host}\nFuttatás: --confirm-host=${host}`);
  process.exit(1);
}
const DRY = args.has("dry-run");
const sql = neon(url);

const SCOPES: OldScope[] = ["szoba-1", "szoba-2", "superior", "egesz_haz"];
const ROOMS = ["szoba-1", "szoba-2", "superior"];
const DAYS = 730;

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayIso = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Budapest" }).format(new Date());
const addDaysIso = (s: string, n: number) => {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const nightsOf = (ci: string, co: string) => {
  const out: string[] = [];
  for (let d = ci; d < co; d = addDaysIso(d, 1)) out.push(d);
  return out;
};

console.log(`Cél: ${host}${DRY ? " (DRY RUN – nem ír)" : ""}\nMa: ${todayIso}\n`);

// ─── Régi adatok ────────────────────────────────────────────────────────────
const [seasonRows, ruleRows, holidayRows, holidayPriceRows, settingsRows, capacityRows] = await Promise.all([
  sql`SELECT * FROM seasons WHERE active = true`,
  sql`SELECT * FROM pricing_rules`,
  // Sorrend nélkül, ahogy az éles oldal is olvassa – átfedő ünnepeknél ez dönt.
  sql`SELECT * FROM holiday_overrides WHERE active = true`,
  sql`SELECT * FROM holiday_prices`,
  sql`SELECT * FROM pricing_settings LIMIT 1`,
  sql`SELECT * FROM room_capacity_pricing`,
]);

const seasons: SeasonRow[] = seasonRows.map((s) => ({
  id: s.id,
  slug: s.slug,
  name: s.name,
  startMonth: s.start_month,
  startDay: s.start_day,
  endMonth: s.end_month,
  endDay: s.end_day,
  year: s.year,
  wholeHouseOnly: s.whole_house_only,
  minStayNights: s.min_stay_nights,
  minStayWholeHouseException: s.min_stay_whole_house_exception,
  active: s.active,
}));

// Szezonok kivetítése: ahol egy hónap/nap-tartományra adott évben nincs sor,
// a legközelebbi év sora (azonos id → azonos árszabályok) érvényes.
const projected: SeasonRow[] = [...seasons];
const rangeKey = (s: SeasonRow) => `${s.startMonth}-${s.startDay}-${s.endMonth}-${s.endDay}`;
const byRange = new Map<string, SeasonRow[]>();
for (const s of seasons) byRange.set(rangeKey(s), [...(byRange.get(rangeKey(s)) ?? []), s]);
const thisYear = Number(todayIso.slice(0, 4));
for (const list of byRange.values()) {
  for (let y = thisYear - 1; y <= thisYear + 3; y++) {
    if (list.some((s) => s.year === y)) continue;
    const nearest = [...list].sort((a, b) => Math.abs(a.year - y) - Math.abs(b.year - y))[0];
    projected.push({ ...nearest, year: y });
  }
}

const data: PricingData = {
  seasons: projected,
  rules: ruleRows.map((r) => ({
    id: r.id,
    seasonId: r.season_id,
    dayType: r.day_type,
    roomScope: r.room_scope,
    pricePerNight: r.price_per_night,
    priceOnRequest: r.price_on_request,
  })),
  holidays: holidayRows.map((h) => ({
    id: h.id,
    slug: h.slug,
    name: h.name,
    recurring: h.recurring,
    startMonth: h.start_month,
    startDay: h.start_day,
    endMonth: h.end_month,
    endDay: h.end_day,
    startDate: h.start_date ? iso(new Date(h.start_date)) : null,
    endDate: h.end_date ? iso(new Date(h.end_date)) : null,
    wholeHouseOnly: h.whole_house_only,
    minStayNights: h.min_stay_nights,
    priceOnRequest: h.price_on_request,
    active: h.active,
  })),
  holidayPrices: holidayPriceRows.map((p) => ({
    id: p.id,
    holidayId: p.holiday_id,
    roomScope: p.room_scope,
    pricePerNight: p.price_per_night,
  })),
  settings: null,
  roomCapacities: capacityRows.map((c) => ({
    id: c.id,
    roomScope: c.room_scope,
    baseCapacity: c.base_capacity,
    extraGuestFeePerNight: c.extra_guest_fee_per_night,
  })),
};
const extraFee = (scope: string) => data.roomCapacities.find((c) => c.roomScope === scope)?.extraGuestFeePerNight ?? null;

// ─── 1. settings ────────────────────────────────────────────────────────────
const [existingSettings] = await sql`SELECT id FROM settings LIMIT 1`;
const old = settingsRows[0];
if (existingSettings) {
  console.log("1. settings: már létezik, nem változik");
} else {
  console.log("1. settings: létrehozás a régi beállításokból");
  if (!DRY) {
    await sql`INSERT INTO settings (over10_fee_per_night, ifa_per_person_per_night, deposit_percent, check_in_from, check_out_until)
              VALUES (${extraFee("egesz_haz") ?? 7000}, ${old?.ifa_per_person_per_night ?? 600}, ${old?.deposit_percent ?? 10},
                      ${old?.check_in_from ?? "15:00"}, ${old?.check_out_until ?? "10:00"})`;
  }
}

// ─── 2. day_rates ───────────────────────────────────────────────────────────
const rows: { scope: string; date: string; price: number | null; extra: number | null; min: number; whole: boolean }[] = [];
const noSeason: string[] = [];
for (let i = 0; i < DAYS; i++) {
  const dateIso = addDaysIso(todayIso, i);
  const [y, m, d] = dateIso.split("-").map(Number);
  const date = new Date(y, m - 1, d); // helyi idő, ahogy a régi motor számolt
  const whole = isWholeHouseOnlyForDate(date, data);
  for (const scope of SCOPES) {
    const rate = resolveRateForDate(date, scope, data);
    if (rate.source === "none") {
      if (scope === "szoba-1") noSeason.push(dateIso);
      continue;
    }
    rows.push({
      scope,
      date: dateIso,
      price: rate.priceOnRequest || !rate.available ? null : rate.pricePerNight,
      extra: scope === "egesz_haz" ? null : extraFee(scope),
      min: getMinStay(date, scope, data),
      whole,
    });
  }
}
console.log(`2. day_rates: ${rows.length} sor (${DAYS} nap × ${SCOPES.length})`);
if (noSeason.length) console.log(`   FIGYELEM: ${noSeason.length} napra nincs szezon (kimarad): ${noSeason[0]} … ${noSeason[noSeason.length - 1]}`);

// Ellenőrző minta a régi motorral egyező árakról
for (const sample of ["2026-10-06", "2026-10-09", "2026-12-24", "2026-12-31", "2027-03-15", "2027-07-10"]) {
  const r = rows.filter((x) => x.date === sample);
  if (r.length) console.log(`   ${sample}: ${r.map((x) => `${x.scope}=${x.price ?? "–"}${x.whole ? "*" : ""}/min${x.min}`).join("  ")}`);
}

if (!DRY) {
  for (let i = 0; i < rows.length; i += 400) {
    const chunk = rows.slice(i, i + 400);
    await sql`
      INSERT INTO day_rates (room_scope, date, price, extra_person_price, min_nights, whole_house_only)
      SELECT * FROM unnest(${chunk.map((r) => r.scope)}::text[], ${chunk.map((r) => r.date)}::date[],
                           ${chunk.map((r) => r.price)}::int[], ${chunk.map((r) => r.extra)}::int[],
                           ${chunk.map((r) => r.min)}::int[], ${chunk.map((r) => r.whole)}::bool[])
      ON CONFLICT (room_scope, date) DO NOTHING`;
  }
}

// ─── 3. closures ────────────────────────────────────────────────────────────
const [{ n: blockedCount }] = await sql`SELECT count(*)::int AS n FROM availability WHERE status = 'blocked' AND room_slug = ANY(${ROOMS}::text[])`;
console.log(`3. closures: ${blockedCount} lezárt nap az availability táblából`);
if (!DRY) {
  await sql`
    INSERT INTO closures (room_scope, date, note)
    SELECT room_slug, date, COALESCE(note, 'Kézi lezárás') FROM availability
    WHERE status = 'blocked' AND room_slug = ANY(${ROOMS}::text[])
    ON CONFLICT (room_scope, date) DO NOTHING`;
}

// ─── 4. bookings ────────────────────────────────────────────────────────────
const msgs = await sql`SELECT * FROM messages WHERE type = 'booking_request' ORDER BY id`;
const closedNow = await sql`SELECT room_scope, date::text AS d, booking_id FROM closures`;
const closedSet = new Set(closedNow.map((c) => `${c.room_scope}|${c.d}`));
// DRY RUN-nál a closures még üres lehet – ilyenkor az availability-ből becslünk.
if (DRY) {
  const av = await sql`SELECT room_slug, date::text AS d FROM availability WHERE status = 'blocked'`;
  for (const a of av) closedSet.add(`${a.room_slug}|${a.d}`);
}

console.log(`4. bookings: ${msgs.length} régi foglalási kérés`);
for (const m of msgs) {
  const slug: string = m.room_slug ?? "";
  const scope = slug === "egész vendégház" || slug === "egesz_haz" ? "egesz_haz" : slug.split(",")[0];
  if (!SCOPES.includes(scope as OldScope) || !m.check_in || !m.check_out) {
    console.log(`   #${m.id}: kihagyva (ismeretlen szoba vagy dátum: ${slug})`);
    continue;
  }
  const ci = iso(new Date(m.check_in));
  const co = iso(new Date(m.check_out));
  const rooms = scope === "egesz_haz" ? ROOMS : [scope];
  const nights = nightsOf(ci, co);
  const fullyClosed = nights.length > 0 && nights.every((d) => rooms.every((r) => closedSet.has(`${r}|${d}`)));
  const past = co < todayIso;
  const status = fullyClosed ? "visszaigazolt" : past ? "lemondott" : "valaszra_var";
  const meal = m.felpanzio === "mindketto" ? "felpanzio" : m.felpanzio === "reggeli" || m.felpanzio === "vacsora" ? m.felpanzio : "nincs";
  const note = slug.includes(",") ? `Eredetileg több szobára kérték: ${slug}` : null;
  console.log(`   #${m.id}: ${m.name} · ${scope} · ${ci}→${co} · ${m.guests} fő → ${status}${fullyClosed ? " (minden éj le volt zárva)" : ""}`);
  if (DRY) continue;

  const inserted = await sql`
    INSERT INTO bookings (name, email, phone, room_scope, check_in, check_out, guests, meal, meal_guests, total,
                          source, status, guest_message, note, legacy_message_id, created_at, accepted_at, cancelled_at)
    VALUES (${m.name}, ${m.email}, ${m.phone}, ${scope}, ${ci}, ${co}, ${m.guests ?? 1}, ${meal},
            ${meal === "nincs" ? null : m.felpanzio_fo}, ${m.total_price}, 'weboldal', ${status},
            ${m.message}, ${note}, ${m.id}, ${m.created_at ?? new Date()},
            ${status === "visszaigazolt" ? (m.created_at ?? new Date()) : null},
            ${status === "lemondott" ? new Date() : null})
    ON CONFLICT (legacy_message_id) DO NOTHING
    RETURNING id`;
  if (inserted.length && fullyClosed) {
    await sql`UPDATE closures SET booking_id = ${inserted[0].id}
              WHERE booking_id IS NULL AND room_scope = ANY(${rooms}::text[]) AND date = ANY(${nights}::date[])`;
  }
}

// ─── Összegzés ──────────────────────────────────────────────────────────────
if (!DRY) {
  const [c] = await sql`SELECT
    (SELECT count(*)::int FROM day_rates) AS rates,
    (SELECT count(*)::int FROM closures) AS closures,
    (SELECT count(*)::int FROM bookings) AS bookings,
    (SELECT count(*)::int FROM settings) AS settings`;
  console.log(`\nKész. day_rates=${c.rates}, closures=${c.closures}, bookings=${c.bookings}, settings=${c.settings}`);
}
