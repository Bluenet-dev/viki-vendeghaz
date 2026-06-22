import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { wellnessServices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { WellnessHeroImage } from "@/components/wellness-hero-image";

export const metadata: Metadata = {
  title: "Kert & medence Szilvásvárad",
  description:
    "Kültéri fa medence és gondozott kert Szilvásváradon. Tavasztól őszig, este 21:00-ig ingyenesen használható szállóvendégeknek.",
};

export default async function KertMedencePage() {
  const [service] = await db.select().from(wellnessServices).where(eq(wellnessServices.slug, "kert-medence"));
  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      <section className="bg-[var(--nav-bg)] py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Wellness · Kert & medence</p>
          <h1 className="text-5xl sm:text-6xl text-white font-light mb-6">Kert & medence</h1>
          <p className="text-[var(--text2)]/70 text-lg leading-relaxed max-w-2xl">
            A gondosan kialakított kert és a kültéri fa medence tökéletes
            helyszínt nyújt a napsütéses napokhoz – legyen szó békés olvasásról,
            gyermekek fürdőzéséről vagy egy pohár bor melletti esténkézésről.
          </p>
          <WellnessHeroImage category="kert-medence" />
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-3xl text-[var(--text)] mb-4">A kertről</h2>
            <p className="text-[var(--text)]/70 leading-relaxed mb-4">
              A Viki Vendégház kertje tágas, gondozott zöld tér, ahol a vendégek
              szabadon pihenhetnek, napozhatnak, vagy a kültéri közösségi tereket
              használhatják (kerti konyha, grillező, bográcsos hely).
            </p>
            <p className="text-[var(--text)]/70 leading-relaxed">
              A kültéri fa medence különösen nyáron és kora ősszel népszerű –
              frissítő fürdőzés a Szalajka-völgy kirándulásai után.
            </p>
            <ul className="mt-6 space-y-2">
              {[
                "Kültéri fa medence",
                "Napágy és pihenőhely",
                "Kerti konyha, BBQ, grillező",
                "Gyermekbarát kert",
                "Szabad wifi a kertben",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-[var(--text)]/70">
                  <span className="w-4 h-0.5 bg-[var(--accent)] inline-block flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <div className="bg-moss/10 rounded-2xl border border-moss/20 p-6">
              <p className="text-xs uppercase tracking-widest text-[var(--accent)] mb-2">Ár</p>
              <p className="text-4xl text-[var(--text)]">{service?.guestPriceLabel ?? "Ingyenes"}</p>
              <p className="text-[var(--text)]/50 text-sm mt-1">szállóvendégeknek</p>
            </div>
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
              <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-2">Szezon & nyitvatartás</p>
              <p className="text-[var(--text)]/70 text-sm leading-relaxed">
                {service?.note ?? "Április – október"}.<br />
                A medence este <strong>{service?.openingHours ?? "21:00-ig"}</strong> használható.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--nav-bg)] py-14 px-6 text-center">
        <h2 className="text-3xl text-white mb-6">Töltsön nyáron nálunk!</h2>
        <Link href="/foglalas" className="inline-flex px-8 py-3 rounded-full bg-[var(--accent2)] text-[var(--text)] font-sans font-medium hover:bg-[var(--accent2)]/90 transition-colors">
          Foglalás
        </Link>
      </section>
    </div>
  );
}
