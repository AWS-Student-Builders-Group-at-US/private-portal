import { CircleHelp } from "lucide-react";

// Collapsed "how does this work?" help text. Native <details>, so it is
// keyboard-operable and announces its expanded state without extra ARIA.
export function HelpDetails({
  summary = "¿Cómo funciona?",
  children,
}: {
  summary?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group text-xs text-muted-foreground">
      <summary className="inline-flex w-fit cursor-pointer list-none items-center gap-1 rounded-md outline-none select-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <CircleHelp aria-hidden className="size-3.5" />
        {summary}
      </summary>
      <div className="mt-2 max-w-prose leading-relaxed">{children}</div>
    </details>
  );
}
