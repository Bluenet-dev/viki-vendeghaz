import { db } from "@/db";
import { gallery } from "@/db/schema";
import { asc } from "drizzle-orm";
import Image from "next/image";
import { GALLERY_CATEGORIES, GALLERY_CATEGORY_LABELS } from "@/lib/gallery-categories";
import { UploadForm } from "./upload-form";
import { DeleteButton } from "./delete-button";
import { moveImageAction, updateAltAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Galéria" };

type GalleryRow = typeof gallery.$inferSelect;

export default async function AdminGaleriaPage() {
  const images = await db
    .select()
    .from(gallery)
    .orderBy(asc(gallery.category), asc(gallery.sortOrder), asc(gallery.id));

  const byCategory = new Map<string, GalleryRow[]>();
  for (const img of images) {
    const list = byCategory.get(img.category) ?? [];
    list.push(img);
    byCategory.set(img.category, list);
  }

  // A definiált sorrend, majd a végén bármely ismeretlen (régi) kategória, hogy
  // egyetlen kép se tűnjön el a nézetből.
  const knownValues = GALLERY_CATEGORIES.map((c) => c.value);
  const sections = [
    ...GALLERY_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
    ...[...byCategory.keys()]
      .filter((k) => !knownValues.includes(k as never))
      .map((k) => ({ value: k, label: GALLERY_CATEGORY_LABELS[k] ?? k })),
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-[var(--text)]">Galéria</h1>
        <p className="text-sm text-[var(--text2)] mt-1">
          Képek feltöltése, sorrendezése és törlése kategóriánként. A legelső kép a borítókép.
        </p>
      </div>

      <UploadForm />

      <div className="space-y-10">
        {sections.map((cat) => {
          const catImages = byCategory.get(cat.value) ?? [];
          return (
            <section key={cat.value}>
              <h2 className="text-[12px] font-semibold text-[var(--text2)] uppercase tracking-[0.06em] mb-3">
                {cat.label} <span className="text-[var(--text3)]">({catImages.length} kép)</span>
              </h2>

              {catImages.length === 0 ? (
                <p className="text-sm text-[var(--text3)]">Nincs feltöltött kép ebben a kategóriában.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {catImages.map((img, i) => (
                    <div
                      key={img.id}
                      className="border-[0.5px] border-[var(--border)] rounded-[10px] bg-[var(--surface)] overflow-hidden"
                    >
                      <div className="relative aspect-[4/3] bg-[var(--surface2)]">
                        <Image
                          src={img.url}
                          alt={img.alt ?? ""}
                          fill
                          className="object-cover"
                          sizes="200px"
                        />
                        {i === 0 && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[var(--accent2-bg)] text-[#8A4A22] text-[11px] font-semibold">
                            Borító
                          </span>
                        )}
                      </div>

                      <div className="p-2.5 space-y-2">
                        {/* Alt szöveg szerkesztése */}
                        <form action={updateAltAction} className="flex gap-1.5">
                          <input type="hidden" name="id" value={img.id} />
                          <input
                            name="alt"
                            defaultValue={img.alt ?? ""}
                            placeholder="Leírás (alt)"
                            className="min-w-0 flex-1 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                          />
                          <button
                            type="submit"
                            className="shrink-0 text-xs text-[var(--text2)] border border-[var(--border)] rounded px-2 hover:text-[var(--text)] transition-colors"
                            title="Leírás mentése"
                          >
                            Mentés
                          </button>
                        </form>

                        {/* Sorrend + törlés */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <MoveButton id={img.id} direction="up" disabled={i === 0} />
                            <MoveButton
                              id={img.id}
                              direction="down"
                              disabled={i === catImages.length - 1}
                            />
                          </div>
                          <DeleteButton id={img.id} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function MoveButton({
  id,
  direction,
  disabled,
}: {
  id: number;
  direction: "up" | "down";
  disabled: boolean;
}) {
  const arrow = direction === "up" ? "↑" : "↓";
  if (disabled) {
    return (
      <span className="w-7 h-7 flex items-center justify-center rounded border border-[var(--border)] text-[var(--text3)] opacity-40 select-none">
        {arrow}
      </span>
    );
  }
  return (
    <form action={moveImageAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="direction" value={direction} />
      <button
        type="submit"
        className="w-7 h-7 flex items-center justify-center rounded border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] hover:border-[var(--accent)] transition-colors"
        title={direction === "up" ? "Előrébb" : "Hátrébb"}
      >
        {arrow}
      </button>
    </form>
  );
}
