import { utcIsoToMadridLocal } from "@/features/events/time";
import { minutesToTime, type DayRange } from "@/features/availability/slots";
import type { CalendarEntry } from "./types";

// Pure helpers for the team agenda (per-day list of each person's busy time).

export const BUSY_LABEL = "Ocupado";

// What other members may see of an entry. The database already nulls the
// title of someone else's busy-only entry; this repeats the rule so the UI
// never shows it even if a title slipped through.
export function entryLabel(entry: CalendarEntry) {
  const visible = entry.is_own || entry.is_group_meeting || entry.visibility === "details";
  return (visible && entry.title) || BUSY_LABEL;
}

export type TimeRange = { date: string; start: number; end: number };

// Merges overlapping or touching ranges per date (drops weight and source,
// so only busy times remain), sorted by date and start.
export function mergeRanges(ranges: DayRange[] | TimeRange[]): TimeRange[] {
  const sorted = [...ranges]
    .map(({ date, start, end }) => ({ date, start, end }))
    .sort((a, b) => (a.date === b.date ? a.start - b.start : a.date < b.date ? -1 : 1));
  const merged: TimeRange[] = [];
  for (const range of sorted) {
    const last = merged.at(-1);
    if (last && last.date === range.date && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const FALLBACK_HUES = [250, 145, 25, 300, 75, 190, 340, 110];

// members.color when it is a plain hex color (it ends up in a style
// attribute); otherwise a stable fallback picked by the member's position.
export function memberColor(color: string | null | undefined, index: number) {
  if (color && HEX_COLOR.test(color)) return color;
  return `oklch(0.65 0.15 ${FALLBACK_HUES[index % FALLBACK_HUES.length]})`;
}

export type AgendaItem = {
  key: string;
  email: string;
  name: string;
  color: string;
  start: string;
  end: string;
  label: string;
  kind: "entry" | "google";
  groupMeeting: boolean;
};

const localDate = (iso: string) => utcIsoToMadridLocal(iso).slice(0, 10);
const localTime = (iso: string) => utcIsoToMadridLocal(iso).slice(11, 16);

// Busy time of the selected people on `date` (Madrid): their calendar entries
// (title when visible, otherwise "Ocupado") and their Google busy ranges
// (always "Ocupado"), sorted by start time, then by person order.
export function dayAgenda({
  date,
  members,
  selected,
  entries,
  google,
}: {
  date: string;
  members: { email: string; name: string; color: string | null }[];
  selected: string[];
  entries: CalendarEntry[];
  google: Record<string, TimeRange[]>;
}): AgendaItem[] {
  const chosen = new Set(selected);
  const order = new Map(members.map((m, i) => [m.email, i]));
  const items: (AgendaItem & { order: number })[] = [];
  members.forEach((member, index) => {
    if (!chosen.has(member.email)) return;
    const base = {
      email: member.email,
      name: member.name,
      color: memberColor(member.color, index),
      order: index,
    };
    for (const range of google[member.email] ?? []) {
      if (range.date !== date) continue;
      items.push({
        ...base,
        key: `g-${member.email}-${range.start}`,
        start: minutesToTime(range.start),
        end: minutesToTime(range.end),
        label: BUSY_LABEL,
        kind: "google",
        groupMeeting: false,
      });
    }
  });
  for (const entry of entries) {
    const index = order.get(entry.member_email);
    if (index === undefined || !chosen.has(entry.member_email)) continue;
    if (localDate(entry.starts_at) !== date) continue;
    const member = members[index];
    items.push({
      key: `e-${entry.id}`,
      email: member.email,
      name: member.name,
      color: memberColor(member.color, index),
      order: index,
      start: localTime(entry.starts_at),
      end: localTime(entry.ends_at),
      label: entryLabel(entry),
      kind: "entry",
      groupMeeting: entry.is_group_meeting,
    });
  }
  items.sort((a, b) => a.start.localeCompare(b.start) || a.order - b.order);
  return items.map((item) => {
    const copy: Partial<typeof item> = { ...item };
    delete copy.order;
    return copy as AgendaItem;
  });
}
