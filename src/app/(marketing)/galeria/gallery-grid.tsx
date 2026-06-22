"use client";

import { useState } from "react";
import Image from "next/image";
import { RoomGalleryLightbox } from "@/components/room-gallery-lightbox";

type GalleryImage = { url: string; alt: string | null };
type Section = { label: string; images: GalleryImage[] };

export function GalleryGrid({ sections }: { sections: Section[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Lapos lista a lightbox léptetéséhez, szekciónkénti kezdő-eltolásokkal.
  const flat: GalleryImage[] = [];
  const offsets: number[] = [];
  for (const s of sections) {
    offsets.push(flat.length);
    flat.push(...s.images);
  }

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-12">
        {sections.map((section, si) => (
          <div key={section.label}>
            <h2 className="text-2xl text-[var(--text)] mb-4">{section.label}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {section.images.map((img, ii) => (
                <button
                  type="button"
                  key={img.url}
                  onClick={() => setOpenIndex(offsets[si] + ii)}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-[var(--surface2)] cursor-pointer"
                  aria-label="Kép megnyitása"
                >
                  <Image
                    src={img.url}
                    alt={img.alt ?? ""}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {openIndex !== null && (
        <RoomGalleryLightbox
          images={flat}
          initialIndex={openIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}
