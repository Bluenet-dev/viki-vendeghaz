"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { getSettings } from "@/lib/booking/server";
import { MailError, isGmailConfigured, sendViaGmail } from "@/lib/mail/send";
import { gmailTestMail } from "@/lib/mail/templates";

export interface SettingsState {
  ok?: boolean;
  error?: string;
}

const INT_FIELDS = [
  "over10FeePerNight",
  "ifaPerPersonPerNight",
  "depositPercent",
  "depositDueDays",
  "breakfastPrice",
  "dinnerPrice",
  "halfBoardPrice",
  "depositPercentNew",
  "depositPercentPeak",
  "childDiscountPercent",
  "houseLongStayNights",
  "houseLongStayPercent",
  "roomThirdNightPercent",
  "lastMinuteDays",
  "lastMinutePercent",
  "houseCleaningFee",
  "houseCleaningUnderNights",
  "roomCleaningFee",
  "roomCleaningUnderNights",
  "saunaDayPrice",
  "tubPrice",
  "finnSaunaPerPersonHour",
  "infraSharedPerPersonHour",
  "superiorInfraPerHour",
  "saltCaveFreeMinutes",
] as const;

const PERCENT_FIELDS = [
  "depositPercent",
  "depositPercentNew",
  "depositPercentPeak",
  "childDiscountPercent",
  "houseLongStayPercent",
  "roomThirdNightPercent",
  "lastMinutePercent",
] as const;

const TEXT_FIELDS = [
  "checkInFrom",
  "checkInUntil",
  "checkOutUntil",
  "propertyName",
  "phone",
  "email",
  "address",
  "bankBeneficiary",
  "bankAccount",
  "bankIban",
  "bankName",
] as const;

export async function saveSettingsAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireAdmin();
  const current = await getSettings();
  const update: Record<string, number | string | Date> = { updatedAt: new Date() };

  for (const f of INT_FIELDS) {
    const raw = String(formData.get(f) ?? "").replace(/\s|Ft|%/gi, "");
    if (!/^\d+$/.test(raw)) return { error: "Az árak és számok mezőibe csak számot írjon." };
    update[f] = Number(raw);
  }
  if (PERCENT_FIELDS.some((f) => (update[f] as number) > 100)) return { error: "A százalékok legfeljebb 100 lehetnek." };
  const from = String(formData.get("newPricingFrom") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) return { error: "Adja meg, mely naptól érvényesek az új szabályok." };
  update.newPricingFrom = from;

  for (const f of TEXT_FIELDS) {
    const v = String(formData.get(f) ?? "").trim();
    if (!v) return { error: "Minden mezőt töltsön ki." };
    update[f] = v;
  }
  if (["checkInFrom", "checkInUntil", "checkOutUntil"].some((k) => !/^\d{1,2}:\d{2}$/.test(update[k] as string))) {
    return { error: "Az időpontot így adja meg: 15:00" };
  }

  await db.update(settings).set(update).where(eq(settings.id, current.id));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function gmailTestAction(_prev: SettingsState): Promise<SettingsState> {
  await requireAdmin();
  if (!isGmailConfigured()) {
    return { error: "A Gmail-kapcsolat nincs beállítva (GMAIL_USER és GMAIL_APP_PASSWORD hiányzik)." };
  }
  try {
    const mail = gmailTestMail(await getSettings());
    // A próbalevél a saját fiókba megy – a teszt-átirányítás itt nem kell.
    await sendViaGmail({ ...mail, to: process.env.GMAIL_USER! });
    return { ok: true };
  } catch (e) {
    return { error: e instanceof MailError ? e.message : "A levél nem ment el." };
  }
}
