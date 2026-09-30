import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  date,
  timestamp,
  uniqueIndex,
  index,
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
  roomLabel: text("room_label"), // olvasható tárgy: szoba neve(i) vagy "Egész ház"
  checkIn: date("check_in"),
  checkOut: date("check_out"),
  guests: integer("guests"),
  totalPrice: integer("total_price"), // a form által számolt végösszeg (Ft), null ha egyedi ajánlat
  felpanzio: text("felpanzio"), // "reggeli" | "vacsora" | "mindketto" | null
  felpanzioFo: integer("felpanzio_fo"),
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
  depositPercent: integer("deposit_percent").notNull().default(10),
  ifaPerPersonPerNight: integer("ifa_per_person_per_night").notNull().default(600),
  cancellationFreeHours: integer("cancellation_free_hours").notNull().default(24),
  checkInFrom: text("check_in_from").default("15:00"),
  checkInTo: text("check_in_to").default("21:00"),
  checkOutUntil: text("check_out_until").default("10:00"),
});

// ─── Szoba-szintű alap-létszám és pótágy-felár ─────────────────────────────
// A bázis-áron felül, a baseCapacity fölötti minden további vendég után
// extraGuestFeePerNight Ft/éj pótdíj számolódik fel (pl. pótágy/kanapé).
export const roomCapacityPricing = pgTable("room_capacity_pricing", {
  id: serial("id").primaryKey(),
  roomScope: text("room_scope").notNull().unique(), // "szoba-1" | "szoba-2" | "superior" | "egesz_haz"
  baseCapacity: integer("base_capacity").notNull(),
  extraGuestFeePerNight: integer("extra_guest_fee_per_night").notNull(),
});

// ═══ v2 foglaláskezelés ═══════════════════════════════════════════════════
// A régi szezon/szabály motor helyett: minden szoba minden napjának saját ára
// (day_rates), a foglaltság pedig szoba×nap lezárás (closures). A fenti régi
// árazási táblák a migráció jóváhagyásáig maradnak.

// Egy sor = egy szoba (vagy az egész ház) egy napja.
export const dayRates = pgTable(
  "day_rates",
  {
    id: serial("id").primaryKey(),
    roomScope: text("room_scope").notNull(), // "szoba-1" | "szoba-2" | "superior" | "egesz_haz"
    date: date("date").notNull(),
    price: integer("price"), // alapár/éj 2 főre; egész háznál a ház ára. null = egyedi ár
    extraPersonPrice: integer("extra_person_price"), // pótágy / fő / éj (egész háznál nem használt)
    minNights: integer("min_nights").notNull().default(1), // az adott napon érkezőkre vonatkozik
    wholeHouseOnly: boolean("whole_house_only").notNull().default(false),
  },
  (t) => [uniqueIndex("day_rates_scope_date_uq").on(t.roomScope, t.date)],
);

export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    roomScope: text("room_scope").notNull(),
    checkIn: date("check_in").notNull(),
    checkOut: date("check_out").notNull(),
    guests: integer("guests").notNull(),
    meal: text("meal").notNull().default("nincs"), // "nincs" | "reggeli" | "vacsora" | "felpanzio"
    mealGuests: integer("meal_guests"),
    total: integer("total"), // null = egyedi ár, még nincs megállapítva
    source: text("source").notNull(), // "weboldal" | "telefon" | "booking" | "szallas_hu" | "email" | "ajanlat"
    status: text("status").notNull().default("valaszra_var"), // "valaszra_var" | "elfogadva" | "visszaigazolt" | "lemondott"
    depositAmount: integer("deposit_amount"),
    depositReceivedAt: date("deposit_received_at"),
    guestMessage: text("guest_message"), // amit a vendég írt
    note: text("note"), // belső megjegyzés
    acceptedAt: timestamp("accepted_at"),
    confirmationSentAt: timestamp("confirmation_sent_at"),
    cancelledAt: timestamp("cancelled_at"),
    legacyMessageId: integer("legacy_message_id").unique(), // migráció: messages.id
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("bookings_status_idx").on(t.status), index("bookings_check_in_idx").on(t.checkIn)],
);

// Ha van sor, a szoba aznap (éjszakára) foglalt. Kézi lezárásnál booking_id üres.
// Az egész ház nem kap saját sort: foglalt, ha bármelyik szobának van sora.
export const closures = pgTable(
  "closures",
  {
    id: serial("id").primaryKey(),
    roomScope: text("room_scope").notNull(),
    date: date("date").notNull(),
    bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("closures_scope_date_uq").on(t.roomScope, t.date),
    index("closures_booking_idx").on(t.bookingId),
  ],
);

// Egysoros beállítás-tábla.
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  over10FeePerNight: integer("over10_fee_per_night").notNull().default(7000),
  ifaPerPersonPerNight: integer("ifa_per_person_per_night").notNull().default(600),
  depositPercent: integer("deposit_percent").notNull().default(10),
  depositDueDays: integer("deposit_due_days").notNull().default(3),
  breakfastPrice: integer("breakfast_price").notNull().default(3800),
  dinnerPrice: integer("dinner_price").notNull().default(5200),
  halfBoardPrice: integer("half_board_price").notNull().default(9000),
  checkInFrom: text("check_in_from").notNull().default("15:00"),
  checkOutUntil: text("check_out_until").notNull().default("10:00"),
  propertyName: text("property_name").notNull().default("Viki Vendégház"),
  phone: text("phone").notNull().default("+36 70 410-8282"),
  email: text("email").notNull().default("vikivendeghaz@gmail.com"),
  address: text("address").notNull().default("3348 Szilvásvárad, Dózsa György utca 45."),
  bankBeneficiary: text("bank_beneficiary").notNull().default("Kiss Józsefné"),
  bankAccount: text("bank_account").notNull().default("50462779-10005659"),
  bankIban: text("bank_iban").notNull().default("HU07 5046 2779 1000 5659 0000 0000"),
  bankName: text("bank_name").notNull().default("MBH Bank Nyrt."),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
