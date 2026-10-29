// Egy feed szinkronjának menete – injektált függőségekkel, hogy DB és hálózat
// nélkül tesztelhető legyen. A szabály: ha a lekérés VAGY a parse hibás, semmi nem
// törlődik és semmi nem módosul; csak a hibaszámláló nő.

import { parseIcs } from "./parse";
import { planReconcile, type ReconcilePlan, type StoredBlock } from "./reconcile";
import type { ParsedEvent } from "./types";

export interface SyncDeps {
  fetchText(url: string): Promise<string>;
  loadBlocks(feedId: number): Promise<StoredBlock[]>;
  applyPlan(feedId: number, plan: ReconcilePlan): Promise<void>;
  markSuccess(feedId: number): Promise<void>;
  // Visszaadja az új, egymás utáni hibák számát.
  markFailure(feedId: number, message: string): Promise<number>;
}

export type SyncResult =
  | { ok: true; feedId: number; events: number; inserted: number; updated: number; deleted: number }
  | { ok: false; feedId: number; error: string; failCount: number };

// Csak a tegnapi naptól érdekes esemény kerül tárolásra (a múlt nem zárol semmit).
export function relevantEvents(events: ParsedEvent[], yesterday: string): ParsedEvent[] {
  return events.filter((e) => e.end > yesterday);
}

export async function syncOneFeed(
  feed: { id: number; importUrl: string },
  yesterday: string,
  deps: SyncDeps,
): Promise<SyncResult> {
  let events: ParsedEvent[];
  try {
    const text = await deps.fetchText(feed.importUrl);
    events = relevantEvents(parseIcs(text), yesterday);
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    const failCount = await deps.markFailure(feed.id, error);
    return { ok: false, feedId: feed.id, error, failCount };
  }

  const plan = planReconcile(await deps.loadBlocks(feed.id), events);
  await deps.applyPlan(feed.id, plan);
  await deps.markSuccess(feed.id);
  return {
    ok: true,
    feedId: feed.id,
    events: events.length,
    inserted: plan.inserts.length,
    updated: plan.updates.length,
    deleted: plan.deleteIds.length,
  };
}
