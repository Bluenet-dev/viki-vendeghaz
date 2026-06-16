import { db } from "@/db";
import { posts } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog" };

export default async function AdminBlogPage() {
  const allPosts = await db.select().from(posts).orderBy(desc(posts.createdAt));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-semibold">Blog bejegyzések</h1>
        <Link
          href="/admin/blog/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
        >
          + Új bejegyzés
        </Link>
      </div>

      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400 uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Cím</th>
              <th className="px-4 py-3 text-left">Kategória</th>
              <th className="px-4 py-3 text-left">Státusz</th>
              <th className="px-4 py-3 text-left">Dátum</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {allPosts.map((post) => (
              <tr key={post.id} className="hover:bg-gray-900/50">
                <td className="px-4 py-3 font-medium">{post.title}</td>
                <td className="px-4 py-3 text-gray-400">{post.category ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${post.published ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-400"}`}>
                    {post.published ? "Közzétéve" : "Vázlat"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("hu") : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/blog/${post.id}`} className="text-blue-400 hover:text-blue-300 text-sm">
                    Szerkesztés
                  </Link>
                </td>
              </tr>
            ))}
            {allPosts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                  Még nincs bejegyzés. Kattints az „Új bejegyzés" gombra!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
