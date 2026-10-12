import Link from "next/link";
import { notFound } from "next/navigation";
import { formatFt, targetLabel } from "@/lib/booking/constants";
import { diffDays, fmtRange, todayBudapest } from "@/lib/booking/dates";
import { OfferStatusBadge } from "@/modules/offers/admin/badges";
import { offersEnabled } from "@/modules/offers/flag";
import { effectiveStatus, listOffers } from "@/modules/offers/server";
import { scopesToTarget } from "@/modules/offers/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ajánlatkérések" };

// A fő út: Új → Elküldve → Elfogadva → Foglalás; oldalág: Elutasítva, Lejárt.
const TABS = [
  { key: "mind", label: "Mind" },
  { key: "uj", label: "Új" },
  { key: "elkuldve", label: "Elküldve" },
  { key: "elfogadva", label: "Elfogadva" },
  { key: "foglalas", label: "Foglalás" },
  { key: "elutasitva", label: "Elutasítva" },
  { key: "lejart", label: "Lejárt" },
] as const;

export default async function AjanlatokPage({ searchParams }: { searchParams: Promise<{ ful?: string }> }) {
  if (!offersEnabled()) notFound();
  const { ful = "mind" } = await searchParams;
  const today = todayBudapest();
  const all = (await listOffers()).map((o) => ({ ...o, shown: effectiveStatus(o, today) }));
  const filtered = ful === "mind" ? all : all.filter((o) => o.shown === ful);
  // Az új kérések mindig felül.
  filtered.sort((a, b) => (a.shown === "uj" ? 0 : 1) - (b.shown === "uj" ? 0 : 1));
  const newCount = all.filter((o) => o.shown === "uj").length;

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-[var(--text)]">Ajánlatkérések</h1>
        <Link href="/admin/ajanlatok/uj" className="rounded-md bg-[var(--nav-bg)] px-4 py-2 text-[14px] font-semibold text-white hover:opacity-90">
          + Új ajánlat
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--border)]">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "mind" ? "/admin/ajanlatok" : `/admin/ajanlatok?ful=${t.key}`}
            className={`-mb-px border-b-2 px-4 py-2 text-[14px] transition-colors ${
              ful === t.key ? "border-[var(--accent)] font-semibold text-[var(--text)]" : "border-transparent text-[var(--text2)] hover:text-[var(--text)]"
            }`}
          >
            {t.label}
            {t.key === "uj" && newCount ? (
              <span className="ml-1.5 rounded-full bg-[#FFF3C4] px-1.5 py-0.5 text-[12px] font-semibold text-[#7A5B00]">{newCount}</span>
            ) : null}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--text3)]">Itt most nincs ajánlat.</p>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="bg-[var(--surface2)] text-left text-[12px] uppercase tracking-wide text-[var(--text2)]">
                <th className="px-4 py-2.5 font-semibold">Vendég</th>
                <th className="px-4 py-2.5 font-semibold">Időpont</th>
                <th className="px-4 py-2.5 font-semibold">Szállás</th>
                <th className="px-4 py-2.5 text-right font-semibold">Összeg</th>
                <th className="px-4 py-2.5 font-semibold">Állapot</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const href = `/admin/ajanlatok/${o.id}`;
                const isNew = o.shown === "uj";
                return (
                  <tr key={o.id} className={`border-t-[0.5px] border-[var(--border)] ${isNew ? "bg-[#FFFBEA]" : ""} hover:bg-[var(--surface2)]`}>
                    <td className="px-4 py-3">
                      <Link href={href} className="font-medium text-[var(--text)] hover:underline">{o.name}</Link>
                      <div className="mt-0.5 text-[12px] text-[var(--text2)]">
                        {o.number} · {o.adults + o.teens + o.children} fő{o.source === "kezi" ? " · kézi" : ""}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link href={href} className="text-[var(--text)]">{fmtRange(o.checkIn, o.checkOut)}</Link>
                      <div className="text-[12px] text-[var(--text2)]">{diffDays(o.checkIn, o.checkOut)} éj</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--text)]">
                      {o.kind === "betelt" ? "Betelt" : targetLabel(scopesToTarget(o.roomScopes))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text)]">
                      {o.kind === "betelt" || o.total == null ? "" : formatFt(o.total)}
                    </td>
                    <td className="px-4 py-3"><OfferStatusBadge status={o.shown} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
