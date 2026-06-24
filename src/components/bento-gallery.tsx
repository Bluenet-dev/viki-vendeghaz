"use client";
import Image from "next/image";
import { useState } from "react";

export interface BentoImage {
  url: string;
  alt: string | null;
}

// Bento span-osztályok – vizuálisan változatos, de kiegyensúlyozott elrendezés.
// Ciklikusan ismétlődik, tehát bármennyi képet (4-től akár 20+-ig) kezel.
const SPAN_CLASSES = [
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-1 row-span-1",
  "col-span-2 row-span-1",
  "col-span-1 row-span-1",
];

export function BentoGallery({ images }: { images: BentoImage[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 auto-rows-[120px]">
        {images.map((img, i) => (
          <div
            key={img.url}
            className={`relative overflow-hidden rounded-xl cursor-pointer group ${SPAN_CLASSES[i % SPAN_CLASSES.length]}`}
            onClick={() => setLightbox(i)}
          >
            <Image src={img.url} alt={img.alt ?? "Étterem"} fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 33vw" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
          </div>
        ))}
      </div>
      {lightbox !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-5 text-white text-3xl hover:text-[var(--accent2)]"
            onClick={() => setLightbox(null)}>×</button>
          <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-3xl px-3 hover:text-[var(--accent2)]"
            onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + images.length) % images.length); }}>‹</button>
          <div className="relative max-w-3xl w-full max-h-[85vh] aspect-[4/3]"
            onClick={(e) => e.stopPropagation()}>
            <Image src={images[lightbox].url} alt={images[lightbox].alt ?? "Étterem"} fill
              className="object-contain" sizes="90vw" />
          </div>
          <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-3xl px-3 hover:text-[var(--accent2)]"
            onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % images.length); }}>›</button>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
            {lightbox + 1} / {images.length}
          </p>
        </div>
      )}
    </>
  );
}
