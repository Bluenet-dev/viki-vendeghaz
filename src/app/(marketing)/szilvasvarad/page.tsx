import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Szilvásvárad – látnivalók és programok",
  description:
    "Szilvásváradi látnivalók: Szalajka-völgy, Fátyol-vízesés, Lipicai Ménes, Erdei Vasút, kalandpark és még sok más. Fedezze fel a Bükki Nemzeti Park gyöngyszemét!",
};

const latnivalok = [
  {
    nev: "Szalajka-völgy",
    leiras: "Festői völgy a Bükk szívében, a Fátyol-vízesés és a Szikla-forrás otthona. Gyalog és kerékpárral is bejárható, kb. 4 km.",
    tipus: "Természet",
  },
  {
    nev: "Állami Ménesgazdaság",
    leiras: "Lipicai Lótörténeti Kiállítás, Hajtókocsi Kiállítás, Ménesudvar. A világ egyik legelismertebb lipicai ménesének otthona.",
    tipus: "Kultúra",
  },
  {
    nev: "Szilvásváradi Erdei Vasút",
    leiras: "Kisvasút a Szalajka-völgybe, márciustól közlekedik. Gyerekeknek és felnőtteknek egyaránt élmény.",
    tipus: "Program",
  },
  {
    nev: "Millenniumi kilátó",
    leiras: "Panorámás kilátó a Bükk felett – az időjárástól függően nyitva tart (BNPI).",
    tipus: "Természet",
  },
  {
    nev: "Kalanderdő & Kalandpark",
    leiras: "Aktív kikapcsolódás fák között – mászópályák, kötélpályák, bob.",
    tipus: "Sport",
  },
  {
    nev: "X-Trém Bob",
    leiras: "Száguldás a hegyoldalon gördülő bobbal – nyáron is elérhető szórakozás.",
    tipus: "Sport",
  },
  {
    nev: "Szabadtéri Erdei Múzeum",
    leiras: "Egész évben, szabadon látogatható. Erdészeti és természeti kiállítás a szabad ég alatt.",
    tipus: "Kultúra",
  },
  {
    nev: "Orbán Ház Múzeum és Archeopark",
    leiras: "Helytörténeti és régészeti kiállítás Szilvásvárad múltjáról.",
    tipus: "Kultúra",
  },
  {
    nev: "Zilahy Aladár Erdészeti Múzeum",
    leiras: "SZÉP-kártya elfogadó hely. Az erdészet és a természetvédelem helyi történetét mutatja be.",
    tipus: "Kultúra",
  },
  {
    nev: "Kajla pecsételő pont (BNPI)",
    leiras: "A Bükki Nemzeti Park gyerekeknek szóló Kajla-túraprogram pecsételőpontja a Szalajka-völgyi információs háznál.",
    tipus: "Család",
  },
];

const tipusSzin: Record<string, string> = {
  Természet: "bg-moss/10 text-moss",
  Kultúra: "bg-salt/10 text-bark",
  Program: "bg-mist/20 text-bark",
  Sport: "bg-ink/5 text-ink",
  Család: "bg-salt/15 text-bark",
};

export default function SzilvasvaradPage() {
  return (
    <div className="pt-16 bg-stone min-h-screen">
      <section className="bg-ink py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-widest text-salt mb-4">Szilvásvárad</p>
          <h1 className="font-display text-5xl sm:text-6xl text-stone font-light mb-6">
            Fedezze fel Szilvásváradot
          </h1>
          <p className="text-mist/70 text-lg leading-relaxed max-w-2xl">
            A Viki Vendégház mindössze egy perc sétára van a Szalajka-völgy
            bejáratától. Programban nem lesz hiány – természet, kultúra és
            kaland egy helyen.
          </p>
        </div>
      </section>

      {/* Látnivalók */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display text-3xl text-ink mb-8">Látnivalók és programok</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {latnivalok.map((l) => (
              <div key={l.nev} className="bg-white rounded-2xl border border-ink/10 p-6">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-display text-xl text-ink">{l.nev}</h3>
                  <span className={`flex-shrink-0 font-mono text-xs uppercase tracking-widest px-2.5 py-1 rounded-full ${tipusSzin[l.tipus]}`}>
                    {l.tipus}
                  </span>
                </div>
                <p className="text-sm text-bark/65 leading-relaxed">{l.leiras}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-bark/40 text-center">
            További programok:{" "}
            <a href="https://szilvasvarad.hu/hu/latnivalok" target="_blank" rel="noopener noreferrer" className="underline hover:text-bark/60">
              szilvasvarad.hu
            </a>
          </p>
        </div>
      </section>

      {/* Szilvásvárad története */}
      <section className="bg-ink py-16 px-6">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-widest text-salt mb-4">Helytörténet</p>
          <h2 className="font-display text-4xl text-stone mb-8">Szilvásvárad rövid története</h2>
          <div className="space-y-4 text-mist/70 leading-relaxed">
            <p>
              Szilvásvárad nem csupán Magyarország egyik legnépszerűbb turisztikai
              célpontja, hanem gazdag történelmi múlttal rendelkező település is,
              amely a Bükk-hegység festői környezetében fekszik. Első írásos
              említése a 14. századból származik – „Zylwaswarad" névvel –, és
              évszázadokon át a magyar nemesség kedvelt vadász- és erdőgazdálkodási
              helyszíne volt.
            </p>
            <p>
              A 20. században az Állami Ménesgazdaság tette világhírűvé a
              települést: a lipicai lovak tenyésztése ma is élő hagyomány és
              turisztikai vonzerő. A természeti értékek – Szalajka-völgy,
              Fátyol-vízesés, Szikla-forrás – a Bükki Nemzeti Park védelmét
              élvezik.
            </p>
            <p>
              Ma Szilvásvárad az aktív kikapcsolódás, a természetjárás és a
              wellness szerelmeseinek kedvelt célpontja – és a Viki Vendégház
              éppen a falu szívében, a völgy kapujában kínál otthonos pihenést.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
