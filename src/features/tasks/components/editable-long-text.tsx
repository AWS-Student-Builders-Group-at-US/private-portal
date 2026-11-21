"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Popup width grows with the text: short notes stay compact, long ones get
// room to read and edit (always within the viewport).
function popupWidth(text: string) {
  if (text.length < 80) return "w-[min(20rem,90vw)]";
  if (text.length < 400) return "w-[min(30rem,90vw)]";
  return "w-[min(42rem,90vw)]";
}

// Long text (e.g. a task description) shown clamped in the cell; clicking
// opens a floating editor sized to the text. The textarea grows with its
// content up to 60% of the viewport. Ctrl/⌘+Enter or «Guardar» or clicking
// outside saves; Escape or «Cancelar» discards.
export function EditableLongText({
  label,
  value,
  onSave,
  maxLength,
  placeholder = "—",
  className,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const textarea = useRef<HTMLTextAreaElement>(null);

  // Fit the textarea height to its content.
  useLayoutEffect(() => {
    const el = textarea.current;
    if (!open || !el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [open, draft]);

  function save() {
    setOpen(false);
    const next = draft.trim();
    if (next !== value.trim()) onSave(next);
  }

  function cancel() {
    setOpen(false);
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next, details) => {
        if (next) {
          setDraft(value);
          setOpen(true);
        } else if (details.reason === "escape-key") {
          cancel();
        } else {
          save();
        }
      }}
    >
      <Popover.Trigger
        aria-label={`Editar: ${label}`}
        title={value || undefined}
        className={cn(
          "line-clamp-2 w-full rounded-md px-1.5 py-1 text-left break-words whitespace-pre-line hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          !value && "text-muted-foreground",
          className,
        )}
      >
        {value || placeholder}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={4} className="z-30">
          <Popover.Popup
            initialFocus={textarea}
            className={cn(
              "flex flex-col gap-2 rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg outline-none",
              popupWidth(draft),
            )}
          >
            <textarea
              ref={textarea}
              aria-label={label}
              value={draft}
              maxLength={maxLength}
              rows={3}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  save();
                }
              }}
              className="max-h-[60vh] min-h-20 w-full resize-none overflow-y-auto rounded-md border border-input bg-background px-2 py-1.5 text-sm leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Ctrl+Enter guarda · Esc cancela
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={cancel}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={save}>
                  Guardar
                </Button>
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
