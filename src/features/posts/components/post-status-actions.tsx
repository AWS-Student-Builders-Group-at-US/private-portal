"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { changePostStatus, deletePost } from "../actions";
import type { PostStatus } from "../schema";

export function PostStatusActions({
  postId,
  actions,
  isAuthorInReview,
}: {
  postId: string;
  actions: { to: PostStatus; label: string }[];
  isAuthorInReview: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.message ?? "Algo ha fallado.");
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.to}
            variant={action.to === "draft" ? "outline" : "default"}
            disabled={pending}
            onClick={() => run(() => changePostStatus(postId, action.to))}
          >
            {action.label}
          </Button>
        ))}
      </div>
      {isAuthorInReview && (
        <p className="text-sm text-muted-foreground">
          Tiene que aprobarla otra persona del equipo.
        </p>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function DeletePostButton({ postId }: { postId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (!confirming) {
    return (
      <Button variant="destructive" className="self-start" onClick={() => setConfirming(true)}>
        Eliminar publicación
      </Button>
    );
  }
  return (
    <div className="flex max-w-xl flex-col gap-3 rounded-lg border border-destructive/40 p-4">
      <p className="text-sm">¿Eliminar la publicación y su imagen? No se puede deshacer.</p>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deletePost(postId);
              if (!result.ok) setError(result.message);
            })
          }
        >
          {pending ? "Eliminando…" : "Sí, eliminar"}
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => setConfirming(false)}>Cancelar</Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
