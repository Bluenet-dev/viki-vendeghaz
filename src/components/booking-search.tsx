"use client";

import { useState } from "react";

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Egyszerű GET-űrlap a /foglalas oldalra – JavaScript nélkül is működik.
export function BookingSearch({
  minDate,
  checkIn,
  checkOut,
  guests,
  variant = "light",
}: {
  minDate: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  variant?: "light" | "dark";
}) {
  const [from, setFrom] = useState(checkIn ?? "");
  const [to, setTo] = useState(checkOut ?? "");

  const dark = variant === "dark";
  const labelCls = `mb-1 block text-[12px] font-semibold uppercase tracking-wide ${dark ? "text-[var(--nav-text)]/70" : "text-[var(--text2)]"}`;
  const inputCls =
    "h-12 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-[16px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

  return (
    <form action="/foglalas" method="get" className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[1fr_1fr_130px_auto]">
      <label className="block">
        <span className={labelCls}>Érkezés</span>
        <input
          type="date"
          name="erkezes"
          required
          min={minDate}
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            if (e.target.value && (!to || to <= e.target.value)) setTo(addDays(e.target.value, 2));
          }}
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className={labelCls}>Távozás</span>
        <input
          type="date"
          name="tavozas"
          required
          min={from ? addDays(from, 1) : minDate}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className={labelCls}>Hány fő</span>
        <select name="fo" defaultValue={guests ?? 2} className={inputCls}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n} fő</option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="h-12 rounded-lg bg-[var(--accent2)] px-7 text-[16px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        Keresés
      </button>
    </form>
  );
}
