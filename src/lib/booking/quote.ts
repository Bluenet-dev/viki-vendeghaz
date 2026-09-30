// Tiszta árszámítás és elérhetőség-ellenőrzés – nincs DB-hozzáférés, így a
// kereső, az admin és a szerveroldali újraellenőrzés ugyanazt a logikát futtatja.

import {
  ALL_SCOPES,
  BASE_GUESTS,
  MAX_GUESTS,
  SCOPE_LABEL,
  scopeRooms,
  type Meal,
  type Scope,
} from "./constants";
import { diffDays, nightsOf } from "./dates";

export interface RateRow {
  roomScope: string;
  date: string;
  price: number | null;
  extraPersonPrice: number | null;
  minNights: number;
  wholeHouseOnly: boolean;
}

export interface QuoteSettings {
  over10FeePerNight: number;
  ifaPerPersonPerNight: number;
  depositPercent: number;
  breakfastPrice: number;
  dinnerPrice: number;
  halfBoardPrice: number;
}

export interface BookingData {
  rates: Map<string, RateRow>; // kulcs: `${scope}|${date}`
  closed: Map<string, number | null>; // kulcs: `${room}|${date}` → booking_id
  settings: QuoteSettings;
}

export type Problem =
  | { kind: "dates" }
  | { kind: "capacity"; max: number }
  | { kind: "whole_house_only" }
  | { kind: "min_nights"; min: number }
  | { kind: "closed"; dates: string[] }
  | { kind: "no_rate"; dates: string[] };

export interface QuoteLine {
  label: string;
  amount: number;
}

export interface Quote {
  scope: Scope;
  label: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  meal: Meal;
  mealGuests: number;
  accommodation: number; // szállás + pótágy/felár
  lines: QuoteLine[];
  total: number | null; // null = egyedi ár (valamelyik éjnek nincs ára)
  ifa: number;
  deposit: number | null;
  problems: Problem[];
  ok: boolean;
}

export const rateKey = (scope: string, date: string) => `${scope}|${date}`;

export function mealUnitPrice(meal: Meal, s: QuoteSettings): number {
  if (meal === "reggeli") return s.breakfastPrice;
  if (meal === "vacsora") return s.dinnerPrice;
  if (meal === "felpanzio") return s.halfBoardPrice;
  return 0;
}

// Mely éjszakákon foglalt a scope (egész háznál bármelyik szoba foglaltsága számít).
export function closedNights(scope: Scope, nights: string[], closed: BookingData["closed"]): string[] {
  const rooms = scopeRooms(scope);
  return nights.filter((d) => rooms.some((r) => closed.has(rateKey(r, d))));
}

export function computeQuote(
  input: {
    scope: Scope;
    checkIn: string;
    checkOut: string;
    guests: number;
    meal?: Meal;
    mealGuests?: number;
  },
  data: BookingData,
): Quote {
  const { scope, checkIn, checkOut, guests } = input;
  const meal = input.meal ?? "nincs";
  const nights = diffDays(checkIn, checkOut);
  const problems: Problem[] = [];

  const base: Omit<Quote, "accommodation" | "lines" | "total" | "ifa" | "deposit" | "problems" | "ok"> = {
    scope,
    label: SCOPE_LABEL[scope],
    checkIn,
    checkOut,
    nights,
    guests,
    meal,
    mealGuests: meal === "nincs" ? 0 : Math.min(Math.max(input.mealGuests ?? guests, 1), guests),
  };

  if (!(nights > 0) || guests < 1) {
    return { ...base, accommodation: 0, lines: [], total: null, ifa: 0, deposit: null, problems: [{ kind: "dates" }], ok: false };
  }

  if (guests > MAX_GUESTS[scope]) problems.push({ kind: "capacity", max: MAX_GUESTS[scope] });

  const dates = nightsOf(checkIn, checkOut);
  const rows = dates.map((d) => data.rates.get(rateKey(scope, d)));

  const missing = dates.filter((_, i) => !rows[i]);
  if (missing.length) problems.push({ kind: "no_rate", dates: missing });

  if (scope !== "egesz_haz" && rows.some((r) => r?.wholeHouseOnly)) {
    problems.push({ kind: "whole_house_only" });
  }

  const firstRow = rows[0];
  if (firstRow && nights < firstRow.minNights) problems.push({ kind: "min_nights", min: firstRow.minNights });

  const busy = closedNights(scope, dates, data.closed);
  if (busy.length) problems.push({ kind: "closed", dates: busy });

  // Árak
  const extraGuests = Math.max(0, guests - BASE_GUESTS[scope]);
  let priceMissing = false;
  let stay = 0;
  let extra = 0;
  for (const r of rows) {
    if (!r || r.price == null) {
      priceMissing = true;
      continue;
    }
    stay += r.price;
    if (extraGuests > 0) {
      const unit = scope === "egesz_haz" ? data.settings.over10FeePerNight : r.extraPersonPrice;
      if (unit == null) priceMissing = true;
      else extra += unit * extraGuests;
    }
  }

  const lines: QuoteLine[] = [];
  let total: number | null = null;
  const mealAmount = mealUnitPrice(meal, data.settings) * base.mealGuests * nights;

  if (!priceMissing) {
    lines.push({ label: `Szállás – ${nights} éj`, amount: stay });
    if (extra > 0) {
      lines.push({
        label:
          scope === "egesz_haz"
            ? `10 fő feletti felár – ${extraGuests} fő × ${nights} éj`
            : `Pótágy – ${extraGuests} fő × ${nights} éj`,
        amount: extra,
      });
    }
    if (mealAmount > 0) {
      lines.push({ label: `Étkezés – ${base.mealGuests} fő × ${nights} nap`, amount: mealAmount });
    }
    total = stay + extra + mealAmount;
  }

  const ifa = data.settings.ifaPerPersonPerNight * guests * nights;
  const deposit = total != null ? Math.round((total * data.settings.depositPercent) / 100) : null;

  return {
    ...base,
    accommodation: priceMissing ? 0 : stay + extra,
    lines,
    total,
    ifa,
    deposit,
    problems,
    ok: problems.length === 0,
  };
}

// Kereső: az adott időszakra és létszámra foglalható lehetőségek.
// Ha bármelyik éj "csak egész ház", a szobák egyszerűen kimaradnak.
export function searchOptions(
  checkIn: string,
  checkOut: string,
  guests: number,
  data: BookingData,
): { options: Quote[]; minNights: number | null } {
  const quotes = ALL_SCOPES.map((scope) => computeQuote({ scope, checkIn, checkOut, guests }, data));
  const options = quotes.filter((q) => q.ok);

  // Ha csak a minimum éjszaka miatt nincs találat, azt külön jelezzük.
  let minNights: number | null = null;
  if (options.length === 0) {
    const onlyMinFails = quotes.filter(
      (q) => q.problems.length > 0 && q.problems.every((p) => p.kind === "min_nights"),
    );
    if (onlyMinFails.length) {
      minNights = Math.min(
        ...onlyMinFails.map((q) => (q.problems[0] as { kind: "min_nights"; min: number }).min),
      );
    }
  }
  return { options, minNights };
}
