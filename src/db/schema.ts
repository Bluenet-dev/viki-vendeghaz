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
  jsonb,
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
    tariffCode: text("tariff_code"), // A–H; null = 2026-os nap (régi szabály)
    label: text("label"), // pl. "Húsvét", "Masters*"
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
    // 2027-es árazás: vendégbontás és tételes összesítő
    adults: integer("adults"),
    teens: integer("teens"), // 13–17 év
    children: integer("children"), // 3–12 év
    infants: integer("infants"), // 0–2 év (nem fizet, nem számít a létszámba)
    packageSlug: text("package_slug"),
    extras: jsonb("extras"), // { saunaDays, tubCount }
    lines: jsonb("lines"), // tételes összesítő: [{ label, amount }]
    depositPercent: integer("deposit_percent"),
    pricingRegime: text("pricing_regime"), // "2026" | "2027"
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
    // iCal-importból származó zárolás: a blokk törlésekor a nap is felszabadul.
    externalBlockId: integer("external_block_id").references(() => externalBlocks.id, { onDelete: "cascade" }),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("closures_scope_date_uq").on(t.roomScope, t.date),
    index("closures_booking_idx").on(t.bookingId),
    index("closures_external_block_idx").on(t.externalBlockId),
  ],
);

// ─── iCal-naptárszinkron (BlueNet CMS) ──────────────────────────────────────
// Egység = a portálokon külön hirdetett szállás: a három szoba és az egész ház
// ("szoba-1" | "szoba-2" | "superior" | "egesz_haz" – ugyanazok a szlugok, mint a
// closures/bookings room_scope-ja). Egységenként és platformonként egy import-feed.
// Az importált foglalások az external_blocks-ba kerülnek (az igazságforrás), és a
// szabad éjszakákra closures-sort is kapnak (external_block_id) – az egész ház
// blokkja mindhárom szobára –, így a foglalómotor, a naptár és a weboldal
// változtatás nélkül zárolja őket.

// Egységenként a titkos export-link tokenje (≥ 32 karakter). Újragenerálva a régi link érvénytelen.
export const calendarUnits = pgTable("calendar_units", {
  unit: text("unit").primaryKey(),
  icalExportToken: text("ical_export_token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const calendarFeeds = pgTable(
  "calendar_feeds",
  {
    id: serial("id").primaryKey(),
    unit: text("unit").notNull(),
    platform: text("platform").notNull(), // "booking" | "szallas" | "airbnb" | "egyeb"
    importUrl: text("import_url"),
    active: boolean("active").notNull().default(true),
    lastSuccessAt: timestamp("last_success_at"),
    lastAttemptAt: timestamp("last_attempt_at"),
    lastError: text("last_error"),
    failCount: integer("fail_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("calendar_feeds_unit_platform_uq").on(t.unit, t.platform)],
);

export const externalBlocks = pgTable(
  "external_blocks",
  {
    id: serial("id").primaryKey(),
    feedId: integer("feed_id").notNull().references(() => calendarFeeds.id, { onDelete: "cascade" }),
    unit: text("unit").notNull(),
    uid: text("uid").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(), // KIZÁRÓLAGOS (a távozás napja)
    summary: text("summary"), // rövidítve
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("external_blocks_feed_uid_uq").on(t.feedId, t.uid),
    index("external_blocks_unit_idx").on(t.unit, t.startDate),
  ],
);

// Már jelzett ütközések – ugyanarra az ütközésre csak egy e-mail megy.
export const calendarConflicts = pgTable(
  "calendar_conflicts",
  {
    id: serial("id").primaryKey(),
    externalBlockId: integer("external_block_id").notNull().references(() => externalBlocks.id, { onDelete: "cascade" }),
    bookingId: integer("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
    notifiedAt: timestamp("notified_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("calendar_conflicts_block_booking_uq").on(t.externalBlockId, t.bookingId)],
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
  // ─── 2027-es árazás ───
  newPricingFrom: date("new_pricing_from").notNull().default("2027-01-01"), // ettől érkezőkre az új szabályok
  depositPercentNew: integer("deposit_percent_new").notNull().default(30),
  depositPercentPeak: integer("deposit_percent_peak").notNull().default(50), // ha bármely éj magas foglalójú tarifa (G, H)
  childDiscountPercent: integer("child_discount_percent").notNull().default(50), // 3–12 év: a felár ennyi %-a jár le
  houseLongStayNights: integer("house_long_stay_nights").notNull().default(7),
  houseLongStayPercent: integer("house_long_stay_percent").notNull().default(10),
  roomThirdNightPercent: integer("room_third_night_percent").notNull().default(20),
  lastMinuteDays: integer("last_minute_days").notNull().default(7),
  lastMinutePercent: integer("last_minute_percent").notNull().default(15),
  houseCleaningFee: integer("house_cleaning_fee").notNull().default(15000),
  houseCleaningUnderNights: integer("house_cleaning_under_nights").notNull().default(5),
  roomCleaningFee: integer("room_cleaning_fee").notNull().default(5000),
  roomCleaningUnderNights: integer("room_cleaning_under_nights").notNull().default(4),
  saunaDayPrice: integer("sauna_day_price").notNull().default(10000),
  tubPrice: integer("tub_price").notNull().default(10000),
  finnSaunaPerPersonHour: integer("finn_sauna_per_person_hour").notNull().default(2000),
  infraSharedPerPersonHour: integer("infra_shared_per_person_hour").notNull().default(1500),
  superiorInfraPerHour: integer("superior_infra_per_hour").notNull().default(1500),
  saltCaveFreeMinutes: integer("salt_cave_free_minutes").notNull().default(45),
  checkInUntil: text("check_in_until").notNull().default("21:00"),
  // ─── Árajánlat modul (minden szállásspecifikus adat innen jön) ───
  websiteUrl: text("website_url").notNull().default("https://www.vikivendeghaz.hu"),
  aszfUrl: text("aszf_url").notNull().default("https://www.vikivendeghaz.hu/aszf"),
  logoUrl: text("logo_url"),
  brandColor: text("brand_color").notNull().default("#2A3228"),
  accentColor: text("accent_color").notNull().default("#5A7A5C"),
  offerValidDays: integer("offer_valid_days").notNull().default(3),
  cancellationTerms: text("cancellation_terms")
    .notNull()
    .default("Lemondás az érkezés előtti 30. napig díjmentes. 30–15 nap között a foglaló fele, 15 napon belül a teljes foglaló a szállásé."),
  declineTemplate: text("decline_template")
    .notNull()
    .default("Köszönjük érdeklődését! Sajnos a kért időpontban nem tudjuk fogadni Önöket. Reméljük, egy másik alkalommal vendégül láthatjuk. Keressen minket bizalommal!"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── 2027-es árazás: tarifák és létszám szerinti napi árak ────────────────

// Tarifa (A–H): létszámárak, min. éjszaka, és hogy foglalhatók-e szobák.
export const tariffs = pgTable("tariffs", {
  code: text("code").primaryKey(), // "A" … "H"
  name: text("name").notNull(),
  minNights: integer("min_nights").notNull().default(1),
  roomMode: text("room_mode").notNull().default("open"), // "open" | "release" | "never"
  releaseDays: integer("release_days"), // "release": ennyi nappal az éj előtt nyílnak a szobák
  thirdNightDiscount: boolean("third_night_discount").notNull().default(false), // szoba 3. éj kedvezmény jár
  lastMinuteDiscount: boolean("last_minute_discount").notNull().default(false),
  peakDeposit: boolean("peak_deposit").notNull().default(false), // magasabb foglaló
  packageGroup: text("package_group"), // "low" | "high" | null (csomag nem választható)
  color: text("color").notNull().default("#E2DDD7"),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Egész háznál guests = 8 jelenti az 1–8 főt.
export const tariffPrices = pgTable(
  "tariff_prices",
  {
    id: serial("id").primaryKey(),
    tariffCode: text("tariff_code").notNull(),
    roomScope: text("room_scope").notNull(),
    guests: integer("guests").notNull(),
    price: integer("price").notNull(),
  },
  (t) => [uniqueIndex("tariff_prices_uq").on(t.tariffCode, t.roomScope, t.guests)],
);

// A napi ár mindig innen jön (a tarifa csak kitölti, kézzel felülírható).
export const dayPrices = pgTable(
  "day_prices",
  {
    id: serial("id").primaryKey(),
    roomScope: text("room_scope").notNull(),
    date: date("date").notNull(),
    guests: integer("guests").notNull(),
    price: integer("price").notNull(),
  },
  (t) => [uniqueIndex("day_prices_uq").on(t.roomScope, t.date, t.guests)],
);

// Foglalható csomagok (csak egész ház), létszámtól független éjszakai ár.
export const stayPackages = pgTable("stay_packages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  includes: text("includes").notNull(),
  priceLow: integer("price_low").notNull(), // "low" csoportú tarifán (A–D)
  priceHigh: integer("price_high"), // "high" csoportú tarifán (E–G); null = ott nem választható
  maxGuests: integer("max_guests").notNull().default(12),
  months: text("months"), // pl. "11,12,1,2,3"; null = egész évben
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ─── Árajánlatok (src/modules/offers) ───────────────────────────────────────
// Állapot: uj → elkuldve → elfogadva → foglalas; oldalág: elutasitva, lejart.
export const offers = pgTable(
  "offers",
  {
    id: serial("id").primaryKey(),
    number: text("number").notNull().unique(), // "2027-001", évente újrainduló
    status: text("status").notNull().default("uj"),
    source: text("source").notNull().default("weboldal"), // weboldal | kezi
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    checkIn: date("check_in").notNull(),
    checkOut: date("check_out").notNull(),
    adults: integer("adults").notNull().default(1),
    teens: integer("teens").notNull().default(0), // 13–17 év
    children: integer("children").notNull().default(0), // 3–12 év
    infants: integer("infants").notNull().default(0), // 0–2 év
    requestedScopes: text("requested_scopes").array().notNull(), // amit a vendég kért; ["egesz_haz"] = egész ház
    roomScopes: text("room_scopes").array().notNull(), // amit ajánlunk
    packageSlug: text("package_slug"),
    extras: jsonb("extras"), // { saunaDays, tubCount }
    meal: text("meal").notNull().default("nincs"),
    mealGuests: integer("meal_guests"),
    message: text("message"), // a vendég üzenete
    request: jsonb("request"), // az eredeti kérés pillanatképe: { party, scope, packageSlug, extras, meal, mealGuests }
    kind: text("kind").notNull().default("ajanlat"), // ajanlat | betelt
    alternatives: jsonb("alternatives"), // betelt: [{ checkIn, checkOut }]
    lines: jsonb("lines"), // tételsorok: [{ key, kind, label, qty, unitPrice, amount, manual }]
    overrides: jsonb("overrides"), // kézzel átírt tételek: { [key]: amount }
    total: integer("total"),
    deposit: integer("deposit"),
    depositPercent: integer("deposit_percent"),
    pricingRegime: text("pricing_regime"),
    personalMessage: text("personal_message"),
    declineMessage: text("decline_message"),
    validDays: integer("valid_days"),
    validUntil: date("valid_until"),
    sentAt: timestamp("sent_at"),
    acceptedAt: timestamp("accepted_at"),
    declinedAt: timestamp("declined_at"),
    acceptToken: text("accept_token").notNull().unique(),
    bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("offers_status_idx").on(t.status), index("offers_booking_idx").on(t.bookingId)],
);

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
