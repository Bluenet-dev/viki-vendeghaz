"use client";

import { useState } from "react";
import Image from "next/image";
import { RoomGalleryLightbox } from "@/components/room-gallery-lightbox";

interface GalleryImage {
  url: string;
  alt: string | null;
}

export function RoomDetailGallery({ images, roomName }: { images: GalleryImage[]; roomName: string }) {
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (images.length === 0) {
    return (
      <div className="aspect-[4/3] rounded-xl bg-[var(--surface2)] flex items-center justify-center">
        <span className="text-xs uppercase tracking-widest text-[var(--text3)]">Fotó hamarosan</span>
      </div>
    );
  }

  const main = images[selected];

  return (
    <div className="space-y-3">
      {/* Főkép */}
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-[var(--surface2)] cursor-pointer block"
      >
        <Image
          src={main.url}
          alt={main.alt ?? roomName}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 560px"
          priority
        />
        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
        {images.length > 1 && (
          <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/55 text-white text-xs">
            {selected + 1} / {images.length}
          </span>
        )}
      </button>

      {/* Thumbnail sor */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.slice(0, 6).map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setSelected(i)}
              className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                i === selected ? "border-[var(--accent2)]" : "border-transparent"
              }`}
            >
              <Image
                src={img.url}
                alt={img.alt ?? ""}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <RoomGalleryLightbox
          images={images}
          initialIndex={selected}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
