"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  deleteEventFile,
  getEventFileDownloadUrl,
  registerEventFile,
} from "../actions";
import {
  EVENT_FILES_BUCKET,
  buildEventFilePath,
  formatFileSize,
} from "../files";
import { MAX_EVENT_FILE_BYTES } from "../schema";
import { formatMadridDateTimeShort } from "../time";
import type { EventFile } from "../types";

type Notice = { kind: "success" | "error"; text: string };

export function EventFiles({
  eventId,
  files,
}: {
  eventId: string;
  files: EventFile[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Uploads go straight from the browser to Storage with the user's session
  // (RLS), then the metadata row is registered through a server action.
  async function upload(selected: File[]) {
    const results: Notice[] = [];
    const supabase = createClient();
    const storage = supabase.storage.from(EVENT_FILES_BUCKET);

    for (const file of selected) {
      if (file.size > MAX_EVENT_FILE_BYTES) {
        results.push({
          kind: "error",
          text: `«${file.name}» supera el límite de 50 MB.`,
        });
        continue;
      }
      const path = buildEventFilePath(eventId, file.name);
      const { error } = await storage.upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (error) {
        results.push({ kind: "error", text: `No se pudo subir «${file.name}».` });
        continue;
      }
      const registered = await registerEventFile({
        eventId,
        storagePath: path,
        fileName: file.name,
        sizeBytes: file.size,
        contentType: file.type || null,
      });
      if (!registered.ok) {
        await storage.remove([path]);
        results.push({ kind: "error", text: registered.message });
        continue;
      }
      results.push({ kind: "success", text: `«${file.name}» subido.` });
    }
    return results;
  }

  async function onFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length === 0) return;
    setUploading(true);
    setNotices([]);
    const results = await upload(selected);
    setNotices(results);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    startTransition(() => router.refresh());
  }

  async function download(file: EventFile) {
    setPendingId(file.id);
    const result = await getEventFileDownloadUrl(file.id);
    setPendingId(null);
    if (result.ok && result.data) {
      window.location.assign(result.data);
    } else if (!result.ok) {
      setNotices([{ kind: "error", text: result.message }]);
    }
  }

  async function remove(file: EventFile) {
    setPendingId(file.id);
    const result = await deleteEventFile(file.id);
    setPendingId(null);
    setNotices([
      result.ok
        ? { kind: "success", text: `«${file.file_name}» eliminado.` }
        : { kind: "error", text: result.message },
    ]);
    if (result.ok) startTransition(() => router.refresh());
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Archivos</h2>
        <Button
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload />
          {uploading ? "Subiendo…" : "Subir archivos"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onFilesSelected}
          aria-label="Seleccionar archivos"
        />
      </div>
      <p className="text-xs text-muted-foreground">Máximo 50 MB por archivo.</p>

      {notices.length > 0 && (
        <ul className="flex flex-col gap-1" role="status">
          {notices.map((notice, index) => (
            <li
              key={index}
              className={
                notice.kind === "error"
                  ? "text-sm text-destructive"
                  : "text-sm text-muted-foreground"
              }
            >
              {notice.text}
            </li>
          ))}
        </ul>
      )}

      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay archivos.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {file.file_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(file.size_bytes)} · {file.uploaded_by} ·{" "}
                  {formatMadridDateTimeShort(file.created_at)}
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => download(file)}
                  disabled={pendingId === file.id}
                  aria-label={`Descargar ${file.file_name}`}
                >
                  <Download />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(file)}
                  disabled={pendingId === file.id}
                  aria-label={`Eliminar ${file.file_name}`}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
