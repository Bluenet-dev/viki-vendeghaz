"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { IconLock } from "@tabler/icons-react";
import { ROOM_SCOPES, SCOPE_LABEL, type Scope } from "@/lib/booking/constants";
import { setRateAction, toggleClosureAction, toggleHouseAction } from "./actions";

export interface CellData {
  price: number | null;
  extra: number | null;
  whole: boolean;
}

type Closed = Record<string, { bookingId: number | null; name: string | null }>;

const WEEKDAYS = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];

function dow(iso: string) {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

function fmt(n: number | null | undefined) {
  return n == null ? "" : n.toLocaleString("hu-HU");
}

export function CalendarGrid({
  days,
  today,
  cells,
  closed,
}: {
  days: string[];
  today: string;
  cells: Record<string, CellData>;
  closed: Closed;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const weekend = (d: string) => dow(d) === 0 || dow(d) === 6;
  const colBg = (d: string) => (d === today ? "bg-[var(--accent-bg)]" : weekend(d) ? "bg-[#F4F1EC]" : "");
  // Egy nap "csak egész ház", ha a szobák sora így jelöli.
  const houseOnly = (d: string) => ROOM_SCOPES.some((r) => cells[`${r}|${d}`]?.whole);

  function run(key: string, fn: () => Promise<{ bookingId: number | null }>) {
    setBusyKey(key);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fn();
        if (res.bookingId) router.push(`/admin/foglalasok/${res.bookingId}`);
        else router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Nem sikerült menteni.");
      } finally {
        setBusyKey(null);
      }
    });
  }

  function startEdit(key: string, value: number | null) {
    setEditing(key);
    setDraft(value == null ? "" : String(value));
    setError(null);
  }

  function saveEdit(scope: string, date: string, field: "price" | "extraPersonPrice") {
    const key = editing;
    if (!key) return;
    setBusyKey(key);
    startTransition(async () => {
      const res = await setRateAction(scope, date, field, draft);
      setBusyKey(null);
      if (res.error) {
        setError(res.error);
        return;
      }
      setEditing(null);
      router.refresh();
    });
  }

  const labelCell =
    "sticky left-0 z-10 whitespace-nowrap border-r-[0.5px] border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-[13px] font-normal text-[var(--text2)]";
  const cellBase = "h-9 min-w-[58px] border-l-[0.5px] border-[var(--border)] p-0 text-center text-[13px]";

  function availabilityRow(room: string) {
    return (
      <tr className="border-t-[0.5px] border-[var(--border)]">
        <th scope="row" className={labelCell}>Szabad / foglalt</th>
        {days.map((d) => {
          const key = `${room}|${d}`;
          const past = d < today;
          const c = closed[key];
          // "Csak egész ház" napon a szabad szoba kötőjelet kap (szobánként nem foglalható,
          // lezárni az egész ház cellájával lehet); a lezárt szoba viszont mindig lakatot mutat.
          if (houseOnly(d) && !c) {
            return <td key={d} className={`${cellBase} bg-[var(--surface2)] text-[var(--text3)]`}>–</td>;
          }
          const title = c?.bookingId ? `${c.name ?? "Foglalás"} – megnyitás` : c ? "Lezárva – kattintásra feloldja" : "Szabad – kattintásra lezárja";
          return (
            <td key={d} className={`${cellBase} ${c ? "bg-[#F3C7C7]" : colBg(d)} ${past ? "opacity-40" : ""}`}>
              <button
                type="button"
                disabled={past || pending}
                title={past ? undefined : title}
                aria-label={`${d}: ${c ? "foglalt" : "szabad"}`}
                onClick={() => run(key, () => toggleClosureAction(room, d))}
                className={`flex h-9 w-full items-center justify-center ${past ? "cursor-default" : "cursor-pointer hover:outline hover:outline-1 hover:outline-[var(--text3)]"} ${busyKey === key ? "animate-pulse" : ""}`}
              >
                {c && <IconLock size={15} stroke={1.8} className="text-[#A33A3A]" />}
              </button>
            </td>
          );
        })}
      </tr>
    );
  }

  function priceRow(scope: Scope, field: "price" | "extraPersonPrice", label: string) {
    return (
      <tr className="border-t-[0.5px] border-[var(--border)]">
        <th scope="row" className={labelCell}>{label}</th>
        {days.map((d) => {
          const key = `${scope}|${d}|${field}`;
          const past = d < today;
          const data = cells[`${scope}|${d}`];
          const value = field === "price" ? data?.price : data?.extra;
          if (scope !== "egesz_haz" && houseOnly(d)) {
            return <td key={d} className={`${cellBase} bg-[var(--surface2)] text-[var(--text3)]`}>–</td>;
          }
          if (editing === key) {
            return (
              <td key={d} className={`${cellBase} bg-white`}>
                <input
                  autoFocus
                  inputMode="numeric"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(scope, d, field);
                    if (e.key === "Escape") setEditing(null);
                  }}
                  onBlur={() => {
                    if (busyKey !== key) setEditing(null);
                  }}
                  className={`h-9 w-[64px] border-2 border-[var(--accent)] bg-white px-1 text-center text-[13px] outline-none ${busyKey === key ? "opacity-50" : ""}`}
                  aria-label={`${SCOPE_LABEL[scope]} ${label} ${d}`}
                />
              </td>
            );
          }
          return (
            <td key={d} className={`${cellBase} ${colBg(d)} ${past ? "opacity-40" : ""}`}>
              <button
                type="button"
                disabled={past}
                onClick={() => startEdit(key, value ?? null)}
                className={`h-9 w-full px-1 ${past ? "cursor-default" : "cursor-text hover:bg-white hover:outline hover:outline-1 hover:outline-[var(--text3)]"} ${value == null ? "text-[var(--text3)]" : "text-[var(--text)]"}`}
              >
                {value == null ? (field === "price" && data ? "egyedi" : "") : fmt(value)}
              </button>
            </td>
          );
        })}
      </tr>
    );
  }

  function houseAvailabilityRow() {
    return (
      <tr className="border-t-[0.5px] border-[var(--border)]">
        <th scope="row" className={labelCell}>
          Szabad / foglalt <span className="text-[var(--text3)]">· automatikus</span>
        </th>
        {days.map((d) => {
          const past = d < today;
          const roomsClosed = ROOM_SCOPES.filter((r) => closed[`${r}|${d}`]);
          const busy = roomsClosed.length > 0;
          const booking = roomsClosed.map((r) => closed[`${r}|${d}`]).find((c) => c?.bookingId);
          const clickable = houseOnly(d) && !past;
          const key = `house|${d}`;
          const content = busy ? <IconLock size={15} stroke={1.8} className="text-[#A33A3A]" /> : null;
          return (
            <td key={d} className={`${cellBase} ${busy ? "bg-[#F3C7C7]" : colBg(d)} ${past ? "opacity-40" : ""}`}>
              {clickable ? (
                <button
                  type="button"
                  disabled={pending}
                  title={booking ? `${booking.name ?? "Foglalás"} – megnyitás` : busy ? "Lezárva – kattintásra feloldja" : "Szabad – kattintásra lezárja"}
                  onClick={() => run(key, () => toggleHouseAction(d))}
                  className={`flex h-9 w-full cursor-pointer items-center justify-center hover:outline hover:outline-1 hover:outline-[var(--text3)] ${busyKey === key ? "animate-pulse" : ""}`}
                >
                  {content}
                </button>
              ) : booking ? (
                <button
                  type="button"
                  title={`${booking.name ?? "Foglalás"} – megnyitás`}
                  onClick={() => router.push(`/admin/foglalasok/${booking.bookingId}`)}
                  className="flex h-9 w-full cursor-pointer items-center justify-center"
                >
                  {content}
                </button>
              ) : (
                <div className="flex h-9 items-center justify-center" title={busy ? `Foglalt szoba: ${roomsClosed.map((r) => SCOPE_LABEL[r]).join(", ")}` : undefined}>
                  {content}
                </div>
              )}
            </td>
          );
        })}
      </tr>
    );
  }

  const blocks: { scope: Scope; title: string }[] = [
    ...ROOM_SCOPES.map((r) => ({ scope: r as Scope, title: SCOPE_LABEL[r] })),
    { scope: "egesz_haz", title: "Egész ház" },
  ];

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-md border border-[#F09595] bg-[#FCEBEB] px-3 py-2 text-[14px] text-[#B23B3B]">{error}</p>
      )}
      <div className="overflow-x-auto rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)]">
        <table className="border-collapse">
          <thead>
            <tr className="bg-[var(--surface2)]">
              <th className="sticky left-0 z-10 min-w-[190px] bg-[var(--surface2)] px-3 py-2" />
              {days.map((d) => (
                <th
                  key={d}
                  className={`min-w-[58px] border-l-[0.5px] border-[var(--border)] px-1 py-1.5 text-center text-[12px] font-normal ${
                    d === today ? "bg-[var(--accent-bg)] font-semibold text-[var(--text)]" : weekend(d) ? "bg-[#ECE8E1] text-[var(--text)]" : "text-[var(--text2)]"
                  }`}
                >
                  <div className="text-[15px] font-semibold">{Number(d.slice(8))}</div>
                  <div>{WEEKDAYS[dow(d)]}</div>
                </th>
              ))}
            </tr>
          </thead>
          {blocks.map((b) => (
            <tbody key={b.scope}>
              <tr className="border-t border-[var(--border)] bg-[var(--surface2)]">
                <th
                  scope="rowgroup"
                  colSpan={days.length + 1}
                  className="sticky left-0 px-3 py-2 text-left text-[14px] font-semibold text-[var(--text)]"
                >
                  {b.title}
                </th>
              </tr>
              {b.scope === "egesz_haz" ? (
                <>
                  {houseAvailabilityRow()}
                  {priceRow("egesz_haz", "price", "Ár / éj")}
                </>
              ) : (
                <>
                  {availabilityRow(b.scope)}
                  {priceRow(b.scope, "price", "Ár / éj")}
                  {priceRow(b.scope, "extraPersonPrice", "Pótágy / fő")}
                </>
              )}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}
