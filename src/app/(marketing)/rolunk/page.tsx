import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rólunk | Viki Vendégház Szilvásvárad – 2015 óta",
  description:
    "A Viki Vendégház 2015 óta várja vendégeit Szilvásváradon, a Szalajka-völgy kapujánál. Ismerje meg történetünket és azt, ami megkülönböztet minket.",
};

export default function RolunkPage() {
  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      <section className="bg-[var(--nav-bg)] py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Rólunk</p>
          <h1 className="text-5xl sm:text-6xl text-white font-light mb-6">
            A Viki Vendégház története
          </h1>
          <p className="text-[var(--nav-text)]/80 text-lg leading-relaxed max-w-2xl">
            A Bükk lábánál, Szilvásvárad szívében egy álom vált valóra – 2015 tavaszán.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-3xl space-y-8 text-[var(--text)]/75 leading-relaxed text-lg">
          <p>
            A Bükk lábánál, Szilvásvárad szívében egy család addig csak álmaiban
            és terveiben élt a vendégház lehetőség ötletével. Ahogy telt az idő,
            egyre közelebb kerültek a megvalósítás felé, míg 2015 tavaszán az
            álmok valóra váltak: megnyílt a Viki Vendégház.
          </p>
          <p>
            Minőségi bútorok, gondosan kialakított szobák, saját fürdőszoba
            minden szobához – és olyan részletek, amelyek csak akkor tűnnek fel,
            amikor valóban jól érzi magát. Büszkék vagyunk arra, hogy
            vendégeink évről évre visszatérnek.
          </p>
          <p>
            Vendégházunk Szilvásvárad központjában helyezkedik el, csupán egy
            perc sétára a festői Szalajka-völgy bejáratától, mégis távol a város
            zajától. Három külön bejáratú, tágas szobánk saját fürdőszobával
            várja Önt és szeretteit – ideális pároknak, családoknak és baráti
            társaságoknak egyaránt.
          </p>
          <blockquote className="border-l-2 border-[var(--accent2)] pl-6 my-8 text-2xl text-[var(--text)] font-light leading-snug">
            &ldquo;Modern és kényelmes szállásunk Szilvásvárad szívében várja Önt
            és szeretteit egy felejthetetlen pihenésre és kikapcsolódásra.&rdquo;
          </blockquote>
          <p>
            Büszkék vagyunk arra, hogy vendégeink évről évre visszatérnek – és
            hogy a Booking.com-on 9.5, a Szállás.hu-n 9.9 értékelést
            kaptunk tőlük. Köszönjük a bizalmat!
          </p>
        </div>

        {/* Tények */}
        <div className="mx-auto max-w-3xl mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: "Alapítás éve", value: "2015" },
            { label: "Szobák száma", value: "3" },
            { label: "Maximális kapacitás", value: "12 fő" },
            { label: "Booking értékelés", value: "9.5 ★" },
          ].map((f) => (
            <div key={f.label} className="text-center p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <p className="text-3xl text-[var(--text)]">{f.value}</p>
              <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mt-2">{f.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
