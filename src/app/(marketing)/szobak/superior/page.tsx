import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { rooms, pricingRules, gallery } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getLowestPriceForScope } from "@/lib/pricing";
import { RoomDetailGallery } from "@/components/room-detail-gallery";
import { RoomPricingTable } from "@/components/room-pricing-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Superior Szoba | Viki Vendégház Szilvásvárad – Infraszaunával",
  description:
    "Superior szoba saját infraszaunával, franciaággyal és kihúzható kanapéval, max. 4 fő részére. Szilvásvárad legjobb szobája. -tól 22 000 Ft/éj.",
};

export default async function SuperiorPage() {
  const [room] = await db.select().from(rooms).where(eq(rooms.slug, "superior"));
  const allRules = await db.select().from(pricingRules);
  const pricingData = { seasons: [], rules: allRules, holidays: [], holidayPrices: [], settings: null, roomCapacities: [] };
  const lowest = getLowestPriceForScope("superior", pricingData);

  const images = await db
    .select({ url: gallery.url, alt: gallery.alt })
    .from(gallery)
    .where(eq(gallery.category, "superior"))
    .orderBy(asc(gallery.sortOrder), asc(gallery.id));

  const amenities = room?.amenities
    ? room.amenities.split(",").map((s) => s.trim()).filter(Boolean)
    : ["Franciaágy", "Kihúzható kanapé", "Saját infraszauna", "Saját fürdőszoba", "WiFi", "TV", "Max. 4 fő"];

  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      <section className="bg-[var(--nav-bg)] py-14 px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-2">Szobák</p>
          <p className="text-[var(--nav-text)]/60 text-sm">
            <Link href="/szobak" className="hover:text-[var(--accent2)] transition-colors">← Összes szoba</Link>
          </p>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="mx-auto max-w-5xl grid md:grid-cols-2 gap-10 items-start">
          {/* Bal: képgaléria */}
          <RoomDetailGallery images={images} roomName={room?.name ?? "Superior Szoba"} />

          {/* Jobb: részletek */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-semibold text-[var(--text)]">
                {room?.name ?? "Superior Szoba"}
              </h1>
              <span className="px-2.5 py-1 rounded-full bg-[var(--accent2-bg)] text-[var(--accent2)] text-[12px] font-semibold uppercase tracking-wide shrink-0">
                Legjobb szoba
              </span>
            </div>

            {/* Ár */}
            <div className="mb-5 p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
              <p className="text-2xl font-bold text-[var(--accent)]">
                {lowest != null ? `-tól ${lowest.toLocaleString("hu-HU")} Ft` : "Árak megtekintése"}
                <span className="text-base font-normal text-[var(--text2)]"> / éj</span>
              </p>
              <p className="text-xs text-[var(--text3)] mt-1">Szezon és vendégszám szerint változik</p>
              <Link href="/szobak#arak" className="text-xs text-[var(--accent)] hover:underline mt-1 inline-block">
                Árak megtekintése →
              </Link>
            </div>

            {/* Felszereltség badge-ek */}
            {amenities.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {amenities.map((a) => (
                  <span
                    key={a}
                    className="px-3 py-1 rounded-full bg-[var(--surface2)] border border-[var(--border)] text-xs text-[var(--text2)]"
                  >
                    {a}
                  </span>
                ))}
              </div>
            )}

            {/* Leírás */}
            <div className="space-y-3 text-[var(--text)]/70 text-sm leading-relaxed mb-6">
              {room?.description ? (
                <p>{room.description}</p>
              ) : (
                <>
                  <p>
                    A Superior szoba a vendégház legnagyobb és legexkluzívabb szobája, saját infraszaunával felszerelve – ez az egyetlen ilyen szoba Szilvásváradon.
                  </p>
                  <p>
                    A franciaágy mellé kihúzható kanapé is rendelkezésre áll, így akár 4 fő is kényelemben pihenhet. Saját bejárat, teljes fürdőszoba, és közvetlen terasz-kapcsolat a kerttel.
                  </p>
                </>
              )}
            </div>

            {/* Különlegesség */}
            <div className="mb-6 p-4 rounded-xl bg-[var(--accent2-bg)] border border-[var(--accent2)]/30">
              <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-1">Exkluzív</p>
              <p className="text-sm font-semibold text-[var(--text)]">Infraszauna közvetlenül a szobában</p>
              <p className="text-xs text-[var(--text2)] mt-0.5">Nem kell megosztani – csak Öné az egész este</p>
            </div>

            {/* Árazás részletesen */}
            <div className="mb-6">
              <RoomPricingTable roomScope="superior" />
            </div>

            {/* CTA */}
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/foglalas?room=superior"
                className="px-6 py-3 rounded-full bg-[var(--accent2)] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Foglaljon most →
              </Link>
              <Link
                href="/szobak"
                className="px-6 py-3 rounded-full border border-[var(--border)] text-[var(--text2)] font-semibold text-sm hover:border-[var(--accent)] transition-colors"
              >
                ← Vissza a szobákhoz
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Superior extra szekció */}
      <section className="py-14 px-6 bg-[var(--surface)]">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-2">Miért érdemes?</p>
          <h2 className="text-2xl font-semibold text-[var(--text)] mb-8">Miért válassza a Superior szobát?</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                title: "Infraszauna a szobában",
                desc: "Saját privát infraszauna – bármikor, akármeddig, csak Önnek.",
              },
              {
                title: "Franciaágy + kihúzható kanapé",
                desc: "Rugalmas alvási elrendezés párnak és 3-4 fős kis csapatnak egyaránt.",
              },
              {
                title: "Max. 4 fő",
                desc: "A legnagyobb kapacitású szoba – ideális kiscsaládoknak és baráti pároknak.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-[var(--bg)] rounded-xl border border-[var(--border)] p-6"
              >
                <div className="flex gap-1 mb-3">
                  <div className="w-4 h-1 bg-[var(--accent2)] rounded-sm" />
                  <div className="w-4 h-1 bg-[var(--accent)] rounded-sm" />
                </div>
                <p className="font-semibold text-[var(--text)] mb-1">{card.title}</p>
                <p className="text-sm text-[var(--text2)] leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
