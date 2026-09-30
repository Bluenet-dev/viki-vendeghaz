// Közös konstansok és címkék – kliens- és szerveroldalon is importálható (nincs DB-függés).

export const ROOM_SCOPES = ["szoba-1", "szoba-2", "superior"] as const;
export const ALL_SCOPES = [...ROOM_SCOPES, "egesz_haz"] as const;
export type RoomScope = (typeof ROOM_SCOPES)[number];
export type Scope = (typeof ALL_SCOPES)[number];

export const SCOPE_LABEL: Record<Scope, string> = {
  "szoba-1": "Komfort Kétágyas",
  "szoba-2": "Komfort Franciaágyas",
  superior: "Superior",
  egesz_haz: "Egész ház",
};

// A 2 főre szóló alapár fölött fő/éj felár jár; az egész háznál 10 fő fölött.
export const BASE_GUESTS: Record<Scope, number> = {
  "szoba-1": 2,
  "szoba-2": 2,
  superior: 2,
  egesz_haz: 10,
};

export const MAX_GUESTS: Record<Scope, number> = {
  "szoba-1": 3,
  "szoba-2": 3,
  superior: 4,
  egesz_haz: 12,
};

export const MEALS = ["nincs", "reggeli", "vacsora", "felpanzio"] as const;
export type Meal = (typeof MEALS)[number];
export const MEAL_LABEL: Record<Meal, string> = {
  nincs: "Nincs",
  reggeli: "Reggeli",
  vacsora: "Vacsora",
  felpanzio: "Félpanzió (reggeli + vacsora)",
};

export const SOURCES = ["weboldal", "telefon", "email", "booking", "szallas_hu", "ajanlat"] as const;
export type Source = (typeof SOURCES)[number];
export const SOURCE_LABEL: Record<Source, string> = {
  weboldal: "Weboldal",
  telefon: "Telefon",
  email: "E-mail",
  booking: "Booking.com",
  szallas_hu: "Szállás.hu",
  ajanlat: "Ajánlat",
};

export const STATUSES = ["valaszra_var", "elfogadva", "visszaigazolt", "lemondott"] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<Status, string> = {
  valaszra_var: "Válaszra vár",
  elfogadva: "Előlegre vár",
  visszaigazolt: "Visszaigazolt",
  lemondott: "Lemondott",
};

export function isScope(v: unknown): v is Scope {
  return typeof v === "string" && (ALL_SCOPES as readonly string[]).includes(v);
}
export function isMeal(v: unknown): v is Meal {
  return typeof v === "string" && (MEALS as readonly string[]).includes(v);
}
export function isSource(v: unknown): v is Source {
  return typeof v === "string" && (SOURCES as readonly string[]).includes(v);
}

// A foglalás mely szobák napjait zárja le.
export function scopeRooms(scope: Scope): RoomScope[] {
  return scope === "egesz_haz" ? [...ROOM_SCOPES] : [scope];
}

// ─── Foglalási cél: egy szoba, szobakombináció vagy egész ház ──────────────
// Tárolás: "szoba-1" | "egesz_haz" | "szoba-1,superior" (rendezett, vesszővel).
export type Target = string;

function isRoom(v: string): v is RoomScope {
  return (ROOM_SCOPES as readonly string[]).includes(v);
}

// Kanonikus alak (a szobák a ROOM_SCOPES sorrendjében), vagy null, ha érvénytelen.
export function normalizeTarget(v: unknown): Target | null {
  if (typeof v !== "string" || !v) return null;
  if (v === "egesz_haz") return v;
  const parts = Array.from(new Set(v.split(",").map((s) => s.trim())));
  if (!parts.length || !parts.every(isRoom)) return null;
  return ROOM_SCOPES.filter((r) => parts.includes(r)).join(",");
}

export function isTarget(v: unknown): v is Target {
  return normalizeTarget(v) === v;
}

export function isCombo(t: Target): boolean {
  return t.includes(",");
}

export function targetRooms(t: Target): RoomScope[] {
  if (t === "egesz_haz") return [...ROOM_SCOPES];
  return t.split(",").filter(isRoom);
}

export function targetLabel(t: Target): string {
  if (!isCombo(t)) return SCOPE_LABEL[t as Scope] ?? t;
  return targetRooms(t).map((r) => SCOPE_LABEL[r]).join(" + ");
}

export function targetMaxGuests(t: Target): number {
  if (!isCombo(t)) return MAX_GUESTS[t as Scope] ?? 0;
  return targetRooms(t).reduce((s, r) => s + MAX_GUESTS[r], 0);
}

export function formatFt(n: number): string {
  return `${n.toLocaleString("hu-HU")} Ft`;
}
