// 2027-es árazás: tarifák (A–H), létszám szerinti napi árak, csomagok.
//
//   node --env-file=<env> scripts/arak-2027.mts --confirm-host=<db-host> [--dry-run]
//
// Idempotens. Meglévő lezárásokat és foglalásokat NEM érint, csak árat/tarifát ír.
//  1. tariffs + tariff_prices + stay_packages  (upsert)
//  2. 2026 hátralévő napjai: day_rates → day_prices létszámsorok (a végösszeg nem változik;
//     meglévő day_prices sort nem ír felül)
//  3. 2027: a megadott napi tarifa-sorok + címkék (Húsvét G = min. 3 éj)
//  4. 2028 jan–szept.: vetítés a 2027-es minta szerint

import { neon } from "@neondatabase/serverless";

const args = new Map(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? "true"] as const; }));
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL hiányzik.");
const host = new URL(url).hostname;
if (args.get("confirm-host") !== host) {
  console.error(`Cél-adatbázis: ${host.split(".")[0]}…\nFuttatás: --confirm-host=<a teljes host>`);
  process.exit(1);
}
const DRY = args.has("dry-run");
const sql = neon(url);

const ROOMS = ["szoba-1", "szoba-2", "superior"];
const SCOPES = [...ROOMS, "egesz_haz"];
const todayIso = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Budapest" }).format(new Date());
const addDays = (s: string, n: number) => { const d = new Date(`${s}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dow = (s: string) => new Date(`${s}T12:00:00Z`).getUTCDay();
const days = (from: string, to: string) => { const out: string[] = []; for (let d = from; d <= to; d = addDays(d, 1)) out.push(d); return out; };

// ─── 1. Tarifatábla ─────────────────────────────────────────────────────────
type Tariff = { code: string; name: string; min: number; mode: "open" | "release" | "never"; release: number | null; third: boolean; lastMinute: boolean; peak: boolean; pkg: "low" | "high" | null; color: string; house: number[] };
const TARIFFS: Tariff[] = [
  { code: "A", name: "Holtszezon – hétköznap", min: 1, mode: "open", release: null, third: true, lastMinute: true, peak: false, pkg: "low", color: "#DCE8F5", house: [84000, 91000, 98000, 105000, 112000] },
  { code: "B", name: "Holtszezon – hétvége, téli szünet", min: 2, mode: "open", release: null, third: true, lastMinute: false, peak: false, pkg: "low", color: "#B9D2EC", house: [88000, 95000, 102000, 109000, 116000] },
  { code: "C", name: "Tavasz-ősz – hétköznap", min: 1, mode: "open", release: null, third: true, lastMinute: false, peak: false, pkg: "low", color: "#DDEEDC", house: [84000, 91000, 98000, 105000, 112000] },
  { code: "D", name: "Tavasz-ősz – hétvége, szünet", min: 2, mode: "open", release: null, third: true, lastMinute: false, peak: false, pkg: "low", color: "#B8DBB5", house: [95000, 102000, 109000, 116000, 123000] },
  { code: "E", name: "Nyár – hétköznap", min: 3, mode: "release", release: 14, third: false, lastMinute: false, peak: false, pkg: "high", color: "#FBEBB8", house: [98000, 105000, 112000, 119000, 126000] },
  { code: "F", name: "Nyár – hétvége", min: 3, mode: "release", release: 14, third: false, lastMinute: false, peak: false, pkg: "high", color: "#F7D08A", house: [108000, 115000, 122000, 129000, 136000] },
  { code: "G", name: "Ünnep, nagy rendezvény", min: 2, mode: "release", release: 21, third: false, lastMinute: false, peak: true, pkg: "high", color: "#F4C2B8", house: [118000, 125000, 132000, 139000, 146000] },
  { code: "H", name: "Szilveszter", min: 3, mode: "never", release: null, third: false, lastMinute: false, peak: true, pkg: null, color: "#D9C6EC", house: [150000, 157000, 164000, 171000, 178000] },
];
const HOUSE_GUESTS = [8, 9, 10, 11, 12];
const ROOM_PRICES: Record<string, Record<number, number>> = {
  "szoba-1": { 1: 18000, 2: 18000, 3: 25000 },
  "szoba-2": { 1: 18000, 2: 18000, 3: 25000 },
  superior: { 1: 25000, 2: 25000, 3: 33000, 4: 41000 },
};
// tarifa → scope → létszám → ár
const priceTable = new Map<string, Map<string, Map<number, number>>>();
for (const t of TARIFFS) {
  const m = new Map<string, Map<number, number>>();
  m.set("egesz_haz", new Map(HOUSE_GUESTS.map((g, i) => [g, t.house[i]])));
  if (t.mode !== "never") for (const r of ROOMS) m.set(r, new Map(Object.entries(ROOM_PRICES[r]).map(([g, p]) => [Number(g), p])));
  priceTable.set(t.code, m);
}

const PACKAGES = [
  { slug: "dezsa-sobarlang", name: "Dézsa & Sóbarlang", includes: "Dézsa minden 2. éj után, sóbarlang 2 óra/nap, welcome ital.", low: 119000, high: 134000, max: 12, months: null, sort: 1 },
  { slug: "gasztro-wellness", name: "Gasztró-Wellness Mix", includes: "Dézsa vagy kemence, finn szauna 1,5 óra/nap, sóbarlang 1 óra/nap.", low: 129000, high: 144000, max: 12, months: null, sort: 2 },
  { slug: "all-in-premium", name: "All-In Premium", includes: "Finn és infraszauna 3–3 óra/nap, sóbarlang 2 óra/nap, legfeljebb 3 dézsa vagy kemence.", low: 139000, high: 154000, max: 12, months: null, sort: 3 },
  { slug: "teli-sobarlang-dezsa", name: "Téli Sóbarlang & Dézsa", includes: "Dézsa minden 2. éj után, Szaunanap, forralt bor.", low: 105000, high: null, max: 8, months: "11,12,1,2,3", sort: 4 },
];

// ─── 3. 2027 napi tarifák ──────────────────────────────────────────────────
const LETTERS_2027 = [
  "GGAAAAABBAAAAABBAAAAABBAAAAABBA", "AAAABBAAAAABBAAAAABBAAAAABBA", "AAAABBAAAAAGGGCCCCDDCCCCGGGGDDD",
  "DDDDCCCCDDCCCGGGGGCCCCDDCCCCCD", "DCCCCCDDCCCCCGGGCCCCDDCCCCCDDCC", "EEEFFEEEEEFFEEEEGGGGEEEEFFEEEE",
  "EFFEEEEEFFEEEEEFFEEEEEFFEEEEEFF", "EEEEEFFEEEEEFFEEEEGGGEEEEEFFEEE", "CCDDCCCCCDDCCCCCDDCCCCCDDCCCCG",
  "GGCCCCCDDCCCCCDDCCCCCDDDDDDDGGG", "AAAABBAAAAABBAAAAABBAAAAABBAAA", "AABBAAAAABBAAAAABBBBBBBGGGBBHHH",
];
const MONTH_LEN_2027 = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
LETTERS_2027.forEach((s, i) => {
  if (s.length !== MONTH_LEN_2027[i]) throw new Error(`2027. ${i + 1}. hónap: ${s.length} betű, ${MONTH_LEN_2027[i]} kellene – megállok.`);
});
const LABELS_2027: [string, string, string][] = [
  ["01-01", "01-01", "Újév"], ["02-14", "02-14", "Valentin"], ["03-05", "03-07", "Díjugrató*"], ["03-15", "03-15", "Nemzeti ünnep"],
  ["03-26", "03-26", "Nagypéntek"], ["03-28", "03-28", "Húsvét"], ["03-29", "03-29", "Húsvéthétfő"], ["04-14", "04-18", "Masters*"],
  ["05-01", "05-01", "Május 1."], ["05-08", "05-09", "Díjlovaglás*"], ["05-16", "05-16", "Pünkösd"], ["05-17", "05-17", "Pünkösdhétfő"],
  ["06-05", "06-06", "Szalajka Kupa*"], ["06-11", "06-13", "Díjugrató*"], ["06-17", "06-20", "Fogathajtás*"], ["07-09", "07-11", "Díjugrató*"],
  ["07-24", "07-25", "Díjlovaglás*"], ["08-13", "08-15", "Championátus*"], ["08-20", "08-20", "Államalapítás"], ["08-21", "08-21", "Lipicai Gála*"],
  ["08-22", "08-22", "Nemz. Viadala*"], ["09-04", "09-04", "Szilvanap*"], ["09-10", "09-12", "Díjugrató*"], ["09-30", "09-30", "Vágta*"],
  ["10-01", "10-03", "Nemzeti Vágta*"], ["10-23", "10-24", "Lóárverés*"], ["11-01", "11-01", "Mindenszentek"], ["12-24", "12-24", "Szenteste"],
  ["12-25", "12-26", "Karácsony"], ["12-31", "12-31", "Szilveszter"],
];
const EASTER_MIN3_2027 = days("2027-03-25", "2027-03-28");

type Day = { date: string; tariff: string; label: string | null; min: number };
const plan: Day[] = [];
const tariffByCode = new Map(TARIFFS.map((t) => [t.code, t]));

LETTERS_2027.forEach((s, mi) => {
  [...s].forEach((code, di) => {
    const date = `2027-${String(mi + 1).padStart(2, "0")}-${String(di + 1).padStart(2, "0")}`;
    const min = EASTER_MIN3_2027.includes(date) && code === "G" ? 3 : tariffByCode.get(code)!.min;
    plan.push({ date, tariff: code, label: null, min });
  });
});
for (const [from, to, label] of LABELS_2027) {
  for (const d of days(`2027-${from}`, `2027-${to}`)) plan.find((p) => p.date === d)!.label = label;
}

// ─── 4. 2028 jan–szept. vetítés ────────────────────────────────────────────
const isWeekendNight = (d: string) => dow(d) === 5 || dow(d) === 6; // péntek + szombat éj
for (const date of days("2028-01-01", "2028-09-30")) {
  const md = date.slice(5);
  let code: string;
  if (md <= "03-14") code = isWeekendNight(date) ? "B" : "A";
  else if (md <= "05-31" || md >= "09-01") code = isWeekendNight(date) ? "D" : "C";
  else code = isWeekendNight(date) ? "F" : "E";
  let label: string | null = null;
  let min = tariffByCode.get(code)!.min;
  const g = (lbl: string, m = 2) => { code = "G"; label = `${lbl} (2028, becsült)`; min = m; };
  if (md === "01-01") g("Újév");
  else if (md === "01-02") g("Újév");
  else if (date >= "2028-04-13" && date <= "2028-04-16") g("Húsvét", 3);
  else if (date >= "2028-06-02" && date <= "2028-06-04") g("Pünkösd");
  else if (md === "08-19" || md === "08-20") g("Államalapítás");
  plan.push({ date, tariff: code, label, min });
}

// ─── Összesítés ─────────────────────────────────────────────────────────────
const count2027 = plan.filter((p) => p.date < "2028").length;
const count2028 = plan.length - count2027;
const byLetter = (year: string) => Object.entries(plan.filter((p) => p.date.startsWith(year)).reduce<Record<string, number>>((a, p) => ((a[p.tariff] = (a[p.tariff] ?? 0) + 1), a), {})).sort().map(([k, v]) => `${k}:${v}`).join(" ");

const dayRateRows: { scope: string; date: string; tariff: string; label: string | null; min: number; whole: boolean; price: number | null }[] = [];
const dayPriceRows: { scope: string; date: string; guests: number; price: number }[] = [];
for (const p of plan) {
  const t = tariffByCode.get(p.tariff)!;
  const table = priceTable.get(p.tariff)!;
  for (const scope of SCOPES) {
    const prices = table.get(scope);
    dayRateRows.push({
      scope, date: p.date, tariff: p.tariff, label: p.label, min: p.min,
      whole: scope !== "egesz_haz" && t.mode !== "open",
      price: prices ? prices.get(scope === "egesz_haz" ? 8 : 2) ?? null : null,
    });
    if (prices) for (const [guests, price] of prices) dayPriceRows.push({ scope, date: p.date, guests, price });
  }
}

// 2026 hátralévő napjai: létszámsorok a mostani árból (végösszeg változatlan)
const [s] = await sql`SELECT over10_fee_per_night FROM settings LIMIT 1`;
const over10 = s?.over10_fee_per_night ?? 7000;
const legacy = await sql`SELECT room_scope, date::text AS d, price, extra_person_price FROM day_rates
  WHERE date >= ${todayIso} AND date <= '2026-12-31' AND price IS NOT NULL`;
const legacyRows: typeof dayPriceRows = [];
let legacySkippedNoExtra = 0;
for (const r of legacy) {
  const price = Number(r.price);
  if (r.room_scope === "egesz_haz") {
    for (const [g, add] of [[8, 0], [9, 0], [10, 0], [11, over10], [12, 2 * over10]] as const) legacyRows.push({ scope: r.room_scope, date: r.d, guests: g, price: price + add });
  } else {
    const extra = r.extra_person_price == null ? null : Number(r.extra_person_price);
    const max = r.room_scope === "superior" ? 4 : 3;
    for (let g = 1; g <= max; g++) {
      if (g > 2 && extra == null) { legacySkippedNoExtra++; continue; }
      legacyRows.push({ scope: r.room_scope, date: r.d, guests: g, price: price + Math.max(0, g - 2) * (extra ?? 0) });
    }
  }
}

console.log(`Cél: ${host.split(".")[0]}…${DRY ? " (DRY RUN – nem ír)" : ""}   ma: ${todayIso}`);
console.log(`1. tarifák: ${TARIFFS.length}, tarifaárak: ${[...priceTable.values()].reduce((a, m) => a + [...m.values()].reduce((b, x) => b + x.size, 0), 0)}, csomagok: ${PACKAGES.length}`);
console.log(`2. 2026 (${todayIso} – 2026-12-31): ${legacy.length} napi sor → ${legacyRows.length} létszámsor${legacySkippedNoExtra ? ` (${legacySkippedNoExtra} pótágyár nélküli sor kimaradt)` : ""}`);
console.log(`3. 2027: ${count2027} nap → ${dayRateRows.filter((r) => r.date < "2028").length} napi sor, ${dayPriceRows.filter((r) => r.date < "2028").length} létszámsor   [${byLetter("2027")}]`);
console.log(`4. 2028 jan–szept.: ${count2028} nap → ${dayRateRows.filter((r) => r.date >= "2028").length} napi sor, ${dayPriceRows.filter((r) => r.date >= "2028").length} létszámsor   [${byLetter("2028")}]`);
for (const d of ["2027-01-01", "2027-01-15", "2027-03-06", "2027-03-26", "2027-07-20", "2027-12-29", "2028-01-01", "2028-04-14", "2028-06-03"]) {
  const p = plan.find((x) => x.date === d)!;
  console.log(`   ${d} (${["V", "H", "K", "Sze", "Cs", "P", "Szo"][dow(d)]}): ${p.tariff}, min ${p.min}${p.label ? `, „${p.label}”` : ""}`);
}
if (DRY) process.exit(0);

// ─── Írás ───────────────────────────────────────────────────────────────────
for (const t of TARIFFS) {
  await sql`INSERT INTO tariffs (code, name, min_nights, room_mode, release_days, third_night_discount, last_minute_discount, peak_deposit, package_group, color, sort_order)
    VALUES (${t.code}, ${t.name}, ${t.min}, ${t.mode}, ${t.release}, ${t.third}, ${t.lastMinute}, ${t.peak}, ${t.pkg}, ${t.color}, ${t.code.charCodeAt(0) - 64})
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, min_nights = EXCLUDED.min_nights, room_mode = EXCLUDED.room_mode,
      release_days = EXCLUDED.release_days, third_night_discount = EXCLUDED.third_night_discount, last_minute_discount = EXCLUDED.last_minute_discount,
      peak_deposit = EXCLUDED.peak_deposit, package_group = EXCLUDED.package_group, color = EXCLUDED.color, sort_order = EXCLUDED.sort_order`;
  for (const [scope, m] of priceTable.get(t.code)!) for (const [g, price] of m) {
    await sql`INSERT INTO tariff_prices (tariff_code, room_scope, guests, price) VALUES (${t.code}, ${scope}, ${g}, ${price})
      ON CONFLICT (tariff_code, room_scope, guests) DO UPDATE SET price = EXCLUDED.price`;
  }
}
for (const p of PACKAGES) {
  await sql`INSERT INTO stay_packages (slug, name, includes, price_low, price_high, max_guests, months, sort_order)
    VALUES (${p.slug}, ${p.name}, ${p.includes}, ${p.low}, ${p.high}, ${p.max}, ${p.months}, ${p.sort})
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, includes = EXCLUDED.includes, price_low = EXCLUDED.price_low,
      price_high = EXCLUDED.price_high, max_guests = EXCLUDED.max_guests, months = EXCLUDED.months, sort_order = EXCLUDED.sort_order`;
}

const chunk = <T,>(arr: T[], n = 500) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
for (const c of chunk(legacyRows)) {
  await sql`INSERT INTO day_prices (room_scope, date, guests, price)
    SELECT * FROM unnest(${c.map((r) => r.scope)}::text[], ${c.map((r) => r.date)}::date[], ${c.map((r) => r.guests)}::int[], ${c.map((r) => r.price)}::int[])
    ON CONFLICT (room_scope, date, guests) DO NOTHING`;
}
for (const c of chunk(dayRateRows)) {
  await sql`INSERT INTO day_rates (room_scope, date, price, extra_person_price, min_nights, whole_house_only, tariff_code, label)
    SELECT s, d, p, NULL, m, w, t, l FROM unnest(${c.map((r) => r.scope)}::text[], ${c.map((r) => r.date)}::date[], ${c.map((r) => r.price)}::int[],
      ${c.map((r) => r.min)}::int[], ${c.map((r) => r.whole)}::bool[], ${c.map((r) => r.tariff)}::text[], ${c.map((r) => r.label)}::text[]) AS x(s, d, p, m, w, t, l)
    ON CONFLICT (room_scope, date) DO UPDATE SET price = EXCLUDED.price, extra_person_price = NULL, min_nights = EXCLUDED.min_nights,
      whole_house_only = EXCLUDED.whole_house_only, tariff_code = EXCLUDED.tariff_code, label = EXCLUDED.label`;
}
for (const c of chunk(dayPriceRows)) {
  await sql`INSERT INTO day_prices (room_scope, date, guests, price)
    SELECT * FROM unnest(${c.map((r) => r.scope)}::text[], ${c.map((r) => r.date)}::date[], ${c.map((r) => r.guests)}::int[], ${c.map((r) => r.price)}::int[])
    ON CONFLICT (room_scope, date, guests) DO UPDATE SET price = EXCLUDED.price`;
}

const [after] = await sql`SELECT
  (SELECT count(*)::int FROM tariffs) t, (SELECT count(*)::int FROM tariff_prices) tp, (SELECT count(*)::int FROM stay_packages) sp,
  (SELECT count(*)::int FROM day_prices) dp, (SELECT count(*)::int FROM day_rates WHERE tariff_code IS NOT NULL) dr_t,
  (SELECT count(*)::int FROM day_rates WHERE label IS NOT NULL) dr_l, (SELECT count(*)::int FROM closures) cl, (SELECT count(*)::int FROM bookings) bk`;
console.log(`\nKész. tarifák=${after.t}, tarifaárak=${after.tp}, csomagok=${after.sp}, day_prices=${after.dp}, tarifás napi sor=${after.dr_t}, címkés napi sor=${after.dr_l}, lezárás=${after.cl} (változatlan), foglalás=${after.bk} (változatlan)`);
