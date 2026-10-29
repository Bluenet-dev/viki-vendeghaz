// Bejövő iCal-feed feldolgozása (node-ical) – tiszta függvény, hálózat nélkül.
//
// Dátumszabályok:
//  – VALUE=DATE: a node-ical a szerver helyi idejében hoz létre Date-et, ezért a
//    helyi naptári komponenseket olvassuk (toISOString egy napot csúsztatna).
//  – DATE-TIME: a szállás helyi naptári napjára kerekítünk (Europe/Budapest).
//  – A DTEND kizárólagos (a távozás napja). Hiányzó vagy nem későbbi DTEND → 1 éjszaka.

import ical from "node-ical";
import { createHash } from "node:crypto";
import { addDays, isIsoDate } from "@/lib/booking/dates";
import { TIMEZONE, type ParsedEvent } from "./types";

export class IcsParseError extends Error {}

const SUMMARY_MAX = 100;
const budapestDay = new Intl.DateTimeFormat("sv-SE", { timeZone: TIMEZONE });
const pad = (n: number) => String(n).padStart(2, "0");

type IcalDate = Date & { dateOnly?: boolean };

export function toLocalDay(d: IcalDate): string {
  if (d.dateOnly) return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return budapestDay.format(d);
}

function textValue(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "val" in v) return String((v as { val: unknown }).val ?? "");
  return "";
}

export function parseIcs(text: string): ParsedEvent[] {
  if (!/BEGIN:VCALENDAR/i.test(text)) throw new IcsParseError("A válasz nem iCal-naptár (hiányzik a BEGIN:VCALENDAR).");

  let data: ReturnType<typeof ical.sync.parseICS>;
  try {
    data = ical.sync.parseICS(text);
  } catch (e) {
    throw new IcsParseError(`Az iCal-naptár nem olvasható: ${e instanceof Error ? e.message : String(e)}`);
  }

  const out: ParsedEvent[] = [];
  const seen = new Set<string>();

  for (const c of Object.values(data)) {
    if (!c || c.type !== "VEVENT") continue;
    const ev = c as ical.VEvent;
    if (String(ev.status ?? "").toUpperCase() === "CANCELLED") continue;
    if (!ev.start) continue;

    const start = toLocalDay(ev.start as IcalDate);
    let end = ev.end ? toLocalDay(ev.end as IcalDate) : addDays(start, 1);
    if (!isIsoDate(start) || !isIsoDate(end)) continue;
    if (end <= start) end = addDays(start, 1);

    const summary = textValue(ev.summary).trim().slice(0, SUMMARY_MAX);
    let uid = textValue(ev.uid).trim();
    if (!uid) uid = `nouid-${createHash("sha256").update(`${start}|${end}|${summary}`).digest("hex").slice(0, 16)}`;
    // Ugyanaz a UID többször (pl. ismétlődő esemény példányai): mindegyik megmarad.
    if (seen.has(uid)) uid = `${uid}#${start}`;
    seen.add(uid);

    out.push({ uid, start, end, summary });
  }

  return out;
}
