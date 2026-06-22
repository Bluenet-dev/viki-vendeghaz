import { db } from "@/db";
import { posts } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog" };

export default async function AdminBlogPage() {
  const allPosts = await db.select().from(posts).orderBy(desc(posts.createdAt));

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Blog bejegyzések</h1>
          <p className="text-sm text-[var(--text2)] mt-1">Cikkek kezelése, közzététel és vázlatok.</p>
        </div>
        <Link
          href="/admin/blog/new"
          className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--nav-bg)] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          <IconPlus size={16} stroke={2} /> Új bejegyzés
        </Link>
      </div>

      <div className="bg-[var(--surface)] border-[0.5px] border-[var(--border)] rounded-[10px] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--surface2)]">
            <tr>
              <th className="text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text2)] px-4 py-2.5">Cím</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text2)] px-4 py-2.5">Kategória</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text2)] px-4 py-2.5">Státusz</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text2)] px-4 py-2.5">Dátum</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {allPosts.map((post) => (
              <tr key={post.id} className="border-t-[0.5px] border-[var(--border)] hover:bg-[var(--surface2)]">
                <td className="px-4 py-3 text-[13px] font-medium text-[var(--text)]">{post.title}</td>
                <td className="px-4 py-3 text-[13px] text-[var(--text2)]">{post.category ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={post.published ? badgeActive : badgeNeutral}>
                    {post.published ? "Közzétéve" : "Vázlat"}
                  </span>
                </td>
                <td className="px-4 py-3 text-[13px] text-[var(--text2)]">
                  {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("hu") : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/blog/${post.id}`} className="text-[13px] text-[var(--accent)] hover:underline">
                    Szerkesztés
                  </Link>
                </td>
              </tr>
            ))}
            {allPosts.length === 0 && (
              <tr className="border-t-[0.5px] border-[var(--border)]">
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--text3)] text-sm">
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

const badgeActive = "inline-block px-2 py-0.5 rounded-full text-[11px] bg-[var(--accent-bg)] text-[#3A5A3C]";
const badgeNeutral = "inline-block px-2 py-0.5 rounded-full text-[11px] bg-[var(--surface2)] text-[var(--text2)]";
