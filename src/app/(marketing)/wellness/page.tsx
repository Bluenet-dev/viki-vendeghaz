import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { wellnessServices } from "@/db/schema";
import { asc } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Wellness",
  description:
    "Sóbarlang, finn szauna, infraszauna, dézsafürdő és kültéri medence Szilvásváradon. Komplex wellness élmény a Bükki Nemzeti Park szívében.",
};

const descriptions: Record<string, string> = {
  sobarlang:
    "5 tonna himalája és parajdi só, 14 m², 6 férőhely. Fényterápia, hangterápia, TV. Szállóvendégeknek 45 perc/nap ingyenes.",
  "finn-szauna":
    "Hagyományos gőzszauna az igazi izzadásterápiához. Méregtelenítés, izomrelaxáció, vérkeringés-javítás.",
  infraszauna:
    "Kíméletesebb, mélyreható infravörös melegítés. A Superior szoba, illetve teljes ház foglalásakor elérhető.",
  dezsafurdo:
    "Csillagos égbolt alatt, meleg vízben – romantikus kikapcsolódás télen és nyáron egyaránt.",
  "kert-medence":
    "Kültéri fa medence a gondosan kialakított kertben. Tavasztól őszig használható.",
};

export default async function WellnessPage() {
  const services = await db.select().from(wellnessServices).orderBy(asc(wellnessServices.sortOrder));
  return (
    <div className="pt-16 bg-stone min-h-screen">
      <section className="bg-ink py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-widest text-salt mb-4">Wellness</p>
          <h1 className="font-display text-5xl sm:text-6xl text-stone font-light mb-6">
            Megújulás, öt irányból
          </h1>
          <p className="text-mist/70 text-lg leading-relaxed max-w-2xl">
            A Viki Vendégház wellness-kínálata nemcsak pihenést, hanem valódi
            testi-lelki megújulást nyújt. Sóbarlang, szaunák, dézsafürdő és
            kert – minden egy helyen, a Szalajka-völgy szomszédságában.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {services.map((s) => (
            <Link
              key={s.slug}
              href={`/wellness/${s.slug}`}
              className="group flex flex-col sm:flex-row items-start gap-6 bg-white rounded-2xl border border-ink/10 p-8 hover:border-salt/40 hover:shadow-md transition-all"
            >
              <div className="flex-shrink-0 flex gap-1">
                <div className="w-2 h-12 bg-moss rounded-full" />
                <div className="w-2 h-12 bg-salt rounded-full" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <h2 className="font-display text-2xl text-ink group-hover:text-moss transition-colors">
                    {s.name}
                  </h2>
                  <span className="font-mono text-xs uppercase tracking-widest text-salt">
                    {s.guestPriceLabel}
                    {s.openingHours ? ` · ${s.openingHours}` : ""}
                  </span>
                </div>
                <p className="mt-2 text-bark/70 leading-relaxed">{descriptions[s.slug] ?? ""}</p>
                <p className="mt-4 text-sm text-moss font-sans">
                  Részletek & árak →
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
