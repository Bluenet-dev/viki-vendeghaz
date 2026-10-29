// Portál-feed biztonságos lekérése (SSRF-védelem).
//  – csak https, 10 s időkorlát (a foglalás előtti friss ellenőrzésnél 5 s), max. 2 MB
//  – a host minden feloldott címe publikus kell legyen (belső / privát IP tiltva)
//  – átirányítás legfeljebb 3, minden lépésnél újraellenőrizve
// Ismert maradék kockázat: DNS-rebinding a feloldás és a kapcsolódás között. A
// feedek tulajdonosi (admin) beállításból jönnek, ezért ezt elfogadhatónak tartjuk.

import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { z } from "zod";

export class FeedFetchError extends Error {}

export const MAX_BYTES = 2 * 1024 * 1024;
export const DEFAULT_TIMEOUT_MS = 10_000;
export const MAX_REDIRECTS = 3;

// Mentéskor: az import URL csak https lehet.
export const importUrlSchema = z
  .string()
  .trim()
  .min(1, "Adja meg az iCal linket.")
  .max(2048, "A link túl hosszú.")
  .refine((v) => {
    try {
      return new URL(v).protocol === "https:";
    } catch {
      return false;
    }
  }, "Érvényes, https:// kezdetű iCal link szükséges.");

// ─── IP-tartományok ─────────────────────────────────────────────────────────

function v4ToInt(ip: string): number {
  return ip.split(".").reduce((n, o) => (n << 8) + Number(o), 0) >>> 0;
}

const V4_BLOCKED: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function v4Blocked(ip: string): boolean {
  const n = v4ToInt(ip);
  return V4_BLOCKED.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (v4ToInt(base) & mask);
  });
}

function expandV6(ip: string): number[] | null {
  let s = ip.toLowerCase();
  const zone = s.indexOf("%");
  if (zone !== -1) s = s.slice(0, zone);
  // Beágyazott IPv4 (pl. ::ffff:10.0.0.1) → két 16 bites csoport.
  const v4 = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const n = v4ToInt(v4[1]);
    s = s.slice(0, -v4[1].length) + ((n >>> 16) & 0xffff).toString(16) + ":" + (n & 0xffff).toString(16);
  }
  const [head, tail] = s.split("::");
  const h = head ? head.split(":") : [];
  const t = tail !== undefined ? (tail ? tail.split(":") : []) : null;
  const groups = t === null ? h : [...h, ...Array(8 - h.length - t.length).fill("0"), ...t];
  if (groups.length !== 8) return null;
  return groups.map((g) => parseInt(g || "0", 16));
}

function v6Blocked(ip: string): boolean {
  const g = expandV6(ip);
  if (!g) return true;
  const embeddedV4 = () => `${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`;
  if (g.every((x) => x === 0)) return true; // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; // ::1
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return v4Blocked(embeddedV4()); // ::ffff:a.b.c.d
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return v4Blocked(embeddedV4()); // NAT64
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 (ULA)
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 (link-local)
  if ((g[0] & 0xff00) === 0xff00) return true; // ff00::/8 (multicast)
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // dokumentációs
  return false;
}

export function isBlockedAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return v4Blocked(ip);
  if (v === 6) return v6Blocked(ip);
  return true;
}

// ─── URL-ellenőrzés ─────────────────────────────────────────────────────────

export type Lookup = (host: string) => Promise<{ address: string }[]>;

const defaultLookup: Lookup = (host) => dnsLookup(host, { all: true, verbatim: true });

export async function assertSafeUrl(raw: string, lookup: Lookup = defaultLookup): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FeedFetchError("Érvénytelen link.");
  }
  if (url.protocol !== "https:") throw new FeedFetchError("Csak https:// link használható.");
  if (url.username || url.password) throw new FeedFetchError("A link nem tartalmazhat felhasználónevet vagy jelszót.");

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || /\.(localhost|local|internal|lan|home\.arpa)$/.test(host)) {
    throw new FeedFetchError("Belső címre mutató link nem engedélyezett.");
  }
  if (isIP(host)) {
    if (isBlockedAddress(host)) throw new FeedFetchError("Belső vagy privát IP-címre mutató link nem engedélyezett.");
    return url;
  }
  let addrs: { address: string }[];
  try {
    addrs = await lookup(host);
  } catch {
    throw new FeedFetchError("A link címe nem oldható fel.");
  }
  if (!addrs.length || addrs.some((a) => isBlockedAddress(a.address))) {
    throw new FeedFetchError("A link belső vagy privát IP-címre mutat – nem engedélyezett.");
  }
  return url;
}

// ─── Lekérés ────────────────────────────────────────────────────────────────

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  const len = Number(res.headers.get("content-length"));
  if (Number.isFinite(len) && len > maxBytes) throw new FeedFetchError("A naptár túl nagy (2 MB fölött).");
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new FeedFetchError("A naptár túl nagy (2 MB fölött).");
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.byteLength;
  }
  return new TextDecoder("utf-8").decode(buf);
}

export interface FetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  lookup?: Lookup;
  fetchImpl?: typeof fetch;
}

export async function fetchIcs(rawUrl: string, opts: FetchOptions = {}): Promise<string> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, maxBytes = MAX_BYTES, lookup = defaultLookup, fetchImpl = fetch } = opts;
  const signal = AbortSignal.timeout(timeoutMs);
  let current = rawUrl;

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const url = await assertSafeUrl(current, lookup);
      const res = await fetchImpl(url, {
        redirect: "manual",
        signal,
        cache: "no-store",
        headers: { "User-Agent": "BlueNet-CMS-iCal/1.0", Accept: "text/calendar, text/plain;q=0.9, */*;q=0.5" },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) throw new FeedFetchError(`Átirányítás cél nélkül (HTTP ${res.status}).`);
        current = new URL(loc, url).toString();
        continue;
      }
      if (!res.ok) throw new FeedFetchError(`A portál hibát adott (HTTP ${res.status}).`);
      return await readCapped(res, maxBytes);
    }
    throw new FeedFetchError("Túl sok átirányítás (3 fölött).");
  } catch (e) {
    if (e instanceof FeedFetchError) throw e;
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
      throw new FeedFetchError(`Időtúllépés (${Math.round(timeoutMs / 1000)} s).`);
    }
    throw new FeedFetchError(`A naptár nem kérhető le: ${e instanceof Error ? e.message : String(e)}`);
  }
}
