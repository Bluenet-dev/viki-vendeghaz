import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { Sidebar } from "./sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/admin/login");

  const waitingCount = await db.$count(bookings, eq(bookings.status, "valaszra_var"));

  return (
    <div className="min-h-screen flex bg-[var(--bg)] text-[var(--text)]">
      <Sidebar offersEnabled={process.env.MODULE_OFFERS === "true"} waitingCount={waitingCount} />
      <main className="flex-1 min-w-0 p-8">{children}</main>
    </div>
  );
}
