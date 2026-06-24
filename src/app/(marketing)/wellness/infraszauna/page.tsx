import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { wellnessServices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { WellnessHeroImage } from "@/components/wellness-hero-image";
import { WellnessImageGrid } from "@/components/wellness-image-grid";

export const metadata: Metadata = {
  title: "Infraszauna Szilvásvárad",
  description:
    "Infraszauna Szilvásváradon. Kíméletesebb, mélyreható infravörös melegítés. Superior szoba vendégeinek és egész ház foglalásnál érhető el. 1 000 Ft/fő/óra.",
};

export default async function InfraszaunaPage() {
  const [service] = await db.select().from(wellnessServices).where(eq(wellnessServices.slug, "infraszauna"));
  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      <section className="bg-[var(--nav-bg)] py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Wellness · Infraszauna</p>
          <h1 className="text-5xl sm:text-6xl text-white font-light mb-6">Infraszauna</h1>
          <p className="text-[var(--nav-text)]/80 text-lg leading-relaxed max-w-2xl">
            Az infraszauna mélyreható infravörös hője serkenti a vérkeringést,
            ellazítja az izmokat, elősegíti a méregtelenítést, és hatékonyan
            csökkenti a stresszt. Kíméletesebb, mint a hagyományos finn szauna –
            alacsonyabb hőfokon is hatékony.
          </p>
          <WellnessHeroImage category="infraszauna" />
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-3xl text-[var(--text)] mb-4">Miért válassza?</h2>
            <ul className="space-y-3">
              {[
                "Kíméletesebb hőhatás – alacsonyabb levegőhőmérséklet",
                "Mélyreható melegítés – az infravörös sugárzás a szövetekbe hatol",
                "Vérkeringés-javítás és izomrelaxáció",
                "Hatékony méregtelenítés és bőrmegújítás",
                "Stressz- és feszültségcsökkentés",
              ].map((h) => (
                <li key={h} className="flex items-start gap-3 text-[var(--text)]/70 text-sm">
                  <span className="mt-1.5 w-4 h-0.5 bg-[var(--accent2)] inline-block flex-shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
              <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-2">Ár</p>
              <p className="text-4xl text-[var(--text)]">{service?.guestPriceLabel ?? "1 000 Ft"}</p>
              <p className="text-[var(--text)]/50 text-sm mt-1">{service?.openingHours ?? "21:00-ig"}</p>
            </div>
            <div className="bg-moss/10 rounded-2xl border border-moss/20 p-6">
              <p className="text-xs uppercase tracking-widest text-[var(--accent)] mb-2">Elérhetőség</p>
              <p className="text-[var(--text)]/80 text-sm leading-relaxed">
                {service?.note ?? "A Superior szoba vendégei számára, illetve az egész ház foglalásakor érhető el."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <WellnessImageGrid category="infraszauna" />

      <section className="bg-[var(--nav-bg)] py-14 px-6 text-center">
        <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-3">Tipp</p>
        <h2 className="text-3xl text-white mb-4">
          Foglalja a Superior szobát, kapja az infraszaunát
        </h2>
        <p className="text-[var(--nav-text)]/80 mb-6 max-w-md mx-auto">
          A Superior szoba vendégei az infraszaunát saját szobájukban használhatják.
        </p>
        <Link href="/foglalas" className="inline-flex px-8 py-3 rounded-full bg-[var(--accent2)] text-[var(--text)] font-sans font-medium hover:bg-[var(--accent2)]/90 transition-colors">
          Superior foglalás
        </Link>
      </section>
    </div>
  );
}
