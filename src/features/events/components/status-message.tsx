const MESSAGES: Record<string, string> = {
  creado: "Evento creado.",
  guardado: "Cambios guardados.",
  eliminado: "Evento eliminado.",
};

// Success banner driven by the `?estado=` query param set after redirects.
export function StatusMessage({ status }: { status?: string | string[] }) {
  const text = typeof status === "string" ? MESSAGES[status] : undefined;
  if (!text) return null;
  return (
    <p
      role="status"
      className="rounded-lg border bg-muted px-4 py-2 text-sm text-foreground"
    >
      {text}
    </p>
  );
}
