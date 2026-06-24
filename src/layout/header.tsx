"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog, DialogPanel } from "@headlessui/react";
import { Bars3Icon, XMarkIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

type NavLeaf = { name: string; href: string };
type NavGroup = { name: string; items: NavLeaf[]; allHref: string; allLabel: string };
type NavItem = NavLeaf | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return "items" in item;
}

const nav: NavItem[] = [
  {
    name: "Szobák",
    items: [
      { name: "Komfort Kétágyas", href: "/szobak/komfort-ketagyas" },
      { name: "Komfort Franciaágyas", href: "/szobak/komfort-franciaagyas" },
      { name: "Superior", href: "/szobak/superior" },
    ],
    allHref: "/szobak",
    allLabel: "Összes szoba & árak",
  },
  {
    name: "Wellness",
    items: [
      { name: "Sóbarlang", href: "/wellness/sobarlang" },
      { name: "Finn szauna", href: "/wellness/finn-szauna" },
      { name: "Infraszauna", href: "/wellness/infraszauna" },
      { name: "Dézsafürdő", href: "/wellness/dezsafurdo" },
      { name: "Kert & medence", href: "/wellness/kert-medence" },
    ],
    allHref: "/wellness",
    allLabel: "Összes wellness",
  },
  {
    name: "Vendégház",
    items: [
      { name: "Kert & udvar", href: "/vendeghaz/kert-udvar" },
      { name: "Medence & jakuzzi", href: "/vendeghaz/medence" },
      { name: "Nyári konyha", href: "/vendeghaz/nyari-konyha" },
      { name: "Étkezési tér", href: "/vendeghaz/etkezesi-ter" },
    ],
    allHref: "/galeria",
    allLabel: "Galéria",
  },
  { name: "Galéria", href: "/galeria" },
  { name: "Félpanzió", href: "/felpanzio" },
  { name: "Szilvásvárad", href: "/szilvasvarad" },
  { name: "Blog", href: "/blog" },
  { name: "Rólunk", href: "/rolunk" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState<string | null>(null);

  function toggleMobile(name: string) {
    setMobileOpen((prev) => (prev === name ? null : name));
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 bg-[var(--nav-bg)]/90 backdrop-blur-sm border-b border-white/10">
        <nav className="mx-auto max-w-7xl px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Logó */}
          <Link
            href="/"
            className="font-sans text-xl font-semibold text-white tracking-tight shrink-0"
          >
            Viki Vendégház
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-5">
            {nav.map((item) =>
              isGroup(item) ? (
                <div key={item.name} className="relative group">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-sm text-[var(--nav-text)] hover:text-[var(--accent2)] transition-colors py-1"
                  >
                    {item.name}
                    <ChevronDownIcon className="h-3 w-3 transition-transform duration-200 group-hover:rotate-180" />
                  </button>
                  {/* Dropdown */}
                  <div className="absolute top-full left-0 pt-1 hidden group-hover:block z-50">
                    <div className="bg-[var(--nav-bg)] rounded-xl border border-white/10 shadow-xl py-1.5 min-w-[200px]">
                      {item.items.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className="block px-4 py-2 text-sm text-[var(--nav-text)]/80 hover:text-[var(--accent2)] hover:bg-white/5 transition-colors"
                        >
                          {sub.name}
                        </Link>
                      ))}
                      <div className="border-t border-white/10 mt-1 pt-1">
                        <Link
                          href={item.allHref}
                          className="block px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--accent2)] hover:bg-white/5 transition-colors"
                        >
                          {item.allLabel} →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-sm text-[var(--nav-text)] hover:text-[var(--accent2)] transition-colors"
                >
                  {item.name}
                </Link>
              )
            )}
          </div>

          {/* CTA + hamburger */}
          <div className="flex items-center gap-4">
            <Link
              href="/foglalas"
              className="hidden lg:inline-flex items-center px-4 py-2 rounded-full bg-[var(--accent2)] text-white font-sans text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Foglalás
            </Link>
            <button
              type="button"
              className="lg:hidden -m-2 p-2 text-[var(--nav-text)]"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Menü megnyitása</span>
              <Bars3Icon className="h-6 w-6" />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobil menü */}
      <Dialog
        as="div"
        className="lg:hidden"
        open={mobileMenuOpen}
        onClose={setMobileMenuOpen}
      >
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-[var(--nav-bg)] px-6 py-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/"
              className="font-sans text-xl font-semibold text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Viki Vendégház
            </Link>
            <button
              type="button"
              className="-m-2 p-2 text-[var(--nav-text)]"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">Menü bezárása</span>
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-1">
            {nav.map((item) =>
              isGroup(item) ? (
                <div key={item.name} className="border-b border-white/10">
                  <button
                    type="button"
                    onClick={() => toggleMobile(item.name)}
                    className="w-full flex items-center justify-between px-3 py-3 text-sm text-[var(--nav-text)] hover:text-[var(--accent2)]"
                  >
                    {item.name}
                    <ChevronDownIcon
                      className={`h-4 w-4 transition-transform duration-200 ${mobileOpen === item.name ? "rotate-180" : ""}`}
                    />
                  </button>
                  {mobileOpen === item.name && (
                    <div className="pb-2 space-y-0.5">
                      {item.items.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className="block px-6 py-2 text-sm text-[var(--nav-text)]/70 hover:text-[var(--accent2)]"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {sub.name}
                        </Link>
                      ))}
                      <Link
                        href={item.allHref}
                        className="block px-6 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--accent2)]"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.allLabel} →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block px-3 py-3 text-sm text-[var(--nav-text)] hover:text-[var(--accent2)] border-b border-white/10"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              )
            )}
            <Link
              href="/foglalas"
              className="mt-6 block text-center px-4 py-3 rounded-full bg-[var(--accent2)] text-white font-sans text-sm font-semibold"
              onClick={() => setMobileMenuOpen(false)}
            >
              Foglalás
            </Link>
          </div>
        </DialogPanel>
      </Dialog>
    </>
  );
}
