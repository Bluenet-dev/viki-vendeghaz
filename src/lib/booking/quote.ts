// Tiszta árszámítás és elérhetőség-ellenőrzés – nincs DB-hozzáférés, így a
// kereső, az admin és a szerveroldali újraellenőrzés ugyanazt a logikát futtatja.

import {
  ALL_SCOPES,
  BASE_GUESTS,
  MAX_GUESTS,
  ROOM_SCOPES,
  SCOPE_LABEL,
  isCombo,
  targetLabel,
  targetMaxGuests,
  targetRooms,
  type Meal,
  type RoomScope,
  type Target,
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
  scope: Target;
  label: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  // Kombinációnál a vendégek szobánkénti elosztása (pl. { "szoba-1": 3, superior: 3 })
  split: Partial<Record<RoomScope, number>> | null;
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

// Mely éjszakákon foglalt a cél (egész háznál/kombinációnál bármelyik szoba számít).
export function closedNights(target: Target, nights: string[], closed: BookingData["closed"]): string[] {
  const rooms = targetRooms(target);
  return nights.filter((d) => rooms.some((r) => closed.has(rateKey(r, d))));
}

// Kombináció: a vendégek legolcsóbb elosztása. Minden szobában először a 2 fős
// alaphely telik be, a többlet oda kerül, ahol olcsóbb a pótágy és van még hely.
function splitGuests(rooms: RoomScope[], guests: number, rows: Map<RoomScope, (RateRow | undefined)[]>) {
  const split = Object.fromEntries(rooms.map((r) => [r, 0])) as Record<RoomScope, number>;
  let left = guests;
  for (const r of rooms) {
    const n = Math.min(BASE_GUESTS[r], left, MAX_GUESTS[r]);
    split[r] = n;
    left -= n;
  }
  const avgExtra = (r: RoomScope) => {
    const list = (rows.get(r) ?? []).map((x) => x?.extraPersonPrice).filter((v): v is number => v != null);
    return list.length ? list.reduce((a, b) => a + b, 0) / list.length : Number.POSITIVE_INFINITY;
  };
  const byCheapest = [...rooms].sort((a, b) => avgExtra(a) - avgExtra(b));
  for (const r of byCheapest) {
    const room = Math.min(MAX_GUESTS[r] - split[r], left);
    split[r] += room;
    left -= room;
  }
  return split;
}

export function computeQuote(
  input: {
    scope: Target;
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
  const combo = isCombo(scope);
  // Árazási egységek: egy szoba, az egész ház, vagy kombinációnál a szobák külön-külön.
  const units: (RoomScope | "egesz_haz")[] = combo ? targetRooms(scope) : [scope as RoomScope | "egesz_haz"];

  const base = {
    scope,
    label: targetLabel(scope),
    checkIn,
    checkOut,
    nights,
    guests,
    split: null as Quote["split"],
    meal,
    mealGuests: meal === "nincs" ? 0 : Math.min(Math.max(input.mealGuests ?? guests, 1), guests),
  };

  if (!(nights > 0) || guests < 1) {
    return { ...base, accommodation: 0, lines: [], total: null, ifa: 0, deposit: null, problems: [{ kind: "dates" }], ok: false };
  }

  const max = targetMaxGuests(scope);
  if (guests > max || (combo && guests < units.length)) problems.push({ kind: "capacity", max });

  const dates = nightsOf(checkIn, checkOut);
  const rowsByUnit = new Map(units.map((u) => [u, dates.map((d) => data.rates.get(rateKey(u, d)))]));

  const missing = dates.filter((_, i) => units.some((u) => !rowsByUnit.get(u)![i]));
  if (missing.length) problems.push({ kind: "no_rate", dates: missing });

  if (scope !== "egesz_haz" && units.some((u) => rowsByUnit.get(u)!.some((r) => r?.wholeHouseOnly))) {
    problems.push({ kind: "whole_house_only" });
  }

  const minNights = Math.max(0, ...units.map((u) => rowsByUnit.get(u)![0]?.minNights ?? 0));
  if (minNights && nights < minNights) problems.push({ kind: "min_nights", min: minNights });

  const busy = closedNights(scope, dates, data.closed);
  if (busy.length) problems.push({ kind: "closed", dates: busy });

  // Vendégek egységenként
  const guestsPerUnit = new Map<string, number>();
  if (combo) {
    const split = splitGuests(units as RoomScope[], guests, rowsByUnit as Map<RoomScope, (RateRow | undefined)[]>);
    base.split = split;
    for (const u of units) guestsPerUnit.set(u, split[u as RoomScope]);
  } else {
    guestsPerUnit.set(units[0], guests);
  }

  // Árak
  const lines: QuoteLine[] = [];
  let priceMissing = false;
  let accommodation = 0;
  for (const u of units) {
    const rows = rowsByUnit.get(u)!;
    const extraGuests = Math.max(0, (guestsPerUnit.get(u) ?? 0) - BASE_GUESTS[u]);
    let stay = 0;
    let extra = 0;
    for (const r of rows) {
      if (!r || r.price == null) {
        priceMissing = true;
        continue;
      }
      stay += r.price;
      if (extraGuests > 0) {
        const unit = u === "egesz_haz" ? data.settings.over10FeePerNight : r.extraPersonPrice;
        if (unit == null) priceMissing = true;
        else extra += unit * extraGuests;
      }
    }
    const who = combo ? ` – ${SCOPE_LABEL[u]} (${guestsPerUnit.get(u)} fő)` : "";
    lines.push({ label: `Szállás${who} – ${nights} éj`, amount: stay });
    if (extra > 0) {
      lines.push({
        label:
          u === "egesz_haz"
            ? `10 fő feletti felár – ${extraGuests} fő × ${nights} éj`
            : `Pótágy${combo ? ` – ${SCOPE_LABEL[u]}` : ""} – ${extraGuests} fő × ${nights} éj`,
        amount: extra,
      });
    }
    accommodation += stay + extra;
  }

  const mealAmount = mealUnitPrice(meal, data.settings) * base.mealGuests * nights;
  let total: number | null = null;
  if (priceMissing) {
    lines.length = 0;
    accommodation = 0;
  } else {
    if (mealAmount > 0) lines.push({ label: `Étkezés – ${base.mealGuests} fő × ${nights} nap`, amount: mealAmount });
    total = accommodation + mealAmount;
  }

  const ifa = data.settings.ifaPerPersonPerNight * guests * nights;
  const deposit = total != null ? Math.round((total * data.settings.depositPercent) / 100) : null;

  return { ...base, accommodation, lines, total, ifa, deposit, problems, ok: problems.length === 0 };
}

// A foglalható kétszobás kombinációk (három szoba = az egész ház, annak saját ára van).
const COMBOS: Target[] = [];
for (let i = 0; i < ROOM_SCOPES.length; i++) {
  for (let j = i + 1; j < ROOM_SCOPES.length; j++) COMBOS.push(`${ROOM_SCOPES[i]},${ROOM_SCOPES[j]}`);
}

// Kereső: az adott időszakra és létszámra foglalható lehetőségek.
// Ha bármelyik éj "csak egész ház", a szobák egyszerűen kimaradnak.
// Ha a létszám egyetlen szabad szobában sem fér el, a legolcsóbb szabad
// kétszobás kombinációt is felajánljuk.
export function searchOptions(
  checkIn: string,
  checkOut: string,
  guests: number,
  data: BookingData,
): { options: Quote[]; minNights: number | null } {
  const singles = ALL_SCOPES.map((scope) => computeQuote({ scope, checkIn, checkOut, guests }, data));
  const rooms = singles.filter((q) => q.scope !== "egesz_haz");
  const house = singles.find((q) => q.scope === "egesz_haz")!;

  let combos: Quote[] = [];
  if (!rooms.some((q) => q.ok)) {
    combos = COMBOS.map((scope) => computeQuote({ scope, checkIn, checkOut, guests }, data));
  }
  const bestCombo = combos
    .filter((q) => q.ok && q.total != null)
    .sort((a, b) => a.total! - b.total!)[0];

  const options = [...rooms.filter((q) => q.ok), ...(bestCombo ? [bestCombo] : []), ...(house.ok ? [house] : [])];

  // Ha csak a minimum éjszaka miatt nincs találat, azt külön jelezzük.
  let minNights: number | null = null;
  if (options.length === 0) {
    const onlyMinFails = [...singles, ...combos].filter(
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
