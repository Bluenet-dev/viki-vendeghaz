import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Tippek, útmutatók és szilvásváradi élmények a Viki Vendégház blogjáról.",
};

export default function BlogPage() {
  return (
    <div className="pt-16 bg-stone min-h-screen">
      <section className="bg-ink py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-widest text-salt mb-4">Blog</p>
          <h1 className="font-display text-5xl sm:text-6xl text-stone font-light mb-6">
            Tippek & szilvásvárad
          </h1>
          <p className="text-mist/70 text-lg max-w-xl">
            Túra-útmutatók, wellness-tippek és szilvásváradi élmények –
            hamarosan.
          </p>
        </div>
      </section>
      <section className="py-20 px-6 text-center">
        <p className="font-display text-2xl text-ink mb-3">Cikkek hamarosan</p>
        <p className="text-bark/50">Az első blogbejegyzések Fázis 4-ben jelennek meg.</p>
      </section>
    </div>
  );
}
