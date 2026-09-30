// Levélküldés két csatornán:
//  – Gmail (nodemailer, alkalmazásjelszó): minden, amire a vendég válaszolhat
//    (visszaigazolás előleg-adatokkal). A levél a Gmail "Elküldött" mappájában is megjelenik.
//  – Resend (noreply): belső értesítők és az automatikus "Megkaptuk a kérését".
// Ha az EMAIL_TEST_REDIRECT be van állítva (preview), minden levél oda megy.

import nodemailer from "nodemailer";
import { Resend } from "resend";

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export class MailError extends Error {}

export const GMAIL_ERROR =
  "A levél nem ment el. Ellenőrizze a Gmail-kapcsolatot a Beállításokban.";

function applyTestRedirect(mail: Mail): Mail {
  const redirect = process.env.EMAIL_TEST_REDIRECT?.trim();
  if (!redirect) return mail;
  return { ...mail, to: redirect, subject: `[TESZT → ${mail.to}] ${mail.subject}` };
}

export function isGmailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export async function sendViaGmail(input: Mail): Promise<void> {
  if (!isGmailConfigured()) throw new MailError(GMAIL_ERROR);
  const mail = applyTestRedirect(input);
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  try {
    await transport.sendMail({
      from: `"${process.env.MAIL_FROM_NAME ?? "Viki Vendégház"}" <${process.env.GMAIL_USER}>`,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: mail.replyTo,
    });
  } catch (e) {
    console.error("Gmail küldési hiba:", e);
    throw new MailError(GMAIL_ERROR);
  }
}

// Resend-hiba nem akaszthatja meg a foglalást – csak naplózzuk.
export async function sendViaResend(input: Mail): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  const mail = applyTestRedirect(input);
  const from = process.env.RESEND_FROM_EMAIL ?? "noreply@vikivendeghaz.hu";
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: `Viki Vendégház <${from}>`,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: mail.replyTo,
    });
    if (error) {
      console.error("Resend hiba:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Resend hiba:", e);
    return false;
  }
}

export const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "vikivendeghaz@gmail.com";

export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production") return "https://www.vikivendeghaz.hu";
  if (process.env.VERCEL_BRANCH_URL) return `https://${process.env.VERCEL_BRANCH_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
