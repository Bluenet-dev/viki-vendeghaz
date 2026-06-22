"use server";

import { db } from "@/db";
import { gallery } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { WELLNESS_CATEGORIES } from "@/lib/gallery-categories";

export type UploadState = { ok?: boolean; error?: string };

function revalidateGallery(category?: string) {
  revalidatePath("/admin/galeria");
  revalidatePath("/galeria");
  revalidatePath("/szobak");
  if (category && WELLNESS_CATEGORIES.includes(category)) {
    revalidatePath(`/wellness/${category}`);
  }
}

// Következő sorszám a kategórián belül: max(sort_order) + 1, üres kategóriánál 1.
async function nextSortOrder(category: string): Promise<number> {
  const [last] = await db
    .select({ sortOrder: gallery.sortOrder })
    .from(gallery)
    .where(eq(gallery.category, category))
    .orderBy(desc(gallery.sortOrder))
    .limit(1);
  return (last?.sortOrder ?? 0) + 1;
}

export async function uploadImageAction(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  try {
    const file = formData.get("file") as File | null;
    const category = String(formData.get("category") || "");
    const alt = String(formData.get("alt") || "");

    if (!file || file.size === 0) return { error: "Nincs kiválasztott képfájl." };
    if (!category) return { error: "Hiányzó kategória." };
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return {
        error:
          "A képtároló (BLOB_READ_WRITE_TOKEN) nincs beállítva ezen a környezeten. Add hozzá a Vercel → Settings → Environment Variables alatt, majd próbáld újra.",
      };
    }

    const blob = await put(`gallery/${category}/${Date.now()}-${file.name}`, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const sortOrder = await nextSortOrder(category);
    await db.insert(gallery).values({ url: blob.url, alt, category, sortOrder });

    revalidateGallery(category);
    return { ok: true };
  } catch (err) {
    console.error("Galéria feltöltési hiba:", err);
    return {
      error:
        "Feltöltési hiba: " + (err instanceof Error ? err.message : "ismeretlen hiba"),
    };
  }
}

export async function deleteImageAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  const [row] = await db.select().from(gallery).where(eq(gallery.id, id));
  await db.delete(gallery).where(eq(gallery.id, id));
  revalidateGallery(row?.category);
}

// ↑/↓: a kép és a szomszédja helyet cserél a kategórián belül, majd a teljes
// kategória sort_order-jét 1..n-re normalizáljuk (így a holtversenyek is eltűnnek).
export async function moveImageAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const direction = String(formData.get("direction"));
  if (!id || (direction !== "up" && direction !== "down")) return;

  const [target] = await db.select().from(gallery).where(eq(gallery.id, id));
  if (!target) return;

  const list = await db
    .select()
    .from(gallery)
    .where(eq(gallery.category, target.category))
    .orderBy(asc(gallery.sortOrder), asc(gallery.id));

  const idx = list.findIndex((r) => r.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= list.length) return;

  [list[idx], list[swapIdx]] = [list[swapIdx], list[idx]];

  await Promise.all(
    list.map((r, i) =>
      db.update(gallery).set({ sortOrder: i + 1 }).where(eq(gallery.id, r.id)),
    ),
  );

  revalidateGallery(target.category);
}

export async function updateAltAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  const alt = String(formData.get("alt") || "");
  const [row] = await db
    .update(gallery)
    .set({ alt })
    .where(eq(gallery.id, id))
    .returning({ category: gallery.category });
  revalidateGallery(row?.category);
}
