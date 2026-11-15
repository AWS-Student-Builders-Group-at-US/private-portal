import { formatDay } from "./dates";
import { SLOT_MINUTES, minutesToTime, slotStart } from "./slots";

// Shared availability notes. A note is a rectangle on the week grid: every
// Madrid date from `start_date` to `end_date` (inclusive), between
// `start_minute` and `end_minute` (minutes since midnight) on each of them.

export type NoteRect = {
  start_date: string;
  end_date: string;
  start_minute: number;
  end_minute: number;
};

// One cell of the week grid.
export type CellRef = { date: string; slot: number };

// Normalizes two picked corners (in any order) into a rectangle that
// includes both end cells.
export function rectFromCorners(a: CellRef, b: CellRef): NoteRect {
  const [firstDate, lastDate] = a.date <= b.date ? [a.date, b.date] : [b.date, a.date];
  const firstSlot = Math.min(a.slot, b.slot);
  const lastSlot = Math.max(a.slot, b.slot);
  return {
    start_date: firstDate,
    end_date: lastDate,
    start_minute: slotStart(firstSlot),
    end_minute: slotStart(lastSlot) + SLOT_MINUTES,
  };
}

// Notes that share at least one date with `dates` (a week, in order).
export function notesInWeek<T extends NoteRect>(notes: T[], dates: string[]): T[] {
  if (dates.length === 0) return [];
  const first = dates[0];
  const last = dates[dates.length - 1];
  return notes.filter((note) => note.start_date <= last && note.end_date >= first);
}

// True when the note touches the grid slot `slot` of `date`.
export function noteCoversCell(note: NoteRect, date: string, slot: number) {
  if (date < note.start_date || date > note.end_date) return false;
  const from = slotStart(slot);
  return note.start_minute < from + SLOT_MINUTES && note.end_minute > from;
}

export function notesForCell<T extends NoteRect>(notes: T[], date: string, slot: number): T[] {
  return notes.filter((note) => noteCoversCell(note, date, slot));
}

// "mar, 17 nov · 10:00–12:00" or "mar, 17 nov – mié, 18 nov · 10:00–12:00".
export function formatNoteRange(note: NoteRect) {
  const days =
    note.start_date === note.end_date
      ? formatDay(note.start_date)
      : `${formatDay(note.start_date)} – ${formatDay(note.end_date)}`;
  return `${days} · ${minutesToTime(note.start_minute)}–${minutesToTime(note.end_minute)}`;
}
