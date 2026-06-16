import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sóbarlang Szilvásvárad",
  description:
    "Sóbarlang Szilvásváradon: 5 tonna himalája és parajdi só, 14 m², 6 férőhely. Légzőszervi, allergiás panaszok enyhítése, mély relaxáció. Szállóvendégeknek 45 perc/nap ingyenes.",
};

const egyeniArak = [
  { tipus: "Felnőtt (külsős)", ar: "1 250 Ft" },
  { tipus: "Gyermek 2 éves korig", ar: "Ingyenes" },
  { tipus: "Diák (18 évesig) / nyugdíjas", ar: "950 Ft" },
  { tipus: "Gyermek + kísérő felnőtt", ar: "1 500 Ft" },
  { tipus: "2 gyermek + 1 felnőtt", ar: "2 000 Ft" },
  { tipus: "Családi (2 felnőtt + 2 gyermek)", ar: "2 600 Ft" },
  { tipus: "Gyermek kieg. jegy (2–10 éves)", ar: "500 Ft" },
];

const berletArak = [
  { tipus: "Felnőtt", ar: "11 500 Ft" },
  { tipus: "Diák / nyugdíjas", ar: "9 500 Ft" },
  { tipus: "1 gyermek + 1 felnőtt", ar: "15 000 Ft" },
  { tipus: "2 gyermek + 1 felnőtt", ar: "17 500 Ft" },
  { tipus: "Családi (2 gyermek + 2 felnőtt)", ar: "22 000 Ft" },
];

export default function SobarlangPage() {
  return (
    <div className="pt-16 bg-stone min-h-screen">
      {/* Hero */}
      <section className="relative bg-ink py-20 px-6 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 50% 100%, rgba(231,174,142,0.15) 0%, transparent 65%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-widest text-salt mb-4">
            Wellness · Sóbarlang
          </p>
          <h1 className="font-display text-5xl sm:text-6xl text-stone font-light mb-6">
            Sóbarlang
          </h1>
          <p className="text-mist/70 text-lg leading-relaxed max-w-2xl">
            A sóbarlangban található sós levegő természetes módon tisztítja a
            légutakat, enyhíti az allergiás és légzőszervi panaszokat, miközben
            mély relaxációt biztosít.
          </p>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Alapterület", value: "14 m²" },
              { label: "Sómennyiség", value: "5 tonna" },
              { label: "Hőmérséklet", value: "19–22 °C" },
              { label: "Páratartalom", value: "60 %" },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 rounded-xl p-4 text-center">
                <p className="font-display text-2xl text-salt">{s.value}</p>
                <p className="font-mono text-xs uppercase tracking-widest text-mist/50 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leírás */}
      <section className="py-14 px-6">
        <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="font-display text-3xl text-ink mb-4">A sóbarlangról</h2>
            <div className="space-y-3 text-bark/70 leading-relaxed">
              <p>
                Sóbarlangunk himalája és parajdi sótömbökből épül, 5 tonna só
                természetes mikroklímát teremt. A 19–22 fokos hőmérséklet és
                60%-os páratartalom az egész év minden szakaszában optimális
                körülményeket biztosít.
              </p>
              <p>
                A terápiás hatások közé tartozik a légúti tisztítás, az allergiás
                tünetek enyhítése, a bőrápolás és a mélyrelaxáció. A fényterapiás
                és hangterápiás kiegészítők tovább fokozzák az élményt.
              </p>
            </div>
            <ul className="mt-6 space-y-2">
              {["Fényterápia", "Hangterápia", "TV", "6 férőhely", "Himalája só", "Parajdi só"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-bark/70">
                  <span className="w-4 h-0.5 bg-salt inline-block flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="bg-ink rounded-2xl p-6 text-stone">
              <p className="font-mono text-xs uppercase tracking-widest text-salt mb-4">
                Szállóvendégeknek
              </p>
              <p className="font-display text-4xl mb-2">Ingyenes</p>
              <p className="text-mist/70 text-sm">45 perc / nap / vendég</p>
              <p className="text-mist/50 text-xs mt-1">
                A további használat az alábbi árakon lehetséges.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Árak */}
      <section className="pb-16 px-6">
        <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-8">
          {/* Egyéni */}
          <div className="bg-white rounded-2xl border border-ink/10 p-6">
            <h3 className="font-display text-2xl text-ink mb-1">Egyéni belépők</h3>
            <p className="font-mono text-xs uppercase tracking-widest text-salt mb-5">45 perc / alkalom</p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-ink/5">
                {egyeniArak.map((r) => (
                  <tr key={r.tipus}>
                    <td className="py-2.5 text-bark/70">{r.tipus}</td>
                    <td className="py-2.5 text-right font-medium text-ink">{r.ar}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Bérlet */}
          <div className="bg-white rounded-2xl border border-ink/10 p-6">
            <h3 className="font-display text-2xl text-ink mb-1">Bérletek</h3>
            <p className="font-mono text-xs uppercase tracking-widest text-salt mb-5">10 alkalom · 8 hétig érvényes</p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-ink/5">
                {berletArak.map((r) => (
                  <tr key={r.tipus}>
                    <td className="py-2.5 text-bark/70">{r.tipus}</td>
                    <td className="py-2.5 text-right font-medium text-ink">{r.ar}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-14 px-6 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-salt mb-3">Foglaljon szobát</p>
        <h2 className="font-display text-3xl text-stone mb-6">
          Szállóvendégeknek a sóbarlang ingyenes
        </h2>
        <Link
          href="/foglalas"
          className="inline-flex px-8 py-3 rounded-full bg-salt text-bark font-sans font-medium hover:bg-salt/90 transition-colors"
        >
          Foglalás
        </Link>
      </section>
    </div>
  );
}
