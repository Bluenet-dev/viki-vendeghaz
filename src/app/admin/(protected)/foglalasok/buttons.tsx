"use client";

import { useActionState, useState } from "react";
import {
  cancelBookingAction,
  confirmBookingAction,
  resendConfirmationAction,
  type ActionState,
} from "./actions";

const primary =
  "rounded-md bg-[var(--accent)] px-4 py-2 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50";
const secondary =
  "rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[14px] text-[var(--text)] transition-colors hover:border-[var(--text3)] disabled:opacity-50";

function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p className="mt-2 text-[13px] text-[#B23B3B]">{state.error}</p>;
  if (state.warning) return <p className="mt-2 text-[13px] text-[#7A5B00]">{state.warning}</p>;
  return null;
}

export function ConfirmButton({ id, compact }: { id: number; compact?: boolean }) {
  const [state, action, pending] = useActionState(confirmBookingAction, {});

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className={compact ? primary.replace("px-4 py-2", "px-3 py-1.5") : primary}>
        {pending ? "Visszaigazolás…" : "Visszaigazolom"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function ResendButton({ id }: { id: number }) {
  const [state, action, pending] = useActionState(resendConfirmationAction, {});
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className={secondary}>
        {pending ? "Küldés…" : "Visszaigazoló levél újraküldése"}
      </button>
      {state.ok && <p className="mt-2 text-[13px] text-[#3A5A3C]">A levél elment.</p>}
      <Feedback state={state} />
    </form>
  );
}

// Előleg nélküli foglalás napjainak felszabadítása (a foglalás lemondottra vált).
export function ReleaseButton({ id }: { id: number }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={secondary.replace("px-4 py-2", "px-3 py-1.5")}>
        Felszabadítom a napokat
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13px] text-[var(--text2)]">A foglalás lemondottra vált.</span>
      <form action={cancelBookingAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="release" value="igen" />
        <button type="submit" className={primary.replace("px-4 py-2", "px-3 py-1.5")}>Igen, felszabadítom</button>
      </form>
      <button type="button" onClick={() => setAsking(false)} className="text-[13px] text-[var(--text2)] hover:underline">
        Mégse
      </button>
    </div>
  );
}

export function CancelButton({ id, hasClosedDays }: { id: number; hasClosedDays: boolean }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={`${secondary} text-[#B23B3B]`}>
        Lemondás
      </button>
    );
  }
  return (
    <div className="rounded-md border border-[#F09595] bg-[#FCEBEB] p-3">
      {hasClosedDays ? (
        <>
          <p className="mb-2 text-[14px] font-medium text-[var(--text)]">Felszabadítsam a napokat?</p>
          <div className="flex flex-wrap gap-2">
            <form action={cancelBookingAction}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="release" value="igen" />
              <button type="submit" className={primary}>Igen, újra foglalhatók</button>
            </form>
            <form action={cancelBookingAction}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="release" value="nem" />
              <button type="submit" className={secondary}>Nem, maradjanak lezárva</button>
            </form>
            <button type="button" onClick={() => setAsking(false)} className="px-2 text-[14px] text-[var(--text2)] hover:underline">
              Mégse
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mb-2 text-[14px] font-medium text-[var(--text)]">Biztosan lemondja?</p>
          <div className="flex gap-2">
            <form action={cancelBookingAction}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="release" value="igen" />
              <button type="submit" className={primary}>Igen, lemondom</button>
            </form>
            <button type="button" onClick={() => setAsking(false)} className={secondary}>Mégse</button>
          </div>
        </>
      )}
    </div>
  );
}
