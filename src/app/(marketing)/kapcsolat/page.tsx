import type { Metadata } from "next";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Kapcsolat",
  description:
    "Viki Vendégház – 3348 Szilvásvárad, Dózsa György utca 45. Telefon: +36 70 410-8282. Email: vikivendeghaz@gmail.com.",
};

export default function KapcsolatPage() {
  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      <section className="bg-[var(--nav-bg)] py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Kapcsolat</p>
          <h1 className="text-5xl sm:text-6xl text-white font-light mb-6">
            Írjon vagy hívjon!
          </h1>
          <p className="text-[var(--nav-text)]/80 text-lg max-w-xl">
            24 órás ügyeleten elérhető vagyunk – foglalási kérdésben, egyedi
            ajánlatkérésnél vagy bármilyen információra van szüksége.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-12">
          {/* Elérhetőségek */}
          <div>
            <h2 className="text-3xl text-[var(--text)] mb-6">Elérhetőségeink</h2>
            <dl className="space-y-5">
              <div>
                <dt className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-1">Cím</dt>
                <dd className="text-[var(--text)]/70">3348 Szilvásvárad, Dózsa György utca 45.</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-1">Telefon (24 h)</dt>
                <dd>
                  <a href="tel:+36704108282" className="text-[var(--text)] font-medium hover:text-[var(--accent)] transition-colors">
                    +36 70 410-8282
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-1">Email</dt>
                <dd>
                  <a href="mailto:vikivendeghaz@gmail.com" className="text-[var(--text)] font-medium hover:text-[var(--accent)] transition-colors">
                    vikivendeghaz@gmail.com
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-2">Közösségi média</dt>
                <dd className="flex gap-4">
                  <a href="https://facebook.com/vikivendeghaz" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text)]/70 hover:text-[var(--accent)] transition-colors">Facebook</a>
                  <a href="https://instagram.com/vikivendeghaz" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text)]/70 hover:text-[var(--accent)] transition-colors">Instagram</a>
                  <a href="https://tiktok.com/@vikivendeghaz" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text)]/70 hover:text-[var(--accent)] transition-colors">TikTok</a>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-1">Bejelentkezés / kijelentkezés</dt>
                <dd className="text-[var(--text)]/70">Check-in: 15:00-tól · Check-out: 10:00-ig</dd>
              </div>
            </dl>

            <div className="mt-8 rounded-2xl overflow-hidden bg-[var(--surface2)] border border-[var(--border)] h-48 flex items-center justify-center">
              <p className="text-xs uppercase tracking-widest text-[var(--text2)]/40">
                Google Maps – hamarosan
              </p>
            </div>
          </div>

          {/* Kapcsolatform */}
          <div>
            <h2 className="text-3xl text-[var(--text)] mb-6">Üzenjen nekünk</h2>
            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  );
}
