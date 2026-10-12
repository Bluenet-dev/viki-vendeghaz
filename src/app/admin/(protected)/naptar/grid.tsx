"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { IconLock } from "@tabler/icons-react";
import { MAX_GUESTS, ROOM_SCOPES, SCOPE_LABEL, type RoomScope, type Scope } from "@/lib/booking/constants";
import { fmtShort } from "@/lib/booking/dates";
import { setDayPriceAction, toggleClosureAction, toggleHouseAction } from "./actions";

export interface DayInfo {
  tariff: { code: string; name: string; color: string } | null;
  label: string | null;
  // open: szobánként foglalható · release: még nem nyílt (lásd opensOn) · never: soha
  // legacyWhole: 2026-os "csak egész ház" nap
  mode: "open" | "release" | "never" | "legacyWhole";
  opensOn: string | null;
}

type Closed = Record<string, { bookingId: number | null; name: string | null }>;

const WEEKDAYS = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];
const HOUSE_ROWS = [8, 9, 10, 11, 12];

function dow(iso: string) {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

function fmt(n: number | null | undefined) {
  return n == null ? "" : n.toLocaleString("hu-HU");
}

export function CalendarGrid({
  days,
  today,
  info,
  prices,
  closed,
}: {
  days: string[];
  today: string;
  info: Record<string, DayInfo>;
  prices: Record<string, number>;
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
  const roomsBlocked = (d: string) => info[d]?.mode !== "open";

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

  function saveEdit(scope: Scope, date: string, guests: number) {
    const key = editing;
    if (!key) return;
    setBusyKey(key);
    startTransition(async () => {
      const res = await setDayPriceAction(scope, date, guests, draft);
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
  const cellBase = "h-9 min-w-[62px] border-l-[0.5px] border-[var(--border)] p-0 text-center text-[13px]";

  // Szoba szabad/foglalt cellája. A lezárás (piros lakat) mindig elsőbbséget élvez;
  // "még nem nyílt" / "soha" napon szürke lakat, de kattintással ugyanúgy lezárható.
  function availabilityRow(room: RoomScope) {
    return (
      <tr className="border-t-[0.5px] border-[var(--border)]">
        <th scope="row" className={labelCell}>Szabad / foglalt</th>
        {days.map((d) => {
          const key = `${room}|${d}`;
          const past = d < today;
          const c = closed[key];
          const di = info[d];
          const grey = !c && (di?.mode === "release" || di?.mode === "never");
          const legacy = !c && di?.mode === "legacyWhole";
          const title = c?.bookingId
            ? `${c.name ?? "Foglalás"} – megnyitás`
            : c
              ? "Lezárva – kattintásra feloldja"
              : di?.mode === "never"
                ? "Szobánként nem foglalható (csak egész ház) – kattintásra lezárja"
                : di?.mode === "release"
                  ? `${di.opensOn ? `Szobánként ${fmtShort(di.opensOn)} nyílik` : "Csak akkor nyílik, ha az egész ház szabad"} – kattintásra lezárja`
                  : `${legacy ? "Csak egész ház · " : ""}Szabad – kattintásra lezárja`;
          return (
            <td key={d} className={`${cellBase} ${c ? "bg-[#F3C7C7]" : grey || legacy ? "bg-[var(--surface2)]" : colBg(d)} ${past ? "opacity-40" : ""}`}>
              <button
                type="button"
                disabled={past || pending}
                title={past ? undefined : title}
                aria-label={`${d}: ${c ? "foglalt" : grey ? "szobánként még nem foglalható" : "szabad"}`}
                onClick={() => run(key, () => toggleClosureAction(room, d))}
                className={`flex h-9 w-full flex-col items-center justify-center leading-none ${past ? "cursor-default" : "cursor-pointer hover:outline hover:outline-1 hover:outline-[var(--text3)]"} ${busyKey === key ? "animate-pulse" : ""}`}
              >
                {c && <IconLock size={15} stroke={1.8} className="text-[#A33A3A]" />}
                {grey && (
                  <>
                    <IconLock size={13} stroke={1.8} className="text-[var(--text3)]" />
                    {di?.opensOn && <span className="mt-0.5 text-[10px] text-[var(--text2)]">nyílik: {fmtShort(di.opensOn)}</span>}
                  </>
                )}
              </button>
            </td>
          );
        })}
      </tr>
    );
  }

  function priceRow(scope: Scope, guests: number, label: string) {
    return (
      <tr key={`${scope}-${guests}`} className="border-t-[0.5px] border-[var(--border)]">
        <th scope="row" className={labelCell}>{label}</th>
        {days.map((d) => {
          const key = `${scope}|${d}|${guests}`;
          const past = d < today;
          const value = prices[key];
          const shaded = scope !== "egesz_haz" && roomsBlocked(d);
          if (editing === key) {
            return (
              <td key={d} className={`${cellBase} bg-white`}>
                <input
                  autoFocus
                  inputMode="numeric"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(scope, d, guests);
                    if (e.key === "Escape") setEditing(null);
                  }}
                  onBlur={() => {
                    if (busyKey !== key) setEditing(null);
                  }}
                  className={`h-9 w-[68px] border-2 border-[var(--accent)] bg-white px-1 text-center text-[13px] outline-none ${busyKey === key ? "opacity-50" : ""}`}
                  aria-label={`${SCOPE_LABEL[scope]} ${label} ${d}`}
                />
              </td>
            );
          }
          return (
            <td key={d} className={`${cellBase} ${shaded ? "bg-[var(--surface2)]" : colBg(d)} ${past ? "opacity-40" : ""}`}>
              <button
                type="button"
                disabled={past}
                onClick={() => {
                  setEditing(key);
                  setDraft(value == null ? "" : String(value));
                  setError(null);
                }}
                className={`h-9 w-full px-1 text-[var(--text)] ${past ? "cursor-default" : "cursor-text hover:bg-white hover:outline hover:outline-1 hover:outline-[var(--text3)]"}`}
              >
                {fmt(value)}
              </button>
            </td>
          );
        })}
      </tr>
    );
  }

  // Egész ház: automatikus; szobánként nem foglalható napon kattintással mindhárom szoba lezárható.
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
          const clickable = roomsBlocked(d) && !past;
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
              <th className="sticky left-0 z-10 min-w-[190px] border-r-[0.5px] border-[var(--border)] bg-[var(--surface2)] px-3 py-2" />
              {days.map((d) => {
                const di = info[d];
                return (
                  <th
                    key={d}
                    className={`min-w-[62px] border-l-[0.5px] border-[var(--border)] px-1 py-1.5 align-top text-center text-[12px] font-normal ${
                      d === today ? "bg-[var(--accent-bg)] font-semibold text-[var(--text)]" : weekend(d) ? "bg-[#ECE8E1] text-[var(--text)]" : "text-[var(--text2)]"
                    }`}
                  >
                    <div className="text-[15px] font-semibold">{Number(d.slice(8))}</div>
                    <div>{WEEKDAYS[dow(d)]}</div>
                    {di?.tariff && (
                      <div
                        title={di.tariff.name}
                        className="mx-auto mt-1 inline-flex h-5 w-5 items-center justify-center rounded text-[12px] font-bold text-[var(--text)]"
                        style={{ backgroundColor: di.tariff.color }}
                      >
                        {di.tariff.code}
                      </div>
                    )}
                    {di?.label && (
                      <div title={di.label} className="mx-auto mt-0.5 max-w-[58px] truncate text-[10px] leading-tight text-[var(--text2)]">
                        {di.label}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          {blocks.map((b) => (
            <tbody key={b.scope}>
              <tr className="border-t border-[var(--border)] bg-[var(--surface2)]">
                {/* A cím a rögzített bal oszlopban: vízszintes görgetésnél is látszik. */}
                <th
                  scope="rowgroup"
                  className="sticky left-0 z-10 whitespace-nowrap border-r-[0.5px] border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-left text-[14px] font-semibold text-[var(--text)]"
                >
                  {b.title}
                </th>
                <td colSpan={days.length} aria-hidden="true" />
              </tr>
              {b.scope === "egesz_haz" ? (
                <>
                  {houseAvailabilityRow()}
                  {HOUSE_ROWS.map((g) => priceRow("egesz_haz", g, g === 8 ? "1–8 fő" : `${g} fő`))}
                </>
              ) : (
                <>
                  {availabilityRow(b.scope as RoomScope)}
                  {Array.from({ length: MAX_GUESTS[b.scope] }, (_, i) => i + 1).map((g) => priceRow(b.scope, g, `${g} fő`))}
                </>
              )}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}
