import { db } from "@/db";
import { bookings, offers } from "@/db/schema";
import { offersEnabled } from "@/modules/offers/flag";
import type { RevBooking, RevOffer } from "@/lib/revenue";

// A Bevételek számításához kellő mezők (az oldal, a CSV és az Áttekintés kártyája is ezt használja).
export async function loadRevenueInput(): Promise<{ bookings: RevBooking[]; offers: RevOffer[] }> {
  const [b, o] = await Promise.all([
    db
      .select({
        id: bookings.id,
        name: bookings.name,
        status: bookings.status,
        source: bookings.source,
        roomScope: bookings.roomScope,
        checkIn: bookings.checkIn,
        checkOut: bookings.checkOut,
        total: bookings.total,
        depositAmount: bookings.depositAmount,
        depositReceivedAt: bookings.depositReceivedAt,
        lines: bookings.lines,
      })
      .from(bookings),
    offersEnabled()
      ? db
          .select({ status: offers.status, kind: offers.kind, checkIn: offers.checkIn, validUntil: offers.validUntil, total: offers.total, lines: offers.lines })
          .from(offers)
      : Promise.resolve([] as RevOffer[]),
  ]);
  return { bookings: b, offers: o };
}
