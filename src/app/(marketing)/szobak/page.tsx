import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Szobák & árak",
  description:
    "3 külön bejáratú szoba saját fürdőszobával Szilvásváradon. 1-es szoba, 2-es szoba, Superior franciaágyas szoba. Összesen 12 fő részére.",
};

const rooms: Array<{
  id: string;
  name: string;
  description: string;
  bedType: string;
  priceFrom: number | null;
  features: string[];
  badge?: string;
}> = [
  {
    id: "szoba-1",
    name: "1-es szoba",
    description:
      "Tágas, kényelmes szoba külön bejárattal és saját fürdőszobával. Ideális pároknak vagy kisebb családoknak.",
    bedType: "Kérdezzen az ágyelrendezésről",
    priceFrom: null,
    features: ["Külön bejárat", "Saját fürdőszoba", "Klíma", "TV", "Wifi"],
  },
  {
    id: "szoba-2",
    name: "2-es szoba",
    description:
      "Tágas, kényelmes szoba külön bejárattal és saját fürdőszobával. Ideális pároknak vagy kisebb családoknak.",
    bedType: "Kérdezzen az ágyelrendezésről",
    priceFrom: null,
    features: ["Külön bejárat", "Saját fürdőszoba", "Klíma", "TV", "Wifi"],
  },
  {
    id: "superior",
    name: "Superior szoba",
    badge: "Legjobb szoba",
    description:
      "Franciaágyas luxusszoba, infraszaunával felszerelve. A legkomfortosabb választás romantikus hétvégékre és minőségi pihenésre.",
    bedType: "Franciaágy",
    priceFrom: null,
    features: ["Külön bejárat", "Saját fürdőszoba", "Franciaágy", "Saját infraszauna", "Klíma", "TV", "Wifi"],
  },
];

export default function SzobakPage() {
  return (
    <div className="pt-16 bg-stone min-h-screen">
      {/* Header */}
      <section className="bg-ink py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-widest text-salt mb-4">Szállás</p>
          <h1 className="font-display text-5xl sm:text-6xl text-stone font-light mb-6">
            Szobáink
          </h1>
          <p className="text-mist/70 text-lg leading-relaxed max-w-2xl">
            3 külön bejáratú, tágas szoba saját fürdőszobával – összesen 12 fő
            elhelyezésére alkalmas. Ideális családoknak, baráti társaságoknak és
            pároknak egyaránt.
          </p>
        </div>
      </section>

      {/* Szobák */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl space-y-8">
          {rooms.map((room) => (
            <div
              key={room.id}
              id={room.id}
              className="bg-white rounded-2xl border border-ink/10 p-8"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  {room.badge && (
                    <span className="inline-block font-mono text-xs uppercase tracking-widest text-salt mb-2">
                      ★ {room.badge}
                    </span>
                  )}
                  <h2 className="font-display text-3xl text-ink">{room.name}</h2>
                  <p className="mt-1 font-mono text-xs uppercase tracking-widest text-moss">
                    {room.bedType}
                  </p>
                </div>
                <div className="text-right">
                  {room.priceFrom != null ? (
                    <>
                      <p className="font-mono text-xs uppercase tracking-widest text-mist/50 mb-1">-tól</p>
                      <p className="font-display text-3xl text-ink">
                        {room.priceFrom.toLocaleString("hu-HU")} Ft
                      </p>
                      <p className="text-xs text-bark/40">/éjszaka</p>
                    </>
                  ) : (
                    <p className="font-mono text-xs uppercase tracking-widest text-mist/40">
                      Ár: hamarosan
                    </p>
                  )}
                </div>
              </div>

              <p className="mt-4 text-bark/70 leading-relaxed">{room.description}</p>

              <ul className="mt-5 flex flex-wrap gap-2">
                {room.features.map((f) => (
                  <li
                    key={f}
                    className="px-3 py-1 rounded-full bg-stone text-xs font-sans text-bark/70 border border-ink/8"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Egész ház */}
      <section className="py-8 px-6 pb-16">
        <div className="mx-auto max-w-4xl">
          <div className="bg-ink rounded-2xl p-8 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-salt mb-3">
              Különleges lehetőség
            </p>
            <h2 className="font-display text-3xl text-stone mb-4">Egész ház foglalás</h2>
            <p className="text-mist/70 max-w-xl mx-auto leading-relaxed mb-6">
              Foglalja le mind a 3 szobát egyidejűleg! Összesen 12 fő részére,
              exkluzív hozzáféréssel a teljes vendégházhoz és minden
              wellness-szolgáltatáshoz.
            </p>
            <Link
              href="/foglalas"
              className="inline-flex px-8 py-3 rounded-full bg-salt text-bark font-sans font-medium hover:bg-salt/90 transition-colors"
            >
              Érdeklődöm
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
