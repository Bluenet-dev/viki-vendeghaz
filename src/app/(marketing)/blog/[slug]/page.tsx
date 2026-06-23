import type { Metadata } from "next";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [post] = await db.select().from(posts).where(eq(posts.slug, slug));
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      images: post.coverImageUrl ? [post.coverImageUrl] : [],
      type: "article",
    },
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  turak: "Túrák & természet",
  wellness: "Wellness & pihenés",
  szilvasvarad: "Szilvásvárad",
  etkezes: "Ételek & receptek",
  hirek: "Hírek & ajánlatok",
};

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post] = await db.select().from(posts).where(eq(posts.slug, slug));

  if (!post || !post.published) notFound();

  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      {/* Hero */}
      <section className="bg-[var(--nav-bg)] py-20 px-6">
        <div className="mx-auto max-w-3xl">
          {post.category && (
            <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">
              {CATEGORY_LABELS[post.category] ?? post.category}
            </p>
          )}
          <h1 className="text-4xl sm:text-5xl text-white font-light mb-4 leading-tight">
            {post.title}
          </h1>
          {post.publishedAt && (
            <p className="text-[var(--nav-text)]/70 text-sm ">
              {new Date(post.publishedAt).toLocaleDateString("hu-HU", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </div>
      </section>

      {/* Borítókép */}
      {post.coverImageUrl && (
        <div className="relative w-full aspect-[16/7] bg-[var(--surface2)] max-h-96 overflow-hidden">
          <Image
            src={post.coverImageUrl}
            alt={post.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </div>
      )}

      {/* Tartalom */}
      <article className="py-12 px-6">
        <div className="mx-auto max-w-3xl">
          {post.excerpt && (
            <p className="text-lg text-[var(--text)]/70 leading-relaxed mb-8 border-l-4 border-[var(--accent2)] pl-5 italic">
              {post.excerpt}
            </p>
          )}
          {post.content && (
            <div
              className="text-base leading-relaxed text-[var(--text)]/80 [&_strong]:font-semibold [&_b]:font-semibold [&_strong]:text-[var(--text)] [&_b]:text-[var(--text)] [&_em]:italic [&_i]:italic [&_u]:underline [&_p]:mb-4"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          )}
        </div>
      </article>

      {/* Vissza */}
      <div className="px-6 pb-16">
        <div className="mx-auto max-w-3xl border-t border-[var(--border)] pt-8 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/blog" className="text-sm text-[var(--accent)] hover:underline">
            ← Vissza a bloghoz
          </Link>
          <Link
            href="/foglalas"
            className="px-6 py-2.5 rounded-full bg-[var(--accent2)] text-[var(--text)] font-sans font-medium text-sm hover:bg-[var(--accent2)]/90 transition-colors"
          >
            Szobát foglalok
          </Link>
        </div>
      </div>
    </div>
  );
}
