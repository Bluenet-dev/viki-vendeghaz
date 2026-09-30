"use client";

import { useActionState, useState } from "react";
import { ALL_SCOPES, MAX_GUESTS, MEALS, MEAL_LABEL, SCOPE_LABEL, SOURCES, SOURCE_LABEL, type Scope } from "@/lib/booking/constants";
import { createBookingAction } from "../actions";

const input =
  "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const label = "mb-1 block text-[13px] font-medium text-[var(--text2)]";

export function NewBookingForm({ defaults }: { defaults: { checkIn?: string; scope?: string } }) {
  const [state, action, pending] = useActionState(createBookingAction, {});
  const [scope, setScope] = useState<Scope>((defaults.scope as Scope) ?? "szoba-1");
  const [meal, setMeal] = useState("nincs");

  return (
    <form action={action} className="space-y-5 rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5">
      <div>
        <label className={label} htmlFor="name">Vendég neve *</label>
        <input id="name" name="name" required className={input} autoFocus />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="checkIn">Érkezés *</label>
          <input id="checkIn" name="checkIn" type="date" required defaultValue={defaults.checkIn} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="checkOut">Távozás *</label>
          <input id="checkOut" name="checkOut" type="date" required className={input} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="scope">Szoba *</label>
          <select id="scope" name="scope" value={scope} onChange={(e) => setScope(e.target.value as Scope)} className={input}>
            {ALL_SCOPES.map((s) => (
              <option key={s} value={s}>{SCOPE_LABEL[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="guests">Létszám * (legfeljebb {MAX_GUESTS[scope]} fő)</label>
          <input id="guests" name="guests" type="number" min={1} max={MAX_GUESTS[scope]} required defaultValue={2} className={input} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="source">Honnan jött?</label>
          <select id="source" name="source" defaultValue="telefon" className={input}>
            {SOURCES.filter((s) => s !== "ajanlat").map((s) => (
              <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="total">Összeg (Ft)</label>
          <input id="total" name="total" inputMode="numeric" placeholder="Üresen hagyva a naptár árai alapján" className={input} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="phone">Telefon</label>
          <input id="phone" name="phone" type="tel" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" className={input} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="meal">Étkezés</label>
          <select id="meal" name="meal" value={meal} onChange={(e) => setMeal(e.target.value)} className={input}>
            {MEALS.map((m) => (
              <option key={m} value={m}>{MEAL_LABEL[m]}</option>
            ))}
          </select>
        </div>
        {meal !== "nincs" && (
          <div>
            <label className={label} htmlFor="mealGuests">Hány főre kér étkezést?</label>
            <input id="mealGuests" name="mealGuests" type="number" min={1} defaultValue={2} className={input} />
          </div>
        )}
      </div>

      <div>
        <label className={label} htmlFor="note">Megjegyzés</label>
        <textarea id="note" name="note" rows={3} className={input} />
      </div>

      {state.error && (
        <p className="rounded-md border border-[#F09595] bg-[#FCEBEB] px-3 py-2 text-[14px] text-[#B23B3B]">{state.error}</p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[var(--nav-bg)] px-5 py-2.5 text-[15px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Mentés…" : "Foglalás mentése"}
        </button>
        <span className="text-[13px] text-[var(--text2)]">Mentéskor a napok automatikusan lezáródnak a naptárban</span>
      </div>
    </form>
  );
}
