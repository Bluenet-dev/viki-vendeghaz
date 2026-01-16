"use client"; // Fontos: Mivel useState-et használunk, ez már Kliens Komponens!

import { useState } from "react";
import { Button } from "@/components/catalyst/button";
import {
  Navbar,
  NavbarItem,
  NavbarSection,
  NavbarSpacer,
} from "@/components/catalyst/navbar";
import { Link } from "@/components/catalyst/link";
import { Dialog, DialogPanel } from "@headlessui/react"; // Standard Headless UI a mobil menühöz
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <Navbar>
        {/* --- 1. SZEKCIÓ: LOGÓ --- */}
        <NavbarSection>
          <Link href="/" aria-label="Főoldal">
            <div className="flex items-center gap-2 font-display font-bold text-xl text-white-900 tracking-tight">
              <div className="size-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-sans">
                B
              </div>
              BlueNet
            </div>
          </Link>
        </NavbarSection>

        {/* --- 2. SZEKCIÓ: DESKTOP NAVIGÁCIÓ --- */}
        <NavbarSpacer />

        <NavbarSection className="max-lg:hidden">
          <NavbarItem href="/szolgaltatasok">Szolgáltatások</NavbarItem>
          <NavbarItem href="/rolunk">Rólunk</NavbarItem>
          <NavbarItem href="/blog">Blog</NavbarItem>
        </NavbarSection>

        <NavbarSpacer />

        {/* --- 3. SZEKCIÓ: GOMBOK & MOBIL HAMBURGER --- */}
        <NavbarSection>
          {/* Asztali Gomb */}
          <div className="max-lg:hidden">
            <NavbarItem href="/kapcsolat">
              <Button color="blue" className="cursor-pointer">
                Ajánlatkérés
              </Button>
            </NavbarItem>
          </div>

          {/* Mobil Hamburger Ikon */}
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-white-700 hover:bg-black-100"
            >
              <span className="sr-only">Főmenü megnyitása</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </NavbarSection>
      </Navbar>

      {/* --- MOBIL MENÜ OVERLAY (Dialog) --- */}
      <Dialog
        as="div"
        className="lg:hidden"
        open={mobileMenuOpen}
        onClose={setMobileMenuOpen}
      >
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" />{" "}
        {/* Sötét háttér */}
        <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10 transition duration-300 ease-in-out data-[closed]:translate-x-full">
          {/* Mobil Menü Fejléc (Logó + Bezárás) */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="-m-1.5 p-1.5"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">BlueNet</span>
              <div className="flex items-center gap-2 font-display font-bold text-xl text-slate-900">
                <div className="size-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-sans">
                  B
                </div>
                BlueNet
              </div>
            </Link>
            <button
              type="button"
              className="-m-2.5 rounded-md p-2.5 text-slate-700 hover:bg-slate-100"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">Menü bezárása</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          {/* Mobil Menü Linkek */}
          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-gray-500/10">
              <div className="space-y-2 py-6">
                <Link
                  href="/szolgaltatasok"
                  className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-slate-900 hover:bg-slate-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Szolgáltatások
                </Link>
                <Link
                  href="/rolunk"
                  className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-slate-900 hover:bg-slate-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Rólunk
                </Link>
                <Link
                  href="/blog"
                  className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-slate-900 hover:bg-slate-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Blog
                </Link>
              </div>
              <div className="py-6">
                <Link
                  href="/kapcsolat"
                  className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-slate-900 hover:bg-slate-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Ajánlatkérés <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </DialogPanel>
      </Dialog>
    </>
  );
}
