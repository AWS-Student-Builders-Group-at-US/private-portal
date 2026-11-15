import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { previewText } from "@/features/posts/content";
import { publicMediaUrl } from "@/features/posts/media";
import { SITE } from "@/features/site/config";
import { formatNewsDate } from "@/features/site/components/news-card";
import { SitePage } from "@/features/site/components/primitives";
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
    <SitePage>
      <SiteHeader />
      <main id="contenido" className="flex-1">
        <Suspense fallback={<p className="mx-auto max-w-3xl px-4 py-16 font-mono text-sm text-muted-foreground">Cargando…</p>}>
          <Article params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </SitePage>
  );
}

async function Article({ params }: { params: PageProps<"/noticias/[slug]">["params"] }) {
  const { slug } = await params;
  const item = await getNewsItem(slug);
  if (!item) notFound();

  return (
    <article className="mx-auto my-10 flex w-[calc(100%-2rem)] max-w-3xl animate-rise-in flex-col gap-6 border bg-white px-4 py-10 sm:my-14 sm:px-10">
      <Link href="/noticias" className="flex w-fit items-center gap-1 font-mono text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Noticias
      </Link>
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs text-muted-foreground">
          <span aria-hidden className="mr-2 inline-block size-2 bg-[var(--aws-orange)]" />
          <time dateTime={item.published_on}>{formatNewsDate(item.published_on)}</time> · {readingMinutes(item.body)} min de lectura
        </p>
        <h1 className="text-3xl font-semibold break-words sm:text-4xl">{item.title}</h1>
      </header>
      {item.image_path && (
        // eslint-disable-next-line @next/next/no-img-element -- public bucket image
        <img src={publicMediaUrl(item.image_path)} alt="" className="w-full border object-cover" />
      )}
      <div className="flex flex-col gap-4 text-lg leading-relaxed">
        {paragraphs(item.body).map((p, i) => (
          <p key={i} className="whitespace-pre-line">{p}</p>
        ))}
      </div>
    </article>
  );
}
