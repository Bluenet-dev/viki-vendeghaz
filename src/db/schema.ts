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
