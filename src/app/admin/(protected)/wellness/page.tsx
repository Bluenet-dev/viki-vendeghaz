import { db } from "@/db";
import { wellnessServices, wellnessPriceTiers } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wellness" };

async function updateService(formData: FormData) {
  "use server";
  const id = Number(formData.get("serviceId"));
  await db
    .update(wellnessServices)
    .set({
      name: String(formData.get("name")),
      guestPriceLabel: String(formData.get("guestPriceLabel")),
      guestPriceNote: String(formData.get("guestPriceNote") || ""),
      externalPriceLabel: String(formData.get("externalPriceLabel") || ""),
      openingHours: String(formData.get("openingHours") || ""),
      note: String(formData.get("note") || ""),
    })
    .where(eq(wellnessServices.id, id));

  revalidatePath("/admin/wellness");
  revalidatePath("/wellness");
  revalidatePath("/wellness/sobarlang");
  revalidatePath("/wellness/finn-szauna");
  revalidatePath("/wellness/infraszauna");
  revalidatePath("/wellness/dezsafurdo");
  revalidatePath("/wellness/kert-medence");
}

async function addTier(formData: FormData) {
  "use server";
  await db.insert(wellnessPriceTiers).values({
    serviceSlug: String(formData.get("serviceSlug")),
    groupLabel: String(formData.get("groupLabel")),
    tierLabel: String(formData.get("tierLabel")),
    price: String(formData.get("price")),
  });
  revalidatePath("/admin/wellness");
  revalidatePath("/wellness/sobarlang");
}

async function deleteTier(formData: FormData) {
  "use server";
  await db.delete(wellnessPriceTiers).where(eq(wellnessPriceTiers.id, Number(formData.get("id"))));
  revalidatePath("/admin/wellness");
  revalidatePath("/wellness/sobarlang");
}

export default async function AdminWellnessPage() {
  const services = await db.select().from(wellnessServices).orderBy(asc(wellnessServices.sortOrder));
  const tiers = await db.select().from(wellnessPriceTiers).orderBy(asc(wellnessPriceTiers.sortOrder));

  return (
    <div className="max-w-4xl space-y-10">
      <h1 className="text-2xl font-display font-semibold">Wellness</h1>

      <section className="space-y-4">
        {services.map((s) => (
          <form key={s.id} action={updateService} className="border border-gray-800 rounded-xl p-5 space-y-3">
            <input type="hidden" name="serviceId" value={s.id} />
            <div>
              <label className={label}>Megnevezés</label>
              <input name="name" defaultValue={s.name} required className={input} />
              <span className="text-gray-500 text-xs">{s.slug}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Szállóvendég ár</label>
                <input name="guestPriceLabel" defaultValue={s.guestPriceLabel} className={input} />
              </div>
              <div>
                <label className={label}>Szállóvendég megjegyzés</label>
                <input name="guestPriceNote" defaultValue={s.guestPriceNote ?? ""} className={input} />
              </div>
              <div>
                <label className={label}>Külsős ár / megjegyzés</label>
                <input name="externalPriceLabel" defaultValue={s.externalPriceLabel ?? ""} className={input} />
              </div>
              <div>
                <label className={label}>Nyitvatartás</label>
                <input name="openingHours" defaultValue={s.openingHours ?? ""} className={input} />
              </div>
            </div>
            <div>
              <label className={label}>Megjegyzés</label>
              <input name="note" defaultValue={s.note ?? ""} className={input} />
            </div>
            <button type="submit" className={saveBtn}>Mentés</button>
          </form>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Sóbarlang tarifatáblázat</h2>
        <details className="mb-4 border border-gray-800 rounded-xl">
          <summary className="px-5 py-3 cursor-pointer text-sm text-blue-400 hover:text-blue-300">
            + Új sor hozzáadása
          </summary>
          <form action={addTier} className="px-5 pb-5 pt-3 grid grid-cols-4 gap-3 items-end">
            <input type="hidden" name="serviceSlug" value="sobarlang" />
            <div>
              <label className={label}>Csoport</label>
              <input name="groupLabel" placeholder="Egyedi jegy / Bérlet (10x)" required className={input} />
            </div>
            <div>
              <label className={label}>Megnevezés</label>
              <input name="tierLabel" required className={input} />
            </div>
            <div>
              <label className={label}>Ár</label>
              <input name="price" required className={input} />
            </div>
            <button type="submit" className={saveBtn}>Hozzáadás</button>
          </form>
        </details>
        <div className="space-y-2">
          {tiers.map((t) => (
            <div key={t.id} className="border border-gray-800 rounded-xl p-3 flex items-center justify-between gap-4">
              <div className="text-sm">
                <span className="text-gray-500">{t.groupLabel} ·</span> {t.tierLabel}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-400 text-sm">{t.price}</span>
                <form action={deleteTier}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-900/30 transition-colors">
                    Törlés
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const input = "mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 block";
const label = "text-xs text-gray-400 uppercase tracking-wide";
const saveBtn = "px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors";
