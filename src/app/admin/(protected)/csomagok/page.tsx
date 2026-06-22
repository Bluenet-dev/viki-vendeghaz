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
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-[var(--text)]">Csomagok</h1>
        <p className="text-sm text-[var(--text2)] mt-1">Ajánlati csomagok és áraik kezelése.</p>
      </div>

      {/* Új csomag */}
      <details className="mb-6 border-[0.5px] border-[var(--border)] rounded-[10px] bg-[var(--surface)]">
        <summary className="px-5 py-3 cursor-pointer text-sm text-[var(--accent)] hover:underline">
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
          <button type="submit" className={saveBtn}>
            Hozzáadás
          </button>
        </form>
      </details>

      {/* Lista */}
      <div className="space-y-3">
        {allPackages.map((pkg) => (
          <div key={pkg.id} className="border-[0.5px] border-[var(--border)] rounded-[10px] bg-[var(--surface)] p-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-[var(--text)]">{pkg.name}</p>
              <p className="text-[var(--text2)] text-xs mt-0.5">{pkg.slug} · {pkg.season ?? "—"}</p>
              {pkg.description && <p className="text-[var(--text2)] text-sm mt-1">{pkg.description}</p>}
              {pkg.price && (
                <p className="text-[var(--accent)] text-sm mt-1 font-medium">{pkg.price.toLocaleString("hu")} Ft/fő</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={`/admin/csomagok/${pkg.id}`} className="text-[var(--accent)] hover:underline text-xs px-2 py-1">
                Szerkeszt
              </a>
              <form action={deletePackage}>
                <input type="hidden" name="id" value={pkg.id} />
                <button type="submit" className="text-[#C44] hover:bg-[#FCEBEB] text-xs px-2 py-1 rounded transition-colors">
                  Törlés
                </button>
              </form>
            </div>
          </div>
        ))}
        {allPackages.length === 0 && (
          <p className="text-[var(--text3)] text-sm text-center py-8">Még nincs csomag.</p>
        )}
      </div>
    </div>
  );
}

const input = "mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[14px] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] block";
const label = "text-xs text-[var(--text2)] uppercase tracking-wide";
const saveBtn = "px-5 py-2 rounded-md bg-[var(--nav-bg)] text-white text-[14px] font-semibold hover:opacity-90 transition-opacity";
