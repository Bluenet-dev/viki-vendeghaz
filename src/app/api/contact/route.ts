import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type = "contact", name, email, phone, message, roomSlug, checkIn, checkOut, guests } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Név és email kötelező." }, { status: 400 });
    }

    await db.insert(messages).values({
      type,
      name,
      email,
      phone: phone || null,
      message: message || null,
      roomSlug: roomSlug || null,
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      guests: guests ? Number(guests) : null,
    });

    // Email értesítés a tulajdonosnak
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromAddress = process.env.RESEND_FROM_EMAIL ?? "noreply@vikivendeghaz.hu";
      await resend.emails.send({
        from: `Viki Vendégház <${fromAddress}>`,
        to: "vikivendeghaz@gmail.com",
        subject: `Új üzenet a weboldalról – ${name}`,
        html: `
          <h2>Új üzenet érkezett a kapcsolati űrlapon</h2>
          <table style="border-collapse:collapse;width:100%">
            <tr><td style="padding:6px 12px;font-weight:bold">Név:</td><td style="padding:6px 12px">${name}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold">Email:</td><td style="padding:6px 12px"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold">Telefon:</td><td style="padding:6px 12px">${phone ?? "—"}</td></tr>
            ${message ? `<tr><td style="padding:6px 12px;font-weight:bold;vertical-align:top">Üzenet:</td><td style="padding:6px 12px">${message}</td></tr>` : ""}
          </table>
          <p style="margin-top:24px;color:#666">Ez az üzenet a vikivendeghaz.hu kapcsolati űrlapjáról érkezett.</p>
        `,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Contact API error:", e);
    return NextResponse.json({ error: "Szerverhiba." }, { status: 500 });
  }
}
