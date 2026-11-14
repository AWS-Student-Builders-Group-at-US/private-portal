import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { SITE } from "@/features/site/config";
import { NewsCard } from "@/features/site/components/news-card";
import { Reveal } from "@/features/site/components/reveal";
import { SiteFooter, SiteHeader } from "@/features/site/components/site-chrome";
import { getNews, getUpcomingEvents, type PublicEvent } from "@/features/site/queries";

export const metadata: Metadata = {
  title: `${SITE.name} · Universidad de Sevilla`,
  description:
    "Comunidad de estudiantes de la Universidad de Sevilla que aprende cloud construyendo con AWS: talleres, charlas y proyectos.",
};

const WHAT_WE_DO = [
  {
    title: "Talleres prácticos",
    text: "Sesiones con el portátil abierto: despliegas algo real en AWS y te lo llevas funcionando.",
  },
  {
    title: "Charlas y encuentros",
    text: "Profesionales y estudiantes cuentan qué construyen y cómo empezaron en cloud.",
  },
  {
    title: "Comunidad abierta",
    text: "Da igual tu carrera o tu nivel: aquí se aprende haciendo y preguntando.",
  },
];

const STEPS = [
  { title: "Apúntate en Meetup", text: "Es gratis. Así te enteras de cada actividad." },
  { title: "Ven a un evento", text: "Elige el que te interese y apúntate desde Meetup." },
  { title: "Construye con nosotros", text: "Propón ideas, ayuda a organizar o únete al equipo." },
];

const KEYWORDS = ["Construir", "Aprender", "Cloud", "AWS", "Comunidad", "Sevilla"];

export default function PublicHomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main id="contenido" className="flex-1">
        <Hero />
        <WhatWeDo />
        <KeywordBand />
        <Activities />
        <Join />
        <LatestNews />
        <Sponsors />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[var(--aws-ink)] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 right-[-10%] size-[42rem] rounded-full bg-[radial-gradient(closest-side,rgb(255_153_0/0.30),transparent)]"
      />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-7 px-4 py-24 sm:px-6 md:py-32">
        <p className="animate-rise-in text-xs font-semibold tracking-[0.2em] text-[var(--aws-orange)] uppercase">
          {SITE.name} · Universidad de Sevilla
        </p>
        <h1 className="max-w-3xl animate-rise-in text-4xl font-semibold tracking-tight [animation-delay:80ms] sm:text-6xl">
          Aprende cloud <span className="text-[var(--aws-orange)]">construyendo</span>.
        </h1>
        <p className="max-w-xl animate-rise-in text-lg text-white/70 [animation-delay:160ms]">
          Somos una comunidad de estudiantes del campus Reina Mercedes que aprende AWS con
          talleres, charlas y proyectos reales. Abierta a cualquier carrera.
        </p>
        <div className="flex animate-rise-in flex-wrap gap-3 [animation-delay:240ms]">
          <a
            href={SITE.meetupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 rounded-lg bg-[var(--aws-orange)] px-5 py-3 font-semibold text-[var(--aws-ink)] transition-colors hover:bg-[var(--aws-orange-strong)]"
          >
            Únete en Meetup
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </a>
          <Link href="#unete" className="rounded-lg border border-white/20 px-5 py-3 font-medium transition-colors hover:bg-white/10">
            Cómo unirse
          </Link>
          <Link href="#contacto" className="rounded-lg px-5 py-3 font-medium text-white/80 transition-colors hover:text-white">
            Contacto
          </Link>
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ eyebrow, title, id }: { eyebrow: string; title: string; id?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold tracking-[0.2em] text-[var(--aws-orange-strong)] uppercase">{eyebrow}</span>
      <h2 id={id} className="text-3xl font-semibold tracking-tight">{title}</h2>
    </div>
  );
}

function WhatWeDo() {
  return (
    <section id="que-hacemos" className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-10 px-4 py-20 sm:px-6">
      <Reveal>
        <SectionTitle eyebrow="01 · Qué hacemos" title="Un grupo para aprender haciendo" />
      </Reveal>
      <ol className="grid gap-4 md:grid-cols-3">
        {WHAT_WE_DO.map((item, i) => (
          <Reveal as="li" key={item.title} delay={i * 90}>
            <div className="flex h-full flex-col gap-3 rounded-2xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--aws-orange)]/60 hover:shadow-lg">
              <span className="font-mono text-sm text-[var(--aws-orange-strong)]">0{i + 1}</span>
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

function KeywordBand() {
  const row = [...KEYWORDS, ...KEYWORDS];
  return (
    <div aria-hidden className="overflow-hidden border-y bg-[var(--aws-squid)] py-4 text-white">
      <div className="flex w-max animate-marquee gap-8 pr-8 text-sm font-semibold tracking-[0.3em] uppercase">
        {[...row, ...row].map((word, i) => (
          <span key={i} className="flex items-center gap-8">
            {word}
            <span className="text-[var(--aws-orange)]">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const eventDate = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

async function Activities() {
  const events = await getUpcomingEvents(3);
  return (
    <section id="actividades" className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-10 px-4 py-20 sm:px-6">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle eyebrow="02 · Agenda" title="Próximas actividades" />
        <a href={SITE.meetupUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-medium hover:underline">
          Ver todo en Meetup <ArrowUpRight className="size-4" aria-hidden />
        </a>
      </Reveal>
      {events.length === 0 ? (
        <Reveal>
          <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            Estamos preparando las próximas actividades. Síguenos en{" "}
            <a href={SITE.meetupUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-4">Meetup</a>{" "}
            para enterarte el primero.
          </p>
        </Reveal>
      ) : (
        <ul className="grid gap-4 md:grid-cols-3">
          {events.map((event, i) => (
            <Reveal as="li" key={`${event.title}-${event.starts_at}`} delay={i * 90}>
              <EventCard event={event} />
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}

function EventCard({ event }: { event: PublicEvent }) {
  return (
    <article className="flex h-full flex-col gap-4 rounded-2xl border bg-card p-6">
      <h3 className="text-lg font-semibold">{event.title}</h3>
      <p className="flex items-start gap-2 text-sm text-muted-foreground first-letter:uppercase">
        <CalendarDays className="mt-0.5 size-4 shrink-0 text-[var(--aws-orange-strong)]" aria-hidden />
        <span className="first-letter:uppercase">{eventDate.format(new Date(event.starts_at))}</span>
      </p>
      {event.location && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--aws-orange-strong)]" aria-hidden />
          {event.location}
        </p>
      )}
      {event.meetup_url && (
        <a href={event.meetup_url} target="_blank" rel="noopener noreferrer" className="mt-auto flex items-center gap-1 text-sm font-semibold text-[var(--aws-orange-strong)] hover:underline">
          Apúntate en Meetup <ArrowUpRight className="size-4" aria-hidden />
        </a>
      )}
    </article>
  );
}

function Join() {
  return (
    <section id="unete" className="scroll-mt-20 bg-[var(--aws-squid)] text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-[1fr_1.4fr]">
        <Reveal className="flex flex-col gap-4">
          <span className="text-xs font-semibold tracking-[0.2em] text-[var(--aws-orange)] uppercase">03 · Únete</span>
          <h2 className="text-3xl font-semibold tracking-tight">Cómo unirse</h2>
          <p className="text-white/70">No hace falta experiencia previa con AWS ni ser de informática.</p>
        </Reveal>
        <ol className="flex flex-col gap-3">
          {STEPS.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 90}>
              <div className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--aws-orange)] font-semibold text-[var(--aws-ink)]">{i + 1}</span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-white/70">{step.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

async function LatestNews() {
  const news = await getNews(3);
  if (news.length === 0) return null;
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-20 sm:px-6">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle eyebrow="04 · Noticias" title="Últimas noticias" />
        <Link href="/noticias" className="flex items-center gap-1 text-sm font-medium hover:underline">
          Ver todas <ArrowRight className="size-4" aria-hidden />
        </Link>
      </Reveal>
      <ul className="grid gap-4 md:grid-cols-3">
        {news.map((item, i) => (
          <Reveal as="li" key={item.slug} delay={i * 90}>
            <NewsCard item={item} />
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

function Sponsors() {
  const contact = SITE.contactEmail ? `mailto:${SITE.contactEmail}` : SITE.meetupUrl;
  return (
    <section id="contacto" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-20 sm:px-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border bg-card p-8 md:p-12">
          <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full bg-[radial-gradient(closest-side,rgb(255_153_0/0.22),transparent)]" />
          <div className="relative flex flex-col gap-4 md:max-w-2xl">
            <span className="text-xs font-semibold tracking-[0.2em] text-[var(--aws-orange-strong)] uppercase">Patrocinadores y colaboradores</span>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">¿Quieres que tu empresa aparezca aquí?</h2>
            <p className="text-muted-foreground">
              Buscamos empresas y profesionales que quieran dar una charla, prestar un espacio o
              apoyar las actividades del grupo. Escríbenos y lo hablamos.
            </p>
            <a
              href={contact}
              target={SITE.contactEmail ? undefined : "_blank"}
              rel="noopener noreferrer"
              className="flex w-fit items-center gap-2 rounded-lg bg-[var(--aws-squid)] px-5 py-3 font-semibold text-white transition-colors hover:bg-[var(--aws-navy)] dark:bg-[var(--aws-orange)] dark:text-[var(--aws-ink)]"
            >
              Contacta con nosotros <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
