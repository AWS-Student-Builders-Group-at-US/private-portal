"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Short text shown as a button; clicking turns it into an input. Enter or
// leaving the field saves, Escape cancels (long text: EditableLongText).
// With `display` (e.g. a link that must
// stay clickable), the content is shown as given and a small edit button
// next to it opens the field.
export function EditableText({
  label,
  value,
  onSave,
  required = false,
  type = "text",
  maxLength,
  placeholder = "",
  className,
  display,
  editIcon,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  required?: boolean;
  type?: "text" | "url";
  maxLength?: number;
  placeholder?: string;
  className?: string;
  display?: ReactNode;
  editIcon?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  // Enter and Escape close the field; the blur that may follow must not save
  // again (or save a cancelled edit).
  const closed = useRef(false);

  function start() {
    closed.current = false;
    setDraft(value);
    setEditing(true);
  }

  function commit() {
    if (closed.current) return;
    closed.current = true;
    setEditing(false);
    const next = draft.trim();
    if (next === value.trim() || (required && next === "")) return;
    onSave(next);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      closed.current = true;
      setEditing(false);
    } else if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }
  }

  if (editing) {
    return (
      <input
        type={type}
        aria-label={label}
        value={draft}
        maxLength={maxLength}
        autoFocus
        placeholder={type === "url" ? "https://…" : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className="w-full rounded-md border border-input bg-background px-1.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    );
  }

  if (display) {
    return (
      <div className="flex items-center gap-1 px-1.5 py-1">
        {display}
        <button
          type="button"
          onClick={start}
          aria-label={`Editar: ${label}`}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          {editIcon}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      aria-label={`Editar: ${label}`}
      title={value || undefined}
      className={cn(
        "w-full rounded-md px-1.5 py-1 text-left break-words hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        !value && "text-muted-foreground",
        className,
      )}
    >
      {value || placeholder}
    </button>
  );
}
