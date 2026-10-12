// Az ajánlat tételsorai: KIZÁRÓLAG a közös árazómotor (computeQuote) eredménye, amelyen
// a tulajdonos egyes tételek összegét kézzel felülírhatja. Külön árszámítás itt nincs.

import type { Party, Quote, QuoteInput } from "@/lib/booking/quote";
import type { OfferDraft, OfferLine, Window } from "./types";

export interface OfferTotals {
  lines: OfferLine[];
  total: number | null;
  deposit: number | null;
  depositPercent: number;
}

export function applyOverrides(quote: Quote, overrides: Record<string, number>): OfferTotals {
  if (quote.total == null) return { lines: [], total: null, deposit: null, depositPercent: quote.depositPercent };
  const lines: OfferLine[] = quote.lines.map((l, i) => {
    const key = l.key ?? `sor:${i}`;
    const o = overrides[key];
    return o != null && o !== l.amount ? { ...l, key, amount: o, manual: true } : { ...l, key };
  });
  const total = lines.reduce((a, l) => a + l.amount, 0);
  return { lines, total, deposit: Math.round((total * quote.depositPercent) / 100), depositPercent: quote.depositPercent };
}

// A szerkesztő állapotából a motor bemenete. Csomag és Szaunanap csak egész háznál.
export function quoteInput(
  o: { checkIn: string; checkOut: string },
  d: Pick<OfferDraft, "scope" | "party" | "meal" | "mealGuests" | "packageSlug" | "extras">,
): QuoteInput {
  const house = d.scope === "egesz_haz";
  return {
    scope: d.scope,
    checkIn: o.checkIn,
    checkOut: o.checkOut,
    party: d.party,
    meal: d.meal,
    mealGuests: d.mealGuests,
    packageSlug: house ? d.packageSlug : null,
    extras: { saunaDays: house ? d.extras.saunaDays ?? 0 : 0, tubCount: d.extras.tubCount ?? 0 },
  };
}

// "Ajánlatot kérek erre az időpontra" link (betelt levél), előtöltött ajánlatkérő űrlapra.
export function requestUrl(base: string, w: Window, p: Party): string {
  const q = new URLSearchParams({ erkezes: w.checkIn, tavozas: w.checkOut, felnott: String(p.adults) });
  if (p.teens) q.set("kamasz", String(p.teens));
  if (p.children) q.set("gyerek", String(p.children));
  if (p.infants) q.set("baba", String(p.infants));
  return `${base}/ajanlatkeres?${q.toString()}`;
}
