"use client";

import { useActionState, useState } from "react";
import { ROOM_SCOPES, SCOPE_LABEL, normalizeTarget, type RoomScope } from "@/lib/booking/constants";
import { createOfferAction } from "@/app/admin/(protected)/ajanlatok/actions";
import { submitKeepingValues } from "@/app/admin/(protected)/submit-keep";

const input =
  "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const label = "mb-1 block text-[13px] font-medium text-[var(--text2)]";

function NumberSelect({ name, text, min, max, def }: { name: string; text: string; min: number; max: number; def: number }) {
  return (
    <label className="block">
      <span className={label}>{text}</span>
      <select name={name} defaultValue={def} className={input}>
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
    </label>
  );
}

// Új ajánlat telefonos vagy e-mailes kérésből. A tervezet (szabad egység, tételek)
// mentés után automatikusan elkészül, a szerkesztőben finomítható.
export function NewOfferForm() {
  const [state, action, pending] = useActionState(createOfferAction, {});
  const [wholeHouse, setWholeHouse] = useState(true);
  const [rooms, setRooms] = useState<RoomScope[]>([]);
  const target = wholeHouse ? "egesz_haz" : normalizeTarget(rooms.join(","));

  function toggleRoom(r: RoomScope) {
    setWholeHouse(false);
    setRooms((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));
  }

  return (
    <form onSubmit={submitKeepingValues(action)} className="space-y-5 rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block sm:col-span-3">
          <span className={label}>Vendég neve *</span>
          <input name="name" required className={input} autoFocus />
        </label>
        <label className="block">
          <span className={label}>E-mail</span>
          <input name="email" type="email" className={input} />
        </label>
        <label className="block">
          <span className={label}>Telefon</span>
          <input name="phone" type="tel" className={input} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Érkezés *</span>
          <input name="checkIn" type="date" required className={input} />
        </label>
        <label className="block">
          <span className={label}>Távozás *</span>
          <input name="checkOut" type="date" required className={input} />
        </label>
      </div>

      <fieldset>
        <legend className={label}>Mit kér? *</legend>
        <input type="hidden" name="scope" value={target ?? ""} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={wholeHouse}
            onClick={() => { setWholeHouse(true); setRooms([]); }}
            className={`rounded-md border px-3 py-2 text-[14px] ${wholeHouse ? "border-[var(--accent)] bg-[var(--accent-bg)] font-semibold text-[var(--text)]" : "border-[var(--border)] text-[var(--text2)]"}`}
          >
            {wholeHouse ? "✓ " : ""}Egész ház
          </button>
          {ROOM_SCOPES.map((r) => {
            const on = !wholeHouse && rooms.includes(r);
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                onClick={() => toggleRoom(r)}
                className={`rounded-md border px-3 py-2 text-[14px] ${on ? "border-[var(--accent)] bg-[var(--accent-bg)] font-semibold text-[var(--text)]" : "border-[var(--border)] text-[var(--text2)]"}`}
              >
                {on ? "✓ " : ""}{SCOPE_LABEL[r]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-4">
        <NumberSelect name="adults" text="Felnőtt (18 év felett)" min={1} max={12} def={2} />
        <NumberSelect name="teens" text="Gyerek (13–17 év)" min={0} max={11} def={0} />
        <NumberSelect name="children" text="Gyerek (3–12 év)" min={0} max={11} def={0} />
        <NumberSelect name="infants" text="Baba (0–2 év)" min={0} max={6} def={0} />
      </div>

      <label className="block">
        <span className={label}>Megjegyzés (nem kötelező)</span>
        <textarea name="message" rows={3} className={`${input} resize-y`} />
      </label>

      {state.error && <p className="rounded-md bg-[#FCEBEB] px-3 py-2 text-[14px] text-[#B23B3B]">{state.error}</p>}
      <button type="submit" disabled={pending} className="rounded-md bg-[var(--nav-bg)] px-5 py-2.5 text-[15px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
        {pending ? "Tervezet készül…" : "Tovább az ajánlathoz"}
      </button>
    </form>
  );
}
