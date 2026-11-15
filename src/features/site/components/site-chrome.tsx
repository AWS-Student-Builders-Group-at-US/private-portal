import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ChipMark } from "@/components/chip-mark";
import { cn } from "@/lib/utils";
import { SITE } from "../config";
import { CtaArrow, cta } from "./primitives";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className="flex min-w-0 items-center gap-3"
      aria-label={`${SITE.name} at ${SITE.university}, inicio`}
    >
      <ChipMark />
      <span className="flex min-w-0 flex-col font-mono leading-tight">
        <span className={`truncate text-xs font-semibold sm:text-sm ${light ? "text-white" : ""}`}>
          {SITE.name}
        </span>
        <span className={`truncate text-[0.7rem] sm:text-xs ${light ? "text-white/70" : "text-muted-foreground"}`}>
          at {SITE.university}
        </span>
      </span>
    </Link>
  );
}

const NAV = [
  { href: "/#que-es", label: "¿Qué es?" },
  { href: "/#proximo-evento", label: "Próximo evento" },
  { href: "/noticias", label: "Noticias" },
];

const navLink =
  "font-mono text-sm text-foreground/80 underline-offset-8 transition-colors hover:text-foreground hover:underline hover:decoration-[var(--aws-orange)] hover:decoration-2";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur-sm">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-40 focus:bg-white focus:px-3 focus:py-2 focus:font-mono focus:text-sm"
      >
        Saltar al contenido
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6">
        <Logo />
        <nav aria-label="Principal" className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={navLink}>
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/#unete" className={cn(cta.primary, "shrink-0 px-3 py-2 sm:px-4")}>
          Únete<span className="hidden sm:inline"> al grupo</span> <CtaArrow />
        </Link>
      </div>
      <nav
        aria-label="Principal (móvil)"
        className="flex gap-6 overflow-x-auto border-t px-4 py-2.5 md:hidden"
      >
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className={cn(navLink, "shrink-0 text-xs")}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

type FooterLink = { label: string; href: string; external: boolean };

export function SiteFooter() {
  const links = [
    { label: "Meetup", href: SITE.meetupUrl, external: true },
    { label: "WhatsApp", href: SITE.whatsappUrl, external: true },
    { label: "Builder Center", href: SITE.builderCenterUrl, external: true },
    { label: "LinkedIn", href: SITE.linkedinUrl, external: true },
    { label: "Instagram", href: SITE.instagramUrl, external: true },
    { label: "Noticias", href: "/noticias", external: false },
    { label: "Privacidad", href: "/privacidad", external: false },
  ].filter((l): l is FooterLink => !!l.href);

  return (
    <footer className="on-dark">
      <div className="grid md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col gap-4 bg-[var(--aws-squid)] px-4 py-10 text-white sm:px-6 md:px-10">
          <Logo light />
          <p className="max-w-sm text-sm text-white/75">
            Comunidad de estudiantes del campus Reina Mercedes que aprende cloud construyendo con
            AWS.
          </p>
        </div>
        <nav
          aria-label="Enlaces del pie de página"
          className="bg-[var(--aws-orange)] px-4 py-10 text-[var(--aws-ink)] sm:px-6 md:px-10"
          style={{ ["--ring" as string]: "var(--aws-ink)" }}
        >
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-sm font-medium">
            {links.map((l) => (
              <li key={l.label}>
                {l.external ? (
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                  >
                    {l.label} <ArrowUpRight className="size-3.5" aria-hidden />
                  </a>
                ) : (
                  <Link href={l.href} className="underline-offset-4 hover:underline">
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col justify-between gap-6 bg-[var(--aws-ink)] px-4 py-10 text-white/75 sm:px-6 md:px-10">
          <p className="font-mono text-xs leading-relaxed">
            Campus Reina Mercedes · ETSII
            <br />
            Sevilla
          </p>
          <Link
            href="/panel"
            className="w-fit font-mono text-[0.7rem] text-white/60 underline-offset-4 hover:text-white hover:underline"
          >
            Acceso Core Team
          </Link>
        </div>
      </div>
      <div className="bg-[var(--aws-ink)] text-white/70">
        <p className="mx-auto max-w-6xl border-t border-white/10 px-4 py-5 font-mono text-[0.7rem] leading-relaxed sm:px-6">
          Comunidad organizada por estudiantes de la {SITE.university} dentro del programa AWS
          Student Builder Groups. © 2026. No es un sitio oficial de Amazon Web Services.
        </p>
      </div>
    </footer>
  );
}
