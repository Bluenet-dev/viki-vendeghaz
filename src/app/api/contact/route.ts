import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";

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

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Contact API error:", e);
    return NextResponse.json({ error: "Szerverhiba." }, { status: 500 });
  }
}
