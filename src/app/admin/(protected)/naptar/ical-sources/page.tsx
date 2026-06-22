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
      <div className="flex items-center gap-3 mb-2">
        <a href="/admin/naptar" className="text-[var(--text2)] hover:text-[var(--text)] text-sm">← Naptár</a>
        <span className="text-[var(--text3)]">/</span>
        <h1 className="text-xl font-semibold text-[var(--text)]">iCal import URL-ek</h1>
      </div>

      <p className="text-sm text-[var(--text2)] mb-6 leading-relaxed">
        Add meg a Booking.com és Szállás.hu által biztosított iCal export URL-eket. Szinkronizáláskor
        ezek alapján frissül a naptár, és az OTA-n foglalt dátumok automatikusan zárolódnak.
      </p>

      {/* Új forrás */}
      <details className="mb-6 border-[0.5px] border-[var(--border)] rounded-[10px] bg-[var(--surface)]" open>
        <summary className="px-5 py-3 cursor-pointer text-sm text-[var(--accent)] hover:underline">
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
          <button type="submit" className={saveBtn}>
            Hozzáadás
          </button>
        </form>
      </details>

      {/* Lista */}
      <div className="space-y-2">
        {sources.map((s) => (
          <div key={s.id} className="border-[0.5px] border-[var(--border)] rounded-[10px] bg-[var(--surface)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-[var(--text)]">{s.name}</p>
                <p className="text-xs text-[var(--text2)] mt-0.5">{s.roomSlug}</p>
                <p className="text-xs text-[var(--text3)] mt-1 truncate">{s.url}</p>
                {s.lastFetched && (
                  <p className="text-xs text-[var(--text3)] mt-1">
                    Utoljára szinkronizálva: {new Date(s.lastFetched).toLocaleString("hu")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <form action={toggleSource}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="active" value={String(s.active)} />
                  <button type="submit" className={`text-[11px] px-2 py-0.5 rounded-full ${s.active ? "bg-[var(--accent-bg)] text-[#3A5A3C]" : "bg-[var(--surface2)] text-[var(--text2)]"}`}>
                    {s.active ? "Aktív" : "Inaktív"}
                  </button>
                </form>
                <form action={deleteSource}>
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" className="text-xs text-[#C44] hover:bg-[#FCEBEB] px-2 py-0.5 rounded transition-colors">Törlés</button>
                </form>
              </div>
            </div>
          </div>
        ))}
        {sources.length === 0 && (
          <p className="text-sm text-[var(--text3)] text-center py-6">Még nincs iCal forrás.</p>
        )}
      </div>
    </div>
  );
}

const input = "mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] block";
const lbl = "text-xs text-[var(--text2)] uppercase tracking-wide";
const saveBtn = "px-5 py-2 rounded-md bg-[var(--nav-bg)] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity";
