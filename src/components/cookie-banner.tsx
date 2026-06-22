"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const COOKIE_NAME = "cookie_consent";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

type Consent = "all" | "necessary";

function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const value = match.split("=")[1];
  return value === "all" || value === "necessary" ? value : null;
}

function writeConsent(value: Consent) {
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

// Google Consent Mode v2 előkészítés. A gtag még nem fut (GA bekötés a marketing-fázis
// feladata), de a dataLayer/consent struktúra már itt van, hogy aktiváláskor csak a
// gtag-szkriptet kelljen behúzni.
declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

function pushConsentDefault() {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  }
  gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

function pushConsentGranted() {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  }
  gtag("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
  });
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Alapértelmezetten minden tárolás tiltva, amíg a felhasználó nem dönt.
    pushConsentDefault();
    const existing = readConsent();
    if (existing === "all") {
      pushConsentGranted();
    } else if (!existing) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const accept = () => {
    writeConsent("all");
    pushConsentGranted();
    setVisible(false);
  };

  const declineOptional = () => {
    writeConsent("necessary");
    setVisible(false);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 bg-[var(--nav-bg)] text-[var(--nav-text)]"
      role="dialog"
      aria-label="Süti tájékoztató"
      style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed">
          Sütiket használunk a weboldal működéséhez és a jobb felhasználói élmény érdekében.{" "}
          <Link
            href="/adatvedelem"
            className="underline underline-offset-2 hover:text-white"
          >
            Adatvédelmi tájékoztató
          </Link>
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={declineOptional}
            className="rounded-full border border-[var(--nav-text)] px-5 py-2 text-sm text-[var(--nav-text)] transition-colors hover:text-white"
          >
            Csak szükséges
          </button>
          <button
            type="button"
            onClick={accept}
            className="rounded-full bg-[var(--accent2)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Elfogadom
          </button>
        </div>
      </div>
    </div>
  );
}
