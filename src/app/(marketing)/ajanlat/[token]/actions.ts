"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSettings } from "@/lib/booking/server";
import { offersEnabled } from "@/modules/offers/flag";
import { sendAcceptanceMails } from "@/modules/offers/mail";
import { acceptOffer, getOfferByToken } from "@/modules/offers/server";

// "Elfogadom az ajánlatot" – újraellenőrzi az elérhetőséget, és egy lépésben létrehozza
// a foglalást a lezárt napokkal. Második kattintásra már nem jön létre újabb foglalás.
export async function acceptOfferByTokenAction(formData: FormData): Promise<void> {
  if (!offersEnabled()) redirect("/");
  const token = String(formData.get("token") ?? "");
  const o = await getOfferByToken(token);
  if (!o) redirect("/");
  const res = await acceptOffer(o, "guest");
  if (res.ok) {
    await sendAcceptanceMails(o, await getSettings(), res.bookingId, true);
    revalidatePath("/admin", "layout");
    redirect(`/ajanlat/${token}`);
  }
  redirect(`/ajanlat/${token}${res.reason === "busy" ? "?betelt=1" : ""}`);
}
