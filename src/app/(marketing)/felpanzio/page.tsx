import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { gallery } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { BentoGallery } from "@/components/bento-gallery";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Félpanzió | Viki Vendégház Szilvásvárad – Reggeli & vacsora partnerétteremben",
  description:
    "Reggeli (3 800 Ft/fő) és vacsora (5 200 Ft/fő) igény szerint, a vendégháztól fél percre lévő partnerétteremben. Félpanzió csomag: 9 000 Ft/fő/nap.",
};

export default async function FelpanzioPage() {
  const gasthausImages = await db
    .select({ url: gallery.url, alt: gallery.alt })
    .from(gallery)
    .where(eq(gallery.category, "gasthaus"))
    .orderBy(asc(gallery.sortOrder), asc(gallery.id));

  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      {/* Header */}
      <section className="bg-[var(--nav-bg)] py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Étkezés</p>
          <h1 className="text-5xl sm:text-6xl text-white font-light mb-6">
            Reggeli & vacsora partnerétteremben
          </h1>
          <p className="text-[var(--nav-text)]/80 text-lg leading-relaxed max-w-2xl">
            A Viki Vendégháztól fél percre, egy hangulatos helyi étteremben reggelizhet és
            vacsorázhat – sétatávolságra, előre tervezés nélkül.
          </p>
        </div>
      </section>

      {/* Árkártyák */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="grid sm:grid-cols-3 gap-5 mb-12">
            {/* Reggeli */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
              <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-3">Reggeli</p>
              <p className="text-3xl font-bold text-[var(--text)] mb-1">3 800 Ft</p>
              <p className="text-sm text-[var(--text2)] mb-4">/ fő</p>
              <ul className="space-y-1.5 text-sm text-[var(--text2)]">
                <li>08:00 – 10:00</li>
                <li>3 meleg étel</li>
                <li>Naponta változó menü</li>
              </ul>
            </div>

            {/* Vacsora */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
              <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-3">Vacsora</p>
              <p className="text-3xl font-bold text-[var(--text)] mb-1">5 200 Ft</p>
              <p className="text-sm text-[var(--text2)] mb-4">/ fő</p>
              <ul className="space-y-1.5 text-sm text-[var(--text2)]">
                <li>17:00 – 19:30</li>
                <li>Meleg vacsora</li>
                <li>Helyi alapanyagok</li>
              </ul>
            </div>

            {/* Félpanzió */}
            <div className="bg-[var(--nav-bg)] border border-[var(--accent2)]/30 rounded-xl p-6">
              <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-3">Félpanzió</p>
              <p className="text-3xl font-bold text-white mb-1">9 000 Ft</p>
              <p className="text-sm text-[var(--nav-text)]/70 mb-4">/ fő / nap</p>
              <ul className="space-y-1.5 text-sm text-[var(--nav-text)]/70">
                <li>Reggeli + vacsora</li>
                <li>Kedvezményes csomag</li>
                <li>Napi 1 800 Ft megtakarítás</li>
              </ul>
            </div>
          </div>

          {/* Infó blokk */}
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 mb-10 space-y-2">
            <p className="text-sm text-[var(--text2)]">
              Az étkezést a foglaláskor vagy legkésőbb egy nappal érkezés előtt kérjük jelezni.
            </p>
            <p className="text-sm text-[var(--text2)]">
              Érdeklődjön az aktuális menüről:{" "}
              <a href="tel:+36704108282" className="text-[var(--accent)] hover:underline font-medium">
                +36 70 410-8282
              </a>
            </p>
          </div>

          {/* Galéria */}
          {gasthausImages.length > 0 && (
            <div className="mb-12">
              <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Étterem – képek</p>
              <BentoGallery images={gasthausImages} />
            </div>
          )}

          {/* CTA */}
          <div className="text-center">
            <Link
              href="/foglalas"
              className="inline-flex px-8 py-3 rounded-full bg-[var(--accent2)] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Foglaljon szobát →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
