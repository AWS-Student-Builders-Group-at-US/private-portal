import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Shared building blocks of the public site's visual language.

const ctaBase =
  "group inline-flex items-center justify-center gap-2 px-5 py-3 font-mono text-sm font-semibold transition-colors";

// Link styles that look like buttons. Orange always carries dark text (AA).
export const cta = {
  primary: cn(ctaBase, "bg-[var(--aws-orange)] text-[var(--aws-ink)] hover:bg-[var(--aws-orange-strong)]"),
  dark: cn(ctaBase, "bg-[var(--aws-squid)] text-white hover:bg-[var(--aws-navy)]"),
  outline: cn(ctaBase, "border border-[var(--aws-squid)] bg-white text-[var(--aws-squid)] hover:bg-muted"),
};

// Arrow used at the end of call-to-action labels; nudges right on hover.
export function CtaArrow() {
  return (
    <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
      →
    </span>
  );
}

// Numbered mono label, e.g. "02 / Quién está detrás".
export function SectionLabel({
  index,
  children,
  className,
}: {
  index?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("font-mono text-xs font-medium tracking-[0.12em] uppercase", className)}>
      {index && (
        <span className="text-[var(--label-accent,var(--aws-orange-text))]">{index} / </span>
      )}
      {children}
    </p>
  );
}

// Section heading block: label + mono title (+ optional intro).
export function SectionTitle({
  index,
  label,
  title,
  intro,
  id,
}: {
  index: string;
  label: string;
  title: string;
  intro?: string;
  id?: string;
}) {
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <SectionLabel index={index} className="text-muted-foreground">
        {label}
      </SectionLabel>
      <h2 id={id} className="text-3xl font-semibold sm:text-4xl">
        {title}
      </h2>
      {intro && <p className="text-muted-foreground">{intro}</p>}
    </div>
  );
}

// Light-only public page: grid background, header and footer are added by callers.
export function SitePage({ children }: { children: ReactNode }) {
  return <div className="theme-light flex flex-1 flex-col bg-grid text-foreground">{children}</div>;
}
