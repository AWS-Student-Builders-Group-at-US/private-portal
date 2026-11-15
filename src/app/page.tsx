import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Hammer, MapPin, MessageCircle, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SITE, TEAM } from "@/features/site/config";
import { eventSchedule, initials } from "@/features/site/format";
import { NewsCard } from "@/features/site/components/news-card";
import {
  CtaArrow,
  SectionLabel,
  SectionTitle,
  SitePage,
  cta,
} from "@/features/site/components/primitives";
import { Reveal } from "@/features/site/components/reveal";
import { SiteFooter, SiteHeader } from "@/features/site/components/site-chrome";
import { getNews, getUpcomingEvents, type PublicEvent } from "@/features/site/queries";

export const metadata: Metadata = {
  title: `${SITE.name} · ${SITE.university}`,
  description:
    "Comunidad de estudiantes de la Universidad de Sevilla que aprende cloud construyendo con AWS: talleres, charlas y proyectos.",
};

const PROGRAM = [
  {
    title: "Comunidad global",
    text: "Los Student Builder Groups son comunidades de estudiantes apoyadas por AWS en universidades de todo el mundo.",
  },
  {
    title: "Aprender haciendo",
    text: "Talleres, charlas y proyectos en los que despliegas algo real en la nube.",
  },
  {
    title: "Abierto a todos",
    text: "Da igual tu carrera o tu nivel: no hace falta experiencia previa con AWS.",
  },
];

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

// Avatar tiles cycle through the palette; orange and blue always carry dark text.
const AVATAR_STYLES = [
  "bg-[var(--aws-squid)] text-white",
  "bg-[var(--aws-orange)] text-[var(--aws-ink)]",
  "bg-[var(--aws-blue)] text-[var(--aws-ink)]",
  "bg-[var(--aws-ink)] text-[var(--aws-orange)]",
  "border border-[var(--aws-squid)] bg-white text-[var(--aws-squid)]",
];

const SECTION = "mx-auto flex max-w-6xl scroll-mt-28 flex-col gap-10 px-4 py-20 sm:px-6";

export default function PublicHomePage() {
  return (
    <SitePage>
      <SiteHeader />
      <main id="contenido" className="flex-1">
        <Hero />
        <WhatWeDo />
        <Team />
        <Join />
        <NextEvent />
        <LatestNews />
        <Sponsors />
      </main>
      <SiteFooter />
    </SitePage>
  );
}

// Solid squares sitting on 80px grid cells, in the page margins (decorative;
// only from xl, where the margins are wide enough not to cover any text).
function GridSquares() {
  const rightEdge = "left-[round(down,calc(100%_-_80px),80px)]";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block">
      <span className="absolute top-0 left-[80px] size-20 bg-[var(--aws-orange)]" />
      <span className="absolute top-[160px] left-0 size-20 bg-[var(--aws-blue)]" />
      <span className={`absolute top-0 size-20 bg-[var(--aws-blue)] ${rightEdge}`} />
      <span className={`absolute top-[320px] size-20 bg-[var(--aws-orange)] ${rightEdge}`} />
    </div>
  );
}

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden border-b bg-grid">
      <GridSquares />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-24">
        <div className="flex min-w-0 flex-col gap-7">
          <SectionLabel className="animate-rise-in text-muted-foreground">
            {SITE.name} · US
          </SectionLabel>
          <h1
            id="hero-title"
            className="animate-rise-in text-4xl leading-[1.15] font-semibold break-words [animation-delay:80ms] sm:text-6xl lg:text-7xl"
          >
            Empieza a crear con{" "}
            {/* inline-block keeps the highlight from overlapping the line above. */}
            <span className="mt-1 inline-block bg-[var(--aws-orange)] px-2 py-1 leading-none text-[var(--aws-ink)]">
              AWS
            </span>
          </h1>
          <p className="max-w-xl animate-rise-in text-lg text-muted-foreground [animation-delay:160ms]">
            Somos una comunidad de estudiantes de la {SITE.university}, en el campus Reina Mercedes,
            que aprende cloud con talleres, charlas y proyectos reales. Abierta a cualquier carrera.
          </p>
          <div className="flex animate-rise-in flex-wrap gap-3 [animation-delay:240ms]">
            <Link href="#unete" className={cta.primary}>
              Únete al grupo <CtaArrow />
            </Link>
            <Link href="#proximo-evento" className={cta.dark}>
              Ver próximo evento
            </Link>
          </div>
          <dl className="grid max-w-md animate-rise-in grid-cols-2 [animation-delay:320ms]">
            <div className="flex flex-col gap-1 border bg-white p-4">
              <dt className="order-2 text-xs text-muted-foreground">Campus Reina Mercedes</dt>
              <dd className="order-1 font-mono text-2xl font-semibold">ETSII</dd>
            </div>
            <div className="flex flex-col gap-1 bg-[var(--aws-orange)] p-4 text-[var(--aws-ink)]">
              <dt className="order-2 text-xs">Gratis, abierto a todas las carreras</dt>
              <dd className="order-1 font-mono text-2xl font-semibold">0 €</dd>
            </div>
          </dl>
        </div>
        <ProgramCard />
      </div>
    </section>
  );
}

function ProgramCard() {
  return (
    <div id="que-es" className="flex min-w-0 scroll-mt-28 animate-rise-in flex-col [animation-delay:200ms]">
      <div className="on-dark flex flex-col gap-4 bg-[var(--aws-squid)] p-6 text-white sm:p-8">
        <SectionLabel index="01" className="text-white/70">
          El programa
        </SectionLabel>
        <h2 className="text-2xl font-semibold sm:text-3xl">¿Qué es un Student Builder Group?</h2>
        <p className="text-sm text-white/75">
          Un grupo de estudiantes que se reúne para aprender y construir en la nube con el apoyo del
          programa AWS Student Builder Groups.
        </p>
      </div>
      <ol>
        {PROGRAM.map((item, i) => (
          <li key={item.title} className="flex gap-4 border border-t-0 bg-white p-5">
            <span className="font-mono text-sm font-semibold text-[var(--aws-orange-text)]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function WhatWeDo() {
  return (
    <section id="que-hacemos" aria-labelledby="que-hacemos-title" className={SECTION}>
      <Reveal>
        <SectionTitle id="que-hacemos-title" index="01" label="Qué hacemos" title="Un grupo para aprender haciendo" />
      </Reveal>
      <ul className="grid gap-px border bg-border md:grid-cols-3">
        {WHAT_WE_DO.map((item, i) => (
          <Reveal as="li" key={item.title} delay={i * 90} className="flex flex-col gap-3 bg-white p-6">
            <span aria-hidden className="size-3 bg-[var(--aws-orange)]" />
            <h3 className="text-lg font-semibold">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.text}</p>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

function Team() {
  return (
    <section id="equipo" aria-labelledby="equipo-title" className={SECTION}>
      <Reveal>
        <SectionTitle
          id="equipo-title"
          index="02"
          label="Quién está detrás"
          title="El Core Team"
          intro="Estudiantes que organizan las actividades del grupo. Si quieres echar una mano, escríbenos en cualquier evento."
        />
      </Reveal>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {TEAM.map((member, i) => (
          <Reveal as="li" key={member.name} delay={i * 70} className="flex items-center gap-4 border bg-white p-4 lg:flex-col lg:items-start">
            {member.photo ? (
              <Image
                src={member.photo}
                alt={`Foto de ${member.name}`}
                width={112}
                height={112}
                className="size-14 shrink-0 object-cover lg:size-20"
              />
            ) : (
              <span
                aria-hidden
                className={cn(
                  "grid size-14 shrink-0 place-items-center font-mono text-lg font-semibold lg:size-20",
                  AVATAR_STYLES[i % AVATAR_STYLES.length],
                )}
              >
                {initials(member.name)}
              </span>
            )}
            <div className="flex flex-col gap-0.5">
              <h3 className="font-semibold">{member.name}</h3>
              <p className="text-sm text-muted-foreground">{member.role}</p>
              {member.linkedinUrl && (
                <a
                  href={member.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex w-fit items-center gap-1 font-mono text-xs font-medium underline-offset-4 hover:underline"
                >
                  LinkedIn <ArrowUpRight className="size-3" aria-hidden />
                  <span className="sr-only">de {member.name} (se abre en una pestaña nueva)</span>
                </a>
              )}
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

type Channel = {
  name: string;
  text: string;
  icon: LucideIcon;
  href: string | null;
  action: string;
  pending?: string;
  featured?: boolean;
};

const CHANNELS: Channel[] = [
  {
    name: "WhatsApp",
    text: "Avisos rápidos y dudas entre miembros del grupo.",
    icon: MessageCircle,
    href: SITE.whatsappUrl,
    action: "Entrar en el grupo",
    pending: "Enlace disponible pronto.",
  },
  {
    name: "Meetup",
    text: "Aquí publicamos cada evento. Apúntate gratis para recibir los avisos.",
    icon: CalendarDays,
    href: SITE.meetupUrl,
    action: "Únete en Meetup",
    featured: true,
  },
  {
    name: "AWS Builder Center",
    text: "Recursos, artículos y la comunidad global de builders de AWS.",
    icon: Hammer,
    href: SITE.builderCenterUrl,
    action: "Ir a Builder Center",
  },
];

function Join() {
  return (
    <section id="unete" aria-labelledby="unete-title" className={SECTION}>
      <Reveal>
        <SectionTitle
          id="unete-title"
          index="03"
          label="Únete"
          title="Cómo unirse"
          intro="No hace falta experiencia previa con AWS ni ser de informática."
        />
      </Reveal>
      <ol className="grid gap-px border bg-border md:grid-cols-3">
        {STEPS.map((step, i) => (
          <Reveal as="li" key={step.title} delay={i * 90} className="flex gap-4 bg-white p-5">
            <span className="grid size-9 shrink-0 place-items-center bg-[var(--aws-squid)] font-mono text-sm font-semibold text-[var(--aws-orange)]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.text}</p>
            </div>
          </Reveal>
        ))}
      </ol>
      <ul className="grid gap-4 md:grid-cols-3">
        {CHANNELS.map((channel, i) => (
          <Reveal
            as="li"
            key={channel.name}
            delay={i * 90}
            className={cn(
              "flex flex-col gap-4 border p-6",
              channel.featured
                ? "on-dark border-[var(--aws-squid)] bg-[var(--aws-squid)] text-white"
                : "bg-white",
            )}
          >
            <channel.icon
              aria-hidden
              className={cn("size-7", channel.featured ? "text-[var(--aws-orange)]" : "text-[var(--aws-squid)]")}
              strokeWidth={1.75}
            />
            <h3 className="text-xl font-semibold">{channel.name}</h3>
            <p className={cn("text-sm", channel.featured ? "text-white/75" : "text-muted-foreground")}>
              {channel.text}
            </p>
            <div className="mt-auto pt-2">
              {channel.href ? (
                <a
                  href={channel.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(channel.featured ? cta.primary : cta.outline, "w-full")}
                >
                  {channel.action} <CtaArrow />
                </a>
              ) : (
                <p className="font-mono text-xs text-muted-foreground">{channel.pending}</p>
              )}
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

async function NextEvent() {
  const [next, ...later] = await getUpcomingEvents(3);
  return (
    <section id="proximo-evento" aria-labelledby="proximo-evento-title" className={SECTION}>
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle id="proximo-evento-title" index="04" label="Próximo evento" title="Nos vemos en el campus" />
        <a
          href={SITE.meetupUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sm underline decoration-[var(--aws-orange)] decoration-2 underline-offset-4 hover:decoration-foreground"
        >
          Ver todo en Meetup ↗
        </a>
      </Reveal>
      {next ? (
        <Reveal>
          <NextEventCard event={next} />
        </Reveal>
      ) : (
        <Reveal>
          <div className="flex flex-col items-start gap-4 border bg-white p-8">
            <p className="font-mono text-xl font-semibold">Pronto anunciaremos el próximo evento</p>
            <p className="text-muted-foreground">
              Síguenos en Meetup para enterarte el primero.
            </p>
            <a href={SITE.meetupUrl} target="_blank" rel="noopener noreferrer" className={cta.primary}>
              Únete en Meetup <CtaArrow />
            </a>
          </div>
        </Reveal>
      )}
      {later.length > 0 && (
        <div className="flex flex-col gap-4">
          <SectionLabel className="text-muted-foreground">Más adelante</SectionLabel>
          <ul className="grid gap-4 md:grid-cols-2">
            {later.map((event, i) => (
              <Reveal as="li" key={`${event.title}-${event.starts_at}`} delay={i * 90}>
                <LaterEventCard event={event} />
              </Reveal>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function NextEventCard({ event }: { event: PublicEvent }) {
  const { date, time } = eventSchedule(event.starts_at, event.ends_at);
  const signUp = event.meetup_url ?? SITE.meetupUrl;
  return (
    <article className="grid border-2 border-[var(--aws-squid)] bg-white md:grid-cols-[minmax(0,16rem)_1fr]">
      <dl className="flex flex-col gap-4 bg-[var(--aws-orange)] p-6 font-mono text-[var(--aws-ink)]">
        <MetaRow icon={CalendarDays} label="Fecha" value={date} />
        <MetaRow icon={Clock} label="Hora" value={time} />
        {event.location && <MetaRow icon={MapPin} label="Lugar" value={event.location} />}
      </dl>
      <div className="flex flex-col gap-5 p-6 sm:p-8">
        <h3 className="text-2xl font-semibold sm:text-3xl">{event.title}</h3>
        <p className="text-muted-foreground">
          Apúntate en Meetup para reservar tu sitio y recibir todos los detalles del evento.
        </p>
        <div className="mt-auto flex flex-wrap gap-3">
          <a href={signUp} target="_blank" rel="noopener noreferrer" className={cta.primary}>
            Apúntate en Meetup <CtaArrow />
          </a>
          <a href={SITE.meetupUrl} target="_blank" rel="noopener noreferrer" className={cta.dark}>
            Ver todos los eventos
          </a>
        </div>
      </div>
    </article>
  );
}

function MetaRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col">
        <dt className="text-[0.7rem] tracking-[0.12em] uppercase">{label}</dt>
        <dd className="text-sm font-semibold">{value}</dd>
      </div>
    </div>
  );
}

function LaterEventCard({ event }: { event: PublicEvent }) {
  const { date, time } = eventSchedule(event.starts_at, event.ends_at);
  return (
    <article className="flex h-full flex-col gap-3 border bg-white p-5">
      <p className="font-mono text-xs text-muted-foreground">
        {date} · {time}
      </p>
      <h3 className="font-semibold">{event.title}</h3>
      {event.location && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
          {event.location}
        </p>
      )}
      {event.meetup_url && (
        <a
          href={event.meetup_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto w-fit font-mono text-sm underline decoration-[var(--aws-orange)] decoration-2 underline-offset-4 hover:decoration-foreground"
        >
          Apúntate en Meetup ↗
        </a>
      )}
    </article>
  );
}

async function LatestNews() {
  const news = await getNews(3);
  if (news.length === 0) return null;
  return (
    <section aria-labelledby="noticias-title" className={SECTION}>
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle id="noticias-title" index="05" label="Noticias" title="Últimas noticias" />
        <Link
          href="/noticias"
          className="font-mono text-sm underline decoration-[var(--aws-orange)] decoration-2 underline-offset-4 hover:decoration-foreground"
        >
          Ver todas →
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
    <section id="contacto" aria-labelledby="contacto-title" className="mx-auto max-w-6xl scroll-mt-28 px-4 pb-20 sm:px-6">
      <Reveal>
        <div className="on-dark grid gap-8 bg-[var(--aws-squid)] p-8 text-white md:grid-cols-[1fr_auto] md:items-end md:p-12">
          <div className="flex flex-col gap-4 md:max-w-2xl">
            <SectionLabel index="06" className="text-white/70">
              Colabora
            </SectionLabel>
            <h2 id="contacto-title" className="text-2xl font-semibold md:text-3xl">
              ¿Quieres que tu empresa aparezca aquí?
            </h2>
            <p className="text-white/75">
              Buscamos empresas y profesionales que quieran dar una charla, prestar un espacio o
              apoyar las actividades del grupo. Escríbenos y lo hablamos.
            </p>
          </div>
          <a
            href={contact}
            target={SITE.contactEmail ? undefined : "_blank"}
            rel="noopener noreferrer"
            className={cn(cta.primary, "w-fit")}
          >
            Contacta con nosotros <CtaArrow />
          </a>
        </div>
      </Reveal>
    </section>
  );
}
