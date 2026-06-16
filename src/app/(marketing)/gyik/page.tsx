import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GYIK – Gyakran Ismételt Kérdések",
  description:
    "Bejelentkezés, kisállat, dohányzás, szauna, csendrendelet – minden fontos tudnivaló a Viki Vendégházról.",
};

const faqs = [
  {
    q: "Mikor lehet bejelentkezni és kijelentkezni?",
    a: "Érkezés 15:00-tól, távozás 10:00-ig lehetséges. Ettől eltérő igény esetén kérjük, jelezze előre – lehetőség szerint alkalmazkodunk.",
  },
  {
    q: "Fogadnak kisállatokat?",
    a: "Sajnos nem. Vendégházunk kutyát, macskát és egyéb kisállatot nem fogad.",
  },
  {
    q: "Lehet dohányozni a szobában?",
    a: "A szobákban dohányozni tilos. Dohányozni kizárólag a teraszon és az udvaron szabad.",
  },
  {
    q: "Van napi takarítás?",
    a: "Egyhetes tartózkodásnál hetente egyszer biztosítunk takarítást. Napi takarítás igény esetén kérhető – kérjük jelezze előre.",
  },
  {
    q: "Hogyan kell foglalni a szaunát vagy dézsafürdőt?",
    a: "A finn szauna (1 500 Ft/fő/óra, 19:00-ig) és a dézsafürdő (7 000 Ft/nap felfűtési díj) előzetes bejelentéssel foglalható. Kérjük, a foglaláskor jelezze igényét.",
  },
  {
    q: "Mikor ingyenes a sóbarlang?",
    a: "Szállóvendégeinknek 45 perc/nap/fő ingyenes. A sóbarlang külső vendégeknek is nyitva áll – az árak a Sóbarlang oldalon találhatók.",
  },
  {
    q: "Van csendrendelet?",
    a: "22:00 után kérjük a csendet, hogy minden vendégünk zavartalan pihenésben részesülhessen.",
  },
  {
    q: "Hol lehet parkolni?",
    a: "Ingyenes parkolási lehetőség áll rendelkezésre a vendégház előtt.",
  },
  {
    q: "Van Wifi a vendégházban?",
    a: "Igen, ingyenes Wifi-t biztosítunk minden szobában és a kertben is.",
  },
  {
    q: "Elfogadnak SZÉP-kártyát?",
    a: "Kérjük érdeklődjön közvetlenül – telefonon (+36 70 410-8282) vagy emailben (vikivendeghaz@gmail.com).",
  },
];

export default function GyikPage() {
  return (
    <div className="pt-16 bg-stone min-h-screen">
      <section className="bg-ink py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-widest text-salt mb-4">GYIK</p>
          <h1 className="font-display text-5xl sm:text-6xl text-stone font-light mb-6">
            Gyakran ismételt kérdések
          </h1>
          <p className="text-mist/70 text-lg max-w-2xl">
            Ha kérdése nem szerepel itt, hívjon minket vagy írjon emailt – 24 órás
            ügyeleten elérhető vagyunk.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-3xl divide-y divide-ink/8">
          {faqs.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                <span className="font-sans font-medium text-ink">{item.q}</span>
                <span className="flex-shrink-0 font-mono text-salt text-lg group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <p className="mt-3 text-bark/70 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
