"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { saveUploadedImage } from "./actions";
import { GALLERY_CATEGORIES } from "@/lib/gallery-categories";

const input =
  "mt-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[14px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] block";
const lbl = "text-xs text-[var(--text2)] uppercase tracking-wide";

export function UploadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);

    const form = e.currentTarget;
    const category = (form.elements.namedItem("category") as HTMLSelectElement).value;
    const alt = (form.elements.namedItem("alt") as HTMLInputElement).value;
    const file = (form.elements.namedItem("file") as HTMLInputElement).files?.[0];

    if (!file) {
      setError("Nincs kiválasztott képfájl.");
      return;
    }

    setPending(true);
    try {
      // A fájl közvetlenül a böngészőből kerül a Blob tárolóba (nincs body-limit).
      const blob = await upload(`gallery/${category}/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/gallery/upload",
        clientPayload: JSON.stringify({ category }),
      });

      const res = await saveUploadedImage({ url: blob.url, alt, category });
      if (res?.error) {
        setError(res.error);
      } else {
        setOk(true);
        formRef.current?.reset();
        router.refresh();
      }
    } catch (err) {
      setError(
        "Feltöltési hiba: " + (err instanceof Error ? err.message : "ismeretlen hiba"),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="border-[0.5px] border-[var(--border)] rounded-[10px] bg-[var(--surface)] p-5 mb-8">
      <h2 className="text-sm font-medium text-[var(--text)] mb-4">Kép feltöltése</h2>
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div>
          <label className={lbl}>Kategória</label>
          <select name="category" className={input} defaultValue={GALLERY_CATEGORIES[0].value}>
            {GALLERY_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl}>Leírás (alt)</label>
          <input name="alt" placeholder="pl. Sóbarlang belső" className={input} />
        </div>
        <div>
          <label className={lbl}>Képfájl</label>
          <input
            type="file"
            name="file"
            accept="image/*"
            required
            className="mt-1 text-sm text-[var(--text2)] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[var(--surface2)] file:text-[var(--text)] hover:file:bg-[var(--border)]"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 rounded-md bg-[var(--nav-bg)] text-white text-[14px] font-semibold hover:opacity-90 transition-opacity self-end disabled:opacity-50"
        >
          {pending ? "Feltöltés…" : "Feltöltés"}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-[#C44] bg-[#FCEBEB] rounded-md px-3 py-2">{error}</p>
      )}
      {ok && (
        <p className="mt-3 text-sm text-[#3A5A3C] bg-[var(--accent-bg)] rounded-md px-3 py-2">
          Kép sikeresen feltöltve.
        </p>
      )}
    </div>
  );
}
