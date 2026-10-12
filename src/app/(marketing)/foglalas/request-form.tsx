"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MEAL_LABEL, formatFt, targetMaxGuests, type Meal, type Target } from "@/lib/booking/constants";
import {
  computeQuote,
  deserializeBookingData,
  problemMessage,
  type Party,
  type SerializedBookingData,
} from "@/lib/booking/quote";

const input =
  "w-full rounded-lg border border-[var(--border)] bg-white px-4 py-3 text-[16px] text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

function Counter({ label, hint, value, min, max, onChange }: { label: string; hint?: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div>
        <p className="text-[15px] text-[var(--text)]">{label}</p>
        {hint && <p className="text-[12px] text-[var(--text3)]">{hint}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`${label} csökkentése`} disabled={value <= min} onClick={() => onChange(value - 1)}
          className="h-9 w-9 rounded-full border border-[var(--border)] text-[18px] text-[var(--text)] disabled:opacity-30">−</button>
        <span className="w-6 text-center text-[16px] font-semibold text-[var(--text)]">{value}</span>
        <button type="button" aria-label={`${label} növelése`} disabled={value >= max} onClick={() => onChange(value + 1)}
          className="h-9 w-9 rounded-full border border-[var(--border)] text-[18px] text-[var(--text)] disabled:opacity-30">+</button>
      </div>
    </div>
  );
}

export function RequestForm(props: {
  scope: Target;
  checkIn: string;
  checkOut: string;
  guests: number;
  data: SerializedBookingData;
  info: { finnSauna: number; infraShared: number; superiorInfra: number; saltCaveMinutes: number };
  checkInFrom: string;
  checkInUntil: string;
  checkOutUntil: string;
}) {
  const data = useMemo(() => deserializeBookingData(props.data), [props.data]);
  const isHouse = props.scope === "egesz_haz";
  const max = targetMaxGuests(props.scope);

  const [party, setParty] = useState<Party>({ adults: props.guests, teens: 0, children: 0, infants: 0 });
  const [meal, setMeal] = useState<Meal>("nincs");
  const [mealGuests, setMealGuests] = useState(props.guests);
  const [packageSlug, setPackageSlug] = useState<string | null>(null);
  const [saunaDays, setSaunaDays] = useState(0);
  const [tubCount, setTubCount] = useState(0);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const paying = party.adults + party.teens + party.children;
  const base = { scope: props.scope, checkIn: props.checkIn, checkOut: props.checkOut, party, meal, mealGuests };
  const quote = computeQuote({ ...base, packageSlug, extras: { saunaDays, tubCount } }, data);
  const isNew = quote.regime === "2027";
  const nights = quote.nights;

  // Csak azok a csomagok, amelyek erre az időszakra és létszámra választhatók.
  const packages = isHouse && isNew
    ? data.packages.filter((p) => p.active && computeQuote({ ...base, packageSlug: p.slug }, data).problems.every((x) => x.kind !== "package"))
    : [];
  const set = (k: keyof Party) => (v: number) => setParty((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: props.scope,
          checkIn: props.checkIn,
          checkOut: props.checkOut,
          party,
          meal,
          mealGuests,
          packageSlug: isNew && isHouse ? packageSlug : null,
          extras: isNew ? { saunaDays: isHouse ? saunaDays : 0, tubCount } : null,
          name: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
          message: f.get("message"),
          website: f.get("website"),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "A küldés nem sikerült. Kérjük, hívjon minket: +36 70 410-8282");
        setBusy(body.code === "busy");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("A küldés nem sikerült. Kérjük, hívjon minket: +36 70 410-8282");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-bg)] text-2xl text-[var(--accent)]">✓</div>
        <h3 className="mb-2 text-2xl font-semibold text-[var(--text)]">Köszönjük, megkaptuk a kérését!</h3>
        <p className="mx-auto max-w-md text-[var(--text2)]">
          Hamarosan jelentkezünk a visszaigazolással és a foglaló részleteivel. Addig a napok még nincsenek lefoglalva.
        </p>
      </div>
    );
  }

  const problem = quote.problems[0];

  return (
    <form onSubmit={submit} className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-6">
        <fieldset className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3">
          <legend className="px-1 text-[15px] font-semibold text-[var(--text)]">Vendégek</legend>
          <Counter label="Felnőtt (18 év felett)" value={party.adults} min={1} max={max - party.teens - party.children} onChange={set("adults")} />
          <Counter label="Gyerek (13–17 év)" value={party.teens} min={0} max={max - party.adults - party.children} onChange={set("teens")} />
          <Counter label="Gyerek (3–12 év)" hint="kedvezményes" value={party.children} min={0} max={max - party.adults - party.teens} onChange={set("children")} />
          <Counter label="Baba (0–2 év)" hint="ingyenes" value={party.infants} min={0} max={4} onChange={set("infants")} />
        </fieldset>

        {packages.length > 0 && (
          <fieldset>
            <legend className="mb-3 text-[15px] font-semibold text-[var(--text)]">Csomag (nem kötelező)</legend>
            <div className="space-y-2">
              <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${packageSlug == null ? "border-[var(--accent)] bg-[var(--accent-bg)]" : "border-[var(--border)] bg-white"}`}>
                <input type="radio" name="package" checked={packageSlug == null} onChange={() => setPackageSlug(null)} className="mt-1" />
                <span className="text-[15px] text-[var(--text)]">Csomag nélkül</span>
              </label>
              {packages.map((p) => {
                const pq = computeQuote({ ...base, packageSlug: p.slug }, data);
                return (
                  <label key={p.slug} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${packageSlug === p.slug ? "border-[var(--accent)] bg-[var(--accent-bg)]" : "border-[var(--border)] bg-white"}`}>
                    <input type="radio" name="package" checked={packageSlug === p.slug} onChange={() => setPackageSlug(p.slug)} className="mt-1" />
                    <span className="flex-1">
                      <span className="flex flex-wrap justify-between gap-2 text-[15px] font-medium text-[var(--text)]">
                        {p.name}
                        <span className="text-[var(--text2)]">{formatFt(pq.accommodation / Math.max(1, nights))} / éj</span>
                      </span>
                      <span className="block text-[13px] text-[var(--text2)]">{p.includes}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {isNew && (
          <fieldset className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3">
            <legend className="px-1 text-[15px] font-semibold text-[var(--text)]">Extrák</legend>
            {isHouse && (
              <Counter label="Szaunanap" hint={`finn + infra 19:00-ig, ${formatFt(data.settings.saunaDayPrice)}/nap`} value={saunaDays} min={0} max={nights} onChange={setSaunaDays} />
            )}
            <Counter label="Dézsafürdő" hint={`${formatFt(data.settings.tubPrice)}/felfűtés`} value={tubCount} min={0} max={nights * 2} onChange={setTubCount} />
          </fieldset>
        )}

        <fieldset>
          <legend className="mb-3 text-[15px] font-semibold text-[var(--text)]">Étkezés</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["nincs", "reggeli", "vacsora", "felpanzio"] as const).map((m) => (
              <label key={m}
                className={`cursor-pointer rounded-lg border px-3 py-3 text-center text-[14px] transition-colors ${
                  meal === m ? "border-[var(--accent)] bg-[var(--accent-bg)] font-semibold text-[var(--text)]" : "border-[var(--border)] bg-white text-[var(--text2)] hover:border-[var(--text3)]"
                }`}>
                <input type="radio" name="meal" value={m} checked={meal === m} onChange={() => setMeal(m)} className="sr-only" />
                <span className="block">{m === "felpanzio" ? "Félpanzió" : MEAL_LABEL[m]}</span>
                {m !== "nincs" && (
                  <span className="text-[12px] text-[var(--text3)]">
                    {formatFt(m === "reggeli" ? data.settings.breakfastPrice : m === "vacsora" ? data.settings.dinnerPrice : data.settings.halfBoardPrice)}/fő/nap
                  </span>
                )}
              </label>
            ))}
          </div>
          {meal !== "nincs" && (
            <label className="mt-3 flex items-center gap-3 text-[15px] text-[var(--text)]">
              Hány főre?
              <select value={mealGuests} onChange={(e) => setMealGuests(Number(e.target.value))} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2">
                {Array.from({ length: paying + party.infants }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n} fő</option>
                ))}
              </select>
            </label>
          )}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-3 text-[15px] font-semibold text-[var(--text)]">Az Ön adatai</legend>
          <input name="name" required placeholder="Teljes név *" autoComplete="name" className={input} />
          <input name="email" type="email" required placeholder="E-mail cím *" autoComplete="email" className={input} />
          <input name="phone" type="tel" placeholder="Telefonszám" autoComplete="tel" className={input} />
          <textarea name="message" rows={3} placeholder="Megjegyzés (nem kötelező)" className={`${input} resize-none`} />
          {/* Honeypot – ember nem látja, nem tölti ki */}
          <input name="website" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden="true" />
        </fieldset>

        {isNew && (
          <div className="rounded-xl bg-[var(--surface2)] px-5 py-4 text-[13px] leading-relaxed text-[var(--text2)]">
            {!isHouse && (
              <div className="mb-2">
                <p className="mb-1 font-semibold text-[var(--text)]">Helyszínen fizetendő, ha igénybe veszi</p>
                <p>Finn szauna: {formatFt(props.info.finnSauna)}/fő/óra · Közös infraszauna: {formatFt(props.info.infraShared)}/fő/óra</p>
                {props.scope.includes("superior") && <p>Infraszauna a Superior szobában: {formatFt(props.info.superiorInfra)}/óra</p>}
              </div>
            )}
            <p>
              <span className="font-semibold text-[var(--text)]">Ingyenes:</span> sóbarlang {props.info.saltCaveMinutes} perc/fő/nap, kültéri medence (nyáron), kert, grill, bogrács.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-4 lg:sticky lg:top-24">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h3 className="mb-3 text-[15px] font-semibold text-[var(--text)]">Összesítő</h3>
          {quote.total == null && !problem ? (
            <p className="text-[15px] text-[var(--text2)]">Erre az időszakra egyedi árat adunk – küldje el a kérést, visszajelzünk.</p>
          ) : (
            <dl className="space-y-2 text-[15px]">
              {quote.lines.map((l) => (
                <div key={l.label} className="flex justify-between gap-3">
                  <dt className="text-[var(--text2)]">{l.label}</dt>
                  <dd className={`whitespace-nowrap ${l.amount < 0 ? "text-[#3A5A3C]" : "text-[var(--text)]"}`}>{formatFt(l.amount)}</dd>
                </div>
              ))}
              {quote.total != null && (
                <div className="flex justify-between gap-3 border-t border-[var(--border)] pt-2 text-[17px] font-semibold">
                  <dt className="text-[var(--text)]">Összesen</dt>
                  <dd className="whitespace-nowrap text-[var(--text)]">{formatFt(quote.total)}</dd>
                </div>
              )}
              {!quote.ifaIncluded && (
                <div className="flex justify-between gap-3 text-[14px]">
                  <dt className="text-[var(--text2)]">Idegenforgalmi adó – helyszínen fizetendő</dt>
                  <dd className="whitespace-nowrap text-[var(--text2)]">{formatFt(quote.ifa)}</dd>
                </div>
              )}
              {quote.deposit != null && (
                <div className="flex justify-between gap-3 text-[14px]">
                  <dt className="text-[var(--text2)]">Foglaló ({quote.depositPercent}%) – visszaigazolás után</dt>
                  <dd className="whitespace-nowrap text-[var(--text2)]">{formatFt(quote.deposit)}</dd>
                </div>
              )}
            </dl>
          )}
          <p className="mt-3 text-[13px] text-[var(--text3)]">
            Érkezés {props.checkInFrom}–{props.checkInUntil} között, távozás {props.checkOutUntil}-ig.
          </p>
        </div>

        {problem && <div className="rounded-lg bg-[#FFF6DB] px-4 py-3 text-[14px] text-[#7A5B00]">{problemMessage(problem)}</div>}

        {error && (
          <div className="rounded-lg bg-[#FCEBEB] px-4 py-3 text-[14px] text-[#B23B3B]">
            {error}
            {busy && <Link href="/foglalas" className="mt-1 block font-semibold underline">Új keresés</Link>}
          </div>
        )}

        <button
          type="submit"
          disabled={status === "sending" || !!problem}
          className="w-full rounded-full bg-[var(--nav-bg)] py-4 text-[16px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === "sending" ? "Küldés…" : "Foglalási kérés elküldése"}
        </button>
        <p className="text-center text-[13px] text-[var(--text3)]">
          A kérés még nem végleges foglalás – visszaigazoljuk telefonon vagy e-mailben.
        </p>
      </div>
    </form>
  );
}
