import Link from "next/link";
import { and, asc, eq, inArray, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { bookings, closures } from "@/db/schema";
import { ROOM_SCOPES, formatFt, targetLabel } from "@/lib/booking/constants";
import { addDays, diffDays, fmtLong, fmtRange, todayBudapest } from "@/lib/booking/dates";
import { getSettings } from "@/lib/booking/server";
import { SourceBadge } from "./foglalasok/badges";
import { ConfirmButton, ReleaseButton } from "./foglalasok/buttons";
import { offersEnabled } from "@/modules/offers/flag";
import { offersByStatus } from "@/modules/offers/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Áttekintés" };

const ACTIVE = ["elfogadva", "visszaigazolt"];

function Card({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div
      className={`rounded-[10px] border p-5 ${
        warn ? "border-[#F0D98A] bg-[#FFF6DB]" : "border-[0.5px] border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      <div className={`text-[30px] font-semibold leading-none ${warn ? "text-[#7A5B00]" : "text-[var(--text)]"}`}>{value}</div>
      <div className={`mt-2 text-[13px] ${warn ? "text-[#7A5B00]" : "text-[var(--text2)]"}`}>{label}</div>
    </div>
  );
}

export default async function AttekintesPage({ searchParams }: { searchParams: Promise<{ nap?: string }> }) {
  const { nap } = await searchParams;
  const tomorrow = nap === "holnap";
  const today = todayBudapest();
  const day = tomorrow ? addDays(today, 1) : today;
  const word = tomorrow ? "Holnap" : "Ma";
  const s = await getSettings();

  const [arrivals, departures, waiting, closedToday, acceptedNoDeposit] = await Promise.all([
    db.select().from(bookings).where(and(eq(bookings.checkIn, day), inArray(bookings.status, ACTIVE))).orderBy(asc(bookings.name)),
    db.select().from(bookings).where(and(eq(bookings.checkOut, day), inArray(bookings.status, ACTIVE))).orderBy(asc(bookings.name)),
    db.select().from(bookings).where(eq(bookings.status, "valaszra_var")).orderBy(asc(bookings.createdAt)),
    db.selectDistinct({ room: closures.roomScope }).from(closures).where(eq(closures.date, day)),
    db
      .select()
      .from(bookings)
      .where(and(eq(bookings.status, "elfogadva"), isNull(bookings.depositReceivedAt), lte(bookings.acceptedAt, new Date(Date.now() - s.depositDueDays * 86_400_000))))
      .orderBy(asc(bookings.checkIn)),
  ]);

  const bookedRooms = closedToday.filter((c) => (ROOM_SCOPES as readonly string[]).includes(c.room)).length;
  // Új ajánlatkérések (ha az ajánlat modul be van kapcsolva) – ugyanúgy válaszra várnak.
  const newOffers = offersEnabled() ? await offersByStatus(["uj"]) : [];
  const waitingTotal = waiting.length + newOffers.length;

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-xl font-semibold text-[var(--text)]">
          {word}, {fmtLong(day)}
        </h1>
        <div className="flex rounded-md border border-[var(--border)] bg-[var(--surface)] p-0.5 text-[14px]">
          {[
            { href: "/admin", label: "Ma", active: !tomorrow },
            { href: "/admin?nap=holnap", label: "Holnap", active: tomorrow },
          ].map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className={`rounded px-4 py-1.5 ${t.active ? "bg-[var(--nav-bg)] text-white" : "text-[var(--text2)] hover:text-[var(--text)]"}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card label="Érkezik" value={arrivals.length} />
        <Card label="Távozik" value={departures.length} />
        <Card label="Válaszra vár" value={waitingTotal} warn={waitingTotal > 0} />
        <Card label={`Foglalt szoba ${word.toLowerCase()}`} value={`${bookedRooms}/${ROOM_SCOPES.length}`} />
      </div>

      {acceptedNoDeposit.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-[15px] font-semibold text-[var(--text)]">Előleg nem érkezett</h2>
          <div className="space-y-2">
            {acceptedNoDeposit.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#F0D98A] bg-[#FFF6DB] px-4 py-3">
                <div className="text-[14px] text-[var(--text)]">
                  <Link href={`/admin/foglalasok/${b.id}`} className="font-medium hover:underline">{b.name}</Link>
                  <span className="text-[var(--text2)]"> · {targetLabel(b.roomScope)} · {fmtRange(b.checkIn, b.checkOut)}</span>
                  {b.depositAmount != null && <span className="text-[var(--text2)]"> · előleg {formatFt(b.depositAmount)}</span>}
                </div>
                <ReleaseButton id={b.id} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-[15px] font-semibold text-[var(--text)]">Válaszra vár</h2>
        {waitingTotal === 0 ? (
          <p className="rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] px-4 py-5 text-[14px] text-[var(--text3)]">
            Nincs megválaszolatlan kérés.
          </p>
        ) : (
          <div className="space-y-2">
            {newOffers.map((o) => (
              <div key={`o${o.id}`} className="flex flex-wrap items-start justify-between gap-3 rounded-[10px] border border-[#F0D98A] bg-[#FFFBEA] px-4 py-3">
                <div className="min-w-0 text-[14px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[var(--text)]">{o.name}</span>
                    <span className="text-[var(--text2)]">{o.adults + o.teens + o.children} fő</span>
                    <span className="inline-block whitespace-nowrap rounded border border-[var(--border)] px-1.5 text-[11px] text-[var(--text2)]">Ajánlatkérés</span>
                  </div>
                  <div className="mt-0.5 text-[var(--text2)]">
                    {fmtRange(o.checkIn, o.checkOut)} · {o.kind === "betelt" ? "betelt – alternatívák" : targetLabel(o.roomScopes.includes("egesz_haz") ? "egesz_haz" : o.roomScopes.join(","))}
                    {o.kind !== "betelt" && o.total != null ? ` · ${formatFt(o.total)}` : ""}
                  </div>
                </div>
                <Link href={`/admin/ajanlatok/${o.id}`} className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-[14px] font-semibold text-white hover:opacity-90">
                  Ajánlat megírása
                </Link>
              </div>
            ))}
            {waiting.map((b) => (
              <div key={b.id} className="flex flex-wrap items-start justify-between gap-3 rounded-[10px] border border-[#F0D98A] bg-[#FFFBEA] px-4 py-3">
                <div className="min-w-0 text-[14px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[var(--text)]">{b.name}</span>
                    <span className="text-[var(--text2)]">{b.guests} fő</span>
                    <SourceBadge source={b.source} />
                  </div>
                  <div className="mt-0.5 text-[var(--text2)]">
                    {fmtRange(b.checkIn, b.checkOut)} · {targetLabel(b.roomScope)} · {b.total != null ? formatFt(b.total) : "egyedi ár"}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Link
                    href={`/admin/foglalasok/${b.id}`}
                    className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[14px] text-[var(--text)] hover:border-[var(--text3)]"
                  >
                    Részletek
                  </Link>
                  <ConfirmButton id={b.id} compact />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold text-[var(--text)]">{word} érkezik</h2>
        {arrivals.length === 0 ? (
          <p className="rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] px-4 py-5 text-[14px] text-[var(--text3)]">
            {word} nem érkezik vendég.
          </p>
        ) : (
          <div className="overflow-hidden rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)]">
            {arrivals.map((b) => (
              <Link
                key={b.id}
                href={`/admin/foglalasok/${b.id}`}
                className="flex flex-wrap items-center justify-between gap-2 border-b-[0.5px] border-[var(--border)] px-4 py-3 text-[14px] last:border-b-0 hover:bg-[var(--surface2)]"
              >
                <span className="font-medium text-[var(--text)]">{b.name}</span>
                <span className="text-[var(--text2)]">
                  {targetLabel(b.roomScope)} · {diffDays(b.checkIn, b.checkOut)} éj · {b.phone ?? "nincs telefon"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
