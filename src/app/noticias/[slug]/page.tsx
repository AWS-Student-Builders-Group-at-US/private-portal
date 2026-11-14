import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { previewText } from "@/features/posts/content";
import { publicMediaUrl } from "@/features/posts/media";
import { SITE } from "@/features/site/config";
import { formatNewsDate } from "@/features/site/components/news-card";
import { SiteFooter, SiteHeader } from "@/features/site/components/site-chrome";
import { getNewsItem } from "@/features/site/queries";
import { paragraphs, readingMinutes } from "@/features/site/text";

export async function generateMetadata({ params }: PageProps<"/noticias/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const item = await getNewsItem(slug);
  if (!item) return { title: `Noticia no encontrada · ${SITE.name}` };
  return {
    title: `${item.title} · ${SITE.name}`,
    description: previewText(item.body, 160),
    openGraph: item.image_path ? { images: [publicMediaUrl(item.image_path)] } : undefined,
  };
}

export default function NewsItemPage({ params }: PageProps<"/noticias/[slug]">) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main id="contenido" className="flex-1">
        <Suspense fallback={<p className="mx-auto max-w-3xl px-4 py-16 text-muted-foreground">Cargando…</p>}>
          <Article params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function Article({ params }: { params: PageProps<"/noticias/[slug]">["params"] }) {
  const { slug } = await params;
  const item = await getNewsItem(slug);
  if (!item) notFound();

  return (
    <article className="mx-auto flex max-w-3xl animate-rise-in flex-col gap-6 px-4 py-14 sm:px-6">
      <Link href="/noticias" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Noticias
      </Link>
      <header className="flex flex-col gap-3">
        <p className="text-sm text-[var(--aws-orange-strong)]">
          <time dateTime={item.published_on}>{formatNewsDate(item.published_on)}</time> · {readingMinutes(item.body)} min de lectura
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{item.title}</h1>
      </header>
      {item.image_path && (
        // eslint-disable-next-line @next/next/no-img-element -- public bucket image
        <img src={publicMediaUrl(item.image_path)} alt="" className="w-full rounded-2xl border object-cover" />
      )}
      <div className="flex flex-col gap-4 text-lg leading-relaxed">
        {paragraphs(item.body).map((p, i) => (
          <p key={i} className="whitespace-pre-line">{p}</p>
        ))}
      </div>
    </article>
  );
}
