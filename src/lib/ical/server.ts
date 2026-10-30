// iCal-naptárszinkron – adatbázis-réteg: export-adatok, feed-szinkron, a külső
// blokkok "materializálása" closures-sorokká, ütközés- és hibaértesítés.
//
// Egység = a három szoba és az egész ház (lásd types.ts). Materializálás: minden
// importált blokk szabad éjszakája closures-sort kap (external_block_id-vel) –
// szobablokk az adott szobára, egész házas blokk mindhárom szobára. Így a
// foglalómotor, a naptár és a weboldal változtatás nélkül zárolja ezeket; az egész
// ház pedig a meglévő szabály szerint foglalt, ha bármelyik szobája zárolt. Ha az
// éjszakán már CMS-foglalás van, nem kap sort – az ütközésként jelentkezik.

import { after } from "next/server";
import { and, eq, gt, inArray, isNotNull, isNull, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, calendarConflicts, calendarFeeds, calendarUnits, closures, externalBlocks, settings } from "@/db/schema";
import { SCOPE_LABEL, targetRooms, type Target } from "@/lib/booking/constants";
import { addDays, nightsOf, todayBudapest } from "@/lib/booking/dates";
import { OWNER_EMAIL, sendViaResend, siteUrl } from "@/lib/mail/send";
import { ownerIcalConflictMail, ownerIcalFeedFailingMail } from "@/lib/mail/templates";
import { selectExportEvents } from "./export";
import { fetchIcs } from "./fetch";
import { blockClosures, findConflicts, type ReconcilePlan } from "./reconcile";
import { syncOneFeed, type SyncResult } from "./sync-core";
import { generateExportToken } from "./token";
import {
  PLATFORM_LABEL,
  UNITS,
  originUnits,
  unitRooms,
  unitsTouchedBy,
  type ExportEvent,
  type ExportPlatform,
  type FeedPlatform,
  type Unit,
} from "./types";

export const STALE_AFTER_MS = 15 * 60 * 1000;
export const FRESH_CHECK_TIMEOUT_MS = 5_000;
const FAIL_NOTIFY_AT = 3;

type BatchItem = Parameters<typeof db.batch>[0][number];

// Több módosítás egy tranzakcióban (neon-http batch); üres listánál nem csinál semmit.
async function runBatch(ops: BatchItem[]): Promise<void> {
  if (!ops.length) return;
  await db.batch(ops as [BatchItem, ...BatchItem[]]);
}

export function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

// A tegnapi naptól 18 hónapig.
export function exportHorizon(today = todayBudapest()): { from: string; to: string } {
  return { from: addDays(today, -1), to: addMonths(today, 18) };
}

async function loadSettings() {
  const [row] = await db.select().from(settings).limit(1);
  return row;
}

export function unitName(unit: string): string {
  return SCOPE_LABEL[unit as Unit] ?? unit;
}

// ─── Export-token ───────────────────────────────────────────────────────────

export async function ensureExportToken(unit: Unit): Promise<string> {
  await db.insert(calendarUnits).values({ unit, icalExportToken: generateExportToken() }).onConflictDoNothing();
  const [row] = await db.select({ token: calendarUnits.icalExportToken }).from(calendarUnits).where(eq(calendarUnits.unit, unit));
  return row.token;
}

export async function exportTokenOf(unit: Unit): Promise<string | null> {
  const [row] = await db.select({ token: calendarUnits.icalExportToken }).from(calendarUnits).where(eq(calendarUnits.unit, unit));
  return row?.token ?? null;
}

export async function regenerateExportToken(unit: Unit): Promise<void> {
  await db
    .insert(calendarUnits)
    .values({ unit, icalExportToken: generateExportToken() })
    .onConflictDoUpdate({ target: calendarUnits.unit, set: { icalExportToken: generateExportToken() } });
}

// ─── Export ─────────────────────────────────────────────────────────────────

export async function loadExport(unit: Unit, platform: ExportPlatform): Promise<ExportEvent[]> {
  const horizon = exportHorizon();
  const rooms: string[] = unitRooms(unit);

  const [bookingRows, manualRows, extRows, ownFeed] = await Promise.all([
    db
      .select({
        id: bookings.id,
        checkIn: bookings.checkIn,
        checkOut: bookings.checkOut,
        source: bookings.source,
        status: bookings.status,
        scope: bookings.roomScope,
      })
      .from(bookings)
      .where(and(sql`${bookings.status} <> 'lemondott'`, gt(bookings.checkOut, horizon.from), lt(bookings.checkIn, horizon.to))),
    // Kézi zárolás: nem foglaláshoz és nem importhoz tartozó lezárás.
    db
      .select({ id: closures.id, room: closures.roomScope, date: closures.date })
      .from(closures)
      .where(
        and(
          inArray(closures.roomScope, rooms),
          isNull(closures.bookingId),
          isNull(closures.externalBlockId),
          gt(closures.date, addDays(horizon.from, -1)),
          lt(closures.date, horizon.to),
        ),
      ),
    db
      .select({ feedId: externalBlocks.feedId, unit: externalBlocks.unit, uid: externalBlocks.uid, start: externalBlocks.startDate, end: externalBlocks.endDate })
      .from(externalBlocks)
      .where(and(gt(externalBlocks.endDate, horizon.from), lt(externalBlocks.startDate, horizon.to))),
    platform === "altalanos"
      ? Promise.resolve([] as { id: number }[])
      : db.select({ id: calendarFeeds.id }).from(calendarFeeds).where(and(eq(calendarFeeds.unit, unit), eq(calendarFeeds.platform, platform))),
  ]);

  return selectExportEvents(
    { unit, platform, feedId: ownFeed[0]?.id ?? null },
    {
      bookings: bookingRows,
      manualBlocks: manualRows,
      externalBlocks: extRows.map((x) => ({ ...x, unit: x.unit as Unit })),
      horizon,
    },
  );
}

// ─── Feedek ─────────────────────────────────────────────────────────────────

export type Feed = typeof calendarFeeds.$inferSelect;

export async function listFeeds(units?: Unit[]): Promise<Feed[]> {
  const q = db.select().from(calendarFeeds);
  return units ? q.where(inArray(calendarFeeds.unit, units)) : q;
}

export async function upsertFeedUrl(unit: Unit, platform: FeedPlatform, importUrl: string): Promise<Feed> {
  const [row] = await db
    .insert(calendarFeeds)
    .values({ unit, platform, importUrl, active: true })
    .onConflictDoUpdate({
      target: [calendarFeeds.unit, calendarFeeds.platform],
      set: { importUrl, active: true, failCount: 0, lastError: null },
    })
    .returning();
  return row;
}

// Az URL törlésekor a feed blokkjai (és a materializált napok) is törlődnek.
export async function removeFeed(feedId: number): Promise<void> {
  await runBatch([
    db.delete(externalBlocks).where(eq(externalBlocks.feedId, feedId)),
    db.update(calendarFeeds).set({ importUrl: null, active: false, failCount: 0, lastError: null }).where(eq(calendarFeeds.id, feedId)),
  ]);
}

// A tárolt blokkok alapján újraírja a feed napjait a closures-ben (horizonton belül),
// egy tranzakcióban: a módosult blokkok régi napjai törlődnek, minden szabad éjszaka
// (újra) lezárul. Így egy feloldott import-nap a következő szinkronnál visszazár.
async function materialize(feed: Feed, changedBlockIds: number[]): Promise<void> {
  const horizon = exportHorizon();
  const blocks = await db
    .select({ id: externalBlocks.id, start: externalBlocks.startDate, end: externalBlocks.endDate })
    .from(externalBlocks)
    .where(and(eq(externalBlocks.feedId, feed.id), gt(externalBlocks.endDate, horizon.from), lt(externalBlocks.startDate, horizon.to)));

  const note = `iCal: ${PLATFORM_LABEL[feed.platform as FeedPlatform] ?? feed.platform}`;
  const rows: (typeof closures.$inferInsert)[] = blocks.flatMap((b) =>
    blockClosures(feed.unit as Unit, b, horizon).map((c) => ({ roomScope: c.room, date: c.date, externalBlockId: b.id, note })),
  );

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
        .values(plan.inserts.map((e) => ({ feedId: feed.id, unit: feed.unit, uid: e.uid, startDate: e.start, endDate: e.end, summary: e.summary || null, lastSeenAt: now })))
        .onConflictDoNothing(),
    );
  }
  await runBatch(ops);
  return plan.updates.map((u) => u.id);
}

async function notifyConflicts(feed: Feed): Promise<void> {
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

  const platform = feed.platform as FeedPlatform;
  const conflicts = findConflicts({ unit: feed.unit as Unit, platform }, blocks, live);
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
      { unit: unitName(feed.unit), platform: PLATFORM_LABEL[platform], start: c.start, end: c.end, bookingUrl: `${siteUrl()}/admin/foglalasok/${c.bookingId}` },
      s,
    );
    await sendViaResend({ ...mail, to: OWNER_EMAIL });
  }
}

async function markFailure(feed: Feed, message: string): Promise<number> {
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
          unit: unitName(feed.unit),
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

export async function syncFeed(feed: Feed, timeoutMs?: number): Promise<SyncResult> {
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
    markFailure: (_feedId, message) => markFailure(feed, message),
  });

  if (result.ok) {
    await materialize(feed, changed);
    await notifyConflicts(feed);
  }
  return result;
}

// Az aktív (linkkel rendelkező) feedek szinkronja, korlátozott párhuzamossággal.
async function runFeeds(feeds: Feed[], timeoutMs?: number, concurrency = 4): Promise<SyncResult[]> {
  const queue = feeds.filter((f) => f.active && f.importUrl && (UNITS as readonly string[]).includes(f.unit));
  const results: SyncResult[] = [];
  async function worker() {
    for (let f = queue.shift(); f; f = queue.shift()) {
      try {
        results.push(await syncFeed(f, timeoutMs));
      } catch (e) {
        results.push({ ok: false, feedId: f.id, error: e instanceof Error ? e.message : String(e), failCount: f.failCount });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return results;
}

export async function syncAllFeeds(): Promise<SyncResult[]> {
  return runFeeds(await listFeeds());
}

// ─── Foglalás előtti friss ellenőrzés ───────────────────────────────────────

export interface FreshCheck {
  // A nem elérhető feedek (ezeknél az utolsó sikeres állapot döntött).
  failed: { unit: string; platform: string; error: string }[];
}

// A foglalást érintő egységek (a szobák és az egész ház) összes feedjét SZINKRON
// módon újra lehúzza – párhuzamosan, feedenként max. 5 s. Utána a closures már a
// friss állapotot tükrözi.
export async function freshCheck(target: Target): Promise<FreshCheck> {
  const feeds = await listFeeds(unitsTouchedBy(target));
  const results = await runFeeds(feeds, FRESH_CHECK_TIMEOUT_MS, feeds.length || 1);
  return {
    failed: results
      .filter((r): r is Extract<SyncResult, { ok: false }> => !r.ok)
      .map((r) => {
        const f = feeds.find((x) => x.id === r.feedId);
        return { unit: unitName(f?.unit ?? "?"), platform: PLATFORM_LABEL[(f?.platform ?? "egyeb") as FeedPlatform], error: r.error };
      }),
  };
}

export function freshCheckNote(fc: FreshCheck): string | null {
  if (!fc.failed.length) return null;
  const list = fc.failed.map((f) => `${f.platform} (${f.unit})`).join(", ");
  return `Figyelem: a foglalás előtti friss naptár-ellenőrzés nem érte el: ${list}. Az utolsó sikeres szinkron állapota döntött – ellenőrizd a portálon is.`;
}

// ─── Megjelenítéskor: elavult feedek háttérfrissítése ───────────────────────

// A 15 percnél régebben frissült feedeket frissíti. Ha nemrég (2 percen belül) volt
// próbálkozás, nem indítja újra (sok egyidejű látogató ne indítson sok lekérést).
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
  await runFeeds(stale);
}

// Az oldal renderelése után (after) indítja az elavult feedek frissítését – a
// megjelenítést nem lassítja, a következő látogató már friss állapotot lát.
export function scheduleStaleRefresh(): void {
  after(() => refreshStaleFeeds().catch((e) => console.error("iCal háttérfrissítés hiba:", e)));
}

// ─── A tulajdonos által rögzített portál-foglalás ───────────────────────────

// Ha a tulajdonos egy portálon érkezett foglalást kézzel rögzít a CMS-ben (forrás =
// az a portál), az ugyanabból a hirdetésből (egység × platform) importált lezárások
// a foglalás napjain átadják a helyüket a foglalás lezárásainak – különben a saját
// foglalását nem tudná rögzíteni. Más hirdetés blokkja valódi ütközés, az marad.
export async function releaseImportedNights(target: Target, checkIn: string, checkOut: string, platform: FeedPlatform): Promise<void> {
  const nights = nightsOf(checkIn, checkOut);
  if (!nights.length) return;
  const feedIds = (
    await db
      .select({ id: calendarFeeds.id })
      .from(calendarFeeds)
      .where(and(eq(calendarFeeds.platform, platform), inArray(calendarFeeds.unit, originUnits(target))))
  ).map((f) => f.id);
  if (!feedIds.length) return;
  const blockIds = (await db.select({ id: externalBlocks.id }).from(externalBlocks).where(inArray(externalBlocks.feedId, feedIds))).map((b) => b.id);
  if (!blockIds.length) return;
  await db
    .delete(closures)
    .where(and(inArray(closures.roomScope, targetRooms(target)), inArray(closures.date, nights), inArray(closures.externalBlockId, blockIds)));
}

