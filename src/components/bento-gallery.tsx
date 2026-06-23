"use client";
import Image from "next/image";
import { useState } from "react";

const IMAGES = ["01","02","03","04","05","06"].map((n) => ({
  src: `/etkezes/${n}.jpg`,
  alt: `Gasthaus étterem – ${n}`,
}));

// Bento span-osztályok – vizuálisan változatos, de kiegyensúlyozott elrendezés
const SPAN_CLASSES = [
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-1 row-span-1",
  "col-span-2 row-span-1",
  "col-span-1 row-span-1",
];

export function BentoGallery() {
  const [lightbox, setLightbox] = useState<number | null>(null);
  return (
    <>
      <div className="grid grid-cols-3 gap-2 auto-rows-[120px]">
        {IMAGES.map((img, i) => (
          <div
            key={img.src}
            className={`relative overflow-hidden rounded-xl cursor-pointer group ${SPAN_CLASSES[i % SPAN_CLASSES.length]}`}
            onClick={() => setLightbox(i)}
          >
            <Image src={img.src} alt={img.alt} fill
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
            onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + IMAGES.length) % IMAGES.length); }}>‹</button>
          <div className="relative max-w-3xl w-full max-h-[85vh] aspect-[4/3]"
            onClick={(e) => e.stopPropagation()}>
            <Image src={IMAGES[lightbox].src} alt={IMAGES[lightbox].alt} fill
              className="object-contain" sizes="90vw" />
          </div>
          <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-3xl px-3 hover:text-[var(--accent2)]"
            onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % IMAGES.length); }}>›</button>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
            {lightbox + 1} / {IMAGES.length}
          </p>
        </div>
      )}
    </>
  );
}
