import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function savePost(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  const isPublished = formData.get("published") === "on";

  await db
    .update(posts)
    .set({
      title: String(formData.get("title")),
      slug: String(formData.get("slug")),
      excerpt: String(formData.get("excerpt")),
      content: String(formData.get("content")),
      coverImageUrl: String(formData.get("coverImageUrl")) || null,
      category: String(formData.get("category")) || null,
      published: isPublished,
      publishedAt: isPublished ? new Date() : null,
    })
    .where(eq(posts.id, id));

  revalidatePath("/blog");
  revalidatePath(`/blog/${formData.get("slug")}`);
  revalidatePath("/admin/blog");
  redirect("/admin/blog");
}

async function deletePost(formData: FormData) {
  "use server";
  await db.delete(posts).where(eq(posts.id, Number(formData.get("id"))));
  revalidatePath("/blog");
  revalidatePath("/admin/blog");
  redirect("/admin/blog");
}

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post] = await db.select().from(posts).where(eq(posts.id, Number(id)));
  if (!post) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-display font-semibold mb-6">Bejegyzés szerkesztése</h1>
      <form action={savePost} className="space-y-5">
        <input type="hidden" name="id" value={post.id} />

        <Field label="Cím">
          <input name="title" defaultValue={post.title} required className={input} />
        </Field>
        <Field label="Slug (URL)">
          <input name="slug" defaultValue={post.slug} required placeholder="pl. szalajka-volgy-turak" className={input} />
        </Field>
        <Field label="Kategória">
          <select name="category" defaultValue={post.category ?? ""} className={input}>
            <option value="">— válassz —</option>
            <option value="turak">Túrák & természet</option>
            <option value="wellness">Wellness & pihenés</option>
            <option value="szilvasvarad">Szilvásvárad</option>
            <option value="etkezes">Ételek & receptek</option>
            <option value="hirek">Hírek & ajánlatok</option>
          </select>
        </Field>
        <Field label="Rövid leírás (excerpt)">
          <textarea name="excerpt" defaultValue={post.excerpt ?? ""} rows={2} className={input} />
        </Field>
        <Field label="Borítókép URL (Vercel Blob)">
          <input name="coverImageUrl" defaultValue={post.coverImageUrl ?? ""} placeholder="https://..." className={input} />
        </Field>
        <Field label="Tartalom (Markdown vagy egyszerű szöveg)">
          <textarea name="content" defaultValue={post.content ?? ""} rows={16} className={`${input} font-mono text-xs`} />
        </Field>
        <Field label="">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" name="published" defaultChecked={post.published ?? false} />
            Közzétéve (megjelenik a publikus blogon)
          </label>
        </Field>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
            Mentés
          </button>
          <a href="/admin/blog" className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-sm rounded-lg transition-colors">
            Mégse
          </a>
        </div>
      </form>

      <div className="mt-10 pt-6 border-t border-gray-800">
        <form action={deletePost}>
          <input type="hidden" name="id" value={post.id} />
          <button type="submit" className="text-red-400 hover:text-red-300 text-sm">
            Bejegyzés törlése
          </button>
        </form>
      </div>
    </div>
  );
}

const input = "w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 block";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</label>}
      {children}
    </div>
  );
}
