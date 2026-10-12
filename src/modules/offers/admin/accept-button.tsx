"use client";

import { useActionState, useState } from "react";
import { adminAcceptOfferAction } from "@/app/admin/(protected)/ajanlatok/actions";

// "Elfogadta" – ha a vendég válaszlevélben vagy telefonon fogadta el.
export function AdminAcceptButton({ id }: { id: number }) {
  const [state, action, pending] = useActionState(adminAcceptOfferAction, {});
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="rounded-md bg-[var(--accent)] px-4 py-2 text-[14px] font-semibold text-white hover:opacity-90">
        Elfogadta
      </button>
    );
  }
  return (
    <form action={action} className="rounded-md border border-[var(--border)] bg-[var(--surface2)] p-3">
      <input type="hidden" name="id" value={id} />
      <p className="mb-2 text-[14px] text-[var(--text)]">
        A napok lezárulnak, létrejön a foglalás (előlegre vár), és a vendég megkapja az utalási adatokat.
      </p>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-md bg-[var(--accent)] px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50">
          {pending ? "Mentés…" : "Igen, elfogadta"}
        </button>
        <button type="button" onClick={() => setAsking(false)} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[14px]">
          Mégse
        </button>
      </div>
      {state.error && <p className="mt-2 text-[13px] text-[#B23B3B]">{state.error}</p>}
    </form>
  );
}
