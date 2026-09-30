import Link from "next/link";
import {
  IconBed,
  IconLeaf,
  IconGift,
  IconPhoto,
  IconPencil,
  IconHelpCircle,
  IconMessageCircle,
  IconChartBar,
  IconSettings,
  type IconProps,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { messages } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "Weboldal" };

export default async function WeboldalPage() {
  const unread = await db.$count(messages, and(eq(messages.read, false), eq(messages.type, "contact")));

  const items: { href: string; label: string; desc: string; icon: ComponentType<IconProps>; badge?: number }[] = [
    { href: "/admin/szobak", label: "Szobák leírása", desc: "Szövegek, felszereltség", icon: IconBed },
    { href: "/admin/wellness", label: "Wellness", desc: "Szolgáltatások és árak", icon: IconLeaf },
    { href: "/admin/csomagok", label: "Csomagok", desc: "Csomagajánlatok", icon: IconGift },
    { href: "/admin/galeria", label: "Galéria", desc: "Fotók feltöltése, sorrend", icon: IconPhoto },
    { href: "/admin/blog", label: "Blog", desc: "Cikkek írása", icon: IconPencil },
    { href: "/admin/gyik", label: "GYIK", desc: "Gyakori kérdések", icon: IconHelpCircle },
    { href: "/admin/uzenetek", label: "Üzenetek", desc: "Kapcsolati űrlapról", icon: IconMessageCircle, badge: unread },
    { href: "/admin/statisztikak", label: "Statisztikák", desc: "Foglalási grafikonok", icon: IconChartBar },
    { href: "/admin/beallitasok", label: "Beállítások", desc: "Étkezés, IFA, előleg, bank, Gmail", icon: IconSettings },
  ];

  return (
    <div className="max-w-4xl">
      <h1 className="mb-6 text-xl font-semibold text-[var(--text)]">Weboldal</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className="flex items-start gap-3 rounded-[10px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--accent)]"
            >
              <Icon size={22} stroke={1.6} className="mt-0.5 shrink-0 text-[var(--accent)]" />
              <span className="flex-1">
                <span className="flex items-center gap-2 text-[15px] font-medium text-[var(--text)]">
                  {it.label}
                  {it.badge ? (
                    <span className="rounded-full bg-[var(--accent2-bg)] px-1.5 text-[12px] font-semibold text-[#8A4A22]">{it.badge} új</span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[13px] text-[var(--text2)]">{it.desc}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
