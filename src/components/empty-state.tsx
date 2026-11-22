import { cn } from "@/lib/utils";

// Consistent empty state for panel lists: a quiet dashed box with one line of
// text (and optional hint), so an empty section does not look broken.
export function EmptyState({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}
