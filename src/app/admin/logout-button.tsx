"use client";

import { logoutAction } from "./actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="px-4 py-2 rounded-full border border-ink/20 text-sm font-sans text-bark hover:border-ink/40 transition-colors"
      >
        Kilépés
      </button>
    </form>
  );
}
