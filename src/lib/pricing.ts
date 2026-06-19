export type RoomScope = "szoba-1" | "szoba-2" | "superior" | "egesz_haz";
export type DayType = "weekday" | "weekend";

export interface SeasonRow {
  id: number;
  slug: string;
  name: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  year: number;
  wholeHouseOnly: boolean | null;
  minStayNights: number;
  minStayWholeHouseException: number | null;
  active?: boolean | null;
}

export interface PricingRuleRow {
  id: number;
  seasonId: number;
  dayType: string;
  roomScope: string;
  pricePerNight: number | null;
  priceOnRequest: boolean | null;
}

export interface HolidayOverrideRow {
  id: number;
  slug: string;
  name: string;
  recurring: boolean;
  startMonth: number | null;
  startDay: number | null;
  endMonth: number | null;
  endDay: number | null;
  startDate: string | null;
  endDate: string | null;
  wholeHouseOnly: boolean | null;
  minStayNights: number;
  priceOnRequest: boolean | null;
  active?: boolean | null;
}

export interface HolidayPriceRow {
  id: number;
  holidayId: number;
  roomScope: string;
  pricePerNight: number | null;
}

export interface PricingSettingsRow {
  depositPercent: number;
  ifaPerPersonPerNight: number;
  cancellationFreeHours: number;
  checkInFrom: string | null;
  checkInTo: string | null;
  checkOutUntil: string | null;
}

export interface RoomCapacityPricingRow {
  id: number;
  roomScope: string;
  baseCapacity: number;
  extraGuestFeePerNight: number;
}

export interface PricingData {
  seasons: SeasonRow[];
  rules: PricingRuleRow[];
  holidays: HolidayOverrideRow[];
  holidayPrices: HolidayPriceRow[];
  settings: PricingSettingsRow | null;
  roomCapacities: RoomCapacityPricingRow[];
}

export interface NightRate {
  date: string;
  pricePerNight: number | null;
  priceOnRequest: boolean;
  available: boolean;
  source: "holiday" | "season" | "none";
}

export interface BookingPriceResult {
  nights: number;
  perNight: NightRate[];
  basePrice: number | null;
  extraGuestFee: number;
  totalPrice: number | null;
  priceOnRequest: boolean;
  allAvailable: boolean;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthDayInRange(
  month: number,
  day: number,
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number
): boolean {
  const md = month * 100 + day;
  const start = startMonth * 100 + startDay;
  const end = endMonth * 100 + endDay;
  if (start <= end) return md >= start && md <= end;
  return md >= start || md <= end;
}

export function getDayType(date: Date): DayType {
  const day = date.getDay();
  return day === 0 || day === 5 || day === 6 ? "weekend" : "weekday";
}

// Egy szezon "horgony éve": ha a tartomány nem lép át évhatárt (start <= end), ez egyszerűen
// a dátum éve. Ha átlép (pl. november–március), a dátum éve a tartomány elején (nov-dec) az
// adott szezon éve, a tartomány végén (jan-márc) viszont a szezon éve + 1.
function seasonAnchorYear(date: Date, season: { startMonth: number; startDay: number; endMonth: number; endDay: number }): number {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const md = month * 100 + day;
  const start = season.startMonth * 100 + season.startDay;
  const end = season.endMonth * 100 + season.endDay;
  if (start <= end) return date.getFullYear();
  return md >= start ? date.getFullYear() : date.getFullYear() - 1;
}

export function findSeasonForDate(date: Date, seasons: SeasonRow[]): SeasonRow | undefined {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return seasons.find(
    (s) =>
      s.active !== false &&
      monthDayInRange(month, day, s.startMonth, s.startDay, s.endMonth, s.endDay) &&
      s.year === seasonAnchorYear(date, s)
  );
}

export function findHolidayForDate(
  date: Date,
  holidays: HolidayOverrideRow[]
): HolidayOverrideRow | undefined {
  const iso = toISODate(date);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return holidays.find((h) => {
    if (h.active === false) return false;
    if (h.recurring) {
      if (h.startMonth == null || h.startDay == null || h.endMonth == null || h.endDay == null) {
        return false;
      }
      return monthDayInRange(month, day, h.startMonth, h.startDay, h.endMonth, h.endDay);
    }
    if (!h.startDate || !h.endDate) return false;
    return iso >= h.startDate && iso <= h.endDate;
  });
}

export function isWholeHouseOnlyForDate(date: Date, data: PricingData): boolean {
  const holiday = findHolidayForDate(date, data.holidays);
  if (holiday) return Boolean(holiday.wholeHouseOnly);
  const season = findSeasonForDate(date, data.seasons);
  return Boolean(season?.wholeHouseOnly);
}

export function getMinStay(date: Date, roomScope: RoomScope, data: PricingData): number {
  const holiday = findHolidayForDate(date, data.holidays);
  if (holiday) return holiday.minStayNights;
  const season = findSeasonForDate(date, data.seasons);
  if (!season) return 1;
  if (
    roomScope === "egesz_haz" &&
    season.wholeHouseOnly &&
    season.minStayWholeHouseException != null
  ) {
    return season.minStayWholeHouseException;
  }
  return season.minStayNights;
}

export function resolveRateForDate(date: Date, roomScope: RoomScope, data: PricingData): NightRate {
  const iso = toISODate(date);
  const holiday = findHolidayForDate(date, data.holidays);
  if (holiday) {
    if (holiday.priceOnRequest) {
      return { date: iso, pricePerNight: null, priceOnRequest: true, available: true, source: "holiday" };
    }
    if (holiday.wholeHouseOnly && roomScope !== "egesz_haz") {
      return { date: iso, pricePerNight: null, priceOnRequest: false, available: false, source: "holiday" };
    }
    const hp = data.holidayPrices.find((p) => p.holidayId === holiday.id && p.roomScope === roomScope);
    if (!hp || hp.pricePerNight == null) {
      return { date: iso, pricePerNight: null, priceOnRequest: false, available: false, source: "holiday" };
    }
    return { date: iso, pricePerNight: hp.pricePerNight, priceOnRequest: false, available: true, source: "holiday" };
  }

  const season = findSeasonForDate(date, data.seasons);
  if (!season) {
    return { date: iso, pricePerNight: null, priceOnRequest: false, available: false, source: "none" };
  }
  if (season.wholeHouseOnly && roomScope !== "egesz_haz") {
    return { date: iso, pricePerNight: null, priceOnRequest: false, available: false, source: "season" };
  }
  const dayType = getDayType(date);
  const rule = data.rules.find(
    (r) => r.seasonId === season.id && r.dayType === dayType && r.roomScope === roomScope
  );
  if (!rule) {
    return { date: iso, pricePerNight: null, priceOnRequest: false, available: false, source: "season" };
  }
  if (rule.priceOnRequest) {
    return { date: iso, pricePerNight: null, priceOnRequest: true, available: true, source: "season" };
  }
  return { date: iso, pricePerNight: rule.pricePerNight, priceOnRequest: false, available: true, source: "season" };
}

const DEFAULT_BASE_CAPACITY: Record<RoomScope, number> = {
  "szoba-1": 2,
  "szoba-2": 2,
  superior: 2,
  egesz_haz: 10,
};
const DEFAULT_EXTRA_GUEST_FEE = 7000;

export function getRoomCapacityPricing(
  roomScope: RoomScope,
  data: PricingData
): { baseCapacity: number; extraGuestFeePerNight: number } {
  const row = data.roomCapacities.find((c) => c.roomScope === roomScope);
  return {
    baseCapacity: row?.baseCapacity ?? DEFAULT_BASE_CAPACITY[roomScope],
    extraGuestFeePerNight: row?.extraGuestFeePerNight ?? DEFAULT_EXTRA_GUEST_FEE,
  };
}

export function getLowestPriceForScope(roomScope: RoomScope, data: PricingData): number | null {
  const prices = data.rules
    .filter((r) => r.roomScope === roomScope && r.pricePerNight != null && !r.priceOnRequest)
    .map((r) => r.pricePerNight as number);
  if (prices.length === 0) return null;
  return Math.min(...prices);
}

export function calculateBookingPrice(params: {
  checkIn: string;
  checkOut: string;
  roomScope: RoomScope;
  guests: number;
  data: PricingData;
}): BookingPriceResult {
  const { checkIn, checkOut, roomScope, guests, data } = params;
  const start = new Date(checkIn + "T00:00:00");
  const end = new Date(checkOut + "T00:00:00");
  const perNight: NightRate[] = [];

  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    perNight.push(resolveRateForDate(d, roomScope, data));
  }

  const nights = perNight.length;
  const allAvailable = perNight.every((n) => n.available);
  const priceOnRequest = perNight.some((n) => n.priceOnRequest);

  let basePrice: number | null = null;
  if (allAvailable && !priceOnRequest) {
    basePrice = perNight.reduce((sum, n) => sum + (n.pricePerNight ?? 0), 0);
  }

  const { baseCapacity, extraGuestFeePerNight } = getRoomCapacityPricing(roomScope, data);
  const extraGuestFee = guests > baseCapacity ? (guests - baseCapacity) * extraGuestFeePerNight * nights : 0;

  const totalPrice = basePrice != null ? basePrice + extraGuestFee : null;

  return { nights, perNight, basePrice, extraGuestFee, totalPrice, priceOnRequest, allAvailable };
}
