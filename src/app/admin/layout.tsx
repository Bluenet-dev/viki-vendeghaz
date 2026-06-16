import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "/admin", label: "Áttekintés" },
  { href: "/admin/szobak", label: "Szobák" },
  { href: "/admin/csomagok", label: "Csomagok" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/gyik", label: "GYIK" },
  { href: "/admin/galeria", label: "Galéria" },
  { href: "/admin/uzenetek", label: "Üzenetek" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 flex flex-col shrink-0">
        <div className="px-5 py-6 border-b border-gray-800">
          <span className="font-display text-lg text-white">Viki Admin</span>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-0.5 px-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-800">
          <LogoutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 p-8">{children}</main>
    </div>
  );
}
