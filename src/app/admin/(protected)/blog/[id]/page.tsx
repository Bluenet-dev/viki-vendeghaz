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
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-[var(--text)]">Bejegyzés szerkesztése</h1>
        <p className="text-sm text-[var(--text2)] mt-1">Blog cikk tartalmának módosítása.</p>
      </div>
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
          <label className="flex items-center gap-2 text-sm text-[var(--text)]">
            <input type="checkbox" name="published" defaultChecked={post.published ?? false} />
            Közzétéve (megjelenik a publikus blogon)
          </label>
        </Field>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-5 py-2 rounded-md bg-[var(--nav-bg)] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity">
            Mentés
          </button>
          <a href="/admin/blog" className="px-5 py-2 rounded-md border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] text-[13px] transition-colors">
            Mégse
          </a>
        </div>
      </form>

      <div className="mt-10 pt-6 border-t-[0.5px] border-[var(--border)]">
        <form action={deletePost}>
          <input type="hidden" name="id" value={post.id} />
          <button type="submit" className="px-3 py-1.5 rounded-md border border-[#F09595] text-[#C44] bg-transparent text-sm hover:bg-[#FCEBEB] transition-colors">
            Bejegyzés törlése
          </button>
        </form>
      </div>
    </div>
  );
}

const input = "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] block";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-[var(--text2)] uppercase tracking-wide">{label}</label>}
      {children}
    </div>
  );
}
