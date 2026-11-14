// Success banner driven by the `?estado=` query param set after redirects.
export function StatusBanner({
  status,
  messages,
}: {
  status?: string | string[];
  messages: Record<string, string>;
}) {
  const text = typeof status === "string" ? messages[status] : undefined;
  if (!text) return null;
  return (
    <p role="status" className="rounded-lg border bg-muted px-4 py-2 text-sm text-foreground">
      {text}
    </p>
  );
}
