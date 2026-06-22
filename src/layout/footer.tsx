import Link from "next/link";
import { Copyright } from "@/components/copyright";

const cols = [
  {
    heading: "Szállás",
    links: [
      { name: "Szobák & árak", href: "/szobak" },
      { name: "Csomagajánlatok", href: "/csomagok" },
      { name: "Foglalás", href: "/foglalas" },
    ],
  },
  {
    heading: "Wellness",
    links: [
      { name: "Sóbarlang", href: "/wellness/sobarlang" },
      { name: "Finn szauna", href: "/wellness/finn-szauna" },
      { name: "Infraszauna", href: "/wellness/infraszauna" },
      { name: "Dézsafürdő", href: "/wellness/dezsafurdo" },
      { name: "Kert & medence", href: "/wellness/kert-medence" },
    ],
  },
  {
    heading: "Infó",
    links: [
      { name: "Rólunk", href: "/rolunk" },
      { name: "Szilvásvárad", href: "/szilvasvarad" },
      { name: "Galéria", href: "/galeria" },
      { name: "Étkezés", href: "/etkezes" },
      { name: "Kapcsolat", href: "/kapcsolat" },
      { name: "GYIK", href: "/gyik" },
    ],
  },
  {
    heading: "Jogi",
    links: [
      { name: "Adatvédelem", href: "/adatvedelem" },
      { name: "Impresszum", href: "/impresszum" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-[var(--nav-bg)] text-[var(--nav-text)]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <p className="font-sans text-xl text-white font-semibold">
              Viki Vendégház
            </p>
            <p className="mt-1 text-xs uppercase tracking-widest text-[var(--accent2)]">
              Szilvásvárad
            </p>
            <div className="mt-4 space-y-1 text-sm text-[var(--nav-text)]/70">
              <p>3348 Szilvásvárad,</p>
              <p>Dózsa György utca 45.</p>
              <p className="mt-2">
                <a href="tel:+36704108282" className="hover:text-[var(--accent2)] transition-colors">
                  +36 70 410-8282
                </a>
              </p>
              <p>
                <a href="mailto:vikivendeghaz@gmail.com" className="hover:text-[var(--accent2)] transition-colors">
                  vikivendeghaz@gmail.com
                </a>
              </p>
            </div>
            <div className="mt-5 flex gap-4">
              <a
                href="https://facebook.com/vikivendeghaz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--nav-text)]/60 hover:text-[var(--accent2)] transition-colors"
                aria-label="Facebook"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              <a
                href="https://instagram.com/vikivendeghaz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--nav-text)]/60 hover:text-[var(--accent2)] transition-colors"
                aria-label="Instagram"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
              <a
                href="https://tiktok.com/@vikivendeghaz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--nav-text)]/60 hover:text-[var(--accent2)] transition-colors"
                aria-label="TikTok"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.77 1.52V6.75a4.85 4.85 0 01-1-.06z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Nav columns */}
          {cols.map((col) => (
            <div key={col.heading}>
              <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">
                {col.heading}
              </p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--nav-text)]/70 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between gap-4">
          <p className="text-xs text-[var(--nav-text)]/40">
            © <Copyright /> Viki Vendégház. Minden jog fenntartva.
          </p>
          <p className="text-xs text-[var(--nav-text)]/40">
            NTAK: MA22031772 · Adószám: 52477937-1-30
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-[var(--nav-text)]/40">
            Weboldal tervezés és fejlesztés:{" "}
            <a
              href="https://bluenet.hu"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--nav-text)]/70 underline underline-offset-2 hover:text-white transition-colors"
            >
              BlueNet
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
