// Pure helpers for files in the private `event-files` bucket.

export const EVENT_FILES_BUCKET = "event-files";

// Keeps ASCII letters, digits, dot, dash and underscore; strips accents.
export function sanitizeFileName(name: string) {
  const cleaned = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|-+$/g, "")
    .slice(-100);
  return cleaned || "archivo";
}

// `<event_id>/<uuid>-<sanitized file name>`
export function buildEventFilePath(eventId: string, fileName: string) {
  return `${eventId}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}

export function formatFileSize(bytes: number | null) {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
