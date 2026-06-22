"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog, DialogPanel } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

const navLinks = [
  { name: "Szobák", href: "/szobak" },
  { name: "Wellness", href: "/wellness" },
  { name: "Csomagok", href: "/csomagok" },
  { name: "Szilvásvárad", href: "/szilvasvarad" },
  { name: "Blog", href: "/blog" },
  { name: "Rólunk", href: "/rolunk" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 bg-[var(--nav-bg)]/90 backdrop-blur-sm border-b border-white/10">
        <nav className="mx-auto max-w-7xl px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Logó */}
          <Link
            href="/"
            className="font-sans text-xl font-semibold text-white tracking-tight"
          >
            Viki Vendégház
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm text-[var(--nav-text)] hover:text-[var(--accent2)] transition-colors"
              >
                {link.name}
              </Link>
            ))}
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
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="block px-3 py-3 text-sm text-[var(--nav-text)] hover:text-[var(--accent2)] border-b border-white/10"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
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
