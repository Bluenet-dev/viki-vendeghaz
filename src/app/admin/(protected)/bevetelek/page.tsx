import Link from "next/link";
import { SCOPE_LABEL, SOURCE_LABEL, formatFt, targetLabel, type Source } from "@/lib/booking/constants";
import { fmtRange, todayBudapest } from "@/lib/booking/dates";
import { revenueReport } from "@/lib/revenue";
import { RevenueChart } from "./chart";
import { loadRevenueInput } from "./data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bevételek" };

const MONTHS = ["Január", "Február", "Március", "Április", "Május", "Június", "Július", "Augusztus", "Szeptember", "Október", "November", "December"];

function Big({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="text-[28px] font-semibold leading-none" style={{ color }}>{value}</div>
      <div className="mt-2 text-[13px] text-[var(--text2)]">{label}</div>
    </div>
  );
}

function Bars({ title, rows }: { title: string; rows: { label: string; amount: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.amount));
  return (
    <section className="rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="mb-3 text-[15px] font-semibold text-[var(--text)]">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-[14px] text-[var(--text3)]">Nincs adat.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex justify-between gap-3 text-[14px]">
                <span className="text-[var(--text)]">{r.label}</span>
                <span className="font-medium text-[var(--text)]">{formatFt(Math.round(r.amount))}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-[var(--surface2)]">
                <div className="h-2 rounded-full bg-[#5A7A5C]" style={{ width: `${(r.amount / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function BevetelekPage({ searchParams }: { searchParams: Promise<{ ev?: string }> }) {
  const { ev } = await searchParams;
  const today = todayBudapest();
  const thisYear = Number(today.slice(0, 4));
  const input = await loadRevenueInput();
  const years = Array.from(new Set([thisYear, ...input.bookings.map((b) => Number(b.checkIn.slice(0, 4)))])).sort();
  const year = years.includes(Number(ev)) ? Number(ev) : thisYear;
  const r = revenueReport(year, input.bookings, input.offers, today);
  const isThisYear = year === thisYear;
  const monthHref = (m: number) => `/admin/foglalasok?ho=${year}-${String(m + 1).padStart(2, "0")}`;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-[var(--text)]">Bevételek</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-[var(--border)] bg-[var(--surface)] p-0.5 text-[14px]">
            {years.map((y) => (
              <Link
                key={y}
                href={y === thisYear ? "/admin/bevetelek" : `/admin/bevetelek?ev=${y}`}
                className={`rounded px-3 py-1.5 ${y === year ? "bg-[var(--nav-bg)] text-white" : "text-[var(--text2)] hover:text-[var(--text)]"}`}
              >
                {y}
              </Link>
            ))}
          </div>
          <a
            href={`/admin/bevetelek/csv?ev=${year}`}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[14px] text-[var(--text)] hover:border-[var(--text3)]"
          >
            Letöltés a könyvelőnek (CSV)
          </a>
        </div>
      </div>

      {r.empty ? (
        <p className="rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] px-5 py-10 text-center text-[15px] text-[var(--text2)]">
          Erre az évre még nincs foglalás.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Big label={isThisYear ? "Befolyt idén" : `Befolyt (${year})`} value={formatFt(r.befolyt)} color="#3A5A3C" />
            <Big label={isThisYear ? "Várható még idén" : `Várható még (${year})`} value={formatFt(r.varhato)} color="#8A4A22" />
            <Big label={isThisYear ? "Összesen idén" : `Összesen (${year})`} value={formatFt(r.total)} color="var(--text)" />
          </div>
          <p className="-mt-2 text-[14px] text-[var(--text3)]">
            Függőben: {formatFt(r.pending)} (válaszra váró kérések és elküldött ajánlatok), ez még nem számít bele.
          </p>

          <section className="rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="mb-3 flex flex-wrap items-center gap-4 text-[13px] text-[var(--text2)]">
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-[#5A7A5C]" /> Befolyt</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-[#E8A882]" /> Várható</span>
              {r.months.some((m) => m.lastYear != null) && (
                <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 bg-[#B9B3AC]" /> Tavaly ({year - 1})</span>
              )}
              <span className="ml-auto">Kattintson egy hónapra a foglalásokért.</span>
            </div>
            <RevenueChart year={year} months={r.months.map((m) => ({ month: m.month, befolyt: m.befolyt, varhato: m.varhato, lastYear: m.lastYear }))} />
          </section>

          <section className="overflow-x-auto rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="bg-[var(--surface2)] text-left text-[12px] uppercase tracking-wide text-[var(--text2)]">
                  <th className="px-4 py-2.5 font-semibold">Hónap</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Foglalás</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Éjszaka</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Kihasználtság</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Befolyt</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Várható</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Összesen</th>
                </tr>
              </thead>
              <tbody>
                {r.months.map((m) => (
                  <tr key={m.month} className="border-t-[0.5px] border-[var(--border)] hover:bg-[var(--surface2)]">
                    <td className="px-4 py-2.5">
                      <Link href={monthHref(m.month)} className="text-[var(--text)] hover:underline">{MONTHS[m.month]}</Link>
                    </td>
                    <td className="px-4 py-2.5 text-right">{m.bookings || ""}</td>
                    <td className="px-4 py-2.5 text-right">{m.nights || ""}</td>
                    <td className="px-4 py-2.5 text-right">{m.occupancy ? `${m.occupancy}%` : ""}</td>
                    <td className="px-4 py-2.5 text-right text-[#3A5A3C]">{m.befolyt ? formatFt(m.befolyt) : ""}</td>
                    <td className="px-4 py-2.5 text-right text-[#8A4A22]">{m.varhato ? formatFt(m.varhato) : ""}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{m.total ? formatFt(m.total) : ""}</td>
                  </tr>
                ))}
                <tr className="border-t border-[var(--border)] font-semibold">
                  <td className="px-4 py-2.5">Összesen</td>
                  <td className="px-4 py-2.5 text-right">{r.months.reduce((a, m) => a + m.bookings, 0)}</td>
                  <td className="px-4 py-2.5 text-right">{r.months.reduce((a, m) => a + m.nights, 0)}</td>
                  <td className="px-4 py-2.5" />
                  <td className="px-4 py-2.5 text-right text-[#3A5A3C]">{formatFt(r.befolyt)}</td>
                  <td className="px-4 py-2.5 text-right text-[#8A4A22]">{formatFt(r.varhato)}</td>
                  <td className="px-4 py-2.5 text-right">{formatFt(r.total)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <Bars title="Honnan jöttek a foglalások?" rows={r.bySource.map((s) => ({ label: SOURCE_LABEL[s.key as Source] ?? s.key, amount: s.amount }))} />
            <Bars title="Melyik szállás mennyit hozott?" rows={r.byUnit.map((u) => ({ label: SCOPE_LABEL[u.key], amount: u.amount }))} />
          </div>
        </>
      )}

      {isThisYear && (
        <section className="rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-[var(--text)]">Következő 30 nap</h2>
            <span className="text-[14px] text-[var(--text2)]">
              {r.next30.length} érkezés · {formatFt(r.next30Total)}
            </span>
          </div>
          {r.next30.length === 0 ? (
            <p className="text-[14px] text-[var(--text3)]">A következő 30 napban nem érkezik vendég.</p>
          ) : (
            <ul className="divide-y-[0.5px] divide-[var(--border)]">
              {r.next30.map((b) => (
                <li
                  key={b.id}
                  className={`flex flex-wrap items-center justify-between gap-2 py-2.5 text-[14px] ${b.depositMissing ? "-mx-2 rounded-md bg-[#FFF6DB] px-2" : ""}`}
                >
                  <Link href={`/admin/foglalasok/${b.id}`} className="font-medium text-[var(--text)] hover:underline">{b.name}</Link>
                  <span className="text-[var(--text2)]">{fmtRange(b.checkIn, b.checkOut)} · {targetLabel(b.roomScope)}</span>
                  <span className="text-right">
                    {formatFt(b.amount)}
                    {b.depositMissing && <span className="ml-2 text-[12px] font-medium text-[#7A5B00]">az előleg még nem érkezett meg</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="text-[12px] text-[var(--text3)]">
        A foglalás az érkezés hónapjához számít. Az idegenforgalmi adó nem bevétel (továbbutaljuk), ezért nincs benne.
        {r.hasLegacy ? " A tételes bontás nélküli régi foglalásoknál a tárolt összeg szerepel." : ""}
      </p>
    </div>
  );
}
