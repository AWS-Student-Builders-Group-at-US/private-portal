import ical, { type DateWithTimeZone, type VEvent } from "node-ical";
import { madridLocalToUtcIso } from "@/features/events/time";

export type BusyBlock = { start: Date; end: Date };

// Hard cap on recurrence periods walked per event; a hostile feed with
// FREQ=SECONDLY would otherwise produce millions of instances.
const MAX_ITERATIONS = 5000;

// node-ical returns all-day (DATE) values as local midnight of the process
// time zone (or midnight in their TZID when present). Recover the calendar
// day and pin it to midnight in Europe/Madrid.
function madridDayStart(date: DateWithTimeZone): Date {
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  let day = date.getDate();
  if (date.tz) {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: date.tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(date);
      const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
      [year, month, day] = [get("year"), get("month"), get("day")];
    } catch {
      // Unknown TZID: keep the local calendar day.
    }
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return new Date(madridLocalToUtcIso(`${year}-${pad(month)}-${pad(day)}T00:00`));
}

function isBusy(event: VEvent) {
  return event.status !== "CANCELLED" && event.transparency !== "TRANSPARENT";
}

// Merges overlapping or touching blocks; input need not be sorted.
export function mergeBlocks(blocks: BusyBlock[]): BusyBlock[] {
  const sorted = [...blocks].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: BusyBlock[] = [];
  for (const block of sorted) {
    const last = merged[merged.length - 1];
    if (last && block.start.getTime() <= last.end.getTime()) {
      if (block.end > last.end) last.end = block.end;
    } else {
      merged.push({ start: block.start, end: block.end });
    }
  }
  return merged;
}

/**
 * Pure: turns an iCalendar document into merged busy intervals inside
 * [from, to). Expands RRULE/EXDATE/RECURRENCE-ID, skips cancelled and
 * transparent ("free") events, maps all-day events to whole Madrid days and
 * returns only times, never titles or other details.
 */
export function extractBusyBlocks(icsText: string, from: Date, to: Date): BusyBlock[] {
  const parsed = ical.sync.parseICS(icsText);
  const blocks: BusyBlock[] = [];

  for (const component of Object.values(parsed)) {
    if (!component || component.type !== "VEVENT") continue;
    const event = component as VEvent;
    if (!event.start) continue;

    let instances: ReturnType<typeof ical.expandRecurringEvent>;
    try {
      instances = ical.expandRecurringEvent(event, {
        from,
        to,
        expandOngoing: true,
        maxIterations: MAX_ITERATIONS,
      });
    } catch {
      continue; // Malformed or runaway rule: ignore this event only.
    }

    for (const instance of instances) {
      if (!isBusy(instance.event)) continue;
      const start = instance.isFullDay ? madridDayStart(instance.start) : instance.start;
      const end = instance.isFullDay ? madridDayStart(instance.end) : instance.end;
      const clippedStart = new Date(Math.max(start.getTime(), from.getTime()));
      const clippedEnd = new Date(Math.min(end.getTime(), to.getTime()));
      if (clippedEnd > clippedStart) blocks.push({ start: clippedStart, end: clippedEnd });
    }
  }

  return mergeBlocks(blocks);
}
