import type { Metadata } from "next";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Blog – Szilvásvárad tippek & élmények",
  description:
    "Túra-útmutatók, wellness-tippek és szilvásváradi élmények a Viki Vendégház blogjából. Szalajka-völgy, Bükki Nemzeti Park, sóbarlang.",
};

const CATEGORY_LABELS: Record<string, string> = {
  turak: "Túrák & természet",
  wellness: "Wellness & pihenés",
  szilvasvarad: "Szilvásvárad",
  etkezes: "Ételek & receptek",
  hirek: "Hírek & ajánlatok",
};

export default async function BlogPage() {
  const publishedPosts = await db
    .select()
    .from(posts)
    .where(eq(posts.published, true))
    .orderBy(desc(posts.publishedAt));

  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      <section className="bg-[var(--nav-bg)] py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Blog</p>
          <h1 className="text-5xl sm:text-6xl text-white font-light mb-6">
            Tippek & szilvásvárad
          </h1>
          <p className="text-[var(--text2)]/70 text-lg max-w-xl">
            Túra-útmutatók, wellness-tippek és szilvásváradi élmények –
            közvetlenül a vendégháztól.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl">
          {publishedPosts.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-8">
              {publishedPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden hover:border-[var(--border)] transition-colors"
                >
                  {post.coverImageUrl && (
                    <div className="relative aspect-video bg-[var(--surface2)]">
                      <Image
                        src={post.coverImageUrl}
                        alt={post.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 50vw"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    {post.category && (
                      <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-2">
                        {CATEGORY_LABELS[post.category] ?? post.category}
                      </p>
                    )}
                    <h2 className="text-xl text-[var(--text)] group-hover:text-[var(--accent)] transition-colors mb-2">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-[var(--text)]/60 text-sm leading-relaxed line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}
                    <p className="mt-4 text-xs text-[var(--text)]/40">
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString("hu-HU", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-2xl text-[var(--text)] mb-3">Cikkek hamarosan</p>
              <p className="text-[var(--text)]/50">
                Hamarosan feltöltjük az első túra-útmutatókat és szilvásváradi élménybeszámolókat.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
