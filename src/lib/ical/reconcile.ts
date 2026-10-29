// UID-alapú reconcile és ütközés-felismerés – tiszta függvények.
//
// A reconcile-t CSAK sikeres lekérés + parse után szabad alkalmazni: hibás
// lekérésnél egyetlen blokk sem törlődhet (ezt a hívó garantálja).

import type { Source, Status } from "@/lib/booking/constants";
import { SOURCE_PLATFORM, type DateRange, type FeedPlatform, type ParsedEvent } from "./types";

export interface StoredBlock extends DateRange {
  id: number;
  uid: string;
  summary: string | null;
}

export interface ReconcilePlan {
  inserts: ParsedEvent[];
  updates: (ParsedEvent & { id: number })[];
  unchangedIds: number[];
  deleteIds: number[];
}

export function planReconcile(existing: StoredBlock[], incoming: ParsedEvent[]): ReconcilePlan {
  const byUid = new Map(existing.map((b) => [b.uid, b]));
  const plan: ReconcilePlan = { inserts: [], updates: [], unchangedIds: [], deleteIds: [] };
  const seen = new Set<string>();

  for (const ev of incoming) {
    seen.add(ev.uid);
    const old = byUid.get(ev.uid);
    if (!old) plan.inserts.push(ev);
    else if (old.start !== ev.start || old.end !== ev.end || (old.summary ?? "") !== ev.summary) plan.updates.push({ ...ev, id: old.id });
    else plan.unchangedIds.push(old.id);
  }
  for (const b of existing) if (!seen.has(b.uid)) plan.deleteIds.push(b.id);
  return plan;
}

// ─── Ütközés ────────────────────────────────────────────────────────────────

export interface ConflictBooking {
  id: number;
  checkIn: string;
  checkOut: string;
  source: Source | string;
  status: Status | string;
}

export interface Conflict {
  blockId: number;
  bookingId: number;
  // Az átfedő időszak: első közös éjszaka … távozás napja (kizárólagos).
  start: string;
  end: string;
}

export function overlaps(a: DateRange, b: DateRange): boolean {
  return a.start < b.end && b.start < a.end;
}

// Egy egység importált blokkjai × az egységet érintő élő CMS-foglalások.
// Nem ütközés, ha a CMS-foglalás forrása éppen az a portál (a tulajdonos onnan
// rögzítette kézzel – ugyanaz a foglalás).
export function findConflicts(
  platform: FeedPlatform,
  blocks: (DateRange & { id: number })[],
  bookings: ConflictBooking[],
): Conflict[] {
  const out: Conflict[] = [];
  for (const b of bookings) {
    if (b.status === "lemondott") continue;
    if (SOURCE_PLATFORM[b.source as Source] === platform) continue;
    const range = { start: b.checkIn, end: b.checkOut };
    for (const x of blocks) {
      if (!overlaps(x, range)) continue;
      out.push({
        blockId: x.id,
        bookingId: b.id,
        start: x.start > range.start ? x.start : range.start,
        end: x.end < range.end ? x.end : range.end,
      });
    }
  }
  return out;
}
