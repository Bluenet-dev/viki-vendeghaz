"use client";

export default function GalleryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-lg">
      <div className="border-[0.5px] border-[#F09595] bg-[#FCEBEB] rounded-[10px] p-6">
        <h2 className="text-lg font-semibold text-[var(--text)]">Hiba a galéria betöltésekor</h2>
        <p className="text-sm text-[var(--text2)] mt-2">
          {error.message || "Váratlan hiba történt. Próbáld újra."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 px-5 py-2 rounded-md bg-[var(--nav-bg)] text-white text-[14px] font-semibold hover:opacity-90 transition-opacity"
        >
          Újrapróbálás
        </button>
      </div>
    </div>
  );
}
