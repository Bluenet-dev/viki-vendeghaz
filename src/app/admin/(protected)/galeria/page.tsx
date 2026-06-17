import { db } from "@/db";
import { gallery } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import Image from "next/image";

export const dynamic = "force-dynamic";
export const metadata = { title: "Galéria" };

async function uploadImage(formData: FormData) {
  "use server";
  const file = formData.get("file") as File;
  const category = String(formData.get("category"));
  const alt = String(formData.get("alt"));

  if (!file || file.size === 0) return;

  const blob = await put(`gallery/${category}/${Date.now()}-${file.name}`, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  await db.insert(gallery).values({ url: blob.url, alt, category, sortOrder: 0 });
  revalidatePath("/admin/galeria");
}

async function deleteImage(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  await db.delete(gallery).where(eq(gallery.id, id));
  revalidatePath("/admin/galeria");
}

const CATEGORIES = [
  { value: "szobak", label: "Szobák" },
  { value: "wellness", label: "Wellness (általános)" },
  { value: "sobarlang", label: "Sóbarlang" },
  { value: "finn-szauna", label: "Finn szauna" },
  { value: "infraszauna", label: "Infraszauna" },
  { value: "dezsafurdo", label: "Dézsafürdő" },
  { value: "kert-medence", label: "Kert & medence" },
  { value: "udvar", label: "Udvar & kert" },
  { value: "termeszet", label: "Természet" },
  { value: "etkezes", label: "Étkezés" },
];

export default async function AdminGaleriaPage() {
  const images = await db.select().from(gallery).orderBy(asc(gallery.category), asc(gallery.sortOrder));

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold mb-6">Galéria</h1>

      {/* Feltöltés */}
      <div className="border border-gray-800 rounded-xl p-5 mb-8">
        <h2 className="text-sm font-medium text-gray-300 mb-4">Kép feltöltése</h2>
        <form action={uploadImage} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className={lbl}>Kategória</label>
            <select name="category" className={input}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Leírás (alt)</label>
            <input name="alt" placeholder="pl. Sóbarlang belső" className={input} />
          </div>
          <div>
            <label className={lbl}>Képfájl</label>
            <input type="file" name="file" accept="image/*" required className="mt-1 text-sm text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-gray-800 file:text-gray-300 hover:file:bg-gray-700" />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors self-end">
            Feltöltés
          </button>
        </form>
      </div>

      {/* Grid */}
      {CATEGORIES.map((cat) => {
        const catImages = images.filter((img) => img.category === cat.value);
        if (catImages.length === 0) return null;
        return (
          <div key={cat.value} className="mb-8">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">{cat.label}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {catImages.map((img) => (
                <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-800 aspect-video bg-gray-900">
                  <Image src={img.url} alt={img.alt ?? ""} fill className="object-cover" sizes="200px" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <form action={deleteImage}>
                      <input type="hidden" name="id" value={img.id} />
                      <button type="submit" className="text-xs text-red-400 hover:text-red-300 bg-black/50 px-2 py-1 rounded">
                        Törlés
                      </button>
                    </form>
                  </div>
                  {img.alt && <p className="absolute bottom-0 left-0 right-0 px-2 py-1 text-xs text-gray-300 bg-black/50 truncate opacity-0 group-hover:opacity-100 transition-opacity">{img.alt}</p>}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {images.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-8">Még nincs feltöltött kép.</p>
      )}
    </div>
  );
}

const input = "mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 block";
const lbl = "text-xs text-gray-400 uppercase tracking-wide";
