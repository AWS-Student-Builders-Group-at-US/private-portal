"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  Folder,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import type { DriveItem, DriveKind } from "../types";
import { DrivePreviewDialog } from "./drive-preview-dialog";

const ICONS: Record<DriveKind, { icon: LucideIcon; label: string; className: string }> = {
  folder: { icon: Folder, label: "Carpeta", className: "text-amber-600" },
  doc: { icon: FileText, label: "Documento", className: "text-blue-600" },
  sheet: { icon: FileSpreadsheet, label: "Hoja de cálculo", className: "text-green-600" },
  slides: { icon: Presentation, label: "Presentación", className: "text-orange-600" },
  pdf: { icon: FileType, label: "PDF", className: "text-red-600" },
  image: { icon: FileImage, label: "Imagen", className: "text-purple-600" },
  other: { icon: File, label: "Archivo", className: "text-muted-foreground" },
};

const fieldClass =
  "w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// Lists one Drive folder. Names are untrusted text and only rendered as text.
// Folders navigate; files open a preview dialog.
export function DriveBrowser({ items, truncated }: { items: DriveItem[]; truncated: boolean }) {
  const [query, setQuery] = useState("");
  const [previewing, setPreviewing] = useState<DriveItem | null>(null);
  const needle = query.trim().toLocaleLowerCase("es");
  const visible = needle
    ? items.filter((item) => item.name.toLocaleLowerCase("es").includes(needle))
    : items;

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Esta carpeta está vacía.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="drive-q" className="sr-only">
        Buscar en esta carpeta
      </label>
      <input
        id="drive-q"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar en esta carpeta"
        className={fieldClass}
      />
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ningún archivo coincide con la búsqueda.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {visible.map((item) => {
            const { icon: Icon, label, className } = ICONS[item.kind];
            return (
              <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                <Icon className={`size-5 shrink-0 ${className}`} aria-label={label} role="img" />
                <div className="flex min-w-0 flex-1 flex-col">
                  {item.kind === "folder" ? (
                    <Link
                      href={`/panel/recursos?carpeta=${encodeURIComponent(item.id)}`}
                      className="truncate font-medium hover:underline"
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPreviewing(item)}
                      aria-haspopup="dialog"
                      className="truncate text-left font-medium hover:underline"
                    >
                      {item.name}
                    </button>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {[
                      item.modified && `Modificado: ${item.modified}`,
                      item.size,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                {item.webViewLink && (
                  <a
                    href={item.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Abrir «${item.name}» en Drive`}
                    className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
                  >
                    <span className="hidden sm:inline">Abrir en Drive</span>
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {truncated && (
        <p className="text-xs text-muted-foreground">
          Se muestran los primeros 1000 elementos. Abre la carpeta en Drive para ver el resto.
        </p>
      )}
      <DrivePreviewDialog item={previewing} onClose={() => setPreviewing(null)} />
    </div>
  );
}
