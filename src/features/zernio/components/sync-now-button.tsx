"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { syncZernioNow } from "../actions";

export function SyncNowButton({ disabled }: { disabled: boolean }) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        className="self-start"
        disabled={disabled || pending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            const result = await syncZernioNow();
            setMessage(
              result.ok
                ? { ok: true, text: `Sincronización completa: ${result.data?.synced ?? 0} publicaciones actualizadas.` }
                : { ok: false, text: result.message },
            );
          })
        }
      >
        {pending ? "Sincronizando…" : "Sincronizar ahora"}
      </Button>
      {message && (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
          {message.text}
        </p>
      )}
    </div>
  );
}
