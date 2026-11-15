"use client";

import { useState, useTransition } from "react";
import { setPostOnSite } from "../actions";

// "Mostrar en la web" switch, available on every post.
export function SiteVisibilityToggle({ postId, shown }: { postId: string; shown: boolean }) {
  const [checked, setChecked] = useState(shown);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-1">
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          className="size-4 accent-[var(--aws-orange)]"
          checked={checked}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            setChecked(next);
            setError(null);
            startTransition(async () => {
              const result = await setPostOnSite(postId, next);
              if (!result.ok) {
                setChecked(!next);
                setError(result.message);
              }
            });
          }}
        />
        Mostrar en la web
      </label>
      <p className="text-xs text-muted-foreground">
        {checked
          ? "Aparece en Noticias cuando esté publicada."
          : "Oculta: no aparece en la web pública."}
      </p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
