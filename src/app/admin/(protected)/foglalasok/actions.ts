"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { isMeal, isSource, normalizeTarget, targetMaxGuests, type Meal, type Status } from "@/lib/booking/constants";
import { fmtShort, isIsoDate } from "@/lib/booking/dates";
import {
  cancelBooking,
  confirmBooking,
  createBooking,
  getBooking,
  getSettings,
  markDepositReceived,
  quoteFor,
} from "@/lib/booking/server";
import { GMAIL_ERROR, MailError, sendViaGmail } from "@/lib/mail/send";
import { guestConfirmationMail } from "@/lib/mail/templates";

export interface ActionState {
  ok?: boolean;
  error?: string;
  warning?: string;
}

function busyMessage(busy: string[] | undefined): string {
  if (!busy?.length) return "Ez az időszak már foglalt.";
  const list = busy.slice(0, 6).map(fmtShort).join(", ");
  return `Nem menthető, mert ezek a napok már foglaltak: ${list}${busy.length > 6 ? " …" : ""}`;
}

function revalidateAll() {
  revalidatePath("/admin");
  revalidatePath("/admin/foglalasok", "layout");
  revalidatePath("/admin/naptar");
}

// Visszaigazolás levél a vendégnek (Gmail). Hibaüzenetet ad vissza, ha nem ment el;
// a foglalás ettől függetlenül érvényes marad.
async function sendConfirmation(id: number): Promise<string | undefined> {
  const b = await getBooking(id);
  if (!b?.email) return undefined;
  try {
    await sendViaGmail(guestConfirmationMail(b, await getSettings()));
    await db.update(bookings).set({ confirmationSentAt: new Date() }).where(eq(bookings.id, id));
    return undefined;
  } catch (e) {
    return e instanceof MailError ? e.message : GMAIL_ERROR;
  }
}

export async function confirmBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const res = await confirmBooking(id);
  if (!res.ok) return { error: res.error === "busy" ? busyMessage(res.busy) : res.error };
  const mailError = await sendConfirmation(id);
  revalidateAll();
  return {
    ok: true,
    warning: mailError ? `A foglalást visszaigazoltuk, a napok lezárultak. ${mailError}` : undefined,
  };
}

export async function resendConfirmationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const mailError = await sendConfirmation(Number(formData.get("id")));
  revalidateAll();
  return mailError ? { error: mailError } : { ok: true };
}

export async function depositReceivedAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await markDepositReceived(Number(formData.get("id")));
  revalidateAll();
}

export async function cancelBookingAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await cancelBooking(Number(formData.get("id")), formData.get("release") === "igen");
  revalidateAll();
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = str(formData, "name");
  const checkIn = str(formData, "checkIn");
  const checkOut = str(formData, "checkOut");
  const scope = normalizeTarget(str(formData, "scope"));
  const guests = Number(str(formData, "guests"));
  const source = str(formData, "source");
  const meal = str(formData, "meal") || "nincs";
  const totalRaw = str(formData, "total").replace(/\s|Ft/gi, "");

  if (!name) return { error: "Adja meg a vendég nevét." };
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) return { error: "Adja meg az érkezés és a távozás napját." };
  if (checkOut <= checkIn) return { error: "A távozás napja legyen későbbi, mint az érkezésé." };
  if (!scope) return { error: "Válasszon ki legalább egy szobát, vagy az egész házat." };
  if (!Number.isInteger(guests) || guests < 1) return { error: "Adja meg a létszámot." };
  if (guests > targetMaxGuests(scope)) return { error: `Ide legfeljebb ${targetMaxGuests(scope)} fő fér.` };
  if (!isSource(source)) return { error: "Válassza ki, honnan jött a foglalás." };
  if (!isMeal(meal)) return { error: "Érvénytelen étkezés." };
  if (totalRaw && !/^\d+$/.test(totalRaw)) return { error: "Az összeg csak szám lehet (pl. 64000)." };

  const mealGuests = meal === "nincs" ? null : Math.min(Number(str(formData, "mealGuests")) || guests, guests);
  let total: number | null = totalRaw ? Number(totalRaw) : null;
  if (total == null) {
    // Ha nincs megadva, a naptár árai alapján számoljuk.
    const q = await quoteFor({ scope, checkIn, checkOut, guests, meal: meal as Meal, mealGuests: mealGuests ?? undefined });
    total = q.total;
  }
  const s = await getSettings();
  // Az OTA-k (Booking, Szállás.hu) maguk szedik a díjat – ott nincs előlegre várás.
  const status: Status = source === "booking" || source === "szallas_hu" ? "visszaigazolt" : "elfogadva";

  const res = await createBooking(
    {
      name,
      email: str(formData, "email") || null,
      phone: str(formData, "phone") || null,
      scope,
      checkIn,
      checkOut,
      guests,
      meal: meal as Meal,
      mealGuests,
      total,
      depositAmount: status === "elfogadva" && total != null ? Math.round((total * s.depositPercent) / 100) : null,
      source,
      status,
      note: str(formData, "note") || null,
    },
    true,
  );
  if (!res.ok) return { error: res.error === "busy" ? busyMessage(res.busy) : res.error };
  revalidateAll();
  redirect(`/admin/foglalasok/${res.id}`);
}
