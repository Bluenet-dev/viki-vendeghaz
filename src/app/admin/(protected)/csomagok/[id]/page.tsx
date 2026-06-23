import { db } from "@/db";
import { packages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function updatePackage(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  await db
    .update(packages)
    .set({
      name: String(formData.get("name")),
      slug: String(formData.get("slug")),
      description: String(formData.get("description")),
      contents: String(formData.get("contents")),
      price: formData.get("price") ? Number(formData.get("price")) : null,
      season: String(formData.get("season")),
      active: formData.get("active") === "on",
    })
    .where(eq(packages.id, id));
  revalidatePath("/admin/csomagok");
  revalidatePath("/csomagok");
  redirect("/admin/csomagok");
}

export default async function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [pkg] = await db.select().from(packages).where(eq(packages.id, Number(id)));
  if (!pkg) notFound();

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-[var(--text)]">Csomag szerkesztése</h1>
        <p className="text-sm text-[var(--text2)] mt-1">A csomag publikus adatainak módosítása.</p>
      </div>
      <form action={updatePackage} className="space-y-5">
        <input type="hidden" name="id" value={pkg.id} />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Név">
            <input name="name" defaultValue={pkg.name} required className={input} />
          </Field>
          <Field label="Slug (URL-azonosító)">
            <input name="slug" defaultValue={pkg.slug ?? ""} required className={input} />
          </Field>
        </div>
        <Field label="Leírás">
          <textarea name="description" defaultValue={pkg.description ?? ""} rows={2} className={input} />
        </Field>
        <Field label="Tartalmaz (vesszővel elválasztva)">
          <textarea name="contents" defaultValue={pkg.contents ?? ""} rows={3} className={input} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Ár (Ft / éjszaka)">
            <input name="price" type="number" defaultValue={pkg.price ?? ""} className={input} />
          </Field>
          <Field label="Szezon">
            <select name="season" defaultValue={pkg.season ?? "egész_év"} className={input}>
              <option value="egész_év">Egész év</option>
              <option value="nyár">Nyár</option>
              <option value="tél">Tél</option>
            </select>
          </Field>
        </div>
        <Field label="">
          <label className="flex items-center gap-2 text-sm text-[var(--text)]">
            <input type="checkbox" name="active" defaultChecked={pkg.active ?? true} />
            Aktív (látható az oldalon)
          </label>
        </Field>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-5 py-2 rounded-md bg-[var(--nav-bg)] text-white text-[14px] font-semibold hover:opacity-90 transition-opacity">
            Mentés
          </button>
          <a href="/admin/csomagok" className="px-5 py-2 rounded-md border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] text-[14px] transition-colors">
            Mégse
          </a>
        </div>
      </form>
    </div>
  );
}

const input = "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[14px] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-[var(--text2)] uppercase tracking-wide">{label}</label>}
      {children}
    </div>
  );
}
