import { OFFER_STATUS_LABEL, type OfferStatus } from "../types";

const STYLE: Record<OfferStatus, string> = {
  uj: "bg-[#FFF3C4] text-[#7A5B00]",
  elkuldve: "bg-[#E6EEF8] text-[#2D4E78]",
  elfogadva: "bg-[var(--accent2-bg)] text-[#8A4A22]",
  foglalas: "bg-[var(--accent-bg)] text-[#3A5A3C]",
  elutasitva: "bg-[var(--surface2)] text-[var(--text3)]",
  lejart: "bg-[var(--surface2)] text-[var(--text3)]",
};

export function OfferStatusBadge({ status }: { status: string }) {
  const s = status as OfferStatus;
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium ${STYLE[s] ?? ""}`}>
      {OFFER_STATUS_LABEL[s] ?? status}
    </span>
  );
}
