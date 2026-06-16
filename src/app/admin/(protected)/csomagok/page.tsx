import { db } from "@/db";
import { packages } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Csomagok" };

async function createPackage(formData: FormData) {
  "use server";
  await db.insert(packages).values({
    slug: String(formData.get("slug")),
    name: String(formData.get("name")),
    description: String(formData.get("description")),
    contents: String(formData.get("contents")),
    price: formData.get("price") ? Number(formData.get("price")) : null,
    season: String(formData.get("season")),
    active: true,
  });
  revalidatePath("/admin/csomagok");
  redirect("/admin/csomagok");
}

async function deletePackage(formData: FormData) {
  "use server";
  await db.delete(packages).where(eq(packages.id, Number(formData.get("id"))));
  revalidatePath("/admin/csomagok");
}

export default async function AdminCsomagokPage() {
  const allPackages = await db.select().from(packages).orderBy(asc(packages.id));

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-semibold">Csomagok</h1>
      </div>

      {/* Új csomag */}
      <details className="mb-6 border border-gray-800 rounded-xl">
        <summary className="px-5 py-3 cursor-pointer text-sm text-blue-400 hover:text-blue-300">
          + Új csomag hozzáadása
        </summary>
        <form action={createPackage} className="px-5 pb-5 pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Név</label>
              <input name="name" required className={input} />
            </div>
            <div>
              <label className={label}>Slug (URL-azonosító)</label>
              <input name="slug" required placeholder="pl. romantikus-hethvege" className={input} />
            </div>
          </div>
          <div>
            <label className={label}>Leírás</label>
            <textarea name="description" rows={2} className={input} />
          </div>
          <div>
            <label className={label}>Tartalmaz (vesszővel elválasztva)</label>
            <textarea name="contents" rows={3} className={input} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Ár (Ft)</label>
              <input name="price" type="number" className={input} />
            </div>
            <div>
              <label className={label}>Szezon</label>
              <select name="season" className={input}>
                <option value="egész_év">Egész év</option>
                <option value="nyár">Nyár</option>
                <option value="tél">Tél</option>
              </select>
            </div>
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
            Hozzáadás
          </button>
        </form>
      </details>

      {/* Lista */}
      <div className="space-y-3">
        {allPackages.map((pkg) => (
          <div key={pkg.id} className="border border-gray-800 rounded-xl p-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{pkg.name}</p>
              <p className="text-gray-400 text-xs mt-0.5">{pkg.slug} · {pkg.season ?? "—"}</p>
              {pkg.description && <p className="text-gray-300 text-sm mt-1">{pkg.description}</p>}
              {pkg.price && (
                <p className="text-green-400 text-sm mt-1">{pkg.price.toLocaleString("hu")} Ft/fő</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={`/admin/csomagok/${pkg.id}`} className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 rounded hover:bg-blue-900/30 transition-colors">
                Szerkeszt
              </a>
              <form action={deletePackage}>
                <input type="hidden" name="id" value={pkg.id} />
                <button type="submit" className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-900/30 transition-colors">
                  Törlés
                </button>
              </form>
            </div>
          </div>
        ))}
        {allPackages.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">Még nincs csomag.</p>
        )}
      </div>
    </div>
  );
}

const input = "mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 block";
const label = "text-xs text-gray-400 uppercase tracking-wide";
