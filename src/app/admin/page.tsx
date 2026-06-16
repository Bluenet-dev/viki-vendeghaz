export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LogoutButton } from "./logout-button";

export default async function AdminPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-stone p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-salt mb-1">
              Admin felület
            </p>
            <h1 className="font-display text-3xl text-ink">Viki Vendégház</h1>
          </div>
          <LogoutButton />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Szobák & árak", href: "/admin/szobak", icon: "🛏" },
            { label: "Csomagok", href: "/admin/csomagok", icon: "🎁" },
            { label: "Foglalások / Naptár", href: "/admin/naptar", icon: "📅" },
            { label: "Galéria", href: "/admin/galeria", icon: "🖼" },
            { label: "GYIK", href: "/admin/gyik", icon: "❓" },
            { label: "Üzenetek", href: "/admin/uzenetek", icon: "✉️" },
            { label: "Blog", href: "/admin/blog", icon: "✍️" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex flex-col gap-2 p-6 rounded-xl bg-white border border-ink/10 hover:border-salt/50 hover:shadow-md transition-all"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="font-sans text-sm font-medium text-bark">
                {item.label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
