import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { wellnessServices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { WellnessHeroImage } from "@/components/wellness-hero-image";

export const metadata: Metadata = {
  title: "Finn szauna Szilvásvárad",
  description:
    "Hagyományos finn gőzszauna Szilvásváradon. Méregtelenítés, izomrelaxáció, vérkeringés-javítás. 1 500 Ft/fő/óra, 21:00-ig.",
};

export default async function FinnSzaunaPage() {
  const [service] = await db.select().from(wellnessServices).where(eq(wellnessServices.slug, "finn-szauna"));
  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      <section className="bg-[var(--nav-bg)] py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Wellness · Finn szauna</p>
          <h1 className="text-5xl sm:text-6xl text-white font-light mb-6">Finn szauna</h1>
          <p className="text-[var(--nav-text)]/80 text-lg leading-relaxed max-w-2xl">
            A hagyományos finn gőzszauna az egyik legkedveltebb kikapcsolódási
            lehetőség vendégeink körében. Az izzadás révén a méreganyagok
            távoznak a szervezetből, az izmok ellazulnak, a vérkeringés javul és
            a stressz szint csökken.
          </p>
          <WellnessHeroImage category="finn-szauna" />
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-3xl text-[var(--text)] mb-4">Hatásai</h2>
            <ul className="space-y-3">
              {[
                "Méregtelenítés – izzadással méreganyagok távoznak",
                "Izomrelaxáció – feszültség és görcsök oldódnak",
                "Vérkeringés-javítás – szív- és érrendszer erősítése",
                "Stressz-csökkentés – mentális feltöltődés",
                "Bőrápolás – pórusok megnyílnak, bőr megújul",
              ].map((h) => (
                <li key={h} className="flex items-start gap-3 text-[var(--text)]/70 text-sm">
                  <span className="mt-1.5 w-4 h-0.5 bg-[var(--accent)] inline-block flex-shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
              <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-2">Ár</p>
              <p className="text-4xl text-[var(--text)]">{service?.guestPriceLabel ?? "1 500 Ft"}</p>
              <p className="text-[var(--text)]/50 text-sm mt-1">{service?.externalPriceLabel ?? "Csak szállóvendégeknek"}</p>
            </div>
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
              <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-2">Nyitvatartás</p>
              <p className="text-2xl text-[var(--text)]">{service?.openingHours ?? "21:00-ig"}</p>
              <p className="text-[var(--text)]/50 text-sm mt-1">{service?.note ?? "Előre egyeztetés szükséges"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--nav-bg)] py-14 px-6 text-center">
        <h2 className="text-3xl text-white mb-6">Kérdése van vagy foglalna?</h2>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/foglalas" className="px-8 py-3 rounded-full bg-[var(--accent2)] text-[var(--text)] font-sans font-medium hover:bg-[var(--accent2)]/90 transition-colors">
            Foglalás
          </Link>
          <Link href="/kapcsolat" className="px-8 py-3 rounded-full border border-white/35 text-white font-sans font-medium hover:bg-white/5 transition-colors">
            Kapcsolat
          </Link>
        </div>
      </section>
    </div>
  );
}
