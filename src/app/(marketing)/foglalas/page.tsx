import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Foglalás",
  description:
    "Foglaljon szobát a Viki Vendégházban Szilvásváradon. Ellenőrizze az elérhetőséget és küldjön foglalási kérést.",
};

export default function FoglalasPage() {
  return (
    <div className="pt-16 bg-stone min-h-screen">
      <section className="bg-ink py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-widest text-salt mb-4">Foglalás</p>
          <h1 className="font-display text-5xl sm:text-6xl text-stone font-light mb-6">
            Foglalja le szobáját
          </h1>
          <p className="text-mist/70 text-lg max-w-xl">
            A foglalási naptár és az ár-kalkulátor Fázis 5-ben kerül fel. Addig
            is foglaljon telefonon vagy emailben!
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-xl text-center">
          <div className="bg-white rounded-2xl border border-ink/10 p-10">
            <p className="font-display text-2xl text-ink mb-6">Foglalás most</p>
            <div className="space-y-4">
              <a
                href="tel:+36704108282"
                className="flex items-center justify-center gap-3 w-full py-3 rounded-full bg-salt text-bark font-sans font-medium hover:bg-salt/90 transition-colors"
              >
                📞 +36 70 410-8282
              </a>
              <a
                href="mailto:vikivendeghaz@gmail.com"
                className="flex items-center justify-center gap-3 w-full py-3 rounded-full border border-ink/20 text-ink font-sans font-medium hover:border-ink/40 transition-colors"
              >
                ✉️ vikivendeghaz@gmail.com
              </a>
            </div>
            <p className="mt-6 text-xs text-bark/40">24 órás ügyelet · Gyors visszajelzés</p>
          </div>
        </div>
      </section>
    </div>
  );
}
