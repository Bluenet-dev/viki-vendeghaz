"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconLayoutDashboard,
  IconCalendarEvent,
  IconClipboardList,
  IconFileInvoice,
  IconWorld,
  IconLogout,
  type IconProps,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import { logoutAction } from "../actions";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
  // további útvonalak, amelyeken ez a menüpont aktív
  also?: string[];
  badge?: number;
};

// A "Weboldal" alá tartozó régi tartalmi oldalak.
const WEBSITE_PATHS = [
  "/admin/weboldal",
  "/admin/szobak",
  "/admin/wellness",
  "/admin/csomagok",
  "/admin/galeria",
  "/admin/blog",
  "/admin/gyik",
  "/admin/uzenetek",
  "/admin/statisztikak",
  "/admin/beallitasok",
];

function matches(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ offersEnabled, waitingCount }: { offersEnabled: boolean; waitingCount: number }) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: "/admin", label: "Áttekintés", icon: IconLayoutDashboard },
    { href: "/admin/foglalasok", label: "Foglalások", icon: IconClipboardList, badge: waitingCount },
    { href: "/admin/naptar", label: "Naptár és árak", icon: IconCalendarEvent },
    ...(offersEnabled ? [{ href: "/admin/ajanlatok", label: "Ajánlatkérések", icon: IconFileInvoice }] : []),
    { href: "/admin/weboldal", label: "Weboldal", icon: IconWorld, also: WEBSITE_PATHS },
  ];

  return (
    <aside
      className="flex w-[220px] shrink-0 flex-col bg-[var(--nav-bg)]"
      style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="text-[15px] font-semibold leading-tight text-white">
          BlueNet CMS <span className="font-normal text-[var(--accent2)]">v2.0</span>
        </div>
        <div className="mt-0.5 text-[12px] text-[rgba(216,221,215,0.55)]">Viki Vendégház · Szilvásvárad</div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active = matches(pathname, item.href) || (item.also ?? []).some((p) => matches(pathname, p));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[15px] transition-colors",
                active
                  ? "border-l-2 border-[var(--accent2)] bg-[rgba(255,255,255,0.12)] font-medium text-white"
                  : "font-normal text-[var(--nav-text)] hover:bg-[rgba(255,255,255,0.07)] hover:text-white",
              ].join(" ")}
            >
              <Icon size={19} stroke={1.6} className="shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-[#F5C84C] px-1.5 text-[12px] font-bold text-[#3D2E00]">{item.badge}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

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
