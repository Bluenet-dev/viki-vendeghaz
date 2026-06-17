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

  const [allSeasons, allRules, allHolidays, allHolidayPrices, settingsRows] = await Promise.all([
    db.select().from(seasons).where(eq(seasons.active, true)),
    db.select().from(pricingRules),
    db.select().from(holidayOverrides).where(eq(holidayOverrides.active, true)),
    db.select().from(holidayPrices),
    db.select().from(pricingSettings).limit(1),
  ]);

  const pricingData: PricingData = {
    seasons: allSeasons,
    rules: allRules,
    holidays: allHolidays,
    holidayPrices: allHolidayPrices,
    settings: settingsRows[0] ?? null,
  };

  return (
    <div className="pt-16 bg-stone min-h-screen">
      <section className="bg-ink py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-widest text-salt mb-4">Foglalás</p>
          <h1 className="font-display text-5xl sm:text-6xl text-stone font-light mb-6">
            Foglalja le szobáját
          </h1>
          <p className="text-mist/70 text-lg max-w-xl">
            Válasszon szobát, jelölje ki az érkezési és távozási napot, majd küldje el foglalási kérését.
            Telefonon vagy emailben visszaigazoljuk.
          </p>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="mx-auto max-w-2xl">
          <BookingForm rooms={allRooms} blockedDays={blockedDays} pricingData={pricingData} />
        </div>
      </section>

      {/* Alternatív kapcsolat */}
      <section className="py-8 px-6 pb-16">
        <div className="mx-auto max-w-2xl">
          <div className="bg-ink/5 rounded-2xl p-6 text-center border border-ink/8">
            <p className="font-mono text-xs uppercase tracking-widest text-bark/40 mb-3">Inkább telefonon?</p>
            <a href="tel:+36704108282" className="font-display text-2xl text-ink hover:text-moss transition-colors">
              +36 70 410-8282
            </a>
            <p className="text-sm text-bark/40 mt-1">24 órás ügyelet</p>
          </div>
        </div>
      </section>
    </div>
  );
}
