import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/db";
import { gallery } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Étkezési tér | Viki Vendégház Szilvásvárad",
  description:
    "Fedett kültéri étkezési tér az egész vendégcsapat számára. Reggelik, vacsorák a Bükk friss levegőjén. Viki Vendégház, Szilvásvárad.",
};

export default async function EtkezesiTerPage() {
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
          <h1 className="text-5xl sm:text-6xl text-white font-light mb-6">Étkezési tér</h1>
          <p className="text-[var(--nav-text)]/80 text-lg leading-relaxed max-w-2xl">
            A fedett kültéri étkezési tér az egész vendégcsapat számára ad helyet. Reggelik,
            vacsorák, vagy csak egy pohár bor a Bükk levegőjén – a kinti asztal mindig készen vár.
          </p>
        </div>
      </section>

      {images.length > 0 && (
        <section className="py-14 px-6">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img) => (
                <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden bg-[var(--surface2)]">
                  <Image src={img.url} alt={img.alt ?? "Étkezési tér"} fill className="object-cover" sizes="(max-width: 640px) 50vw, 33vw" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-10 px-6 pb-16">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row gap-6 items-center justify-between">
          <p className="text-[var(--text2)] text-sm leading-relaxed max-w-lg">
            Az étkezési tér fedett, így eső esetén is kényelmesen használható. Elegendő hely az
            összes vendég számára – akár az egész ház 12 főjének is.
          </p>
          <Link
            href="/felpanzio"
            className="shrink-0 px-6 py-3 rounded-full bg-[var(--accent2)] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Félpanzió lehetőség →
          </Link>
        </div>
      </section>
    </div>
  );
}
