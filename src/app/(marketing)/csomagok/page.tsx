import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Csomagajánlatok",
  description:
    "Szezonális csomagajánlatok és akciók a Viki Vendégházban. Foglaljon wellness-hétvégét Szilvásváradon!",
};

export default function CsomagokPage() {
  return (
    <div className="pt-16 bg-stone min-h-screen">
      <section className="bg-ink py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-widest text-salt mb-4">Ajánlatok</p>
          <h1 className="font-display text-5xl sm:text-6xl text-stone font-light mb-6">
            Csomagajánlatok
          </h1>
          <p className="text-mist/70 text-lg leading-relaxed max-w-2xl">
            Szezonális csomagjaink és különleges ajánlataink hamarosan elérhetők.
            Addig is keressen minket, és egyedi igényei alapján személyre szabott
            ajánlatot készítünk Önnek.
          </p>
        </div>
      </section>

      <section className="py-20 px-6 text-center">
        <div className="mx-auto max-w-xl">
          <div className="flex justify-center gap-1 mb-8">
            <div className="w-8 h-2 bg-moss rounded-sm" />
            <div className="w-8 h-2 bg-salt rounded-sm" />
          </div>
          <h2 className="font-display text-3xl text-ink mb-4">Csomagok hamarosan</h2>
          <p className="text-bark/60 leading-relaxed mb-8">
            Jelenleg állítjuk össze szezonális ajánlatainkat. Érdeklődjön
            személyesen – szívesen állítunk össze Önre szabott ajánlatot!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/kapcsolat"
              className="px-8 py-3 rounded-full bg-salt text-bark font-sans font-medium hover:bg-salt/90 transition-colors"
            >
              Kérek egyedi ajánlatot
            </Link>
            <Link
              href="/foglalas"
              className="px-8 py-3 rounded-full border border-ink/20 text-bark font-sans font-medium hover:border-ink/40 transition-colors"
            >
              Foglalás
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
