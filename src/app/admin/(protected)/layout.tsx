import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { offersEnabled } from "@/modules/offers/flag";
import { countNewOffers } from "@/modules/offers/server";
import { Sidebar } from "./sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/admin/login");

  const enabled = offersEnabled();
  const [waitingCount, newOffers] = await Promise.all([
    db.$count(bookings, eq(bookings.status, "valaszra_var")),
    enabled ? countNewOffers() : Promise.resolve(0),
  ]);

  return (
    <div className="min-h-screen flex bg-[var(--bg)] text-[var(--text)]">
      <Sidebar offersEnabled={enabled} waitingCount={waitingCount} newOffers={newOffers} />
      <main className="flex-1 min-w-0 p-8">{children}</main>
    </div>
  );
}
