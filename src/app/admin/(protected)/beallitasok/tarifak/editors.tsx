"use client";

import { useActionState } from "react";
import { SCOPE_LABEL, type Scope } from "@/lib/booking/constants";
import { submitKeepingValues } from "../../submit-keep";
import { reapplyTariffAction, savePackageAction, saveTariffAction } from "./actions";

const input =
  "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[14px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const label = "mb-1 block text-[12px] font-medium text-[var(--text2)]";

const ROWS: { scope: Scope; guests: number[]; labels?: string[] }[] = [
  { scope: "egesz_haz", guests: [8, 9, 10, 11, 12], labels: ["1–8 fő", "9 fő", "10 fő", "11 fő", "12 fő"] },
  { scope: "szoba-1", guests: [1, 2, 3] },
  { scope: "szoba-2", guests: [1, 2, 3] },
  { scope: "superior", guests: [1, 2, 3, 4] },
];

export interface TariffEditorProps {
  code: string;
  name: string;
  color: string;
  minNights: number;
  roomMode: string;
  releaseDays: number | null;
  prices: Record<string, number>; // `${scope}|${guests}`
}

export function TariffEditor(t: TariffEditorProps) {
  const [state, action, pending] = useActionState(saveTariffAction, {});
  const [reState, reAction, rePending] = useActionState(reapplyTariffAction, {});

  return (
    <section className="rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5">
      <form onSubmit={submitKeepingValues(action)} className="space-y-4">
        <input type="hidden" name="code" value={t.code} />
        <div className="flex flex-wrap items-end gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[16px] font-bold text-[var(--text)]" style={{ backgroundColor: t.color }}>
            {t.code}
          </span>
          <label className="min-w-56 flex-1">
            <span className={label}>Név</span>
            <input name="name" defaultValue={t.name} className={input} />
          </label>
          <label className="w-28">
            <span className={label}>Min. éjszaka</span>
            <input name="minNights" type="number" min={1} defaultValue={t.minNights} className={input} />
          </label>
          <label className="w-56">
            <span className={label}>Szobák</span>
            <select name="roomMode" defaultValue={t.roomMode} className={input}>
              <option value="open">foglalhatók</option>
              <option value="release">előtte nyílnak, ha a ház szabad</option>
              <option value="never">soha (csak egész ház)</option>
            </select>
          </label>
          <label className="w-36">
            <span className={label}>Nyílás (nap előtte)</span>
            <input name="releaseDays" type="number" min={0} defaultValue={t.releaseDays ?? ""} className={input} />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="text-[14px]">
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.scope}>
                  <th className="whitespace-nowrap py-1 pr-4 text-left font-normal text-[var(--text2)]">{SCOPE_LABEL[r.scope]}</th>
                  {r.guests.map((g, i) => (
                    <td key={g} className="py-1 pr-2">
                      <label>
                        <span className="block text-[11px] text-[var(--text3)]">{r.labels?.[i] ?? `${g} fő`}</span>
                        <input name={`price:${r.scope}:${g}`} inputMode="numeric" defaultValue={t.prices[`${r.scope}|${g}`] ?? ""} className={`${input} w-24`} />
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {state.error && <p className="rounded-md bg-[#FCEBEB] px-3 py-2 text-[14px] text-[#B23B3B]">{state.error}</p>}
        <button type="submit" disabled={pending} className="rounded-md bg-[var(--nav-bg)] px-4 py-2 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
          {pending ? "Mentés…" : "Mentés"}
        </button>
      </form>

      {state.askReapply && !reState.ok && (
        <form onSubmit={submitKeepingValues(reAction)} className="mt-4 rounded-md border border-[#F0D98A] bg-[#FFF6DB] p-3">
          <input type="hidden" name="code" value={t.code} />
          <p className="mb-2 text-[14px] font-medium text-[var(--text)]">
            Elmentve. Frissítsem az árat minden „{t.code}” tarifás jövőbeli napon?
          </p>
          <p className="mb-3 text-[13px] text-[var(--text2)]">A meglévő foglalások összege nem változik.</p>
          <button type="submit" disabled={rePending} className="rounded-md bg-[var(--accent)] px-4 py-2 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
            {rePending ? "Frissítés…" : "Igen, frissítsd"}
          </button>
        </form>
      )}
      {reState.message && <p className="mt-3 rounded-md bg-[var(--accent-bg)] px-3 py-2 text-[14px] text-[#3A5A3C]">{reState.message}</p>}
    </section>
  );
}

export interface PackageEditorProps {
  slug: string;
  name: string;
  includes: string;
  priceLow: number;
  priceHigh: number | null;
  maxGuests: number;
  months: string | null;
  active: boolean;
}

export function PackageEditor(p: PackageEditorProps) {
  const [state, action, pending] = useActionState(savePackageAction, {});
  return (
    <form onSubmit={submitKeepingValues(action)} className="space-y-3 rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5">
      <input type="hidden" name="slug" value={p.slug} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className={label}>Név</span>
          <input name="name" defaultValue={p.name} className={input} />
        </label>
        <label className="flex items-end gap-2 text-[14px] text-[var(--text)]">
          <input type="checkbox" name="active" defaultChecked={p.active} /> Választható a weboldalon
        </label>
      </div>
      <label className="block">
        <span className={label}>Mit tartalmaz</span>
        <textarea name="includes" rows={2} defaultValue={p.includes} className={input} />
      </label>
      <div className="grid gap-3 sm:grid-cols-4">
        <label>
          <span className={label}>Ár / éj – holtszezon, tavasz, ősz</span>
          <input name="priceLow" inputMode="numeric" defaultValue={p.priceLow} className={input} />
        </label>
        <label>
          <span className={label}>Ár / éj – nyár, ünnep (üres: nem választható)</span>
          <input name="priceHigh" inputMode="numeric" defaultValue={p.priceHigh ?? ""} className={input} />
        </label>
        <label>
          <span className={label}>Legfeljebb (fő)</span>
          <input name="maxGuests" type="number" min={1} max={12} defaultValue={p.maxGuests} className={input} />
        </label>
        <label>
          <span className={label}>Csak ezekben a hónapokban</span>
          <input name="months" placeholder="pl. 11,12,1,2,3" defaultValue={p.months ?? ""} className={input} />
        </label>
      </div>
      {state.error && <p className="rounded-md bg-[#FCEBEB] px-3 py-2 text-[14px] text-[#B23B3B]">{state.error}</p>}
      {state.ok && <p className="rounded-md bg-[var(--accent-bg)] px-3 py-2 text-[14px] text-[#3A5A3C]">Elmentve.</p>}
      <button type="submit" disabled={pending} className="rounded-md bg-[var(--nav-bg)] px-4 py-2 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
        {pending ? "Mentés…" : "Mentés"}
      </button>
    </form>
  );
}
