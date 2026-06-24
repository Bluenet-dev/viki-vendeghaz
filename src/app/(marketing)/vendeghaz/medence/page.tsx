import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/db";
import { gallery } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Medence & jakuzzi | Viki Vendégház Szilvásvárad",
  description:
    "Kültéri fa medence és jakuzzi áprilistól októberig ingyenesen szállóvendégeknek. Napágyak, terasz – Viki Vendégház, Szilvásvárad.",
};

export default async function MedencePage() {
  const images = await db
    .select()
    .from(gallery)
    .where(eq(gallery.category, "kert-medence"))
    .orderBy(asc(gallery.sortOrder), asc(gallery.id))
    .limit(12);

  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      <section className="bg-[var(--nav-bg)] py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Vendégház</p>
          <h1 className="text-5xl sm:text-6xl text-white font-light mb-6">Medence & jakuzzi</h1>
          <p className="text-[var(--nav-text)]/80 text-lg leading-relaxed max-w-2xl">
            A kültéri fa medence és jakuzzi áprilistól októberig ingyenesen igénybe vehető
            szállóvendégeinknek. Napágyak, terasz, csillagos égbolt – a nap lezárásának
            legtökéletesebb módja.
          </p>
        </div>
      </section>

      {images.length > 0 && (
        <section className="py-14 px-6">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img) => (
                <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden bg-[var(--surface2)]">
                  <Image src={img.url} alt={img.alt ?? "Medence & jakuzzi"} fill className="object-cover" sizes="(max-width: 640px) 50vw, 33vw" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-10 px-6 pb-16">
        <div className="mx-auto max-w-4xl">
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {[
              { title: "Szezon", value: "Április – október" },
              { title: "Belépés", value: "Szállóvendégeknek ingyenes" },
              { title: "Nyitvatartás", value: "Egész nap, saját ütemezésben" },
              { title: "Kiegészítők", value: "Napágyak, terasz" },
            ].map((item) => (
              <div key={item.title} className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5">
                <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-1">{item.title}</p>
                <p className="text-[var(--text)] font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center">
            <Link
              href="/foglalas"
              className="px-6 py-3 rounded-full bg-[var(--nav-bg)] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Foglaljon szobát →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
