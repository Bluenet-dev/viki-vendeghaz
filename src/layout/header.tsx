import { Button } from "@/components/catalyst/typescript/button";
import {
  Navbar,
  NavbarDivider,
  NavbarItem,
  NavbarLabel,
  NavbarSection,
  NavbarSpacer,
} from "@/components/catalyst/typescript/navbar";
import { Link } from "@/components/catalyst/typescript/link"; // Fontos: A Catalyst Link kezeli a Next.js navigációt
import Image from "next/image"; // Ha majd lesz kép logó

export function Header() {
  return (
    <Navbar>
      {/* 1. SZEKCIÓ: LOGÓ */}
      <NavbarSection>
        <Link href="/" aria-label="Főoldal">
          {/* Ideiglenes Logó: Ha lesz SVG, ide rakjuk majd. 
                Most egy stílusos szöveget használunk. */}
          <div className="flex items-center gap-2 font-display font-bold text-xl text-white-900 tracking-tight">
            <div className="size-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              B
            </div>
            BlueNet
          </div>
        </Link>
      </NavbarSection>

      {/* 2. SZEKCIÓ: NAVIGÁCIÓ (Asztali nézetben) */}
      <NavbarSpacer />

      <NavbarSection className="max-lg:hidden">
        <NavbarItem href="/szolgaltatasok">Szolgáltatások</NavbarItem>
        <NavbarItem href="/rolunk">Rólunk</NavbarItem>
        <NavbarItem href="/blog">Blog</NavbarItem>
      </NavbarSection>

      <NavbarSpacer />

      {/* 3. SZEKCIÓ: CTA GOMB */}
      <NavbarSection>
        {/* A mobil menüt a Catalyst Navbar automatikusan kezeli, ha sokat zsugorodik, 
            de a teljes mobil Drawerhez később kellhet extra logika. 
            Most az alap Catalyst viselkedést használjuk. */}
        <NavbarItem href="/kapcsolat">
          <Button color="blue" className="cursor-pointer">
            Ajánlatkérés
          </Button>
        </NavbarItem>
      </NavbarSection>
    </Navbar>
  );
}
