import {
  madridLocalToUtcIso,
  utcIsoToMadridLocal,
} from "@/features/events/time";

// Pure availability logic. Times are Madrid wall-clock minutes since midnight;
// dates are Madrid calendar dates "YYYY-MM-DD". Weekdays: 0 = Monday … 6 = Sunday.

export const DAY_START = 8 * 60; // 08:00
export const DAY_END = 22 * 60; // 22:00
export const SLOT_MINUTES = 30;
export const SLOTS_PER_DAY = (DAY_END - DAY_START) / SLOT_MINUTES;

// Google busy time already converted to a Madrid day (see busyBlocksToRanges).
// `weight` is the feed importance (1 or 0.5); `source` is the feed id, if known.
export type DayRange = {
  date: string;
  start: number;
  end: number;
  weight: number;
  source?: string;
};
// Busy block as returned by getBusyBlocks (Date objects; ISO strings also
// accepted). Blocks without a weight count as 1.
export type BusyBlock = {
  start: Date | string;
  end: Date | string;
  weight?: number;
  feedId?: string;
};

// "09:30" or "09:30:00" -> 570.
export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// 570 -> "09:30".
export function minutesToTime(total: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function slotIndex(minutes: number) {
  return Math.floor((minutes - DAY_START) / SLOT_MINUTES);
}

export function slotStart(index: number) {
  return DAY_START + index * SLOT_MINUTES;
}

function dateToUtc(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(date: string, days: number) {
  const d = dateToUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(date: string) {
  return (dateToUtc(date).getUTCDay() + 6) % 7;
}

// Monday of the week that contains `date`.
export function weekStart(date: string) {
  return addDays(date, -weekdayOf(date));
}

export function weekDates(monday: string) {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function minutesOfLocal(local: string) {
  return timeToMinutes(local.slice(11, 16));
}

// UTC busy blocks -> Madrid day ranges, split at Madrid midnight.
export function busyBlocksToRanges(blocks: BusyBlock[]): DayRange[] {
  const ranges: DayRange[] = [];
  for (const block of blocks) {
    const endMs = new Date(block.end).getTime();
    let cur = new Date(block.start).getTime();
    if (!(endMs > cur)) continue;
    while (cur < endMs) {
      const local = utcIsoToMadridLocal(new Date(cur).toISOString());
      const date = local.slice(0, 10);
      const nextMidnight = new Date(
        madridLocalToUtcIso(`${addDays(date, 1)}T00:00`),
      ).getTime();
      const segEnd = Math.min(endMs, nextMidnight);
      ranges.push({
        date,
        start: minutesOfLocal(local),
        end:
          segEnd === nextMidnight
            ? 24 * 60
            : minutesOfLocal(utcIsoToMadridLocal(new Date(segEnd).toISOString())),
        weight: block.weight ?? 1,
        ...(block.feedId ? { source: block.feedId } : {}),
      });
      cur = segEnd;
    }
  }
  return ranges;
}
