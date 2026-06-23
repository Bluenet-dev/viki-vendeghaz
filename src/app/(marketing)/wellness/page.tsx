import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { wellnessServices } from "@/db/schema";
import { asc } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Wellness Szilvásváradon | Sóbarlang, szauna, dézsafürdő – Viki Vendégház",
  description:
    "Sóbarlang (ingyenes szállóvendégeknek), finn szauna, infraszauna, dézsafürdő és kültéri medence – mind egy helyen, Szilvásváradon. Foglaljon szobát és élvezze a teljes wellness-kínálatot.",
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
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      <section className="bg-[var(--nav-bg)] py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Wellness</p>
          <h1 className="text-5xl sm:text-6xl text-white font-light mb-6">
            Megújulás, öt irányból
          </h1>
          <p className="text-[var(--nav-text)]/80 text-lg leading-relaxed max-w-2xl">
            Öt wellness-élmény – mind a vendégház telkén belül, kizárólag
            szállóvendégeinknek. Sóbarlang, finn szauna, infraszauna, dézsafürdő
            és kültéri medence: nem kell sehova menni, a pihenés itt kezdődik
            és itt ér véget.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {services.map((s) => (
            <Link
              key={s.slug}
              href={`/wellness/${s.slug}`}
              className="group flex flex-col sm:flex-row items-start gap-6 bg-[var(--surface)] rounded-xl border border-[var(--border)] p-8 hover:border-[var(--accent)]/40 transition-all"
            >
              <div className="flex-shrink-0 flex gap-1">
                <div className="w-2 h-12 bg-[var(--accent)] rounded-full" />
                <div className="w-2 h-12 bg-[var(--accent2)] rounded-full" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <h2 className="text-2xl text-[var(--text)] font-semibold group-hover:text-[var(--accent)] transition-colors">
                    {s.name}
                  </h2>
                  <span className="text-xs uppercase tracking-widest text-[var(--accent2)]">
                    {s.guestPriceLabel}
                    {s.openingHours ? ` · ${s.openingHours}` : ""}
                  </span>
                </div>
                <p className="mt-2 text-[var(--text2)] leading-relaxed">{descriptions[s.slug] ?? ""}</p>
                <p className="mt-4 text-sm text-[var(--accent)] font-sans">
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
