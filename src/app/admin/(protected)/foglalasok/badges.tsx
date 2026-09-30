import { SOURCE_LABEL, STATUS_LABEL, type Source, type Status } from "@/lib/booking/constants";

const STATUS_STYLE: Record<Status, string> = {
  valaszra_var: "bg-[#FFF3C4] text-[#7A5B00]",
  elfogadva: "bg-[var(--accent2-bg)] text-[#8A4A22]",
  visszaigazolt: "bg-[var(--accent-bg)] text-[#3A5A3C]",
  lemondott: "bg-[var(--surface2)] text-[var(--text3)] line-through",
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as Status;
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium ${STATUS_STYLE[s] ?? ""}`}>
      {STATUS_LABEL[s] ?? status}
    </span>
  );
}

export function SourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-block whitespace-nowrap rounded border border-[var(--border)] px-1.5 py-0 text-[11px] text-[var(--text2)]">
      {SOURCE_LABEL[source as Source] ?? source}
    </span>
  );
}
