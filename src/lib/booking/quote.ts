// Tiszta árszámítás és elérhetőség-ellenőrzés – nincs DB-hozzáférés, így a
// kereső, a foglalási űrlap (böngészőben), az admin és a szerveroldali
// újraellenőrzés ugyanazt a logikát futtatja.
//
// Két szabályrendszer:
//  – "2026": a settings.newPricingFrom előtt érkezőkre – a régi végösszeg (IFA külön,
//    nincs takarítás, kedvezmény, csomag), foglaló settings.depositPercent.
//  – "2027": tarifa (A–H) szerinti létszámár, gyerekkedvezmény, éjszakai kedvezmények,
//    csomag, takarítás, IFA (18+) a végösszegben, foglaló 30% / 50%.

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
import { addDays, diffDays, nightsOf } from "./dates";

export interface RateRow {
  roomScope: string;
  date: string;
  price: number | null;
  extraPersonPrice: number | null;
  minNights: number;
  wholeHouseOnly: boolean;
  tariffCode: string | null;
  label: string | null;
}

export interface TariffRow {
  code: string;
  name: string;
  minNights: number;
  roomMode: string; // "open" | "release" | "never"
  releaseDays: number | null;
  thirdNightDiscount: boolean;
  lastMinuteDiscount: boolean;
  peakDeposit: boolean;
  packageGroup: string | null; // "low" | "high" | null
  color: string;
}

export interface PackageRow {
  slug: string;
  name: string;
  includes: string;
  priceLow: number;
  priceHigh: number | null;
  maxGuests: number;
  months: string | null;
  active: boolean;
}

export interface QuoteSettings {
  over10FeePerNight: number;
  ifaPerPersonPerNight: number;
  depositPercent: number;
  breakfastPrice: number;
  dinnerPrice: number;
  halfBoardPrice: number;
  newPricingFrom: string;
  depositPercentNew: number;
  depositPercentPeak: number;
  childDiscountPercent: number;
  houseLongStayNights: number;
  houseLongStayPercent: number;
  roomThirdNightPercent: number;
  lastMinuteDays: number;
  lastMinutePercent: number;
  houseCleaningFee: number;
  houseCleaningUnderNights: number;
  roomCleaningFee: number;
  roomCleaningUnderNights: number;
  saunaDayPrice: number;
  tubPrice: number;
}

export interface BookingData {
  rates: Map<string, RateRow>; // `${scope}|${date}`
  prices: Map<string, number>; // `${scope}|${date}|${guests}` (egész ház: 8 = 1–8 fő)
  closed: Map<string, number | null>; // `${room}|${date}` → booking_id
  tariffs: Map<string, TariffRow>;
  packages: PackageRow[];
  settings: QuoteSettings;
  today: string; // a "nyílás" és a last minute ehhez képest számol
}

export interface Party {
  adults: number;
  teens: number; // 13–17 év
  children: number; // 3–12 év
  infants: number; // 0–2 év – nem fizet, nem számít a létszámba
}

export type Problem =
  | { kind: "dates" }
  | { kind: "capacity"; max: number }
  | { kind: "whole_house_only" }
  | { kind: "not_released"; opensOn: string | null }
  | { kind: "min_nights"; min: number }
  | { kind: "closed"; dates: string[] }
  | { kind: "no_rate"; dates: string[] }
  | { kind: "package"; reason: string };

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
  guests: number; // fizető létszám (felnőtt + 13–17 + 3–12)
  party: Party;
  regime: "2026" | "2027";
  split: Partial<Record<RoomScope, number>> | null; // kombinációnál szobánkénti létszám
  meal: Meal;
  mealGuests: number;
  packageSlug: string | null;
  accommodation: number; // szállás (kedvezmények után) vagy csomag
  lines: QuoteLine[];
  total: number | null; // null = egyedi ár
  ifa: number;
  ifaIncluded: boolean; // 2027: a végösszeg része; 2026: helyszínen, külön
  depositPercent: number;
  deposit: number | null;
  problems: Problem[];
  ok: boolean;
}

export const rateKey = (scope: string, date: string) => `${scope}|${date}`;
export const priceKey = (scope: string, date: string, guests: number) => `${scope}|${date}|${guests}`;

export function mealUnitPrice(meal: Meal, s: QuoteSettings): number {
  if (meal === "reggeli") return s.breakfastPrice;
  if (meal === "vacsora") return s.dinnerPrice;
  if (meal === "felpanzio") return s.halfBoardPrice;
  return 0;
}

export function closedNights(target: Target, nights: string[], closed: BookingData["closed"]): string[] {
  const rooms = targetRooms(target);
  return nights.filter((d) => rooms.some((r) => closed.has(rateKey(r, d))));
}

export function houseFreeOn(date: string, closed: BookingData["closed"]): boolean {
  return ROOM_SCOPES.every((r) => !closed.has(rateKey(r, date)));
}

// Foglalható-e szobánként az adott éjszaka. A tarifa dönt (2027+); tarifa nélkül
// (2026) a régi "csak egész ház" jelölő.
export function roomNightStatus(
  room: string,
  date: string,
  data: BookingData,
): { open: boolean; opensOn: string | null; never: boolean } {
  const row = data.rates.get(rateKey(room, date));
  if (!row) return { open: false, opensOn: null, never: false };
  const t = row.tariffCode ? data.tariffs.get(row.tariffCode) : undefined;
  if (!t) return { open: !row.wholeHouseOnly, opensOn: null, never: false };
  if (t.roomMode === "open") return { open: true, opensOn: null, never: false };
  if (t.roomMode === "never") return { open: false, opensOn: null, never: true };
  const opensOn = addDays(date, -(t.releaseDays ?? 0));
  return { open: data.today >= opensOn && houseFreeOn(date, data.closed), opensOn, never: false };
}

// Az egész háznál a 8-as sor jelenti az 1–8 főt.
export const HOUSE_BASE_ROW = 8;

export function priceFor(scope: string, date: string, guests: number, data: BookingData): number | null {
  const g = scope === "egesz_haz" ? Math.max(guests, HOUSE_BASE_ROW) : guests;
  return data.prices.get(priceKey(scope, date, g)) ?? null;
}

const fmtPct = (n: number) => `${n}%`;

interface UnitResult {
  gross: number; // létszámár összesen
  childDiscount: number;
  nightDiscounts: { kind: "long" | "third" | "last"; amount: number }[];
  missing: boolean;
}

// Egy egység (szoba vagy ház) éjszakái adott létszámmal és gyerekszámmal.
function unitCost(
  unit: RoomScope | "egesz_haz",
  dates: string[],
  guests: number,
  children: number,
  data: BookingData,
  opts: { regime: "2026" | "2027"; checkIn: string; nights: number },
): UnitResult {
  const s = data.settings;
  const res: UnitResult = { gross: 0, childDiscount: 0, nightDiscounts: [], missing: false };
  const baseSlots = unit === "egesz_haz" ? HOUSE_BASE_ROW : BASE_GUESTS[unit];
  const lastMinute = diffDays(data.today, opts.checkIn) <= s.lastMinuteDays;

  dates.forEach((d, k) => {
    const p = priceFor(unit, d, guests, data);
    if (p == null) {
      res.missing = true;
      return;
    }
    res.gross += p;
    if (opts.regime === "2026") return;

    // Gyerekkedvezmény: a gyerekek a legfelső helyeket töltik; ha az felárhely,
    // annak a helynek a növekményéből a kedvezmény-százaléknyi jár le.
    let child = 0;
    for (let pos = guests - children + 1; pos <= guests; pos++) {
      if (pos <= baseSlots) continue;
      const cur = priceFor(unit, d, pos, data);
      const prev = priceFor(unit, d, pos - 1, data);
      if (cur != null && prev != null) child += ((cur - prev) * s.childDiscountPercent) / 100;
    }
    child = Math.round(child);
    res.childDiscount += child;

    // Éjszakai kedvezmény: a legnagyobb egy jár.
    const t = data.tariffs.get(data.rates.get(rateKey(unit, d))?.tariffCode ?? "");
    const candidates: { kind: "long" | "third" | "last"; pct: number }[] = [];
    if (unit === "egesz_haz" && opts.nights >= s.houseLongStayNights) candidates.push({ kind: "long", pct: s.houseLongStayPercent });
    if (unit !== "egesz_haz" && k === 2 && t?.thirdNightDiscount) candidates.push({ kind: "third", pct: s.roomThirdNightPercent });
    if (lastMinute && t?.lastMinuteDiscount) candidates.push({ kind: "last", pct: s.lastMinutePercent });
    const best = candidates.sort((a, b) => b.pct - a.pct)[0];
    if (best) res.nightDiscounts.push({ kind: best.kind, amount: Math.round(((p - child) * best.pct) / 100) });
  });
  return res;
}

const unitNet = (r: UnitResult) => r.gross - r.childDiscount - r.nightDiscounts.reduce((a, x) => a + x.amount, 0);

export interface QuoteInput {
  scope: Target;
  checkIn: string;
  checkOut: string;
  guests?: number; // ha nincs bontás: mindenki felnőtt
  party?: Party;
  meal?: Meal;
  mealGuests?: number;
  packageSlug?: string | null;
  extras?: { saunaDays?: number; tubCount?: number };
}

export function computeQuote(input: QuoteInput, data: BookingData): Quote {
  const { scope, checkIn, checkOut } = input;
  const s = data.settings;
  const party: Party = input.party ?? { adults: input.guests ?? 0, teens: 0, children: 0, infants: 0 };
  const guests = party.adults + party.teens + party.children;
  const meal = input.meal ?? "nincs";
  const nights = diffDays(checkIn, checkOut);
  const regime: "2026" | "2027" = checkIn >= s.newPricingFrom ? "2027" : "2026";
  const problems: Problem[] = [];
  const combo = isCombo(scope);
  const units: (RoomScope | "egesz_haz")[] = combo ? targetRooms(scope) : [scope as RoomScope | "egesz_haz"];
  const pkg = regime === "2027" && scope === "egesz_haz" && input.packageSlug
    ? data.packages.find((p) => p.slug === input.packageSlug && p.active) ?? null
    : null;

  const base: Omit<Quote, "accommodation" | "lines" | "total" | "ifa" | "ifaIncluded" | "depositPercent" | "deposit" | "problems" | "ok"> = {
    scope,
    label: targetLabel(scope),
    checkIn,
    checkOut,
    nights,
    guests,
    party,
    regime,
    split: null,
    meal,
    mealGuests: meal === "nincs" ? 0 : Math.min(Math.max(input.mealGuests ?? guests, 1), guests + party.infants),
    packageSlug: pkg?.slug ?? null,
  };
  const fail = (p: Problem): Quote => ({
    ...base, accommodation: 0, lines: [], total: null, ifa: 0, ifaIncluded: false, depositPercent: 0, deposit: null, problems: [p], ok: false,
  });

  if (!(nights > 0) || guests < 1 || party.adults < 1) return fail({ kind: "dates" });

  const max = targetMaxGuests(scope);
  if (guests > max || (combo && guests < units.length)) problems.push({ kind: "capacity", max });

  const dates = nightsOf(checkIn, checkOut);
  const missing = dates.filter((d) => units.some((u) => !data.rates.get(rateKey(u, d))));
  if (missing.length) problems.push({ kind: "no_rate", dates: missing });

  // Szobánként foglalható-e minden éj
  if (scope !== "egesz_haz") {
    for (const d of dates) {
      for (const u of units) {
        const st = roomNightStatus(u, d, data);
        if (st.open) continue;
        const row = data.rates.get(rateKey(u, d));
        if (st.opensOn && !problems.some((p) => p.kind === "not_released")) problems.push({ kind: "not_released", opensOn: st.opensOn });
        else if (row && !problems.some((p) => p.kind === "whole_house_only" || p.kind === "not_released")) problems.push({ kind: "whole_house_only" });
      }
    }
  }

  const minNights = Math.max(0, ...units.map((u) => data.rates.get(rateKey(u, checkIn))?.minNights ?? 0));
  if (minNights && nights < minNights) problems.push({ kind: "min_nights", min: minNights });

  const busy = closedNights(scope, dates, data.closed);
  if (busy.length) problems.push({ kind: "closed", dates: busy });

  const opts = { regime, checkIn, nights };
  const lines: QuoteLine[] = [];
  let accommodation = 0;
  let priceMissing = false;

  if (pkg) {
    // Csomag: létszámtól független éjszakai ár, kedvezmény nem jár rá.
    let sum = 0;
    for (const d of dates) {
      const t = data.tariffs.get(data.rates.get(rateKey("egesz_haz", d))?.tariffCode ?? "");
      const price = t?.packageGroup === "low" ? pkg.priceLow : t?.packageGroup === "high" ? pkg.priceHigh : null;
      const monthOk = !pkg.months || pkg.months.split(",").map(Number).includes(Number(d.slice(5, 7)));
      if (price == null || !monthOk) {
        problems.push({ kind: "package", reason: "Ez a csomag erre az időszakra nem választható." });
        break;
      }
      sum += price;
    }
    if (guests > pkg.maxGuests) problems.push({ kind: "package", reason: `Ez a csomag legfeljebb ${pkg.maxGuests} főre szól.` });
    accommodation = sum;
    lines.push({ label: `Csomag: ${pkg.name} – ${nights} éj`, amount: sum });
  } else {
    // Egységek és (kombinációnál) a legolcsóbb elosztás
    let best: { results: UnitResult[]; split: number[] } | null = null;
    const splits = combo ? enumerateSplits(units as RoomScope[], guests, party.children) : [{ guests: [guests], children: [regime === "2027" ? party.children : 0] }];
    if (!splits.length) splits.push({ guests: units.map(() => 1), children: units.map(() => 0) }); // a kapacitás-hiba már jelezve
    for (const sp of splits) {
      const results = units.map((u, i) => unitCost(u, dates, sp.guests[i], regime === "2027" ? sp.children[i] : 0, data, opts));
      if (results.some((r) => r.missing)) {
        if (!best) best = { results, split: sp.guests };
        continue;
      }
      if (!best || best.results.some((r) => r.missing) || results.reduce((a, r) => a + unitNet(r), 0) < best.results.reduce((a, r) => a + unitNet(r), 0)) {
        best = { results, split: sp.guests };
      }
    }
    const results = best!.results;
    priceMissing = results.some((r) => r.missing);
    if (combo) base.split = Object.fromEntries(units.map((u, i) => [u, best!.split[i]])) as Partial<Record<RoomScope, number>>;

    if (!priceMissing) {
      units.forEach((u, i) => {
        const who = combo ? ` – ${SCOPE_LABEL[u]} (${best!.split[i]} fő)` : "";
        lines.push({ label: `Szállás${who} – ${nights} éj`, amount: results[i].gross });
      });
      const child = results.reduce((a, r) => a + r.childDiscount, 0);
      if (child) lines.push({ label: `Gyermekkedvezmény (3–12 év, a felár ${fmtPct(s.childDiscountPercent)}-a)`, amount: -child });
      const sumKind = (k: "long" | "third" | "last") => results.reduce((a, r) => a + r.nightDiscounts.filter((x) => x.kind === k).reduce((b, x) => b + x.amount, 0), 0);
      const long = sumKind("long");
      const third = sumKind("third");
      const last = sumKind("last");
      if (long) lines.push({ label: `Kedvezmény – ${s.houseLongStayNights} éjtől ${fmtPct(s.houseLongStayPercent)}`, amount: -long });
      if (third) lines.push({ label: `Kedvezmény – a 3. éjszaka ${fmtPct(s.roomThirdNightPercent)}`, amount: -third });
      if (last) lines.push({ label: `Last minute kedvezmény – ${fmtPct(s.lastMinutePercent)}`, amount: -last });
      accommodation = results.reduce((a, r) => a + unitNet(r), 0);
    }
  }

  // IFA
  const ifaPeople = regime === "2027" ? party.adults : guests;
  const ifa = s.ifaPerPersonPerNight * ifaPeople * nights;

  let total: number | null = null;
  let depositPercent = s.depositPercent;
  if (!priceMissing) {
    if (regime === "2027") {
      // Takarítási díj
      let cleaning = 0;
      if (scope === "egesz_haz") {
        if (nights < s.houseCleaningUnderNights) cleaning = s.houseCleaningFee;
      } else if (nights < s.roomCleaningUnderNights) {
        cleaning = s.roomCleaningFee * units.length;
      }
      if (cleaning) lines.push({ label: units.length > 1 ? `Takarítási díj – ${units.length} szoba` : "Takarítási díj", amount: cleaning });
      lines.push({ label: `Idegenforgalmi adó – ${party.adults} fő (18+) × ${nights} éj`, amount: ifa });

      const saunaDays = scope === "egesz_haz" ? Math.max(0, Math.floor(input.extras?.saunaDays ?? 0)) : 0;
      const tubCount = Math.max(0, Math.floor(input.extras?.tubCount ?? 0));
      if (saunaDays) lines.push({ label: `Szaunanap – ${saunaDays} nap`, amount: saunaDays * s.saunaDayPrice });
      if (tubCount) lines.push({ label: `Dézsafürdő – ${tubCount} felfűtés`, amount: tubCount * s.tubPrice });
      const mealAmount = mealUnitPrice(meal, s) * base.mealGuests * nights;
      if (mealAmount) lines.push({ label: `Étkezés – ${base.mealGuests} fő × ${nights} nap`, amount: mealAmount });

      total = accommodation + cleaning + ifa + saunaDays * s.saunaDayPrice + tubCount * s.tubPrice + mealAmount;
      const peak = dates.some((d) => units.some((u) => data.tariffs.get(data.rates.get(rateKey(u, d))?.tariffCode ?? "")?.peakDeposit));
      depositPercent = peak ? s.depositPercentPeak : s.depositPercentNew;
    } else {
      const mealAmount = mealUnitPrice(meal, s) * base.mealGuests * nights;
      if (mealAmount) lines.push({ label: `Étkezés – ${base.mealGuests} fő × ${nights} nap`, amount: mealAmount });
      total = accommodation + mealAmount;
    }
  } else {
    lines.length = 0;
    accommodation = 0;
  }

  const deposit = total != null ? Math.round((total * depositPercent) / 100) : null;
  return {
    ...base,
    accommodation,
    lines,
    total,
    ifa,
    ifaIncluded: regime === "2027",
    depositPercent,
    deposit,
    problems,
    ok: problems.length === 0,
  };
}

// ─── Szerializálás a böngészőnek (a foglalási űrlap élőben ugyanezzel számol) ───
export interface SerializedBookingData {
  rates: [string, RateRow][];
  prices: [string, number][];
  closed: [string, number | null][];
  tariffs: TariffRow[];
  packages: PackageRow[];
  settings: QuoteSettings;
  today: string;
}

export function serializeBookingData(d: BookingData): SerializedBookingData {
  const s = d.settings;
  return {
    rates: [...d.rates.entries()],
    prices: [...d.prices.entries()],
    closed: [...d.closed.entries()],
    tariffs: [...d.tariffs.values()],
    packages: d.packages,
    // csak az árszámításhoz szükséges mezők (a bankadat stb. ne menjen ki)
    settings: {
      over10FeePerNight: s.over10FeePerNight, ifaPerPersonPerNight: s.ifaPerPersonPerNight, depositPercent: s.depositPercent,
      breakfastPrice: s.breakfastPrice, dinnerPrice: s.dinnerPrice, halfBoardPrice: s.halfBoardPrice, newPricingFrom: s.newPricingFrom,
      depositPercentNew: s.depositPercentNew, depositPercentPeak: s.depositPercentPeak, childDiscountPercent: s.childDiscountPercent,
      houseLongStayNights: s.houseLongStayNights, houseLongStayPercent: s.houseLongStayPercent, roomThirdNightPercent: s.roomThirdNightPercent,
      lastMinuteDays: s.lastMinuteDays, lastMinutePercent: s.lastMinutePercent, houseCleaningFee: s.houseCleaningFee,
      houseCleaningUnderNights: s.houseCleaningUnderNights, roomCleaningFee: s.roomCleaningFee, roomCleaningUnderNights: s.roomCleaningUnderNights,
      saunaDayPrice: s.saunaDayPrice, tubPrice: s.tubPrice,
    },
    today: d.today,
  };
}

export function deserializeBookingData(s: SerializedBookingData): BookingData {
  return {
    rates: new Map(s.rates),
    prices: new Map(s.prices),
    closed: new Map(s.closed),
    tariffs: new Map(s.tariffs.map((t) => [t.code, t])),
    packages: s.packages,
    settings: s.settings,
    today: s.today,
  };
}

// Érthető üzenet a vendégnek, ha az összeállítás így nem foglalható.
export function problemMessage(p: Problem): string {
  switch (p.kind) {
    case "capacity":
      return `Ide legfeljebb ${p.max} fő fér (a 0–2 éves baba nem számít bele).`;
    case "min_nights":
      return `Erre az időszakra legalább ${p.min} éjszaka foglalható.`;
    case "closed":
      return "Ez az időpont közben betelt.";
    case "whole_house_only":
    case "not_released":
      return "Erre az időszakra csak az egész ház foglalható.";
    case "package":
      return p.reason;
    default:
      return "Ez az időszak így nem foglalható.";
  }
}

// Kombináció: minden létszám- és gyerek-elosztás (szobánként legalább 1 fő).
function enumerateSplits(rooms: RoomScope[], guests: number, children: number) {
  const out: { guests: number[]; children: number[] }[] = [];
  const walk = (i: number, left: number, acc: number[]) => {
    if (i === rooms.length - 1) {
      if (left >= 1 && left <= MAX_GUESTS[rooms[i]]) out.push({ guests: [...acc, left], children: [] });
      return;
    }
    for (let n = 1; n <= Math.min(MAX_GUESTS[rooms[i]], left - (rooms.length - 1 - i)); n++) walk(i + 1, left - n, [...acc, n]);
  };
  walk(0, guests, []);
  const withChildren: { guests: number[]; children: number[] }[] = [];
  for (const sp of out) {
    const walkC = (i: number, left: number, acc: number[]) => {
      if (i === rooms.length - 1) {
        if (left <= sp.guests[i]) withChildren.push({ guests: sp.guests, children: [...acc, left] });
        return;
      }
      for (let c = 0; c <= Math.min(sp.guests[i], left); c++) walkC(i + 1, left - c, [...acc, c]);
    };
    walkC(0, children, []);
  }
  return withChildren.length ? withChildren : out.map((sp) => ({ ...sp, children: sp.guests.map(() => 0) }));
}

// A foglalható kétszobás kombinációk (három szoba = az egész ház, annak saját ára van).
const COMBOS: Target[] = [];
for (let i = 0; i < ROOM_SCOPES.length; i++) {
  for (let j = i + 1; j < ROOM_SCOPES.length; j++) COMBOS.push(`${ROOM_SCOPES[i]},${ROOM_SCOPES[j]}`);
}

// Kereső: az adott időszakra és létszámra foglalható lehetőségek. A nem foglalható
// (csak egész ház / még nem nyílt) szobák egyszerűen kimaradnak.
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
  const bestCombo = combos.filter((q) => q.ok && q.total != null).sort((a, b) => a.total! - b.total!)[0];

  const options = [...rooms.filter((q) => q.ok), ...(bestCombo ? [bestCombo] : []), ...(house.ok ? [house] : [])];

  let minNights: number | null = null;
  if (options.length === 0) {
    const onlyMinFails = [...singles, ...combos].filter((q) => q.problems.length > 0 && q.problems.every((p) => p.kind === "min_nights"));
    if (onlyMinFails.length) {
      minNights = Math.min(...onlyMinFails.map((q) => (q.problems[0] as { kind: "min_nights"; min: number }).min));
    }
  }
  return { options, minNights };
}
