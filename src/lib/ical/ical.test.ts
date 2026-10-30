import { afterEach, describe, expect, it, vi } from "vitest";
import { buildIcs, escapeText, externalUid, foldLine, selectExportEvents, type ExportInput } from "./export";
import { assertSafeUrl, fetchIcs, FeedFetchError, importUrlSchema, isBlockedAddress, type Lookup } from "./fetch";
import { IcsParseError, parseIcs } from "./parse";
import { blockClosures, findConflicts, planReconcile, type StoredBlock } from "./reconcile";
import { syncOneFeed, type SyncDeps } from "./sync-core";
import type { ExportPlatform, Unit } from "./types";

const CRLF = "\r\n";
const cal = (...events: string[][]) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Test//Test//EN", ...events.flatMap((e) => ["BEGIN:VEVENT", ...e, "END:VEVENT"]), "END:VCALENDAR"].join(CRLF);

const HORIZON = { from: "2026-01-01", to: "2028-01-01" };
const T = (unit: Unit, platform: ExportPlatform, feedId: number | null = null) => ({ unit, platform, feedId });
const NOW = new Date("2026-10-29T10:00:00Z");

// ─── DTEND kizárólagos ──────────────────────────────────────────────────────

describe("DTEND kizárólagos", () => {
  it("3 éjszakás (15–18.) foglalás exportja DTEND:…18", () => {
    const events = selectExportEvents(T("szoba-1", "altalanos"), {
      bookings: [{ id: 7, checkIn: "2026-12-15", checkOut: "2026-12-18", source: "weboldal", status: "elfogadva", scope: "szoba-1" }],
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

// ─── Visszhang (feed szerint: egység + platform) ────────────────────────────

describe("visszhang – feed szintű kizárás", () => {
  // Import-feedek: 11 = Booking szoba-1, 12 = Szállás.hu szoba-1, 21 = Booking egész ház, 31 = Booking szoba-2
  const input: ExportInput = {
    bookings: [
      { id: 1, checkIn: "2026-12-01", checkOut: "2026-12-03", source: "weboldal", status: "elfogadva", scope: "szoba-1" },
      { id: 2, checkIn: "2026-12-05", checkOut: "2026-12-07", source: "booking", status: "visszaigazolt", scope: "szoba-1" },
      { id: 3, checkIn: "2026-12-08", checkOut: "2026-12-09", source: "szallas_hu", status: "visszaigazolt", scope: "szoba-1" },
      { id: 4, checkIn: "2026-12-20", checkOut: "2026-12-22", source: "weboldal", status: "elfogadva", scope: "szoba-2" },
      { id: 5, checkIn: "2027-01-02", checkOut: "2027-01-05", source: "booking", status: "visszaigazolt", scope: "egesz_haz" },
    ],
    manualBlocks: [
      { id: 50, room: "szoba-1", date: "2026-12-10" },
      { id: 51, room: "szoba-2", date: "2026-12-11" },
    ],
    externalBlocks: [
      { feedId: 11, unit: "szoba-1", uid: "B1", start: "2026-12-12", end: "2026-12-14" },
      { feedId: 12, unit: "szoba-1", uid: "S1", start: "2026-12-15", end: "2026-12-16" },
      { feedId: 21, unit: "egesz_haz", uid: "BH", start: "2027-02-01", end: "2027-02-03" },
      { feedId: 31, unit: "szoba-2", uid: "B2", start: "2026-12-24", end: "2026-12-26" },
    ],
    horizon: HORIZON,
  };
  const uids = (unit: Unit, platform: ExportPlatform, feedId: number | null) =>
    selectExportEvents(T(unit, platform, feedId), input).map((e) => e.uid);

  it("a Booking szoba-1 feedjéből kimarad a Booking szoba-1 blokk és az onnan rögzített CMS-foglalás", () => {
    const u = uids("szoba-1", "booking", 11);
    expect(u).not.toContain(externalUid(11, "B1"));
    expect(u).not.toContain("bn-booking-2@bluenet.hu");
    expect(u).toContain(externalUid(12, "S1")); // hub: Szállás.hu szoba-1 → Booking szoba-1
    expect(u).toContain("bn-booking-1@bluenet.hu");
    expect(u).toContain("bn-booking-3@bluenet.hu");
    expect(u).toContain("bn-block-50@bluenet.hu");
  });

  it("a Booking szoba-1 foglalása BEKERÜL a Booking EGÉSZ HÁZ feedjébe (más feed)", () => {
    const u = uids("egesz_haz", "booking", 21);
    expect(u).toContain(externalUid(11, "B1"));
    expect(u).toContain("bn-booking-2@bluenet.hu"); // a Booking szoba-1-ről rögzített CMS-foglalás is
    expect(u).not.toContain(externalUid(21, "BH")); // a Booking egész ház saját blokkja nem
    expect(u).not.toContain("bn-booking-5@bluenet.hu"); // a Booking egész házról rögzített foglalás sem
  });

  it("az egész ház feedjébe minden szoba foglalása és zárolása bekerül", () => {
    const u = uids("egesz_haz", "szallas", null);
    for (const id of [1, 2, 3, 4, 5]) expect(u).toContain(`bn-booking-${id}@bluenet.hu`);
    expect(u).toContain("bn-block-50@bluenet.hu");
    expect(u).toContain("bn-block-51@bluenet.hu");
    expect(u).toContain(externalUid(31, "B2"));
  });

  it("az egész házas foglalás és blokk minden szoba feedjébe bekerül, a másik szoba blokkja nem", () => {
    const u = uids("szoba-2", "booking", 31);
    expect(u).toContain("bn-booking-5@bluenet.hu");
    expect(u).toContain(externalUid(21, "BH"));
    expect(u).not.toContain(externalUid(11, "B1")); // szoba-1 blokkja nem érinti szoba-2-t
    expect(u).not.toContain("bn-booking-1@bluenet.hu");
  });

  it("egész házas kézi zárolás (mindhárom szoba) a ház feedjében naponta egyszer szerepel", () => {
    const e = selectExportEvents(T("egesz_haz", "altalanos"), {
      ...input,
      bookings: [],
      externalBlocks: [],
      manualBlocks: [
        { id: 60, room: "szoba-1", date: "2026-12-30" },
        { id: 61, room: "szoba-2", date: "2026-12-30" },
        { id: 62, room: "superior", date: "2026-12-30" },
      ],
    });
    expect(e.map((x) => x.uid)).toEqual(["bn-block-60@bluenet.hu"]);
  });

  it("a függőben lévő kérés kikerül, a lemondott nem", () => {
    const e = selectExportEvents(T("szoba-1", "booking", 11), {
      ...input,
      externalBlocks: [],
      manualBlocks: [],
      bookings: [
        { id: 70, checkIn: "2026-12-01", checkOut: "2026-12-02", source: "weboldal", status: "valaszra_var", scope: "szoba-1" },
        { id: 71, checkIn: "2026-12-03", checkOut: "2026-12-04", source: "weboldal", status: "lemondott", scope: "szoba-1" },
      ],
    });
    expect(e.map((x) => x.uid)).toEqual(["bn-booking-70@bluenet.hu"]);
  });

  it("az általános feed mindent tartalmaz, ami az egységet érinti", () => {
    // szoba-1: foglalás 1, 2, 3, 5 (egész ház) + kézi 50 + blokk B1, S1, BH (egész ház)
    expect(uids("szoba-1", "altalanos", null)).toHaveLength(8);
  });

  it("a feedben nincs személyes adat: csak Foglalt / Zárolva", () => {
    const ics = buildIcs("Szoba", selectExportEvents(T("egesz_haz", "altalanos"), input), NOW);
    const summaries = ics.split(CRLF).filter((l) => l.startsWith("SUMMARY:"));
    expect(new Set(summaries)).toEqual(new Set(["SUMMARY:Foglalt", "SUMMARY:Zárolva"]));
  });

  it("a horizonton kívüli esemény nem kerül ki", () => {
    const e = selectExportEvents(T("szoba-1", "altalanos"), {
      ...input,
      bookings: [{ id: 99, checkIn: "2025-01-01", checkOut: "2025-01-03", source: "weboldal", status: "elfogadva", scope: "szoba-1" }],
      manualBlocks: [],
      externalBlocks: [],
    });
    expect(e).toHaveLength(0);
  });
});

// ─── Export round-trip + formátum ───────────────────────────────────────────

describe("export round-trip", () => {
  it("a generált .ics-t a node-ical hiba nélkül visszaolvassa, a szám és a dátumok egyeznek", () => {
    const events = selectExportEvents(T("superior", "altalanos"), {
      bookings: [
        { id: 1, checkIn: "2026-12-15", checkOut: "2026-12-18", source: "weboldal", status: "elfogadva", scope: "superior" },
        { id: 2, checkIn: "2027-03-27", checkOut: "2027-03-30", source: "telefon", status: "visszaigazolt", scope: "egesz_haz" }, // DST-váltás
      ],
      manualBlocks: [{ id: 5, room: "superior", date: "2026-12-24" }],
      externalBlocks: [{ feedId: 3, unit: "superior", uid: "abc", start: "2027-01-01", end: "2027-01-04" }],
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
  const bk = (o: Partial<{ id: number; checkIn: string; checkOut: string; source: string; status: string; scope: string }>) => ({
    id: 7,
    checkIn: "2026-12-17",
    checkOut: "2026-12-20",
    source: "weboldal",
    status: "elfogadva",
    scope: "szoba-1",
    ...o,
  });

  it("átfedő élő CMS-foglalás → ütközés, az átfedő időszakkal", () => {
    expect(findConflicts({ unit: "szoba-1", platform: "booking" }, blocks, [bk({})])).toEqual([
      { blockId: 1, bookingId: 7, start: "2026-12-17", end: "2026-12-18" },
    ]);
  });

  it("a távozás napján érkező foglalás nem ütközés", () => {
    expect(findConflicts({ unit: "szoba-1", platform: "booking" }, blocks, [bk({ checkIn: "2026-12-18" })])).toEqual([]);
  });

  it("lemondott foglalás nem ütközik", () => {
    expect(findConflicts({ unit: "szoba-1", platform: "booking" }, blocks, [bk({ status: "lemondott" })])).toEqual([]);
  });

  it("másik szoba foglalása nem ütközik a szobablokkal", () => {
    expect(findConflicts({ unit: "szoba-1", platform: "booking" }, blocks, [bk({ scope: "szoba-2" })])).toEqual([]);
  });

  it("az egész ház blokkja minden szobás foglalással ütközik, a szobablokk az egész házas foglalással", () => {
    expect(findConflicts({ unit: "egesz_haz", platform: "booking" }, blocks, [bk({ scope: "superior" })])).toHaveLength(1);
    expect(findConflicts({ unit: "szoba-2", platform: "szallas" }, blocks, [bk({ scope: "egesz_haz" })])).toHaveLength(1);
  });

  it("az ugyanabból a hirdetésből kézzel rögzített foglalás nem dupla foglalás – más hirdetésé igen", () => {
    expect(findConflicts({ unit: "szoba-1", platform: "booking" }, blocks, [bk({ source: "booking", status: "visszaigazolt" })])).toEqual([]);
    expect(findConflicts({ unit: "szoba-1", platform: "szallas" }, blocks, [bk({ source: "booking", status: "visszaigazolt" })])).toHaveLength(1);
    // Booking egész ház blokkja × Booking szoba-1-ről rögzített foglalás = valódi dupla foglalás
    expect(findConflicts({ unit: "egesz_haz", platform: "booking" }, blocks, [bk({ source: "booking", status: "visszaigazolt" })])).toHaveLength(1);
  });

  it("a függőben lévő (válaszra váró) kérés is ütközésnek számít", () => {
    expect(findConflicts({ unit: "szoba-1", platform: "szallas" }, blocks, [bk({ status: "valaszra_var" })])).toHaveLength(1);
  });
});

// ─── Import: melyik szobát zárja a blokk ────────────────────────────────────

describe("import-blokk zárolásai", () => {
  const h = { from: "2026-10-28", to: "2028-04-29" };

  it("egész házas blokk → mindhárom szoba zárolva", () => {
    const c = blockClosures("egesz_haz", { start: "2026-12-15", end: "2026-12-17" }, h);
    expect(c).toHaveLength(6);
    expect(new Set(c.map((x) => x.room))).toEqual(new Set(["szoba-1", "szoba-2", "superior"]));
  });

  it("szobablokk → csak az a szoba (az egész ház ettől foglalt)", () => {
    expect(blockClosures("superior", { start: "2026-12-15", end: "2026-12-18" }, h)).toEqual([
      { room: "superior", date: "2026-12-15" },
      { room: "superior", date: "2026-12-16" },
      { room: "superior", date: "2026-12-17" },
    ]);
  });

  it("a horizonton kívüli éjszakák nem záródnak", () => {
    expect(blockClosures("szoba-1", { start: "2026-10-20", end: "2026-10-30" }, h).map((x) => x.date)).toEqual(["2026-10-28", "2026-10-29"]);
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
