"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { saveUploadedImage } from "./actions";
import { GALLERY_CATEGORIES } from "@/lib/gallery-categories";

const input =
  "mt-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[14px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] block";
const lbl = "text-xs text-[var(--text2)] uppercase tracking-wide";

type FileStatus = "pending" | "uploading" | "done" | "error";
interface FileProgress {
  name: string;
  status: FileStatus;
  error?: string;
}

export function UploadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<FileProgress[]>([]);
  const [doneCount, setDoneCount] = useState(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const category = (form.elements.namedItem("category") as HTMLSelectElement).value;
    const altBase = (form.elements.namedItem("alt") as HTMLInputElement).value;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const files = Array.from(fileInput.files ?? []);

    if (files.length === 0) {
      setProgress([{ name: "", status: "error", error: "Nincs kiválasztott képfájl." }]);
      return;
    }

    setPending(true);
    setDoneCount(0);
    setProgress(files.map((f) => ({ name: f.name, status: "pending" })));

    // Egyenként, sorban töltjük fel – így nem terheli túl a feltöltési
    // sávszélességet, és minden fájl állapota külön-külön követhető.
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress((prev) => prev.map((p, idx) => (idx === i ? { ...p, status: "uploading" } : p)));
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30_000);
        let blob;
        try {
          blob = await upload(`gallery/${category}/${file.name}`, file, {
            access: "public",
            handleUploadUrl: "/api/gallery/upload",
            clientPayload: JSON.stringify({ category }),
            abortSignal: controller.signal,
            // Egyetlen PUT kérésben csak limitált méretig fogadja a Blob API;
            // afölött (pl. telefonos fotók 5-8+ MB) kötelező a multipart mód,
            // különben 400 Bad Request jön vissza (ezt diagnosztizáltuk élesben).
            multipart: true,
          });
        } finally {
          clearTimeout(timeout);
        }
        const alt = files.length > 1 ? (altBase ? `${altBase} ${i + 1}` : "") : altBase;
        const res = await saveUploadedImage({ url: blob.url, alt, category });
        if (res?.error) {
          setProgress((prev) => prev.map((p, idx) => (idx === i ? { ...p, status: "error", error: res.error } : p)));
        } else {
          setProgress((prev) => prev.map((p, idx) => (idx === i ? { ...p, status: "done" } : p)));
          setDoneCount((c) => c + 1);
        }
      } catch (err) {
        const isAbort = err instanceof Error && err.name === "AbortError";
        const msg = isAbort
          ? "időtúllépés (30mp) – a kapcsolat elakadt a tárhellyel, próbáld más hálózatról/böngészőből"
          : err instanceof Error ? err.message : "ismeretlen hiba";
        setProgress((prev) => prev.map((p, idx) => (idx === i ? { ...p, status: "error", error: msg } : p)));
      }
    }

    setPending(false);
    formRef.current?.reset();
    router.refresh();
  }

  const total = progress.length;
  const hasError = progress.some((p) => p.status === "error");

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
          <label className={lbl}>Képfájlok</label>
          <input
            type="file"
            name="file"
            accept="image/*"
            multiple
            required
            className="mt-1 text-sm text-[var(--text2)] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[var(--surface2)] file:text-[var(--text)] hover:file:bg-[var(--border)]"
          />
          <p className="mt-1 text-[11px] text-[var(--text3)]">Több kép is kijelölhető egyszerre (Ctrl/Cmd + kattintás).</p>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 rounded-md bg-[var(--nav-bg)] text-white text-[14px] font-semibold hover:opacity-90 transition-opacity self-end disabled:opacity-50"
        >
          {pending ? `Feltöltés… (${doneCount}/${total})` : "Feltöltés"}
        </button>
      </form>

      {progress.length > 0 && (
        <div className="mt-4 space-y-1">
          {progress.map((p, i) => (
            <div key={i} className="flex items-center justify-between text-sm px-3 py-1.5 rounded-md bg-[var(--surface2)]">
              <span className="text-[var(--text)] truncate max-w-[60%]">{p.name || "—"}</span>
              {p.status === "pending" && <span className="text-[var(--text3)]">várakozik</span>}
              {p.status === "uploading" && <span className="text-[var(--accent2)]">feltöltés…</span>}
              {p.status === "done" && <span className="text-[#3A5A3C]">✓ kész</span>}
              {p.status === "error" && <span className="text-[#C44]">✗ {p.error}</span>}
            </div>
          ))}
        </div>
      )}

      {!pending && total > 0 && !hasError && doneCount === total && (
        <p className="mt-3 text-sm text-[#3A5A3C] bg-[var(--accent-bg)] rounded-md px-3 py-2">
          {total > 1 ? `Mind a(z) ${total} kép sikeresen feltöltve.` : "Kép sikeresen feltöltve."}
        </p>
      )}
    </div>
  );
}
