import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tariffPrices } from "@/db/schema";
import { formatFt, type Scope } from "@/lib/booking/constants";
import { getSettings, loadTariffs } from "@/lib/booking/server";

// Kis "Árak" blokk a szobaoldalakon: az adott szoba létszámárai a tarifatáblából.
export async function RoomPricingTable({ roomScope }: { roomScope: Scope }) {
  const [rows, tariffList, s] = await Promise.all([
    db.select().from(tariffPrices).where(eq(tariffPrices.roomScope, roomScope)),
    loadTariffs(),
    getSettings(),
  ]);
  if (!rows.length) return null;

  // A szobaárak tarifánként azonosak; az első, szobánként foglalható tarifa sorait mutatjuk.
  const open = tariffList.find((t) => t.roomMode === "open" && rows.some((r) => r.tariffCode === t.code)) ?? tariffList[0];
  const list = rows.filter((r) => r.tariffCode === open.code).sort((a, b) => a.guests - b.guests);
  const from = Math.min(...rows.map((r) => r.price));
  const year = s.newPricingFrom.slice(0, 4);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="mb-1 text-xs uppercase tracking-widest text-[var(--accent2)]">Árak</p>
      <p className="text-[15px] font-semibold text-[var(--text)]">{year}-ben {formatFt(from)} / éjtől</p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-[14px]">
        {list.map((r) => (
          <div key={r.guests} className="contents">
            <dt className="text-[var(--text2)]">{r.guests} fő</dt>
            <dd className="text-right text-[var(--text)]">{formatFt(r.price)} / éj</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[13px] text-[var(--text3)]">
        Gyerek 3–12 év kedvezményes, 0–2 év ingyenes. Takarítási díj {formatFt(s.roomCleaningFee)}, ha {s.roomCleaningUnderNights} éjnél
        rövidebb; idegenforgalmi adó {formatFt(s.ifaPerPersonPerNight)} / fő / éj (18 év felett).
      </p>
      <Link href="/arak" className="mt-3 inline-block text-[14px] font-semibold text-[var(--accent)] hover:underline">
        Minden ár és időszak →
      </Link>
    </div>
  );
}
