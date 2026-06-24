import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { wellnessServices, wellnessPriceTiers } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { WellnessHeroImage } from "@/components/wellness-hero-image";
import { WellnessImageGrid } from "@/components/wellness-image-grid";

export const metadata: Metadata = {
  title: "Sóbarlang Szilvásvárad",
  description:
    "Sóbarlang Szilvásváradon: 5 tonna himalája és parajdi só, 14 m², 6 férőhely. Légzőszervi, allergiás panaszok enyhítése, mély relaxáció. Szállóvendégeknek 45 perc/nap ingyenes.",
};

export default async function SobarlangPage() {
  const [service] = await db.select().from(wellnessServices).where(eq(wellnessServices.slug, "sobarlang"));
  const tiers = await db
    .select()
    .from(wellnessPriceTiers)
    .where(eq(wellnessPriceTiers.serviceSlug, "sobarlang"))
    .orderBy(asc(wellnessPriceTiers.sortOrder));
  const egyeniArak = tiers.filter((t) => t.groupLabel === "Egyedi jegy");
  const berletArak = tiers.filter((t) => t.groupLabel === "Bérlet (10x)");
  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      {/* Hero */}
      <section className="relative bg-[var(--nav-bg)] py-20 px-6 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 50% 100%, rgba(231,174,142,0.15) 0%, transparent 65%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">
            Wellness · Sóbarlang
          </p>
          <h1 className="text-5xl sm:text-6xl text-white font-light mb-6">
            Sóbarlang
          </h1>
          <p className="text-[var(--nav-text)]/80 text-lg leading-relaxed max-w-2xl">
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
              <div key={s.label} className="bg-[var(--surface)]/5 rounded-xl p-4 text-center">
                <p className="text-2xl text-[var(--accent2)]">{s.value}</p>
                <p className="text-xs uppercase tracking-widest text-[var(--nav-text)]/60 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <WellnessHeroImage category="sobarlang" />
        </div>
      </section>

      {/* Leírás */}
      <section className="py-14 px-6">
        <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-3xl text-[var(--text)] mb-4">A sóbarlangról</h2>
            <div className="space-y-3 text-[var(--text)]/70 leading-relaxed">
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
                <li key={f} className="flex items-center gap-2 text-sm text-[var(--text)]/70">
                  <span className="w-4 h-0.5 bg-[var(--accent2)] inline-block flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="bg-[var(--nav-bg)] rounded-2xl p-6 text-white">
              <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">
                Szállóvendégeknek
              </p>
              <p className="text-4xl mb-2">{service?.guestPriceLabel ?? "Ingyenes"}</p>
              <p className="text-[var(--nav-text)]/80 text-sm">{service?.guestPriceNote ?? "45 perc / nap / vendég"}</p>
              <p className="text-[var(--nav-text)]/60 text-xs mt-1">
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
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
            <h3 className="text-2xl text-[var(--text)] mb-1">Egyéni belépők</h3>
            <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-5">45 perc / alkalom</p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[var(--border)]">
                {egyeniArak.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 text-[var(--text)]/70">{r.tierLabel}</td>
                    <td className="py-2.5 text-right font-medium text-[var(--text)]">{r.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Bérlet */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
            <h3 className="text-2xl text-[var(--text)] mb-1">Bérletek</h3>
            <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-5">10 alkalom · 8 hétig érvényes</p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[var(--border)]">
                {berletArak.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 text-[var(--text)]/70">{r.tierLabel}</td>
                    <td className="py-2.5 text-right font-medium text-[var(--text)]">{r.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <WellnessImageGrid category="sobarlang" />

      {/* CTA */}
      <section className="bg-[var(--nav-bg)] py-14 px-6 text-center">
        <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-3">Foglaljon szobát</p>
        <h2 className="text-3xl text-white mb-6">
          Szállóvendégeknek a sóbarlang ingyenes
        </h2>
        <Link
          href="/foglalas"
          className="inline-flex px-8 py-3 rounded-full bg-[var(--accent2)] text-[var(--text)] font-sans font-medium hover:bg-[var(--accent2)]/90 transition-colors"
        >
          Foglalás
        </Link>
      </section>
    </div>
  );
}
