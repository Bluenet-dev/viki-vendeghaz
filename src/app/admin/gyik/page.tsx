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
      <h1 className="text-2xl font-display font-semibold mb-6">GYIK kezelés</h1>

      {/* Új kérdés */}
      <details className="mb-6 border border-gray-800 rounded-xl">
        <summary className="px-5 py-3 cursor-pointer text-sm text-blue-400 hover:text-blue-300">
          + Új kérdés hozzáadása
        </summary>
        <form action={createFaq} className="px-5 pb-5 pt-3 space-y-3">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide">Kérdés</label>
            <input name="question" required className={input} />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide">Válasz</label>
            <textarea name="answer" required rows={3} className={input} />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
            Hozzáadás
          </button>
        </form>
      </details>

      {/* Lista */}
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.id} className="border border-gray-800 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.question}</p>
                <p className="text-gray-400 text-sm mt-1 leading-relaxed">{item.answer}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-500">#{i + 1}</span>
                <form action={toggleFaq}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="active" value={String(item.active)} />
                  <button type="submit" className={`px-2 py-0.5 rounded-full text-xs ${item.active ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-400"}`}>
                    {item.active ? "Aktív" : "Rejtett"}
                  </button>
                </form>
                <form action={deleteFaq}>
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" className="text-red-400 hover:text-red-300 text-xs px-2 py-0.5 rounded hover:bg-red-900/30 transition-colors">
                    Törlés
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">Még nincs GYIK bejegyzés.</p>
        )}
      </div>
    </div>
  );
}

const input = "mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 block";
