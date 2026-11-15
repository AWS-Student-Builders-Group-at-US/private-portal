"use client";

import { useCallback, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteNote, updateNote } from "../actions";
import { formatNoteRange } from "../notes";
import type { AvailabilityNote } from "../types";
import { NoteForm } from "./note-form";

// Notes of one week. With `editable`, each row can be edited or deleted
// (only the member's own notes are passed in that case; RLS enforces it).
// With `authors`, each row shows who wrote it.
export function NoteList({
  notes,
  empty,
  editable = false,
  authors,
}: {
  notes: AvailabilityNote[];
  empty: string;
  editable?: boolean;
  authors?: Map<string, string>;
}) {
  if (notes.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="divide-y rounded-lg border">
      {notes.map((note) => (
        <NoteRow
          key={note.id}
          note={note}
          editable={editable}
          author={authors?.get(note.member_email) ?? (authors ? note.member_email : undefined)}
        />
      ))}
    </ul>
  );
}

function NoteRow({
  note,
  editable,
  author,
}: {
  note: AvailabilityNote;
  editable: boolean;
  author?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const close = useCallback(() => setEditing(false), []);

  if (editing) {
    return (
      <li className="px-4 py-3">
        <NoteForm
          action={updateNote.bind(null, note.id)}
          rect={note}
          defaults={{ title: note.title, body: note.body }}
          submitLabel="Guardar"
          onDone={close}
          onCancel={close}
        />
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-3 px-4 py-2 text-sm">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p>
          {author && <span className="font-medium">{author} · </span>}
          <span className="font-medium">{note.title}</span>
        </p>
        <p className="text-xs text-muted-foreground">{formatNoteRange(note)}</p>
        {note.body && <p className="whitespace-pre-line break-words">{note.body}</p>}
        {error && (
          <p className="text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
      {editable && (
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Editar la nota «${note.title}»`}
            disabled={pending}
            onClick={() => setEditing(true)}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Eliminar la nota «${note.title}»`}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteNote(note.id);
                setError(result.ok ? null : result.message);
              })
            }
          >
            <Trash2 />
          </Button>
        </div>
      )}
    </li>
  );
}
