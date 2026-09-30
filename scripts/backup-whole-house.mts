// Csak olvas: elmenti a régi árazási motor "csak egész ház" állapotát
//  – a nyers jelölőket (szezonok, ünnepek) JSON-ba,
//  – és a ténylegesen érvényes napi értéket (nap, szoba, true/false) CSV-be, 730 napra.
//
//   node --env-file=<env> scripts/backup-whole-house.mts <kimeneti-mappa>

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import { isWholeHouseOnlyForDate, type PricingData } from "../src/lib/pricing.ts";

const outDir = process.argv[2];
if (!outDir) throw new Error("Adja meg a kimeneti mappát.");
const url = process.env.DATABASE_URL!;
const host = new URL(url).hostname;
const sql = neon(url);

const [seasons, holidays] = await Promise.all([
  sql`SELECT id, slug, name, year, start_month, start_day, end_month, end_day, whole_house_only, min_stay_nights, active FROM seasons ORDER BY year, start_month`,
  sql`SELECT id, slug, name, recurring, start_month, start_day, end_month, end_day, start_date::text, end_date::text, whole_house_only, min_stay_nights, price_on_request, active FROM holiday_overrides ORDER BY id`,
]);

const data: PricingData = {
  seasons: seasons.map((s) => ({
    id: s.id, slug: s.slug, name: s.name, startMonth: s.start_month, startDay: s.start_day, endMonth: s.end_month,
    endDay: s.end_day, year: s.year, wholeHouseOnly: s.whole_house_only, minStayNights: s.min_stay_nights,
    minStayWholeHouseException: null, active: s.active,
  })),
  rules: [],
  holidays: holidays.map((h) => ({
    id: h.id, slug: h.slug, name: h.name, recurring: h.recurring, startMonth: h.start_month, startDay: h.start_day,
    endMonth: h.end_month, endDay: h.end_day, startDate: h.start_date, endDate: h.end_date,
    wholeHouseOnly: h.whole_house_only, minStayNights: h.min_stay_nights, priceOnRequest: h.price_on_request, active: h.active,
  })),
  holidayPrices: [],
  settings: null,
  roomCapacities: [],
};

const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Budapest" }).format(new Date());
const lines = ["nap,szoba,csak_egesz_haz"];
const [y0, m0, d0] = today.split("-").map(Number);
for (let i = 0; i < 730; i++) {
  const d = new Date(y0, m0 - 1, d0 + i);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const whole = isWholeHouseOnlyForDate(d, data);
  for (const room of ["szoba-1", "szoba-2", "superior"]) lines.push(`${iso},${room},${whole}`);
}

mkdirSync(outDir, { recursive: true });
const stamp = `${today}-${host.split(".")[0]}`;
writeFileSync(join(outDir, `egesz-haz-jelolok-${stamp}.json`), JSON.stringify({ host, savedAt: new Date().toISOString(), seasons, holidays }, null, 2));
writeFileSync(join(outDir, `egesz-haz-napok-${stamp}.csv`), lines.join("\n") + "\n");
const trueDays = (lines.length - 1) / 3 - lines.slice(1).filter((l, i) => i % 3 === 0 && l.endsWith("false")).length;
console.log(`Mentve: ${outDir}\n  ${seasons.length} szezon, ${holidays.length} ünnep\n  730 nap × 3 szoba – ebből ${trueDays} nap "csak egész ház"`);
