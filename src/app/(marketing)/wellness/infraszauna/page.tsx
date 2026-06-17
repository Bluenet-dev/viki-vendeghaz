import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { wellnessServices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { WellnessHeroImage } from "@/components/wellness-hero-image";

export const metadata: Metadata = {
  title: "Infraszauna Szilvásvárad",
  description:
    "Infraszauna Szilvásváradon. Kíméletesebb, mélyreható infravörös melegítés. Superior szoba vendégeinek és egész ház foglalásnál érhető el. 1 000 Ft/fő/óra.",
};

export default async function InfraszaunaPage() {
  const [service] = await db.select().from(wellnessServices).where(eq(wellnessServices.slug, "infraszauna"));
  return (
    <div className="pt-16 bg-stone min-h-screen">
      <section className="bg-ink py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-widest text-salt mb-4">Wellness · Infraszauna</p>
          <h1 className="font-display text-5xl sm:text-6xl text-stone font-light mb-6">Infraszauna</h1>
          <p className="text-mist/70 text-lg leading-relaxed max-w-2xl">
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
            <h2 className="font-display text-3xl text-ink mb-4">Miért válassza?</h2>
            <ul className="space-y-3">
              {[
                "Kíméletesebb hőhatás – alacsonyabb levegőhőmérséklet",
                "Mélyreható melegítés – az infravörös sugárzás a szövetekbe hatol",
                "Vérkeringés-javítás és izomrelaxáció",
                "Hatékony méregtelenítés és bőrmegújítás",
                "Stressz- és feszültségcsökkentés",
              ].map((h) => (
                <li key={h} className="flex items-start gap-3 text-bark/70 text-sm">
                  <span className="mt-1.5 w-4 h-0.5 bg-salt inline-block flex-shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-ink/10 p-6">
              <p className="font-mono text-xs uppercase tracking-widest text-salt mb-2">Ár</p>
              <p className="font-display text-4xl text-ink">{service?.guestPriceLabel ?? "1 000 Ft"}</p>
              <p className="text-bark/50 text-sm mt-1">{service?.openingHours ?? "21:00-ig"}</p>
            </div>
            <div className="bg-moss/10 rounded-2xl border border-moss/20 p-6">
              <p className="font-mono text-xs uppercase tracking-widest text-moss mb-2">Elérhetőség</p>
              <p className="text-bark/80 text-sm leading-relaxed">
                {service?.note ?? "A Superior szoba vendégei számára, illetve az egész ház foglalásakor érhető el."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-ink py-14 px-6 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-salt mb-3">Tipp</p>
        <h2 className="font-display text-3xl text-stone mb-4">
          Foglalja a Superior szobát, kapja az infraszaunát
        </h2>
        <p className="text-mist/60 mb-6 max-w-md mx-auto">
          A Superior szoba vendégei az infraszaunát saját szobájukban használhatják.
        </p>
        <Link href="/foglalas" className="inline-flex px-8 py-3 rounded-full bg-salt text-bark font-sans font-medium hover:bg-salt/90 transition-colors">
          Superior foglalás
        </Link>
      </section>
    </div>
  );
}
