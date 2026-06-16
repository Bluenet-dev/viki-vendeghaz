import { db } from "@/db";
import { icalSources, rooms } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "iCal forrás kezelés" };

async function addSource(formData: FormData) {
  "use server";
  await db.insert(icalSources).values({
    roomSlug: String(formData.get("roomSlug")),
    name: String(formData.get("name")),
    url: String(formData.get("url")),
    active: true,
  });
  revalidatePath("/admin/naptar/ical-sources");
  redirect("/admin/naptar/ical-sources");
}

async function deleteSource(formData: FormData) {
  "use server";
  await db.delete(icalSources).where(eq(icalSources.id, Number(formData.get("id"))));
  revalidatePath("/admin/naptar/ical-sources");
}

async function toggleSource(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  const current = formData.get("active") === "true";
  await db.update(icalSources).set({ active: !current }).where(eq(icalSources.id, id));
  revalidatePath("/admin/naptar/ical-sources");
}

export default async function IcalSourcesPage() {
  const allRooms = await db.select().from(rooms).where(eq(rooms.active, true)).orderBy(asc(rooms.sortOrder));
  const sources = await db.select().from(icalSources).orderBy(asc(icalSources.roomSlug));

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <a href="/admin/naptar" className="text-gray-400 hover:text-gray-200 text-sm">← Naptár</a>
        <span className="text-gray-700">/</span>
        <h1 className="text-xl font-display font-semibold">iCal import URL-ek</h1>
      </div>

      <p className="text-sm text-gray-400 mb-6 leading-relaxed">
        Add meg a Booking.com és Szállás.hu által biztosított iCal export URL-eket. Szinkronizáláskor
        ezek alapján frissül a naptár, és az OTA-n foglalt dátumok automatikusan zárolódnak.
      </p>

      {/* Új forrás */}
      <details className="mb-6 border border-gray-800 rounded-xl" open>
        <summary className="px-5 py-3 cursor-pointer text-sm text-blue-400 hover:text-blue-300">
          + Új iCal forrás hozzáadása
        </summary>
        <form action={addSource} className="px-5 pb-5 pt-3 space-y-3">
          <div>
            <label className={lbl}>Szoba</label>
            <select name="roomSlug" className={input}>
              {allRooms.map((r) => (
                <option key={r.slug} value={r.slug ?? ""}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Forrás neve</label>
            <input name="name" required placeholder="pl. Booking.com – szoba-1" className={input} />
          </div>
          <div>
            <label className={lbl}>iCal URL</label>
            <input name="url" type="url" required placeholder="https://ical.booking.com/..." className={input} />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
            Hozzáadás
          </button>
        </form>
      </details>

      {/* Lista */}
      <div className="space-y-2">
        {sources.map((s) => (
          <div key={s.id} className="border border-gray-800 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{s.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.roomSlug}</p>
                <p className="text-xs text-gray-600 mt-1 truncate font-mono">{s.url}</p>
                {s.lastFetched && (
                  <p className="text-xs text-gray-600 mt-1">
                    Utoljára szinkronizálva: {new Date(s.lastFetched).toLocaleString("hu")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <form action={toggleSource}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="active" value={String(s.active)} />
                  <button type="submit" className={`text-xs px-2 py-0.5 rounded-full ${s.active ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-400"}`}>
                    {s.active ? "Aktív" : "Inaktív"}
                  </button>
                </form>
                <form action={deleteSource}>
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" className="text-xs text-red-400 hover:text-red-300">Törlés</button>
                </form>
              </div>
            </div>
          </div>
        ))}
        {sources.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-6">Még nincs iCal forrás.</p>
        )}
      </div>
    </div>
  );
}

const input = "mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 block";
const lbl = "text-xs text-gray-400 uppercase tracking-wide";
