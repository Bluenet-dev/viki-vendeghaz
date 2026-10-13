"use client";

// Naptár és árak. Mentés után az oldal nem ugrik: a cellák azonnal (optimistán)
// frissülnek, a szerver nem rendereli újra az oldalt; ha mégis frissíteni kell
// (Több nap beállítása után), a görgetési pozíciót elmentjük és visszaállítjuk.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { IconCheck, IconLock } from "@tabler/icons-react";
import { MAX_GUESTS, ROOM_SCOPES, SCOPE_LABEL, type RoomScope, type Scope } from "@/lib/booking/constants";
import { fmtShort } from "@/lib/booking/dates";
import { setDayPriceAction, toggleClosureAction, toggleHouseAction } from "./actions";
import { DaysPanel, type PanelTariff } from "./days-panel";

export interface DayInfo {
  tariff: { code: string; name: string; color: string } | null;
  label: string | null;
  // open: szobánként foglalható · release: a ház szabadságától és a nyitási naptól függ
  // never: soha · legacyWhole: 2026-os "csak egész ház" nap
  rule: "open" | "release" | "never" | "legacyWhole";
  opensOn: string | null; // ha még nem érte el a nyitási napot
}

type ClosedCell = { bookingId: number | null; name: string | null };
type Closed = Record<string, ClosedCell>;

const WEEKDAYS = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];
const HOUSE_ROWS = [8, 9, 10, 11, 12];
const COL = 64; // oszlopszélesség (px)

const dow = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();
const fmt = (n: number | null | undefined) => (n == null ? "" : n.toLocaleString("hu-HU"));

export function CalendarGrid({
  days,
  today,
  info,
  prices,
  closed,
  nav,
  tariffs,
  defaultRange,
}: {
  days: string[];
  today: string;
  info: Record<string, DayInfo>;
  prices: Record<string, number>;
  closed: Closed;
  nav: { title: string; prevHref: string; nextHref: string; showToday: boolean };
  tariffs: PanelTariff[];
  defaultRange: { from: string; to: string };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Optimista módosítások a szerver válasza előtt / frissítés nélkül
  const [priceOv, setPriceOv] = useState<Record<string, number>>({});
  const [closedOv, setClosedOv] = useState<Record<string, ClosedCell | null>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [cellError, setCellError] = useState<{ key: string; msg: string } | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const committing = useRef(false);

  // Fejléc-kijelölés és a panel
  const [anchor, setAnchor] = useState<string | null>(null);
  const [sel, setSel] = useState<{ from: string; to: string } | null>(null);
  const [panel, setPanel] = useState<{ from: string; to: string } | null>(null);

  // Görgetés
  const scroller = useRef<HTMLDivElement>(null);
  const topBar = useRef<HTMLDivElement>(null);
  const [tableWidth, setTableWidth] = useState(0);
  const restore = useRef<{ y: number; left: number; top: number } | null>(null);

  // Friss szerveradat érkezett: az optimista réteg már benne van, eldobható.
  const [seen, setSeen] = useState({ prices, closed });
  if (seen.prices !== prices || seen.closed !== closed) {
    setSeen({ prices, closed });
    setPriceOv({});
    setClosedOv({});
  }

  // ...és a görgetés visszaáll oda, ahol a frissítés előtt volt.
  useLayoutEffect(() => {
    const r = restore.current;
    if (r && scroller.current) {
      window.scrollTo(0, r.y);
      scroller.current.scrollLeft = r.left;
      scroller.current.scrollTop = r.top;
      restore.current = null;
    }
  }, [prices, closed, info]);

  const refreshKeepingScroll = useCallback(() => {
    const s = scroller.current;
    restore.current = { y: window.scrollY, left: s?.scrollLeft ?? 0, top: s?.scrollTop ?? 0 };
    startTransition(() => router.refresh());
  }, [router]);

  // A felső görgetősáv szélessége kövesse a táblázatot.
  useEffect(() => {
    const s = scroller.current;
    if (!s) return;
    const fit = () => setTableWidth(s.scrollWidth);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(s);
    if (s.firstElementChild) ro.observe(s.firstElementChild);
    return () => ro.disconnect();
  }, []);

  const syncing = useRef(false);
  function syncFrom(src: "top" | "table") {
    if (syncing.current) return;
    syncing.current = true;
    const a = src === "top" ? topBar.current : scroller.current;
    const b = src === "top" ? scroller.current : topBar.current;
    if (a && b) b.scrollLeft = a.scrollLeft;
    requestAnimationFrame(() => (syncing.current = false));
  }

  function scrollWeek(dir: 1 | -1) {
    scroller.current?.scrollBy({ left: dir * 7 * COL, behavior: "smooth" });
  }

  // ─── Adatok az optimista réteggel ─────────────────────────────────────────
  const priceOf = (key: string) => (key in priceOv ? priceOv[key] : prices[key]);
  const closedOf = (key: string): ClosedCell | undefined => (key in closedOv ? closedOv[key] ?? undefined : closed[key]);
  const houseFree = (d: string) => ROOM_SCOPES.every((r) => !closedOf(`${r}|${d}`));
  // Szobánként foglalható-e a nap (a "nyíló" napoknál a ház szabadságától is függ)
  const roomMode = (d: string): "open" | "release" | "never" | "legacyWhole" => {
    const di = info[d];
    if (!di) return "open";
    if (di.rule === "release") return !di.opensOn && houseFree(d) ? "open" : "release";
    return di.rule;
  };

  const weekend = (d: string) => dow(d) === 0 || dow(d) === 6;
  const colBg = (d: string) => (d === today ? "bg-[var(--accent-bg)]" : weekend(d) ? "bg-[#F4F1EC]" : "");
  const inSel = (d: string) => !!sel && d >= sel.from && d <= sel.to;

  function markSaved(keys: string[]) {
    setSaved((s) => new Set([...s, ...keys]));
    setTimeout(() => setSaved((s) => new Set([...s].filter((k) => !keys.includes(k)))), 1500);
  }

  function showCellError(key: string, msg: string) {
    setCellError({ key, msg });
    setTimeout(() => setCellError((e) => (e?.key === key ? null : e)), 2500);
  }

  // ─── Ár szerkesztése: Enter, Tab (következő cella), kattintás máshova; Escape visszavon ───
  function startEdit(key: string) {
    const v = priceOf(key);
    setEditing(key);
    setDraft(v == null ? "" : String(v));
    setCellError(null);
  }

  function nextKey(key: string, dir: 1 | -1): string | null {
    const [scope, date, guests] = key.split("|");
    const i = days.indexOf(date);
    for (let j = i + dir; j >= 0 && j < days.length; j += dir) {
      if (days[j] >= today) return `${scope}|${days[j]}|${guests}`;
    }
    return null;
  }

  function commit(key: string, move: 1 | -1 | 0) {
    if (committing.current) return;
    committing.current = true;
    setTimeout(() => (committing.current = false), 0);
    const [scope, date, g] = key.split("|");
    const guests = Number(g);
    const before = priceOf(key);
    const clean = draft.replace(/\s|ft/gi, "");
    const go = () => {
      const n = move ? nextKey(key, move) : null;
      if (n) startEdit(n);
      else setEditing(null);
    };

    if (clean === "" || (before != null && Number(clean) === before && /^\d+$/.test(clean))) {
      go(); // nem változott – nincs mentés
      return;
    }
    if (!/^\d{1,7}$/.test(clean)) {
      setEditing(null); // visszaáll az előző érték
      showCellError(key, "Csak számot írjon be");
      return;
    }
    const value = Number(clean);
    setPriceOv((o) => ({ ...o, [key]: value }));
    go();
    startTransition(async () => {
      const res = await setDayPriceAction(scope as Scope, date, guests, clean).catch(() => ({ error: "Nem sikerült menteni." }) as { error?: string });
      if (res.error) {
        setPriceOv((o) => {
          const c = { ...o };
          if (before == null) delete c[key];
          else c[key] = before;
          return c;
        });
        showCellError(key, res.error);
        return;
      }
      markSaved([key]);
    });
  }

  // ─── Lezárás / feloldás ───────────────────────────────────────────────────
  function toggleRoom(room: RoomScope, d: string) {
    const key = `${room}|${d}`;
    const c = closedOf(key);
    if (c?.bookingId) {
      router.push(`/admin/foglalasok/${c.bookingId}`);
      return;
    }
    setError(null);
    setClosedOv((o) => ({ ...o, [key]: c ? null : { bookingId: null, name: null } }));
    startTransition(async () => {
      try {
        const res = await toggleClosureAction(room, d);
        if (res.bookingId) {
          router.push(`/admin/foglalasok/${res.bookingId}`);
          return;
        }
        markSaved([key]);
      } catch (e) {
        setClosedOv((o) => ({ ...o, [key]: c ?? null }));
        setError(e instanceof Error ? e.message : "Nem sikerült menteni.");
      }
    });
  }

  function toggleHouse(d: string) {
    const keys = ROOM_SCOPES.map((r) => `${r}|${d}`);
    const booking = keys.map(closedOf).find((c) => c?.bookingId);
    if (booking?.bookingId) {
      router.push(`/admin/foglalasok/${booking.bookingId}`);
      return;
    }
    const allClosed = keys.every((k) => closedOf(k));
    const prev = Object.fromEntries(keys.map((k) => [k, closedOf(k) ?? null]));
    setError(null);
    setClosedOv((o) => ({ ...o, ...Object.fromEntries(keys.map((k) => [k, allClosed ? null : { bookingId: null, name: null }])) }));
    startTransition(async () => {
      try {
        const res = await toggleHouseAction(d);
        if (res.bookingId) {
          router.push(`/admin/foglalasok/${res.bookingId}`);
          return;
        }
        markSaved([`house|${d}`]);
      } catch (e) {
        setClosedOv((o) => ({ ...o, ...prev }));
        setError(e instanceof Error ? e.message : "Nem sikerült menteni.");
      }
    });
  }

  // ─── Fejléc-kijelölés: kattintás = egy nap, Shift+kattintás = tartomány ───
  function selectDay(d: string, shift: boolean) {
    if (d < today) return;
    if (shift && anchor) {
      const [a, b] = anchor < d ? [anchor, d] : [d, anchor];
      setSel({ from: a, to: b });
    } else if (sel && sel.from === d && sel.to === d) {
      setSel(null);
      setAnchor(null);
    } else {
      setAnchor(d);
      setSel({ from: d, to: d });
    }
  }
  const selCount = sel ? days.filter((d) => d >= sel.from && d <= sel.to && d >= today).length : 0;

  function onPanelSaved(message: string, keys: string[]) {
    setPanel(null);
    setSel(null);
    setAnchor(null);
    setNotice(message);
    setTimeout(() => setNotice(null), 6000);
    setFlash(new Set(keys));
    setTimeout(() => setFlash(new Set()), 3000);
    refreshKeepingScroll();
  }

  // ─── Cellák ───────────────────────────────────────────────────────────────
  const labelCell =
    "sticky left-0 z-10 whitespace-nowrap border-r-[0.5px] border-t-[0.5px] border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-[13px] font-normal text-[var(--text2)]";
  const cellBase = "relative h-9 w-[64px] min-w-[64px] border-l-[0.5px] border-t-[0.5px] border-[var(--border)] p-0 text-center text-[13px] transition-colors duration-700";
  const flashBg = (key: string) => (flash.has(key) ? "!bg-[#FFF1A8]" : "");

  const check = (k: string) =>
    saved.has(k) ? <IconCheck size={13} stroke={2.6} className="pointer-events-none absolute right-0.5 top-0.5 text-[#3A7A3C]" aria-label="Elmentve" /> : null;

  function availabilityRow(room: RoomScope) {
    return (
      <tr>
        <th scope="row" className={labelCell}>Szabad / foglalt</th>
        {days.map((d) => {
          const key = `${room}|${d}`;
          const past = d < today;
          const c = closedOf(key);
          const mode = roomMode(d);
          const di = info[d];
          const grey = !c && (mode === "release" || mode === "never");
          const legacy = !c && mode === "legacyWhole";
          const title = c?.bookingId
            ? `${c.name ?? "Foglalás"}: megnyitás`
            : c
              ? "Lezárva. Kattintásra feloldja."
              : mode === "never"
                ? "Szobánként nem foglalható (csak egész ház). Kattintásra lezárja."
                : mode === "release"
                  ? `${di?.opensOn ? `Szobánként ${fmtShort(di.opensOn)} nyílik` : "Csak akkor nyílik, ha az egész ház szabad"}. Kattintásra lezárja.`
                  : `${legacy ? "Csak egész ház. " : ""}Szabad. Kattintásra lezárja.`;
          return (
            <td key={d} className={`${cellBase} ${c ? "bg-[#F3C7C7]" : grey || legacy ? "bg-[var(--surface2)]" : colBg(d)} ${flashBg(key)} ${past ? "opacity-40" : ""}`}>
              <button
                type="button"
                disabled={past}
                title={past ? undefined : title}
                aria-label={`${d}: ${c ? "foglalt" : grey ? "szobánként még nem foglalható" : "szabad"}`}
                onClick={() => toggleRoom(room, d)}
                className={`flex h-9 w-full flex-col items-center justify-center leading-none ${past ? "cursor-default" : "cursor-pointer hover:outline hover:outline-1 hover:outline-[var(--text3)]"}`}
              >
                {c && <IconLock size={15} stroke={1.8} className="text-[#A33A3A]" />}
                {grey && (
                  <>
                    <IconLock size={13} stroke={1.8} className="text-[var(--text3)]" />
                    {di?.opensOn && <span className="mt-0.5 text-[10px] text-[var(--text2)]">nyílik: {fmtShort(di.opensOn)}</span>}
                  </>
                )}
              </button>
              {check(key)}
            </td>
          );
        })}
      </tr>
    );
  }

  function priceRow(scope: Scope, guests: number, label: string) {
    return (
      <tr key={`${scope}-${guests}`}>
        <th scope="row" className={labelCell}>{label}</th>
        {days.map((d) => {
          const key = `${scope}|${d}|${guests}`;
          const past = d < today;
          const value = priceOf(key);
          const shaded = scope !== "egesz_haz" && roomMode(d) !== "open";
          const err = cellError?.key === key ? cellError.msg : null;
          if (editing === key) {
            return (
              <td key={d} className={`${cellBase} bg-white`}>
                <input
                  autoFocus
                  onFocus={(e) => e.currentTarget.select()}
                  inputMode="numeric"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commit(key, 0);
                    } else if (e.key === "Tab") {
                      e.preventDefault();
                      commit(key, e.shiftKey ? -1 : 1);
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      committing.current = true; // a blur ne mentsen
                      setTimeout(() => (committing.current = false), 0);
                      setEditing(null);
                    }
                  }}
                  onBlur={() => commit(key, 0)}
                  className="h-9 w-full border-2 border-[var(--accent)] bg-white px-1 text-center text-[13px] outline-none"
                  aria-label={`${SCOPE_LABEL[scope]} ${label} ${d}`}
                />
              </td>
            );
          }
          return (
            <td
              key={d}
              className={`${cellBase} ${shaded ? "bg-[var(--surface2)]" : colBg(d)} ${flashBg(key)} ${past ? "opacity-40" : ""} ${err ? "outline outline-2 -outline-offset-2 outline-[#C0392B]" : ""}`}
            >
              <button
                type="button"
                disabled={past}
                onClick={() => startEdit(key)}
                className={`h-9 w-full px-1 text-[var(--text)] ${past ? "cursor-default" : "cursor-text hover:bg-white hover:outline hover:outline-1 hover:outline-[var(--text3)]"}`}
              >
                {fmt(value)}
              </button>
              {check(key)}
              {err && (
                <span className="absolute left-1/2 top-full z-30 mt-0.5 -translate-x-1/2 whitespace-nowrap rounded bg-[#C0392B] px-2 py-1 text-[12px] text-white shadow">
                  {err}
                </span>
              )}
            </td>
          );
        })}
      </tr>
    );
  }

  // Egész ház: automatikus; szobánként nem foglalható napon kattintással mindhárom szoba lezárható.
  function houseAvailabilityRow() {
    return (
      <tr>
        <th scope="row" className={labelCell}>
          Szabad / foglalt <span className="text-[var(--text3)]">· automatikus</span>
        </th>
        {days.map((d) => {
          const past = d < today;
          const roomsClosed = ROOM_SCOPES.filter((r) => closedOf(`${r}|${d}`));
          const busy = roomsClosed.length > 0;
          const booking = roomsClosed.map((r) => closedOf(`${r}|${d}`)).find((c) => c?.bookingId);
          const clickable = roomMode(d) !== "open" && !past;
          const key = `house|${d}`;
          const content = busy ? <IconLock size={15} stroke={1.8} className="text-[#A33A3A]" /> : null;
          return (
            <td key={d} className={`${cellBase} ${busy ? "bg-[#F3C7C7]" : colBg(d)} ${flashBg(key)} ${past ? "opacity-40" : ""}`}>
              {clickable || booking ? (
                <button
                  type="button"
                  title={booking ? `${booking.name ?? "Foglalás"}: megnyitás` : busy ? "Lezárva. Kattintásra feloldja." : "Szabad. Kattintásra lezárja."}
                  onClick={() => toggleHouse(d)}
                  className="flex h-9 w-full cursor-pointer items-center justify-center hover:outline hover:outline-1 hover:outline-[var(--text3)]"
                >
                  {content}
                </button>
              ) : (
                <div className="flex h-9 items-center justify-center" title={busy ? `Foglalt szoba: ${roomsClosed.map((r) => SCOPE_LABEL[r]).join(", ")}` : undefined}>
                  {content}
                </div>
              )}
              {check(key)}
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

  const navBtn = "rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[14px] text-[var(--text)] hover:border-[var(--text3)]";

  return (
    <div>
      {/* Eszköztár: hónap, hét léptetés, Több nap beállítása – görgetéskor is látszik */}
      <div className="sticky top-0 z-30 -mx-2 bg-[var(--bg)] px-2 pb-2 pt-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Link href={nav.prevHref} aria-label="Előző hónap" className={navBtn}>←</Link>
          <h2 className="whitespace-nowrap px-1 text-center text-[17px] font-semibold capitalize text-[var(--text)] sm:min-w-40">{nav.title}</h2>
          <Link href={nav.nextHref} aria-label="Következő hónap" className={navBtn}>→</Link>
          <button type="button" onClick={() => scrollWeek(-1)} className={`${navBtn} ml-2 font-medium`}>◀ Korábbi napok</button>
          <button type="button" onClick={() => scrollWeek(1)} className={`${navBtn} font-medium`}>Későbbi napok ▶</button>
          {nav.showToday && (
            <Link href="/admin/naptar" className="ml-1 text-[14px] text-[var(--accent)] hover:underline">Vissza a mai naphoz</Link>
          )}
          <button
            type="button"
            onClick={() => setPanel(sel ?? defaultRange)}
            className="ml-auto rounded-md bg-[var(--nav-bg)] px-4 py-2 text-[14px] font-semibold text-white hover:opacity-90"
          >
            Több nap beállítása
          </button>
        </div>
        {notice && <p className="mb-2 rounded-md bg-[var(--accent-bg)] px-3 py-2 text-[14px] text-[#3A5A3C]">{notice}</p>}
        {error && <p className="mb-2 rounded-md border border-[#F09595] bg-[#FCEBEB] px-3 py-2 text-[14px] text-[#B23B3B]">{error}</p>}
        {/* Felső vízszintes görgetősáv, szinkronban az alsóval */}
        <div
          ref={topBar}
          onScroll={() => syncFrom("top")}
          aria-hidden="true"
          className="overflow-x-auto overflow-y-hidden rounded-t-md"
          style={{ height: 14 }}
        >
          <div style={{ width: tableWidth, height: 1 }} />
        </div>
      </div>

      <div
        ref={scroller}
        onScroll={() => syncFrom("table")}
        className="max-h-[calc(100vh-190px)] min-h-[320px] overflow-auto rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)]"
      >
        <table className="border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 min-w-[190px] border-b-[0.5px] border-r-[0.5px] border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-left align-bottom text-[11px] font-normal leading-tight text-[var(--text3)]">
                Kattintson egy napra, Shift+kattintással több napot jelölhet ki.
              </th>
              {days.map((d) => {
                const di = info[d];
                const past = d < today;
                const selected = inSel(d);
                return (
                  <th
                    key={d}
                    className={`sticky top-0 z-20 min-w-[64px] border-b-[0.5px] border-l-[0.5px] border-[var(--border)] p-0 align-top text-center text-[12px] font-normal ${
                      selected
                        ? "bg-[#CFE0F3] text-[var(--text)]"
                        : d === today
                          ? "bg-[var(--accent-bg)] font-semibold text-[var(--text)]"
                          : weekend(d)
                            ? "bg-[#ECE8E1] text-[var(--text)]"
                            : "bg-[var(--surface2)] text-[var(--text2)]"
                    }`}
                  >
                    <button
                      type="button"
                      disabled={past}
                      onClick={(e) => selectDay(d, e.shiftKey)}
                      title={past ? undefined : "Kijelölés (Shift+kattintás: tartomány)"}
                      aria-pressed={selected}
                      className={`w-full px-1 py-1.5 ${past ? "cursor-default" : "cursor-pointer hover:bg-black/5"} ${selected ? "ring-2 ring-inset ring-[#5B8BC5]" : ""}`}
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
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          {blocks.map((b) => (
            <tbody key={b.scope}>
              <tr className="bg-[var(--surface2)]">
                {/* A cím a rögzített bal oszlopban: vízszintes görgetésnél is látszik. */}
                <th
                  scope="rowgroup"
                  className="sticky left-0 z-10 whitespace-nowrap border-r-[0.5px] border-t border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-left text-[14px] font-semibold text-[var(--text)]"
                >
                  {b.title}
                </th>
                <td colSpan={days.length} aria-hidden="true" className="border-t border-[var(--border)]" />
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

      {/* Kijelölés után lebegő gomb */}
      {sel && selCount > 0 && !panel && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[var(--nav-bg)] py-1.5 pl-5 pr-1.5 shadow-xl">
          <button type="button" onClick={() => setPanel(sel)} className="text-[15px] font-semibold text-white">
            Kijelölt {selCount} nap beállítása
          </button>
          <button
            type="button"
            onClick={() => {
              setSel(null);
              setAnchor(null);
            }}
            aria-label="Kijelölés törlése"
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-[18px] text-white hover:bg-white/25"
          >
            ×
          </button>
        </div>
      )}

      {panel && (
        <DaysPanel
          from={panel.from}
          to={panel.to}
          today={today}
          tariffs={tariffs}
          onClose={() => setPanel(null)}
          onSaved={onPanelSaved}
        />
      )}
    </div>
  );
}
