import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  date,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

// ─── Szobák ────────────────────────────────────────────────────────────────
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  capacity: integer("capacity"),
  priceFrom: integer("price_from"), // Ft/éj – "tól" ár (nullable amíg nincs végleges ár)
  images: jsonb("images").$type<string[]>().default([]),
  amenities: jsonb("amenities").$type<string[]>().default([]),
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
  contents: jsonb("contents").$type<string[]>().default([]),
  price: integer("price"), // Ft
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
  season: text("season"), // pl. "nyár", "tél", "egész_év"
  image: text("image"),
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
  coverImage: text("cover_image"),
  category: text("category"),
  published: boolean("published").default(false),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Galéria ───────────────────────────────────────────────────────────────
export const gallery = pgTable("gallery", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  alt: text("alt"),
  category: text("category").notNull(), // szobak | wellness | sobarlang | udvar | termeszet
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

// ─── Üzenetek (kapcsolat + foglalási kérés) ────────────────────────────────
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("contact"), // "contact" | "booking_request"
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message"),
  // Foglalási kéréshez
  roomSlug: text("room_slug"),
  checkIn: date("check_in"),
  checkOut: date("check_out"),
  guests: integer("guests"),
  // Admin
  read: boolean("read").default(false),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Naptár / elérhetőség ──────────────────────────────────────────────────
export const availability = pgTable("availability", {
  id: serial("id").primaryKey(),
  roomSlug: text("room_slug").notNull(), // "szoba-1" | "szoba-2" | "superior" | "egesz-haz"
  date: date("date").notNull(),
  status: text("status").notNull().default("available"), // "available" | "blocked" | "booked"
  source: text("source").default("manual"), // "manual" | "booking_com" | "szallas_hu"
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── iCal import URL-ek ────────────────────────────────────────────────────
export const icalSources = pgTable("ical_sources", {
  id: serial("id").primaryKey(),
  roomSlug: text("room_slug").notNull(),
  name: text("name").notNull(), // pl. "Booking.com – 1-es szoba"
  url: text("url").notNull(),
  lastFetched: timestamp("last_fetched"),
  active: boolean("active").default(true),
});
