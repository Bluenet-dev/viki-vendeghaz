import Link from "next/link";
import { notFound } from "next/navigation";
import { fmtLong, todayBudapest } from "@/lib/booking/dates";
import { serializeBookingData } from "@/lib/booking/quote";
import { getSettings } from "@/lib/booking/server";
import { siteUrl } from "@/lib/mail/send";
import { AdminAcceptButton } from "@/modules/offers/admin/accept-button";
import { OfferStatusBadge } from "@/modules/offers/admin/badges";
import { OfferEditor } from "@/modules/offers/admin/editor";
import { PreviewFrame } from "@/modules/offers/admin/preview";
import { offersEnabled } from "@/modules/offers/flag";
import { acceptUrl, draftOf, effectiveStatus, getOffer, offerData, storedView } from "@/modules/offers/server";
import type { OfferRequest, Window } from "@/modules/offers/types";
import { brandFrom } from "@/modules/offers/view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ajánlat" };

const when = (d: Date | null) =>
  d ? new Date(d).toLocaleString("hu-HU", { timeZone: "Europe/Budapest", dateStyle: "long", timeStyle: "short" }) : "";

export default async function AjanlatPage({ params }: { params: Promise<{ id: string }> }) {
  if (!offersEnabled()) notFound();
  const { id } = await params;
  const o = await getOffer(Number(id));
  if (!o) notFound();
  const s = await getSettings();
  const today = todayBudapest();
  const status = effectiveStatus(o, today);

  const header = (
    <>
      <Link href="/admin/ajanlatok" className="text-[13px] text-[var(--text2)] hover:text-[var(--text)]">← Ajánlatkérések</Link>
      <div className="mt-3 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-[var(--text)]">{o.name}</h1>
        <span className="text-[14px] text-[var(--text2)]">{o.number}</span>
        <OfferStatusBadge status={status} />
      </div>
    </>
  );

  if (o.status === "uj") {
    const data = await offerData(o, s);
    const request = (o.request ?? {
      party: { adults: o.adults, teens: o.teens, children: o.children, infants: o.infants },
      scope: o.requestedScopes.join(","),
      packageSlug: o.packageSlug,
      extras: o.extras ?? {},
      meal: o.meal,
      mealGuests: o.mealGuests,
    }) as OfferRequest;
    return (
      <div className="max-w-[1400px]">
        {header}
        <OfferEditor
          offer={{
            id: o.id,
            number: o.number,
            name: o.name,
            email: o.email,
            phone: o.phone,
            checkIn: o.checkIn,
            checkOut: o.checkOut,
            source: o.source,
            message: o.message,
            createdAt: new Date(o.createdAt).toISOString(),
          }}
          request={request}
          initial={draftOf(o, s)}
          data={serializeBookingData(data)}
          brand={brandFrom(s)}
          acceptUrl={acceptUrl(o.acceptToken)}
          siteUrl={siteUrl()}
          alternatives={(o.alternatives ?? []) as Window[]}
          declineTemplate={s.declineTemplate}
          today={today}
        />
      </div>
    );
  }

  // Elküldött / lezárt ajánlat: az elküldött tartalom, és ami még teendő. Elutasított
  // ajánlatot a vendég nem kapott meg (csak az elutasító levelet) – azt nem mutatjuk.
  const view = storedView(o, s);
  const showPreview = !(o.status === "elutasitva" && o.kind === "ajanlat");
  return (
    <div className="max-w-[1100px]">
      {header}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,640px)]">
        <div className="space-y-4">
          <dl className="rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-[14px]">
            {o.sentAt && o.status !== "elutasitva" && (
              <div className="flex justify-between gap-4 border-b-[0.5px] border-[var(--border)] py-2">
                <dt className="text-[var(--text2)]">Elküldve</dt>
                <dd>{when(o.sentAt)}</dd>
              </div>
            )}
            {o.validUntil && o.kind === "ajanlat" && (
              <div className="flex justify-between gap-4 border-b-[0.5px] border-[var(--border)] py-2">
                <dt className="text-[var(--text2)]">Érvényes</dt>
                <dd>{fmtLong(o.validUntil)} végéig</dd>
              </div>
            )}
            {o.acceptedAt && (
              <div className="flex justify-between gap-4 border-b-[0.5px] border-[var(--border)] py-2">
                <dt className="text-[var(--text2)]">Elfogadva</dt>
                <dd>{when(o.acceptedAt)}</dd>
              </div>
            )}
            {o.declinedAt && (
              <div className="border-b-[0.5px] border-[var(--border)] py-2">
                <dt className="text-[var(--text2)]">{o.kind === "betelt" ? "Betelt levél elküldve" : o.email ? "Elutasító levél elküldve" : "Elutasítva"} {when(o.declinedAt)}</dt>
                {o.declineMessage && <dd className="mt-1 whitespace-pre-line text-[var(--text)]">{o.declineMessage}</dd>}
              </div>
            )}
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-[var(--text2)]">Elérhetőség</dt>
              <dd className="text-right">{[o.email, o.phone].filter(Boolean).join(" · ")}</dd>
            </div>
          </dl>

          {o.bookingId && (
            <Link
              href={`/admin/foglalasok/${o.bookingId}`}
              className="flex items-center justify-between rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-4 text-[15px] hover:border-[var(--accent)]"
            >
              <span>A foglalás megnyitása</span>
              <span className="text-[var(--accent)]">→</span>
            </Link>
          )}

          {(status === "elkuldve" || status === "lejart") && o.kind === "ajanlat" && (
            <div className="rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="mb-3 text-[14px] text-[var(--text2)]">
                {status === "lejart"
                  ? "Az ajánlat lejárt. Ha a vendég mégis elfogadta (levélben, telefonon), itt rögzítheti."
                  : "Ha a vendég válaszlevélben vagy telefonon fogadta el, itt rögzítheti."}
              </p>
              <AdminAcceptButton id={o.id} />
            </div>
          )}
        </div>

        {showPreview && (
          <div>
            <p className="mb-2 text-[13px] text-[var(--text2)]">{o.sentAt ? "Ezt kapta a vendég" : "Előnézet"}</p>
            <PreviewFrame view={view} />
          </div>
        )}
      </div>
    </div>
  );
}
