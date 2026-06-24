import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { gallery } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import Image from "next/image";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nyári konyha | Viki Vendégház Szilvásvárad",
  description:
    "Teljesen felszerelt kültéri konyha grillezővel, bográcsozási lehetőséggel, sütővel és sparheltel. Viki Vendégház, Szilvásvárad.",
};

export default async function NyariKonyhaPage() {
  const images = await db
    .select()
    .from(gallery)
    .where(eq(gallery.category, "etkezes"))
    .orderBy(asc(gallery.sortOrder), asc(gallery.id))
    .limit(12);

  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      <section className="bg-[var(--nav-bg)] py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Vendégház</p>
          <h1 className="text-5xl sm:text-6xl text-white font-light mb-6">Nyári konyha</h1>
          <p className="text-[var(--nav-text)]/80 text-lg leading-relaxed max-w-2xl">
            Teljesen felszerelt kültéri konyha grillezővel, bográcsozási lehetőséggel, sütővel és
            sparheltel. Ideális baráti összejövetelekhez és családi programokhoz.
          </p>
        </div>
      </section>

      {images.length > 0 && (
        <section className="py-14 px-6">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img) => (
                <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden bg-[var(--surface2)]">
                  <Image src={img.url} alt={img.alt ?? "Nyári konyha"} fill className="object-cover" sizes="(max-width: 640px) 50vw, 33vw" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-10 px-6 pb-16">
        <div className="mx-auto max-w-4xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[
              "Sparhelt",
              "BBQ sütő",
              "Bográcsos hely",
              "Kemence",
              "Szalonnasütő",
              "Grillező",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
                <div className="flex gap-0.5">
                  <div className="w-3 h-1 bg-[var(--accent)] rounded-sm" />
                  <div className="w-3 h-1 bg-[var(--accent2)] rounded-sm" />
                </div>
                <p className="text-sm font-medium text-[var(--text)]">{item}</p>
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
