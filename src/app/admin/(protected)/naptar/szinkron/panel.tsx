"use client";

import { useActionState, useState, useTransition } from "react";
import { regenerateTokenAction, saveFeedAction, syncNowAction, type FeedFormState } from "./actions";
import type { UiPlatform } from "@/lib/ical/types";

export interface FeedView {
  id: number;
  importUrl: string;
  lastSuccess: string | null;
  lastError: string | null;
  failCount: number;
}

const input =
  "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const btn =
  "shrink-0 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--bg)] disabled:opacity-50";
const btnPrimary = "shrink-0 rounded-md bg-[var(--accent)] px-3 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50";

const GUIDE: Record<UiPlatform, { label: string; exportHelp: React.ReactNode; importHelp: string }> = {
  booking: {
    label: "Booking.com",
    exportHelp: (
      <>
        Booking: Extranet → Árak és elérhetőség → Naptár → Naptárak szinkronizálása. <strong>A Booking export linkjénél a „Booked and closed
        dates” opciót válaszd</strong>, különben a Bookingon kézzel lezárt napok nem jönnek át.
      </>
    ),
    importHelp: "A Booking export linkje (Extranet → Naptárak szinkronizálása → link másolása, „Booked and closed dates”).",
  },
  szallas: {
    label: "Szállás.hu",
    exportHelp: <>Szállás.hu: Admin → Árak és kapacitás → Naptár szinkron (iCal) → Naptár importálása</>,
    importHelp: "A Szállás.hu export linkje (Admin → Naptár exportálás).",
  },
};

// Az egész ház szezonon kívül a portálon le lehet zárva. Ha a lezárt napok is
// bejönnének, mindhárom szoba lezárulna – ezért a Booking egész házas exportjánál
// csak a foglalások ("Booked dates only") jöhetnek át.
const HOUSE_BOOKING_GUIDE = {
  label: "Booking.com",
  exportHelp: (
    <>
      Booking: Extranet → Árak és elérhetőség → Naptár → Naptárak szinkronizálása. <strong>Az egész ház hirdetésénél a „Booked dates only”
      opciót válaszd</strong> – a szezonon kívüli lezárás így nem zárja le a szobákat.
    </>
  ),
  importHelp: "A Booking egész házas export linkje – „Booked dates only” opcióval (a szezonon kívüli lezárás ne jöjjön át).",
};

function guideFor(unit: string, platform: UiPlatform) {
  return unit === "egesz_haz" && platform === "booking" ? HOUSE_BOOKING_GUIDE : GUIDE[platform];
}

function Message({ state }: { state: FeedFormState }) {
  if (state.error) return <p className="mt-2 text-[13px] text-red-700">{state.error}</p>;
  if (state.ok) return <p className="mt-2 text-[13px] text-green-700">{state.ok}</p>;
  return null;
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input readOnly value={url} className={`${input} font-mono text-[12px]`} onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        className={btn}
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Másolva ✓" : "Másolás"}
      </button>
    </div>
  );
}

function FeedForm({ unit, platform, feed }: { unit: string; platform: UiPlatform; feed: FeedView | null }) {
  const [state, action, pending] = useActionState(saveFeedAction, {});
  const [syncState, setSyncState] = useState<FeedFormState>({});
  const [syncing, startSync] = useTransition();
  const g = guideFor(unit, platform);

  return (
    <div>
      <form action={action} className="flex items-start gap-2">
        <input type="hidden" name="unit" value={unit} />
        <input type="hidden" name="platform" value={platform} />
        <input name="importUrl" defaultValue={feed?.importUrl ?? ""} placeholder="https://…" className={input} aria-label={`${g.label} import link`} />
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Ellenőrzés…" : "Mentés"}
        </button>
      </form>
      <p className="mt-1 text-[12px] text-[var(--text3)]">{g.importHelp}</p>
      <Message state={state} />

      {feed?.importUrl ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
          <span className="text-[var(--text2)]">
            Utolsó sikeres frissítés: <strong className="text-[var(--text)]">{feed.lastSuccess ?? "még nem volt"}</strong>
          </span>
          {feed.lastError && (
            <span className="text-red-700">
              Hiba{feed.failCount > 1 ? ` (${feed.failCount}× egymás után)` : ""}: {feed.lastError}
            </span>
          )}
          <button
            type="button"
            disabled={syncing}
            className={btn}
            onClick={() => startSync(async () => setSyncState(await syncNowAction(feed.id)))}
          >
            {syncing ? "Frissítés…" : "Frissítés most"}
          </button>
        </div>
      ) : null}
      <Message state={syncState} />
    </div>
  );
}

export function UnitSyncCard({
  unit,
  unitName,
  exportLinks,
  feeds,
}: {
  unit: string;
  unitName: string;
  exportLinks: Record<UiPlatform | "altalanos", string>;
  feeds: Record<UiPlatform, FeedView | null>;
}) {
  const [regenState, setRegenState] = useState<FeedFormState>({});
  const [regenerating, startRegen] = useTransition();

  return (
    <section className="rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="mb-4 text-[16px] font-semibold text-[var(--text)]">{unitName}</h2>

      <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--text2)]">Export linkek – ezeket illeszd be a portálokba</h3>
      <div className="space-y-4">
        {(["booking", "szallas"] as const).map((p) => (
          <div key={p}>
            <p className="mb-1 text-[13px] font-medium text-[var(--text)]">{guideFor(unit, p).label}</p>
            <CopyLink url={exportLinks[p]} />
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--text2)]">{guideFor(unit, p).exportHelp}</p>
          </div>
        ))}
        <details className="text-[13px]">
          <summary className="cursor-pointer text-[var(--text2)]">Általános link más naptárakhoz (pl. Google Naptár)</summary>
          <div className="mt-2">
            <CopyLink url={exportLinks.altalanos} />
          </div>
        </details>
      </div>

      <h3 className="mb-2 mt-6 text-[12px] font-semibold uppercase tracking-wide text-[var(--text2)]">Import – a portálok export linkje</h3>
      <div className="space-y-5">
        {(["booking", "szallas"] as const).map((p) => (
          <div key={p}>
            <p className="mb-1 text-[13px] font-medium text-[var(--text)]">{guideFor(unit, p).label}</p>
            <FeedForm unit={unit} platform={p} feed={feeds[p]} />
          </div>
        ))}
      </div>

      <div className="mt-6 border-t-[0.5px] border-[var(--border)] pt-4">
        <button
          type="button"
          disabled={regenerating}
          className={btn}
          onClick={() => {
            if (!confirm("Biztosan új export linket generálsz? A régi link azonnal érvénytelen lesz, és a portálokon le kell cserélni.")) return;
            startRegen(async () => setRegenState(await regenerateTokenAction(unit)));
          }}
        >
          {regenerating ? "Generálás…" : "Export link újragenerálása"}
        </button>
        <p className="mt-1 text-[12px] text-[var(--text3)]">Ha a link illetéktelen kézbe került. A régi link azonnal érvénytelen lesz.</p>
        <Message state={regenState} />
      </div>
    </section>
  );
}
