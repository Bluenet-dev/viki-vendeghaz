import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Galéria",
  description:
    "Képek a Viki Vendégházból: szobák, sóbarlang, wellness, kert és Szilvásvárad.",
};

export default function GaleriaPage() {
  return (
    <div className="pt-16 bg-stone min-h-screen">
      <section className="bg-ink py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-widest text-salt mb-4">Galéria</p>
          <h1 className="font-display text-5xl sm:text-6xl text-stone font-light mb-6">
            Képek a vendégházból
          </h1>
          <p className="text-mist/70 text-lg max-w-xl">
            Szobák, sóbarlang, wellness, kert, udvar és a környező természet –
            valós fotók a Viki Vendégházról.
          </p>
        </div>
      </section>

      <section className="py-20 px-6 text-center">
        <div className="mx-auto max-w-xl">
          <div className="flex justify-center gap-1 mb-8">
            <div className="w-8 h-2 bg-moss rounded-sm" />
            <div className="w-8 h-2 bg-salt rounded-sm" />
          </div>
          <p className="font-display text-2xl text-ink mb-3">Képek hamarosan</p>
          <p className="text-bark/50 leading-relaxed">
            A valós fotókat a nyitás után töltjük fel. Addig is keressen
            minket és szívesen küldünk képeket emailben!
          </p>
        </div>
      </section>
    </div>
  );
}
