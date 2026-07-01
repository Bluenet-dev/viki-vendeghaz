import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impresszum",
  description: "Viki Vendégház impresszum – cégadatok, NTAK szám, adószám, bankszámlaszám.",
};

export default function ImpresszumPage() {
  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      <section className="bg-[var(--nav-bg)] py-16 px-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Jogi</p>
          <h1 className="text-4xl text-white font-light">Impresszum</h1>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="mx-auto max-w-3xl">
          <dl className="divide-y divide-[var(--border)]">
            {[
              { label: "Szálláshely neve", value: "Viki Vendégház" },
              { label: "Tulajdonos / üzemeltető", value: "Kiss Józsefné" },
              { label: "Székhely", value: "3348 Szilvásvárad, Dózsa György utca 45." },
              { label: "Adószám", value: "52477937-1-30" },
              { label: "NTAK regisztrációs szám", value: "MA22031772" },
              { label: "Bankszámlaszám", value: "50462779-10005659" },
              { label: "IBAN", value: "HU07-5046-2779-1000-5659-0000-0000" },
              { label: "Bank", value: "MBH Bank Nyrt." },
              { label: "Telefon", value: "+36 70 410-8282" },
              { label: "Email", value: "vikivendeghaz@gmail.com" },
              { label: "Tárhelyszolgáltató", value: "Vercel Inc., 340 Pine Street Suite 701, San Francisco, CA 94104" },
            ].map((r) => (
              <div key={r.label} className="py-4 grid grid-cols-2 gap-4">
                <dt className="text-xs uppercase tracking-widest text-[var(--accent2)]">{r.label}</dt>
                <dd className="text-[var(--text)]/75 text-sm">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
