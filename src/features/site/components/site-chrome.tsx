import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SITE } from "../config";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label={`${SITE.name}, inicio`}>
      <span
        aria-hidden
        className="grid size-9 place-items-center rounded-lg bg-[var(--aws-orange)] text-xs font-bold text-[var(--aws-ink)]"
      >
        SBG
      </span>
      <span className="flex flex-col leading-tight">
        <span className={`text-sm font-semibold ${light ? "text-white" : ""}`}>{SITE.name}</span>
        <span className={`text-[0.7rem] ${light ? "text-white/60" : "text-muted-foreground"}`}>
          Universidad de Sevilla
        </span>
      </span>
    </Link>
  );
}

const NAV = [
  { href: "/#que-hacemos", label: "Qué hacemos" },
  { href: "/#actividades", label: "Actividades" },
  { href: "/noticias", label: "Noticias" },
  { href: "/#unete", label: "Únete" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[var(--aws-ink)]/85 text-white backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo light />
        <nav aria-label="Principal" className="hidden items-center gap-6 text-sm text-white/75 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        <a
          href={SITE.meetupUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg bg-[var(--aws-orange)] px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-[var(--aws-ink)] transition-colors hover:bg-[var(--aws-orange-strong)]"
        >
          Únete<span className="hidden sm:inline"> en Meetup</span>
        </a>
      </div>
      <nav aria-label="Principal (móvil)" className="flex gap-5 overflow-x-auto px-4 pb-2 text-sm text-white/75 md:hidden">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="shrink-0 hover:text-white">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const social = [
    { label: "Meetup", href: SITE.meetupUrl },
    { label: "LinkedIn", href: SITE.linkedinUrl },
    { label: "Instagram", href: SITE.instagramUrl },
  ].filter((s): s is { label: string; href: string } => !!s.href);

  return (
    <footer className="bg-[var(--aws-ink)] text-white/70">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <Logo light />
          <p className="max-w-sm text-sm">
            Comunidad de estudiantes que aprende cloud construyendo, con el apoyo de AWS.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-white">Síguenos</span>
          {social.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white">
              {s.label} <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          ))}
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-white">Más</span>
          <Link href="/noticias" className="hover:text-white">Noticias</Link>
          <Link href="/privacidad" className="hover:text-white">Privacidad</Link>
          <Link href="/panel" className="hover:text-white">Acceso Core Team</Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs sm:px-6">
          © 2026 {SITE.name} · {SITE.place}. Grupo de estudiantes; no es un sitio oficial de Amazon Web Services.
        </p>
      </div>
    </footer>
  );
}
