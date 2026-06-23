import type { Metadata } from "next";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Kapcsolat & foglalás | Viki Vendégház Szilvásvárad",
  description:
    "Lépjen kapcsolatba a Viki Vendégházzal: +36 70 410-8282, vikivendeghaz@gmail.com. 3348 Szilvásvárad, Dózsa György utca 45. Foglalási kérdés, egyedi ajánlat – szívesen segítünk.",
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
            Foglalási kérdésben, egyedi ajánlatkérésnél vagy bármilyen
            információra van szüksége – szívesen segítünk.
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
                <dt className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-1">Telefon</dt>
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

            <div className="mt-8 rounded-2xl overflow-hidden border border-[var(--border)]" style={{ height: 400 }}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2664.5941719926072!2d20.386680613185973!3d48.09877277111925!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x474086ca60ca450f%3A0x764d76a437708b7c!2zU3ppbHbDoXN2w6FyYWQsIETDs3pzYSBHecO2cmd5IHUuIDQ1LCAzMzQ4!5e0!3m2!1shu!2shu!4v1782232631403!5m2!1shu!2shu"
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Viki Vendégház – Szilvásvárad, Dózsa György utca 45."
              />
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
