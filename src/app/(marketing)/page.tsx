import Link from "next/link";

const reviews = [
  {
    text: "Csak pozitív tapasztalataim vannak, nagyon kedves és segítőkész a vendéglátó. Nagyon tiszta minden helyiség, és a környezet is szép. Igazi bababarát hely.",
    author: "Rimóczi Sándor",
  },
  {
    text: "A szállás ár-érték arányban tökéletes. A weboldalra feltöltött képek teljesen megegyeznek a valósággal. A Superior franciaágyas szoba gyönyörű, tiszta, kellemes hangulatú.",
    author: "Fiatal pár",
  },
  {
    text: "A szállás maximálisan kielégítette a hozzáfűzött elvárásainkat. Maximálisan bababarát hely. Nagyon élveztük a medence és dézsafürdő adta lehetőségeket is. Visszatérünk még! 10⭐️",
    author: "Suller Mónika",
  },
];

const wellnessItems = [
  { name: "Sóbarlang", desc: "5 tonna só, 14 m², himalája és parajdi só", href: "/wellness/sobarlang" },
  { name: "Finn szauna", desc: "Hagyományos gőzszauna, 1 500 Ft/fő/óra", href: "/wellness/finn-szauna" },
  { name: "Infraszauna", desc: "Kíméletes infravörös melegítés, Superior vendégeknek", href: "/wellness/infraszauna" },
  { name: "Dézsafürdő", desc: "Csillagos égbolt alatt, télen-nyáron", href: "/wellness/dezsafurdo" },
  { name: "Kert & medence", desc: "Kültéri fa medence, tavasztól őszig", href: "/wellness/kert-medence" },
];

export default function Home() {
  return (
    <>
      {/* ─── Hero ─── */}
      <section className="relative min-h-screen bg-ink flex flex-col items-center justify-center text-center px-6 pt-16">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 65%, rgba(231,174,142,0.13) 0%, transparent 70%)",
          }}
        />
        <p className="relative font-mono text-xs uppercase tracking-widest text-salt mb-5">
          Szilvásvárad · Bükki Nemzeti Park · 1 perc a Szalajka-völgytől
        </p>
        <h1 className="relative font-display text-5xl sm:text-7xl text-stone font-light leading-tight max-w-3xl">
          Pihenés a sóbarlang fényénél
        </h1>
        <p className="relative mt-6 text-mist/70 text-lg max-w-xl leading-relaxed">
          Három tágas szoba saját fürdőszobával, sóbarlang, finn szauna,
          infraszauna, dézsafürdő és kert – az erdő szélén, 12 fő részére.
        </p>
        <div className="relative mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            href="/foglalas"
            className="px-8 py-3 rounded-full bg-salt text-bark font-sans font-medium hover:bg-salt/90 transition-colors"
          >
            Foglaljon szobát
          </Link>
          <Link
            href="/szobak"
            className="px-8 py-3 rounded-full border border-mist/30 text-mist font-sans font-medium hover:border-salt hover:text-salt transition-colors"
          >
            Szobáink
          </Link>
        </div>
        <div className="relative mt-14 flex items-center gap-3 text-xs font-mono text-mist/40 uppercase tracking-widest">
          <span>Booking.com 9.5 ★</span>
          <span className="text-mist/20">·</span>
          <span>Szállás.hu 9.9 ★</span>
        </div>
        <div className="relative mt-6 flex gap-1">
          <div className="w-8 h-2 bg-moss rounded-sm" />
          <div className="w-8 h-2 bg-salt rounded-sm" />
        </div>
      </section>

      {/* ─── Wellness – 5 kártya ─── */}
      <section className="bg-stone py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs uppercase tracking-widest text-salt mb-3">Wellness</p>
          <h2 className="font-display text-4xl text-ink mb-10">Öt út a megújuláshoz</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {wellnessItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="group p-6 rounded-2xl bg-white border border-ink/8 hover:border-salt/40 hover:shadow-md transition-all"
              >
                <div className="flex gap-1 mb-4">
                  <div className="w-5 h-1.5 bg-moss rounded-sm" />
                  <div className="w-5 h-1.5 bg-salt rounded-sm" />
                </div>
                <p className="font-display text-lg text-ink group-hover:text-moss transition-colors">{item.name}</p>
                <p className="mt-2 text-sm text-bark/60 leading-relaxed">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Szobák teaser ─── */}
      <section className="bg-ink py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs uppercase tracking-widest text-salt mb-3">Szobák</p>
          <h2 className="font-display text-4xl text-stone mb-4">3 szoba, 12 vendég, 1 élmény</h2>
          <p className="text-mist/70 max-w-xl leading-relaxed mb-10">
            Minden szoba külön bejáratú, saját fürdőszobával felszerelt. Ideális
            pároknak, családoknak és baráti társaságoknak egyaránt.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "1-es szoba", slug: "szoba-1", highlight: "Tágas, kényelmes" },
              { name: "2-es szoba", slug: "szoba-2", highlight: "Tágas, kényelmes" },
              { name: "Superior szoba", slug: "superior", highlight: "Franciaágy · Infraszauna" },
            ].map((room) => (
              <Link
                key={room.slug}
                href={`/szobak#${room.slug}`}
                className="group p-6 rounded-2xl border border-mist/10 hover:border-salt/30 transition-all"
              >
                <p className="font-mono text-xs uppercase tracking-widest text-salt mb-3">{room.highlight}</p>
                <p className="font-display text-2xl text-stone group-hover:text-salt transition-colors">{room.name}</p>
                <p className="mt-4 text-sm text-mist/50 group-hover:text-mist/70 transition-colors">Részletek →</p>
              </Link>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href="/szobak"
              className="inline-flex px-6 py-2.5 rounded-full border border-mist/30 text-mist text-sm hover:border-salt hover:text-salt transition-colors"
            >
              Összes szoba & árak
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Vendégvélemények ─── */}
      <section className="bg-stone py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs uppercase tracking-widest text-salt mb-3">Vélemények</p>
          <h2 className="font-display text-4xl text-ink mb-10">Amit vendégeink mondanak</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((r) => (
              <figure
                key={r.author}
                className="p-6 rounded-2xl bg-white border border-ink/8"
              >
                <blockquote className="text-bark/80 text-sm leading-relaxed italic">
                  &ldquo;{r.text}&rdquo;
                </blockquote>
                <figcaption className="mt-4 font-mono text-xs uppercase tracking-widest text-salt">
                  — {r.author}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA sáv ─── */}
      <section className="bg-moss py-16 px-6 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-stone/70 mb-3">Szilvásvárad vár</p>
        <h2 className="font-display text-4xl text-stone mb-6">Foglaljon most, pihenjen hamarosan</h2>
        <Link
          href="/foglalas"
          className="inline-flex px-8 py-3 rounded-full bg-salt text-bark font-sans font-medium hover:bg-salt/90 transition-colors"
        >
          Foglalás & elérhetőség
        </Link>
      </section>
    </>
  );
}
