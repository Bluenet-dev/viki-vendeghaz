// iCal-naptárszinkron – közös típusok és platform-szabályok (DB-függés nélkül).

import type { Source } from "@/lib/booking/constants";

// Import-oldali platformok (calendar_feeds.platform). Az Airbnb csak az adatmodellben
// létezik, hogy később migráció nélkül bekapcsolható legyen – UI és teszt nincs rá.
export const FEED_PLATFORMS = ["booking", "szallas", "airbnb", "egyeb"] as const;
export type FeedPlatform = (typeof FEED_PLATFORMS)[number];

// A panelen megjelenő (aktív) platformok.
export const UI_PLATFORMS = ["booking", "szallas"] as const;
export type UiPlatform = (typeof UI_PLATFORMS)[number];

// Export-feedek: platformonként egy, plusz egy általános (mindent tartalmaz).
export const EXPORT_PLATFORMS = ["booking", "szallas", "airbnb", "altalanos"] as const;
export type ExportPlatform = (typeof EXPORT_PLATFORMS)[number];

export const PLATFORM_LABEL: Record<FeedPlatform | ExportPlatform, string> = {
  booking: "Booking.com",
  szallas: "Szállás.hu",
  airbnb: "Airbnb",
  egyeb: "Egyéb",
  altalanos: "Általános",
};

export function isFeedPlatform(v: unknown): v is FeedPlatform {
  return typeof v === "string" && (FEED_PLATFORMS as readonly string[]).includes(v);
}

export function isExportPlatform(v: unknown): v is ExportPlatform {
  return typeof v === "string" && (EXPORT_PLATFORMS as readonly string[]).includes(v);
}

// Melyik foglalási forrás melyik portálról jön. Ha a tulajdonos egy portál foglalását
// kézzel is rögzíti a CMS-ben, az nem dupla foglalás, és nem exportáljuk vissza oda.
export const SOURCE_PLATFORM: Partial<Record<Source, FeedPlatform>> = {
  booking: "booking",
  szallas_hu: "szallas",
};

// Egy foglalt időszak: start = első éjszaka, end = távozás napja (KIZÁRÓLAGOS).
// Mindkettő "YYYY-MM-DD".
export interface DateRange {
  start: string;
  end: string;
}

// A portál-feedből beolvasott esemény.
export interface ParsedEvent extends DateRange {
  uid: string;
  summary: string;
}

// A kimenő feed egy eseménye.
export interface ExportEvent extends DateRange {
  uid: string;
  summary: "Foglalt" | "Zárolva";
}

export const TIMEZONE = "Europe/Budapest";
