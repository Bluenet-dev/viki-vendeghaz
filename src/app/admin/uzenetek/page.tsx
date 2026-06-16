import { db } from "@/db";
import { messages } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import clsx from "clsx";

export const dynamic = "force-dynamic";
export const metadata = { title: "Üzenetek" };

async function markRead(formData: FormData) {
  "use server";
  await db.update(messages).set({ read: true }).where(eq(messages.id, Number(formData.get("id"))));
  revalidatePath("/admin/uzenetek");
}

export default async function AdminUzenetekPage() {
  const allMessages = await db.select().from(messages).orderBy(desc(messages.createdAt));

  const unread = allMessages.filter((m) => !m.read).length;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-display font-semibold">Üzenetek</h1>
        {unread > 0 && (
          <span className="bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">{unread} új</span>
        )}
      </div>

      <div className="space-y-3">
        {allMessages.map((msg) => (
          <div key={msg.id} className={clsx("border rounded-xl p-4", msg.read ? "border-gray-800" : "border-blue-700 bg-blue-950/20")}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{msg.name}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <a href={`mailto:${msg.email}`} className="text-xs text-blue-400 hover:underline">{msg.email}</a>
                  {msg.phone && <><span className="text-xs text-gray-400">·</span><span className="text-xs text-gray-400">{msg.phone}</span></>}
                  <span className="text-xs text-gray-500 ml-auto">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString("hu", { year: "numeric", month: "long", day: "numeric" }) : ""}
                  </span>
                </div>
                {msg.type === "booking_request" && (
                  <p className="text-xs text-amber-400 mb-1">
                    Foglalási igény · {msg.roomSlug} · {msg.checkIn} – {msg.checkOut} · {msg.guests} fő
                  </p>
                )}
                {msg.message && <p className="text-sm text-gray-300 leading-relaxed">{msg.message}</p>}
              </div>
              {!msg.read && (
                <form action={markRead} className="shrink-0">
                  <input type="hidden" name="id" value={msg.id} />
                  <button type="submit" className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors whitespace-nowrap">
                    Olvasottnak jelöl
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
        {allMessages.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">Még nincs beérkező üzenet.</p>
        )}
      </div>
    </div>
  );
}
