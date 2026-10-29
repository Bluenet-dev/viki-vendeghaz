// Kimenő iCal-feed (RFC 5545) – tiszta függvények, DB nélkül.
//
// Visszhang elleni szabály: egy platform feedjébe nem kerül vissza
//  – az onnan importált blokk,
//  – és az a CMS-foglalás sem, amelyet a tulajdonos onnan rögzített (forrás = az a portál).
// Az "altalanos" feed mindent tartalmaz.
// Személyes adat (név, e-mail, telefon) nem kerülhet a feedbe: a SUMMARY csak
// "Foglalt" vagy "Zárolva".

import { createHash } from "node:crypto";
import type { Source } from "@/lib/booking/constants";
import { addDays } from "@/lib/booking/dates";
import { SOURCE_PLATFORM, type ExportEvent, type ExportPlatform, type FeedPlatform } from "./types";

export interface ExportBooking {
  id: number;
  checkIn: string;
  checkOut: string;
  source: Source | string;
}

export interface ExportManualBlock {
  id: number; // closures.id
  date: string; // egy éjszaka
}

export interface ExportExternalBlock {
  feedId: number;
  platform: FeedPlatform;
  uid: string;
  start: string;
  end: string;
}

export interface ExportInput {
  bookings: ExportBooking[];
  manualBlocks: ExportManualBlock[];
  externalBlocks: ExportExternalBlock[];
  // A tegnapi naptól 18 hónapig – az ezzel átfedő események kerülnek ki.
  horizon: { from: string; to: string };
}

export function externalUid(feedId: number, uid: string): string {
  const h = createHash("sha256").update(uid).digest("hex").slice(0, 16);
  return `bn-ext-${feedId}-${h}@bluenet.hu`;
}

export function selectExportEvents(platform: ExportPlatform, input: ExportInput): ExportEvent[] {
  const { from, to } = input.horizon;
  const inHorizon = (e: { start: string; end: string }) => e.end > from && e.start < to;
  const out: ExportEvent[] = [];

  for (const b of input.bookings) {
    if (platform !== "altalanos" && SOURCE_PLATFORM[b.source as Source] === platform) continue;
    const e = { start: b.checkIn, end: b.checkOut };
    if (inHorizon(e)) out.push({ ...e, uid: `bn-booking-${b.id}@bluenet.hu`, summary: "Foglalt" });
  }

  for (const m of input.manualBlocks) {
    const e = { start: m.date, end: addDays(m.date, 1) };
    if (inHorizon(e)) out.push({ ...e, uid: `bn-block-${m.id}@bluenet.hu`, summary: "Zárolva" });
  }

  for (const x of input.externalBlocks) {
    if (platform !== "altalanos" && x.platform === platform) continue;
    const e = { start: x.start, end: x.end };
    if (inHorizon(e)) out.push({ ...e, uid: externalUid(x.feedId, x.uid), summary: "Foglalt" });
  }

  return out.sort((a, b) => (a.start === b.start ? a.uid.localeCompare(b.uid) : a.start.localeCompare(b.start)));
}

// ─── Szerializálás ──────────────────────────────────────────────────────────

// RFC 5545 3.3.11: a TEXT értékben a \ ; , és a sortörés escape-elendő.
export function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// RFC 5545 3.1: 75 oktetnél hosszabb sor hajtása (CRLF + szóköz). UTF-8 karaktert
// nem vágunk ketté; a folytatósor vezető szóköze is beleszámít a 75 oktetbe.
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = "";
  let curBytes = 0;
  let limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (curBytes + n > limit) {
      parts.push(cur);
      cur = "";
      curBytes = 0;
      limit = 74;
    }
    cur += ch;
    curBytes += n;
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

const ymd = (iso: string) => iso.replace(/-/g, "");

export function formatDtStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildIcs(calName: string, events: ExportEvent[], now: Date = new Date()): string {
  const stamp = formatDtStamp(now);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BlueNet//BlueNet CMS//HU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calName)}`,
    "X-WR-TIMEZONE:Europe/Budapest",
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(e.start)}`,
      `DTEND;VALUE=DATE:${ymd(e.end)}`,
      `SUMMARY:${escapeText(e.summary)}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
