"use server";

import { db } from "@/db";
import { gallery } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { WELLNESS_CATEGORIES } from "@/lib/gallery-categories";

export type SaveState = { ok?: boolean; error?: string };

async function requireAdmin(): Promise<boolean> {
  const session = await getSession();
  return session.isLoggedIn === true;
}

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

// A tényleges fájl a böngészőből közvetlenül a Blob tárolóba kerül
// (lásd /api/gallery/upload). Ez a függvény csak a feltöltött kép adatsorát
// szúrja be az adatbázisba – kis JSON, így nincs body-méret limit probléma.
export async function saveUploadedImage(input: {
  url: string;
  alt: string;
  category: string;
}): Promise<SaveState> {
  try {
    if (!(await requireAdmin())) return { error: "Nincs jogosultság a művelethez." };
    if (!input.url || !input.category) return { error: "Hiányzó kép-adat." };

    const sortOrder = await nextSortOrder(input.category);
    await db.insert(gallery).values({
      url: input.url,
      alt: input.alt ?? "",
      category: input.category,
      sortOrder,
    });

    revalidateGallery(input.category);
    return { ok: true };
  } catch (err) {
    console.error("Galéria mentési hiba:", err);
    return {
      error: "Mentési hiba: " + (err instanceof Error ? err.message : "ismeretlen hiba"),
    };
  }
}

export async function deleteImageAction(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = Number(formData.get("id"));
  if (!id) return;
  const [row] = await db.select().from(gallery).where(eq(gallery.id, id));
  await db.delete(gallery).where(eq(gallery.id, id));
  revalidateGallery(row?.category);
}

// ↑/↓: a kép és a szomszédja helyet cserél a kategórián belül, majd a teljes
// kategória sort_order-jét 1..n-re normalizáljuk (így a holtversenyek is eltűnnek).
export async function moveImageAction(formData: FormData) {
  if (!(await requireAdmin())) return;
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
  if (!(await requireAdmin())) return;
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
