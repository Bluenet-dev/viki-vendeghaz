// Az ajánlat levelei. Vendégnek Gmailből (a válasz oda érkezik, az Elküldött mappában
// is látszik), a tulajdonosnak és az automatikus visszajelzés Resendből (noreply).

import { render } from "@react-email/render";
import { targetLabel, formatFt } from "@/lib/booking/constants";
import { fmtLong } from "@/lib/booking/dates";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { getBooking, type Settings } from "@/lib/booking/server";
import { guestConfirmationMail } from "@/lib/mail/templates";
import { OWNER_EMAIL, sendViaGmail, sendViaResend, siteUrl, type Mail } from "@/lib/mail/send";
import { OfferEmail, SimpleEmail } from "./email";
import { offerPdfFilename, renderOfferPdf } from "./pdf";
import { partyOf, storedView, type Offer } from "./server";
import { scopesToTarget as scopesToTargetSafe } from "./types";
import { brandFrom, guestBreakdown } from "./view";

async function toMail(to: string, subject: string, element: React.ReactElement, replyTo?: string): Promise<Mail> {
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { to, subject, html, text, replyTo };
}

// Az ajánlat (vagy a "betelt" válasz) a vendégnek. Hibánál MailError – a hívó jelzi.
export async function sendOfferMail(o: Offer, s: Settings): Promise<void> {
  const view = storedView(o, s);
  if (view.kind === "betelt") {
    await sendViaGmail(await toMail(o.email ?? "", `${s.propertyName}: válasz ajánlatkérésére`, <OfferEmail view={view} />));
    return;
  }
  const [mail, pdf] = await Promise.all([
    toMail(o.email ?? "", `${s.propertyName}: árajánlat ${o.number}`, <OfferEmail view={view} />),
    renderOfferPdf(view),
  ]);
  await sendViaGmail({
    ...mail,
    attachments: [{ filename: offerPdfFilename(o.number, s.propertyName), content: pdf, contentType: "application/pdf" }],
  });
}

export async function sendDeclineMail(o: Offer, s: Settings, message: string): Promise<void> {
  const element = (
    <SimpleEmail brand={brandFrom(s)} title="Válasz ajánlatkérésére" number={o.number} greeting={`Kedves ${o.name}!`} message={message} />
  );
  await sendViaGmail(await toMail(o.email ?? "", `${s.propertyName}: válasz ajánlatkérésére`, element));
}

function requestSummary(o: Offer): string {
  return [
    `Időpont: ${fmtLong(o.checkIn)} – ${fmtLong(o.checkOut)}`,
    `Kért szállás: ${targetLabel(scopesToTargetSafe(o.requestedScopes))}`,
    `Vendégek: ${guestBreakdown(partyOf(o))}`,
    o.phone ? `Telefon: ${o.phone}` : null,
    o.email ? `E-mail: ${o.email}` : null,
    o.message ? `Üzenet: ${o.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

// Új ajánlatkérés: értesítő a tulajdonosnak + "Megkaptuk a kérését" a vendégnek.
export async function sendRequestReceivedMails(o: Offer, s: Settings): Promise<void> {
  const brand = brandFrom(s);
  const adminUrl = `${siteUrl()}/admin/ajanlatok/${o.id}`;
  const owner = await toMail(
    OWNER_EMAIL,
    `Új ajánlatkérés ${o.number}: ${o.name}`,
    <SimpleEmail
      brand={brand}
      title="Új ajánlatkérés"
      number={o.number}
      greeting="Új ajánlatkérés érkezett a weboldalról."
      message={`${requestSummary(o)}\n\nA tervezet elkészült, itt nézheti át és küldheti el:\n${adminUrl}`}
    />,
    o.email ?? undefined,
  );
  const tasks: Promise<boolean>[] = [sendViaResend(owner)];
  if (o.email) {
    const guest = await toMail(
      o.email,
      `${s.propertyName}: megkaptuk ajánlatkérését`,
      <SimpleEmail
        brand={brand}
        title="Megkaptuk a kérését"
        number={o.number}
        greeting={`Kedves ${o.name}!`}
        message={`Köszönjük, megkaptuk ajánlatkérését. Hamarosan elküldjük személyre szabott ajánlatunkat.\n\n${requestSummary(o)}`}
      />,
      s.email,
    );
    tasks.push(sendViaResend(guest));
  }
  await Promise.all(tasks);
}

export async function sendOwnerAcceptedMail(o: Offer, s: Settings, bookingId: number): Promise<void> {
  const adminUrl = `${siteUrl()}/admin/foglalasok/${bookingId}`;
  const mail = await toMail(
    OWNER_EMAIL,
    `Elfogadták az ajánlatot: ${o.number}, ${o.name}`,
    <SimpleEmail
      brand={brandFrom(s)}
      title="Elfogadott ajánlat"
      number={o.number}
      greeting={`${o.name} elfogadta az ajánlatot.`}
      message={`${requestSummary(o)}\nSzállás: ${targetLabel(scopesToTargetSafe(o.roomScopes))}\nÖsszesen: ${o.total != null ? formatFt(o.total) : "–"}\nFoglaló: ${o.deposit != null ? formatFt(o.deposit) : "–"}\n\nA napok lezárultak, a foglalás előlegre vár:\n${adminUrl}`}
    />,
    o.email ?? undefined,
  );
  await sendViaResend(mail);
}

// Elfogadás után: a vendég Gmailből megkapja az előleg-utalás adatait (közlemény =
// ajánlatszám), a tulajdonos értesítőt kap (vendégoldali elfogadásnál). A levél hibája
// nem érvényteleníti a foglalást – a foglalás oldalán újraküldhető.
export async function sendAcceptanceMails(o: Offer, s: Settings, bookingId: number, notifyOwner: boolean): Promise<void> {
  const b = await getBooking(bookingId);
  if (b?.email) {
    try {
      await sendViaGmail(guestConfirmationMail(b, s, o.number));
      await db.update(bookings).set({ confirmationSentAt: new Date() }).where(eq(bookings.id, b.id));
    } catch (e) {
      console.error("Foglaló-levél hiba:", e);
    }
  }
  if (notifyOwner) await sendOwnerAcceptedMail(o, s, bookingId);
}
