export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { messages, availability, posts, gallery } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import {
  IconLayoutDashboard,
  IconBed,
  IconCurrencyForint,
  IconLeaf,
  IconGift,
  IconCalendar,
  IconChartBar,
  IconPencil,
  IconHelpCircle,
  IconPhoto,
  IconMessageCircle,
  type IconProps,
} from "@tabler/icons-react";
import type { ComponentType } from "react";

const quickLinks: { href: string; label: string; icon: ComponentType<IconProps> }[] = [
  { href: "/admin/szobak", label: "Szobák", icon: IconBed },
  { href: "/admin/arazas", label: "Árazás", icon: IconCurrencyForint },
  { href: "/admin/wellness", label: "Wellness", icon: IconLeaf },
  { href: "/admin/csomagok", label: "Csomagok", icon: IconGift },
  { href: "/admin/naptar", label: "Naptár", icon: IconCalendar },
  { href: "/admin/statisztikak", label: "Statisztikák", icon: IconChartBar },
  { href: "/admin/blog", label: "Blog", icon: IconPencil },
  { href: "/admin/gyik", label: "GYIK", icon: IconHelpCircle },
  { href: "/admin/galeria", label: "Galéria", icon: IconPhoto },
  { href: "/admin/uzenetek", label: "Üzenetek", icon: IconMessageCircle },
  { href: "/admin", label: "Áttekintés", icon: IconLayoutDashboard },
];

export default async function AdminPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/admin/login");

  const year = new Date().getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const [unreadMessages, blockedThisYear, activePosts, galleryImages] = await Promise.all([
    db.$count(messages, eq(messages.read, false)),
    db.$count(
      availability,
      and(
        eq(availability.status, "blocked"),
        gte(availability.date, yearStart),
        lte(availability.date, yearEnd),
      ),
    ),
    db.$count(posts, eq(posts.published, true)),
    db.$count(gallery),
  ]);

  const kpis: { label: string; value: number; icon: ComponentType<IconProps> }[] = [
    { label: "Beérkező üzenetek", value: unreadMessages, icon: IconMessageCircle },
    { label: `Blokkolt napok (${year})`, value: blockedThisYear, icon: IconCalendar },
    { label: "Aktív blog cikkek", value: activePosts, icon: IconPencil },
    { label: "Galéria képek", value: galleryImages, icon: IconPhoto },
  ];

  const todayLabel = new Date().toLocaleDateString("hu", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-5xl">
      {/* Fejléc */}
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Viki Vendégház</h1>
          <p className="text-xs text-[var(--text2)] mt-1">Admin felület</p>
        </div>
        <p className="text-xs text-[var(--text2)]">{todayLabel}</p>
      </div>

      {/* KPI kártyák */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-[var(--surface)] border-[0.5px] border-[var(--border)] rounded-[10px] p-5"
            >
              <Icon size={24} stroke={1.6} className="text-[var(--accent)]" />
              <div className="text-[28px] font-semibold leading-none mt-3 text-[var(--text)]">
                {kpi.value}
              </div>
              <div className="text-xs text-[var(--text2)] mt-1.5">{kpi.label}</div>
            </div>
          );
        })}
      </div>

      {/* Gyors navigáció */}
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--text2)] mb-3">
        Gyors navigáció
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className="flex items-center gap-3 bg-[var(--surface)] border-[0.5px] border-[var(--border)] rounded-lg p-4 transition-all hover:border-[var(--accent)] hover:scale-[1.01]"
            >
              <Icon size={20} stroke={1.6} className="text-[var(--accent)] shrink-0" />
              <span className="text-[14px] font-medium text-[var(--text)]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
