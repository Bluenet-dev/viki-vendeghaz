import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { rooms, pricingRules, gallery } from "@/db/schema";
import { asc, eq, inArray } from "drizzle-orm";
import { getLowestPriceForScope, type RoomScope } from "@/lib/pricing";
import { ROOM_CATEGORIES } from "@/lib/gallery-categories";
import { RoomCards } from "./room-cards";

type GalleryImage = { url: string; alt: string | null };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Szobák & árak | Viki Vendégház Szilvásvárad",
  description:
    "3 külön bejáratú szoba saját fürdőszobával Szilvásváradon: Komfort Kétágyas, Komfort Franciaágyas és Superior szoba (infraszaunával). Összesen 12 főnek, -tól 16 000 Ft/éj.",
};

export default async function SzobakPage() {
  const allRooms = await db
    .select()
    .from(rooms)
    .where(eq(rooms.active, true))
    .orderBy(asc(rooms.sortOrder));

  const allRules = await db.select().from(pricingRules);
  const pricingData = { seasons: [], rules: allRules, holidays: [], holidayPrices: [], settings: null, roomCapacities: [] };

  const galleryRows = await db
    .select({ category: gallery.category, url: gallery.url, alt: gallery.alt })
    .from(gallery)
    .where(inArray(gallery.category, ROOM_CATEGORIES))
    .orderBy(asc(gallery.sortOrder), asc(gallery.id));

  // Szobánként (kategória = szoba slug) csoportosítva, sort_order szerint.
  const roomImages: Record<string, GalleryImage[]> = {};
  for (const row of galleryRows) {
    (roomImages[row.category] ??= []).push({ url: row.url, alt: row.alt });
  }

  const priceLabels: Record<string, string | null> = {};
  for (const room of allRooms) {
    if (!room.slug) continue;
    const lowest = getLowestPriceForScope(room.slug as RoomScope, pricingData);
    priceLabels[room.slug] = lowest != null ? `-tól ${lowest.toLocaleString("hu-HU")} Ft / éj` : null;
  }
  const wholeHouseLowest = getLowestPriceForScope("egesz_haz", pricingData);

  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      {/* Header */}
      <section className="bg-[var(--nav-bg)] py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Szállás</p>
          <h1 className="text-5xl sm:text-6xl text-white font-light mb-6">
            Szobáink
          </h1>
          <p className="text-[var(--nav-text)]/80 text-lg leading-relaxed max-w-2xl">
            Három különálló, tágas szoba – mindegyik saját bejárattal és
            fürdőszobával. Foglaljon egy szobát, kettőt, vagy bérelje az egész
            vendégházat akár 12 fő részére. Nyári szezonban (június–augusztus)
            kizárólag az egész ház foglalható.
          </p>
        </div>
      </section>

      {/* Szobák */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-5xl">
          <RoomCards rooms={allRooms} roomImages={roomImages} priceLabels={priceLabels} />

          <p className="mt-6 text-xs text-[var(--text3)]">
            Nyári szezonban (június–augusztus) az egyes szobák külön nem foglalhatók, csak az egész vendégház.
          </p>
        </div>
      </section>

      {/* Egész ház */}
      <section className="py-8 px-6 pb-16">
        <div className="mx-auto max-w-5xl">
          <div className="bg-[var(--accent-bg)] border border-[#C5D5C5] rounded-xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-[var(--accent)] mb-2">
                Különleges lehetőség
              </p>
              <h2 className="text-2xl text-[var(--text)] font-semibold mb-2">Egész ház bérlése</h2>
              <p className="text-[var(--text2)] max-w-xl leading-relaxed">
                Mind a 3 szoba + nappali · max. 12 fő
                {wholeHouseLowest != null && <> · -tól {wholeHouseLowest.toLocaleString("hu-HU")} Ft / éj</>}
              </p>
            </div>
            <Link
              href="/foglalas"
              className="shrink-0 inline-flex px-6 py-3 rounded-full bg-[var(--nav-bg)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Részletek →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
