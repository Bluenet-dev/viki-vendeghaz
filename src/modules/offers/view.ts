// Az ajánlat tartalma egy helyen összeállítva. Ebből készül a HTML levél, a PDF, a
// /ajanlat/[token] oldal és az admin élő előnézete – így mind pontosan ugyanazt mutatja.
// Tiszta függvény (nincs DB), kliensen is fut.

import { MEAL_LABEL, formatFt, targetLabel, type Meal } from "@/lib/booking/constants";
import { diffDays, fmtLong } from "@/lib/booking/dates";
import type { Party } from "@/lib/booking/quote";
import type { OfferKind, OfferLine, Window } from "./types";

// A Beállításokból jövő, szállásspecifikus adatok (semmi nincs a kódba égetve).
export interface Brand {
  propertyName: string;
  address: string;
  phone: string;
  email: string;
  websiteUrl: string;
  aszfUrl: string;
  logoUrl: string | null;
  brandColor: string;
  accentColor: string;
  checkInFrom: string;
  checkInUntil: string;
  checkOutUntil: string;
  depositDueDays: number;
  cancellationTerms: string;
  finnSaunaPerPersonHour: number;
  infraSharedPerPersonHour: number;
  superiorInfraPerHour: number;
  saltCaveFreeMinutes: number;
}

export function brandFrom(s: Brand): Brand {
  return {
    propertyName: s.propertyName, address: s.address, phone: s.phone, email: s.email,
    websiteUrl: s.websiteUrl, aszfUrl: s.aszfUrl, logoUrl: s.logoUrl, brandColor: s.brandColor,
    accentColor: s.accentColor, checkInFrom: s.checkInFrom, checkInUntil: s.checkInUntil,
    checkOutUntil: s.checkOutUntil, depositDueDays: s.depositDueDays, cancellationTerms: s.cancellationTerms,
    finnSaunaPerPersonHour: s.finnSaunaPerPersonHour, infraSharedPerPersonHour: s.infraSharedPerPersonHour,
    superiorInfraPerHour: s.superiorInfraPerHour, saltCaveFreeMinutes: s.saltCaveFreeMinutes,
  };
}

export interface OfferViewInput {
  number: string;
  kind: OfferKind;
  name: string;
  checkIn: string;
  checkOut: string;
  party: Party;
  scope: string;
  meal: Meal;
  mealGuests: number;
  lines: OfferLine[];
  total: number | null;
  deposit: number | null;
  depositPercent: number;
  personalMessage: string;
  validUntil: string | null; // null = még nincs elküldve (előnézet)
  validDays: number;
  acceptUrl: string;
  alternatives: Window[];
  requestUrlFor: (w: Window) => string; // betelt: "Ajánlatot kérek erre az időpontra"
}

export interface ViewLine {
  label: string;
  qty: string;
  unitPrice: string;
  amount: string;
  negative: boolean;
}

export interface OfferView {
  kind: OfferKind;
  brand: Brand;
  number: string;
  title: string; // ajánlatnál az alcím (egység · időpont), betelt levélnél a cím
  greeting: string;
  intro: string;
  personalMessage: string;
  summary: [string, string][];
  lines: ViewLine[];
  total: string;
  deposit: { amount: string; percent: number; due: string; terms: string } | null;
  info: { title: string; items: string[] }[];
  acceptUrl: string;
  validity: string;
  alternatives: { range: string; nights: string; url: string }[];
  aszfUrl: string;
}

export function guestBreakdown(p: Party): string {
  const parts = [`${p.adults} felnőtt`];
  if (p.teens) parts.push(`${p.teens} gyerek (13–17 év)`);
  if (p.children) parts.push(`${p.children} gyerek (3–12 év)`);
  if (p.infants) parts.push(`${p.infants} baba (0–2 év)`);
  return parts.join(", ");
}

function rangeText(w: Window): string {
  return `${fmtLong(w.checkIn)} – ${fmtLong(w.checkOut)}`;
}

export function buildOfferView(o: OfferViewInput, brand: Brand): OfferView {
  const nights = diffDays(o.checkIn, o.checkOut);
  const isHouse = o.scope === "egesz_haz";
  const summary: [string, string][] = [
    ["Érkezés", `${fmtLong(o.checkIn)}, ${brand.checkInFrom}–${brand.checkInUntil} óra között`],
    ["Távozás", `${fmtLong(o.checkOut)}, ${brand.checkOutUntil} óráig`],
    ["Szállás", targetLabel(o.scope)],
    ["Vendégek", guestBreakdown(o.party)],
    ["Éjszakák", `${nights} éj`],
  ];
  if (o.meal !== "nincs") summary.push(["Étkezés", `${MEAL_LABEL[o.meal]}, ${o.mealGuests} fő`]);

  const lines: ViewLine[] = o.lines.map((l) => ({
    label: l.label,
    qty: l.qtyText ?? "",
    // Kézzel átírt összegnél az egységár már nem igaz – nem mutatjuk.
    unitPrice: l.unitPrice != null && !l.manual ? formatFt(l.unitPrice) : "",
    amount: formatFt(l.amount),
    negative: l.amount < 0,
  }));

  const info: OfferView["info"] = [];
  const onSite: string[] = [];
  if (!isHouse) {
    onSite.push(`Finn szauna: ${formatFt(brand.finnSaunaPerPersonHour)} / fő / óra`);
    onSite.push(`Közös infraszauna: ${formatFt(brand.infraSharedPerPersonHour)} / fő / óra`);
    if (o.scope.includes("superior")) onSite.push(`Infraszauna a Superior szobában: ${formatFt(brand.superiorInfraPerHour)} / óra`);
  }
  if (onSite.length) info.push({ title: "Helyszínen fizetendő, ha igénybe veszik", items: onSite });
  if (isHouse) info.push({ title: "Kaució", items: ["Nagyobb csoportoknál egyedi elbírálás alapján kaució kérhető, amely távozáskor visszajár."] });
  info.push({
    title: "Ingyenes",
    items: [`Sóbarlang ${brand.saltCaveFreeMinutes} perc / fő / nap`, "Kültéri medence (nyáron)", "Kert, grill, bogrács"],
  });

  const validity = o.validUntil
    ? `Az ajánlat ${fmtLong(o.validUntil)} végéig érvényes.`
    : `Az ajánlat a küldéstől számított ${o.validDays} napig érvényes.`;

  if (o.kind === "betelt") {
    return {
      kind: "betelt",
      brand,
      number: o.number,
      title: "Sajnos a kért időpont betelt",
      greeting: `Kedves ${o.name}!`,
      intro: `Köszönjük érdeklődését! A kért időpontban (${rangeText(o)}) sajnos nincs szabad helyünk. Az alábbi, legközelebbi időpontokban szívesen fogadjuk Önöket:`,
      personalMessage: o.personalMessage,
      summary: [],
      lines: [],
      total: "",
      deposit: null,
      info: [],
      acceptUrl: "",
      validity: "",
      alternatives: o.alternatives.map((w) => ({ range: rangeText(w), nights: `${diffDays(w.checkIn, w.checkOut)} éj`, url: o.requestUrlFor(w) })),
      aszfUrl: brand.aszfUrl,
    };
  }

  return {
    kind: "ajanlat",
    brand,
    number: o.number,
    title: `${targetLabel(o.scope)} · ${fmtLong(o.checkIn)} – ${fmtLong(o.checkOut)}`,
    greeting: `Kedves ${o.name}!`,
    intro: "Köszönjük érdeklődését! Örömmel küldjük személyre szabott ajánlatunkat:",
    personalMessage: o.personalMessage,
    summary,
    lines,
    total: o.total != null ? formatFt(o.total) : "",
    deposit:
      o.deposit != null
        ? {
            amount: formatFt(o.deposit),
            percent: o.depositPercent,
            due: `Az elfogadástól számított ${brand.depositDueDays} napon belül, átutalással.`,
            terms: brand.cancellationTerms,
          }
        : null,
    info,
    acceptUrl: o.acceptUrl,
    validity,
    alternatives: [],
    aszfUrl: brand.aszfUrl,
  };
}
