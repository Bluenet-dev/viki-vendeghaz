// Dátumok "YYYY-MM-DD" szövegként, időzóna-mentesen (UTC-déli horgony, hogy a
// nyári időszámítás ne csúsztasson napot).

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !ISO_RE.test(v)) return false;
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86_400_000,
  );
}

// Az éjszakák dátumai: érkezés napja … távozás előtti nap.
export function nightsOf(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) out.push(d);
  return out;
}

// 0 = vasárnap … 6 = szombat
export function weekday(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

export function isWeekendDay(iso: string): boolean {
  const w = weekday(iso);
  return w === 0 || w === 6;
}

// A mai nap Budapesten (a szerver UTC-ben fut).
export function todayBudapest(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Budapest" }).format(new Date());
}

const HU_MONTHS = ["jan.", "febr.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."];
const HU_MONTHS_LONG = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];
const HU_DAYS = ["vasárnap", "hétfő", "kedd", "szerda", "csütörtök", "péntek", "szombat"];

// "okt. 9." – rövid, listákba
export function fmtShort(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${HU_MONTHS[m - 1]} ${d}.`;
}

// "2026. október 9., péntek"
export function fmtLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}. ${HU_MONTHS_LONG[m - 1]} ${d}., ${HU_DAYS[weekday(iso)]}`;
}

// "okt. 9. – okt. 11." (évvel, ha nem az idei)
export function fmtRange(checkIn: string, checkOut: string): string {
  const thisYear = todayBudapest().slice(0, 4);
  const year = checkIn.slice(0, 4) !== thisYear ? `${checkIn.slice(0, 4)}. ` : "";
  return `${year}${fmtShort(checkIn)} – ${fmtShort(checkOut)}`;
}

export function monthLabel(year: number, month0: number): string {
  const name = HU_MONTHS_LONG[month0];
  return `${year}. ${name}`;
}
