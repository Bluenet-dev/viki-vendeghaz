import Link from "next/link";
import { notFound } from "next/navigation";
import { NewOfferForm } from "@/modules/offers/admin/new-form";
import { offersEnabled } from "@/modules/offers/flag";

export const metadata = { title: "Új ajánlat" };

export default function UjAjanlatPage() {
  if (!offersEnabled()) notFound();
  return (
    <div className="max-w-3xl">
      <Link href="/admin/ajanlatok" className="text-[13px] text-[var(--text2)] hover:text-[var(--text)]">← Ajánlatkérések</Link>
      <h1 className="mt-3 mb-6 text-xl font-semibold text-[var(--text)]">Új ajánlat</h1>
      <NewOfferForm />
    </div>
  );
}
