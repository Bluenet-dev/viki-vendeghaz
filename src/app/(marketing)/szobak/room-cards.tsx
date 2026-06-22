"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { RoomGalleryLightbox } from "@/components/room-gallery-lightbox";

interface Room {
  id: number;
  slug: string | null;
  name: string;
  bedType: string | null;
  amenities: string | null;
}

interface GalleryImage {
  url: string;
  alt: string | null;
}

export function RoomCards({
  rooms,
  roomImages,
  priceLabels,
}: {
  rooms: Room[];
  roomImages: Record<string, GalleryImage[]>;
  priceLabels: Record<string, string | null>;
}) {
  const [lightbox, setLightbox] = useState<{ images: GalleryImage[]; index: number } | null>(
    null,
  );

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {rooms.map((room) => {
          const amenities = room.amenities
            ? room.amenities.split(",").map((s) => s.trim()).filter(Boolean)
            : [];
          const images = (room.slug && roomImages[room.slug]) || [];
          const cover = images[0];
          const isSuperior = room.slug === "superior";
          const priceLabel = room.slug ? priceLabels[room.slug] : null;

          return (
            <div
              key={room.id}
              id={room.slug ?? String(room.id)}
              className={`bg-[var(--surface)] rounded-xl border overflow-hidden ${isSuperior ? "border-[var(--accent2)]" : "border-[var(--border)]"}`}
            >
              <button
                type="button"
                onClick={() => images.length > 0 && setLightbox({ images, index: 0 })}
                disabled={images.length === 0}
                className="relative w-full h-40 bg-[var(--surface2)] block cursor-pointer disabled:cursor-default"
              >
                {cover ? (
                  <Image
                    src={cover.url}
                    alt={cover.alt ?? room.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 360px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs uppercase tracking-widest text-[var(--text3)]">
                      Fotó hamarosan
                    </span>
                  </div>
                )}
                {isSuperior && (
                  <span className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-[var(--accent2-bg)] text-[var(--accent2)] text-[12px] font-semibold uppercase tracking-wide">
                    Legjobb szoba
                  </span>
                )}
                {images.length > 1 && (
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/55 text-white text-[12px]">
                    {images.length} kép
                  </span>
                )}
              </button>

              <div className="p-3.5">
                <p className="font-semibold text-sm text-[var(--text)]">{room.name}</p>
                {priceLabel && <p className="text-xs text-[var(--accent)] mt-1">{priceLabel}</p>}
                {room.bedType && (
                  <p className="text-xs text-[var(--text2)] mt-1">{room.bedType}</p>
                )}

                {amenities.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {amenities.slice(0, 4).map((f) => (
                      <li
                        key={f}
                        className="px-2.5 py-1 rounded-full bg-[var(--surface2)] text-[12px] text-[var(--text2)]"
                      >
                        {f}
                      </li>
                    ))}
                  </ul>
                )}

                <Link
                  href="/foglalas"
                  className="mt-4 block text-center w-full py-2 rounded-full border border-[var(--border)] text-sm text-[var(--text)] hover:border-[var(--accent)] transition-colors"
                >
                  Részletek & foglalás
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {lightbox && lightbox.images.length > 0 && (
        <RoomGalleryLightbox
          images={lightbox.images}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
