"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

// Success banner driven by the `?estado=` query param set after redirects.
// It closes by itself after a few seconds, or with the close button; closing
// drops `estado` from the URL, so a reload does not show it again.
const AUTO_CLOSE_MS = 5000;

export function StatusBanner({
  status,
  messages,
}: {
  status?: string | string[];
  messages: Record<string, string>;
}) {
  const router = useRouter();
  const [closed, setClosed] = useState(false);
  // Closing drops `estado` from the URL; when a later redirect sets it again,
  // show the new banner.
  const [shownFor, setShownFor] = useState(status);
  if (status !== shownFor) {
    setShownFor(status);
    setClosed(false);
  }
  const text = typeof status === "string" ? messages[status] : undefined;
  const visible = Boolean(text) && !closed;

  const close = useCallback(() => {
    setClosed(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("estado");
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }, [router]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(close, AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [visible, close]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 rounded-lg border bg-muted px-4 py-2 text-sm text-foreground"
    >
      <p>{text}</p>
      <button
        type="button"
        onClick={close}
        aria-label="Cerrar aviso"
        className="-mr-2 rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
