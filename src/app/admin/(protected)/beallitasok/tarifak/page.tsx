import Link from "next/link";
import { db } from "@/db";
import { tariffPrices } from "@/db/schema";
import { loadPackages, loadTariffs } from "@/lib/booking/server";
import { PackageEditor, TariffEditor } from "./editors";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tarifák" };

export default async function TarifakPage() {
  const [list, prices, packages] = await Promise.all([loadTariffs(), db.select().from(tariffPrices), loadPackages()]);
  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <Link href="/admin/beallitasok" className="text-[13px] text-[var(--text2)] hover:text-[var(--text)]">← Beállítások</Link>
        <h1 className="mt-3 text-xl font-semibold text-[var(--text)]">Tarifák</h1>
        <p className="mt-1 text-[14px] text-[var(--text2)]">
          Minden naphoz tartozik egy tarifa (A–H). A tarifa adja a létszám szerinti árakat, a minimum éjszakát, és hogy
          foglalhatók-e szobánként. Az ár a naptárban naponta kézzel is átírható.
        </p>
      </div>
      {list.map((t) => (
        <TariffEditor
          key={t.code}
          code={t.code}
          name={t.name}
          color={t.color}
          minNights={t.minNights}
          roomMode={t.roomMode}
          releaseDays={t.releaseDays}
          prices={Object.fromEntries(prices.filter((p) => p.tariffCode === t.code).map((p) => [`${p.roomScope}|${p.guests}`, p.price]))}
        />
      ))}

      <h2 className="pt-4 text-[17px] font-semibold text-[var(--text)]">Csomagok (csak egész ház)</h2>
      {packages.map((p) => (
        <PackageEditor key={p.slug} {...p} />
      ))}
    </div>
  );
}
