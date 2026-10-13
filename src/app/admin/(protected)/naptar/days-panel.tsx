"use client";

// "Több nap beállítása": egy panel, három számozott lépés.
//  1) Melyik napokat? (dátumok, hét napjai, szállások)
//  2) Mit szeretne? (árat írok be · árlistából választok · lezárom · feloldom)
//  3) Ellenőrzés és mentés (emberi mondatban, mi fog történni)

import { useEffect, useMemo, useState, useTransition } from "react";
import { ALL_SCOPES, MAX_GUESTS, formatFt, type Scope } from "@/lib/booking/constants";
import { addDays, isIsoDate } from "@/lib/booking/dates";
import { applyDaysAction, previewDaysAction } from "./actions";

export interface PanelTariff {
  code: string;
  name: string;
  color: string;
  minNights: number;
  housePrice: number | null;
  roomFrom: number | null;
  roomsBookable: "yes" | "late" | "no";
}

type Mode = "prices" | "tariff" | "close" | "open";

const MONTHS = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];
// A hét napjai hétfőtől (getUTCDay: 0 = vasárnap)
const WEEK = [
  { dow: 1, label: "H" },
  { dow: 2, label: "K" },
  { dow: 3, label: "Sze" },
  { dow: 4, label: "Cs" },
  { dow: 5, label: "P" },
  { dow: 6, label: "Szo" },
  { dow: 0, label: "V" },
];
const SCOPE_TEXT: Record<Scope, { label: string; inSentence: string }> = {
  "szoba-1": { label: "Komfort Kétágyas", inSentence: "a Komfort Kétágyas szoba" },
  "szoba-2": { label: "Komfort Franciaágyas", inSentence: "a Komfort Franciaágyas szoba" },
  superior: { label: "Superior", inSentence: "a Superior szoba" },
  egesz_haz: { label: "Egész ház", inSentence: "az egész ház" },
};
const guestRows = (s: Scope) => (s === "egesz_haz" ? [8, 9, 10, 11, 12] : Array.from({ length: MAX_GUESTS[s] }, (_, i) => i + 1));
const guestLabel = (s: Scope, g: number) => (s === "egesz_haz" && g === 8 ? "1–8 fő" : `${g} fő`);
const dow = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();
const tidy = (name: string) => name.replace(/\s+[–-]\s+/g, ", "); // "Nyár – hétvége" → "Nyár, hétvége"
const cleanNum = (v: string) => v.replace(/\s|ft/gi, "");
const isNum = (v: string) => /^\d{1,7}$/.test(cleanNum(v));

function joinHu(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} és ${items[items.length - 1]}`;
}

// "a" vagy "az" a következő szó előtt
function article(word: string): string {
  return /^[„"]?[aáeéiíoóöőuúüű]/i.test(word) ? "az" : "a";
}

function dayText(iso: string, withYear: boolean, withMonth = true): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${withYear ? `${y}. ` : ""}${withMonth ? `${MONTHS[m - 1]} ` : ""}${d}.`;
}

function rangeText(from: string, to: string, count: number, weekdays: Set<number>): string {
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  const thisYear = new Date().getFullYear() === Number(from.slice(0, 4));
  let text: string;
  if (from === to) text = `${dayText(from, !thisYear)} napon`;
  else if (from.slice(0, 7) === to.slice(0, 7)) text = `${dayText(from, !thisYear)} és ${dayText(to, false, false)} között`;
  else text = `${dayText(from, !sameYear || !thisYear)} és ${dayText(to, !sameYear)} között`;
  const all = weekdays.size === 7;
  const wk = [1, 2, 3, 4, 5].every((d) => weekdays.has(d)) && !weekdays.has(6) && !weekdays.has(0);
  const we = weekdays.size === 2 && weekdays.has(6) && weekdays.has(0);
  const filter = all ? "" : wk ? ", csak hétköznapok" : we ? ", csak hétvégék" : `, csak: ${WEEK.filter((w) => weekdays.has(w.dow)).map((w) => w.label).join(", ")}`;
  const t = `${text} (${count} nap${from === to ? "" : filter})`;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function DaysPanel({
  from: initialFrom,
  to: initialTo,
  today,
  tariffs,
  onClose,
  onSaved,
}: {
  from: string;
  to: string;
  today: string;
  tariffs: PanelTariff[];
  onClose: () => void;
  onSaved: (message: string, changedKeys: string[]) => void;
}) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5, 6]));
  const [scopes, setScopes] = useState<Set<Scope>>(new Set(ALL_SCOPES));
  const [mode, setMode] = useState<Mode | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [tariff, setTariff] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [minNights, setMinNights] = useState("");
  const [label, setLabel] = useState("");
  const [clearLabel, setClearLabel] = useState(false);
  const [booked, setBooked] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const validRange = isIsoDate(from) && isIsoDate(to) && from <= to;
  const dates = useMemo(() => {
    if (!validRange) return [];
    const out: string[] = [];
    for (let d = from, i = 0; d <= to && i < 800; d = addDays(d, 1), i++) {
      if (d >= today && weekdays.has(dow(d))) out.push(d);
    }
    return out;
  }, [from, to, today, weekdays, validRange]);
  const scopeList = ALL_SCOPES.filter((s) => scopes.has(s));

  // Hány napon van már foglalás (a figyelmeztetéshez)
  useEffect(() => {
    if (!dates.length || !scopeList.length) {
      setBooked(0);
      return;
    }
    const t = setTimeout(async () => {
      const r = await previewDaysAction({ dates, scopes: scopeList }).catch(() => null);
      if (r) setBooked(r.booked);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates, scopes]);

  const filledPrices = scopeList.flatMap((s) =>
    guestRows(s).flatMap((g) => {
      const v = prices[`${s}|${g}`] ?? "";
      return v.trim() ? [{ scope: s, guests: g, value: v }] : [];
    }),
  );
  const badPrice = filledPrices.some((p) => !isNum(p.value));
  const badMin = minNights.trim() !== "" && (!/^\d{1,2}$/.test(minNights.trim()) || Number(minNights) < 1);
  const hasExtra = minNights.trim() !== "" || label.trim() !== "" || clearLabel;
  const chosenTariff = tariffs.find((t) => t.code === tariff) ?? null;

  const problem = !validRange
    ? "Adja meg, melyik naptól melyik napig."
    : !dates.length
      ? "A kiválasztott napok között nincs mai vagy későbbi nap."
      : !scopeList.length
        ? "Jelölje be, melyik szállásra vonatkozik."
        : mode === "prices" && badPrice
          ? "Az árakhoz csak számot írjon (pl. 18 000)."
          : mode === "prices" && !filledPrices.length && !hasExtra
            ? "Írjon be legalább egy árat."
            : mode === "tariff" && !tariff
              ? "Válasszon egy árlistát."
              : !mode && !hasExtra
                ? "Válassza ki, mit szeretne."
                : badMin
                  ? "Az éjszakák száma 1 és 99 közötti szám legyen."
                  : null;

  // ─── Összefoglaló mondat ──────────────────────────────────────────────────
  const summary = useMemo(() => {
    if (problem) return null;
    const range = rangeText(dates[0], dates[dates.length - 1], dates.length, weekdays);
    const who = joinHu(scopeList.map((s) => SCOPE_TEXT[s].inSentence));
    const plural = scopeList.length > 1;
    const parts: string[] = [];
    // "Árat írok be" ár nélkül (csak további beállítással) = nincs fő választás
    const m = mode === "prices" && !filledPrices.length ? null : mode;
    if (m === "prices") {
      const byScope = scopeList
        .map((s) => {
          const items = filledPrices.filter((p) => p.scope === s);
          if (!items.length) return null;
          const txt = items.map((p) => `${guestLabel(s, p.guests).replace(" fő", " fős")} ára ${formatFt(Number(cleanNum(p.value)))}`);
          return `${SCOPE_TEXT[s].inSentence} ${joinHu(txt)}`;
        })
        .filter(Boolean) as string[];
      parts.push(`${range} ${byScope.join("; ")} lesz.`);
    } else if (m === "tariff" && chosenTariff) {
      const name = `„${tidy(chosenTariff.name)}”`;
      parts.push(`${range} ${who} ára ${article(tidy(chosenTariff.name))} ${name} árlista szerint alakul, legalább ${chosenTariff.minNights} éjszakára foglalható.`);
    } else if (m === "close") {
      parts.push(`${range} ${who} le ${plural ? "lesznek" : "lesz"} zárva.`);
    } else if (m === "open") {
      parts.push(`${range} ${who} fel ${plural ? "lesznek" : "lesz"} oldva.`);
    }
    // További beállítások: fő választás nélkül egy mondatban, különben külön mondatokban.
    const extras: string[] = [];
    if (minNights.trim()) extras.push(`${m ? "" : `${who} `}legalább ${Number(minNights)} éjszakára lesz foglalható`);
    if (clearLabel) extras.push("az ünnep vagy esemény neve törlődik");
    else if (label.trim()) extras.push(`a naptár tetején ez látszik: „${label.trim()}”`);
    if (!m) return `${range} ${joinHu(extras)}.`;
    const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
    return [...parts, ...extras.map((e) => `${cap(e)}.`)].join(" ");
  }, [problem, dates, weekdays, scopeList, mode, filledPrices, chosenTariff, minNights, label, clearLabel]);

  const one = booked === 1;
  const bookedNote =
    booked > 0
      ? mode === "open"
        ? `${booked} napon foglalás van, ${one ? "ez zárva marad" : "ezek zárva maradnak"}.`
        : mode === "close"
          ? `${booked} napon már van foglalás, ${one ? "ez eddig is zárva volt" : "ezek eddig is zárva voltak"}.`
          : `${booked} napon már van foglalás. ${one ? "Ennél" : "Ezeknél"} a meglévő foglalás összege nem változik.`
      : null;

  // A naptárban felvillanó cellák
  function changedKeys(): string[] {
    const keys: string[] = [];
    for (const d of dates) {
      if (mode === "prices") for (const p of filledPrices) keys.push(`${p.scope}|${d}|${p.guests}`);
      if (mode === "tariff") for (const s of scopeList) for (const g of guestRows(s)) keys.push(`${s}|${d}|${g}`);
      if (mode === "close" || mode === "open") {
        for (const s of scopeList) {
          if (s === "egesz_haz") keys.push(`house|${d}`, "szoba-1|" + d, "szoba-2|" + d, "superior|" + d);
          else keys.push(`${s}|${d}`);
        }
      }
    }
    return keys;
  }

  function save() {
    if (problem) return;
    setError(null);
    startSaving(async () => {
      const res = await applyDaysAction({
        dates,
        scopes: scopeList,
        mode,
        prices: filledPrices,
        tariff,
        minNights,
        label,
        clearLabel,
      }).catch(() => ({ error: "Nem sikerült menteni. Kérjük, próbálja újra." }) as { error?: string; message?: string });
      if (res.error) {
        setError(res.error);
        return;
      }
      onSaved(res.message ?? "Elmentve.", changedKeys());
    });
  }

  function toggle<T>(set: Set<T>, v: T): Set<T> {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    return n;
  }

  function samePrice12(s: Scope) {
    const one = prices[`${s}|1`] ?? "";
    const two = prices[`${s}|2`] ?? "";
    const v = two.trim() ? two : one;
    setPrices((p) => ({ ...p, [`${s}|1`]: v, [`${s}|2`]: v }));
  }

  const step = "mb-3 flex items-center gap-3 text-[18px] font-semibold text-[var(--text)]";
  const num = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--nav-bg)] text-[15px] font-bold text-white";
  const input =
    "w-full rounded-md border border-[var(--border)] bg-white px-3 py-2.5 text-[16px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
  const card = (on: boolean) =>
    `cursor-pointer rounded-xl border-2 p-4 text-left transition-colors ${on ? "border-[var(--accent)] bg-[var(--accent-bg)]" : "border-[var(--border)] bg-white hover:border-[var(--text3)]"}`;

  return (
    <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/35 sm:items-start sm:p-4 sm:pt-10" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Több nap beállítása"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full max-w-2xl flex-col bg-[var(--surface)] shadow-2xl sm:max-h-[calc(100vh-5rem)] sm:rounded-[14px]"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-[20px] font-semibold text-[var(--text)]">Több nap beállítása</h2>
          <button type="button" onClick={onClose} aria-label="Bezárás" className="text-[28px] leading-none text-[var(--text3)] hover:text-[var(--text)]">
            ×
          </button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5">
          {/* 1. Melyik napokat? */}
          <section>
            <h3 className={step}>
              <span className={num}>1</span> Melyik napokat?
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[14px] text-[var(--text2)]">Ettől</span>
                <input type="date" min={today} value={from} onChange={(e) => setFrom(e.target.value)} className={input} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[14px] text-[var(--text2)]">Eddig</span>
                <input type="date" min={from || today} value={to} onChange={(e) => setTo(e.target.value)} className={input} />
              </label>
            </div>
            <p className="mt-3 text-[14px] text-[var(--text2)]">Csak ezeken a napokon:</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {WEEK.map((w) => (
                <label key={w.dow} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-[15px] ${weekdays.has(w.dow) ? "border-[var(--accent)] bg-[var(--accent-bg)] font-semibold" : "border-[var(--border)] bg-white text-[var(--text2)]"}`}>
                  <input type="checkbox" className="h-4 w-4" checked={weekdays.has(w.dow)} onChange={() => setWeekdays((s) => toggle(s, w.dow))} />
                  {w.label}
                </label>
              ))}
            </div>
            <p className="mt-2 text-[15px] font-medium text-[var(--text)]" aria-live="polite">
              {dates.length} nap lesz módosítva
            </p>

            <p className="mt-4 text-[14px] text-[var(--text2)]">Melyik szállás?</p>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
              {ALL_SCOPES.map((s) => (
                <label key={s} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-[16px] ${scopes.has(s) ? "border-[var(--accent)] bg-[var(--accent-bg)] font-semibold" : "border-[var(--border)] bg-white text-[var(--text2)]"}`}>
                  <input type="checkbox" className="h-5 w-5" checked={scopes.has(s)} onChange={() => setScopes((c) => toggle(c, s))} />
                  {SCOPE_TEXT[s].label}
                </label>
              ))}
            </div>
          </section>

          {/* 2. Mit szeretne? */}
          <section>
            <h3 className={step}>
              <span className={num}>2</span> Mit szeretne?
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                ["prices", "Árat írok be", "Saját ár a kiválasztott napokra"],
                ["tariff", "Árlistából választok", "Kész árak egy kattintással"],
                ["close", "Lezárom ezeket a napokat", "Pl. felújítás, saját használat"],
                ["open", "Feloldom ezeket a napokat", "Újra foglalhatók lesznek"],
              ] as const).map(([k, title, hint]) => (
                <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(mode === k ? null : k)} className={card(mode === k)}>
                  <span className="block text-[16px] font-semibold text-[var(--text)]">{title}</span>
                  <span className="block text-[13px] text-[var(--text2)]">{hint}</span>
                </button>
              ))}
            </div>

            {mode === "prices" && (
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-white p-4">
                <p className="mb-3 text-[14px] text-[var(--text2)]">Csak azt írja be, amit módosítani szeretne. Az üresen hagyott ár nem változik.</p>
                {scopeList.length === 0 && <p className="text-[14px] text-[var(--text3)]">Előbb jelöljön be egy szállást az 1. lépésben.</p>}
                <div className="space-y-4">
                  {scopeList.map((s) => (
                    <div key={s}>
                      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[15px] font-semibold text-[var(--text)]">{SCOPE_TEXT[s].label}</span>
                        {s !== "egesz_haz" && (
                          <button type="button" onClick={() => samePrice12(s)} className="text-[13px] text-[var(--accent)] underline-offset-2 hover:underline">
                            Ugyanaz az ár 1 és 2 főre
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {guestRows(s).map((g) => {
                          const key = `${s}|${g}`;
                          const v = prices[key] ?? "";
                          const bad = v.trim() !== "" && !isNum(v);
                          return (
                            <label key={key} className="flex items-center gap-2">
                              <span className="w-14 shrink-0 text-[14px] text-[var(--text2)]">{guestLabel(s, g)}</span>
                              <span className="relative flex-1">
                                <input
                                  inputMode="numeric"
                                  value={v}
                                  onChange={(e) => setPrices((p) => ({ ...p, [key]: e.target.value }))}
                                  aria-label={`${SCOPE_TEXT[s].label}, ${guestLabel(s, g)} ára`}
                                  className={`${input} pr-9 text-right ${bad ? "border-[#C0392B] ring-1 ring-[#C0392B]" : ""}`}
                                />
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-[var(--text3)]">Ft</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mode === "tariff" && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {tariffs.map((t) => (
                  <button key={t.code} type="button" aria-pressed={tariff === t.code} onClick={() => setTariff(t.code)} className={`${card(tariff === t.code)} relative`}>
                    <span className="absolute right-3 top-3 rounded px-1.5 text-[11px] text-[var(--text3)]" style={{ backgroundColor: `${t.color}66` }}>
                      {t.code}
                    </span>
                    <span className="block pr-6 text-[16px] font-semibold text-[var(--text)]">{tidy(t.name)}</span>
                    <span className="mt-1 block text-[14px] text-[var(--text)]">
                      {[t.housePrice != null ? `ház ${formatFt(t.housePrice)}` : null, t.roomFrom != null ? `szoba ${formatFt(t.roomFrom)}-tól` : null].filter(Boolean).join(" · ")}
                    </span>
                    <span className="block text-[13px] text-[var(--text2)]">
                      legalább {t.minNights} éjszaka
                      {t.roomsBookable === "no" ? " · szobánként nem foglalható" : t.roomsBookable === "late" ? " · szobák csak közvetlenül előtte nyílnak" : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4">
              <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="text-[15px] font-medium text-[var(--accent)]">
                {more ? "▾" : "▸"} További beállítások (ritkán kell)
              </button>
              {more && (
                <div className="mt-3 space-y-4 rounded-xl border border-[var(--border)] bg-white p-4">
                  <label className="block">
                    <span className="mb-1 block text-[15px] text-[var(--text)]">Legalább hány éjszakára foglalható?</span>
                    <input inputMode="numeric" value={minNights} onChange={(e) => setMinNights(e.target.value)} placeholder="nem változik" className={`${input} max-w-40 ${badMin ? "border-[#C0392B]" : ""}`} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[15px] text-[var(--text)]">Ünnep vagy esemény neve</span>
                    <input value={label} maxLength={40} disabled={clearLabel} onChange={(e) => setLabel(e.target.value)} placeholder="pl. Húsvét" className={input} />
                    <span className="mt-1 block text-[13px] text-[var(--text2)]">
                      Csak emlékeztető Önnek, a naptár tetején látszik, pl. Húsvét. Nem változtat az áron.
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-[14px] text-[var(--text2)]">
                    <input type="checkbox" checked={clearLabel} onChange={(e) => setClearLabel(e.target.checked)} />
                    Törölje a nevet ezekről a napokról
                  </label>
                </div>
              )}
            </div>
          </section>

          {/* 3. Ellenőrzés és mentés */}
          <section>
            <h3 className={step}>
              <span className={num}>3</span> Ellenőrzés és mentés
            </h3>
            {problem ? (
              <p className="rounded-lg bg-[var(--surface2)] px-4 py-3 text-[15px] text-[var(--text2)]">{problem}</p>
            ) : (
              <div className="space-y-2">
                <p className="rounded-lg bg-[var(--accent-bg)] px-4 py-3 text-[16px] leading-relaxed text-[var(--text)]">{summary}</p>
                {bookedNote && <p className="rounded-lg bg-[#FFF6DB] px-4 py-2.5 text-[15px] text-[#7A5B00]">{bookedNote}</p>}
              </div>
            )}
            {error && <p className="mt-2 rounded-lg bg-[#FCEBEB] px-4 py-2.5 text-[15px] text-[#B23B3B]">{error}</p>}
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2.5 text-[15px] text-[var(--text2)] hover:text-[var(--text)]">
            Mégse
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!!problem || saving}
            className="rounded-md bg-[var(--accent)] px-6 py-2.5 text-[16px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
          >
            {saving ? "Mentés…" : "Mentés"}
          </button>
        </div>
      </div>
    </div>
  );
}
