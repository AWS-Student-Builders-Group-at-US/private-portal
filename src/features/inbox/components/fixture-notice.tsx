import { FlaskConical } from "lucide-react";

// Shown only when the inbox serves the local sample emails (INBOX_FIXTURES=1).
export function FixtureNotice() {
  return (
    <p className="inline-flex w-fit items-center gap-1.5 rounded-full border border-dashed border-primary/40 bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
      <FlaskConical aria-hidden className="size-3.5" />
      Datos de ejemplo (INBOX_FIXTURES)
    </p>
  );
}
