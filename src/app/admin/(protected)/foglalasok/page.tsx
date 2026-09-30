import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { formatFt, targetLabel } from "@/lib/booking/constants";
import { diffDays, fmtRange, todayBudapest } from "@/lib/booking/dates";
import { SourceBadge, StatusBadge } from "./badges";

export const dynamic = "force-dynamic";
export const metadata = { title: "Foglalások" };

const TABS = [
  { key: "mind", label: "Mind" },
  { key: "valaszra_var", label: "Válaszra vár" },
  { key: "visszaigazolt", label: "Visszaigazolt" },
  { key: "lemondott", label: "Lemondott" },
] as const;

export default async function FoglalasokPage({ searchParams }: { searchParams: Promise<{ ful?: string }> }) {
  const { ful = "mind" } = await searchParams;
  const all = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
  const today = todayBudapest();

  const counts = {
    valaszra_var: all.filter((b) => b.status === "valaszra_var").length,
  };

  const filtered = all.filter((b) => {
    if (ful === "valaszra_var") return b.status === "valaszra_var";
    if (ful === "visszaigazolt") return b.status === "visszaigazolt" || b.status === "elfogadva";
    if (ful === "lemondott") return b.status === "lemondott";
    return true;
  });

  // Válaszra váró felül, utána a közelgő érkezések, végül a múltbeliek.
  const rank = (b: (typeof all)[number]) => (b.status === "valaszra_var" ? 0 : b.checkOut >= today ? 1 : 2);
  filtered.sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r) return r;
    if (rank(a) === 2) return b.checkIn.localeCompare(a.checkIn);
    return a.checkIn.localeCompare(b.checkIn);
  });

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-[var(--text)]">Foglalások</h1>
        <Link
          href="/admin/foglalasok/uj"
          className="rounded-md bg-[var(--nav-bg)] px-4 py-2 text-[14px] font-semibold text-white hover:opacity-90"
        >
          + Új foglalás
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--border)]">
        {TABS.map((t) => {
          const active = ful === t.key;
          const count = t.key === "valaszra_var" ? counts.valaszra_var : null;
          return (
            <Link
              key={t.key}
              href={t.key === "mind" ? "/admin/foglalasok" : `/admin/foglalasok?ful=${t.key}`}
              className={`-mb-px border-b-2 px-4 py-2 text-[14px] transition-colors ${
                active
                  ? "border-[var(--accent)] font-semibold text-[var(--text)]"
                  : "border-transparent text-[var(--text2)] hover:text-[var(--text)]"
              }`}
            >
              {t.label}
              {count ? (
                <span className="ml-1.5 rounded-full bg-[#FFF3C4] px-1.5 py-0.5 text-[12px] font-semibold text-[#7A5B00]">{count}</span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--text3)]">Itt most nincs foglalás.</p>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="bg-[var(--surface2)] text-left text-[12px] uppercase tracking-wide text-[var(--text2)]">
                <th className="px-4 py-2.5 font-semibold">Vendég</th>
                <th className="px-4 py-2.5 font-semibold">Időpont</th>
                <th className="px-4 py-2.5 font-semibold">Szoba</th>
                <th className="px-4 py-2.5 text-right font-semibold">Összeg</th>
                <th className="px-4 py-2.5 font-semibold">Állapot</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const href = `/admin/foglalasok/${b.id}`;
                const waiting = b.status === "valaszra_var";
                const past = b.checkOut < today;
                return (
                  <tr
                    key={b.id}
                    className={`border-t-[0.5px] border-[var(--border)] ${waiting ? "bg-[#FFFBEA]" : ""} ${past && !waiting ? "opacity-60" : ""} hover:bg-[var(--surface2)]`}
                  >
                    <td className="px-4 py-3">
                      <Link href={href} className="font-medium text-[var(--text)] hover:underline">{b.name}</Link>
                      <div className="mt-0.5 flex items-center gap-2 text-[12px] text-[var(--text2)]">
                        <span>{b.guests} fő</span>
                        <SourceBadge source={b.source} />
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link href={href} className="text-[var(--text)]">{fmtRange(b.checkIn, b.checkOut)}</Link>
                      <div className="text-[12px] text-[var(--text2)]">{diffDays(b.checkIn, b.checkOut)} éj</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text)]">{targetLabel(b.roomScope)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-[var(--text)]">{b.total != null ? formatFt(b.total) : "–"}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
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
