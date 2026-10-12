import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { addDays, isIsoDate, todayBudapest } from "@/lib/booking/dates";
import { getSettings, loadPackages } from "@/lib/booking/server";
import { offersEnabled } from "@/modules/offers/flag";
import { OfferRequestForm } from "@/modules/offers/request-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ajánlatkérés | Viki Vendégház Szilvásvárad",
  description: "Kérjen személyre szabott ajánlatot csoportnak, családnak, egész házra vagy szobára. Az ajánlatot e-mailben küldjük.",
};

const n = (v: string | undefined, min: number, def: number) => {
  const x = Number(v);
  return Number.isInteger(x) && x >= min && x <= 12 ? x : def;
};

export default async function AjanlatkeresPage({
  searchParams,
}: {
  searchParams: Promise<{ erkezes?: string; tavozas?: string; felnott?: string; kamasz?: string; gyerek?: string; baba?: string; fo?: string }>;
}) {
  if (!offersEnabled()) notFound();
  const sp = await searchParams;
  const minDate = addDays(todayBudapest(), 1);
  const [s, packages] = await Promise.all([getSettings(), loadPackages()]);

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-16">
      <section className="bg-[var(--nav-bg)] px-6 pt-16 pb-10">
        <div className="mx-auto max-w-2xl">
          <p className="mb-3 text-xs uppercase tracking-widest text-[var(--accent2)]">Ajánlatkérés</p>
          <h1 className="text-4xl font-light text-white sm:text-5xl">Kérjen ajánlatot</h1>
          <p className="mt-4 text-[var(--nav-text)]/80">Írja meg, mikor és hányan jönnének, és e-mailben küldjük a személyre szabott ajánlatot.</p>
        </div>
      </section>
      <section className="px-6 py-10">
        <OfferRequestForm
          minDate={minDate}
          checkIn={isIsoDate(sp.erkezes) && sp.erkezes >= minDate ? sp.erkezes : undefined}
          checkOut={isIsoDate(sp.tavozas) ? sp.tavozas : undefined}
          party={{ adults: n(sp.felnott ?? sp.fo, 1, 2), teens: n(sp.kamasz, 0, 0), children: n(sp.gyerek, 0, 0), infants: n(sp.baba, 0, 0) }}
          packages={packages.filter((p) => p.active).map((p) => ({ slug: p.slug, name: p.name, includes: p.includes }))}
          saunaDayPrice={s.saunaDayPrice}
          tubPrice={s.tubPrice}
          mealPrices={{ reggeli: s.breakfastPrice, vacsora: s.dinnerPrice, felpanzio: s.halfBoardPrice }}
          phone={s.phone}
        />
      </section>
    </div>
  );
}
