export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session.isLoggedIn) redirect("/admin");

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--nav-bg)]">
      <div className="w-full max-w-[380px] bg-[var(--surface)] rounded-xl p-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[var(--text)]">
            BlueNet CMS <span className="text-[var(--accent2)] font-normal">v1.0</span>
          </h1>
          <p className="text-xs text-[var(--text2)] mt-1">Viki Vendégház · Szilvásvárad · Szállás – bejelentkezés</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
