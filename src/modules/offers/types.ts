// Az árajánlat modul közös típusai és címkéi – kliens- és szerveroldalon is importálható.

import type { Party, QuoteLine } from "@/lib/booking/quote";
import type { Meal } from "@/lib/booking/constants";

export const OFFER_STATUSES = ["uj", "elkuldve", "elfogadva", "foglalas", "elutasitva", "lejart"] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];
export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  uj: "Új",
  elkuldve: "Elküldve",
  elfogadva: "Elfogadva",
  foglalas: "Foglalás",
  elutasitva: "Elutasítva",
  lejart: "Lejárt",
};

export type OfferKind = "ajanlat" | "betelt";

export interface Extras {
  saunaDays?: number;
  tubCount?: number;
}

export interface Window {
  checkIn: string;
  checkOut: string;
}

// A szerkesztő állapota – ebből számol a motor, ezt menti a "Mentés később".
export interface OfferDraft {
  party: Party;
  scope: string; // ajánlott egység: "egesz_haz" | "szoba-1" | "szoba-1,superior"
  packageSlug: string | null;
  extras: Extras;
  meal: Meal;
  mealGuests: number;
  overrides: Record<string, number>; // tétel kulcsa → kézi összeg
  personalMessage: string;
  validDays: number;
  kind: OfferKind;
}

export type OfferLine = QuoteLine & { key: string };

// "szoba-1,superior" ↔ ["szoba-1", "superior"]
export function scopesToTarget(scopes: string[]): string {
  return scopes.includes("egesz_haz") ? "egesz_haz" : scopes.join(",");
}
export function targetToScopes(target: string): string[] {
  return target.split(",").filter(Boolean);
}

// Az eredeti kérés (a szerkesztő bal oldalán változatlanul látszik).
export interface OfferRequest {
  party: Party;
  scope: string;
  packageSlug: string | null;
  extras: Extras;
  meal: Meal;
  mealGuests: number | null;
}
