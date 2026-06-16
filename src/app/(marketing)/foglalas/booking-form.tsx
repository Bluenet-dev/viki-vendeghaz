"use client";

import { useState, useMemo } from "react";

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

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

export function BookingForm({ rooms, blockedDays }: { rooms: Room[]; blockedDays: BlockedDay[] }) {
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
  const minPrice = selectedRoomsData.reduce((sum, r) => sum + (r.priceFrom ?? 0), 0);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
  }, [checkIn, checkOut]);

  const estimatedPrice = minPrice > 0 && nights > 0 ? minPrice * nights : null;

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

  function handleDayClick(dateStr: string) {
    const d = new Date(dateStr);
    if (d < today || blockedSet.has(dateStr)) return;

    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(dateStr);
      setCheckOut(null);
    } else {
      if (dateStr <= checkIn) { setCheckIn(dateStr); setCheckOut(null); return; }
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

  function dayState(dateStr: string): "past" | "blocked" | "checkin" | "checkout" | "inrange" | "available" {
    const d = new Date(dateStr);
    if (d < today) return "past";
    if (blockedSet.has(dateStr)) return "blocked";
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
        body: JSON.stringify({ name, email, phone, roomSlug, checkIn, checkOut, guests, message }),
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
        <div className="w-16 h-16 rounded-full bg-moss/15 flex items-center justify-center mx-auto mb-5">
          <span className="text-moss text-3xl">✓</span>
        </div>
        <h2 className="font-display text-3xl text-ink mb-3">Köszönjük!</h2>
        <p className="text-bark/60 max-w-sm mx-auto leading-relaxed mb-2">
          Foglalási kérése megérkezett. Hamarosan felvesszük Önnel a kapcsolatot a megerősítéshez.
        </p>
        <p className="text-sm text-bark/40">Visszaigazoló emailt küldtünk a(z) <strong>{email}</strong> címre.</p>
        <button onClick={() => setStatus("idle")} className="mt-8 text-sm text-moss hover:underline">
          Új foglalás
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 1. Szoba(k) */}
      <div>
        <h3 className="font-mono text-xs uppercase tracking-widest text-bark/50 mb-3">1. Szoba kiválasztása</h3>
        <div className="space-y-2">
          {/* Egész vendégház */}
          <button
            type="button"
            onClick={toggleWholeHouse}
            className={`w-full p-4 rounded-xl border text-left transition-colors ${wholeHouse ? "border-moss bg-moss/5 ring-1 ring-moss/30" : "border-ink/10 hover:border-ink/25"}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-ink">Egész vendégház</p>
                <p className="text-xs text-bark/50 mt-0.5">Mindhárom szoba + közös helyiségek, max. {MAX_GUESTS} fő</p>
              </div>
              {minPrice > 0 && (
                <p className="text-sm text-moss font-medium ml-4 shrink-0">
                  {rooms.reduce((s, r) => s + (r.priceFrom ?? 0), 0).toLocaleString("hu")} Ft/éj
                </p>
              )}
            </div>
          </button>

          {/* Egyéni szobák */}
          <div className={`grid sm:grid-cols-3 gap-2 transition-opacity ${wholeHouse ? "opacity-40 pointer-events-none" : ""}`}>
            {rooms.map((r) => {
              const active = selectedSlugs.has(r.slug ?? "");
              return (
                <button
                  key={r.slug}
                  type="button"
                  onClick={() => toggleRoom(r.slug ?? "")}
                  className={`p-4 rounded-xl border text-left transition-colors ${active && !wholeHouse ? "border-moss bg-moss/5" : "border-ink/10 hover:border-ink/25"}`}
                >
                  <div className={`w-4 h-4 rounded border mb-2 flex items-center justify-center ${active && !wholeHouse ? "bg-moss border-moss" : "border-ink/30"}`}>
                    {active && !wholeHouse && <span className="text-white text-xs leading-none">✓</span>}
                  </div>
                  <p className="font-medium text-sm text-ink">{r.name}</p>
                  <p className="text-xs text-bark/50 mt-0.5">{r.capacity} fő</p>
                  {r.priceFrom && (
                    <p className="text-xs text-moss mt-1">{r.priceFrom.toLocaleString("hu")} Ft/éj</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Összesítő */}
        <div className="mt-3 flex items-center gap-3 text-sm text-bark/60 bg-stone/50 rounded-lg px-4 py-2.5">
          <span>
            {wholeHouse ? "Egész vendégház" : `${activeSlugs.size} szoba`} kijelölve
          </span>
          <span className="text-bark/25">·</span>
          <span>max. {totalCapacity} fő</span>
          {minPrice > 0 && (
            <>
              <span className="text-bark/25">·</span>
              <span className="text-moss font-medium">{minPrice.toLocaleString("hu")} Ft/éj-től</span>
            </>
          )}
        </div>
      </div>

      {/* 2. Naptár */}
      <div>
        <h3 className="font-mono text-xs uppercase tracking-widest text-bark/50 mb-3">2. Dátum kiválasztása</h3>
        <div className="bg-white rounded-xl border border-ink/10 p-4">
          {/* Nav */}
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={() => { const d = new Date(calYear, calMonth - 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
              className="px-3 py-1 rounded hover:bg-stone transition-colors text-bark/60 hover:text-bark">←</button>
            <span className="font-display text-lg text-ink">{MONTHS_HU[calMonth]} {calYear}</span>
            <button type="button" onClick={() => { const d = new Date(calYear, calMonth + 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
              className="px-3 py-1 rounded hover:bg-stone transition-colors text-bark/60 hover:text-bark">→</button>
          </div>
          {/* Fejléc */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_HU.map((d) => (
              <div key={d} className="text-center text-xs font-mono text-bark/30 py-1">{d}</div>
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
                past: "text-bark/20 cursor-default",
                blocked: "text-bark/20 cursor-not-allowed line-through bg-ink/5",
                checkin: "bg-moss text-white rounded-l-full font-semibold",
                checkout: "bg-moss text-white rounded-r-full font-semibold",
                inrange: "bg-moss/15 text-bark",
                available: "hover:bg-salt/30 text-bark cursor-pointer",
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
          <div className="flex gap-4 mt-3 pt-3 border-t border-ink/5">
            <span className="flex items-center gap-1.5 text-xs text-bark/40"><span className="w-3 h-3 rounded-full bg-moss inline-block" />Kijelölt</span>
            <span className="flex items-center gap-1.5 text-xs text-bark/40"><span className="w-3 h-3 rounded-full bg-ink/10 inline-block" />Foglalt</span>
          </div>
        </div>
        {checkIn && (
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <span className="text-bark/60">Érkezés: <strong className="text-ink">{checkIn}</strong></span>
            {checkOut && <span className="text-bark/60">Távozás: <strong className="text-ink">{checkOut}</strong></span>}
            {nights > 0 && <span className="text-moss font-medium">{nights} éjszaka</span>}
            {estimatedPrice && <span className="text-bark/60">Becsült ár: <strong className="text-ink">{estimatedPrice.toLocaleString("hu")} Ft</strong></span>}
          </div>
        )}
      </div>

      {/* 3. Vendégek száma */}
      <div>
        <h3 className="font-mono text-xs uppercase tracking-widest text-bark/50 mb-3">3. Vendégek száma</h3>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setGuests(Math.max(1, guests - 1))}
            className="w-9 h-9 rounded-full border border-ink/15 text-ink hover:border-ink/40 transition-colors flex items-center justify-center">−</button>
          <span className="text-lg font-medium text-ink w-8 text-center">{guests}</span>
          <button type="button" onClick={() => setGuests(Math.min(totalCapacity, guests + 1))}
            className="w-9 h-9 rounded-full border border-ink/15 text-ink hover:border-ink/40 transition-colors flex items-center justify-center">+</button>
          <span className="text-sm text-bark/50">fő (max. {totalCapacity})</span>
        </div>
        {wholeHouse && (
          <p className="text-xs text-bark/40 mt-2">
            Egész vendégháznál a nappali és pótágyak is igénybe vehetők – egyeztetés szerint.
          </p>
        )}
      </div>

      {/* 4. Adatok */}
      <div>
        <h3 className="font-mono text-xs uppercase tracking-widest text-bark/50 mb-3">4. Elérhetőség</h3>
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
        disabled={!checkIn || !checkOut || !name || !email || status === "sending"}
        className="w-full py-4 rounded-full bg-salt text-bark font-sans font-semibold text-base hover:bg-salt/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {status === "sending" ? "Küldés..." : "Foglalási kérés elküldése"}
      </button>
      <p className="text-xs text-bark/40 text-center">
        A foglalási kérés elküldése nem jelent azonnali megerősítést – telefonon vagy emailben visszaigazoljuk.
      </p>
    </form>
  );
}

const inp = "w-full px-4 py-3 rounded-lg bg-white border border-ink/15 text-ink placeholder-ink/30 focus:outline-none focus:border-moss transition-colors block";
