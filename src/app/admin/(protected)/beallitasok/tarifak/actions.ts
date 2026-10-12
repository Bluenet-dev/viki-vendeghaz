"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { stayPackages, tariffPrices, tariffs } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { ALL_SCOPES } from "@/lib/booking/constants";
import { reapplyTariffToFutureDays } from "@/lib/booking/server";

export interface TariffState {
  ok?: boolean;
  error?: string;
  askReapply?: string; // a mentett tarifa kódja – rákérdezünk a napok frissítésére
  message?: string;
}

const int = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(/\s|Ft/gi, "");
  return /^\d+$/.test(s) ? Number(s) : null;
};

export async function saveTariffAction(_prev: TariffState, formData: FormData): Promise<TariffState> {
  await requireAdmin();
  const code = String(formData.get("code") ?? "");
  const [t] = await db.select().from(tariffs).where(eq(tariffs.code, code));
  if (!t) return { error: "Ismeretlen tarifa." };

  const name = String(formData.get("name") ?? "").trim();
  const minNights = int(formData.get("minNights"));
  const roomMode = String(formData.get("roomMode") ?? "");
  const releaseDays = int(formData.get("releaseDays"));
  if (!name) return { error: "Adjon nevet a tarifának." };
  if (!minNights || minNights < 1) return { error: "A minimum éjszaka legalább 1." };
  if (!["open", "release", "never"].includes(roomMode)) return { error: "Válassza ki, mikor foglalhatók a szobák." };
  if (roomMode === "release" && releaseDays == null) return { error: "Adja meg, hány nappal előtte nyílnak a szobák." };

  // Létszámárak: "price:<scope>:<guests>" mezők; üres = nincs ár (pl. Szilveszterkor a szobák)
  const updates: { scope: string; guests: number; price: number | null }[] = [];
  for (const [k, v] of formData.entries()) {
    const m = /^price:([a-z0-9_-]+):(\d+)$/.exec(k);
    if (!m || !(ALL_SCOPES as readonly string[]).includes(m[1])) continue;
    const raw = String(v).replace(/\s|Ft/gi, "");
    if (raw !== "" && !/^\d+$/.test(raw)) return { error: "Az árak mezőibe csak számot írjon." };
    updates.push({ scope: m[1], guests: Number(m[2]), price: raw === "" ? null : Number(raw) });
  }

  await db
    .update(tariffs)
    .set({ name, minNights, roomMode, releaseDays: roomMode === "release" ? releaseDays : null })
    .where(eq(tariffs.code, code));
  for (const u of updates) {
    const key = and(eq(tariffPrices.tariffCode, code), eq(tariffPrices.roomScope, u.scope), eq(tariffPrices.guests, u.guests));
    if (u.price == null) await db.delete(tariffPrices).where(key);
    else {
      await db
        .insert(tariffPrices)
        .values({ tariffCode: code, roomScope: u.scope, guests: u.guests, price: u.price })
        .onConflictDoUpdate({ target: [tariffPrices.tariffCode, tariffPrices.roomScope, tariffPrices.guests], set: { price: u.price } });
    }
  }
  revalidatePath("/admin/beallitasok/tarifak");
  revalidatePath("/arak");
  return { ok: true, askReapply: code };
}

export async function reapplyTariffAction(_prev: TariffState, formData: FormData): Promise<TariffState> {
  await requireAdmin();
  const code = String(formData.get("code") ?? "");
  const n = await reapplyTariffToFutureDays(code);
  revalidatePath("/admin/naptar");
  revalidatePath("/arak");
  return { ok: true, message: `${n} jövőbeli „${code}” tarifás nap ára frissítve. A meglévő foglalások összege nem változott.` };
}

export interface PackageState {
  ok?: boolean;
  error?: string;
}

export async function savePackageAction(_prev: PackageState, formData: FormData): Promise<PackageState> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const includes = String(formData.get("includes") ?? "").trim();
  const priceLow = int(formData.get("priceLow"));
  const priceHighRaw = String(formData.get("priceHigh") ?? "").trim();
  const priceHigh = priceHighRaw === "" ? null : int(priceHighRaw);
  const maxGuests = int(formData.get("maxGuests"));
  const months = String(formData.get("months") ?? "").replace(/\s/g, "");
  if (!name || !includes) return { error: "A név és a tartalom kötelező." };
  if (priceLow == null || (priceHighRaw !== "" && priceHigh == null) || !maxGuests) return { error: "Az árak és a létszám csak szám lehet." };
  if (months && !/^(\d{1,2})(,\d{1,2})*$/.test(months)) return { error: "A hónapokat így adja meg: 11,12,1,2,3" };
  await db
    .update(stayPackages)
    .set({ name, includes, priceLow, priceHigh, maxGuests, months: months || null, active: formData.get("active") === "on" })
    .where(eq(stayPackages.slug, slug));
  revalidatePath("/admin/beallitasok/tarifak");
  revalidatePath("/arak");
  return { ok: true };
}
