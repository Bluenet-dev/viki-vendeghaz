"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { calendarFeeds, rooms } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { fetchIcs, importUrlSchema } from "@/lib/ical/fetch";
import { parseIcs } from "@/lib/ical/parse";
import { listUnits, regenerateExportToken, removeFeed, syncFeed, upsertFeedUrl } from "@/lib/ical/server";
import { UI_PLATFORMS, type UiPlatform } from "@/lib/ical/types";

const PATH = "/admin/naptar/szinkron";

export interface FeedFormState {
  ok?: string;
  error?: string;
}

async function unitById(unitId: number) {
  const unit = (await listUnits()).find((u) => u.id === unitId);
  if (!unit) throw new Error("Ismeretlen egység.");
  return unit;
}

function isUiPlatform(v: unknown): v is UiPlatform {
  return typeof v === "string" && (UI_PLATFORMS as readonly string[]).includes(v);
}

// Import link mentése: Zod-ellenőrzés + próba-lekérés. Csak érvényes iCal esetén ment,
// és mentés után azonnal szinkronizál. Üres mező = a feed törlése.
export async function saveFeedAction(_prev: FeedFormState, formData: FormData): Promise<FeedFormState> {
  await requireAdmin();
  const unitId = Number(formData.get("unitId"));
  const platform = formData.get("platform");
  if (!Number.isInteger(unitId) || !isUiPlatform(platform)) return { error: "Hibás kérés." };
  const unit = await unitById(unitId);
  const raw = String(formData.get("importUrl") ?? "").trim();

  if (!raw) {
    const [feed] = await db.select().from(calendarFeeds).where(and(eq(calendarFeeds.unitId, unitId), eq(calendarFeeds.platform, platform)));
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

  const feed = await upsertFeedUrl(unitId, platform, parsed.data);
  const res = await syncFeed(feed, unit);
  revalidatePath(PATH);
  if (!res.ok) return { error: `Mentve, de az első szinkron hibás: ${res.error}` };
  return { ok: `Mentve. A naptárban ${count} esemény található.` };
}

export async function syncNowAction(feedId: number): Promise<FeedFormState> {
  await requireAdmin();
  const [feed] = await db.select().from(calendarFeeds).where(eq(calendarFeeds.id, feedId));
  if (!feed) return { error: "A feed nem található." };
  const res = await syncFeed(feed, await unitById(feed.unitId));
  revalidatePath(PATH);
  return res.ok ? { ok: `Frissítve (${res.events} esemény).` } : { error: res.error };
}

export async function regenerateTokenAction(unitId: number): Promise<FeedFormState> {
  await requireAdmin();
  const [row] = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.id, unitId));
  if (!row) return { error: "Ismeretlen egység." };
  await regenerateExportToken(unitId);
  revalidatePath(PATH);
  return { ok: "Új link generálva. A régi link már nem működik – cseréld le a portálokon." };
}
