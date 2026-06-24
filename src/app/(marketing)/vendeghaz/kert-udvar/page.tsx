import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/db";
import { gallery } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kert & udvar | Viki Vendégház Szilvásvárad",
  description:
    "Tágas udvar és gondozott kert grillezéshez, relaxáláshoz és gyerekjátékhoz. Viki Vendégház, Szilvásvárad.",
};

export default async function KertUdvarPage() {
  const images = await db
    .select()
    .from(gallery)
    .where(eq(gallery.category, "udvar"))
    .orderBy(asc(gallery.sortOrder), asc(gallery.id))
    .limit(12);

  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      <section className="bg-[var(--nav-bg)] py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Vendégház</p>
          <h1 className="text-5xl sm:text-6xl text-white font-light mb-6">Kert & udvar</h1>
          <p className="text-[var(--nav-text)]/80 text-lg leading-relaxed max-w-2xl">
            A Viki Vendégház tágas udvara és gondozott kertje az egész vendégház közös tere –
            grillezéshez, relaxáláshoz és gyerekjátékhoz egyaránt alkalmas. Szilvásvárad természeti
            környezetébe simuló, nyugodt zöld sarok.
          </p>
        </div>
      </section>

      {images.length > 0 && (
        <section className="py-14 px-6">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img) => (
                <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden bg-[var(--surface2)]">
                  <Image src={img.url} alt={img.alt ?? "Kert & udvar"} fill className="object-cover" sizes="(max-width: 640px) 50vw, 33vw" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-10 px-6 pb-16">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row gap-6 items-center justify-between">
          <p className="text-[var(--text2)] text-sm leading-relaxed max-w-lg">
            Grillezőhely, bográcsos sarok, szalonnasütő – a kert minden igényre felkészített.
            Vendégeink közös tere, ahol az esti órák igazi közösségi élménnyé válnak.
          </p>
          <Link
            href="/foglalas"
            className="shrink-0 px-6 py-3 rounded-full bg-[var(--nav-bg)] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Foglaljon szobát →
          </Link>
        </div>
      </section>
    </div>
  );
}
