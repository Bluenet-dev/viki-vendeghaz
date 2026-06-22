import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import {
  rooms,
  availability,
  seasons,
  pricingRules,
  holidayOverrides,
  holidayPrices,
  pricingSettings,
  roomCapacityPricing,
  wellnessServices,
} from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { getLowestPriceForScope, type PricingData, type RoomScope } from "@/lib/pricing";
import { MiniCalendar } from "./mini-calendar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Viki Vendégház – Szilvásvárad | Sóbarlang, szauna, wellness",
  description:
    "Vendégház sóbarlanggal, finn szaunával, infraszaunával és dézsafürdővel Szilvásvárad szívében. 3 szoba, 12 fő, Szalajka-völgy és Bükki Nemzeti Park közelében. Booking.com 9,5 · Szállás.hu 9,9.",
  openGraph: {
    title: "Viki Vendégház – Szilvásvárad",
    description:
      "Sóbarlang, finn szauna, infraszauna, dézsafürdő – Szilvásvárad szívében. Foglaljon közvetlenül és spóroljon!",
    type: "website",
  },
};

const reviews = [
  {
    text: "Csak pozitív tapasztalataim vannak, nagyon kedves és segítőkész a vendéglátó. Nagyon tiszta minden helyiség, és a környezet is szép. Igazi bababarát hely.",
    author: "Rimóczi Sándor",
    source: "Szállás.hu",
  },
  {
    text: "A szállás ár-érték arányban tökéletes. A weboldalra feltöltött képek teljesen megegyeznek a valósággal. A Superior franciaágyas szoba gyönyörű, tiszta, kellemes hangulatú.",
    author: "Fiatal pár",
    source: "Booking.com",
  },
  {
    text: "A szállás maximálisan kielégítette a hozzáfűzött elvárásainkat. Maximálisan bababarát hely. Nagyon élveztük a medence és dézsafürdő adta lehetőségeket is. Visszatérünk még! 10⭐️",
    author: "Suller Mónika",
    source: "Szállás.hu",
  },
];

export default async function Home() {
  const allRooms = await db
    .select({ slug: rooms.slug, name: rooms.name, capacity: rooms.capacity, bedType: rooms.bedType, amenities: rooms.amenities })
    .from(rooms)
    .where(eq(rooms.active, true))
    .orderBy(asc(rooms.sortOrder));

  const today = new Date().toISOString().slice(0, 10);
  const blockedRows = await db
    .select({ roomSlug: availability.roomSlug, date: availability.date })
    .from(availability)
    .where(eq(availability.status, "blocked"))
    .then((rows) => rows.filter((r) => r.date >= today));
  const blockedDates = Array.from(new Set(blockedRows.map((r) => r.date)));

  const [allSeasons, allRules, allHolidays, allHolidayPrices, settingsRows, allRoomCapacities, allWellness] = await Promise.all([
    db.select().from(seasons).where(eq(seasons.active, true)),
    db.select().from(pricingRules),
    db.select().from(holidayOverrides).where(eq(holidayOverrides.active, true)),
    db.select().from(holidayPrices),
    db.select().from(pricingSettings).limit(1),
    db.select().from(roomCapacityPricing),
    db.select().from(wellnessServices).orderBy(asc(wellnessServices.sortOrder)),
  ]);

  const pricingData: PricingData = {
    seasons: allSeasons,
    rules: allRules,
    holidays: allHolidays,
    holidayPrices: allHolidayPrices,
    settings: settingsRows[0] ?? null,
    roomCapacities: allRoomCapacities,
  };

  const wholeHouseLowest = getLowestPriceForScope("egesz_haz", pricingData);

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="bg-[var(--nav-bg)] px-6 pt-28 pb-16">
        <div className="mx-auto max-w-7xl grid lg:grid-cols-[1.1fr_1fr] gap-10 items-start">
          {/* Bal oszlop */}
          <div>
            <p className="text-[12px] uppercase tracking-widest text-[var(--accent2)] font-semibold mb-4">
              Szilvásvárad · Bükki Nemzeti Park · Szalajka-völgy
            </p>
            <h1 className="text-[clamp(34px,5vw,52px)] font-light text-white leading-[1.12] max-w-lg">
              Pihenj úgy, ahogy <span className="font-semibold text-[var(--accent2)]">megérdemled</span>
            </h1>
            <p className="mt-5 text-sm text-[var(--nav-text)]/75 leading-relaxed max-w-sm">
              Három tágas szoba saját fürdőszobával, sóbarlang, finn szauna, infraszauna,
              dézsafürdő – mindössze pár percre a Szalajka-völgytől, a Bükk lábánál.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/foglalas"
                className="px-6 py-3 rounded-full bg-[var(--accent2)] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Szabad napok →
              </Link>
              <Link
                href="/szobak"
                className="px-6 py-3 rounded-full border border-white/35 text-[var(--nav-text)] font-semibold text-sm hover:bg-white/5 transition-colors"
              >
                Szobák & árak
              </Link>
            </div>
            <div className="mt-12 flex items-center gap-8">
              <div>
                <p className="text-lg font-bold text-white">9,9</p>
                <p className="text-[11px] uppercase tracking-widest text-[var(--nav-text)]/50">Szállás.hu</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">9,5</p>
                <p className="text-[11px] uppercase tracking-widest text-[var(--nav-text)]/50">Booking.com</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">12 fő</p>
                <p className="text-[11px] uppercase tracking-widest text-[var(--nav-text)]/50">Max kapacitás</p>
              </div>
            </div>
          </div>

          {/* Jobb oszlop: foglalás-kártya + mini naptár */}
          <div className="bg-[var(--surface)] rounded-xl p-4">
            <p className="font-semibold text-sm text-[var(--text)]">Elérhetőség ellenőrzése</p>
            <p className="text-[12px] text-[var(--text3)] mt-0.5 mb-4">
              Azonnali visszaigazolás · ingyenes lemondás 24 h-ig
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-[var(--border)] pb-2">
                <span className="text-[var(--text2)]">Legalacsonyabb ár</span>
                <strong className="text-[var(--text)]">
                  {wholeHouseLowest != null ? `${wholeHouseLowest.toLocaleString("hu")} Ft / éj` : "Hamarosan"}
                </strong>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-[var(--text2)]">Szobák</span>
                <strong className="text-[var(--text)]">3 szoba + egész ház</strong>
              </div>
            </div>
            <Link
              href="/foglalas"
              className="mt-4 block w-full text-center py-3 rounded-lg bg-[var(--nav-bg)] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Foglalási kérés küldése
            </Link>

            <MiniCalendar blockedDates={blockedDates} />
          </div>
        </div>
      </section>

      {/* ─── Szobák szekció ─── */}
      <section className="bg-[var(--bg)] py-16 px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent)] mb-3">Szállás</p>
          <h2 className="text-2xl font-semibold text-[var(--text)] mb-2">Válasszon szobát</h2>
          <p className="text-sm text-[var(--text2)] max-w-xl mb-8">
            3 külön bejáratú szoba saját fürdőszobával, minden igényre.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {allRooms.map((room) => {
              const amenities = room.amenities ? room.amenities.split(",").map((s) => s.trim()).filter(Boolean) : [];
              const isSuperior = room.slug === "superior";
              const lowest = room.slug ? getLowestPriceForScope(room.slug as RoomScope, pricingData) : null;
              return (
                <div
                  key={room.slug}
                  className={`bg-[var(--surface)] rounded-xl border overflow-hidden ${isSuperior ? "border-[var(--accent2)]" : "border-[var(--border)]"}`}
                >
                  <div className="relative h-40 bg-[var(--surface2)] flex items-center justify-center">
                    <span className="text-xs uppercase tracking-widest text-[var(--text3)]">Fotó hamarosan</span>
                    {isSuperior && (
                      <span className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-[var(--accent2-bg)] text-[var(--accent2)] text-[12px] font-semibold uppercase tracking-wide">
                        Legjobb szoba
                      </span>
                    )}
                  </div>
                  <div className="p-3.5">
                    <p className="font-semibold text-sm text-[var(--text)]">{room.name}</p>
                    {lowest != null && (
                      <p className="text-xs text-[var(--accent)] mt-1">-tól {lowest.toLocaleString("hu")} Ft / éj</p>
                    )}
                    {amenities.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {amenities.slice(0, 3).map((f) => (
                          <li key={f} className="px-2.5 py-1 rounded-full bg-[var(--surface2)] text-[12px] text-[var(--text2)]">{f}</li>
                        ))}
                      </ul>
                    )}
                    <Link
                      href="/szobak"
                      className="mt-4 block text-center w-full py-2 rounded-full border border-[var(--border)] text-sm text-[var(--text)] hover:border-[var(--accent)] transition-colors"
                    >
                      Részletek & foglalás
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Egész ház */}
          <div className="mt-4 bg-[var(--accent-bg)] border border-[#C5D5C5] rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm text-[var(--text)]">Egész ház bérlése</p>
              <p className="text-xs text-[var(--text2)] mt-0.5">
                Mind a 3 szoba + nappali · max. 12 fő
                {wholeHouseLowest != null && <> · -tól {wholeHouseLowest.toLocaleString("hu")} Ft / éj</>}
              </p>
            </div>
            <Link href="/szobak" className="shrink-0 px-5 py-2.5 rounded-full bg-[#2A4A2C] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
              Részletek →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Wellness ─── */}
      <section className="bg-[var(--bg)] py-16 px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent)] mb-3">Wellness</p>
          <h2 className="text-2xl font-semibold text-[var(--text)] mb-8">Öt út a megújuláshoz</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {allWellness.map((item, i) => (
              <Link
                key={item.slug}
                href={`/wellness/${item.slug}`}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 hover:border-[var(--accent)]/40 transition-colors"
              >
                <div className={`w-7 h-7 rounded-md ${i % 2 === 0 ? "bg-[var(--accent-bg)]" : "bg-[var(--accent2-bg)]"} mb-2`} />
                <p className="font-semibold text-xs text-[var(--text)]">{item.name}</p>
                <p className="text-[12px] text-[var(--text2)] mt-1">{item.guestPriceLabel}</p>
                <span className="mt-2 inline-block text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                  Részletek →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Vendégvélemények ─── */}
      <section className="bg-[var(--bg)] py-16 px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent)] mb-3">Vélemények</p>
          <h2 className="text-2xl font-semibold text-[var(--text)] mb-8">Amit vendégeink mondanak</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reviews.map((r) => (
              <figure key={r.author} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                <p className="text-[#E8A030] text-sm mb-3">★★★★★</p>
                <blockquote className="text-[var(--text2)] text-xs leading-relaxed italic">
                  &ldquo;{r.text}&rdquo;
                </blockquote>
                <figcaption className="mt-4 text-xs">
                  <span className="font-semibold text-[var(--text)]">{r.author}</span>
                  <span className="text-[var(--text3)]"> · {r.source}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-7xl">
          <div className="bg-[var(--nav-bg)] rounded-xl p-10 text-center">
            <h3 className="text-2xl font-semibold text-white mb-2">Foglaljon most, pihenjen hamarosan</h3>
            <p className="text-sm text-[var(--nav-text)]/70 mb-6">
              Szabad napokat talál a naptárban · Online foglalási kérés percek alatt
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/foglalas" className="px-7 py-3 rounded-full bg-[var(--accent2)] text-white font-semibold text-sm hover:opacity-90 transition-opacity">
                Foglalási kérés küldése →
              </Link>
              <a href="tel:+36704108282" className="px-7 py-3 rounded-full border border-white/30 text-[var(--nav-text)] font-semibold text-sm hover:bg-white/5 transition-colors">
                +36 70 410-8282
              </a>
            </div>
            <div className="mt-8 flex items-center justify-center gap-8">
              <div>
                <p className="text-lg font-bold text-[var(--accent2)]">9,9</p>
                <p className="text-[11px] uppercase tracking-widest text-[var(--nav-text)]/50">Szállás.hu</p>
              </div>
              <div>
                <p className="text-lg font-bold text-[var(--accent2)]">9,5</p>
                <p className="text-[11px] uppercase tracking-widest text-[var(--nav-text)]/50">Booking.com</p>
              </div>
              <div>
                <p className="text-lg font-bold text-[var(--accent2)]">2015</p>
                <p className="text-[11px] uppercase tracking-widest text-[var(--nav-text)]/50">Nyitás éve</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
