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
    <div className="pt-16 bg-stone min-h-screen">
      <section className="bg-ink py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-widest text-salt mb-4">Ajánlatok</p>
          <h1 className="font-display text-5xl sm:text-6xl text-stone font-light mb-6">
            Csomagajánlatok
          </h1>
          <p className="text-mist/70 text-lg leading-relaxed max-w-2xl">
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
                <div key={pkg.id} className="bg-white rounded-2xl border border-ink/10 p-7 flex flex-col">
                  <div className="mb-4">
                    {pkg.season && pkg.season !== "egész_év" && (
                      <p className="font-mono text-xs uppercase tracking-widest text-salt mb-2">
                        {pkg.season === "nyár" ? "Nyári ajánlat" : "Téli ajánlat"}
                      </p>
                    )}
                    <h2 className="font-display text-2xl text-ink">{pkg.name}</h2>
                    {pkg.description && (
                      <p className="mt-2 text-bark/70 text-sm leading-relaxed">{pkg.description}</p>
                    )}
                  </div>

                  {contents.length > 0 && (
                    <ul className="mb-5 space-y-1.5 flex-1">
                      {contents.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-bark/70">
                          <span className="text-moss mt-0.5">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-auto pt-4 border-t border-ink/8 flex items-center justify-between gap-4">
                    {pkg.price != null ? (
                      <div>
                        <p className="font-mono text-xs uppercase tracking-widest text-mist/50 mb-0.5">ártól</p>
                        <p className="font-display text-2xl text-ink">
                          {pkg.price.toLocaleString("hu-HU")} Ft
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-bark/40">Ár egyéni</p>
                    )}
                    <Link
                      href="/kapcsolat"
                      className="px-5 py-2 rounded-full bg-salt text-bark text-sm font-sans font-medium hover:bg-salt/90 transition-colors whitespace-nowrap"
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
              <div className="w-8 h-2 bg-moss rounded-sm" />
              <div className="w-8 h-2 bg-salt rounded-sm" />
            </div>
            <h2 className="font-display text-3xl text-ink mb-4">Csomagok hamarosan</h2>
            <p className="text-bark/60 leading-relaxed mb-8">
              Jelenleg állítjuk össze szezonális ajánlatainkat. Érdeklődjön
              személyesen – szívesen állítunk össze Önre szabott ajánlatot!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/kapcsolat"
                className="px-8 py-3 rounded-full bg-salt text-bark font-sans font-medium hover:bg-salt/90 transition-colors"
              >
                Kérek egyedi ajánlatot
              </Link>
              <Link
                href="/foglalas"
                className="px-8 py-3 rounded-full border border-ink/20 text-bark font-sans font-medium hover:border-ink/40 transition-colors"
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
