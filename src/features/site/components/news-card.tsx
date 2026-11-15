import Link from "next/link";
import { Cpu } from "lucide-react";
import { publicMediaUrl } from "@/features/posts/media";
import { previewText } from "@/features/posts/content";
import type { NewsItem } from "../queries";

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const formatNewsDate = (iso: string) => dateFormatter.format(new Date(iso));

export function NewsCard({ item }: { item: NewsItem }) {
  return (
    <Link
      href={`/noticias/${item.slug}`}
      className="group flex h-full flex-col border bg-card transition-colors hover:border-[var(--aws-squid)]"
    >
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
  );
}
