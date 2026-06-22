import { db } from "@/db";
import { rooms } from "@/db/schema";
import { asc } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Szobák" };

export default async function AdminSzobakPage() {
  const allRooms = await db.select().from(rooms).orderBy(asc(rooms.sortOrder));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-[var(--text)]">Szobák</h1>
        <p className="text-sm text-[var(--text2)] mt-1">Szobák alapadatai, kapacitás és ártól-érték.</p>
      </div>

      <div className="bg-[var(--surface)] border-[0.5px] border-[var(--border)] rounded-[10px] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--surface2)]">
            <tr>
              <th className="text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text2)] px-4 py-2.5">Név</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text2)] px-4 py-2.5">Kapacitás</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text2)] px-4 py-2.5">Ártól</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text2)] px-4 py-2.5">Aktív</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {allRooms.map((room) => (
              <tr key={room.id} className="border-t-[0.5px] border-[var(--border)] hover:bg-[var(--surface2)]">
                <td className="px-4 py-3 text-[13px] font-medium text-[var(--text)]">{room.name}</td>
                <td className="px-4 py-3 text-[13px] text-[var(--text2)]">{room.capacity} fő</td>
                <td className="px-4 py-3 text-[13px] text-[var(--text2)]">
                  {room.priceFrom != null ? `${room.priceFrom.toLocaleString("hu")} Ft` : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={room.active ? badgeActive : badgeNeutral}>
                    {room.active ? "Igen" : "Nem"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/szobak/${room.id}`} className="text-[13px] text-[var(--accent)] hover:underline">
                    Szerkesztés
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const badgeActive = "inline-block px-2 py-0.5 rounded-full text-[11px] bg-[var(--accent-bg)] text-[#3A5A3C]";
const badgeNeutral = "inline-block px-2 py-0.5 rounded-full text-[11px] bg-[var(--surface2)] text-[var(--text2)]";
