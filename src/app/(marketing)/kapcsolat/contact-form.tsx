"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-moss/15 flex items-center justify-center mb-5">
          <span className="text-moss text-2xl">✓</span>
        </div>
        <h3 className="font-display text-2xl text-ink mb-2">Üzenet elküldve!</h3>
        <p className="text-bark/60 max-w-xs leading-relaxed">
          Köszönjük megkeresését. Hamarosan felvesszük Önnel a kapcsolatot.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-6 text-sm text-moss hover:underline"
        >
          Új üzenet küldése
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-mono text-xs uppercase tracking-widest text-bark/60 mb-1.5" htmlFor="name">
          Neve
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className={input}
          placeholder="Kiss János"
        />
      </div>
      <div>
        <label className="block font-mono text-xs uppercase tracking-widest text-bark/60 mb-1.5" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className={input}
          placeholder="email@example.com"
        />
      </div>
      <div>
        <label className="block font-mono text-xs uppercase tracking-widest text-bark/60 mb-1.5" htmlFor="phone">
          Telefon (opcionális)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className={input}
          placeholder="+36 70 ..."
        />
      </div>
      <div>
        <label className="block font-mono text-xs uppercase tracking-widest text-bark/60 mb-1.5" htmlFor="message">
          Üzenet
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className={`${input} resize-none`}
          placeholder="Miben segíthetünk?"
        />
      </div>

      {status === "error" && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
          Küldés sikertelen. Kérjük próbálja újra, vagy hívjon minket.
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full py-3 rounded-full bg-salt text-bark font-sans font-medium hover:bg-salt/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "sending" ? "Küldés..." : "Üzenet küldése"}
      </button>
      <p className="text-xs text-bark/40 text-center">
        Az adatkezelési tájékoztatót{" "}
        <a href="/adatvedelem" className="underline hover:text-bark/60">itt</a>{" "}
        olvashatja.
      </p>
    </form>
  );
}

const input =
  "w-full px-4 py-3 rounded-lg bg-white border border-ink/15 text-ink placeholder-ink/30 focus:outline-none focus:border-moss transition-colors";
