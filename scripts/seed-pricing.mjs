import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── Szezonok ──────────────────────────────────────────────────────────────
// Nyár két alszezonra bontva (június vs július-augusztus), mert a két
// hónap-csoport ára eltér, és a séma szezononként egyetlen árat enged.
const seasons = [
  {
    slug: "nyar-junius",
    name: "Nyár – június",
    year: 2026,
    startMonth: 6, startDay: 1, endMonth: 6, endDay: 30,
    wholeHouseOnly: true, minStayNights: 2, minStayWholeHouseException: 1,
    sortOrder: 1,
  },
  {
    slug: "nyar-jul-aug",
    name: "Nyár – július–augusztus",
    year: 2026,
    startMonth: 7, startDay: 1, endMonth: 8, endDay: 31,
    wholeHouseOnly: true, minStayNights: 2, minStayWholeHouseException: 1,
    sortOrder: 2,
  },
  {
    slug: "tavasz",
    name: "Tavasz – április–május",
    year: 2027,
    startMonth: 4, startDay: 1, endMonth: 5, endDay: 31,
    wholeHouseOnly: false, minStayNights: 2, minStayWholeHouseException: null,
    sortOrder: 3,
  },
  {
    slug: "osz",
    name: "Ősz – szeptember–október",
    year: 2026,
    startMonth: 9, startDay: 1, endMonth: 10, endDay: 31,
    wholeHouseOnly: false, minStayNights: 2, minStayWholeHouseException: null,
    sortOrder: 4,
  },
  {
    slug: "tel",
    name: "Tél – november–március",
    year: 2026,
    startMonth: 11, startDay: 1, endMonth: 3, endDay: 31,
    wholeHouseOnly: false, minStayNights: 2, minStayWholeHouseException: null,
    sortOrder: 5,
  },
];

// pricingRules: seasonSlug -> [{ dayType, roomScope, pricePerNight, priceOnRequest }]
const pricingRulesBySeason = {
  "nyar-junius": [
    { dayType: "weekday", roomScope: "egesz_haz", pricePerNight: 85000 },
    { dayType: "weekend", roomScope: "egesz_haz", pricePerNight: 85000 },
  ],
  "nyar-jul-aug": [
    { dayType: "weekday", roomScope: "egesz_haz", pricePerNight: 99000 },
    { dayType: "weekend", roomScope: "egesz_haz", pricePerNight: 99000 },
  ],
  tavasz: [
    { dayType: "weekday", roomScope: "szoba-1", pricePerNight: 18000 },
    { dayType: "weekday", roomScope: "szoba-2", pricePerNight: 18000 },
    { dayType: "weekday", roomScope: "superior", pricePerNight: 24000 },
    { dayType: "weekday", roomScope: "egesz_haz", pricePerNight: 80000 },
    { dayType: "weekend", roomScope: "szoba-1", pricePerNight: 22000 },
    { dayType: "weekend", roomScope: "szoba-2", pricePerNight: 22000 },
    { dayType: "weekend", roomScope: "superior", pricePerNight: 30000 },
    { dayType: "weekend", roomScope: "egesz_haz", pricePerNight: 84000 },
  ],
  osz: [
    { dayType: "weekday", roomScope: "szoba-1", pricePerNight: 16000 },
    { dayType: "weekday", roomScope: "szoba-2", pricePerNight: 16000 },
    { dayType: "weekday", roomScope: "superior", pricePerNight: 22000 },
    { dayType: "weekday", roomScope: "egesz_haz", pricePerNight: 78000 },
    { dayType: "weekend", roomScope: "szoba-1", pricePerNight: 20000 },
    { dayType: "weekend", roomScope: "szoba-2", pricePerNight: 20000 },
    { dayType: "weekend", roomScope: "superior", pricePerNight: 28000 },
    { dayType: "weekend", roomScope: "egesz_haz", pricePerNight: 82000 },
  ],
  tel: [
    { dayType: "weekday", roomScope: "szoba-1", pricePerNight: 16000 },
    { dayType: "weekday", roomScope: "szoba-2", pricePerNight: 16000 },
    { dayType: "weekday", roomScope: "superior", pricePerNight: 22000 },
    { dayType: "weekday", roomScope: "egesz_haz", pricePerNight: 78000 },
    { dayType: "weekend", roomScope: "szoba-1", pricePerNight: 20000 },
    { dayType: "weekend", roomScope: "szoba-2", pricePerNight: 20000 },
    { dayType: "weekend", roomScope: "superior", pricePerNight: 28000 },
    { dayType: "weekend", roomScope: "egesz_haz", pricePerNight: 82000 },
  ],
};

// ─── Ünnepnapok / hosszú hétvégék ──────────────────────────────────────────
// recurring=true: hónap/nap alapján évente automatikusan érvényes.
// recurring=false: explicit dátum-tartomány (mozgó ünnepek), évente frissítendő.
const holidays = [
  {
    slug: "ujev", name: "Január 1. (Újév)", recurring: true,
    startMonth: 1, startDay: 1, endMonth: 1, endDay: 1,
    wholeHouseOnly: false, minStayNights: 2,
    prices: { "szoba-1": 17000, "szoba-2": 17000, superior: 22000, egesz_haz: 75000 },
  },
  {
    slug: "marcius15", name: "Március 15.", recurring: true,
    startMonth: 3, startDay: 15, endMonth: 3, endDay: 15,
    wholeHouseOnly: false, minStayNights: 2,
    prices: { "szoba-1": 24000, "szoba-2": 24000, superior: 32000, egesz_haz: 90000 },
  },
  {
    // Mozgó ünnep – 2026-os dátum, admin évente frissíti
    slug: "husvet", name: "Húsvét (Nagypéntek–Húsvéthétfő)", recurring: false,
    startDate: "2026-04-03", endDate: "2026-04-06",
    wholeHouseOnly: false, minStayNights: 3,
    prices: { "szoba-1": 26000, "szoba-2": 26000, superior: 34000, egesz_haz: 94000 },
  },
  {
    slug: "majus1", name: "Május 1.", recurring: true,
    startMonth: 5, startDay: 1, endMonth: 5, endDay: 1,
    wholeHouseOnly: false, minStayNights: 2,
    prices: { "szoba-1": 24000, "szoba-2": 24000, superior: 32000, egesz_haz: 90000 },
  },
  {
    // Mozgó ünnep – 2026-os dátum, admin évente frissíti
    slug: "punkosd", name: "Pünkösd (hosszú hétvége)", recurring: false,
    startDate: "2026-05-23", endDate: "2026-05-25",
    wholeHouseOnly: false, minStayNights: 3,
    prices: { "szoba-1": 24000, "szoba-2": 24000, superior: 32000, egesz_haz: 90000 },
  },
  {
    slug: "augusztus20", name: "Augusztus 20.", recurring: true,
    startMonth: 8, startDay: 20, endMonth: 8, endDay: 20,
    wholeHouseOnly: true, minStayNights: 2,
    prices: { egesz_haz: 99000 },
  },
  {
    slug: "oktober23", name: "Október 23.", recurring: true,
    startMonth: 10, startDay: 23, endMonth: 10, endDay: 23,
    wholeHouseOnly: false, minStayNights: 2,
    prices: { "szoba-1": 24000, "szoba-2": 24000, superior: 32000, egesz_haz: 90000 },
  },
  {
    slug: "november1", name: "November 1. (Mindenszentek)", recurring: true,
    startMonth: 11, startDay: 1, endMonth: 11, endDay: 1,
    wholeHouseOnly: false, minStayNights: 2,
    prices: { "szoba-1": 19000, "szoba-2": 19000, superior: 24000, egesz_haz: 75000 },
  },
  {
    slug: "karacsony", name: "Karácsony (dec. 24–26.)", recurring: true,
    startMonth: 12, startDay: 24, endMonth: 12, endDay: 26,
    wholeHouseOnly: true, minStayNights: 2,
    prices: { egesz_haz: 110000 },
  },
  {
    slug: "szilveszter", name: "Szilveszter (dec. 29 – jan. 2.)", recurring: true,
    startMonth: 12, startDay: 29, endMonth: 1, endDay: 2,
    wholeHouseOnly: true, minStayNights: 3, priceOnRequest: true,
    prices: {},
  },
];

const pricingSettings = {
  extraGuestThreshold: 10,
  extraGuestFeePerNight: 7000,
  depositPercent: 10,
  ifaPerPersonPerNight: 600,
  cancellationFreeHours: 24,
  checkInFrom: "15:00",
  checkInTo: "21:00",
  checkOutUntil: "10:00",
};

const wellnessServices = [
  {
    slug: "sobarlang", name: "Sóbarlang",
    guestPriceLabel: "Ingyenes", guestPriceNote: "45 perc/fő/nap",
    externalPriceLabel: "1 250 Ft/alkalom", openingHours: "20:00-ig",
    note: "Diák/nyugdíjas 950 Ft, 10× bérlet 11 500 Ft", sortOrder: 1,
  },
  {
    slug: "finn-szauna", name: "Finn szauna",
    guestPriceLabel: "1 500 Ft/fő/óra", guestPriceNote: null,
    externalPriceLabel: "Csak szállóvendégeknek", openingHours: "21:00-ig",
    note: "Előre egyeztetés szükséges", sortOrder: 2,
  },
  {
    slug: "infraszauna", name: "Infraszauna",
    guestPriceLabel: "1 000 Ft/fő/óra", guestPriceNote: null,
    externalPriceLabel: "Csak szállóvendégeknek", openingHours: "21:00-ig",
    note: "Superior szobásoknak a szobában közvetlenül", sortOrder: 3,
  },
  {
    slug: "dezsafurdo", name: "Dézsafürdő",
    guestPriceLabel: "7 000 Ft/nap", guestPriceNote: null,
    externalPriceLabel: "Csak szállóvendégeknek", openingHours: "23:00-ig",
    note: "38–40°C, 4–6 fő, csillagos égbolt", sortOrder: 4,
  },
  {
    slug: "kert-medence", name: "Kert & medence",
    guestPriceLabel: "Ingyenes", guestPriceNote: null,
    externalPriceLabel: "Csak szállóvendégeknek", openingHours: "21:00-ig",
    note: "Április – október", sortOrder: 5,
  },
];

const wellnessPriceTiers = [
  // Sóbarlang – egyedi jegy
  { serviceSlug: "sobarlang", groupLabel: "Egyedi jegy", tierLabel: "Felnőtt (külsős)", price: "1 250 Ft", sortOrder: 1 },
  { serviceSlug: "sobarlang", groupLabel: "Egyedi jegy", tierLabel: "Gyermek 2 éves korig", price: "Ingyenes", sortOrder: 2 },
  { serviceSlug: "sobarlang", groupLabel: "Egyedi jegy", tierLabel: "Diák (18 évesig) / nyugdíjas", price: "950 Ft", sortOrder: 3 },
  { serviceSlug: "sobarlang", groupLabel: "Egyedi jegy", tierLabel: "Gyermek + kísérő felnőtt", price: "1 500 Ft", sortOrder: 4 },
  { serviceSlug: "sobarlang", groupLabel: "Egyedi jegy", tierLabel: "2 gyermek + 1 felnőtt", price: "2 000 Ft", sortOrder: 5 },
  { serviceSlug: "sobarlang", groupLabel: "Egyedi jegy", tierLabel: "Családi (2 felnőtt + 2 gyermek)", price: "2 600 Ft", sortOrder: 6 },
  { serviceSlug: "sobarlang", groupLabel: "Egyedi jegy", tierLabel: "Gyermek kieg. jegy (2–10 éves)", price: "500 Ft", sortOrder: 7 },
  // Sóbarlang – bérlet (10x)
  { serviceSlug: "sobarlang", groupLabel: "Bérlet (10x)", tierLabel: "Felnőtt", price: "11 500 Ft", sortOrder: 8 },
  { serviceSlug: "sobarlang", groupLabel: "Bérlet (10x)", tierLabel: "Diák / nyugdíjas", price: "9 500 Ft", sortOrder: 9 },
  { serviceSlug: "sobarlang", groupLabel: "Bérlet (10x)", tierLabel: "1 gyermek + 1 felnőtt", price: "15 000 Ft", sortOrder: 10 },
  { serviceSlug: "sobarlang", groupLabel: "Bérlet (10x)", tierLabel: "2 gyermek + 1 felnőtt", price: "17 500 Ft", sortOrder: 11 },
  { serviceSlug: "sobarlang", groupLabel: "Bérlet (10x)", tierLabel: "Családi (2 gyermek + 2 felnőtt)", price: "22 000 Ft", sortOrder: 12 },
];

async function seed() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT COUNT(*) FROM seasons");
    if (Number(rows[0].count) > 0) {
      console.log("Pricing already seeded, skipping.");
      return;
    }

    const seasonIdBySlug = {};
    for (const s of seasons) {
      const { rows } = await client.query(
        `INSERT INTO seasons (slug, name, year, start_month, start_day, end_month, end_day, whole_house_only, min_stay_nights, min_stay_whole_house_exception, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [s.slug, s.name, s.year, s.startMonth, s.startDay, s.endMonth, s.endDay, s.wholeHouseOnly, s.minStayNights, s.minStayWholeHouseException, s.sortOrder]
      );
      seasonIdBySlug[s.slug] = rows[0].id;
      console.log("Season:", s.slug);
    }

    for (const [seasonSlug, rules] of Object.entries(pricingRulesBySeason)) {
      const seasonId = seasonIdBySlug[seasonSlug];
      for (const r of rules) {
        await client.query(
          `INSERT INTO pricing_rules (season_id, day_type, room_scope, price_per_night, price_on_request)
           VALUES ($1,$2,$3,$4,$5)`,
          [seasonId, r.dayType, r.roomScope, r.pricePerNight ?? null, r.priceOnRequest ?? false]
        );
      }
      console.log("Pricing rules for season:", seasonSlug);
    }

    for (const h of holidays) {
      const { rows } = await client.query(
        `INSERT INTO holiday_overrides (slug, name, recurring, start_month, start_day, end_month, end_day, start_date, end_date, whole_house_only, min_stay_nights, price_on_request, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
        [
          h.slug, h.name, h.recurring,
          h.startMonth ?? null, h.startDay ?? null, h.endMonth ?? null, h.endDay ?? null,
          h.startDate ?? null, h.endDate ?? null,
          h.wholeHouseOnly, h.minStayNights, h.priceOnRequest ?? false,
          holidays.indexOf(h) + 1,
        ]
      );
      const holidayId = rows[0].id;
      for (const [roomScope, price] of Object.entries(h.prices)) {
        await client.query(
          `INSERT INTO holiday_prices (holiday_id, room_scope, price_per_night) VALUES ($1,$2,$3)`,
          [holidayId, roomScope, price]
        );
      }
      console.log("Holiday:", h.slug);
    }

    await client.query(
      `INSERT INTO pricing_settings (extra_guest_threshold, extra_guest_fee_per_night, deposit_percent, ifa_per_person_per_night, cancellation_free_hours, check_in_from, check_in_to, check_out_until)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        pricingSettings.extraGuestThreshold, pricingSettings.extraGuestFeePerNight,
        pricingSettings.depositPercent, pricingSettings.ifaPerPersonPerNight,
        pricingSettings.cancellationFreeHours, pricingSettings.checkInFrom,
        pricingSettings.checkInTo, pricingSettings.checkOutUntil,
      ]
    );
    console.log("Pricing settings inserted.");

    for (const w of wellnessServices) {
      await client.query(
        `INSERT INTO wellness_services (slug, name, guest_price_label, guest_price_note, external_price_label, opening_hours, note, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [w.slug, w.name, w.guestPriceLabel, w.guestPriceNote, w.externalPriceLabel, w.openingHours, w.note, w.sortOrder]
      );
      console.log("Wellness service:", w.slug);
    }

    for (const t of wellnessPriceTiers) {
      await client.query(
        `INSERT INTO wellness_price_tiers (service_slug, group_label, tier_label, price, sort_order)
         VALUES ($1,$2,$3,$4,$5)`,
        [t.serviceSlug, t.groupLabel, t.tierLabel, t.price, t.sortOrder]
      );
    }
    console.log("Wellness price tiers inserted.");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((e) => { console.error(e.message); process.exit(1); });
