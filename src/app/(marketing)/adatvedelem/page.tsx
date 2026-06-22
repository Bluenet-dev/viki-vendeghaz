import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Adatvédelmi tájékoztató",
  description: "Viki Vendégház adatvédelmi tájékoztatója – GDPR-konform adatkezelési információk.",
};

export default function AdatvedelemPage() {
  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      <section className="bg-[var(--nav-bg)] py-16 px-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Jogi</p>
          <h1 className="text-4xl text-white font-light">Adatvédelmi tájékoztató</h1>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="mx-auto max-w-3xl prose prose-bark">
          <div className="space-y-6 text-[var(--text)]/75 leading-relaxed">
            <div>
              <h2 className="text-2xl text-[var(--text)] mb-2">Adatkezelő</h2>
              <p>Kiss Józsefné (Viki Vendégház)<br />
              3348 Szilvásvárad, Dózsa György utca 45.<br />
              Adószám: 52477937-1-30<br />
              Email: vikivendeghaz@gmail.com<br />
              Telefon: +36 70 410-8282</p>
            </div>

            <div>
              <h2 className="text-2xl text-[var(--text)] mb-2">Kezelt adatok és céljuk</h2>
              <p>A kapcsolatfelvételi és foglalási kérés formanyomtatványon megadott személyes adatokat (név, email-cím, telefonszám, üzenet) kizárólag a kapcsolatfelvétel megválaszolásához és a foglalás lebonyolításához használjuk.</p>
              <p>Az adatokat harmadik féllel nem osztjuk meg, marketing célokra nem használjuk fel.</p>
            </div>

            <div>
              <h2 className="text-2xl text-[var(--text)] mb-2">Megőrzési idő</h2>
              <p>A kapcsolatfelvételi adatokat az ügy lezárásától számított 1 évig őrizzük meg. Foglalási adatokat a vonatkozó jogszabályi előírásoknak megfelelően (számviteli törvény) tároljuk.</p>
            </div>

            <div>
              <h2 className="text-2xl text-[var(--text)] mb-2">Érintetti jogok</h2>
              <p>Ön jogosult hozzáférni személyes adataihoz, azok helyesbítését, törlését, vagy kezelésének korlátozását kérni. Jogorvoslati joggal élhet a Nemzeti Adatvédelmi és Információszabadság Hatóságnál (naih.hu).</p>
            </div>

            <div>
              <h2 className="text-2xl text-[var(--text)] mb-2">Sütik (cookie-k)</h2>
              <p>Az oldal session-kezelési célból egy technikailag szükséges munkamenet-sütit alkalmaz. Harmadik fél analitikai vagy marketing sütiket jelenleg nem használunk.</p>
            </div>

            <p className="text-xs text-[var(--text)]/40 border-t border-[var(--border)] pt-4 mt-8">
              Utoljára frissítve: 2025. június. Kérdés esetén írjon a vikivendeghaz@gmail.com címre.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
