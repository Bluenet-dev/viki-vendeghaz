import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages, rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendBookingNotification } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, roomSlug, checkIn, checkOut, guests, message } = body;

    if (!name || !email || !roomSlug || !checkIn || !checkOut || !guests) {
      return NextResponse.json({ error: "Hiányzó kötelező mezők." }, { status: 400 });
    }

    // DB mentés
    await db.insert(messages).values({
      type: "booking_request",
      name,
      email,
      phone: phone || null,
      message: message || null,
      roomSlug,
      checkIn,
      checkOut,
      guests: Number(guests),
    });

    // Email küldés (ha van Resend API key)
    if (process.env.RESEND_API_KEY) {
      const [room] = await db.select({ name: rooms.name }).from(rooms).where(eq(rooms.slug, roomSlug));
      await sendBookingNotification({
        name,
        email,
        phone,
        roomName: room?.name ?? roomSlug,
        checkIn,
        checkOut,
        guests: Number(guests),
        message,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Booking API error:", e);
    return NextResponse.json({ error: "Szerverhiba." }, { status: 500 });
  }
}
