"use client";

import { useState } from "react";
import Image from "next/image";
import { RoomGalleryLightbox } from "@/components/room-gallery-lightbox";

type GalleryImage = { url: string; alt: string | null };
type Section = { label: string; category: string; images: GalleryImage[] };

const TABS = [
  { name: "Összes", categories: [] as string[] },
  { name: "Szobák", categories: ["szoba-1", "szoba-2", "superior", "egesz-haz"] },
  { name: "Wellness", categories: ["sobarlang", "finn-szauna", "infraszauna", "dezsafurdo", "kert-medence"] },
  { name: "Vendégház", categories: ["udvar", "termeszet"] },
  { name: "Étkezés", categories: ["etkezes", "gasthaus"] },
];

export function GalleryGrid({ sections }: { sections: Section[] }) {
  const [activeTab, setActiveTab] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const visibleSections =
    TABS[activeTab].categories.length === 0
      ? sections
      : sections.filter((s) => TABS[activeTab].categories.includes(s.category));

  // Lapos lista a lightbox léptetéséhez az aktív szűrő szerint.
  const flat: GalleryImage[] = [];
  const offsets: number[] = [];
  for (const s of visibleSections) {
    offsets.push(flat.length);
    flat.push(...s.images);
  }

  return (
    <>
      {/* Tab szűrők */}
      <div className="mx-auto max-w-5xl mb-10">
        <div className="flex gap-2 flex-wrap">
          {TABS.map((tab, i) => (
            <button
              key={tab.name}
              type="button"
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === i
                  ? "bg-[var(--nav-bg)] text-white"
                  : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text2)] hover:border-[var(--accent)]"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-12">
        {visibleSections.length === 0 ? (
          <p className="text-center text-[var(--text3)] py-16">Ehhez a szűrőhöz még nincsenek képek.</p>
        ) : (
          visibleSections.map((section, si) => (
            <div key={section.category}>
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
                    {img.alt && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end p-3">
                        <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity leading-tight">
                          {img.alt}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
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
