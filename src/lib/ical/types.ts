// iCal-naptárszinkron – közös típusok és szabályok (DB-függés nélkül).

import { ALL_SCOPES, ROOM_SCOPES, targetRooms, type RoomScope, type Scope, type Source, type Target } from "@/lib/booking/constants";

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

// ─── Egységek ───────────────────────────────────────────────────────────────
// Egység = a portálokon külön hirdetett szállás: a három szoba ÉS az egész ház
// (szezontól függően külön hirdetés). A kódbázis scope-szlugjaival azonosítjuk.
export const UNITS = ALL_SCOPES;
export type Unit = Scope;
export const HOUSE: Unit = "egesz_haz";

export function isUnit(v: unknown): v is Unit {
  return typeof v === "string" && (UNITS as readonly string[]).includes(v);
}

// Az egység mely szobák éjszakáit fedi: az egész ház mindhármat.
export function unitRooms(unit: Unit): RoomScope[] {
  return unit === HOUSE ? [...ROOM_SCOPES] : [unit as RoomScope];
}

// Két egység ugyanazt a szobát is érinti-e (szoba ↔ önmaga, szoba ↔ egész ház).
export function unitsTouch(a: Unit, b: Unit): boolean {
  const rb = unitRooms(b);
  return unitRooms(a).some((r) => rb.includes(r));
}

// Egy foglalás (szoba, szobakombináció vagy egész ház) érinti-e az egységet.
export function bookingTouchesUnit(scope: Target, unit: Unit): boolean {
  const ur = unitRooms(unit);
  return (targetRooms(scope) as string[]).some((r) => ur.includes(r as RoomScope));
}

// A foglalást érintő egységek – ezek feedjei zárhatják az éjszakáit.
export function unitsTouchedBy(scope: Target): Unit[] {
  return UNITS.filter((u) => bookingTouchesUnit(scope, u));
}

// Melyik hirdetésből "jön" egy foglalás: az egész házas foglalás az egész ház
// hirdetéséből, a szobás (vagy kombinált) a szobák hirdetéseiből.
export function originUnits(scope: Target): Unit[] {
  return scope === HOUSE ? [HOUSE] : targetRooms(scope);
}

// ─── Foglalási források ─────────────────────────────────────────────────────

// Melyik foglalási forrás melyik portálról jön. Ha a tulajdonos egy portál foglalását
// kézzel is rögzíti a CMS-ben, az nem dupla foglalás, és nem exportáljuk vissza
// abba a feedbe, ahonnan jött.
export const SOURCE_PLATFORM: Partial<Record<Source, FeedPlatform>> = {
  booking: "booking",
  szallas_hu: "szallas",
};

// A CMS-foglalás ugyanaz-e, mint ami a (unit, platform) feedből jött: forrása az a
// portál, és abból a hirdetésből származik.
export function bookingCameFromFeed(b: { source: string; scope: Target }, unit: Unit, platform: string): boolean {
  return SOURCE_PLATFORM[b.source as Source] === platform && originUnits(b.scope).includes(unit);
}

// ─── Dátum-tartományok ──────────────────────────────────────────────────────

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
