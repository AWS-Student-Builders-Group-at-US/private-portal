const MESSAGES: Record<string, string> = {
  creada: "Tarea creada.",
  guardada: "Cambios guardados.",
  eliminada: "Tarea eliminada.",
};

// Success banner driven by the `?estado=` query param set after redirects.
export function TaskStatusMessage({ status }: { status?: string | string[] }) {
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
