import Link from "next/link";
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
      className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-[var(--aws-orange)]/60 hover:shadow-lg"
    >
      <div className="aspect-[1.91/1] overflow-hidden bg-[var(--aws-squid)]">
        {item.image_path ? (
          // eslint-disable-next-line @next/next/no-img-element -- public bucket image
          <img
            src={publicMediaUrl(item.image_path)}
            alt=""
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgb(255_153_0/0.35),transparent_55%)] text-sm font-semibold text-white/80">
            SBG · Noticias
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <time dateTime={item.published_on} className="text-xs font-medium text-[var(--aws-orange-strong)]">
          {formatNewsDate(item.published_on)}
        </time>
        <h3 className="font-semibold leading-snug group-hover:underline">{item.title}</h3>
        <p className="text-sm text-muted-foreground">{previewText(item.body, 140)}</p>
      </div>
    </Link>
  );
}
