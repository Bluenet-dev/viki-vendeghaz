// Árajánlat modul séma – csak HOZZÁAD (offers tábla, új beállítás-oszlopok), egy tranzakcióban.
// IF NOT EXISTS miatt újrafuttatható. Semmit nem töröl.
//   npx dotenv -e <env> -- node scripts/ajanlat-schema.mjs --confirm-host=<host> [--dry-run]
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

const SETTINGS_COLUMNS = [
  "website_url", "aszf_url", "logo_url", "brand_color", "accent_color",
  "offer_valid_days", "cancellation_terms", "decline_template",
];

async function report(title) {
  const [t] = await sql`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'offers'`;
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'settings'`;
  const have = new Set(cols.map((r) => r.column_name));
  const missing = SETTINGS_COLUMNS.filter((c) => !have.has(c));
  console.log(`${title} – ${host}`);
  console.log(`  offers tábla: ${t.n ? "megvan" : "hiányzik"}`);
  console.log(`  hiányzó beállítás-oszlopok: ${missing.length ? missing.join(", ") : "nincs"}`);
}

await report("Előtte");
if (dryRun) {
  console.log("Próbafuttatás – nem módosítottam semmit.");
  process.exit(0);
}

await sql.transaction([
  sql`ALTER TABLE "settings"
    ADD COLUMN IF NOT EXISTS "website_url" text DEFAULT 'https://www.vikivendeghaz.hu' NOT NULL,
    ADD COLUMN IF NOT EXISTS "aszf_url" text DEFAULT 'https://www.vikivendeghaz.hu/aszf' NOT NULL,
    ADD COLUMN IF NOT EXISTS "logo_url" text,
    ADD COLUMN IF NOT EXISTS "brand_color" text DEFAULT '#2A3228' NOT NULL,
    ADD COLUMN IF NOT EXISTS "accent_color" text DEFAULT '#5A7A5C' NOT NULL,
    ADD COLUMN IF NOT EXISTS "offer_valid_days" integer DEFAULT 3 NOT NULL,
    ADD COLUMN IF NOT EXISTS "cancellation_terms" text DEFAULT 'Lemondás az érkezés előtti 30. napig díjmentes. 30–15 nap között a foglaló fele, 15 napon belül a teljes foglaló a szállásé.' NOT NULL,
    ADD COLUMN IF NOT EXISTS "decline_template" text DEFAULT 'Köszönjük érdeklődését! Sajnos a kért időpontban nem tudjuk fogadni Önöket. Reméljük, egy másik alkalommal vendégül láthatjuk. Keressen minket bizalommal!' NOT NULL`,
  sql`CREATE TABLE IF NOT EXISTS "offers" (
    "id" serial PRIMARY KEY NOT NULL,
    "number" text NOT NULL,
    "status" text DEFAULT 'uj' NOT NULL,
    "source" text DEFAULT 'weboldal' NOT NULL,
    "name" text NOT NULL, "email" text, "phone" text,
    "check_in" date NOT NULL, "check_out" date NOT NULL,
    "adults" integer DEFAULT 1 NOT NULL, "teens" integer DEFAULT 0 NOT NULL,
    "children" integer DEFAULT 0 NOT NULL, "infants" integer DEFAULT 0 NOT NULL,
    "requested_scopes" text[] NOT NULL, "room_scopes" text[] NOT NULL,
    "package_slug" text, "extras" jsonb, "meal" text DEFAULT 'nincs' NOT NULL, "meal_guests" integer,
    "message" text, "request" jsonb, "kind" text DEFAULT 'ajanlat' NOT NULL, "alternatives" jsonb,
    "lines" jsonb, "overrides" jsonb, "total" integer, "deposit" integer, "deposit_percent" integer,
    "pricing_regime" text, "personal_message" text, "decline_message" text,
    "valid_days" integer, "valid_until" date, "sent_at" timestamp, "accepted_at" timestamp, "declined_at" timestamp,
    "accept_token" text NOT NULL, "booking_id" integer,
    "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "offers_number_unique" UNIQUE("number"),
    CONSTRAINT "offers_accept_token_unique" UNIQUE("accept_token"),
    CONSTRAINT "offers_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action)`,
  sql`ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "request" jsonb`,
  sql`CREATE INDEX IF NOT EXISTS "offers_status_idx" ON "offers" USING btree ("status")`,
  sql`CREATE INDEX IF NOT EXISTS "offers_booking_idx" ON "offers" USING btree ("booking_id")`,
]);

await report("Utána");
