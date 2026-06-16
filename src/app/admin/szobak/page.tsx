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
      <h1 className="text-2xl font-display font-semibold mb-6">Szobák</h1>
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400 uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Név</th>
              <th className="px-4 py-3 text-left">Kapacitás</th>
              <th className="px-4 py-3 text-left">Ártól</th>
              <th className="px-4 py-3 text-left">Aktív</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {allRooms.map((room) => (
              <tr key={room.id} className="hover:bg-gray-900/50">
                <td className="px-4 py-3 font-medium">{room.name}</td>
                <td className="px-4 py-3 text-gray-400">{room.capacity} fő</td>
                <td className="px-4 py-3 text-gray-400">
                  {room.priceFrom != null ? `${room.priceFrom.toLocaleString("hu")} Ft` : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${room.active ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-400"}`}>
                    {room.active ? "Igen" : "Nem"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/szobak/${room.id}`} className="text-blue-400 hover:text-blue-300 text-sm">
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
