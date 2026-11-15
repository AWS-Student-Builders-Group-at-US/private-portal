import { ArrowUpRight } from "lucide-react";
import type { PlatformUrls } from "../types";

const PLATFORM_LABELS: Record<keyof PlatformUrls, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

export function ZernioBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-violet-500/40 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
      Zernio
    </span>
  );
}

// Links to the live posts (URLs already restricted to instagram.com /
// linkedin.com over https by the sync).
export function PlatformLinks({ urls, className }: { urls: PlatformUrls; className?: string }) {
  const entries = (Object.keys(PLATFORM_LABELS) as (keyof PlatformUrls)[]).filter((k) => urls[k]);
  if (entries.length === 0) return null;
  return (
    <span className={className ?? "flex flex-wrap gap-3"}>
      {entries.map((k) => (
        <a
          key={k}
          href={urls[k]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 underline underline-offset-4"
        >
          Ver en {PLATFORM_LABELS[k]} <ArrowUpRight className="size-3" aria-hidden />
          <span className="sr-only">(se abre en una pestaña nueva)</span>
        </a>
      ))}
    </span>
  );
}
