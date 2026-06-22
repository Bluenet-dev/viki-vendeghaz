"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface GalleryImage {
  url: string;
  alt: string | null;
}

export function RoomGalleryLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: GalleryImage[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % images.length);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [images.length, onClose]);

  if (images.length === 0) return null;
  const current = images[index];

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 text-white/70 hover:text-white text-3xl leading-none"
        aria-label="Bezárás"
      >
        &times;
      </button>

      <p className="absolute top-6 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
        {index + 1} / {images.length}
      </p>

      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIndex((i) => (i - 1 + images.length) % images.length); }}
          className="absolute left-3 sm:left-6 text-white/70 hover:text-white text-3xl px-2"
          aria-label="Előző kép"
        >
          ‹
        </button>
      )}

      <div
        className="relative w-full max-w-3xl aspect-[4/3]"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={current.url}
          alt={current.alt ?? ""}
          fill
          className="object-contain"
          sizes="100vw"
        />
      </div>

      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIndex((i) => (i + 1) % images.length); }}
          className="absolute right-3 sm:right-6 text-white/70 hover:text-white text-3xl px-2"
          aria-label="Következő kép"
        >
          ›
        </button>
      )}
    </div>
  );
}
