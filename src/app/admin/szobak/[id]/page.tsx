import { db } from "@/db";
import { rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function updateRoom(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  await db
    .update(rooms)
    .set({
      name: String(formData.get("name")),
      description: String(formData.get("description")),
      capacity: Number(formData.get("capacity")),
      bedType: String(formData.get("bedType")),
      priceFrom: formData.get("priceFrom") ? Number(formData.get("priceFrom")) : null,
      amenities: String(formData.get("amenities")),
      active: formData.get("active") === "on",
    })
    .where(eq(rooms.id, id));
  revalidatePath("/admin/szobak");
  redirect("/admin/szobak");
}

export default async function EditRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [room] = await db.select().from(rooms).where(eq(rooms.id, Number(id)));
  if (!room) notFound();

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-display font-semibold mb-6">Szoba szerkesztése</h1>
      <form action={updateRoom} className="space-y-5">
        <input type="hidden" name="id" value={room.id} />

        <Field label="Név">
          <input name="name" defaultValue={room.name} required className={input} />
        </Field>
        <Field label="Leírás">
          <textarea name="description" defaultValue={room.description ?? ""} rows={4} className={input} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Kapacitás (fő)">
            <input name="capacity" type="number" defaultValue={room.capacity ?? ""} className={input} />
          </Field>
          <Field label="Ár (Ft/éj, min)">
            <input name="priceFrom" type="number" defaultValue={room.priceFrom ?? ""} className={input} />
          </Field>
        </div>
        <Field label="Ágytípus">
          <input name="bedType" defaultValue={room.bedType ?? ""} className={input} />
        </Field>
        <Field label="Felszereltség (vesszővel elválasztva)">
          <textarea name="amenities" defaultValue={room.amenities ?? ""} rows={3} className={input} />
        </Field>
        <Field label="">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" name="active" defaultChecked={room.active ?? true} />
            Aktív (látható az oldalon)
          </label>
        </Field>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
            Mentés
          </button>
          <a href="/admin/szobak" className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-sm rounded-lg transition-colors">
            Mégse
          </a>
        </div>
      </form>
    </div>
  );
}

const input = "w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</label>}
      {children}
    </div>
  );
}
