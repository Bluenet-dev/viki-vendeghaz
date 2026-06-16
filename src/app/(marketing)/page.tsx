export default function Home() {
  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center text-center px-6">
      {/* Sóbarlang-fény glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 60%, rgba(231,174,142,0.12) 0%, transparent 70%)",
        }}
      />

      <p className="font-mono text-xs uppercase tracking-widest text-salt mb-4">
        Szilvásvárad · Bükki Nemzeti Park
      </p>

      <h1 className="font-display text-5xl sm:text-7xl text-stone font-light leading-tight max-w-3xl">
        Pihenés a sóbarlang fényénél
      </h1>

      <p className="mt-6 text-mist/70 text-lg max-w-xl leading-relaxed">
        Három szoba, sóbarlang, finn szauna, infraszauna, dézsafürdő és kert –
        az erdő szélén, a Szalajka-völgy kapujában.
      </p>

      <div className="mt-10 flex flex-col sm:flex-row gap-4">
        <a
          href="/foglalas"
          className="px-8 py-3 rounded-full bg-salt text-bark font-sans font-medium hover:bg-salt/90 transition-colors"
        >
          Foglaljon szobát
        </a>
        <a
          href="/szobak"
          className="px-8 py-3 rounded-full border border-mist/30 text-mist font-sans font-medium hover:border-salt hover:text-salt transition-colors"
        >
          Szobáink
        </a>
      </div>

      {/* Blaze csík – turista-jelzés motívum */}
      <div className="mt-16 flex gap-1 items-center">
        <div className="w-8 h-2 bg-moss rounded-sm" />
        <div className="w-8 h-2 bg-salt rounded-sm" />
      </div>
    </div>
  );
}
