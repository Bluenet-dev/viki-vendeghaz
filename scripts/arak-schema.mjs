// 2027-es árazás séma – csak HOZZÁAD (új táblák, új oszlopok), egy tranzakcióban. Semmit nem töröl.
// Ugyanaz a DDL, amit a drizzle-kit push a teszt ágon kiadott; IF NOT EXISTS miatt újrafuttatható.
//   npx dotenv -e <env> -- node scripts/arak-schema.mjs --confirm-host=<host> [--dry-run]
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
const host = new URL(url).hostname;
const confirm = process.argv.find((a) => a.startsWith("--confirm-host="))?.split("=")[1];
const dryRun = process.argv.includes("--dry-run");
if (confirm !== host) {
  console.error(`Cél: ${host}\nFuttatás: --confirm-host=${host}`);
  process.exit(1);
}
const sql = neon(url);

const NEW_TABLES = ["tariffs", "tariff_prices", "day_prices", "stay_packages"];
const NEW_COLUMNS = {
  day_rates: ["tariff_code", "label"],
  bookings: ["adults", "teens", "children", "infants", "package_slug", "extras", "lines", "deposit_percent", "pricing_regime"],
  settings: [
    "new_pricing_from", "deposit_percent_new", "deposit_percent_peak", "child_discount_percent",
    "house_long_stay_nights", "house_long_stay_percent", "room_third_night_percent", "last_minute_days",
    "last_minute_percent", "house_cleaning_fee", "house_cleaning_under_nights", "room_cleaning_fee",
    "room_cleaning_under_nights", "sauna_day_price", "tub_price", "finn_sauna_per_person_hour",
    "infra_shared_per_person_hour", "superior_infra_per_hour", "salt_cave_free_minutes", "check_in_until",
  ],
};

async function report(title) {
  const tables = (await sql`SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ANY(${NEW_TABLES})`).map((r) => r.table_name);
  const cols = await sql`SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ANY(${Object.keys(NEW_COLUMNS)})`;
  const have = new Set(cols.map((r) => `${r.table_name}.${r.column_name}`));
  const missing = Object.entries(NEW_COLUMNS).flatMap(([t, cs]) => cs.filter((c) => !have.has(`${t}.${c}`)).map((c) => `${t}.${c}`));
  console.log(`${title} – ${host}`);
  console.log(`  új táblák megvannak: ${tables.length}/${NEW_TABLES.length} ${tables.join(", ")}`);
  console.log(`  hiányzó oszlopok: ${missing.length ? missing.join(", ") : "nincs"}`);
}

await report("Előtte");
if (dryRun) {
  console.log("Próbafuttatás – nem módosítottam semmit.");
  process.exit(0);
}

await sql.transaction([
  sql`ALTER TABLE "day_rates" ADD COLUMN IF NOT EXISTS "tariff_code" text`,
  sql`ALTER TABLE "day_rates" ADD COLUMN IF NOT EXISTS "label" text`,
  sql`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "adults" integer`,
  sql`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "teens" integer`,
  sql`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "children" integer`,
  sql`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "infants" integer`,
  sql`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "package_slug" text`,
  sql`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "extras" jsonb`,
  sql`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "lines" jsonb`,
  sql`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "deposit_percent" integer`,
  sql`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "pricing_regime" text`,
  sql`ALTER TABLE "settings"
    ADD COLUMN IF NOT EXISTS "new_pricing_from" date DEFAULT '2027-01-01' NOT NULL,
    ADD COLUMN IF NOT EXISTS "deposit_percent_new" integer DEFAULT 30 NOT NULL,
    ADD COLUMN IF NOT EXISTS "deposit_percent_peak" integer DEFAULT 50 NOT NULL,
    ADD COLUMN IF NOT EXISTS "child_discount_percent" integer DEFAULT 50 NOT NULL,
    ADD COLUMN IF NOT EXISTS "house_long_stay_nights" integer DEFAULT 7 NOT NULL,
    ADD COLUMN IF NOT EXISTS "house_long_stay_percent" integer DEFAULT 10 NOT NULL,
    ADD COLUMN IF NOT EXISTS "room_third_night_percent" integer DEFAULT 20 NOT NULL,
    ADD COLUMN IF NOT EXISTS "last_minute_days" integer DEFAULT 7 NOT NULL,
    ADD COLUMN IF NOT EXISTS "last_minute_percent" integer DEFAULT 15 NOT NULL,
    ADD COLUMN IF NOT EXISTS "house_cleaning_fee" integer DEFAULT 15000 NOT NULL,
    ADD COLUMN IF NOT EXISTS "house_cleaning_under_nights" integer DEFAULT 5 NOT NULL,
    ADD COLUMN IF NOT EXISTS "room_cleaning_fee" integer DEFAULT 5000 NOT NULL,
    ADD COLUMN IF NOT EXISTS "room_cleaning_under_nights" integer DEFAULT 4 NOT NULL,
    ADD COLUMN IF NOT EXISTS "sauna_day_price" integer DEFAULT 10000 NOT NULL,
    ADD COLUMN IF NOT EXISTS "tub_price" integer DEFAULT 10000 NOT NULL,
    ADD COLUMN IF NOT EXISTS "finn_sauna_per_person_hour" integer DEFAULT 2000 NOT NULL,
    ADD COLUMN IF NOT EXISTS "infra_shared_per_person_hour" integer DEFAULT 1500 NOT NULL,
    ADD COLUMN IF NOT EXISTS "superior_infra_per_hour" integer DEFAULT 1500 NOT NULL,
    ADD COLUMN IF NOT EXISTS "salt_cave_free_minutes" integer DEFAULT 45 NOT NULL,
    ADD COLUMN IF NOT EXISTS "check_in_until" text DEFAULT '21:00' NOT NULL`,
  sql`CREATE TABLE IF NOT EXISTS "tariffs" (
    "code" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "min_nights" integer DEFAULT 1 NOT NULL,
    "room_mode" text DEFAULT 'open' NOT NULL, "release_days" integer,
    "third_night_discount" boolean DEFAULT false NOT NULL, "last_minute_discount" boolean DEFAULT false NOT NULL,
    "peak_deposit" boolean DEFAULT false NOT NULL, "package_group" text,
    "color" text DEFAULT '#E2DDD7' NOT NULL, "sort_order" integer DEFAULT 0 NOT NULL)`,
  sql`CREATE TABLE IF NOT EXISTS "tariff_prices" (
    "id" serial PRIMARY KEY NOT NULL, "tariff_code" text NOT NULL, "room_scope" text NOT NULL,
    "guests" integer NOT NULL, "price" integer NOT NULL)`,
  sql`CREATE TABLE IF NOT EXISTS "day_prices" (
    "id" serial PRIMARY KEY NOT NULL, "room_scope" text NOT NULL, "date" date NOT NULL,
    "guests" integer NOT NULL, "price" integer NOT NULL)`,
  sql`CREATE TABLE IF NOT EXISTS "stay_packages" (
    "id" serial PRIMARY KEY NOT NULL, "slug" text NOT NULL, "name" text NOT NULL, "includes" text NOT NULL,
    "price_low" integer NOT NULL, "price_high" integer, "max_guests" integer DEFAULT 12 NOT NULL,
    "months" text, "active" boolean DEFAULT true NOT NULL, "sort_order" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "stay_packages_slug_unique" UNIQUE("slug"))`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS "tariff_prices_uq" ON "tariff_prices" USING btree ("tariff_code","room_scope","guests")`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS "day_prices_uq" ON "day_prices" USING btree ("room_scope","date","guests")`,
]);

await report("Utána");
