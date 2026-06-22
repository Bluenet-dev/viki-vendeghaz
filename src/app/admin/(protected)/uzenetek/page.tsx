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

async function deleteMessage(formData: FormData) {
  "use server";
  await db.delete(messages).where(eq(messages.id, Number(formData.get("id"))));
  revalidatePath("/admin/uzenetek");
}

export default async function AdminUzenetekPage() {
  const allMessages = await db.select().from(messages).orderBy(desc(messages.createdAt));

  const unread = allMessages.filter((m) => !m.read).length;

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-[var(--text)]">Üzenetek</h1>
          {unread > 0 && (
            <span className="bg-[var(--accent2-bg)] text-[#8A4A22] text-[11px] font-medium px-2 py-0.5 rounded-full">{unread} új</span>
          )}
        </div>
        <p className="text-sm text-[var(--text2)] mt-1">Beérkező kapcsolatfelvételek és foglalási igények.</p>
      </div>

      <div className="space-y-3">
        {allMessages.map((msg) => (
          <div
            key={msg.id}
            className={clsx(
              "rounded-[10px] p-4",
              msg.read
                ? "border-[0.5px] border-[var(--border)] bg-[var(--surface)]"
                : "border border-[var(--accent2)] bg-[var(--accent2-bg)]",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-[var(--text)]">{msg.name}</span>
                  <span className="text-xs text-[var(--text3)]">·</span>
                  <a href={`mailto:${msg.email}`} className="text-xs text-[var(--accent)] hover:underline">{msg.email}</a>
                  {msg.phone && <><span className="text-xs text-[var(--text3)]">·</span><span className="text-xs text-[var(--text2)]">{msg.phone}</span></>}
                  <span className="text-xs text-[var(--text3)] ml-auto">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString("hu", { year: "numeric", month: "long", day: "numeric" }) : ""}
                  </span>
                </div>
                {msg.type === "booking_request" && (
                  <p className="text-xs text-[#8A4A22] mb-1">
                    Foglalási igény · {msg.roomSlug} · {msg.checkIn} – {msg.checkOut} · {msg.guests} fő
                  </p>
                )}
                {msg.message && <p className="text-sm text-[var(--text2)] leading-relaxed">{msg.message}</p>}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {!msg.read && (
                  <form action={markRead}>
                    <input type="hidden" name="id" value={msg.id} />
                    <button type="submit" className="text-xs px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--text2)] bg-[var(--surface)] hover:text-[var(--text)] transition-colors whitespace-nowrap w-full">
                      Olvasottnak jelöl
                    </button>
                  </form>
                )}
                <form action={deleteMessage}>
                  <input type="hidden" name="id" value={msg.id} />
                  <button type="submit" className="text-xs px-3 py-1.5 rounded-md border border-[#F09595] text-[#C44] bg-transparent hover:bg-[#FCEBEB] transition-colors whitespace-nowrap w-full">
                    Törlés
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
        {allMessages.length === 0 && (
          <p className="text-[var(--text3)] text-sm text-center py-8">Még nincs beérkező üzenet.</p>
        )}
      </div>
    </div>
  );
}
