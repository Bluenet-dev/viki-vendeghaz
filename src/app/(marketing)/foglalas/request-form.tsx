"use client";

import Link from "next/link";
import { useState } from "react";
import { MEAL_LABEL, formatFt, type Meal, type Scope } from "@/lib/booking/constants";

type Line = { label: string; amount: number };

const input =
  "w-full rounded-lg border border-[var(--border)] bg-white px-4 py-3 text-[16px] text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

export function RequestForm(props: {
  scope: Scope;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  lines: Line[];
  accommodation: number | null;
  ifa: number;
  depositPercent: number;
  mealPrices: Record<Exclude<Meal, "nincs">, number>;
  checkInFrom: string;
  checkOutUntil: string;
}) {
  const { guests, nights } = props;
  const [meal, setMeal] = useState<Meal>("nincs");
  const [mealGuests, setMealGuests] = useState(guests);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mealAmount = meal === "nincs" ? 0 : props.mealPrices[meal] * mealGuests * nights;
  const total = props.accommodation != null ? props.accommodation + mealAmount : null;
  const deposit = total != null ? Math.round((total * props.depositPercent) / 100) : null;

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
          guests,
          meal,
          mealGuests,
          name: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
          message: f.get("message"),
          website: f.get("website"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "A küldés nem sikerült. Kérjük, hívjon minket: +36 70 410-8282");
        setBusy(data.code === "busy");
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
          Hamarosan jelentkezünk a visszaigazolással és az előleg részleteivel. Addig a napok még nincsenek lefoglalva.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-6">
        <fieldset>
          <legend className="mb-3 text-[15px] font-semibold text-[var(--text)]">Étkezés</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["nincs", "reggeli", "vacsora", "felpanzio"] as const).map((m) => (
              <label
                key={m}
                className={`cursor-pointer rounded-lg border px-3 py-3 text-center text-[14px] transition-colors ${
                  meal === m ? "border-[var(--accent)] bg-[var(--accent-bg)] font-semibold text-[var(--text)]" : "border-[var(--border)] bg-white text-[var(--text2)] hover:border-[var(--text3)]"
                }`}
              >
                <input type="radio" name="meal" value={m} checked={meal === m} onChange={() => setMeal(m)} className="sr-only" />
                <span className="block">{m === "felpanzio" ? "Félpanzió" : MEAL_LABEL[m]}</span>
                {m !== "nincs" && <span className="text-[12px] text-[var(--text3)]">{formatFt(props.mealPrices[m])}/fő/nap</span>}
              </label>
            ))}
          </div>
          {meal !== "nincs" && (
            <label className="mt-3 flex items-center gap-3 text-[15px] text-[var(--text)]">
              Hány főre?
              <select value={mealGuests} onChange={(e) => setMealGuests(Number(e.target.value))} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2">
                {Array.from({ length: guests }, (_, i) => i + 1).map((n) => (
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
      </div>

      <div className="space-y-4 lg:sticky lg:top-24">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h3 className="mb-3 text-[15px] font-semibold text-[var(--text)]">Összesítő</h3>
          <dl className="space-y-2 text-[15px]">
            {props.accommodation == null ? (
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--text2)]">Szállás – {nights} éj</dt>
                <dd className="text-right text-[var(--text)]">egyedi ár</dd>
              </div>
            ) : (
              props.lines.map((l) => (
                <div key={l.label} className="flex justify-between gap-3">
                  <dt className="text-[var(--text2)]">{l.label}</dt>
                  <dd className="whitespace-nowrap text-[var(--text)]">{formatFt(l.amount)}</dd>
                </div>
              ))
            )}
            {mealAmount > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--text2)]">Étkezés – {mealGuests} fő × {nights} nap</dt>
                <dd className="whitespace-nowrap text-[var(--text)]">{formatFt(mealAmount)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3 border-t border-[var(--border)] pt-2 text-[17px] font-semibold">
              <dt className="text-[var(--text)]">Összesen</dt>
              <dd className="whitespace-nowrap text-[var(--text)]">{total != null ? formatFt(total) : "visszajelzünk"}</dd>
            </div>
            <div className="flex justify-between gap-3 text-[14px]">
              <dt className="text-[var(--text2)]">Idegenforgalmi adó – helyszínen fizetendő</dt>
              <dd className="whitespace-nowrap text-[var(--text2)]">{formatFt(props.ifa)}</dd>
            </div>
            {deposit != null && (
              <div className="flex justify-between gap-3 text-[14px]">
                <dt className="text-[var(--text2)]">Előleg ({props.depositPercent}%) – visszaigazolás után</dt>
                <dd className="whitespace-nowrap text-[var(--text2)]">{formatFt(deposit)}</dd>
              </div>
            )}
          </dl>
          <p className="mt-3 text-[13px] text-[var(--text3)]">
            Érkezés {props.checkInFrom}-tól, távozás {props.checkOutUntil}-ig.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-[#FCEBEB] px-4 py-3 text-[14px] text-[#B23B3B]">
            {error}
            {busy && (
              <Link href="/foglalas" className="mt-1 block font-semibold underline">Új keresés</Link>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={status === "sending"}
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
