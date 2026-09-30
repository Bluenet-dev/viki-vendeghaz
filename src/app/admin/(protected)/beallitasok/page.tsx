import Link from "next/link";
import { getSettings } from "@/lib/booking/server";
import { isGmailConfigured } from "@/lib/mail/send";
import { GmailTest, SettingsForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Beállítások" };

export default async function BeallitasokPage() {
  const s = await getSettings();
  const { id: _id, updatedAt: _u, ...values } = s;
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <Link href="/admin/weboldal" className="text-[13px] text-[var(--text2)] hover:text-[var(--text)]">← Weboldal</Link>
        <h1 className="mt-3 text-xl font-semibold text-[var(--text)]">Beállítások</h1>
      </div>
      <GmailTest configured={isGmailConfigured()} user={process.env.GMAIL_USER ?? null} />
      <SettingsForm values={values} />
    </div>
  );
}
