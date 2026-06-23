import type { Metadata } from "next";
import { db } from "@/db";
import { gallery } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { BentoGallery } from "@/components/bento-gallery";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Étkezés & félpanzió | Viki Vendégház Szilvásvárad",
  description:
    "Reggeli és vacsora (félpanzió) igény szerint, kültéri konyha, BBQ, bográcsos hely, kemence és grillező Szilvásváradon. Friss levegőn, otthonos hangulatban.",
};

const facilities = [
  { name: "Szabadtéri konyha", desc: "Teljesen felszerelt kültéri konyha" },
  { name: "Sparhelt", desc: "Hagyományos, sparhelten készült ételek" },
  { name: "BBQ sütő", desc: "Amerikai típusú grillezéshez" },
  { name: "Bográcsos hely", desc: "Tradicionális bográcsozás a szabadban" },
  { name: "Kemence", desc: "Hagyományos kemencés ételek" },
  { name: "Szalonnasütő", desc: "Klasszikus tábortűzi élmény" },
  { name: "Grillező", desc: "Gyors kerti grill vacsorákhoz" },
];

export default async function EtekezesPage() {
  const gasthausImages = await db
    .select({ url: gallery.url, alt: gallery.alt })
    .from(gallery)
    .where(eq(gallery.category, "etkezes"))
    .orderBy(asc(gallery.sortOrder), asc(gallery.id));

  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      <section className="bg-[var(--nav-bg)] py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Étkezés</p>
          <h1 className="text-5xl sm:text-6xl text-white font-light mb-6">
            Főzés a friss levegőn
          </h1>
          <p className="text-[var(--nav-text)]/80 text-lg leading-relaxed max-w-2xl">
            A Viki Vendégházban az étkezés is élmény – akár friss levegőn
            grilleznek a vendégek, akár reggeli mellé ülnek le pihenni.
            Igény esetén reggelit és vacsorát is biztosítunk.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl text-[var(--text)] mb-8">Kültéri főzési lehetőségek</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {facilities.map((f) => (
              <div key={f.name} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
                <div className="flex gap-1 mb-3">
                  <div className="w-4 h-1 bg-[var(--accent)] rounded-sm" />
                  <div className="w-4 h-1 bg-[var(--accent2)] rounded-sm" />
                </div>
                <p className="text-lg text-[var(--text)]">{f.name}</p>
                <p className="mt-1 text-sm text-[var(--text)]/60">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Reggeli & félpanzió */}
          <div className="mt-12 bg-[var(--nav-bg)] rounded-2xl p-8">
            <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-3">
              Étkezési lehetőség
            </p>
            <h3 className="text-2xl text-white mb-4">Reggeli & félpanzió</h3>
            <p className="text-[var(--nav-text)]/80 leading-relaxed mb-8 max-w-2xl">
              A Viki Vendégháztól fél percre, a Gasthaus étteremben reggelizhet
              és vacsorázhat – egy hangulatos, helyi étteremben, ahol nem kell
              sem autó, sem előre tervezés. Séta le, foglaljon asztalt, és élvezze
              a friss, meleg ételt a Bükk lábánál. Közvetlen partnerünk.
            </p>

            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/5 rounded-xl p-5">
                <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-2">Reggeli</p>
                <p className="text-white text-lg font-semibold mb-1">3 800 Ft / fő</p>
                <p className="text-[var(--nav-text)]/60 text-sm">08:00 – 10:00</p>
                <p className="text-[var(--nav-text)]/60 text-sm">3 meleg étel, naponta változó</p>
              </div>
              <div className="bg-white/5 rounded-xl p-5">
                <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-2">Vacsora</p>
                <p className="text-white text-lg font-semibold mb-1">5 200 Ft / fő</p>
                <p className="text-[var(--nav-text)]/60 text-sm">17:00 – 19:30</p>
                <p className="text-[var(--nav-text)]/60 text-sm">Meleg vacsora</p>
              </div>
              <div className="bg-[var(--accent2)]/15 border border-[var(--accent2)]/30 rounded-xl p-5">
                <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-2">Félpanzió</p>
                <p className="text-white text-lg font-semibold mb-1">9 000 Ft / fő / nap</p>
                <p className="text-[var(--nav-text)]/60 text-sm">Reggeli + vacsora együtt</p>
              </div>
            </div>

            <p className="text-[var(--nav-text)]/50 text-sm">
              Az étkezést a foglaláskor vagy legkésőbb egy nappal érkezés előtt kérjük jelezni.
              Érdeklődjön az aktuális menüről!
            </p>

            {gasthausImages.length > 0 && (
              <div className="mt-10">
                <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Gasthaus – képek</p>
                <BentoGallery images={gasthausImages} />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
