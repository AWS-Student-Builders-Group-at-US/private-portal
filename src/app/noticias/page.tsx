import type { Metadata } from "next";
import { SITE } from "@/features/site/config";
import { NewsCard } from "@/features/site/components/news-card";
import { Reveal } from "@/features/site/components/reveal";
import { SiteFooter, SiteHeader } from "@/features/site/components/site-chrome";
import { getNews } from "@/features/site/queries";

export const metadata: Metadata = {
  title: `Noticias · ${SITE.name}`,
  description: "Novedades y crónicas del AWS Student Builder Group de la Universidad de Sevilla.",
};

export default async function NewsPage() {
  const news = await getNews(60);
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main id="contenido" className="flex-1">
        <section className="bg-[var(--aws-ink)] text-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-16 sm:px-6">
            <span className="animate-rise-in text-xs font-semibold tracking-[0.2em] text-[var(--aws-orange)] uppercase">Noticias</span>
            <h1 className="animate-rise-in text-4xl font-semibold tracking-tight [animation-delay:80ms]">Lo último del grupo</h1>
          </div>
        </section>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          {news.length === 0 ? (
            <p className="text-muted-foreground">Todavía no hay noticias publicadas.</p>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {news.map((item, i) => (
                <Reveal as="li" key={item.slug} delay={(i % 3) * 90}>
                  <NewsCard item={item} />
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
