import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Étkezés",
  description:
    "Kültéri konyha, BBQ, bográcsos hely, kemence, szalonnasütő és grillező a Viki Vendégházban. Friss levegőn, közösen főzve.",
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

export default function EtekezesPage() {
  return (
    <div className="pt-16 bg-stone min-h-screen">
      <section className="bg-ink py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-widest text-salt mb-4">Étkezés</p>
          <h1 className="font-display text-5xl sm:text-6xl text-stone font-light mb-6">
            Főzés a friss levegőn
          </h1>
          <p className="text-mist/70 text-lg leading-relaxed max-w-2xl">
            Amennyiben szívesen főz a szabadban, vagy szeretne közösen időt
            tölteni családjával, barátaival a friss levegőn, a Viki Vendégház
            kültéri közösségi terei kiváló lehetőséget kínálnak.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display text-3xl text-ink mb-8">Kültéri főzési lehetőségek</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {facilities.map((f) => (
              <div key={f.name} className="bg-white rounded-2xl border border-ink/10 p-6">
                <div className="flex gap-1 mb-3">
                  <div className="w-4 h-1 bg-moss rounded-sm" />
                  <div className="w-4 h-1 bg-salt rounded-sm" />
                </div>
                <p className="font-display text-lg text-ink">{f.name}</p>
                <p className="mt-1 text-sm text-bark/60">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Reggeli / félpanzió placeholder */}
          <div className="mt-12 bg-ink rounded-2xl p-8">
            <p className="font-mono text-xs uppercase tracking-widest text-salt mb-3">Hamarosan</p>
            <h3 className="font-display text-2xl text-stone mb-3">Reggeli & félpanzió</h3>
            <p className="text-mist/60 leading-relaxed">
              Hamarosan részletes tájékoztatót adunk reggelizési és félpanzió
              lehetőségeinkről. Érdeklődjön a foglaláskor!
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
