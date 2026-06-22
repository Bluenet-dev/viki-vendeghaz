import type { Metadata } from "next";
import { db } from "@/db";
import { faq } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "GYIK – Gyakran Ismételt Kérdések",
  description:
    "Bejelentkezés, kisállat, dohányzás, szauna, csendrendelet – minden fontos tudnivaló a Viki Vendégházról.",
};

export default async function GyikPage() {
  const items = await db
    .select()
    .from(faq)
    .where(eq(faq.active, true))
    .orderBy(asc(faq.sortOrder), asc(faq.id));

  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      <section className="bg-[var(--nav-bg)] py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">GYIK</p>
          <h1 className="text-5xl sm:text-6xl text-white font-light mb-6">
            Gyakran ismételt kérdések
          </h1>
          <p className="text-[var(--text2)]/70 text-lg max-w-2xl">
            Ha kérdése nem szerepel itt, hívjon minket vagy írjon emailt – 24 órás
            ügyeleten elérhető vagyunk.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-3xl divide-y divide-[var(--border)]">
          {items.map((item) => (
            <details key={item.id} className="group py-5">
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                <span className="font-sans font-medium text-[var(--text)]">{item.question}</span>
                <span className="flex-shrink-0 text-[var(--accent2)] text-lg group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <p className="mt-3 text-[var(--text)]/70 leading-relaxed">{item.answer}</p>
            </details>
          ))}
          {items.length === 0 && (
            <p className="py-10 text-center text-[var(--text)]/40 text-sm">
              Hamarosan feltöltjük a GYIK rovatot.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
