"use client";

import { useState } from "react";
import Link from "next/link";

const MONTHS_HU = ["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"];
const DAYS_HU = ["H","K","Sze","Cs","P","Szo","V"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

export function MiniCalendar({ blockedDates }: { blockedDates: string[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const blockedSet = new Set(blockedDates);

  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);

  return (
    <div className="bg-[var(--surface)] rounded-lg p-3 mt-1.5">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => { const d = new Date(calYear, calMonth - 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
          className="px-2 text-[var(--text2)] hover:text-[var(--text)] text-sm"
        >
          ←
        </button>
        <span className="text-xs font-semibold text-[var(--text)]">{MONTHS_HU[calMonth]} {calYear}</span>
        <button
          type="button"
          onClick={() => { const d = new Date(calYear, calMonth + 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
          className="px-2 text-[var(--text2)] hover:text-[var(--text)] text-sm"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 mb-0.5">
        {DAYS_HU.map((d) => (
          <div key={d} className="text-center text-[9px] text-[var(--text3)] py-0.5">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const d = new Date(dateStr);
          const isPast = d < today;
          const isBlocked = blockedSet.has(dateStr);
          let cls = "text-[var(--text)]";
          if (isPast) cls = "text-[var(--text3)]/50";
          else if (isBlocked) cls = "bg-[#FEE9E9] text-[#C45252] rounded";
          return (
            <div key={day} className={`text-center text-[10px] py-1 ${cls}`}>
              {day}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 mt-2 pt-2 border-t border-[var(--border)]">
        <span className="flex items-center gap-1 text-[9px] text-[var(--text3)]">
          <span className="w-2 h-2 rounded-full bg-[#FEE9E9] inline-block" />Foglalt
        </span>
        <span className="flex items-center gap-1 text-[9px] text-[var(--text3)]">
          <span className="w-2 h-2 rounded-full bg-[var(--surface)] border border-[var(--border)] inline-block" />Szabad
        </span>
      </div>

      <Link
        href="/foglalas"
        className="mt-2 block text-center text-[10px] text-[var(--accent)] hover:underline"
      >
        Foglalás indítása →
      </Link>
    </div>
  );
}
