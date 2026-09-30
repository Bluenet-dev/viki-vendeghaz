"use client";

import { useActionState, useState } from "react";
import { ALL_SCOPES, SCOPE_LABEL } from "@/lib/booking/constants";
import { bulkFillAction } from "./actions";

const input =
  "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const label = "mb-1 block text-[13px] font-medium text-[var(--text2)]";

export function BulkFillButton({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(bulkFillAction, {});

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[14px] font-medium text-[var(--text)] hover:border-[var(--text3)]"
      >
        Tömeges kitöltés
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 pt-16" onClick={() => setOpen(false)}>
      <form
        action={action}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg space-y-4 rounded-[12px] bg-[var(--surface)] p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-[var(--text)]">Tömeges kitöltés</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Bezárás" className="text-[22px] leading-none text-[var(--text3)] hover:text-[var(--text)]">
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="from">Dátumtól</label>
            <input id="from" name="from" type="date" required defaultValue={defaultFrom} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="to">Dátumig</label>
            <input id="to" name="to" type="date" required defaultValue={defaultTo} className={input} />
          </div>
        </div>

        <div>
          <label className={label} htmlFor="scope">Szoba</label>
          <select id="scope" name="scope" defaultValue="mind" className={input}>
            <option value="mind">Mind</option>
            {ALL_SCOPES.map((s) => (
              <option key={s} value={s}>{SCOPE_LABEL[s]}</option>
            ))}
          </select>
        </div>

        <p className="text-[13px] text-[var(--text2)]">Csak a kitöltött mezők változnak, a többi marad a régi.</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="price">Ár / éj (Ft)</label>
            <input id="price" name="price" inputMode="numeric" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="extraPersonPrice">Pótágy / fő (Ft)</label>
            <input id="extraPersonPrice" name="extraPersonPrice" inputMode="numeric" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="minNights">Min. éjszaka</label>
            <input id="minNights" name="minNights" type="number" min={1} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="wholeHouseOnly">Csak egész ház</label>
            <select id="wholeHouseOnly" name="wholeHouseOnly" defaultValue="" className={input}>
              <option value="">Nem változik</option>
              <option value="igen">Igen</option>
              <option value="nem">Nem</option>
            </select>
          </div>
        </div>

        <div>
          <label className={label} htmlFor="closure">Szabad / foglalt</label>
          <select id="closure" name="closure" defaultValue="" className={input}>
            <option value="">Nem változik</option>
            <option value="close">Lezárás</option>
            <option value="open">Feloldás</option>
          </select>
        </div>

        {state.error && <p className="rounded-md bg-[#FCEBEB] px-3 py-2 text-[14px] text-[#B23B3B]">{state.error}</p>}
        {state.ok && <p className="rounded-md bg-[var(--accent-bg)] px-3 py-2 text-[14px] text-[#3A5A3C]">{state.message}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="rounded-md px-4 py-2 text-[14px] text-[var(--text2)] hover:text-[var(--text)]">
            Bezárás
          </button>
          <button type="submit" disabled={pending} className="rounded-md bg-[var(--nav-bg)] px-5 py-2 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
            {pending ? "Mentés…" : "Kitöltés"}
          </button>
        </div>
      </form>
    </div>
  );
}
