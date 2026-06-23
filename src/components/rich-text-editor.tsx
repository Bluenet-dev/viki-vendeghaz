"use client";
import { useRef } from "react";

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const exec = (command: string) => {
    document.execCommand(command, false);
    ref.current?.focus();
  };

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex gap-1 p-2 border-b border-[var(--border)] bg-[var(--surface2)]">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); exec("bold"); }}
          className="px-3 py-1 rounded text-sm font-bold border border-[var(--border)] hover:bg-[var(--accent-bg)] transition-colors"
          title="Félkövér (Ctrl+B)"
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); exec("italic"); }}
          className="px-3 py-1 rounded text-sm italic border border-[var(--border)] hover:bg-[var(--accent-bg)] transition-colors"
          title="Dőlt (Ctrl+I)"
        >
          I
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); exec("underline"); }}
          className="px-3 py-1 rounded text-sm underline border border-[var(--border)] hover:bg-[var(--accent-bg)] transition-colors"
          title="Aláhúzott (Ctrl+U)"
        >
          U
        </button>
      </div>

      {/* Editable area */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="min-h-[240px] p-4 text-[var(--text)] text-base leading-relaxed focus:outline-none"
        style={{ whiteSpace: "pre-wrap" }}
        data-placeholder={placeholder}
      />
    </div>
  );
}
