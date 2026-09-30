// v2 séma – csak ÚJ táblák és indexek, egy tranzakcióban. A régi táblákhoz nem nyúl.
// Ugyanaz a DDL, amit a drizzle-kit push a teszt ágon kiadott.
//   node --env-file=<env> scripts/v2-schema.mjs --confirm-host=<host>
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
const host = new URL(url).hostname;
const confirm = process.argv.find((a) => a.startsWith("--confirm-host="))?.split("=")[1];
if (confirm !== host) {
  console.error(`Cél: ${host}\nFuttatás: --confirm-host=${host}`);
  process.exit(1);
}
const sql = neon(url);

const existing = await sql`SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN ('bookings', 'closures', 'day_rates', 'settings')`;
if (existing.length) {
  console.error(`Már létező tábla(k): ${existing.map((r) => r.table_name).join(", ")} – nem futok.`);
  process.exit(1);
}

await sql.transaction([
  sql`CREATE TABLE "bookings" (
    "id" serial PRIMARY KEY NOT NULL, "name" text NOT NULL, "email" text, "phone" text,
    "room_scope" text NOT NULL, "check_in" date NOT NULL, "check_out" date NOT NULL, "guests" integer NOT NULL,
    "meal" text DEFAULT 'nincs' NOT NULL, "meal_guests" integer, "total" integer, "source" text NOT NULL,
    "status" text DEFAULT 'valaszra_var' NOT NULL, "deposit_amount" integer, "deposit_received_at" date,
    "guest_message" text, "note" text, "accepted_at" timestamp, "confirmation_sent_at" timestamp,
    "cancelled_at" timestamp, "legacy_message_id" integer, "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "bookings_legacy_message_id_unique" UNIQUE("legacy_message_id"))`,
  sql`CREATE TABLE "closures" (
    "id" serial PRIMARY KEY NOT NULL, "room_scope" text NOT NULL, "date" date NOT NULL, "booking_id" integer,
    "note" text, "created_at" timestamp DEFAULT now() NOT NULL)`,
  sql`CREATE TABLE "day_rates" (
    "id" serial PRIMARY KEY NOT NULL, "room_scope" text NOT NULL, "date" date NOT NULL, "price" integer,
    "extra_person_price" integer, "min_nights" integer DEFAULT 1 NOT NULL, "whole_house_only" boolean DEFAULT false NOT NULL)`,
  sql`CREATE TABLE "settings" (
    "id" serial PRIMARY KEY NOT NULL,
    "over10_fee_per_night" integer DEFAULT 7000 NOT NULL, "ifa_per_person_per_night" integer DEFAULT 600 NOT NULL,
    "deposit_percent" integer DEFAULT 10 NOT NULL, "deposit_due_days" integer DEFAULT 3 NOT NULL,
    "breakfast_price" integer DEFAULT 3800 NOT NULL, "dinner_price" integer DEFAULT 5200 NOT NULL,
    "half_board_price" integer DEFAULT 9000 NOT NULL, "check_in_from" text DEFAULT '15:00' NOT NULL,
    "check_out_until" text DEFAULT '10:00' NOT NULL, "property_name" text DEFAULT 'Viki Vendégház' NOT NULL,
    "phone" text DEFAULT '+36 70 410-8282' NOT NULL, "email" text DEFAULT 'vikivendeghaz@gmail.com' NOT NULL,
    "address" text DEFAULT '3348 Szilvásvárad, Dózsa György utca 45.' NOT NULL,
    "bank_beneficiary" text DEFAULT 'Kiss Józsefné' NOT NULL, "bank_account" text DEFAULT '50462779-10005659' NOT NULL,
    "bank_iban" text DEFAULT 'HU07 5046 2779 1000 5659 0000 0000' NOT NULL, "bank_name" text DEFAULT 'MBH Bank Nyrt.' NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL)`,
  sql`ALTER TABLE "closures" ADD CONSTRAINT "closures_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action`,
  sql`CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status")`,
  sql`CREATE INDEX "bookings_check_in_idx" ON "bookings" USING btree ("check_in")`,
  sql`CREATE UNIQUE INDEX "closures_scope_date_uq" ON "closures" USING btree ("room_scope","date")`,
  sql`CREATE INDEX "closures_booking_idx" ON "closures" USING btree ("booking_id")`,
  sql`CREATE UNIQUE INDEX "day_rates_scope_date_uq" ON "day_rates" USING btree ("room_scope","date")`,
]);

const now = await sql`SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN ('bookings', 'closures', 'day_rates', 'settings') ORDER BY 1`;
console.log(`${host}: létrehozva – ${now.map((r) => r.table_name).join(", ")}`);
