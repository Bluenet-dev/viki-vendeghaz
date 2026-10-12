import type { Metadata } from "next";
import Link from "next/link";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { dayRates, tariffPrices } from "@/db/schema";
import { formatFt } from "@/lib/booking/constants";
import { getSettings, loadPackages, loadTariffs } from "@/lib/booking/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Árak és díjak | Viki Vendégház Szilvásvárad",
  description:
    "A Viki Vendégház árai létszám szerint, egész házra és szobánként: időszakok, csomagok, kedvezmények, gyerekár, foglaló és minden külön költség egy helyen.",
};

const YEAR = 2027;
const MONTHS = ["Január", "Február", "Március", "Április", "Május", "Június", "Július", "Augusztus", "Szeptember", "Október", "November", "December"];
const WEEKDAYS = ["H", "K", "Sz", "Cs", "P", "Sz", "V"];

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-5 text-2xl font-semibold text-[var(--text)]">{title}</h2>
        {children}
      </div>
    </section>
  );
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-[var(--text2)]">
          <span className="mt-2.5 h-0.5 w-3 shrink-0 bg-[var(--accent2)]" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function ArakPage() {
  const [tariffList, prices, packages, s, yearRows] = await Promise.all([
    loadTariffs(),
    db.select().from(tariffPrices),
    loadPackages(),
    getSettings(),
    db
      .select({ date: dayRates.date, tariffCode: dayRates.tariffCode, label: dayRates.label })
      .from(dayRates)
      .where(and(eq(dayRates.roomScope, "szoba-1"), gte(dayRates.date, `${YEAR}-01-01`), lte(dayRates.date, `${YEAR}-12-31`))),
  ]);

  const price = (code: string, scope: string, g: number) => prices.find((p) => p.tariffCode === code && p.roomScope === scope && p.guests === g)?.price;
  const byDate = new Map(yearRows.map((r) => [r.date, r]));
  const tariffByCode = new Map(tariffList.map((t) => [t.code, t]));
  const roomNote = (mode: string, days: number | null) =>
    mode === "open" ? "Szobánként is foglalható" : mode === "never" ? "Csak az egész ház foglalható" : `Szobánként ${days} nappal előtte nyílik, ha az egész ház szabad`;

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-16">
      <section className="bg-[var(--nav-bg)] px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-xs uppercase tracking-widest text-[var(--accent2)]">Árak</p>
          <h1 className="mb-4 text-4xl font-light text-white sm:text-5xl">Árak és díjak</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-[var(--nav-text)]/80">
            Az ár az időszaktól és a létszámtól függ. Az árak egy éjszakára szólnak, az idegenforgalmi adó és a
            takarítási díj nélkül. A pontos végösszeget a foglalásnál látja.
          </p>
          <Link href="/foglalas" className="mt-6 inline-block rounded-full bg-[var(--accent2)] px-6 py-3 font-semibold text-white hover:opacity-90">
            Szabad időpont keresése →
          </Link>
        </div>
      </section>

      <Section title="Időszakok és árak">
        <div className="grid gap-4 md:grid-cols-2">
          {tariffList.map((t) => (
            <div key={t.code} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-center gap-3 px-5 py-3" style={{ backgroundColor: t.color }}>
                <h3 className="flex-1 text-[16px] font-semibold text-[var(--text)]">{t.name}</h3>
                <span className="text-[13px] text-[var(--text)]">min. {t.minNights} éj</span>
              </div>
              <div className="space-y-3 px-5 py-4 text-[14px]">
                <div>
                  <p className="mb-1 font-medium text-[var(--text)]">Egész ház (max. 12 fő)</p>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
                    {[8, 9, 10, 11, 12].map((g) => (
                      <div key={g} className="contents">
                        <dt className="text-[var(--text2)]">{g === 8 ? "1–8 fő" : `${g} fő`}</dt>
                        <dd className="text-right font-semibold text-[var(--text)]">{formatFt(price(t.code, "egesz_haz", g) ?? 0)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                {t.roomMode !== "never" && (
                  <div>
                    <p className="mb-1 font-medium text-[var(--text)]">Szobák</p>
                    {[
                      { label: "Komfort Kétágyas, Komfort Franciaágyas", scope: "szoba-1", g: [1, 2, 3] },
                      { label: "Superior", scope: "superior", g: [1, 2, 3, 4] },
                    ].map((r) => (
                      <div key={r.scope} className="mb-1">
                        <p className="text-[var(--text2)]">{r.label}</p>
                        <p className="text-[var(--text)]">
                          {r.g.map((g) => `${g} fő ${formatFt(price(t.code, r.scope, g) ?? 0)}`).join(" · ")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[13px] text-[var(--text2)]">{roomNote(t.roomMode, t.releaseDays)}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[13px] text-[var(--text3)]">Az egész ház ára 1–8 főig azonos.</p>
      </Section>

      <Section title={`Melyik nap melyik időszak – ${YEAR}`} id="naptar">
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-[var(--text2)]">
          {tariffList.map((t) => (
            <span key={t.code} className="flex items-center gap-1.5">
              <span className="inline-block h-4 w-4 rounded" style={{ backgroundColor: t.color }} />
              {t.name}
            </span>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MONTHS.map((name, mi) => {
            const first = new Date(Date.UTC(YEAR, mi, 1));
            const offset = (first.getUTCDay() + 6) % 7; // hétfővel kezdünk
            const len = new Date(Date.UTC(YEAR, mi + 1, 0)).getUTCDate();
            return (
              <div key={name} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <p className="mb-2 text-[14px] font-semibold text-[var(--text)]">{name}</p>
                <div className="grid grid-cols-7 gap-0.5 text-center text-[12px]">
                  {WEEKDAYS.map((w, i) => (
                    <div key={i} className="pb-1 text-[var(--text3)]">{w}</div>
                  ))}
                  {Array.from({ length: offset }, (_, i) => <div key={`e${i}`} />)}
                  {Array.from({ length: len }, (_, i) => {
                    const d = `${YEAR}-${String(mi + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
                    const row = byDate.get(d);
                    const t = row?.tariffCode ? tariffByCode.get(row.tariffCode) : undefined;
                    return (
                      <div
                        key={d}
                        title={[t?.name, row?.label].filter(Boolean).join(" · ")}
                        className={`rounded py-1 text-[var(--text)] ${row?.label ? "font-bold underline decoration-dotted" : ""}`}
                        style={{ backgroundColor: t?.color ?? "transparent" }}
                      >
                        {i + 1}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[13px] text-[var(--text3)]">
          A szín az aznap kezdődő éjszakára vonatkozik. Aláhúzva: ünnep vagy rendezvény (*-gal jelölt dátumok becsültek).
        </p>
      </Section>

      <Section title="Csomagok – egész házra">
        <div className="grid gap-4 md:grid-cols-2">
          {packages.filter((p) => p.active).map((p) => (
            <div key={p.slug} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h3 className="text-[17px] font-semibold text-[var(--text)]">{p.name}</h3>
              <p className="mt-1 text-[14px] text-[var(--text2)]">{p.includes}</p>
              <p className="mt-3 text-[15px] text-[var(--text)]">
                <strong>{formatFt(p.priceLow)}</strong> / éj holtszezonban, tavasszal, ősszel
                {p.priceHigh != null && <> · <strong>{formatFt(p.priceHigh)}</strong> / éj nyáron, ünnepen</>}
              </p>
              <p className="mt-1 text-[13px] text-[var(--text3)]">
                Legfeljebb {p.maxGuests} fő, a létszámtól független ár.
                {p.months ? " Csak novembertől márciusig." : ""} Szilveszterkor nem választható.
                Kedvezmény nem jár rá; takarítási díj és idegenforgalmi adó igen.
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Kedvezmények">
        <List
          items={[
            <>Gyerek 3–12 év: a pótágy (felár) {s.childDiscountPercent}%-a; 0–2 év: ingyenes, nem számít a létszámba.</>,
            <>Egész ház {s.houseLongStayNights} éjtől: {s.houseLongStayPercent}% minden éjszakára.</>,
            <>Szoba 3 éjtől: a 3. éjszaka {s.roomThirdNightPercent}% (holtszezonban, tavasszal, ősszel).</>,
            <>Last minute: ha legfeljebb {s.lastMinuteDays} nappal érkezés előtt foglal, a holtszezoni hétköznapok {s.lastMinutePercent}%.</>,
            <>Egy éjszakára legfeljebb egy kedvezmény jár, a legnagyobb.</>,
          ]}
        />
      </Section>

      <Section title="Minden költség egy helyen">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-[16px] font-semibold text-[var(--text)]">Kötelező</h3>
            <List
              items={[
                <>Idegenforgalmi adó: {formatFt(s.ifaPerPersonPerNight)} / fő / éj, 18 év felett.</>,
                <>Takarítási díj: egész ház {formatFt(s.houseCleaningFee)} / foglalás, ha {s.houseCleaningUnderNights} éjnél rövidebb; szoba {formatFt(s.roomCleaningFee)} / szoba, ha {s.roomCleaningUnderNights} éjnél rövidebb.</>,
              ]}
            />
          </div>
          <div>
            <h3 className="mb-3 text-[16px] font-semibold text-[var(--text)]">Választható</h3>
            <List
              items={[
                <>Szaunanap (finn + infra, 19:00-ig, csak egész ház): {formatFt(s.saunaDayPrice)} / nap.</>,
                <>Dézsafürdő: {formatFt(s.tubPrice)} / felfűtés.</>,
                <>Étkezés a partnerétteremben: reggeli {formatFt(s.breakfastPrice)}, vacsora {formatFt(s.dinnerPrice)}, félpanzió {formatFt(s.halfBoardPrice)} / fő / nap.</>,
              ]}
            />
          </div>
          <div>
            <h3 className="mb-3 text-[16px] font-semibold text-[var(--text)]">Helyszínen fizetendő, ha igénybe veszi</h3>
            <List
              items={[
                <>Finn szauna szobás vendégnek: {formatFt(s.finnSaunaPerPersonHour)} / fő / óra.</>,
                <>Közös infraszauna szobás vendégnek: {formatFt(s.infraSharedPerPersonHour)} / fő / óra.</>,
                <>Infraszauna a Superior szobában: {formatFt(s.superiorInfraPerHour)} / óra.</>,
                <>Kaució: nagyobb csoportoknál egyedi elbírálás alapján, távozáskor visszajár.</>,
              ]}
            />
          </div>
          <div>
            <h3 className="mb-3 text-[16px] font-semibold text-[var(--text)]">Ingyenes</h3>
            <List
              items={[
                <>Sóbarlang: {s.saltCaveFreeMinutes} perc / fő / nap.</>,
                <>Kültéri medence (nyáron), kert, grill, bogrács.</>,
              ]}
            />
          </div>
        </div>
      </Section>

      <Section title="Foglaló, érkezés, távozás">
        <List
          items={[
            <>Foglaló: a végösszeg {s.depositPercentNew}%-a; ünnepen, nagy rendezvényen és Szilveszterkor {s.depositPercentPeak}%-a. A visszaigazolás után {s.depositDueDays} napon belül kell átutalni.</>,
            <>Érkezés: {s.checkInFrom}–{s.checkInUntil} között. Távozás: {s.checkOutUntil}-ig.</>,
            <>A részletes feltételeket az <Link href="/aszf" className="text-[var(--accent)] underline">ÁSZF</Link> és a <Link href="/hazirend" className="text-[var(--accent)] underline">Házirend</Link> tartalmazza.</>,
          ]}
        />
      </Section>
    </div>
  );
}
