import { afterEach, describe, expect, it, vi } from "vitest";
import { buildIcs, escapeText, externalUid, foldLine, selectExportEvents, type ExportInput } from "./export";
import { assertSafeUrl, fetchIcs, FeedFetchError, importUrlSchema, isBlockedAddress, type Lookup } from "./fetch";
import { IcsParseError, parseIcs } from "./parse";
import { findConflicts, planReconcile, type StoredBlock } from "./reconcile";
import { syncOneFeed, type SyncDeps } from "./sync-core";

const CRLF = "\r\n";
const cal = (...events: string[][]) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Test//Test//EN", ...events.flatMap((e) => ["BEGIN:VEVENT", ...e, "END:VEVENT"]), "END:VCALENDAR"].join(CRLF);

const HORIZON = { from: "2026-01-01", to: "2028-01-01" };
const NOW = new Date("2026-10-29T10:00:00Z");

// ─── DTEND kizárólagos ──────────────────────────────────────────────────────

describe("DTEND kizárólagos", () => {
  it("3 éjszakás (15–18.) foglalás exportja DTEND:…18", () => {
    const events = selectExportEvents("altalanos", {
      bookings: [{ id: 7, checkIn: "2026-12-15", checkOut: "2026-12-18", source: "weboldal" }],
      manualBlocks: [],
      externalBlocks: [],
      horizon: HORIZON,
    });
    const ics = buildIcs("Teszt szoba", events, NOW);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261215");
    expect(ics).toContain("DTEND;VALUE=DATE:20261218");
  });

  it("importnál a DTEND a távozás napja: 15–18. = 3 éjszaka, a 18. szabad", () => {
    const [e] = parseIcs(cal(["UID:x", "DTSTART;VALUE=DATE:20261215", "DTEND;VALUE=DATE:20261218"]));
    expect(e).toMatchObject({ start: "2026-12-15", end: "2026-12-18" });
  });

  it("hiányzó DTEND esetén 1 éjszaka", () => {
    const [e] = parseIcs(cal(["UID:x", "DTSTART;VALUE=DATE:20261215"]));
    expect(e).toMatchObject({ start: "2026-12-15", end: "2026-12-16" });
  });
});

// ─── DATE / DATE-TIME, időzóna ──────────────────────────────────────────────

describe("DATE és DATE-TIME, időzóna", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it.each(["Europe/Budapest", "UTC", "America/Los_Angeles", "Asia/Tokyo"])(
    "VALUE=DATE a szerver időzónájától függetlenül pontos (%s)",
    (tz) => {
      process.env.TZ = tz;
      const [e] = parseIcs(cal(["UID:x", "DTSTART;VALUE=DATE:20261215", "DTEND;VALUE=DATE:20261218"]));
      expect(e).toMatchObject({ start: "2026-12-15", end: "2026-12-18" });
    },
  );

  it("UTC időpont a budapesti naptári napra kerül (23:30Z = másnap 00:30)", () => {
    const [e] = parseIcs(cal(["UID:x", "DTSTART:20261214T233000Z", "DTEND:20261217T090000Z"]));
    expect(e).toMatchObject({ start: "2026-12-15", end: "2026-12-17" });
  });

  it("TZID=Europe/Budapest időpont, nyári időszámítás váltásakor is", () => {
    const [e] = parseIcs(cal(["UID:x", "DTSTART;TZID=Europe/Budapest:20260328T150000", "DTEND;TZID=Europe/Budapest:20260330T100000"]));
    expect(e).toMatchObject({ start: "2026-03-28", end: "2026-03-30" });
  });

  it("ugyanazon a napon belüli időpontos esemény 1 éjszakát zár", () => {
    const [e] = parseIcs(cal(["UID:x", "DTSTART:20261215T120000Z", "DTEND:20261215T150000Z"]));
    expect(e).toMatchObject({ start: "2026-12-15", end: "2026-12-16" });
  });

  it("a lemondott (STATUS:CANCELLED) esemény nem zárol", () => {
    expect(parseIcs(cal(["UID:x", "STATUS:CANCELLED", "DTSTART;VALUE=DATE:20261215"]))).toHaveLength(0);
  });

  it("nem iCal válasz → hiba (és nem üres lista)", () => {
    expect(() => parseIcs("<html>Bejelentkezés</html>")).toThrow(IcsParseError);
  });
});

// ─── Reconcile ──────────────────────────────────────────────────────────────

describe("reconcile", () => {
  const stored: StoredBlock[] = [
    { id: 1, uid: "a", start: "2026-12-01", end: "2026-12-03", summary: "x" },
    { id: 2, uid: "b", start: "2026-12-10", end: "2026-12-12", summary: "x" },
    { id: 3, uid: "c", start: "2026-12-20", end: "2026-12-22", summary: "x" },
  ];

  it("eltűnt UID → blokk törölve; változott → frissítve; új → beszúrva", () => {
    const plan = planReconcile(stored, [
      { uid: "a", start: "2026-12-01", end: "2026-12-03", summary: "x" },
      { uid: "b", start: "2026-12-10", end: "2026-12-13", summary: "x" },
      { uid: "d", start: "2026-12-24", end: "2026-12-26", summary: "x" },
    ]);
    expect(plan.deleteIds).toEqual([3]);
    expect(plan.updates.map((u) => u.id)).toEqual([2]);
    expect(plan.inserts.map((i) => i.uid)).toEqual(["d"]);
    expect(plan.unchangedIds).toEqual([1]);
  });

  function deps(overrides: Partial<SyncDeps>) {
    const d = {
      fetchText: vi.fn(async () => cal(["UID:a", "DTSTART;VALUE=DATE:20261201", "DTEND;VALUE=DATE:20261203"])),
      loadBlocks: vi.fn(async () => stored),
      applyPlan: vi.fn(async () => {}),
      markSuccess: vi.fn(async () => {}),
      markFailure: vi.fn(async () => 1),
      ...overrides,
    };
    return d;
  }

  it("sikeres lekérésnél a hiányzó UID-ok törlésre kerülnek", async () => {
    const d = deps({});
    const r = await syncOneFeed({ id: 9, importUrl: "https://x.test/a.ics" }, "2026-10-28", d);
    expect(r).toMatchObject({ ok: true, deleted: 2 });
    expect(d.applyPlan).toHaveBeenCalledOnce();
  });

  it("hibás lekérés → SEMMI nem törlődik, csak a hibaszámláló nő", async () => {
    const d = deps({ fetchText: vi.fn(async () => { throw new FeedFetchError("HTTP 500"); }), markFailure: vi.fn(async () => 3) });
    const r = await syncOneFeed({ id: 9, importUrl: "https://x.test/a.ics" }, "2026-10-28", d);
    expect(r).toEqual({ ok: false, feedId: 9, error: "HTTP 500", failCount: 3 });
    expect(d.loadBlocks).not.toHaveBeenCalled();
    expect(d.applyPlan).not.toHaveBeenCalled();
    expect(d.markSuccess).not.toHaveBeenCalled();
  });

  it("hibás parse (pl. bejelentkező oldal jön vissza) → SEMMI nem törlődik", async () => {
    const d = deps({ fetchText: vi.fn(async () => "<html>login</html>") });
    const r = await syncOneFeed({ id: 9, importUrl: "https://x.test/a.ics" }, "2026-10-28", d);
    expect(r.ok).toBe(false);
    expect(d.applyPlan).not.toHaveBeenCalled();
  });
});

// ─── Visszhang ──────────────────────────────────────────────────────────────

describe("visszhang", () => {
  const input: ExportInput = {
    bookings: [
      { id: 1, checkIn: "2026-12-01", checkOut: "2026-12-03", source: "weboldal" },
      { id: 2, checkIn: "2026-12-05", checkOut: "2026-12-07", source: "booking" },
      { id: 3, checkIn: "2026-12-08", checkOut: "2026-12-09", source: "szallas_hu" },
    ],
    manualBlocks: [{ id: 50, date: "2026-12-10" }],
    externalBlocks: [
      { feedId: 11, platform: "booking", uid: "B1", start: "2026-12-12", end: "2026-12-14" },
      { feedId: 12, platform: "szallas", uid: "S1", start: "2026-12-15", end: "2026-12-16" },
    ],
    horizon: HORIZON,
  };
  const uids = (p: Parameters<typeof selectExportEvents>[0]) => selectExportEvents(p, input).map((e) => e.uid);

  it("a booking exportban nincs Booking-ról importált blokk (és Booking-forrású CMS-foglalás sem)", () => {
    const u = uids("booking");
    expect(u).not.toContain(externalUid(11, "B1"));
    expect(u).not.toContain("bn-booking-2@bluenet.hu");
    expect(u).toContain(externalUid(12, "S1")); // hub: Szállás.hu → Booking
    expect(u).toContain("bn-booking-1@bluenet.hu");
    expect(u).toContain("bn-block-50@bluenet.hu");
  });

  it("a szallas exportban nincs Szállás.hu-ról importált blokk, de a Booking-os benne van", () => {
    const u = uids("szallas");
    expect(u).not.toContain(externalUid(12, "S1"));
    expect(u).not.toContain("bn-booking-3@bluenet.hu");
    expect(u).toContain(externalUid(11, "B1"));
  });

  it("az általános feed mindent tartalmaz", () => {
    expect(uids("altalanos")).toHaveLength(6);
  });

  it("a feedben nincs személyes adat: csak Foglalt / Zárolva", () => {
    const ics = buildIcs("Szoba", selectExportEvents("altalanos", input), NOW);
    const summaries = ics.split(CRLF).filter((l) => l.startsWith("SUMMARY:"));
    expect(new Set(summaries)).toEqual(new Set(["SUMMARY:Foglalt", "SUMMARY:Zárolva"]));
  });

  it("a horizonton kívüli esemény nem kerül ki", () => {
    const e = selectExportEvents("altalanos", {
      ...input,
      bookings: [{ id: 99, checkIn: "2025-01-01", checkOut: "2025-01-03", source: "weboldal" }],
      manualBlocks: [],
      externalBlocks: [],
    });
    expect(e).toHaveLength(0);
  });
});

// ─── Export round-trip + formátum ───────────────────────────────────────────

describe("export round-trip", () => {
  it("a generált .ics-t a node-ical hiba nélkül visszaolvassa, a szám és a dátumok egyeznek", () => {
    const events = selectExportEvents("altalanos", {
      bookings: [
        { id: 1, checkIn: "2026-12-15", checkOut: "2026-12-18", source: "weboldal" },
        { id: 2, checkIn: "2027-03-27", checkOut: "2027-03-30", source: "telefon" }, // DST-váltás
      ],
      manualBlocks: [{ id: 5, date: "2026-12-24" }],
      externalBlocks: [{ feedId: 3, platform: "szallas", uid: "abc", start: "2027-01-01", end: "2027-01-04" }],
      horizon: HORIZON,
    });
    const back = parseIcs(buildIcs("Komfort Kétágyas – Viki Vendégház", events, NOW));
    expect(back).toHaveLength(events.length);
    expect(back.map(({ uid, start, end }) => ({ uid, start, end })).sort((a, b) => a.uid.localeCompare(b.uid))).toEqual(
      events.map(({ uid, start, end }) => ({ uid, start, end })).sort((a, b) => a.uid.localeCompare(b.uid)),
    );
  });

  it("RFC 5545: CRLF sorvégek, kötelező fejlécek, DTSTAMP minden eseményben", () => {
    const ics = buildIcs("Szoba", [{ uid: "u@bluenet.hu", start: "2026-12-15", end: "2026-12-18", summary: "Foglalt" }], NOW);
    expect(ics.split(CRLF).every((l) => !l.includes("\n"))).toBe(true);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//BlueNet//BlueNet CMS//HU\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH")).toBe(true);
    expect(ics).toContain("DTSTAMP:20261029T100000Z");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("75 oktetnél hosszabb sor hajtva, ékezetes karakter nem vágódik ketté", () => {
    const line = `X-WR-CALNAME:${escapeText("Árvíztűrő tükörfúrógép – Viki Vendégház, Szilvásvárad; Komfort Franciaágyas szoba")}`;
    const folded = foldLine(line);
    const physical = folded.split(CRLF);
    expect(physical.length).toBeGreaterThan(1);
    for (const p of physical) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75);
    expect(physical.slice(1).every((p) => p.startsWith(" "))).toBe(true);
    expect(physical.map((p, i) => (i ? p.slice(1) : p)).join("")).toBe(line);
  });
});

// ─── Ütközés ────────────────────────────────────────────────────────────────

describe("ütközés-detektálás", () => {
  const blocks = [{ id: 1, start: "2026-12-15", end: "2026-12-18" }];

  it("átfedő élő CMS-foglalás → ütközés, az átfedő időszakkal", () => {
    const c = findConflicts("booking", blocks, [{ id: 7, checkIn: "2026-12-17", checkOut: "2026-12-20", source: "weboldal", status: "elfogadva" }]);
    expect(c).toEqual([{ blockId: 1, bookingId: 7, start: "2026-12-17", end: "2026-12-18" }]);
  });

  it("a távozás napján érkező foglalás nem ütközés", () => {
    expect(findConflicts("booking", blocks, [{ id: 7, checkIn: "2026-12-18", checkOut: "2026-12-20", source: "weboldal", status: "elfogadva" }])).toEqual([]);
  });

  it("lemondott foglalás nem ütközik", () => {
    expect(findConflicts("booking", blocks, [{ id: 7, checkIn: "2026-12-16", checkOut: "2026-12-17", source: "telefon", status: "lemondott" }])).toEqual([]);
  });

  it("az ugyanarról a portálról kézzel rögzített foglalás nem dupla foglalás", () => {
    expect(findConflicts("booking", blocks, [{ id: 7, checkIn: "2026-12-15", checkOut: "2026-12-18", source: "booking", status: "visszaigazolt" }])).toEqual([]);
    expect(findConflicts("szallas", blocks, [{ id: 7, checkIn: "2026-12-15", checkOut: "2026-12-18", source: "booking", status: "visszaigazolt" }])).toHaveLength(1);
  });

  it("a függőben lévő (válaszra váró) kérés is ütközésnek számít", () => {
    expect(findConflicts("szallas", blocks, [{ id: 8, checkIn: "2026-12-16", checkOut: "2026-12-17", source: "weboldal", status: "valaszra_var" }])).toHaveLength(1);
  });
});

// ─── SSRF-védelem ───────────────────────────────────────────────────────────

describe("SSRF-védelem", () => {
  const publicLookup: Lookup = async () => [{ address: "93.184.216.34" }];
  const privateLookup: Lookup = async () => [{ address: "10.1.2.3" }];

  it("http:// elutasítva (mentéskor és lekéréskor is)", async () => {
    expect(importUrlSchema.safeParse("http://admin.booking.com/x.ics").success).toBe(false);
    await expect(assertSafeUrl("http://admin.booking.com/x.ics", publicLookup)).rejects.toThrow(FeedFetchError);
  });

  it("localhost elutasítva", async () => {
    await expect(assertSafeUrl("https://localhost/x.ics", publicLookup)).rejects.toThrow(FeedFetchError);
    await expect(assertSafeUrl("https://valami.localhost/x.ics", publicLookup)).rejects.toThrow(FeedFetchError);
  });

  it.each(["127.0.0.1", "10.0.0.5", "172.16.3.4", "192.168.1.10", "169.254.169.254", "100.64.0.1", "0.0.0.0", "[::1]", "[fd00::1]", "[fe80::1]", "[::ffff:10.0.0.1]", "[::ffff:7f00:1]"])(
    "privát / belső IP elutasítva: %s",
    async (host) => {
      await expect(assertSafeUrl(`https://${host}/x.ics`, publicLookup)).rejects.toThrow(FeedFetchError);
    },
  );

  it("privát IP-re feloldó hostnév elutasítva", async () => {
    await expect(assertSafeUrl("https://belso.pelda.hu/x.ics", privateLookup)).rejects.toThrow(/privát/);
  });

  it("publikus https link elfogadva", async () => {
    await expect(assertSafeUrl("https://admin.booking.com/hotel/ical/x.ics", publicLookup)).resolves.toBeInstanceOf(URL);
    expect(isBlockedAddress("93.184.216.34")).toBe(false);
    expect(isBlockedAddress("2a00:1450:4001:80b::200e")).toBe(false);
  });

  it("privát címre mutató átirányítás elutasítva", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 302, headers: { location: "https://169.254.169.254/latest" } }));
    await expect(fetchIcs("https://pelda.hu/x.ics", { lookup: publicLookup, fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toThrow(/privát/);
  });

  it("legfeljebb 3 átirányítás", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 302, headers: { location: "https://pelda.hu/next" } }));
    await expect(fetchIcs("https://pelda.hu/x.ics", { lookup: publicLookup, fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toThrow(/Túl sok/);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("2 MB fölötti válasz elutasítva", async () => {
    const big = "x".repeat(2 * 1024 * 1024 + 1);
    const fetchImpl = vi.fn(async () => new Response(big, { status: 200 }));
    await expect(fetchIcs("https://pelda.hu/x.ics", { lookup: publicLookup, fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toThrow(/túl nagy/);
  });
});
