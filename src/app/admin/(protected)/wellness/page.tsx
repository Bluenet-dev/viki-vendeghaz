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
      <div>
        <h1 className="text-xl font-semibold text-[var(--text)]">Wellness</h1>
        <p className="text-sm text-[var(--text2)] mt-1">Wellness szolgáltatások és a sóbarlang tarifatáblázata.</p>
      </div>

      <section className="space-y-4">
        {services.map((s) => (
          <form key={s.id} action={updateService} className="border-[0.5px] border-[var(--border)] rounded-[10px] bg-[var(--surface)] p-5 space-y-3">
            <input type="hidden" name="serviceId" value={s.id} />
            <div>
              <label className={label}>Megnevezés</label>
              <input name="name" defaultValue={s.name} required className={input} />
              <span className="text-[var(--text3)] text-xs">{s.slug}</span>
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
        <h2 className="text-lg font-medium mb-3 text-[var(--text)]">Sóbarlang tarifatáblázat</h2>
        <details className="mb-4 border-[0.5px] border-[var(--border)] rounded-[10px] bg-[var(--surface)]">
          <summary className="px-5 py-3 cursor-pointer text-sm text-[var(--accent)] hover:underline">
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
            <div key={t.id} className="border-[0.5px] border-[var(--border)] rounded-[10px] bg-[var(--surface)] p-3 flex items-center justify-between gap-4">
              <div className="text-sm text-[var(--text)]">
                <span className="text-[var(--text3)]">{t.groupLabel} ·</span> {t.tierLabel}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[var(--accent)] text-sm font-medium">{t.price}</span>
                <form action={deleteTier}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="text-[#C44] hover:bg-[#FCEBEB] text-xs px-2 py-1 rounded transition-colors">
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

const input = "mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] block";
const label = "text-xs text-[var(--text2)] uppercase tracking-wide";
const saveBtn = "px-5 py-2 rounded-md bg-[var(--nav-bg)] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity";
