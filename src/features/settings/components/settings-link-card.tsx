import Link from "next/link";
import { ChevronRight } from "lucide-react";

// A settings section whose controls live on another page.
export function SettingsLinkCard({
  id,
  title,
  description,
  href,
  linkLabel,
}: {
  id: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 rounded-lg border p-4">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Link
        href={href}
        className="flex w-fit items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
      >
        {linkLabel}
        <ChevronRight className="size-4" />
      </Link>
    </section>
  );
}
