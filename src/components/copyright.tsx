"use client";

import { useEffect, useState } from "react";

export function Copyright() {
  // Kezdeti állapot: null, vagy egy fix szöveg (hogy a szerver ne dobjon hibát)
  const [year, setYear] = useState<string | null>(null);

  useEffect(() => {
    // Ez a kód CSAK a böngészőben fut le, miután az oldal betöltött.
    // Így biztonságos a new Date() használata.
    setYear(new Date().getFullYear().toString());
  }, []);

  // Amíg a kliens nem töltött be (szerver oldalon), ne mutassunk semmit (vagy fix 2026-ot),
  // így elkerüljük a "hydration mismatch" hibát.
  if (!year) {
    return <span>2026</span>;
  }

  return <span>{year}</span>;
}
