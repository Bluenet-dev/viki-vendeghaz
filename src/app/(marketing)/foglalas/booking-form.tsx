"use client";

import { useState, useMemo, useEffect } from "react";
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

  // Multi-room selection: set of slugs. "egész vendégház" = összes szoba
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set([rooms[0]?.slug ?? ""]));
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

  const activeSlugs = wholeHouse ? new Set(rooms.map((r) => r.slug ?? "")) : selectedSlugs;

  // Egy nap blokkolt, ha bármelyik kijelölt szoba foglalt azon a napon
  const blockedSet = useMemo(() => {
    const s = new Set<string>();
    for (const b of blockedDays) {
      if (activeSlugs.has(b.roomSlug)) s.add(b.date);
    }
    return s;
  }, [blockedDays, activeSlugs]);

  const selectedRoomsData = rooms.filter((r) => activeSlugs.has(r.slug ?? ""));
  const totalCapacity = wholeHouse ? MAX_GUESTS : Math.min(
    selectedRoomsData.reduce((sum, r) => sum + (r.capacity ?? 2), 0),
    MAX_GUESTS
  );

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

  function toggleRoom(slug: string) {
    if (wholeHouse) return;
    const next = new Set(selectedSlugs);
    if (next.has(slug) && next.size > 1) {
      next.delete(slug);
    } else if (!next.has(slug)) {
      next.add(slug);
    }
    setSelectedSlugs(next);
    setCheckIn(null);
    setCheckOut(null);
    setGuests(Math.min(guests, totalCapacity));
  }

  function toggleWholeHouse() {
    setWholeHouse(!wholeHouse);
    setCheckIn(null);
    setCheckOut(null);
    if (!wholeHouse) setGuests(Math.min(guests, MAX_GUESTS));
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
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, phone, roomSlug, checkIn, checkOut, guests, message,
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
            <span>
              {wholeHouse ? "Egész vendégház" : `${activeSlugs.size} szoba`} kijelölve
            </span>
            <span className="text-[var(--text3)]">·</span>
            <span>max. {totalCapacity} fő</span>
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
            {/* Napok */}
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const state = dayState(dateStr);
                const cls: Record<string, string> = {
                  past: "text-[var(--text3)]/60 cursor-default",
                  blocked: "text-[#C45252] cursor-not-allowed line-through bg-[#FEE9E9]",
                  "checkout-available": "text-[var(--text2)] cursor-pointer border border-dashed border-[var(--accent)]/40 hover:bg-[var(--accent-bg)]",
                  checkin: "bg-[var(--accent)] text-white rounded-l-full font-semibold",
                  checkout: "bg-[var(--accent)] text-white rounded-r-full font-semibold",
                  inrange: "bg-[var(--accent-bg)] text-[var(--text)]",
                  available: "hover:bg-[var(--accent2-bg)] text-[var(--text)] cursor-pointer",
                };
                return (
                  <div key={day} onClick={() => handleDayClick(dateStr)}
                    className={`text-center text-sm py-2 transition-colors ${cls[state]}`}>
                    {day}
                  </div>
                );
              })}
            </div>
            {/* Jelmagyarázat */}
            <div className="flex gap-4 mt-3 pt-3 border-t border-[var(--border)]">
              <span className="flex items-center gap-1.5 text-xs text-[var(--text3)]"><span className="w-3 h-3 rounded-full bg-[var(--accent)] inline-block" />Kijelölt</span>
              <span className="flex items-center gap-1.5 text-xs text-[var(--text3)]"><span className="w-3 h-3 rounded-full bg-[#FEE9E9] inline-block" />Foglalt</span>
            </div>
          </div>
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
          disabled={!checkIn || !checkOut || !name || !email || status === "sending" || minNightsError || unavailableError}
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
