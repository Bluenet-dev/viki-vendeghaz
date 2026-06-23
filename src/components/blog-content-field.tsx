"use client";
import { useState } from "react";
import { RichTextEditor } from "./rich-text-editor";

export function BlogContentField({ defaultValue }: { defaultValue?: string }) {
  const [content, setContent] = useState(defaultValue ?? "");

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[var(--text2)] uppercase tracking-wide">Tartalom</label>
      <RichTextEditor
        value={content}
        onChange={setContent}
        placeholder="Írja be a blog bejegyzés szövegét..."
      />
      <input type="hidden" name="content" value={content} />
    </div>
  );
}
