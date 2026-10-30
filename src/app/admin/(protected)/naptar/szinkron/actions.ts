"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { calendarFeeds } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { fetchIcs, importUrlSchema } from "@/lib/ical/fetch";
import { parseIcs } from "@/lib/ical/parse";
import { regenerateExportToken, removeFeed, syncFeed, upsertFeedUrl } from "@/lib/ical/server";
import { UI_PLATFORMS, isUnit, type UiPlatform } from "@/lib/ical/types";

const PATH = "/admin/naptar/szinkron";

export interface FeedFormState {
  ok?: string;
  error?: string;
}

function isUiPlatform(v: unknown): v is UiPlatform {
  return typeof v === "string" && (UI_PLATFORMS as readonly string[]).includes(v);
}

// Import link mentése: Zod-ellenőrzés + próba-lekérés. Csak érvényes iCal esetén ment,
// és mentés után azonnal szinkronizál. Üres mező = a feed törlése.
export async function saveFeedAction(_prev: FeedFormState, formData: FormData): Promise<FeedFormState> {
  await requireAdmin();
  const unit = formData.get("unit");
  const platform = formData.get("platform");
  if (!isUnit(unit) || !isUiPlatform(platform)) return { error: "Hibás kérés." };
  const raw = String(formData.get("importUrl") ?? "").trim();

  if (!raw) {
    const [feed] = await db.select().from(calendarFeeds).where(and(eq(calendarFeeds.unit, unit), eq(calendarFeeds.platform, platform)));
    if (feed) await removeFeed(feed.id);
    revalidatePath(PATH);
    return { ok: "A link törölve, az onnan importált zárolások feloldva." };
  }

  const parsed = importUrlSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Érvénytelen link." };

  let count: number;
  try {
    count = parseIcs(await fetchIcs(parsed.data)).length;
  } catch (e) {
    return { error: `A link nem menthető: ${e instanceof Error ? e.message : String(e)}` };
  }

  const feed = await upsertFeedUrl(unit, platform, parsed.data);
  const res = await syncFeed(feed);
  revalidatePath(PATH);
  if (!res.ok) return { error: `Mentve, de az első szinkron hibás: ${res.error}` };
  return { ok: `Mentve. A naptárban ${count} esemény található.` };
}

export async function syncNowAction(feedId: number): Promise<FeedFormState> {
  await requireAdmin();
  const [feed] = await db.select().from(calendarFeeds).where(eq(calendarFeeds.id, feedId));
  if (!feed) return { error: "A feed nem található." };
  const res = await syncFeed(feed);
  revalidatePath(PATH);
  return res.ok ? { ok: `Frissítve (${res.events} esemény).` } : { error: res.error };
}

export async function regenerateTokenAction(unit: string): Promise<FeedFormState> {
  await requireAdmin();
  if (!isUnit(unit)) return { error: "Ismeretlen egység." };
  await regenerateExportToken(unit);
  revalidatePath(PATH);
  return { ok: "Új link generálva. A régi link már nem működik – cseréld le a portálokon." };
}
