// Bevételek – tiszta számítás (nincs DB), így kézzel számolt példákkal tesztelhető.
//
// Fogalmak (a felületen csak az egyszerű nevek látszanak):
//  – Befolyt: visszaigazolt foglalás, amelynek érkezése már elmúlt (teljes összeg),
//    + jövőbeli foglalás már beérkezett foglalója.
//  – Várható: visszaigazolt és előlegre váró foglalás még be nem folyt része.
//  – Függőben: válaszra váró kérések és elküldött, még el nem fogadott ajánlatok
//    (nem számít bele).
//  – Lemondott foglalás nem számít. Az IFA nem bevétel: ahol van tételes bontás, levonjuk;
//    régi (tételek nélküli) foglalásnál a tárolt összeg számít.
//  – Egy foglalás az érkezés hónapjához tartozik.

import { ROOM_SCOPES, targetRooms, type RoomScope } from "./booking/constants";
import { addDays, nightsOf } from "./booking/dates";
import { isIfaLine, type QuoteLine } from "./booking/quote";

export interface RevBooking {
  id: number;
  name: string;
  status: string;
  source: string;
  roomScope: string;
  checkIn: string;
  checkOut: string;
  total: number | null;
  depositAmount: number | null;
  depositReceivedAt: string | null;
  lines: unknown;
}

export interface RevOffer {
  status: string;
  kind: string;
  checkIn: string;
  validUntil: string | null;
  total: number | null;
  lines: unknown;
}

const ACTIVE = new Set(["elfogadva", "visszaigazolt"]);

// Bevétel IFA nélkül. `itemized`: volt-e tételes bontás (ha nem, a tárolt összeg számít).
export function netOf(x: { total: number | null; lines: unknown }): { net: number; ifa: number; itemized: boolean } {
  const total = x.total ?? 0;
  if (!Array.isArray(x.lines) || x.lines.length === 0) return { net: total, ifa: 0, itemized: false };
  const ifa = (x.lines as QuoteLine[]).filter(isIfaLine).reduce((a, l) => a + (Number(l.amount) || 0), 0);
  return { net: total - ifa, ifa, itemized: true };
}

// Egy foglalás bevétele: mennyi folyt be és mennyi várható még.
export function splitBooking(b: RevBooking, today: string): { befolyt: number; varhato: number } {
  if (!ACTIVE.has(b.status)) return { befolyt: 0, varhato: 0 };
  const { net } = netOf(b);
  const arrived = b.checkIn <= today;
  if (arrived && b.status === "visszaigazolt") return { befolyt: net, varhato: 0 };
  if (b.depositReceivedAt && b.depositAmount != null) {
    const paid = Math.min(b.depositAmount, net);
    return { befolyt: paid, varhato: net - paid };
  }
  return { befolyt: 0, varhato: net };
}

function pendingNet(x: { total: number | null; lines: unknown }): number {
  return netOf(x).net;
}

export interface MonthRow {
  month: number; // 0–11
  bookings: number; // az adott hónapban érkező foglalások
  nights: number; // a hónapra eső foglalt éjszakák
  occupancy: number; // foglalt szoba-éj / elérhető szoba-éj, %
  befolyt: number;
  varhato: number;
  total: number;
  pending: number;
  lastYear: number | null; // tavaly ugyanebben a hónapban (befolyt + várható)
}

export interface RevenueReport {
  year: number;
  months: MonthRow[];
  befolyt: number;
  varhato: number;
  total: number;
  pending: number;
  bySource: { key: string; amount: number }[];
  byUnit: { key: RoomScope | "egesz_haz"; amount: number }[];
  next30: { id: number; name: string; checkIn: string; checkOut: string; roomScope: string; amount: number; depositMissing: boolean }[];
  next30Total: number;
  hasLegacy: boolean; // van tételes bontás nélküli (régi) foglalás az évben
  empty: boolean;
}

const monthOf = (iso: string) => Number(iso.slice(5, 7)) - 1;
const yearOf = (iso: string) => Number(iso.slice(0, 4));
const daysIn = (year: number, month0: number) => new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();

export function revenueReport(year: number, bookings: RevBooking[], offers: RevOffer[], today: string): RevenueReport {
  const months: MonthRow[] = Array.from({ length: 12 }, (_, m) => ({
    month: m, bookings: 0, nights: 0, occupancy: 0, befolyt: 0, varhato: 0, total: 0, pending: 0, lastYear: null,
  }));
  const roomNights = Array(12).fill(0);
  const source = new Map<string, number>();
  const unit = new Map<string, number>();
  const lastYear = Array(12).fill(0);
  let lastYearAny = false;
  let hasLegacy = false;

  for (const b of bookings) {
    const y = yearOf(b.checkIn);
    if (ACTIVE.has(b.status)) {
      // Kihasználtság és éjszakák: a ténylegesen az adott hónapra eső éjszakák.
      const rooms = targetRooms(b.roomScope).length;
      for (const d of nightsOf(b.checkIn, b.checkOut)) {
        if (yearOf(d) !== year) continue;
        months[monthOf(d)].nights += 1;
        roomNights[monthOf(d)] += rooms;
      }
    }
    if (y === year - 1 && ACTIVE.has(b.status)) {
      const s = splitBooking(b, today);
      lastYear[monthOf(b.checkIn)] += s.befolyt + s.varhato;
      lastYearAny = true;
    }
    if (y !== year) continue;
    const m = months[monthOf(b.checkIn)];
    if (b.status === "valaszra_var") {
      m.pending += pendingNet(b);
      continue;
    }
    if (!ACTIVE.has(b.status)) continue;
    const s = splitBooking(b, today);
    m.bookings += 1;
    m.befolyt += s.befolyt;
    m.varhato += s.varhato;
    const amount = s.befolyt + s.varhato;
    if (!netOf(b).itemized) hasLegacy = true;
    source.set(b.source, (source.get(b.source) ?? 0) + amount);
    // Szobakombinációnál az összeg egyenlően oszlik a szobák között.
    const units = b.roomScope === "egesz_haz" ? ["egesz_haz"] : targetRooms(b.roomScope);
    for (const u of units) unit.set(u, (unit.get(u) ?? 0) + amount / units.length);
  }

  for (const o of offers) {
    if (yearOf(o.checkIn) !== year || o.kind === "betelt") continue;
    const open = o.status === "elkuldve" && (o.validUntil == null || o.validUntil >= today);
    if (open) months[monthOf(o.checkIn)].pending += pendingNet(o);
  }

  for (const m of months) {
    m.total = m.befolyt + m.varhato;
    const available = ROOM_SCOPES.length * daysIn(year, m.month);
    m.occupancy = Math.round((roomNights[m.month] / available) * 100);
    m.lastYear = lastYearAny ? lastYear[m.month] : null;
  }

  const end = addDays(today, 30);
  const next30 = bookings
    .filter((b) => ACTIVE.has(b.status) && b.checkIn >= today && b.checkIn <= end)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
    .map((b) => {
      const s = splitBooking(b, today);
      return {
        id: b.id, name: b.name, checkIn: b.checkIn, checkOut: b.checkOut, roomScope: b.roomScope,
        amount: s.befolyt + s.varhato,
        depositMissing: b.status === "elfogadva" && !b.depositReceivedAt,
      };
    });

  const sum = (k: "befolyt" | "varhato" | "pending") => months.reduce((a, m) => a + m[k], 0);
  const befolyt = sum("befolyt");
  const varhato = sum("varhato");
  return {
    year,
    months,
    befolyt,
    varhato,
    total: befolyt + varhato,
    pending: sum("pending"),
    bySource: [...source].map(([key, amount]) => ({ key, amount })).sort((a, b) => b.amount - a.amount),
    byUnit: (["szoba-1", "szoba-2", "superior", "egesz_haz"] as const).map((key) => ({ key, amount: Math.round(unit.get(key) ?? 0) })),
    next30,
    next30Total: next30.reduce((a, x) => a + x.amount, 0),
    hasLegacy,
    empty: months.every((m) => m.bookings === 0 && m.pending === 0),
  };
}

// CSV a könyvelőnek (pontosvessző, UTF-8 BOM – az Excel így helyesen nyitja meg).
export function revenueCsv(year: number, bookings: RevBooking[], today: string, labels: { status: (s: string) => string; source: (s: string) => string; unit: (s: string) => string }): string {
  const head = ["Azonosító", "Vendég", "Érkezés", "Távozás", "Szállás", "Forrás", "Állapot", "Összeg", "IFA", "Bevétel IFA nélkül", "Foglaló", "Foglaló beérkezett", "Befolyt", "Várható"];
  const esc = (v: string | number | null) => {
    const s = v == null ? "" : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = bookings
    .filter((b) => yearOf(b.checkIn) === year && ACTIVE.has(b.status))
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
    .map((b) => {
      const n = netOf(b);
      const s = splitBooking(b, today);
      return [b.id, b.name, b.checkIn, b.checkOut, labels.unit(b.roomScope), labels.source(b.source), labels.status(b.status), b.total ?? "", n.itemized ? n.ifa : "", n.net, b.depositAmount ?? "", b.depositReceivedAt ?? "", s.befolyt, s.varhato];
    });
  return "﻿" + [head, ...rows].map((r) => r.map(esc).join(";")).join("\r\n") + "\r\n";
}
