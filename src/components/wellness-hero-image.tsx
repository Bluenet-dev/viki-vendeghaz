import Image from "next/image";
import { db } from "@/db";
import { gallery } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function WellnessHeroImage({ category }: { category: string }) {
  const [image] = await db
    .select()
    .from(gallery)
    .where(eq(gallery.category, category))
    .orderBy(asc(gallery.sortOrder))
    .limit(1);

  return (
    <div className="relative mt-8 aspect-[16/7] rounded-2xl overflow-hidden bg-[var(--surface)]/5">
      {image ? (
        <Image src={image.url} alt={image.alt ?? ""} fill className="object-cover" sizes="(max-width: 768px) 100vw, 900px" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs uppercase tracking-widest text-[var(--text2)]/40">Fotó hamarosan</span>
        </div>
      )}
    </div>
  );
}
