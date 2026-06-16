"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export function LoginForm() {
  const [error, formAction, pending] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="password"
          className="block font-mono text-xs uppercase tracking-widest text-mist mb-2"
        >
          Jelszó
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full px-4 py-3 rounded-lg bg-ink border border-mist/20 text-stone placeholder-mist/30 focus:outline-none focus:border-salt transition-colors"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400 font-sans">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 rounded-full bg-salt text-bark font-sans font-medium hover:bg-salt/90 disabled:opacity-50 transition-colors"
      >
        {pending ? "Belépés..." : "Belépés"}
      </button>
    </form>
  );
}
