import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages, rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendBookingNotification } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, roomSlug, roomLabel, checkIn, checkOut, guests, message, totalPrice, felpanzio, felpanzioFo } = body;

    if (!name || !email || !roomSlug || !checkIn || !checkOut || !guests) {
      return NextResponse.json({ error: "Hiányzó kötelező mezők." }, { status: 400 });
    }

    const FELPANZIO_LABELS: Record<string, string> = {
      reggeli: "Reggeli",
      vacsora: "Vacsora",
      mindketto: "Félpanzió (reggeli + vacsora)",
    };
    const felpanzioLabel = felpanzio ? (FELPANZIO_LABELS[felpanzio] ?? felpanzio) : null;
    const felpanzioNote = felpanzioLabel
      ? `Étkezés: ${felpanzioLabel}, ${felpanzioFo ?? 1} fő`
      : null;
    const fullMessage = [message || null, felpanzioNote].filter(Boolean).join("\n\n") || null;

    const totalPriceNum =
      totalPrice != null && Number.isFinite(Number(totalPrice)) ? Math.round(Number(totalPrice)) : null;

    // Olvasható tárgy: a form által küldött roomLabel, vagy fallback a szoba-táblából / slugból
    let subject = typeof roomLabel === "string" && roomLabel.trim() ? roomLabel.trim() : null;
    if (!subject) {
      const [room] = await db.select({ name: rooms.name }).from(rooms).where(eq(rooms.slug, roomSlug));
      subject = room?.name ?? roomSlug;
    }

    // DB mentés
    await db.insert(messages).values({
      type: "booking_request",
      name,
      email,
      phone: phone || null,
      message: fullMessage,
      roomSlug,
      roomLabel: subject,
      checkIn,
      checkOut,
      guests: Number(guests),
      totalPrice: totalPriceNum,
      felpanzio: felpanzio || null,
      felpanzioFo: felpanzio ? Number(felpanzioFo ?? 1) : null,
    });

    // Email küldés (ha van Resend API key)
    if (process.env.RESEND_API_KEY) {
      await sendBookingNotification({
        name,
        email,
        phone,
        roomName: subject,
        checkIn,
        checkOut,
        guests: Number(guests),
        message: message || undefined,
        totalPrice: totalPriceNum,
        felpanzioLabel: felpanzioLabel ?? undefined,
        felpanzioFo: felpanzio ? Number(felpanzioFo ?? 1) : undefined,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Booking API error:", e);
    return NextResponse.json({ error: "Szerverhiba." }, { status: 500 });
  }
}
