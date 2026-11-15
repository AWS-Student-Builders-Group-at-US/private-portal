import { cn } from "@/lib/utils";

export type SettingsSection = { id: string; label: string };

// In-page navigation for Ajustes: a sticky side list on desktop and a
// horizontally scrolling row of chips on mobile. Plain anchor links.
export function SettingsSectionNav({
  sections,
  className,
}: {
  sections: SettingsSection[];
  className?: string;
}) {
  return (
    <nav aria-label="Secciones de ajustes" className={className}>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:sticky md:top-8 md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:px-0">
        {sections.map(({ id, label }) => (
          <li key={id} className="shrink-0">
            <a
              href={`#${id}`}
              className={cn(
                "block rounded-full border px-3 py-1 text-sm whitespace-nowrap hover:bg-muted",
                "md:rounded-lg md:border-0 md:py-2",
              )}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
