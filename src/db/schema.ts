import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  date,
  timestamp,
} from "drizzle-orm/pg-core";

// ─── Szobák ────────────────────────────────────────────────────────────────
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  capacity: integer("capacity"),
  bedType: text("bed_type"),
  priceFrom: integer("price_from"),
  amenities: text("amenities"),        // vesszővel elválasztott lista
  sortOrder: integer("sort_order").default(0),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Csomagok ──────────────────────────────────────────────────────────────
export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  contents: text("contents"),          // vesszővel elválasztott lista
  price: integer("price"),
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
  season: text("season"),              // "nyár" | "tél" | "egész_év"
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Blog posztok ──────────────────────────────────────────────────────────
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  content: text("content"),
  coverImageUrl: text("cover_image_url"),
  category: text("category"),
  published: boolean("published").default(false),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Galéria (Vercel Blob URL-ek) ─────────────────────────────────────────
export const gallery = pgTable("gallery", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),          // Vercel Blob URL
  alt: text("alt"),
  category: text("category").notNull(), // szobak | wellness | sobarlang | udvar | termeszet | etkezes
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── GYIK ──────────────────────────────────────────────────────────────────
export const faq = pgTable("faq", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").default(0),
  active: boolean("active").default(true),
});

// ─── Üzenetek ──────────────────────────────────────────────────────────────
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("contact"), // "contact" | "booking_request"
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message"),
  roomSlug: text("room_slug"),
  checkIn: date("check_in"),
  checkOut: date("check_out"),
  guests: integer("guests"),
  read: boolean("read").default(false),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Naptár / elérhetőség ──────────────────────────────────────────────────
export const availability = pgTable("availability", {
  id: serial("id").primaryKey(),
  roomSlug: text("room_slug").notNull(),
  date: date("date").notNull(),
  status: text("status").notNull().default("available"),
  source: text("source").default("manual"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── iCal import URL-ek ────────────────────────────────────────────────────
export const icalSources = pgTable("ical_sources", {
  id: serial("id").primaryKey(),
  roomSlug: text("room_slug").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  lastFetched: timestamp("last_fetched"),
  active: boolean("active").default(true),
});

// ─── Szezonok – egy adott évre szóló hónap/nap tartomány ──────────────────
export const seasons = pgTable("seasons", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),       // "nyar-junius-2026" stb. – évenként külön sor
  name: text("name").notNull(),
  startMonth: integer("start_month").notNull(), // 1-12
  startDay: integer("start_day").notNull(),
  endMonth: integer("end_month").notNull(),
  endDay: integer("end_day").notNull(),
  year: integer("year").notNull(),              // melyik évre vonatkozik (téli szezonnál a kezdő, pl. nov-márc → a november éve)
  wholeHouseOnly: boolean("whole_house_only").default(false),
  minStayNights: integer("min_stay_nights").notNull().default(2),
  minStayWholeHouseException: integer("min_stay_whole_house_exception"),
  sortOrder: integer("sort_order").default(0),
  active: boolean("active").default(true),
});

// ─── Ár-sorok: szezon × nap-típus × szoba/egész-ház ───────────────────────
export const pricingRules = pgTable("pricing_rules", {
  id: serial("id").primaryKey(),
  seasonId: integer("season_id").notNull().references(() => seasons.id),
  dayType: text("day_type").notNull(),         // "weekday" | "weekend"
  roomScope: text("room_scope").notNull(),     // "szoba-1" | "szoba-2" | "superior" | "egesz_haz"
  pricePerNight: integer("price_per_night"),
  priceOnRequest: boolean("price_on_request").default(false),
});

// ─── Ünnepnap/hosszú hétvége felülírások ──────────────────────────────────
export const holidayOverrides = pgTable("holiday_overrides", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  recurring: boolean("recurring").notNull().default(true),
  startMonth: integer("start_month"),
  startDay: integer("start_day"),
  endMonth: integer("end_month"),
  endDay: integer("end_day"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  wholeHouseOnly: boolean("whole_house_only").default(false),
  minStayNights: integer("min_stay_nights").notNull().default(2),
  priceOnRequest: boolean("price_on_request").default(false),
  sortOrder: integer("sort_order").default(0),
  active: boolean("active").default(true),
});

// ─── Ünnepnaponkénti ár szoba-scope-onként ─────────────────────────────────
export const holidayPrices = pgTable("holiday_prices", {
  id: serial("id").primaryKey(),
  holidayId: integer("holiday_id").notNull().references(() => holidayOverrides.id),
  roomScope: text("room_scope").notNull(),
  pricePerNight: integer("price_per_night"),
});

// ─── Globális árazási beállítások (singleton) ──────────────────────────────
export const pricingSettings = pgTable("pricing_settings", {
  id: serial("id").primaryKey(),
  extraGuestThreshold: integer("extra_guest_threshold").notNull().default(10),
  extraGuestFeePerNight: integer("extra_guest_fee_per_night").notNull().default(7000),
  depositPercent: integer("deposit_percent").notNull().default(10),
  ifaPerPersonPerNight: integer("ifa_per_person_per_night").notNull().default(600),
  cancellationFreeHours: integer("cancellation_free_hours").notNull().default(24),
  checkInFrom: text("check_in_from").default("15:00"),
  checkInTo: text("check_in_to").default("21:00"),
  checkOutUntil: text("check_out_until").default("10:00"),
});

// ─── Wellness szolgáltatások ────────────────────────────────────────────────
export const wellnessServices = pgTable("wellness_services", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  guestPriceLabel: text("guest_price_label").notNull(),
  guestPriceNote: text("guest_price_note"),
  externalPriceLabel: text("external_price_label"),
  openingHours: text("opening_hours"),
  note: text("note"),
  sortOrder: integer("sort_order").default(0),
});

// ─── Sóbarlang tarifatáblázat sorai (egyedi jegy + bérlet) ────────────────
export const wellnessPriceTiers = pgTable("wellness_price_tiers", {
  id: serial("id").primaryKey(),
  serviceSlug: text("service_slug").notNull(),
  groupLabel: text("group_label").notNull(),
  tierLabel: text("tier_label").notNull(),
  price: text("price").notNull(),
  sortOrder: integer("sort_order").default(0),
});
