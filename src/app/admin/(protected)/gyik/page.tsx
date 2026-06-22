import { db } from "@/db";
import { faq } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const metadata = { title: "GYIK" };

async function createFaq(formData: FormData) {
  "use server";
  await db.insert(faq).values({
    question: String(formData.get("question")),
    answer: String(formData.get("answer")),
    sortOrder: 0,
    active: true,
  });
  revalidatePath("/admin/gyik");
}

async function deleteFaq(formData: FormData) {
  "use server";
  await db.delete(faq).where(eq(faq.id, Number(formData.get("id"))));
  revalidatePath("/admin/gyik");
}

async function toggleFaq(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  const current = formData.get("active") === "true";
  await db.update(faq).set({ active: !current }).where(eq(faq.id, id));
  revalidatePath("/admin/gyik");
}

export default async function AdminGyikPage() {
  const items = await db.select().from(faq).orderBy(asc(faq.sortOrder), asc(faq.id));

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-[var(--text)]">GYIK kezelés</h1>
        <p className="text-sm text-[var(--text2)] mt-1">Gyakran ismételt kérdések és válaszok.</p>
      </div>

      {/* Új kérdés */}
      <details className="mb-6 border-[0.5px] border-[var(--border)] rounded-[10px] bg-[var(--surface)]">
        <summary className="px-5 py-3 cursor-pointer text-sm text-[var(--accent)] hover:underline">
          + Új kérdés hozzáadása
        </summary>
        <form action={createFaq} className="px-5 pb-5 pt-3 space-y-3">
          <div>
            <label className={label}>Kérdés</label>
            <input name="question" required className={input} />
          </div>
          <div>
            <label className={label}>Válasz</label>
            <textarea name="answer" required rows={3} className={input} />
          </div>
          <button type="submit" className={saveBtn}>
            Hozzáadás
          </button>
        </form>
      </details>

      {/* Lista */}
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.id} className="border-[0.5px] border-[var(--border)] rounded-[10px] bg-[var(--surface)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-[var(--text)]">{item.question}</p>
                <p className="text-[var(--text2)] text-sm mt-1 leading-relaxed">{item.answer}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-[var(--text3)]">#{i + 1}</span>
                <form action={toggleFaq}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="active" value={String(item.active)} />
                  <button type="submit" className={`px-2 py-0.5 rounded-full text-[11px] ${item.active ? "bg-[var(--accent-bg)] text-[#3A5A3C]" : "bg-[var(--surface2)] text-[var(--text2)]"}`}>
                    {item.active ? "Aktív" : "Rejtett"}
                  </button>
                </form>
                <form action={deleteFaq}>
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" className="text-[#C44] hover:bg-[#FCEBEB] text-xs px-2 py-0.5 rounded transition-colors">
                    Törlés
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-[var(--text3)] text-sm text-center py-8">Még nincs GYIK bejegyzés.</p>
        )}
      </div>
    </div>
  );
}

const input = "mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] block";
const label = "text-xs text-[var(--text2)] uppercase tracking-wide";
const saveBtn = "px-5 py-2 rounded-md bg-[var(--nav-bg)] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity";
