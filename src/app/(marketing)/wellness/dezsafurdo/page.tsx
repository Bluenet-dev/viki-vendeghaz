import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { wellnessServices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { WellnessHeroImage } from "@/components/wellness-hero-image";

export const metadata: Metadata = {
  title: "Dézsafürdő Szilvásvárad",
  description:
    "Kültéri dézsafürdő Szilvásváradon. Csillagos ég alatt, meleg vízben – romantikus kikapcsolódás télen és nyáron. Felfűtési díj 7 000 Ft/nap.",
};

export default async function DezsafurdoPage() {
  const [service] = await db.select().from(wellnessServices).where(eq(wellnessServices.slug, "dezsafurdo"));
  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      <section className="bg-[var(--nav-bg)] py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Wellness · Dézsafürdő</p>
          <h1 className="text-5xl sm:text-6xl text-white font-light mb-6">Dézsafürdő</h1>
          <p className="text-[var(--nav-text)]/80 text-lg leading-relaxed max-w-2xl">
            A fürdődézsa az egyik legkedveltebb kikapcsolódási lehetőség
            vendégeink körében. Az izmok ellazulnak, a vérkeringés javul, a
            stressz szint csökken, és az ízületek is fájdalommentesebbek lesznek.
          </p>
          <WellnessHeroImage category="dezsafurdo" />
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-3xl text-[var(--text)] mb-4">Az élményről</h2>
            <p className="text-[var(--text)]/70 leading-relaxed mb-4">
              A csillagos égbolt alatt, meleg vízben töltött esték felejthetetlen
              élményt nyújtanak – akár télen, akár nyáron. A dézsafürdő különösen
              népszerű romantikus párok és baráti társaságok körében.
            </p>
            <p className="text-[var(--text)]/70 leading-relaxed">
              A meleg víz és a friss levegő kombinációja páratlan ellazulást
              biztosít a hosszú túrák vagy aktív programok után.
            </p>
          </div>
          <div className="space-y-4">
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
              <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-2">Felfűtési díj</p>
              <p className="text-4xl text-[var(--text)]">{service?.guestPriceLabel ?? "7 000 Ft"}</p>
              <p className="text-[var(--text)]/50 text-sm mt-1">{service?.openingHours ?? "23:00-ig"}</p>
            </div>
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
              <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-2">Foglalás</p>
              <p className="text-[var(--text)]/70 text-sm leading-relaxed">
                {service?.note ?? "Előzetes bejelentés szükséges, hogy a dézsafürdő a kívánt időpontra felfűtve készen álljon."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--nav-bg)] py-14 px-6 text-center">
        <h2 className="text-3xl text-white mb-6">Foglalja be a dézsafürdőt</h2>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/foglalas" className="px-8 py-3 rounded-full bg-[var(--accent2)] text-[var(--text)] font-sans font-medium hover:bg-[var(--accent2)]/90 transition-colors">
            Foglalás
          </Link>
          <Link href="/kapcsolat" className="px-8 py-3 rounded-full border border-white/35 text-white font-sans font-medium hover:bg-white/5 transition-colors">
            Érdeklődöm
          </Link>
        </div>
      </section>
    </div>
  );
}
