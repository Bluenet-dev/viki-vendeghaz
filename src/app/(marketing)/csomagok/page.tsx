import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { packages } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Csomagajánlatok",
  description:
    "Szezonális csomagajánlatok és akciók a Viki Vendégházban. Foglaljon wellness-hétvégét Szilvásváradon!",
};

export default async function CsomagokPage() {
  const activePackages = await db
    .select()
    .from(packages)
    .where(eq(packages.active, true))
    .orderBy(asc(packages.id));

  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      <section className="bg-[var(--nav-bg)] py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Ajánlatok</p>
          <h1 className="text-5xl sm:text-6xl text-white font-light mb-6">
            Csomagajánlatok
          </h1>
          <p className="text-[var(--text2)]/70 text-lg leading-relaxed max-w-2xl">
            Szezonális csomagjaink és különleges ajánlataink – foglaljon egyedi
            élményt Szilvásváradon.
          </p>
        </div>
      </section>

      {activePackages.length > 0 ? (
        <section className="py-16 px-6">
          <div className="mx-auto max-w-4xl grid sm:grid-cols-2 gap-6">
            {activePackages.map((pkg) => {
              const contents = pkg.contents
                ? pkg.contents.split(",").map((s) => s.trim()).filter(Boolean)
                : [];

              return (
                <div key={pkg.id} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-7 flex flex-col">
                  <div className="mb-4">
                    {pkg.season && pkg.season !== "egész_év" && (
                      <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-2">
                        {pkg.season === "nyár" ? "Nyári ajánlat" : "Téli ajánlat"}
                      </p>
                    )}
                    <h2 className="text-2xl text-[var(--text)]">{pkg.name}</h2>
                    {pkg.description && (
                      <p className="mt-2 text-[var(--text)]/70 text-sm leading-relaxed">{pkg.description}</p>
                    )}
                  </div>

                  {contents.length > 0 && (
                    <ul className="mb-5 space-y-1.5 flex-1">
                      {contents.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-[var(--text)]/70">
                          <span className="text-[var(--accent)] mt-0.5">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-auto pt-4 border-t border-[var(--border)] flex items-center justify-between gap-4">
                    {pkg.price != null ? (
                      <div>
                        <p className="text-xs uppercase tracking-widest text-[var(--text2)]/50 mb-0.5">ártól</p>
                        <p className="text-2xl text-[var(--text)]">
                          {pkg.price.toLocaleString("hu-HU")} Ft
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--text)]/40">Ár egyéni</p>
                    )}
                    <Link
                      href="/kapcsolat"
                      className="px-5 py-2 rounded-full bg-[var(--accent2)] text-[var(--text)] text-sm font-sans font-medium hover:bg-[var(--accent2)]/90 transition-colors whitespace-nowrap"
                    >
                      Érdeklődöm
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="py-20 px-6 text-center">
          <div className="mx-auto max-w-xl">
            <div className="flex justify-center gap-1 mb-8">
              <div className="w-8 h-2 bg-[var(--accent)] rounded-sm" />
              <div className="w-8 h-2 bg-[var(--accent2)] rounded-sm" />
            </div>
            <h2 className="text-3xl text-[var(--text)] mb-4">Csomagok hamarosan</h2>
            <p className="text-[var(--text)]/60 leading-relaxed mb-8">
              Jelenleg állítjuk össze szezonális ajánlatainkat. Érdeklődjön
              személyesen – szívesen állítunk össze Önre szabott ajánlatot!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/kapcsolat"
                className="px-8 py-3 rounded-full bg-[var(--accent2)] text-[var(--text)] font-sans font-medium hover:bg-[var(--accent2)]/90 transition-colors"
              >
                Kérek egyedi ajánlatot
              </Link>
              <Link
                href="/foglalas"
                className="px-8 py-3 rounded-full border border-[var(--border)] text-[var(--text)] font-sans font-medium hover:border-[var(--border)] transition-colors"
              >
                Foglalás
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
