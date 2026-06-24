import Image from "next/image";
import { db } from "@/db";
import { gallery } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function WellnessImageGrid({ category }: { category: string }) {
  const images = await db
    .select()
    .from(gallery)
    .where(eq(gallery.category, category))
    .orderBy(asc(gallery.sortOrder), asc(gallery.id))
    .limit(4);

  if (images.length === 0) return null;

  return (
    <section className="py-14 px-6">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Fotók</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative aspect-square rounded-xl overflow-hidden bg-[var(--surface2)]"
            >
              <Image
                src={img.url}
                alt={img.alt ?? ""}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 25vw"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
