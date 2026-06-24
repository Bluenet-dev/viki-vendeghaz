import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { rooms, pricingRules, gallery } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getLowestPriceForScope } from "@/lib/pricing";
import { RoomDetailGallery } from "@/components/room-detail-gallery";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Komfort Franciaágyas Szoba | Viki Vendégház Szilvásvárad",
  description:
    "Komfort Franciaágyas szoba saját fürdőszobával és pótágylehetőséggel. -tól 16 000 Ft/éj. Sóbarlang szállóvendégeknek ingyenes – 45 perc/fő/nap.",
};

export default async function KomfortFranciaagyasPage() {
  const [room] = await db.select().from(rooms).where(eq(rooms.slug, "szoba-2"));
  const allRules = await db.select().from(pricingRules);
  const pricingData = { seasons: [], rules: allRules, holidays: [], holidayPrices: [], settings: null, roomCapacities: [] };
  const lowest = getLowestPriceForScope("szoba-2", pricingData);

  const images = await db
    .select({ url: gallery.url, alt: gallery.alt })
    .from(gallery)
    .where(eq(gallery.category, "szoba-2"))
    .orderBy(asc(gallery.sortOrder), asc(gallery.id));

  const amenities = room?.amenities
    ? room.amenities.split(",").map((s) => s.trim()).filter(Boolean)
    : ["Franciaágy", "Pótágy", "Saját fürdőszoba", "WiFi", "TV", "Max. 3 fő"];

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
          <RoomDetailGallery images={images} roomName={room?.name ?? "Komfort Franciaágyas Szoba"} />

          {/* Jobb: részletek */}
          <div>
            <h1 className="text-3xl font-semibold text-[var(--text)] mb-2">
              {room?.name ?? "Komfort Franciaágyas Szoba"}
            </h1>

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
                    A Komfort Franciaágyas szoba romantikus hangulatot áraszt a nagy méretű franciaággyal, melyhez szükség esetén pótágy is biztosítható.
                  </p>
                  <p>
                    Saját bejárat, teljes értékű fürdőszoba és közvetlen kijárat az udvarra – ideális párokat és kiscsaládokat egyaránt.
                  </p>
                </>
              )}
            </div>

            {/* Különlegesség */}
            <div className="mb-6 p-4 rounded-xl bg-[var(--accent-bg)] border border-[#C5D5C5]">
              <p className="text-xs uppercase tracking-widest text-[var(--accent)] mb-1">Szállóvendégeknek</p>
              <p className="text-sm font-semibold text-[var(--text)]">Sóbarlang ingyenes – 45 perc / fő / nap</p>
              <p className="text-xs text-[var(--text2)] mt-0.5">Finn szauna, infraszauna és dézsafürdő szintén elérhető</p>
            </div>

            {/* CTA */}
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/foglalas?room=komfort-franciaagyas"
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
    </div>
  );
}
