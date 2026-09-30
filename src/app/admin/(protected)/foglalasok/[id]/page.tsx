import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { closures } from "@/db/schema";
import { MEAL_LABEL, SCOPE_LABEL, formatFt, type Meal, type Scope } from "@/lib/booking/constants";
import { addDays, diffDays, fmtLong, todayBudapest } from "@/lib/booking/dates";
import { getBooking, getSettings } from "@/lib/booking/server";
import { depositReceivedAction } from "../actions";
import { SourceBadge, StatusBadge } from "../badges";
import { CancelButton, ConfirmButton, ResendButton } from "../buttons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Foglalás" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b-[0.5px] border-[var(--border)] py-2.5 sm:flex-row sm:gap-4">
      <dt className="w-40 shrink-0 text-[13px] text-[var(--text2)]">{label}</dt>
      <dd className="text-[15px] text-[var(--text)]">{children}</dd>
    </div>
  );
}

export default async function FoglalasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await getBooking(Number(id));
  if (!b) notFound();
  const s = await getSettings();
  const closedCount = await db.$count(closures, eq(closures.bookingId, b.id));
  const nights = diffDays(b.checkIn, b.checkOut);
  const today = todayBudapest();

  const acceptedDay = b.acceptedAt ? new Date(b.acceptedAt).toISOString().slice(0, 10) : null;
  const depositDue = acceptedDay ? addDays(acceptedDay, s.depositDueDays) : null;
  const depositLate = b.status === "elfogadva" && depositDue != null && depositDue < today;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/foglalasok" className="text-[13px] text-[var(--text2)] hover:text-[var(--text)]">
        ← Foglalások
      </Link>

      <div className="mt-3 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-[var(--text)]">{b.name}</h1>
        <StatusBadge status={b.status} />
        <SourceBadge source={b.source} />
      </div>

      {depositLate && (
        <div className="mb-4 rounded-md border border-[#F0D98A] bg-[#FFF6DB] px-4 py-3 text-[14px] text-[#7A5B00]">
          Az előleg határideje ({fmtLong(depositDue!)}) lejárt, és még nincs jelölve, hogy megérkezett.
        </div>
      )}

      {/* Teendők */}
      {b.status !== "lemondott" && (
        <div className="mb-6 flex flex-wrap items-start gap-3 rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-4">
          {b.status === "valaszra_var" && <ConfirmButton id={b.id} />}
          {b.status === "elfogadva" && (
            <form action={depositReceivedAction}>
              <input type="hidden" name="id" value={b.id} />
              <button type="submit" className="rounded-md bg-[var(--accent)] px-4 py-2 text-[14px] font-semibold text-white hover:opacity-90">
                Előleg megérkezett
              </button>
            </form>
          )}
          {(b.status === "elfogadva" || b.status === "visszaigazolt") && b.email && <ResendButton id={b.id} />}
          <CancelButton id={b.id} hasClosedDays={closedCount > 0} />
        </div>
      )}

      <dl className="rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] px-5 py-2">
        <Row label="Szoba">{SCOPE_LABEL[b.roomScope as Scope] ?? b.roomScope}</Row>
        <Row label="Érkezés">{fmtLong(b.checkIn)}</Row>
        <Row label="Távozás">{fmtLong(b.checkOut)}</Row>
        <Row label="Éjszakák">{nights}</Row>
        <Row label="Vendégek">{b.guests} fő</Row>
        <Row label="Étkezés">
          {b.meal === "nincs" ? "Nincs" : `${MEAL_LABEL[b.meal as Meal] ?? b.meal} – ${b.mealGuests ?? b.guests} fő`}
        </Row>
        <Row label="Összeg">{b.total != null ? formatFt(b.total) : "Egyedi ár – még nincs megadva"}</Row>
        <Row label="Előleg">
          {b.depositReceivedAt
            ? `${b.depositAmount != null ? formatFt(b.depositAmount) + " – " : ""}megérkezett ${fmtLong(b.depositReceivedAt)}`
            : b.depositAmount != null
              ? `${formatFt(b.depositAmount)}${depositDue ? `, határidő: ${fmtLong(depositDue)}` : ""}`
              : "–"}
        </Row>
        <Row label="Naptár">
          {closedCount > 0 ? `${nights} éj lezárva` : b.status === "valaszra_var" ? "A napok visszaigazoláskor zárulnak le" : "Nincs lezárt nap"}
        </Row>
        <Row label="Telefon">{b.phone ? <a href={`tel:${b.phone}`} className="text-[var(--accent)] hover:underline">{b.phone}</a> : "–"}</Row>
        <Row label="E-mail">{b.email ? <a href={`mailto:${b.email}`} className="text-[var(--accent)] hover:underline">{b.email}</a> : "–"}</Row>
        {b.confirmationSentAt && (
          <Row label="Visszaigazoló levél">
            elküldve {new Date(b.confirmationSentAt).toLocaleString("hu-HU", { timeZone: "Europe/Budapest", dateStyle: "long", timeStyle: "short" })}
          </Row>
        )}
        {b.guestMessage && <Row label="Vendég üzenete"><span className="whitespace-pre-line">{b.guestMessage}</span></Row>}
        {b.note && <Row label="Megjegyzés"><span className="whitespace-pre-line">{b.note}</span></Row>}
        <Row label="Beérkezett">
          {new Date(b.createdAt).toLocaleString("hu-HU", { timeZone: "Europe/Budapest", dateStyle: "long", timeStyle: "short" })}
        </Row>
      </dl>
    </div>
  );
}
