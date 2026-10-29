import Link from "next/link";
import { ensureExportToken, listFeeds, listUnits, scheduleStaleRefresh } from "@/lib/ical/server";
import { UI_PLATFORMS, type UiPlatform } from "@/lib/ical/types";
import { siteUrl } from "@/lib/mail/send";
import { UnitSyncCard, type FeedView } from "./panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Naptár-szinkron" };

function relative(d: Date | null): string | null {
  if (!d) return null;
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "most";
  if (min < 60) return `${min} perce`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} órája`;
  return `${Math.round(h / 24)} napja`;
}

export default async function NaptarSzinkronPage() {
  scheduleStaleRefresh();
  const units = await listUnits();
  const [tokens, feeds] = await Promise.all([Promise.all(units.map((u) => ensureExportToken(u.id))), listFeeds(units.map((u) => u.id))]);
  const base = siteUrl();

  return (
    <div className="max-w-3xl">
      <div className="mb-2 flex items-center gap-3">
        <Link href="/admin/naptar" className="text-sm text-[var(--text2)] hover:text-[var(--text)]">
          ← Naptár
        </Link>
        <span className="text-[var(--text3)]">/</span>
        <h1 className="text-xl font-semibold text-[var(--text)]">Naptár-szinkron</h1>
      </div>
      <p className="mb-6 text-sm leading-relaxed text-[var(--text2)]">
        Szobánként összekötheted a saját oldal foglalási naptárát a Booking.com és a Szállás.hu naptárával. Az export linket a portálba
        illeszd be, a portál export linkjét pedig ide. A rendszer 15 percenként frissít, és a saját oldalon érkező foglalás előtt mindig
        friss állapotot kér le.
      </p>

      <div className="space-y-6">
        {units.map((u, i) => {
          const link = (p: string) => `${base}/api/ical/${u.id}/${p}/${tokens[i]}.ics`;
          const feedViews = Object.fromEntries(
            UI_PLATFORMS.map((p) => {
              const f = feeds.find((x) => x.unitId === u.id && x.platform === p);
              const view: FeedView | null = f
                ? {
                    id: f.id,
                    importUrl: f.importUrl ?? "",
                    lastSuccess: relative(f.lastSuccessAt),
                    lastError: f.lastError,
                    failCount: f.failCount,
                  }
                : null;
              return [p, view];
            }),
          ) as Record<UiPlatform, FeedView | null>;
          return (
            <UnitSyncCard
              key={u.id}
              unitId={u.id}
              unitName={u.name}
              exportLinks={{ booking: link("booking"), szallas: link("szallas"), altalanos: link("altalanos") }}
              feeds={feedViews}
            />
          );
        })}
      </div>

      <p className="mt-8 rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-4 text-[13px] leading-relaxed text-[var(--text2)]">
        A portálok nem valós időben frissítenek: a Booking és a Szállás.hu a saját ütemezése szerint olvassa be a naptárat. A saját oldalon
        érkező foglalás előtt a rendszer mindig friss állapotot kér le. Ha egy szobatípusból több azonos egység van, az iCal-szinkron nem
        használható – ilyenkor channel manager kell.
      </p>
    </div>
  );
}
