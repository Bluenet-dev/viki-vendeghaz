// iCal-naptárszinkron – adatbázis-réteg: export-adatok, feed-szinkron, a külső
// blokkok "materializálása" closures-sorokká, ütközés- és hibaértesítés.
//
// Materializálás: minden importált blokk szabad éjszakája closures-sort kap
// (external_block_id-vel). Így a foglalómotor, a naptár és a weboldal változtatás
// nélkül zárolja ezeket, az ütközésvédelem pedig a meglévő egyedi indexen marad.
// Ha az éjszakán már CMS-foglalás van, nem kap sort – az ütközésként jelentkezik.

import { after } from "next/server";
import { and, asc, eq, gt, inArray, isNotNull, isNull, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, calendarConflicts, calendarFeeds, closures, externalBlocks, rooms, settings } from "@/db/schema";
import { ROOM_SCOPES, targetRooms, type Target } from "@/lib/booking/constants";
import { addDays, nightsOf, todayBudapest } from "@/lib/booking/dates";
import { OWNER_EMAIL, sendViaResend, siteUrl } from "@/lib/mail/send";
import { ownerIcalConflictMail, ownerIcalFeedFailingMail } from "@/lib/mail/templates";
import { selectExportEvents, type ExportInput } from "./export";
import { fetchIcs } from "./fetch";
import { findConflicts, type ReconcilePlan } from "./reconcile";
import { syncOneFeed, type SyncResult } from "./sync-core";
import { generateExportToken } from "./token";
import { PLATFORM_LABEL, type ExportEvent, type ExportPlatform, type FeedPlatform } from "./types";

export const STALE_AFTER_MS = 15 * 60 * 1000;
export const FRESH_CHECK_TIMEOUT_MS = 5_000;
const FAIL_NOTIFY_AT = 3;

export function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

// A tegnapi naptól 18 hónapig.
export function exportHorizon(today = todayBudapest()): { from: string; to: string } {
  return { from: addDays(today, -1), to: addMonths(today, 18) };
}

type BatchItem = Parameters<typeof db.batch>[0][number];

// Több módosítás egy tranzakcióban (neon-http batch); üres listánál nem csinál semmit.
async function runBatch(ops: BatchItem[]): Promise<void> {
  if (!ops.length) return;
  await db.batch(ops as [BatchItem, ...BatchItem[]]);
}

async function loadSettings() {
  const [row] = await db.select().from(settings).limit(1);
  return row;
}

// ─── Egységek és export-token ───────────────────────────────────────────────

export type Unit = { id: number; slug: string; name: string; token: string | null };

export async function listUnits(): Promise<Unit[]> {
  const rows = await db
    .select({ id: rooms.id, slug: rooms.slug, name: rooms.name, token: rooms.icalExportToken })
    .from(rooms)
    .where(inArray(rooms.slug, [...ROOM_SCOPES]))
    .orderBy(asc(rooms.sortOrder), asc(rooms.id));
  return rows;
}

export async function ensureExportToken(unitId: number): Promise<string> {
  const [row] = await db.select({ token: rooms.icalExportToken }).from(rooms).where(eq(rooms.id, unitId));
  if (row?.token) return row.token;
  await db.update(rooms).set({ icalExportToken: generateExportToken() }).where(and(eq(rooms.id, unitId), isNull(rooms.icalExportToken)));
  const [again] = await db.select({ token: rooms.icalExportToken }).from(rooms).where(eq(rooms.id, unitId));
  return again!.token!;
}

export async function regenerateExportToken(unitId: number): Promise<void> {
  await db.update(rooms).set({ icalExportToken: generateExportToken() }).where(eq(rooms.id, unitId));
}

// ─── Export ─────────────────────────────────────────────────────────────────

export async function loadExport(unit: { id: number; slug: string }, platform: ExportPlatform): Promise<ExportEvent[]> {
  const horizon = exportHorizon();

  const [bookingRows, manualRows, extRows] = await Promise.all([
    // Élő foglalások (megerősített ÉS függőben lévő; a lemondott nem).
    db
      .select({ id: bookings.id, checkIn: bookings.checkIn, checkOut: bookings.checkOut, source: bookings.source, scope: bookings.roomScope })
      .from(bookings)
      .where(and(sql`${bookings.status} <> 'lemondott'`, gt(bookings.checkOut, horizon.from), lt(bookings.checkIn, horizon.to))),
    // Kézi zárolás: nem foglaláshoz és nem importhoz tartozó lezárás.
    db
      .select({ id: closures.id, date: closures.date })
      .from(closures)
      .where(
        and(
          eq(closures.roomScope, unit.slug),
          isNull(closures.bookingId),
          isNull(closures.externalBlockId),
          gt(closures.date, addDays(horizon.from, -1)),
          lt(closures.date, horizon.to),
        ),
      ),
    db
      .select({ feedId: externalBlocks.feedId, platform: calendarFeeds.platform, uid: externalBlocks.uid, start: externalBlocks.startDate, end: externalBlocks.endDate })
      .from(externalBlocks)
      .innerJoin(calendarFeeds, eq(calendarFeeds.id, externalBlocks.feedId))
      .where(and(eq(externalBlocks.unitId, unit.id), gt(externalBlocks.endDate, horizon.from), lt(externalBlocks.startDate, horizon.to))),
  ]);

  const input: ExportInput = {
    bookings: bookingRows.filter((b) => (targetRooms(b.scope) as string[]).includes(unit.slug)),
    manualBlocks: manualRows,
    externalBlocks: extRows.map((x) => ({ ...x, platform: x.platform as FeedPlatform })),
    horizon,
  };
  return selectExportEvents(platform, input);
}

// ─── Feedek ─────────────────────────────────────────────────────────────────

export type Feed = typeof calendarFeeds.$inferSelect;

export async function listFeeds(unitIds?: number[]): Promise<Feed[]> {
  const q = db.select().from(calendarFeeds);
  return unitIds ? q.where(inArray(calendarFeeds.unitId, unitIds)) : q;
}

export async function upsertFeedUrl(unitId: number, platform: FeedPlatform, importUrl: string | null): Promise<Feed> {
  const [row] = await db
    .insert(calendarFeeds)
    .values({ unitId, platform, importUrl, active: importUrl != null })
    .onConflictDoUpdate({
      target: [calendarFeeds.unitId, calendarFeeds.platform],
      set: { importUrl, active: importUrl != null, failCount: 0, lastError: null },
    })
    .returning();
  return row;
}

// Az URL törlésekor a feed blokkjai (és a materializált napok) is törlődnek.
export async function removeFeed(feedId: number): Promise<void> {
  await db.batch([
    db.delete(externalBlocks).where(eq(externalBlocks.feedId, feedId)),
    db.update(calendarFeeds).set({ importUrl: null, active: false, failCount: 0, lastError: null }).where(eq(calendarFeeds.id, feedId)),
  ]);
}

// A tárolt blokkok alapján újraírja a feed napjait a closures-ben (horizonton belül),
// egy tranzakcióban: a módosult blokkok régi napjai törlődnek, minden szabad éjszaka
// (újra) lezárul. Így egy kézzel feloldott import-nap a következő szinkronnál visszazár.
async function materialize(feed: Feed, changedBlockIds: number[], unitSlug: string): Promise<void> {
  const horizon = exportHorizon();
  const blocks = await db
    .select({ id: externalBlocks.id, start: externalBlocks.startDate, end: externalBlocks.endDate })
    .from(externalBlocks)
    .where(and(eq(externalBlocks.feedId, feed.id), gt(externalBlocks.endDate, horizon.from), lt(externalBlocks.startDate, horizon.to)));

  const note = `iCal: ${PLATFORM_LABEL[feed.platform as FeedPlatform] ?? feed.platform}`;
  const rows: (typeof closures.$inferInsert)[] = [];
  for (const b of blocks) {
    const from = b.start > horizon.from ? b.start : horizon.from;
    const to = b.end < horizon.to ? b.end : horizon.to;
    for (const d of nightsOf(from, to)) rows.push({ roomScope: unitSlug, date: d, externalBlockId: b.id, note });
  }

  // Egy tranzakció (neon-http batch): a régi napok törlése és az újak lezárása együtt.
  const ops: BatchItem[] = [];
  if (changedBlockIds.length) ops.push(db.delete(closures).where(inArray(closures.externalBlockId, changedBlockIds)));
  for (let i = 0; i < rows.length; i += 2000) ops.push(db.insert(closures).values(rows.slice(i, i + 2000)).onConflictDoNothing());
  await runBatch(ops);
}

async function applyPlan(feed: Feed, plan: ReconcilePlan): Promise<number[]> {
  const now = new Date();
  const ops: BatchItem[] = [];
  if (plan.deleteIds.length) ops.push(db.delete(externalBlocks).where(inArray(externalBlocks.id, plan.deleteIds)));
  for (const u of plan.updates) {
    ops.push(
      db.update(externalBlocks).set({ startDate: u.start, endDate: u.end, summary: u.summary || null, lastSeenAt: now }).where(eq(externalBlocks.id, u.id)),
    );
  }
  if (plan.unchangedIds.length) ops.push(db.update(externalBlocks).set({ lastSeenAt: now }).where(inArray(externalBlocks.id, plan.unchangedIds)));
  if (plan.inserts.length) {
    ops.push(
      db
        .insert(externalBlocks)
        .values(plan.inserts.map((e) => ({ feedId: feed.id, unitId: feed.unitId, uid: e.uid, startDate: e.start, endDate: e.end, summary: e.summary || null, lastSeenAt: now })))
        .onConflictDoNothing(),
    );
  }
  await runBatch(ops);
  return plan.updates.map((u) => u.id);
}

async function notifyConflicts(feed: Feed, unit: Unit): Promise<void> {
  const blocks = await db
    .select({ id: externalBlocks.id, start: externalBlocks.startDate, end: externalBlocks.endDate })
    .from(externalBlocks)
    .where(and(eq(externalBlocks.feedId, feed.id), gt(externalBlocks.endDate, addDays(todayBudapest(), -1))));
  if (!blocks.length) return;

  const minStart = blocks.reduce((m, b) => (b.start < m ? b.start : m), blocks[0].start);
  const maxEnd = blocks.reduce((m, b) => (b.end > m ? b.end : m), blocks[0].end);
  const live = await db
    .select({ id: bookings.id, checkIn: bookings.checkIn, checkOut: bookings.checkOut, source: bookings.source, status: bookings.status, scope: bookings.roomScope })
    .from(bookings)
    .where(and(sql`${bookings.status} <> 'lemondott'`, gt(bookings.checkOut, minStart), lt(bookings.checkIn, maxEnd)));
  const forUnit = live.filter((b) => (targetRooms(b.scope) as string[]).includes(unit.slug));

  const platform = feed.platform as FeedPlatform;
  const conflicts = findConflicts(platform, blocks, forUnit);
  if (!conflicts.length) return;

  const s = await loadSettings();
  for (const c of conflicts) {
    const inserted = await db
      .insert(calendarConflicts)
      .values({ externalBlockId: c.blockId, bookingId: c.bookingId })
      .onConflictDoNothing()
      .returning({ id: calendarConflicts.id });
    if (!inserted.length || !s) continue; // már jeleztük
    const mail = ownerIcalConflictMail(
      { unit: unit.name, platform: PLATFORM_LABEL[platform], start: c.start, end: c.end, bookingUrl: `${siteUrl()}/admin/foglalasok/${c.bookingId}` },
      s,
    );
    await sendViaResend({ ...mail, to: OWNER_EMAIL });
  }
}

async function markFailure(feed: Feed, unit: Unit, message: string): Promise<number> {
  const [row] = await db
    .update(calendarFeeds)
    .set({ failCount: sql`${calendarFeeds.failCount} + 1`, lastAttemptAt: new Date(), lastError: message.slice(0, 500) })
    .where(eq(calendarFeeds.id, feed.id))
    .returning({ failCount: calendarFeeds.failCount, lastSuccessAt: calendarFeeds.lastSuccessAt });
  const failCount = row?.failCount ?? feed.failCount + 1;
  // Pontosan a 3. egymás utáni hibánál egy levél; a sikeres lekérés nullázza a számlálót.
  if (failCount === FAIL_NOTIFY_AT) {
    const s = await loadSettings();
    if (s) {
      const mail = ownerIcalFeedFailingMail(
        {
          unit: unit.name,
          platform: PLATFORM_LABEL[feed.platform as FeedPlatform] ?? feed.platform,
          lastSuccessAt: row?.lastSuccessAt ?? null,
          lastError: message,
          panelUrl: `${siteUrl()}/admin/naptar/szinkron`,
        },
        s,
      );
      await sendViaResend({ ...mail, to: OWNER_EMAIL });
    }
  }
  return failCount;
}

export async function syncFeed(feed: Feed, unit: Unit, timeoutMs?: number): Promise<SyncResult> {
  if (!feed.importUrl) return { ok: false, feedId: feed.id, error: "Nincs import link.", failCount: feed.failCount };
  let changed: number[] = [];
  const result = await syncOneFeed({ id: feed.id, importUrl: feed.importUrl }, addDays(todayBudapest(), -1), {
    fetchText: (url) => fetchIcs(url, { timeoutMs }),
    loadBlocks: async (feedId) =>
      db
        .select({ id: externalBlocks.id, uid: externalBlocks.uid, start: externalBlocks.startDate, end: externalBlocks.endDate, summary: externalBlocks.summary })
        .from(externalBlocks)
        .where(eq(externalBlocks.feedId, feedId)),
    applyPlan: async (_feedId, plan) => {
      changed = await applyPlan(feed, plan);
    },
    markSuccess: async (feedId) => {
      const now = new Date();
      await db.update(calendarFeeds).set({ lastSuccessAt: now, lastAttemptAt: now, lastError: null, failCount: 0 }).where(eq(calendarFeeds.id, feedId));
    },
    markFailure: (_feedId, message) => markFailure(feed, unit, message),
  });

  if (result.ok) {
    await materialize(feed, changed, unit.slug);
    await notifyConflicts(feed, unit);
  }
  return result;
}

// Az aktív (linkkel rendelkező) feedek szinkronja, korlátozott párhuzamossággal.
async function runFeeds(feeds: Feed[], units: Unit[], timeoutMs?: number, concurrency = 4): Promise<SyncResult[]> {
  const byId = new Map(units.map((u) => [u.id, u]));
  const queue = feeds.filter((f) => f.active && f.importUrl && byId.has(f.unitId));
  const results: SyncResult[] = [];
  async function worker() {
    for (let f = queue.shift(); f; f = queue.shift()) {
      try {
        results.push(await syncFeed(f, byId.get(f.unitId)!, timeoutMs));
      } catch (e) {
        results.push({ ok: false, feedId: f.id, error: e instanceof Error ? e.message : String(e), failCount: f.failCount });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return results;
}

export async function syncAllFeeds(): Promise<SyncResult[]> {
  const [units, feeds] = await Promise.all([listUnits(), listFeeds()]);
  return runFeeds(feeds, units);
}

export async function syncUnitFeeds(unitIds: number[], timeoutMs?: number): Promise<SyncResult[]> {
  if (!unitIds.length) return [];
  const [units, feeds] = await Promise.all([listUnits(), listFeeds(unitIds)]);
  return runFeeds(feeds, units, timeoutMs, feeds.length || 1);
}

// ─── Foglalás előtti friss ellenőrzés ───────────────────────────────────────

export interface FreshCheck {
  // A nem elérhető feedek (ezeknél az utolsó sikeres állapot döntött).
  failed: { unit: string; platform: string; error: string }[];
}

// A foglalás érintett egységeinek összes feedjét SZINKRON módon újra lehúzza
// (párhuzamosan, feedenként max. 5 s). Utána a closures már a friss állapotot tükrözi.
export async function freshCheck(target: Target): Promise<FreshCheck> {
  const slugs = targetRooms(target) as string[];
  const units = (await listUnits()).filter((u) => slugs.includes(u.slug));
  const results = await syncUnitFeeds(
    units.map((u) => u.id),
    FRESH_CHECK_TIMEOUT_MS,
  );
  const failedIds = new Set(results.filter((r) => !r.ok).map((r) => r.feedId));
  if (!failedIds.size) return { failed: [] };
  const feeds = await listFeeds(units.map((u) => u.id));
  const unitName = new Map(units.map((u) => [u.id, u.name]));
  return {
    failed: results
      .filter((r): r is Extract<SyncResult, { ok: false }> => !r.ok)
      .map((r) => {
        const f = feeds.find((x) => x.id === r.feedId);
        return {
          unit: (f && unitName.get(f.unitId)) ?? "?",
          platform: PLATFORM_LABEL[(f?.platform ?? "egyeb") as FeedPlatform],
          error: r.error,
        };
      }),
  };
}

export function freshCheckNote(fc: FreshCheck): string | null {
  if (!fc.failed.length) return null;
  const list = fc.failed.map((f) => `${f.platform} (${f.unit})`).join(", ");
  return `Figyelem: a foglalás előtti friss naptár-ellenőrzés nem érte el: ${list}. Az utolsó sikeres szinkron állapota döntött – ellenőrizd a portálon is.`;
}

// ─── Megjelenítéskor: elavult feedek háttérfrissítése ───────────────────────

// A 15 percnél régebben frissült feedeket frissíti. Az oldal ezt after()-ben hívja,
// így a megjelenítést nem lassítja. Ha nemrég (2 percen belül) volt próbálkozás,
// nem indítja újra (sok egyidejű látogató ne indítson sok lekérést).
export async function refreshStaleFeeds(): Promise<void> {
  const now = Date.now();
  const staleBefore = new Date(now - STALE_AFTER_MS);
  const attemptBefore = new Date(now - 2 * 60 * 1000);
  const stale = await db
    .select()
    .from(calendarFeeds)
    .where(
      and(
        eq(calendarFeeds.active, true),
        isNotNull(calendarFeeds.importUrl),
        or(isNull(calendarFeeds.lastSuccessAt), lte(calendarFeeds.lastSuccessAt, staleBefore)),
        or(isNull(calendarFeeds.lastAttemptAt), lte(calendarFeeds.lastAttemptAt, attemptBefore)),
      ),
    );
  if (!stale.length) return;
  // A próbálkozás idejét előre rögzítjük, hogy a párhuzamos kérések ne induljanak el újra.
  await db.update(calendarFeeds).set({ lastAttemptAt: new Date() }).where(inArray(calendarFeeds.id, stale.map((f) => f.id)));
  await runFeeds(stale, await listUnits());
}

// ─── A tulajdonos által rögzített portál-foglalás ───────────────────────────

// Ha a tulajdonos egy portálon érkezett foglalást kézzel rögzít a CMS-ben (forrás =
// az a portál), az onnan importált lezárások a foglalás napjain átadják a helyüket
// a foglalás lezárásainak – különben a saját foglalását nem tudná rögzíteni.
export async function releaseImportedNights(target: Target, checkIn: string, checkOut: string, platform: FeedPlatform): Promise<void> {
  const nights = nightsOf(checkIn, checkOut);
  if (!nights.length) return;
  const feedIds = (await db.select({ id: calendarFeeds.id }).from(calendarFeeds).where(eq(calendarFeeds.platform, platform))).map((f) => f.id);
  if (!feedIds.length) return;
  const blockIds = (await db.select({ id: externalBlocks.id }).from(externalBlocks).where(inArray(externalBlocks.feedId, feedIds))).map((b) => b.id);
  if (!blockIds.length) return;
  await db
    .delete(closures)
    .where(
      and(
        inArray(closures.roomScope, targetRooms(target)),
        inArray(closures.date, nights),
        inArray(closures.externalBlockId, blockIds),
      ),
    );
}

// Az oldal renderelése után (after) indítja az elavult feedek frissítését – a
// megjelenítést nem lassítja, a következő látogató már friss állapotot lát.
export function scheduleStaleRefresh(): void {
  after(() => refreshStaleFeeds().catch((e) => console.error("iCal háttérfrissítés hiba:", e)));
}
