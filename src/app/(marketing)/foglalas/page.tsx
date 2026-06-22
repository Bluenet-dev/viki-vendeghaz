import type { Metadata } from "next";
import { db } from "@/db";
import {
  rooms,
  availability,
  seasons,
  pricingRules,
  holidayOverrides,
  holidayPrices,
  pricingSettings,
  roomCapacityPricing,
} from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { BookingForm } from "./booking-form";
import type { PricingData } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Foglalás",
  description:
    "Foglaljon szobát a Viki Vendégházban Szilvásváradon. Ellenőrizze az elérhetőséget és küldjön foglalási kérést.",
};

export default async function FoglalasPage() {
  const allRooms = await db
    .select({
      slug: rooms.slug,
      name: rooms.name,
      capacity: rooms.capacity,
      priceFrom: rooms.priceFrom,
    })
    .from(rooms)
    .where(eq(rooms.active, true))
    .orderBy(asc(rooms.sortOrder));

  const today = new Date().toISOString().slice(0, 10);
  const blockedDays = await db
    .select({ roomSlug: availability.roomSlug, date: availability.date })
    .from(availability)
    .where(eq(availability.status, "blocked"))
    .then((rows) => rows.filter((r) => r.date >= today));

  const [allSeasons, allRules, allHolidays, allHolidayPrices, settingsRows, allRoomCapacities] = await Promise.all([
    db.select().from(seasons).where(eq(seasons.active, true)),
    db.select().from(pricingRules),
    db.select().from(holidayOverrides).where(eq(holidayOverrides.active, true)),
    db.select().from(holidayPrices),
    db.select().from(pricingSettings).limit(1),
    db.select().from(roomCapacityPricing),
  ]);

  const pricingData: PricingData = {
    seasons: allSeasons,
    rules: allRules,
    holidays: allHolidays,
    holidayPrices: allHolidayPrices,
    settings: settingsRows[0] ?? null,
    roomCapacities: allRoomCapacities,
  };

  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      <section className="bg-[var(--nav-bg)] py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Foglalás</p>
          <h1 className="text-5xl sm:text-6xl text-white font-light mb-6">
            Foglalja le szobáját
          </h1>
          <p className="text-[var(--nav-text)]/80 text-lg max-w-xl">
            Válasszon szobát, jelölje ki az érkezési és távozási napot, majd küldje el foglalási kérését.
            Telefonon vagy emailben visszaigazoljuk.
          </p>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="mx-auto max-w-[1000px]">
          <BookingForm rooms={allRooms} blockedDays={blockedDays} pricingData={pricingData} />
        </div>
      </section>

      {/* Alternatív kapcsolat */}
      <section className="py-8 px-6 pb-16">
        <div className="mx-auto max-w-[1000px]">
          <div className="bg-[var(--surface2)] rounded-xl p-6 text-center border border-[var(--border)]">
            <p className="text-xs uppercase tracking-widest text-[var(--text3)] mb-3">Inkább telefonon?</p>
            <a href="tel:+36704108282" className="text-2xl text-[var(--text)] hover:text-[var(--accent)] transition-colors">
              +36 70 410-8282
            </a>
            <p className="text-sm text-[var(--text3)] mt-1">24 órás ügyelet</p>
          </div>
        </div>
      </section>
    </div>
  );
}
