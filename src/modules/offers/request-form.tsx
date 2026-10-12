"use client";

// Weboldalas ajánlatkérő űrlap – ugyanazok a mezők, mint a foglalásnál (időpont,
// vendégbontás, szállás, csomag, extrák, étkezés, elérhetőség). Árat nem mutat: az
// ajánlatot a tulajdonos küldi, a közös árazómotor alapján.

import { useState } from "react";
import { MEAL_LABEL, ROOM_SCOPES, SCOPE_LABEL, formatFt, normalizeTarget, type Meal, type RoomScope } from "@/lib/booking/constants";
import { diffDays } from "@/lib/booking/dates";
import type { Party } from "@/lib/booking/quote";

const input =
  "w-full rounded-lg border border-[var(--border)] bg-white px-4 py-3 text-[16px] text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const legend = "mb-3 text-[15px] font-semibold text-[var(--text)]";

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

export interface RequestFormProps {
  minDate: string;
  checkIn?: string;
  checkOut?: string;
  party: Party;
  packages: { slug: string; name: string; includes: string }[];
  saunaDayPrice: number;
  tubPrice: number;
  mealPrices: Record<Exclude<Meal, "nincs">, number>;
  phone: string;
}

export function OfferRequestForm(props: RequestFormProps) {
  const [checkIn, setCheckIn] = useState(props.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(props.checkOut ?? "");
  const [party, setParty] = useState<Party>(props.party);
  const paying = party.adults + party.teens + party.children;
  const [wholeHouse, setWholeHouse] = useState(paying > 4);
  const [rooms, setRooms] = useState<RoomScope[]>([]);
  const [packageSlug, setPackageSlug] = useState<string | null>(null);
  const [saunaDays, setSaunaDays] = useState(0);
  const [tubCount, setTubCount] = useState(0);
  const [meal, setMeal] = useState<Meal>("nincs");
  const [mealGuests, setMealGuests] = useState(paying);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const scope = wholeHouse ? "egesz_haz" : normalizeTarget(rooms.join(","));
  const nights = checkIn && checkOut && checkOut > checkIn ? diffDays(checkIn, checkOut) : 0;
  const set = (k: keyof Party) => (v: number) => setParty((p) => ({ ...p, [k]: v }));

  function toggleRoom(r: RoomScope) {
    setWholeHouse(false);
    setPackageSlug(null);
    setSaunaDays(0);
    setRooms((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!scope) {
      setError("Válassza ki, hol szállna meg: egész ház vagy szoba.");
      setStatus("error");
      return;
    }
    const f = new FormData(e.currentTarget);
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/offer-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkIn,
          checkOut,
          party,
          scope,
          packageSlug: wholeHouse ? packageSlug : null,
          extras: { saunaDays: wholeHouse ? saunaDays : 0, tubCount },
          meal,
          mealGuests,
          name: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
          message: f.get("message"),
          website: f.get("website"),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? `A küldés nem sikerült. Kérjük, hívjon minket: ${props.phone}`);
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError(`A küldés nem sikerült. Kérjük, hívjon minket: ${props.phone}`);
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-bg)] text-2xl text-[var(--accent)]">✓</div>
        <h3 className="mb-2 text-2xl font-semibold text-[var(--text)]">Köszönjük, megkaptuk a kérését!</h3>
        <p className="mx-auto max-w-md text-[var(--text2)]">Hamarosan elküldjük személyre szabott ajánlatunkat e-mailben.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-6">
      <fieldset>
        <legend className={legend}>Mikor érkeznének?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[13px] text-[var(--text2)]">Érkezés</span>
            <input type="date" required min={props.minDate} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] text-[var(--text2)]">Távozás</span>
            <input type="date" required min={checkIn || props.minDate} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={input} />
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3">
        <legend className="px-1 text-[15px] font-semibold text-[var(--text)]">Vendégek</legend>
        <Counter label="Felnőtt (18 év felett)" value={party.adults} min={1} max={12 - party.teens - party.children} onChange={set("adults")} />
        <Counter label="Gyerek (13–17 év)" value={party.teens} min={0} max={12 - party.adults - party.children} onChange={set("teens")} />
        <Counter label="Gyerek (3–12 év)" hint="kedvezményes" value={party.children} min={0} max={12 - party.adults - party.teens} onChange={set("children")} />
        <Counter label="Baba (0–2 év)" hint="ingyenes" value={party.infants} min={0} max={4} onChange={set("infants")} />
      </fieldset>

      <fieldset>
        <legend className={legend}>Hol szállnának meg?</legend>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={wholeHouse}
            onClick={() => { setWholeHouse(true); setRooms([]); }}
            className={`rounded-lg border px-4 py-3 text-[15px] ${wholeHouse ? "border-[var(--accent)] bg-[var(--accent-bg)] font-semibold text-[var(--text)]" : "border-[var(--border)] bg-white text-[var(--text2)]"}`}
          >
            {wholeHouse ? "✓ " : ""}Egész ház (legfeljebb 12 fő)
          </button>
          {ROOM_SCOPES.map((r) => {
            const on = !wholeHouse && rooms.includes(r);
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                onClick={() => toggleRoom(r)}
                className={`rounded-lg border px-4 py-3 text-[15px] ${on ? "border-[var(--accent)] bg-[var(--accent-bg)] font-semibold text-[var(--text)]" : "border-[var(--border)] bg-white text-[var(--text2)]"}`}
              >
                {on ? "✓ " : ""}{SCOPE_LABEL[r]}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[13px] text-[var(--text3)]">Több szoba is választható. Ha a kért szállás nem szabad, a legjobb szabad lehetőséget ajánljuk.</p>
      </fieldset>

      {wholeHouse && props.packages.length > 0 && (
        <fieldset>
          <legend className={legend}>Csomag (nem kötelező)</legend>
          <div className="space-y-2">
            <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${packageSlug == null ? "border-[var(--accent)] bg-[var(--accent-bg)]" : "border-[var(--border)] bg-white"}`}>
              <input type="radio" name="package" checked={packageSlug == null} onChange={() => setPackageSlug(null)} className="mt-1" />
              <span className="text-[15px] text-[var(--text)]">Csomag nélkül</span>
            </label>
            {props.packages.map((p) => (
              <label key={p.slug} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${packageSlug === p.slug ? "border-[var(--accent)] bg-[var(--accent-bg)]" : "border-[var(--border)] bg-white"}`}>
                <input type="radio" name="package" checked={packageSlug === p.slug} onChange={() => setPackageSlug(p.slug)} className="mt-1" />
                <span>
                  <span className="block text-[15px] font-medium text-[var(--text)]">{p.name}</span>
                  <span className="block text-[13px] text-[var(--text2)]">{p.includes}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3">
        <legend className="px-1 text-[15px] font-semibold text-[var(--text)]">Extrák</legend>
        {wholeHouse && (
          <Counter label="Szaunanap" hint={`finn + infra 19:00-ig, ${formatFt(props.saunaDayPrice)}/nap`} value={saunaDays} min={0} max={Math.max(nights, 1)} onChange={setSaunaDays} />
        )}
        <Counter label="Dézsafürdő" hint={`${formatFt(props.tubPrice)}/felfűtés`} value={tubCount} min={0} max={Math.max(nights * 2, 2)} onChange={setTubCount} />
      </fieldset>

      <fieldset>
        <legend className={legend}>Étkezés</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(["nincs", "reggeli", "vacsora", "felpanzio"] as const).map((m) => (
            <label key={m}
              className={`cursor-pointer rounded-lg border px-3 py-3 text-center text-[14px] ${meal === m ? "border-[var(--accent)] bg-[var(--accent-bg)] font-semibold text-[var(--text)]" : "border-[var(--border)] bg-white text-[var(--text2)]"}`}>
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
              {Array.from({ length: paying + party.infants }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n} fő</option>
              ))}
            </select>
          </label>
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={legend}>Az Ön adatai</legend>
        <input name="name" required placeholder="Teljes név *" autoComplete="name" className={input} />
        <input name="email" type="email" required placeholder="E-mail cím *" autoComplete="email" className={input} />
        <input name="phone" type="tel" placeholder="Telefonszám" autoComplete="tel" className={input} />
        <textarea name="message" rows={3} placeholder="Üzenet, kérés (nem kötelező)" className={`${input} resize-none`} />
        {/* Honeypot – ember nem látja, nem tölti ki */}
        <input name="website" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden="true" />
      </fieldset>

      {error && <div className="rounded-lg bg-[#FCEBEB] px-4 py-3 text-[14px] text-[#B23B3B]">{error}</div>}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-full bg-[var(--nav-bg)] py-4 text-[16px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === "sending" ? "Küldés…" : "Ajánlatot kérek"}
      </button>
      <p className="text-center text-[13px] text-[var(--text3)]">Az ajánlatkérés nem kötelez semmire. Az ajánlatot e-mailben küldjük.</p>
    </form>
  );
}
