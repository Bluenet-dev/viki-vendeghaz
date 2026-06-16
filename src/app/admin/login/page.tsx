export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session.isLoggedIn) redirect("/admin");

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-salt mb-2">
            Admin belépés
          </p>
          <h1 className="font-display text-3xl text-stone">Viki Vendégház</h1>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
