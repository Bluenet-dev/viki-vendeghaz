"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  IconLogout,
  type IconProps,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import { logoutAction } from "../actions";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
};

const navItems: NavItem[] = [
  { href: "/admin", label: "Áttekintés", icon: IconLayoutDashboard },
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
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-[220px] shrink-0 flex flex-col bg-[var(--nav-bg)]"
      style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Logo */}
      <div
        className="px-5 py-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="text-[15px] font-semibold text-white leading-tight">Viki Admin</div>
        <div className="text-[12px] mt-0.5 text-[rgba(216,221,215,0.55)]">Vendégház kezelő</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-[14px] transition-colors",
                active
                  ? "bg-[rgba(255,255,255,0.12)] text-white font-medium border-l-2 border-[var(--accent2)]"
                  : "text-[var(--nav-text)] font-normal hover:bg-[rgba(255,255,255,0.07)] hover:text-white",
              ].join(" ")}
            >
              <Icon size={18} stroke={1.6} className="shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Kijelentkezés */}
      <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[14px] text-[rgba(216,221,215,0.5)] transition-colors hover:bg-[rgba(255,255,255,0.07)] hover:text-white"
          >
            <IconLogout size={18} stroke={1.6} className="shrink-0" />
            <span>Kijelentkezés</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
