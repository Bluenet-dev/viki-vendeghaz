"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  calculateBookingPrice,
  getLowestPriceForScope,
  getMinStay,
  isWholeHouseOnlyForDate,
  type PricingData,
  type RoomScope,
} from "@/lib/pricing";

interface Room {
  slug: string | null;
  name: string;
  capacity: number | null;
  priceFrom: number | null;
}

interface BlockedDay {
  roomSlug: string;
  date: string;
}

type Status = "idle" | "sending" | "success" | "error";

const MONTHS_HU = ["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"];
const DAYS_HU = ["H","K","Sze","Cs","P","Szo","V"];
const MAX_GUESTS = 12;

const FELPANZIO_PRICES = {
  reggeli: 3800,
  vacsora: 5200,
  mindketto: 9000,
} as const;
type FelpanzioOption = keyof typeof FELPANZIO_PRICES | null;

// Az alapágyak melletti pótágy/kanapé szöveges feltüntetése (a kapacitás-szám már ezt tartalmazza).
const CAPACITY_NOTE: Record<string, string> = {
  "szoba-1": "2 fő + 1 pótágy",
  "szoba-2": "2 fő + 1 pótágy",
  superior: "2 fő + 2 fő pótágy (kihúzható kanapé)",
};

// A naptár-sávok fix sorrendje. A DB sort_order-től függetlenül mindig
// 1-es · 2-es · Superior, hogy a sávok pozíciója megtanulható legyen.
const BAR_ORDER = ["szoba-1", "szoba-2", "superior"] as const;

const ROOM_DISPLAY: Record<string, { short: string; long: string }> = {
  "szoba-1": { short: "1-es", long: "1-es szoba (Komfort Kétágyas)" },
  "szoba-2": { short: "2-es", long: "2-es szoba (Komfort Franciaágyas)" },
  superior: { short: "Superior", long: "Superior szoba" },
};

const FREE_COLOR = "var(--accent)";
const BUSY_COLOR = "#E24B4A";

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatHuDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

export function BookingForm({
  rooms,
  blockedDays,
  pricingData,
}: {
  rooms: Room[];
  blockedDays: BlockedDay[];
  pricingData: PricingData;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Multi-room selection: set of slugs. Üres halmaz = áttekintő nézet (sávos naptár).
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [wholeHouse, setWholeHouse] = useState(false);
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [felpanzio, setFelpanzio] = useState<FelpanzioOption>(null);
  const [felpanzioFo, setFelpanzioFo] = useState<number>(1);
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const [rangeMsg, setRangeMsg] = useState<string | null>(null);

  const activeSlugs = wholeHouse ? new Set(rooms.map((r) => r.slug ?? "")) : selectedSlugs;
  const noRoomSelected = !wholeHouse && selectedSlugs.size === 0;

  // A sávok fix sorrendben, csak a ténylegesen létező szobákra.
  const orderedRooms = useMemo(
    () => BAR_ORDER.map((slug) => rooms.find((r) => r.slug === slug)).filter((r): r is Room => Boolean(r)),
    [rooms]
  );

  // Szobánkénti foglaltság: slug -> foglalt dátumok halmaza
  const blockedByRoom = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    for (const r of rooms) m[r.slug ?? ""] = new Set<string>();
    for (const b of blockedDays) {
      (m[b.roomSlug] ??= new Set<string>()).add(b.date);
    }
    return m;
  }, [blockedDays, rooms]);

  // Egy adott napra: mely szobák foglaltak, és egész házas-e a nap.
  const dayInfo = useCallback(
    (dateStr: string) => {
      const blocked = orderedRooms.filter((r) => blockedByRoom[r.slug ?? ""]?.has(dateStr));
      const wholeHouseOnly = isWholeHouseOnlyForDate(new Date(dateStr + "T00:00:00"), pricingData);
      return {
        blockedSlugs: new Set(blocked.map((r) => r.slug ?? "")),
        blockedCount: blocked.length,
        freeCount: orderedRooms.length - blocked.length,
        wholeHouseOnly,
      };
    },
    [orderedRooms, blockedByRoom, pricingData]
  );

  // Egy nap "nem választható"-e a jelenlegi módban:
  //  – egész ház (vagy egész házas időszak): elég 1 foglalt szoba
  //  – konkrét szoba(k): a kijelöltek közül bármelyik foglalt
  //  – áttekintő nézet: csak akkor, ha MIND a 3 foglalt (telt ház)
  const isBlockedForMode = useCallback(
    (dateStr: string) => {
      const { blockedSlugs, blockedCount, wholeHouseOnly } = dayInfo(dateStr);
      if (wholeHouse || wholeHouseOnly) return blockedCount > 0;
      if (selectedSlugs.size > 0) {
        for (const s of selectedSlugs) if (blockedSlugs.has(s)) return true;
        return false;
      }
      return blockedCount === orderedRooms.length && orderedRooms.length > 0;
    },
    [dayInfo, wholeHouse, selectedSlugs, orderedRooms.length]
  );

  const blockedSet = useMemo(() => {
    const s = new Set<string>();
    for (const b of blockedDays) {
      if (isBlockedForMode(b.date)) s.add(b.date);
    }
    return s;
  }, [blockedDays, isBlockedForMode]);

  // Egy időszak (éjszakák: checkIn … checkOut-1) elérhető-e az adott kijelöléssel.
  const rangeAvailable = useCallback(
    (ci: string, co: string, slugs: Set<string>, wh: boolean) => {
      const end = new Date(co + "T00:00:00");
      for (const d = new Date(ci + "T00:00:00"); d < end; d.setDate(d.getDate() + 1)) {
        const ds = toISO(d);
        const { blockedSlugs, blockedCount, wholeHouseOnly } = dayInfo(ds);
        if (wh || wholeHouseOnly) {
          if (blockedCount > 0) return false;
        } else {
          for (const s of slugs) if (blockedSlugs.has(s)) return false;
        }
      }
      return true;
    },
    [dayInfo]
  );

  const selectedRoomsData = rooms.filter((r) => activeSlugs.has(r.slug ?? ""));
  const totalCapacity = wholeHouse || noRoomSelected
    ? MAX_GUESTS
    : Math.min(selectedRoomsData.reduce((sum, r) => sum + (r.capacity ?? 2), 0), MAX_GUESTS);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
  }, [checkIn, checkOut]);

  // Ha az érkezési nap "csak egész ház" időszakba esik (nyár, Karácsony, Szilveszter),
  // egyedi szoba nem választható – automatikusan az egész házra állunk.
  const checkInForcesWholeHouse = checkIn
    ? isWholeHouseOnlyForDate(new Date(checkIn + "T00:00:00"), pricingData)
    : false;

  useEffect(() => {
    if (checkInForcesWholeHouse && !wholeHouse) setWholeHouse(true);
  }, [checkInForcesWholeHouse, wholeHouse]);

  const priceResult = useMemo(() => {
    if (!checkIn || !checkOut || nights <= 0) return null;
    if (wholeHouse) {
      return calculateBookingPrice({ checkIn, checkOut, roomScope: "egesz_haz", guests, data: pricingData });
    }
    const slugs = Array.from(activeSlugs).filter(Boolean) as RoomScope[];
    if (slugs.length === 0) return null;
    // Több szoba egyidejű foglalásánál a vendégeket egyenlően osztjuk szét a
    // szobák közt, és mindegyik szoba a saját pótágy-díját számolja a rá eső részre.
    const baseShare = Math.floor(guests / slugs.length);
    let remainder = guests - baseShare * slugs.length;
    let basePrice = 0;
    let extraGuestFee = 0;
    let priceOnRequest = false;
    let allAvailable = true;
    for (const slug of slugs) {
      const share = baseShare + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
      const r = calculateBookingPrice({ checkIn, checkOut, roomScope: slug, guests: share, data: pricingData });
      priceOnRequest = priceOnRequest || r.priceOnRequest;
      allAvailable = allAvailable && r.allAvailable;
      basePrice += r.basePrice ?? 0;
      extraGuestFee += r.extraGuestFee;
    }
    const totalPrice = allAvailable && !priceOnRequest ? basePrice + extraGuestFee : null;
    return { nights, basePrice, extraGuestFee, totalPrice, priceOnRequest, allAvailable };
  }, [checkIn, checkOut, nights, wholeHouse, guests, activeSlugs, pricingData]);

  const felpanzioTotal = felpanzio && nights > 0 ? FELPANZIO_PRICES[felpanzio] * felpanzioFo * nights : 0;
  const estimatedPrice = priceResult?.totalPrice != null ? priceResult.totalPrice + felpanzioTotal : null;

  // Szoba-választó kártyák ár-felirata: ha már van kiválasztott dátum, az adott
  // időszakra számolt tényleges ár jelenik meg; ha még nincs, a legalacsonyabb
  // ("-tól") ár a teljes árlistából, jelezve, hogy ez szezontól függően változik.
  function getCardPriceLabel(slug: RoomScope): string | null {
    if (checkIn && checkOut && nights > 0) {
      const r = calculateBookingPrice({ checkIn, checkOut, roomScope: slug, guests: 0, data: pricingData });
      if (r.priceOnRequest) return "Egyedi ajánlat";
      if (!r.allAvailable) return "Nem foglalható ekkor";
      if (r.basePrice == null) return null;
      const perNight = Math.round(r.basePrice / r.nights);
      return `${perNight.toLocaleString("hu")} Ft/éj (a választott dátumra)`;
    }
    const lowest = getLowestPriceForScope(slug, pricingData);
    return lowest != null ? `${lowest.toLocaleString("hu")} Ft/éj-től` : null;
  }

  const wholeHousePriceLabel = getCardPriceLabel("egesz_haz");

  // Szoba-váltáskor a már kijelölt időszakot megtartjuk, ha az új kijelöléssel is
  // elérhető; ha nem, töröljük és jelezzük a felhasználónak.
  function applySelectionChange(nextSlugs: Set<string>, nextWholeHouse: boolean) {
    if (checkIn && checkOut && !rangeAvailable(checkIn, checkOut, nextSlugs, nextWholeHouse)) {
      setCheckIn(null);
      setCheckOut(null);
      setRangeMsg("A kiválasztott időszak ennél a szobánál nem elérhető.");
    } else {
      setRangeMsg(null);
    }
  }

  function toggleRoom(slug: string) {
    if (wholeHouse) return;
    const next = new Set(selectedSlugs);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setSelectedSlugs(next);
    applySelectionChange(next, false);
    const cap = next.size === 0
      ? MAX_GUESTS
      : Math.min(rooms.filter((r) => next.has(r.slug ?? "")).reduce((s, r) => s + (r.capacity ?? 2), 0), MAX_GUESTS);
    setGuests(Math.min(guests, cap));
  }

  function toggleWholeHouse() {
    const next = !wholeHouse;
    setWholeHouse(next);
    applySelectionChange(next ? new Set(rooms.map((r) => r.slug ?? "")) : selectedSlugs, next);
    if (next) setGuests(Math.min(guests, MAX_GUESTS));
  }

  // Egy blokkolt nap checkout-ként használható, ha nincs blokkolt nap
  // a check-in és e közt (az előző vendég reggel elmegy, a következő délután jön)
  function canBeCheckout(dateStr: string): boolean {
    if (!checkIn || dateStr <= checkIn) return false;
    const ci = new Date(checkIn);
    const co = new Date(dateStr);
    const cur = new Date(ci);
    cur.setDate(cur.getDate() + 1);
    while (cur < co) {
      if (blockedSet.has(cur.toISOString().slice(0, 10))) return false;
      cur.setDate(cur.getDate() + 1);
    }
    return true;
  }

  const minNightsRequired = checkIn
    ? getMinStay(new Date(checkIn + "T00:00:00"), wholeHouse ? "egesz_haz" : "szoba-1", pricingData)
    : 1;
  const minNightsError = nights > 0 && nights < minNightsRequired;
  const unavailableError = nights > 0 && priceResult != null && !priceResult.allAvailable;

  function handleDayClick(dateStr: string) {
    const d = new Date(dateStr);
    if (d < today) return;
    setRangeMsg(null);
    // Mobilon az érintés nem mindig vált ki focus-t, ezért a részletsávot
    // kattintásra is frissítjük – így foglalt napnál is látszik az indok.
    setHoverDay(dateStr);

    const isBlocked = blockedSet.has(dateStr);

    // Blokkolt nap: csak checkout-ként fogadható el (ha érvényes)
    if (isBlocked) {
      if (checkIn && !checkOut && canBeCheckout(dateStr)) {
        setCheckOut(dateStr);
      }
      return;
    }

    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(dateStr);
      setCheckOut(null);
    } else {
      if (dateStr <= checkIn) { setCheckIn(dateStr); setCheckOut(null); return; }
      // Ellenőrzés: van-e blokkolt nap a tartományban (check-in+1 és checkout közt)?
      const ci = new Date(checkIn);
      const co = new Date(dateStr);
      const cur = new Date(ci);
      cur.setDate(cur.getDate() + 1);
      let hasBlocked = false;
      while (cur < co) {
        if (blockedSet.has(cur.toISOString().slice(0, 10))) { hasBlocked = true; break; }
        cur.setDate(cur.getDate() + 1);
      }
      if (hasBlocked) { setCheckIn(dateStr); setCheckOut(null); return; }
      setCheckOut(dateStr);
    }
  }

  function dayState(dateStr: string): "past" | "blocked" | "checkout-available" | "checkin" | "checkout" | "inrange" | "available" {
    const d = new Date(dateStr);
    if (d < today) return "past";
    if (blockedSet.has(dateStr)) {
      // Blokkolt nap, de checkout-ként kattintható, ha check-in már ki van jelölve
      if (checkIn && !checkOut && canBeCheckout(dateStr)) return "checkout-available";
      return "blocked";
    }
    if (dateStr === checkIn) return "checkin";
    if (dateStr === checkOut) return "checkout";
    if (checkIn && checkOut && dateStr > checkIn && dateStr < checkOut) return "inrange";
    return "available";
  }

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!checkIn || !checkOut || activeSlugs.size === 0) return;
    setStatus("sending");
    try {
      const roomSlug = wholeHouse ? "egész vendégház" : Array.from(activeSlugs).join(",");
      const roomLabel = wholeHouse
        ? "Egész ház"
        : selectedRoomsData.map((r) => r.name).join(", ");
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, phone, roomSlug, roomLabel, checkIn, checkOut, guests, message,
          totalPrice: estimatedPrice,
          ...(felpanzio && { felpanzio, felpanzioFo }),
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-[var(--accent-bg)] flex items-center justify-center mx-auto mb-5">
          <span className="text-[var(--accent)] text-3xl">✓</span>
        </div>
        <h2 className="text-3xl text-[var(--text)] font-semibold mb-3">Köszönjük!</h2>
        <p className="text-[var(--text2)] max-w-sm mx-auto leading-relaxed mb-2">
          Foglalási kérése megérkezett. Hamarosan felvesszük Önnel a kapcsolatot a megerősítéshez.
        </p>
        <p className="text-sm text-[var(--text3)]">Visszaigazoló emailt küldtünk a(z) <strong>{email}</strong> címre.</p>
        <button onClick={() => setStatus("idle")} className="mt-8 text-sm text-[var(--accent)] hover:underline">
          Új foglalás
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
      {/* Bal oszlop: szoba-választó + naptár */}
      <div className="space-y-6">
        {/* 1. Szoba(k) */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-[var(--text3)] mb-3">1. Szoba kiválasztása</h3>
          <div className="space-y-2">
            {/* Egész vendégház */}
            <button
              type="button"
              onClick={toggleWholeHouse}
              className={`w-full p-4 rounded-xl border text-left transition-colors ${wholeHouse ? "border-[var(--accent)] bg-[var(--accent-bg)] ring-1 ring-[var(--accent)]/30" : "border-[var(--border)] hover:border-[var(--text3)]"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-[var(--text)]">Egész vendégház</p>
                  <p className="text-xs text-[var(--text2)] mt-0.5">
                    3 szoba (3+3+4 fő) + a nappaliban további 2 fő, max. {MAX_GUESTS} fő
                  </p>
                </div>
                {wholeHousePriceLabel && (
                  <p className="text-sm text-[var(--accent)] font-medium ml-4 shrink-0 text-right">
                    {wholeHousePriceLabel}
                  </p>
                )}
              </div>
            </button>

            {/* Egyéni szobák */}
            <div className={`grid sm:grid-cols-3 gap-2 transition-opacity ${wholeHouse || checkInForcesWholeHouse ? "opacity-40 pointer-events-none" : ""}`}>
              {rooms.map((r) => {
                const active = selectedSlugs.has(r.slug ?? "");
                const priceLabel = r.slug ? getCardPriceLabel(r.slug as RoomScope) : null;
                return (
                  <button
                    key={r.slug}
                    type="button"
                    onClick={() => toggleRoom(r.slug ?? "")}
                    disabled={checkInForcesWholeHouse}
                    className={`p-4 rounded-xl border text-left transition-colors ${active && !wholeHouse ? "border-[var(--accent)] bg-[var(--accent-bg)]" : "border-[var(--border)] hover:border-[var(--text3)]"}`}
                  >
                    <div className={`w-4 h-4 rounded border mb-2 flex items-center justify-center ${active && !wholeHouse ? "bg-[var(--accent)] border-[var(--accent)]" : "border-[var(--border)]"}`}>
                      {active && !wholeHouse && <span className="text-white text-xs leading-none">✓</span>}
                    </div>
                    <p className="font-medium text-sm text-[var(--text)]">{r.name}</p>
                    <p className="text-xs text-[var(--text2)] mt-0.5">
                      {r.slug && CAPACITY_NOTE[r.slug] ? CAPACITY_NOTE[r.slug] : `${r.capacity} fő`}
                      {" "}(max. {r.capacity} fő)
                    </p>
                    {priceLabel && <p className="text-xs text-[var(--accent)] mt-1">{priceLabel}</p>}
                  </button>
                );
              })}
            </div>
            {checkInForcesWholeHouse && (
              <p className="text-xs text-amber-700 bg-amber-50 px-4 py-2.5 rounded-lg">
                A kiválasztott időszakban (nyár / Karácsony / Szilveszter) csak az egész vendégház foglalható.
              </p>
            )}
            <p className="text-xs text-[var(--text3)]">
              Az árak szezontól és naptípustól (hétköznap/hétvége) függően változnak. A fenti
              árak a legalacsonyabb elérhető árat jelzik – válasszon dátumot lent a pontos árért.
            </p>
          </div>

          {/* Összesítő */}
          <div className="mt-3 flex items-center gap-3 text-sm text-[var(--text2)] bg-[var(--surface2)] rounded-lg px-4 py-2.5">
            {noRoomSelected ? (
              <span>Nincs szoba kijelölve – áttekintő nézet, minden nap foglaltsága látszik</span>
            ) : (
              <>
                <span>{wholeHouse ? "Egész vendégház" : `${activeSlugs.size} szoba`} kijelölve</span>
                <span className="text-[var(--text3)]">·</span>
                <span>max. {totalCapacity} fő</span>
              </>
            )}
          </div>
        </div>

        {/* 2. Naptár */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-[var(--text3)] mb-3">2. Dátum kiválasztása</h3>
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
            {/* Nav */}
            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={() => { const d = new Date(calYear, calMonth - 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
                className="px-3 py-1 rounded hover:bg-[var(--surface2)] transition-colors text-[var(--text2)] hover:text-[var(--text)]">←</button>
              <span className="text-lg text-[var(--text)] font-semibold">{MONTHS_HU[calMonth]} {calYear}</span>
              <button type="button" onClick={() => { const d = new Date(calYear, calMonth + 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
                className="px-3 py-1 rounded hover:bg-[var(--surface2)] transition-colors text-[var(--text2)] hover:text-[var(--text)]">→</button>
            </div>
            {/* Fejléc */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS_HU.map((d) => (
                <div key={d} className="text-center text-xs text-[var(--text3)] py-1">{d}</div>
              ))}
            </div>
            {/* Egész házas figyelmeztetés */}
            {wholeHouse && !checkInForcesWholeHouse && (
              <p className="text-xs text-[var(--text2)] bg-[var(--surface2)] px-3 py-2 rounded-lg mb-3">
                Egész házas foglalásnál csak azok a napok választhatók, amikor mind a három szoba szabad.
              </p>
            )}

            {/* Napok */}
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const state = dayState(dateStr);
                const info = dayInfo(dateStr);
                const isPast = state === "past";
                // Sávok csak áttekintő nézetben, nem múltbeli és nem egész házas napon.
                const showBars = noRoomSelected && !isPast && !info.wholeHouseOnly && orderedRooms.length > 0;
                const fullHouseBlocked =
                  !isPast && info.blockedCount === orderedRooms.length && orderedRooms.length > 0;

                const cls: Record<string, string> = {
                  past: "text-[var(--text3)]/60 cursor-default",
                  blocked: "text-[#C45252] cursor-not-allowed line-through bg-[#FEE9E9]",
                  "checkout-available": "text-[var(--text2)] cursor-pointer border border-dashed border-[var(--accent)]/40 hover:bg-[var(--accent-bg)]",
                  checkin: "bg-[var(--accent)] text-white rounded-l-full font-semibold",
                  checkout: "bg-[var(--accent)] text-white rounded-r-full font-semibold",
                  inrange: "bg-[var(--accent-bg)] text-[var(--text)]",
                  available: "hover:bg-[var(--accent2-bg)] text-[var(--text)] cursor-pointer",
                };
                // Áttekintő nézetben a telt házas nap kapja a piros tintát.
                const tint = showBars && fullHouseBlocked ? " bg-[#FEE9E9]" : "";

                const freeNames = orderedRooms
                  .filter((r) => !info.blockedSlugs.has(r.slug ?? ""))
                  .map((r) => ROOM_DISPLAY[r.slug ?? ""]?.long ?? r.name);
                const aria = isPast
                  ? `${formatHuDate(dateStr)}, elmúlt nap`
                  : info.freeCount === 0
                    ? `${formatHuDate(dateStr)}, nincs szabad szoba`
                    : `${formatHuDate(dateStr)}, ${info.freeCount} szoba szabad: ${freeNames.join(", ")}`;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayClick(dateStr)}
                    onMouseEnter={() => setHoverDay(dateStr)}
                    onFocus={() => setHoverDay(dateStr)}
                    disabled={isPast}
                    aria-label={aria}
                    className={`relative w-full min-h-[40px] flex items-center justify-center text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${cls[state]}${tint}`}
                  >
                    <span className={showBars ? "-translate-y-[3px]" : ""}>{day}</span>
                    {showBars && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-[5px] left-1/2 -translate-x-1/2 flex gap-[2px]"
                      >
                        {orderedRooms.map((r) => (
                          <span
                            key={r.slug}
                            className="h-[4px] w-[9px] rounded-[1px]"
                            style={{
                              backgroundColor: info.blockedSlugs.has(r.slug ?? "")
                                ? BUSY_COLOR
                                : FREE_COLOR,
                            }}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Jelmagyarázat */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-[var(--border)]">
              <span className="flex items-center gap-1.5 text-xs text-[var(--text3)]"><span className="w-3 h-3 rounded-full bg-[var(--accent)] inline-block" />Kijelölt</span>
              <span className="flex items-center gap-1.5 text-xs text-[var(--text3)]"><span className="w-3 h-3 rounded-full bg-[#FEE9E9] inline-block" />Foglalt</span>
              {noRoomSelected && (
                <>
                  <span className="flex items-center gap-1.5 text-xs text-[var(--text3)]">
                    <span className="h-[4px] w-[9px] rounded-[1px] inline-block" style={{ backgroundColor: FREE_COLOR }} />
                    Szabad
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-[var(--text3)]">
                    <span className="h-[4px] w-[9px] rounded-[1px] inline-block" style={{ backgroundColor: BUSY_COLOR }} />
                    Foglalt szoba
                  </span>
                  <span className="text-xs text-[var(--text3)] basis-full sm:basis-auto">
                    Sávok balról jobbra: 1-es · 2-es · Superior
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Részletsáv – fix magasság, hogy ne ugráljon a layout */}
          <div
            className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 min-h-[136px]"
            aria-live="polite"
          >
            {hoverDay ? (
              (() => {
                const info = dayInfo(hoverDay);
                return (
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)] mb-2 first-letter:uppercase">
                      {formatHuDate(hoverDay)}
                    </p>
                    <ul className="space-y-1">
                      {orderedRooms.map((r) => {
                        const busy = info.blockedSlugs.has(r.slug ?? "");
                        return (
                          <li key={r.slug} className="flex items-center gap-2 text-sm">
                            <span style={{ color: busy ? BUSY_COLOR : FREE_COLOR }}>{busy ? "●" : "○"}</span>
                            <span className="text-[var(--text2)]">
                              {ROOM_DISPLAY[r.slug ?? ""]?.long ?? r.name}
                            </span>
                            <span className="text-[var(--text3)]">—</span>
                            <span style={{ color: busy ? BUSY_COLOR : "var(--accent)" }}>
                              {busy ? "foglalt" : "szabad"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="text-sm mt-2 pt-2 border-t border-[var(--border)] text-[var(--text2)]">
                      {info.wholeHouseOnly && info.blockedCount === 0 ? (
                        <>Ebben az időszakban csak egész ház foglalható.</>
                      ) : info.blockedCount === 0 ? (
                        <>Egész ház: <span style={{ color: "var(--accent)" }}>foglalható</span></>
                      ) : (
                        <>
                          Egész ház:{" "}
                          <span style={{ color: BUSY_COLOR }}>nem foglalható</span>{" "}
                          ({info.blockedCount} szoba foglalt)
                        </>
                      )}
                    </p>
                  </div>
                );
              })()
            ) : (
              <p className="text-sm text-[var(--text3)]">
                <span className="hidden sm:inline">Vigye az egeret egy napra a részletekért</span>
                <span className="sm:hidden">Érintsen meg egy napot a részletekért</span>
              </p>
            )}
          </div>
          {rangeMsg && (
            <p className="mt-2 text-sm text-amber-700 bg-amber-50 px-4 py-2.5 rounded-lg">
              {rangeMsg}
            </p>
          )}
          {minNightsError && (
            <p className="mt-2 text-sm text-amber-700 bg-amber-50 px-4 py-2.5 rounded-lg">
              A kiválasztott időszakban minimum {minNightsRequired} éjszakát kell foglalni.
            </p>
          )}
          {unavailableError && !minNightsError && (
            <p className="mt-2 text-sm text-amber-700 bg-amber-50 px-4 py-2.5 rounded-lg">
              A kiválasztott időszakban ez a szoba-kombináció nem foglalható. Válassza az egész házat.
            </p>
          )}
        </div>
      </div>

      {/* Jobb oszlop: összesítő + form */}
      <div className="space-y-6 lg:sticky lg:top-24">
        {/* Összesítő kártya */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5">
          <h3 className="font-semibold text-sm text-[var(--text)] mb-3">Foglalás összesítő</h3>

          {checkInForcesWholeHouse && (
            <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mb-3">
              Ebben az időszakban csak egész ház foglalható.
            </p>
          )}

          {noRoomSelected && (
            <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mb-3">
              Válasszon szobát vagy az egész vendégházat a foglaláshoz.
            </p>
          )}

          {checkIn ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-[var(--border)] pb-2">
                <span className="text-[var(--text2)]">Érkezés</span>
                <strong className="text-[var(--text)]">{checkIn}</strong>
              </div>
              {checkOut && (
                <div className="flex justify-between border-b border-[var(--border)] pb-2">
                  <span className="text-[var(--text2)]">Távozás</span>
                  <strong className="text-[var(--text)]">{checkOut}</strong>
                </div>
              )}
              {nights > 0 && (
                <div className="flex justify-between border-b border-[var(--border)] pb-2">
                  <span className="text-[var(--text2)]">{wholeHouse ? "Egész vendégház" : `${activeSlugs.size} szoba`} × {nights} éj</span>
                  <strong className="text-[var(--text)]">
                    {priceResult?.basePrice != null ? `${priceResult.basePrice.toLocaleString("hu")} Ft` : "—"}
                  </strong>
                </div>
              )}
              {priceResult && priceResult.extraGuestFee > 0 && (
                <div className="flex justify-between border-b border-[var(--border)] pb-2">
                  <span className="text-[var(--text2)]">Pótágy/pótfelár</span>
                  <strong className="text-[var(--text)]">{priceResult.extraGuestFee.toLocaleString("hu")} Ft</strong>
                </div>
              )}
              {felpanzio && felpanzioTotal > 0 && (
                <div className="flex justify-between border-b border-[var(--border)] pb-2">
                  <span className="text-[var(--text2)]">
                    {felpanzio === "reggeli" ? "Reggeli" : felpanzio === "vacsora" ? "Vacsora" : "Félpanzió"}
                    {" "}· {felpanzioFo} fő · {nights} éj
                  </span>
                  <strong className="text-[var(--text)]">{felpanzioTotal.toLocaleString("hu")} Ft</strong>
                </div>
              )}
              {priceResult?.priceOnRequest ? (
                <div className="pt-1">
                  <p className="text-sm font-semibold text-[var(--text)]">Egyedi ajánlat – hívjon: +36 70 410-8282</p>
                </div>
              ) : estimatedPrice != null ? (
                <div className="flex justify-between pt-1">
                  <span className="font-semibold text-[var(--text)]">Végösszeg</span>
                  <strong className="text-lg text-[var(--text)]">{estimatedPrice.toLocaleString("hu")} Ft</strong>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[var(--text3)]">Válasszon dátumot a naptárban az ár megtekintéséhez.</p>
          )}
        </div>

        {checkIn && checkOut && nights > 0 && (
          <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--surface2)]">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">
              Étkezés – opcionális
            </p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(["reggeli","vacsora","mindketto"] as const).map((opt) => (
                <button key={opt} type="button"
                  onClick={() => setFelpanzio(felpanzio === opt ? null : opt)}
                  className={`text-xs py-2 px-1 rounded-lg border transition-colors text-center ${
                    felpanzio === opt
                      ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)] font-semibold"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text2)] hover:border-[var(--accent)]"
                  }`}>
                  {opt === "reggeli" && <><span className="block">Reggeli</span><span className="text-[10px] opacity-70">3 800 Ft/fő</span></>}
                  {opt === "vacsora" && <><span className="block">Vacsora</span><span className="text-[10px] opacity-70">5 200 Ft/fő</span></>}
                  {opt === "mindketto" && <><span className="block">Félpanzió</span><span className="text-[10px] opacity-70">9 000 Ft/fő</span></>}
                </button>
              ))}
            </div>
            {felpanzio && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--text2)]">Létszám:</span>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => setFelpanzioFo(Math.max(1, felpanzioFo - 1))}
                    className="w-7 h-7 rounded-full border border-[var(--border)] flex items-center justify-center text-sm hover:border-[var(--accent)]">−</button>
                  <span className="text-sm font-medium w-6 text-center">{felpanzioFo}</span>
                  <button type="button"
                    onClick={() => setFelpanzioFo(Math.min(guests || 12, felpanzioFo + 1))}
                    className="w-7 h-7 rounded-full border border-[var(--border)] flex items-center justify-center text-sm hover:border-[var(--accent)]">+</button>
                </div>
                <span className="text-xs text-[var(--text3)] ml-auto">
                  {(FELPANZIO_PRICES[felpanzio] * felpanzioFo * nights).toLocaleString("hu-HU")} Ft
                </span>
              </div>
            )}
            <a href="/etkezes" target="_blank"
              className="mt-3 block text-xs text-[var(--accent)] hover:underline">
              Részletek a félpanzió lehetőségről →
            </a>
          </div>
        )}

        {/* 3. Vendégek száma */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-[var(--text3)] mb-3">3. Vendégek száma</h3>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setGuests(Math.max(1, guests - 1))}
              className="w-9 h-9 rounded-full border border-[var(--border)] text-[var(--text)] hover:border-[var(--text3)] transition-colors flex items-center justify-center">−</button>
            <span className="text-lg font-medium text-[var(--text)] w-8 text-center">{guests}</span>
            <button type="button" onClick={() => setGuests(Math.min(totalCapacity, guests + 1))}
              className="w-9 h-9 rounded-full border border-[var(--border)] text-[var(--text)] hover:border-[var(--text3)] transition-colors flex items-center justify-center">+</button>
            <span className="text-sm text-[var(--text2)]">fő (max. {totalCapacity})</span>
          </div>
          {wholeHouse && (
            <p className="text-xs text-[var(--text3)] mt-2">
              Egész vendégháznál a nappali és pótágyak is igénybe vehetők – egyeztetés szerint.
            </p>
          )}
        </div>

        {/* 4. Adatok */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-[var(--text3)] mb-3">4. Elérhetőség</h3>
          <div className="space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Teljes neve *" className={inp} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email cím *" className={inp} />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefonszám" className={inp} />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Megjegyzés (opcionális)" className={`${inp} resize-none`} />
          </div>
        </div>

        {status === "error" && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
            Küldés sikertelen. Kérjük hívjon minket: +36 70 410-8282
          </p>
        )}

        <button
          type="submit"
          disabled={noRoomSelected || !checkIn || !checkOut || !name || !email || status === "sending" || minNightsError || unavailableError}
          className="w-full py-4 rounded-full bg-[var(--nav-bg)] text-white font-sans font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === "sending" ? "Küldés..." : "Foglalási kérés elküldése →"}
        </button>
        <p className="text-xs text-[var(--text3)] text-center">
          A foglalási kérés elküldése nem jelent azonnali megerősítést – telefonon vagy emailben visszaigazoljuk.
        </p>
      </div>
    </form>
  );
}

const inp = "w-full px-4 py-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--accent)] transition-colors block";
