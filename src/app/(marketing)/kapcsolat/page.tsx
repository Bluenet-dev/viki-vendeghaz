import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kapcsolat",
  description:
    "Viki Vendégház – 3348 Szilvásvárad, Dózsa György utca 45. Telefon: +36 70 410-8282. Email: vikivendeghaz@gmail.com.",
};

export default function KapcsolatPage() {
  return (
    <div className="pt-16 bg-stone min-h-screen">
      <section className="bg-ink py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-widest text-salt mb-4">Kapcsolat</p>
          <h1 className="font-display text-5xl sm:text-6xl text-stone font-light mb-6">
            Írjon vagy hívjon!
          </h1>
          <p className="text-mist/70 text-lg max-w-xl">
            24 órás ügyeleten elérhető vagyunk – foglalási kérdésben, egyedi
            ajánlatkérésnél vagy bármilyen információra van szüksége.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-12">
          {/* Elérhetőségek */}
          <div>
            <h2 className="font-display text-3xl text-ink mb-6">Elérhetőségeink</h2>
            <dl className="space-y-5">
              <div>
                <dt className="font-mono text-xs uppercase tracking-widest text-salt mb-1">Cím</dt>
                <dd className="text-bark/70">3348 Szilvásvárad, Dózsa György utca 45.</dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase tracking-widest text-salt mb-1">Telefon (24 h)</dt>
                <dd>
                  <a href="tel:+36704108282" className="text-ink font-medium hover:text-moss transition-colors">
                    +36 70 410-8282
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase tracking-widest text-salt mb-1">Email</dt>
                <dd>
                  <a href="mailto:vikivendeghaz@gmail.com" className="text-ink font-medium hover:text-moss transition-colors">
                    vikivendeghaz@gmail.com
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase tracking-widest text-salt mb-2">Közösségi média</dt>
                <dd className="flex gap-4">
                  <a href="https://facebook.com/vikivendeghaz" target="_blank" rel="noopener noreferrer" className="text-sm text-bark/70 hover:text-moss transition-colors">Facebook</a>
                  <a href="https://instagram.com/vikivendeghaz" target="_blank" rel="noopener noreferrer" className="text-sm text-bark/70 hover:text-moss transition-colors">Instagram</a>
                  <a href="https://tiktok.com/@vikivendeghaz" target="_blank" rel="noopener noreferrer" className="text-sm text-bark/70 hover:text-moss transition-colors">TikTok</a>
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase tracking-widest text-salt mb-1">Bejelentkezés / kijelentkezés</dt>
                <dd className="text-bark/70">Check-in: 15:00-tól · Check-out: 10:00-ig</dd>
              </div>
            </dl>

            {/* Térkép embed placeholder */}
            <div className="mt-8 rounded-2xl overflow-hidden bg-ink/5 border border-ink/10 h-48 flex items-center justify-center">
              <p className="font-mono text-xs uppercase tracking-widest text-mist/40">
                Google Maps – hamarosan
              </p>
            </div>
          </div>

          {/* Kapcsolatform */}
          <div>
            <h2 className="font-display text-3xl text-ink mb-6">Üzenjen nekünk</h2>
            <form className="space-y-4" action="/api/contact" method="POST">
              <div>
                <label className="block font-mono text-xs uppercase tracking-widest text-bark/60 mb-1.5" htmlFor="name">Neve</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white border border-ink/15 text-ink placeholder-ink/30 focus:outline-none focus:border-moss transition-colors"
                  placeholder="Kiss János"
                />
              </div>
              <div>
                <label className="block font-mono text-xs uppercase tracking-widest text-bark/60 mb-1.5" htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white border border-ink/15 text-ink placeholder-ink/30 focus:outline-none focus:border-moss transition-colors"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block font-mono text-xs uppercase tracking-widest text-bark/60 mb-1.5" htmlFor="phone">Telefon (opcionális)</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="w-full px-4 py-3 rounded-lg bg-white border border-ink/15 text-ink placeholder-ink/30 focus:outline-none focus:border-moss transition-colors"
                  placeholder="+36 70 ..."
                />
              </div>
              <div>
                <label className="block font-mono text-xs uppercase tracking-widest text-bark/60 mb-1.5" htmlFor="message">Üzenet</label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg bg-white border border-ink/15 text-ink placeholder-ink/30 focus:outline-none focus:border-moss transition-colors resize-none"
                  placeholder="Miben segíthetünk?"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-full bg-salt text-bark font-sans font-medium hover:bg-salt/90 transition-colors"
              >
                Üzenet küldése
              </button>
              <p className="text-xs text-bark/40 text-center">
                Az adatkezelési tájékoztatót{" "}
                <a href="/adatvedelem" className="underline hover:text-bark/60">itt</a>{" "}
                olvashatja.
              </p>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
