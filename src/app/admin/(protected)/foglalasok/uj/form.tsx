"use client";

import { useActionState, useState } from "react";
import { MEALS, MEAL_LABEL, ROOM_SCOPES, SCOPE_LABEL, SOURCES, SOURCE_LABEL, normalizeTarget, targetMaxGuests, targetRooms, type RoomScope } from "@/lib/booking/constants";
import { createBookingAction } from "../actions";
import { submitKeepingValues } from "../../submit-keep";

const input =
  "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const label = "mb-1 block text-[13px] font-medium text-[var(--text2)]";

export function NewBookingForm({ defaults }: { defaults: { checkIn?: string; scope?: string } }) {
  const [state, action, pending] = useActionState(createBookingAction, {});
  // Kijelölés: egy vagy több szoba, vagy az egész ház.
  const initial = normalizeTarget(defaults.scope) ?? "szoba-1";
  const [wholeHouse, setWholeHouse] = useState(initial === "egesz_haz");
  const [rooms, setRooms] = useState<RoomScope[]>(initial === "egesz_haz" ? [] : targetRooms(initial));
  const target = wholeHouse ? "egesz_haz" : normalizeTarget(rooms.join(","));
  const max = target ? targetMaxGuests(target) : 0;

  function toggleRoom(r: RoomScope) {
    setWholeHouse(false);
    setRooms((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));
  }
  const [meal, setMeal] = useState("nincs");

  return (
    <form onSubmit={submitKeepingValues(action)} className="space-y-5 rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5">
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
        <fieldset>
          <legend className={label}>Szoba * (több is választható)</legend>
          <input type="hidden" name="scope" value={target ?? ""} />
          <div className="flex flex-wrap gap-2">
            {ROOM_SCOPES.map((r) => {
              const on = !wholeHouse && rooms.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleRoom(r)}
                  className={`rounded-md border px-3 py-2 text-[14px] ${on ? "border-[var(--accent)] bg-[var(--accent-bg)] font-semibold text-[var(--text)]" : "border-[var(--border)] text-[var(--text2)] hover:border-[var(--text3)]"}`}
                >
                  {on ? "✓ " : ""}{SCOPE_LABEL[r]}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={wholeHouse}
              onClick={() => { setWholeHouse(true); setRooms([]); }}
              className={`rounded-md border px-3 py-2 text-[14px] ${wholeHouse ? "border-[var(--accent)] bg-[var(--accent-bg)] font-semibold text-[var(--text)]" : "border-[var(--border)] text-[var(--text2)] hover:border-[var(--text3)]"}`}
            >
              {wholeHouse ? "✓ " : ""}Egész ház
            </button>
          </div>
        </fieldset>
        <div>
          <label className={label} htmlFor="guests">Létszám *{max ? ` (legfeljebb ${max} fő)` : ""}</label>
          <input id="guests" name="guests" type="number" min={1} max={max || undefined} required defaultValue={2} className={input} />
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
