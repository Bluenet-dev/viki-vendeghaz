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
    <div className="pt-16 bg-stone min-h-screen">
      {/* Hero */}
      <section className="bg-ink py-20 px-6">
        <div className="mx-auto max-w-3xl">
          {post.category && (
            <p className="font-mono text-xs uppercase tracking-widest text-salt mb-4">
              {CATEGORY_LABELS[post.category] ?? post.category}
            </p>
          )}
          <h1 className="font-display text-4xl sm:text-5xl text-stone font-light mb-4 leading-tight">
            {post.title}
          </h1>
          {post.publishedAt && (
            <p className="text-mist/50 text-sm font-mono">
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
        <div className="relative w-full aspect-[16/7] bg-ink/10 max-h-96 overflow-hidden">
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
            <p className="text-lg text-bark/70 leading-relaxed mb-8 border-l-4 border-salt pl-5 italic">
              {post.excerpt}
            </p>
          )}
          {post.content && (
            <div className="prose prose-bark max-w-none text-bark/80 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </div>
          )}
        </div>
      </article>

      {/* Vissza */}
      <div className="px-6 pb-16">
        <div className="mx-auto max-w-3xl border-t border-ink/10 pt-8 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/blog" className="text-sm text-moss hover:underline">
            ← Vissza a bloghoz
          </Link>
          <Link
            href="/foglalas"
            className="px-6 py-2.5 rounded-full bg-salt text-bark font-sans font-medium text-sm hover:bg-salt/90 transition-colors"
          >
            Szobát foglalok
          </Link>
        </div>
      </div>
    </div>
  );
}
