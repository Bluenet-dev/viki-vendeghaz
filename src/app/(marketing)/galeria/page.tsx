import type { Metadata } from "next";
import Image from "next/image";
import { db } from "@/db";
import { gallery } from "@/db/schema";
import { asc } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Galéria",
  description:
    "Képek a Viki Vendégházból: szobák, sóbarlang, wellness, kert és Szilvásvárad.",
};

const CATEGORY_LABELS: Record<string, string> = {
  szobak: "Szobák",
  wellness: "Wellness",
  sobarlang: "Sóbarlang",
  "finn-szauna": "Finn szauna",
  infraszauna: "Infraszauna",
  dezsafurdo: "Dézsafürdő",
  "kert-medence": "Kert & medence",
  udvar: "Udvar & kert",
  termeszet: "Természet",
  etkezes: "Étkezés",
};

export default async function GaleriaPage() {
  const images = await db.select().from(gallery).orderBy(asc(gallery.category), asc(gallery.sortOrder));

  const byCategory = images.reduce<Record<string, typeof images>>((acc, img) => {
    (acc[img.category] ??= []).push(img);
    return acc;
  }, {});

  return (
    <div className="pt-16 bg-stone min-h-screen">
      <section className="bg-ink py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-widest text-salt mb-4">Galéria</p>
          <h1 className="font-display text-5xl sm:text-6xl text-stone font-light mb-6">
            Képek a vendégházból
          </h1>
          <p className="text-mist/70 text-lg max-w-xl">
            Szobák, sóbarlang, wellness, kert, udvar és a környező természet –
            valós fotók a Viki Vendégházról.
          </p>
        </div>
      </section>

      {images.length === 0 ? (
        <section className="py-20 px-6 text-center">
          <div className="mx-auto max-w-xl">
            <div className="flex justify-center gap-1 mb-8">
              <div className="w-8 h-2 bg-moss rounded-sm" />
              <div className="w-8 h-2 bg-salt rounded-sm" />
            </div>
            <p className="font-display text-2xl text-ink mb-3">Képek hamarosan</p>
            <p className="text-bark/50 leading-relaxed">
              A valós fotókat a nyitás után töltjük fel. Addig is keressen
              minket és szívesen küldünk képeket emailben!
            </p>
          </div>
        </section>
      ) : (
        <section className="py-16 px-6">
          <div className="mx-auto max-w-5xl space-y-12">
            {Object.entries(byCategory).map(([category, imgs]) => (
              <div key={category}>
                <h2 className="font-display text-2xl text-ink mb-4">
                  {CATEGORY_LABELS[category] ?? category}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {imgs.map((img) => (
                    <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden bg-ink/5">
                      <Image
                        src={img.url}
                        alt={img.alt ?? ""}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
