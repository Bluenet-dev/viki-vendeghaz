import Link from "next/link";
import { isIsoDate } from "@/lib/booking/dates";
import { isScope } from "@/lib/booking/constants";
import { NewBookingForm } from "./form";

export const metadata = { title: "Új foglalás" };

export default async function UjFoglalasPage({
  searchParams,
}: {
  searchParams: Promise<{ datum?: string; szoba?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="max-w-2xl">
      <Link href="/admin/foglalasok" className="text-[13px] text-[var(--text2)] hover:text-[var(--text)]">
        ← Foglalások
      </Link>
      <h1 className="mt-3 mb-6 text-xl font-semibold text-[var(--text)]">Új foglalás</h1>
      <NewBookingForm
        defaults={{
          checkIn: isIsoDate(sp.datum) ? sp.datum : undefined,
          scope: isScope(sp.szoba) ? sp.szoba : undefined,
        }}
      />
    </div>
  );
}
