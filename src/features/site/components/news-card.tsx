import Link from "next/link";
import { ArrowUpRight, Cpu } from "lucide-react";
import { publicMediaUrl } from "@/features/posts/media";
import { previewText } from "@/features/posts/content";
import { safePlatformUrl } from "@/features/zernio/mapping";
import type { NewsItem } from "../queries";

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const formatNewsDate = (iso: string) => dateFormatter.format(new Date(iso));

const PLATFORM_LABELS = { instagram: "Instagram", linkedin: "LinkedIn" } as const;
type Platform = keyof typeof PLATFORM_LABELS;

// Defence in depth: the sync already stores only https links on the
// platform's own host.
function platformLinks(urls: NewsItem["platform_urls"]) {
  return (Object.keys(PLATFORM_LABELS) as Platform[]).flatMap((platform) => {
    const href = safePlatformUrl(platform, urls?.[platform]);
    return href ? [{ platform, href, label: `Ver en ${PLATFORM_LABELS[platform]}` }] : [];
  });
}

export function PlatformLinks({ urls, className }: { urls: NewsItem["platform_urls"]; className?: string }) {
  const links = platformLinks(urls);
  if (links.length === 0) return null;
  return (
    <div className={className ?? "flex flex-wrap gap-x-4 gap-y-1"}>
      {links.map((link) => (
        <a
          key={link.platform}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono text-xs font-medium underline-offset-4 hover:underline hover:decoration-[var(--aws-orange)] hover:decoration-2"
        >
          {link.label} <ArrowUpRight className="size-3" aria-hidden />
          <span className="sr-only">(se abre en una pestaña nueva)</span>
        </a>
      ))}
    </div>
  );
}

export function NewsCard({ item }: { item: NewsItem }) {
  return (
    <div className="flex h-full flex-col border bg-card transition-colors hover:border-[var(--aws-squid)]">
      <Link href={`/noticias/${item.slug}`} className="group flex flex-1 flex-col">
        <div className="aspect-[1.91/1] overflow-hidden border-b bg-[var(--aws-squid)]">
          {item.image_path ? (
            // eslint-disable-next-line @next/next/no-img-element -- public bucket image
            <img
              src={publicMediaUrl(item.image_path)}
              alt=""
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-3 font-mono text-xs text-white/80">
              <Cpu className="size-8 text-[var(--aws-orange)]" strokeWidth={1.5} aria-hidden />
              SBG · Noticias
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-5">
          <time dateTime={item.published_on} className="font-mono text-xs text-muted-foreground">
            {formatNewsDate(item.published_on)}
          </time>
          <h3 className="font-semibold leading-snug underline-offset-4 group-hover:underline group-hover:decoration-[var(--aws-orange)] group-hover:decoration-2">
            {item.title}
          </h3>
          <p className="text-sm text-muted-foreground">{previewText(item.body, 140)}</p>
        </div>
      </Link>
      <PlatformLinks urls={item.platform_urls} className="flex flex-wrap gap-x-4 gap-y-1 px-5 pb-5" />
    </div>
  );
}
