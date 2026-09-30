// Levélsablonok: táblázatos, inline stílusú HTML (Gmail/Outlook/mobil) + sima szöveg.
// Minden felhasználói bevitel escape-elve kerül a HTML-be.

import { MEAL_LABEL, SCOPE_LABEL, formatFt, type Meal, type Scope } from "@/lib/booking/constants";
import { addDays, diffDays, fmtLong, todayBudapest } from "@/lib/booking/dates";
import type { Booking, Settings } from "@/lib/booking/server";
import type { Mail } from "./send";

export function esc(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const GREEN = "#2A3228";
const ACCENT = "#5A7A5C";

function layout(title: string, body: string, s: Pick<Settings, "propertyName" | "address" | "phone" | "email">): string {
  return `<!doctype html><html lang="hu"><body style="margin:0;padding:0;background:#F7F5F1;font-family:Arial,Helvetica,sans-serif;color:#1C1C1A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F1;padding:24px 0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:10px;overflow:hidden">
<tr><td style="background:${GREEN};padding:22px 28px;color:#FFFFFF">
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#E8A882">${esc(s.propertyName)}</div>
<div style="font-size:20px;font-weight:bold;margin-top:4px">${title}</div></td></tr>
<tr><td style="padding:24px 28px;font-size:15px;line-height:1.55">${body}</td></tr>
<tr><td style="padding:18px 28px;background:#F0EDE8;font-size:12px;color:#6B6560">
${esc(s.propertyName)} · ${esc(s.address)}<br>${esc(s.phone)} · ${esc(s.email)}</td></tr>
</table></td></tr></table></body></html>`;
}

function rows(items: [string, string][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:12px 0">${items
    .map(
      ([k, v]) =>
        `<tr><td style="padding:7px 0;border-bottom:1px solid #E2DDD7;color:#6B6560;width:42%">${k}</td><td style="padding:7px 0;border-bottom:1px solid #E2DDD7;font-weight:bold">${v}</td></tr>`,
    )
    .join("")}</table>`;
}

function textRows(items: [string, string][]): string {
  return items.map(([k, v]) => `${k}: ${v.replace(/<[^>]+>/g, "")}`).join("\n");
}

function mealText(meal: string, mealGuests: number | null): string {
  if (meal === "nincs" || !meal) return "Nincs";
  return `${MEAL_LABEL[meal as Meal] ?? meal} – ${mealGuests ?? 1} fő`;
}

function stayRows(b: Booking, s: Settings): [string, string][] {
  const nights = diffDays(b.checkIn, b.checkOut);
  return [
    ["Szállás", esc(SCOPE_LABEL[b.roomScope as Scope] ?? b.roomScope)],
    ["Érkezés", `${fmtLong(b.checkIn)}, ${esc(s.checkInFrom)}-tól`],
    ["Távozás", `${fmtLong(b.checkOut)}, ${esc(s.checkOutUntil)}-ig`],
    ["Éjszakák", `${nights}`],
    ["Vendégek", `${b.guests} fő`],
    ["Étkezés", esc(mealText(b.meal, b.mealGuests))],
    ["Összesen", b.total != null ? formatFt(b.total) : "Egyedi ár – hamarosan jelezzük"],
    ["Idegenforgalmi adó", `${formatFt(s.ifaPerPersonPerNight)}/fő/éj, helyszínen fizetendő`],
  ];
}

// Tulajdonosnak: új weboldalas kérés (Resend).
export function ownerNewRequestMail(b: Booking, s: Settings, adminUrl: string): Mail {
  const items: [string, string][] = [
    ["Vendég", esc(b.name)],
    ["E-mail", b.email ? `<a href="mailto:${esc(b.email)}">${esc(b.email)}</a>` : "–"],
    ["Telefon", esc(b.phone) || "–"],
    ...stayRows(b, s),
  ];
  if (b.guestMessage) items.push(["Üzenet", esc(b.guestMessage).replace(/\n/g, "<br>")]);
  const body = `<p style="margin:0 0 8px">Új foglalási kérés érkezett a weboldalról. A napok <strong>még nincsenek lezárva</strong> – a visszaigazolással zárulnak le.</p>
${rows(items)}
<p style="margin:20px 0 0"><a href="${adminUrl}" style="display:inline-block;background:${ACCENT};color:#FFFFFF;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:bold">Megnyitom a foglalást</a></p>`;
  return {
    to: "",
    subject: `Új foglalási kérés – ${b.name} (${b.checkIn})`,
    html: layout("Új foglalási kérés", body, s),
    text: `Új foglalási kérés\n\n${textRows(items)}\n\n${adminUrl}`,
    replyTo: b.email ?? undefined,
  };
}

// Vendégnek: automatikus visszajelzés a beküldésről (Resend, noreply).
export function guestReceivedMail(b: Booking, s: Settings): Mail {
  const items = stayRows(b, s);
  const body = `<p style="margin:0 0 12px">Kedves ${esc(b.name)}!</p>
<p style="margin:0 0 12px">Köszönjük, megkaptuk a foglalási kérését. Hamarosan jelentkezünk a visszaigazolással és az előleg részleteivel. A kérés még nem végleges foglalás.</p>
${rows(items)}
<p style="margin:16px 0 0">Kérdés esetén hívjon minket: <strong>${esc(s.phone)}</strong></p>`;
  return {
    to: b.email ?? "",
    subject: `Megkaptuk a foglalási kérését – ${s.propertyName}`,
    html: layout("Megkaptuk a kérését", body, s),
    text: `Kedves ${b.name}!\n\nKöszönjük, megkaptuk a foglalási kérését. Hamarosan jelentkezünk a visszaigazolással és az előleg részleteivel.\n\n${textRows(items)}\n\nKérdés esetén: ${s.phone}`,
    replyTo: s.email,
  };
}

// Vendégnek: visszaigazolás az előleg-utalási adatokkal (Gmail).
export function guestConfirmationMail(b: Booking, s: Settings): Mail {
  const deposit = b.depositAmount;
  const acceptedDay = b.acceptedAt ? new Date(b.acceptedAt).toISOString().slice(0, 10) : todayBudapest();
  const due = addDays(acceptedDay, s.depositDueDays);
  const items = stayRows(b, s);
  const bank: [string, string][] = [
    ["Kedvezményezett", esc(s.bankBeneficiary)],
    ["Számlaszám", esc(s.bankAccount)],
    ["IBAN", esc(s.bankIban)],
    ["Bank", esc(s.bankName)],
    ["Közlemény", `${esc(b.name)}, ${b.checkIn}`],
  ];
  const depositBox =
    deposit != null
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF3EE;border:1px solid #C5D5C5;border-radius:8px;margin:18px 0"><tr><td style="padding:16px 18px">
<div style="font-size:13px;color:${ACCENT};font-weight:bold;text-transform:uppercase;letter-spacing:1px">Előleg</div>
<div style="font-size:22px;font-weight:bold;margin:4px 0">${formatFt(deposit)}</div>
<div style="font-size:14px">Kérjük, ${fmtLong(due)}-ig utalja át – ezzel válik véglegessé a foglalás.</div>
${rows(bank)}
<div style="font-size:13px;color:#6B6560">Lemondás az érkezés előtti 30. napig díjmentes. Részletek: <a href="https://www.vikivendeghaz.hu/aszf" style="color:${ACCENT}">ÁSZF</a></div>
</td></tr></table>`
      : `<p>Az előleg összegét külön jelezzük.</p>`;
  const body = `<p style="margin:0 0 12px">Kedves ${esc(b.name)}!</p>
<p style="margin:0 0 12px">Örömmel visszaigazoljuk foglalását, a napokat lefoglaltuk Önnek.</p>
${rows(items)}${depositBox}
<p style="margin:16px 0 0">Kérdése van? Válaszoljon erre a levélre, vagy hívjon: <strong>${esc(s.phone)}</strong></p>`;
  return {
    to: b.email ?? "",
    subject: `Foglalás visszaigazolása – ${s.propertyName} (${b.checkIn})`,
    html: layout("Foglalását visszaigazoltuk", body, s),
    text: `Kedves ${b.name}!\n\nÖrömmel visszaigazoljuk foglalását.\n\n${textRows(items)}\n\n${
      deposit != null ? `Előleg: ${formatFt(deposit)}, határidő: ${fmtLong(due)}\n${textRows(bank)}\n\n` : ""
    }Kérdése van? Válaszoljon erre a levélre, vagy hívjon: ${s.phone}`,
  };
}

export function gmailTestMail(s: Settings): Mail {
  const body = `<p>Ez egy próbalevél. Ha megérkezett, a Gmail-kapcsolat működik, a vendégeknek küldött levelek innen mennek ki.</p>`;
  return {
    to: process.env.GMAIL_USER ?? "",
    subject: `Gmail-kapcsolat teszt – ${s.propertyName}`,
    html: layout("Gmail-kapcsolat teszt", body, s),
    text: "Ez egy próbalevél. Ha megérkezett, a Gmail-kapcsolat működik.",
  };
}
