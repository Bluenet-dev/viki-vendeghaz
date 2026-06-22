"use client";

import { deleteImageAction } from "./actions";

export function DeleteButton({ id }: { id: number }) {
  return (
    <form
      action={deleteImageAction}
      onSubmit={(e) => {
        if (!confirm("Biztosan törlöd ezt a képet? A művelet nem visszavonható.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-xs text-[#C44] border border-[#F09595] bg-transparent rounded px-2 py-1 hover:bg-[#FCEBEB] transition-colors"
      >
        Törlés
      </button>
    </form>
  );
}
