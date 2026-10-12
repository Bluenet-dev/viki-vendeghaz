import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatFt } from "@/lib/booking/constants";
import { addDays, fmtLong, todayBudapest } from "@/lib/booking/dates";
import { getSettings } from "@/lib/booking/server";
import { OfferBody } from "@/modules/offers/email";
import { offersEnabled } from "@/modules/offers/flag";
import { getOfferByToken, isExpired, partyOf, requestUrlFor, storedView } from "@/modules/offers/server";
import { acceptOfferByTokenAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Árajánlat", robots: { index: false, follow: false } };

function Card({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-2xl rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center">{children}</div>;
}

export default async function AjanlatOldal({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ betelt?: string }> }) {
  if (!offersEnabled()) notFound();
  const { token } = await params;
  const { betelt } = await searchParams;
  const o = await getOfferByToken(token);
  if (!o || o.status === "uj") notFound();
  const s = await getSettings();
  const today = todayBudapest();
  const tel = <a href={`tel:${s.phone.replace(/[^\d+]/g, "")}`} className="font-semibold text-[var(--accent)]">{s.phone}</a>;

  let content: React.ReactNode;
  if (betelt && o.status === "elkuldve") {
    content = (
      <Card>
        <p className="text-xl font-semibold text-[var(--text)]">Sajnos ez az időpont közben betelt</p>
        <p className="mt-3 text-[var(--text2)]">Hívjon minket, és együtt keresünk megoldást: {tel}</p>
      </Card>
    );
  } else if (o.status === "elfogadva" || o.status === "foglalas") {
    const due = o.acceptedAt ? addDays(new Date(o.acceptedAt).toISOString().slice(0, 10), s.depositDueDays) : null;
    content = (
      <Card>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-bg)] text-2xl text-[var(--accent)]">✓</div>
        <p className="text-2xl font-semibold text-[var(--text)]">Köszönjük, elfogadta az ajánlatot!</p>
        <p className="mt-3 text-[var(--text2)]">
          A napokat lefoglaltuk Önnek: {fmtLong(o.checkIn)} – {fmtLong(o.checkOut)}.
          {o.status === "elfogadva" ? " Az utalás adatait e-mailben is elküldtük." : " A foglalót megkaptuk, a foglalás végleges."}
        </p>
        {o.status === "elfogadva" && o.deposit != null && (
          <dl className="mx-auto mt-6 max-w-md space-y-1.5 rounded-lg bg-[var(--surface2)] p-4 text-left text-[15px]">
            <div className="flex justify-between gap-3"><dt className="text-[var(--text2)]">Foglaló</dt><dd className="font-semibold">{formatFt(o.deposit)}</dd></div>
            {due && <div className="flex justify-between gap-3"><dt className="text-[var(--text2)]">Határidő</dt><dd>{fmtLong(due)}</dd></div>}
            <div className="flex justify-between gap-3"><dt className="text-[var(--text2)]">Kedvezményezett</dt><dd>{s.bankBeneficiary}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[var(--text2)]">Számlaszám</dt><dd>{s.bankAccount}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[var(--text2)]">Közlemény</dt><dd className="font-semibold">{o.number}</dd></div>
          </dl>
        )}
        <p className="mt-6 text-[var(--text2)]">Kérdése van? Hívjon minket: {tel}</p>
      </Card>
    );
  } else if (isExpired(o, today)) {
    content = (
      <Card>
        <p className="text-xl font-semibold text-[var(--text)]">Az ajánlat lejárt, kérjen újat</p>
        <p className="mt-3 text-[var(--text2)]">Szívesen küldünk friss ajánlatot ugyanerre vagy egy másik időpontra.</p>
        <Link
          href={requestUrlFor({ checkIn: o.checkIn, checkOut: o.checkOut }, partyOf(o)).replace(/^https?:\/\/[^/]+/, "")}
          className="mt-6 inline-block rounded-full bg-[var(--nav-bg)] px-6 py-3 font-semibold text-white hover:opacity-90"
        >
          Új ajánlatot kérek
        </Link>
      </Card>
    );
  } else if (o.status === "elkuldve" && o.kind === "ajanlat") {
    const view = storedView(o, s);
    content = (
      <div className="mx-auto max-w-[640px]">
        <OfferBody
          view={view}
          acceptSlot={
            <form action={acceptOfferByTokenAction}>
              <input type="hidden" name="token" value={token} />
              <button type="submit" style={{ background: s.accentColor }} className="rounded-lg px-7 py-3.5 text-[16px] font-bold text-white hover:opacity-90">
                Elfogadom az ajánlatot
              </button>
            </form>
          }
        />
      </div>
    );
  } else {
    content = (
      <Card>
        <p className="text-xl font-semibold text-[var(--text)]">Ez az ajánlat már nem érvényes</p>
        <p className="mt-3 text-[var(--text2)]">Kérdése van? Hívjon minket: {tel}</p>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 pt-24 pb-16">
      <p className="mb-6 text-center text-xs uppercase tracking-widest text-[var(--text3)]">Árajánlat {o.number}</p>
      {content}
    </div>
  );
}
