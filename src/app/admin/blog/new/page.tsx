import { db } from "@/db";
import { posts } from "@/db/schema";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function createPost(formData: FormData) {
  "use server";
  const isPublished = formData.get("published") === "on";

  const [post] = await db
    .insert(posts)
    .values({
      title: String(formData.get("title")),
      slug: String(formData.get("slug")),
      excerpt: String(formData.get("excerpt")) || null,
      content: String(formData.get("content")) || null,
      coverImageUrl: String(formData.get("coverImageUrl")) || null,
      category: String(formData.get("category")) || null,
      published: isPublished,
      publishedAt: isPublished ? new Date() : null,
    })
    .returning({ id: posts.id });

  revalidatePath("/blog");
  revalidatePath("/admin/blog");
  redirect(`/admin/blog/${post.id}`);
}

export default function NewPostPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-display font-semibold mb-6">Új bejegyzés</h1>
      <form action={createPost} className="space-y-5">
        <Field label="Cím">
          <input name="title" required className={input} placeholder="pl. A Szalajka-völgy legjobb túraútvonalai" />
        </Field>
        <Field label="Slug (URL)">
          <input name="slug" required placeholder="szalajka-volgy-turak" className={input} />
        </Field>
        <Field label="Kategória">
          <select name="category" className={input}>
            <option value="">— válassz —</option>
            <option value="turak">Túrák & természet</option>
            <option value="wellness">Wellness & pihenés</option>
            <option value="szilvasvarad">Szilvásvárad</option>
            <option value="etkezes">Ételek & receptek</option>
            <option value="hirek">Hírek & ajánlatok</option>
          </select>
        </Field>
        <Field label="Rövid leírás (excerpt)">
          <textarea name="excerpt" rows={2} className={input} placeholder="1-2 mondat a cikkről (keresőmotoroknak és kártyás listanézethez)" />
        </Field>
        <Field label="Borítókép URL">
          <input name="coverImageUrl" placeholder="https://..." className={input} />
        </Field>
        <Field label="Tartalom">
          <textarea name="content" rows={16} className={`${input} font-mono text-xs`} placeholder="A cikk szövege..." />
        </Field>
        <Field label="">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" name="published" />
            Közzétéve azonnal
          </label>
        </Field>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
            Létrehozás
          </button>
          <a href="/admin/blog" className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-sm rounded-lg transition-colors">
            Mégse
          </a>
        </div>
      </form>
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
