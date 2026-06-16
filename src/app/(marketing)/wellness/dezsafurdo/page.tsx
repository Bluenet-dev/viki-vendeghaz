import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dézsafürdő Szilvásvárad",
  description:
    "Kültéri dézsafürdő Szilvásváradon. Csillagos ég alatt, meleg vízben – romantikus kikapcsolódás télen és nyáron. Felfűtési díj 7 000 Ft/nap.",
};

export default function DezsafurdoPage() {
  return (
    <div className="pt-16 bg-stone min-h-screen">
      <section className="bg-ink py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-widest text-salt mb-4">Wellness · Dézsafürdő</p>
          <h1 className="font-display text-5xl sm:text-6xl text-stone font-light mb-6">Dézsafürdő</h1>
          <p className="text-mist/70 text-lg leading-relaxed max-w-2xl">
            A fürdődézsa az egyik legkedveltebb kikapcsolódási lehetőség
            vendégeink körében. Az izmok ellazulnak, a vérkeringés javul, a
            stressz szint csökken, és az ízületek is fájdalommentesebbek lesznek.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="font-display text-3xl text-ink mb-4">Az élményről</h2>
            <p className="text-bark/70 leading-relaxed mb-4">
              A csillagos égbolt alatt, meleg vízben töltött esték felejthetetlen
              élményt nyújtanak – akár télen, akár nyáron. A dézsafürdő különösen
              népszerű romantikus párok és baráti társaságok körében.
            </p>
            <p className="text-bark/70 leading-relaxed">
              A meleg víz és a friss levegő kombinációja páratlan ellazulást
              biztosít a hosszú túrák vagy aktív programok után.
            </p>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-ink/10 p-6">
              <p className="font-mono text-xs uppercase tracking-widest text-salt mb-2">Felfűtési díj</p>
              <p className="font-display text-4xl text-ink">7 000 Ft</p>
              <p className="text-bark/50 text-sm mt-1">/nap</p>
            </div>
            <div className="bg-white rounded-2xl border border-ink/10 p-6">
              <p className="font-mono text-xs uppercase tracking-widest text-salt mb-2">Foglalás</p>
              <p className="text-bark/70 text-sm leading-relaxed">
                Előzetes bejelentés szükséges, hogy a dézsafürdő a kívánt
                időpontra felfűtve készen álljon.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-ink py-14 px-6 text-center">
        <h2 className="font-display text-3xl text-stone mb-6">Foglalja be a dézsafürdőt</h2>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/foglalas" className="px-8 py-3 rounded-full bg-salt text-bark font-sans font-medium hover:bg-salt/90 transition-colors">
            Foglalás
          </Link>
          <Link href="/kapcsolat" className="px-8 py-3 rounded-full border border-mist/30 text-mist font-sans font-medium hover:border-salt hover:text-salt transition-colors">
            Érdeklődöm
          </Link>
        </div>
      </section>
    </div>
  );
}
