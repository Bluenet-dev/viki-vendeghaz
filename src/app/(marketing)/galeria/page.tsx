import type { Metadata } from "next";
import { db } from "@/db";
import { gallery } from "@/db/schema";
import { asc } from "drizzle-orm";
import { GALLERY_CATEGORIES, GALLERY_CATEGORY_LABELS } from "@/lib/gallery-categories";
import { GalleryGrid } from "./gallery-grid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Galéria | Viki Vendégház Szilvásvárad – Szobák, wellness, kert",
  description:
    "Képek a Viki Vendégházból: szobák, sóbarlang, finn szauna, dézsafürdő, kert és udvar Szilvásváradon. Nézze meg, mire számíthat nálunk!",
};

export default async function GaleriaPage() {
  const images = await db.select().from(gallery).orderBy(asc(gallery.sortOrder), asc(gallery.id));

  const byCategory = images.reduce<Record<string, typeof images>>((acc, img) => {
    (acc[img.category] ??= []).push(img);
    return acc;
  }, {});

  // Definiált kategória-sorrend, majd a végén bármely ismeretlen (régi) kategória.
  const knownValues = GALLERY_CATEGORIES.map((c) => c.value);
  const orderedCategories = [
    ...GALLERY_CATEGORIES.map((c) => c.value),
    ...Object.keys(byCategory).filter((k) => !knownValues.includes(k as never)),
  ].filter((cat) => (byCategory[cat]?.length ?? 0) > 0);

  const sections = orderedCategories.map((category) => ({
    label: GALLERY_CATEGORY_LABELS[category] ?? category,
    images: byCategory[category].map((img) => ({ url: img.url, alt: img.alt })),
  }));

  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      <section className="bg-[var(--nav-bg)] py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Galéria</p>
          <h1 className="text-5xl sm:text-6xl text-white font-light mb-6">
            Képek a vendégházból
          </h1>
          <p className="text-[var(--nav-text)]/80 text-lg max-w-xl">
            Szobák, sóbarlang, wellness, kert, udvar és a környező természet –
            valós fotók a Viki Vendégházról.
          </p>
        </div>
      </section>

      {images.length === 0 ? (
        <section className="py-20 px-6 text-center">
          <div className="mx-auto max-w-xl">
            <div className="flex justify-center gap-1 mb-8">
              <div className="w-8 h-2 bg-[var(--accent)] rounded-sm" />
              <div className="w-8 h-2 bg-[var(--accent2)] rounded-sm" />
            </div>
            <p className="text-2xl text-[var(--text)] mb-3">Képek hamarosan</p>
            <p className="text-[var(--text)]/50 leading-relaxed">
              A valós fotókat a nyitás után töltjük fel. Addig is keressen
              minket és szívesen küldünk képeket emailben!
            </p>
          </div>
        </section>
      ) : (
        <section className="py-16 px-6">
          <GalleryGrid sections={sections} />
        </section>
      )}
    </div>
  );
}
