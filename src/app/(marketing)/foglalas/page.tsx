import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { gallery } from "@/db/schema";
import { BookingSearch } from "@/components/booking-search";
import { SCOPE_LABEL, formatFt, isCombo, normalizeTarget, targetMaxGuests, targetRooms, type Scope, type Target } from "@/lib/booking/constants";
import { addDays, diffDays, fmtLong, fmtRange, isIsoDate, todayBudapest } from "@/lib/booking/dates";
import { computeQuote, searchOptions } from "@/lib/booking/quote";
import { findNearestFreeWindows, getSettings, loadBookingData } from "@/lib/booking/server";
import { RequestForm } from "./request-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Foglalás | Viki Vendégház Szilvásvárad – Közvetlen online foglalás",
  description:
    "Adja meg az érkezést, a távozást és a létszámot, és azonnal látja a szabad szobákat és az árat. Foglaljon közvetlenül – +36 70 410-8282.",
};

const PHOTO_CATEGORY: Record<Scope, string[]> = {
  "szoba-1": ["szoba-1"],
  "szoba-2": ["szoba-2"],
  superior: ["superior"],
  egesz_haz: ["egesz-haz", "udvar"],
};

async function loadPhotos(): Promise<Partial<Record<Scope, { url: string; alt: string | null }>>> {
  const rows = await db
    .select({ category: gallery.category, url: gallery.url, alt: gallery.alt })
    .from(gallery)
    .where(inArray(gallery.category, ["szoba-1", "szoba-2", "superior", "egesz-haz", "udvar"]))
    .orderBy(asc(gallery.sortOrder), asc(gallery.id));
  const firstByCat: Record<string, { url: string; alt: string | null }> = {};
  for (const r of rows) firstByCat[r.category] ??= { url: r.url, alt: r.alt };
  const out: Partial<Record<Scope, { url: string; alt: string | null }>> = {};
  for (const [scope, cats] of Object.entries(PHOTO_CATEGORY)) {
    const hit = cats.map((c) => firstByCat[c]).find(Boolean);
    if (hit) out[scope as Scope] = hit;
  }
  return out;
}

function searchHref(checkIn: string, checkOut: string, guests: number, choice?: Target) {
  const q = new URLSearchParams({ erkezes: checkIn, tavozas: checkOut, fo: String(guests) });
  if (choice) q.set("valasztas", choice);
  return `/foglalas?${q.toString()}`;
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-8 text-center">{children}</div>
  );
}

export default async function FoglalasPage({
  searchParams,
}: {
  searchParams: Promise<{ erkezes?: string; tavozas?: string; fo?: string; valasztas?: string }>;
}) {
  const sp = await searchParams;
  const today = todayBudapest();
  const minDate = addDays(today, 1);
  const checkIn = isIsoDate(sp.erkezes) ? sp.erkezes : undefined;
  const checkOut = isIsoDate(sp.tavozas) ? sp.tavozas : undefined;
  const guests = Math.min(Math.max(Number(sp.fo) || 2, 1), 12);
  const searched = Boolean(checkIn && checkOut);

  let body: React.ReactNode = null;

  if (searched) {
    const ci = checkIn!;
    const co = checkOut!;
    if (co <= ci) {
      body = <Notice><p className="text-[var(--text)]">A távozás napja legyen későbbi, mint az érkezésé.</p></Notice>;
    } else if (ci < minDate) {
      body = <Notice><p className="text-[var(--text)]">Az érkezés legkorábban holnap lehet.</p></Notice>;
    } else if (diffDays(ci, co) > 30) {
      body = (
        <Notice>
          <p className="text-[var(--text)]">30 éjszakánál hosszabb tartózkodásra kérjük, hívjon minket: <a href="tel:+36704108282" className="font-semibold text-[var(--accent)]">+36 70 410-8282</a></p>
        </Notice>
      );
    } else {
      const [data, photos, settings] = await Promise.all([loadBookingData(ci, co), loadPhotos(), getSettings()]);
      const { options, minNights } = searchOptions(ci, co, guests, data);
      const choice = normalizeTarget(sp.valasztas) ?? undefined;
      const chosen = choice ? options.find((o) => o.scope === choice) : undefined;

      if (chosen) {
        const withoutMeal = computeQuote({ scope: chosen.scope, checkIn: ci, checkOut: co, guests }, data);
        body = (
          <div>
            <Link href={searchHref(ci, co, guests)} className="text-[14px] text-[var(--text2)] hover:text-[var(--text)]">
              ← Vissza a találatokhoz
            </Link>
            <h2 className="mt-3 mb-1 text-2xl font-semibold text-[var(--text)]">{chosen.label}</h2>
            <p className="mb-6 text-[var(--text2)]">
              {fmtLong(ci)} – {fmtLong(co)} · {chosen.nights} éj · {guests} fő
            </p>
            <RequestForm
              scope={chosen.scope}
              checkIn={ci}
              checkOut={co}
              guests={guests}
              nights={chosen.nights}
              lines={withoutMeal.lines}
              accommodation={withoutMeal.total}
              ifa={withoutMeal.ifa}
              depositPercent={settings.depositPercent}
              mealPrices={{ reggeli: settings.breakfastPrice, vacsora: settings.dinnerPrice, felpanzio: settings.halfBoardPrice }}
              checkInFrom={settings.checkInFrom}
              checkOutUntil={settings.checkOutUntil}
            />
          </div>
        );
      } else if (minNights) {
        body = (
          <Notice>
            <p className="text-lg font-semibold text-[var(--text)]">Erre az időszakra legalább {minNights} éjszaka foglalható</p>
            <p className="mt-2 text-[var(--text2)]">Kérjük, módosítsa a távozás napját.</p>
            <Link
              href={searchHref(ci, addDays(ci, minNights), guests)}
              className="mt-5 inline-block rounded-full border border-[var(--accent)] px-5 py-2.5 font-semibold text-[var(--accent)] hover:bg-[var(--accent-bg)]"
            >
              {fmtRange(ci, addDays(ci, minNights))} ({minNights} éj)
            </Link>
          </Notice>
        );
      } else if (options.length === 0) {
        const windows = await findNearestFreeWindows(ci, diffDays(ci, co), guests);
        body = (
          <Notice>
            <p className="text-lg font-semibold text-[var(--text)]">Erre az időpontra sajnos nincs szabad helyünk</p>
            {windows.length > 0 ? (
              <>
                <p className="mt-2 text-[var(--text2)]">A legközelebbi szabad időpontok:</p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  {windows.map((w) => (
                    <Link
                      key={w.checkIn}
                      href={searchHref(w.checkIn, w.checkOut, guests)}
                      className="rounded-full border border-[var(--accent)] px-5 py-2.5 font-semibold text-[var(--accent)] hover:bg-[var(--accent-bg)]"
                    >
                      {fmtRange(w.checkIn, w.checkOut)}
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-2 text-[var(--text2)]">Kérjük, hívjon minket: <a href="tel:+36704108282" className="font-semibold text-[var(--accent)]">+36 70 410-8282</a></p>
            )}
          </Notice>
        );
      } else {
        body = (
          <div>
            <p className="mb-4 text-[var(--text2)]">
              {fmtLong(ci)} – {fmtLong(co)} · {diffDays(ci, co)} éj · {guests} fő
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {options.map((o) => {
                const photo = photos[(isCombo(o.scope) ? targetRooms(o.scope)[0] : o.scope) as Scope];
                return (
                  <div key={o.scope} className="flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                    <div className="relative h-48 bg-[var(--surface2)]">
                      {photo && (
                        <Image src={photo.url} alt={photo.alt ?? o.label} fill className="object-cover" sizes="(max-width: 640px) 100vw, 480px" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-lg font-semibold text-[var(--text)]">{o.label}</p>
                      <p className="text-[14px] text-[var(--text2)]">
                        {o.split
                          ? `${targetRooms(o.scope).length} szoba: ${targetRooms(o.scope).map((r) => `${SCOPE_LABEL[r]} ${o.split![r]} fő`).join(", ")}`
                          : `legfeljebb ${targetMaxGuests(o.scope)} fő`}
                      </p>
                      <div className="mt-4 flex flex-1 items-end justify-between gap-3">
                        <div>
                          <p className="text-2xl font-bold text-[var(--text)]">{o.total != null ? formatFt(o.total) : "Egyedi ár"}</p>
                          <p className="text-[13px] text-[var(--text2)]">
                            {o.nights} éj, {o.guests} fő{o.total == null ? " – visszajelzünk" : ""}
                          </p>
                        </div>
                        <Link
                          href={searchHref(ci, co, guests, o.scope)}
                          className="shrink-0 rounded-full bg-[var(--nav-bg)] px-5 py-2.5 font-semibold text-white hover:opacity-90"
                        >
                          Kiválasztom
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-16">
      <section className="bg-[var(--nav-bg)] px-6 pt-16 pb-10">
        <div className="mx-auto max-w-[1000px]">
          <p className="mb-3 text-xs uppercase tracking-widest text-[var(--accent2)]">Foglalás</p>
          <h1 className="mb-8 text-4xl font-light text-white sm:text-5xl">Mikor érkezne?</h1>
          <BookingSearch minDate={minDate} checkIn={checkIn} checkOut={checkOut} guests={guests} variant="dark" />
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto max-w-[1000px]">{body}</div>
      </section>

      <section className="px-6 pb-16">
        <div className="mx-auto max-w-[1000px] rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-6 text-center">
          <p className="mb-2 text-xs uppercase tracking-widest text-[var(--text3)]">Inkább telefonon?</p>
          <a href="tel:+36704108282" className="text-2xl text-[var(--text)] transition-colors hover:text-[var(--accent)]">
            +36 70 410-8282
          </a>
        </div>
      </section>
    </div>
  );
}
