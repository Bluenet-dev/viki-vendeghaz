import { Resend } from "resend";

interface BookingEmailData {
  name: string;
  email: string;
  phone?: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  message?: string;
}

export async function sendBookingNotification(data: BookingEmailData) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const nights =
    Math.round(
      (new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) /
        (1000 * 60 * 60 * 24)
    );

  // Email a tulajdonosnak
  // TODO: domain hitelesítés után visszaállítani: noreply@vikivendeghaz.hu
  const fromAddress = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  await resend.emails.send({
    from: `Viki Vendégház <${fromAddress}>`,
    to: "vikivendeghaz@gmail.com",
    subject: `Új foglalási kérés – ${data.name} (${data.checkIn})`,
    html: `
      <h2>Új foglalási kérés érkezett</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:6px 12px;font-weight:bold">Vendég neve:</td><td style="padding:6px 12px">${data.name}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold">Email:</td><td style="padding:6px 12px"><a href="mailto:${data.email}">${data.email}</a></td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold">Telefon:</td><td style="padding:6px 12px">${data.phone ?? "—"}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold">Szoba:</td><td style="padding:6px 12px">${data.roomName}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold">Érkezés:</td><td style="padding:6px 12px">${data.checkIn}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold">Távozás:</td><td style="padding:6px 12px">${data.checkOut}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold">Éjszakák:</td><td style="padding:6px 12px">${nights}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold">Vendégek:</td><td style="padding:6px 12px">${data.guests} fő</td></tr>
        ${data.message ? `<tr><td style="padding:6px 12px;font-weight:bold;vertical-align:top">Megjegyzés:</td><td style="padding:6px 12px">${data.message}</td></tr>` : ""}
      </table>
      <p style="margin-top:24px;color:#666">Ez az üzenet a vikivendeghaz.hu foglalási rendszeréből érkezett.</p>
    `,
  });

  // Visszaigazolás a vendégnek
  await resend.emails.send({
    from: `Viki Vendégház <${fromAddress}>`,
    to: data.email,
    subject: "Foglalási kérés megérkezett – Viki Vendégház",
    html: `
      <h2>Köszönjük foglalási kérését!</h2>
      <p>Kedves ${data.name}!</p>
      <p>Foglalási kérése megérkezett. Hamarosan felvesszük Önnel a kapcsolatot a megerősítéshez.</p>
      <h3>Foglalás részletei:</h3>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:6px 12px;font-weight:bold">Szoba:</td><td style="padding:6px 12px">${data.roomName}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold">Érkezés:</td><td style="padding:6px 12px">${data.checkIn}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold">Távozás:</td><td style="padding:6px 12px">${data.checkOut}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold">Éjszakák száma:</td><td style="padding:6px 12px">${nights}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold">Vendégek száma:</td><td style="padding:6px 12px">${data.guests} fő</td></tr>
      </table>
      <p style="margin-top:24px">Kérdés esetén hívjon minket: <strong>+36 70 410-8282</strong> (24 h)</p>
      <p>Üdvözlettel,<br><strong>Viki Vendégház</strong><br>3348 Szilvásvárad, Dózsa György utca 45.</p>
    `,
  });
}
