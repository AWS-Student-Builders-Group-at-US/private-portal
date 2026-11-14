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

export const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export type TemplateRange = { weekday: number; start_time: string; end_time: string };
export type OverrideRange = {
  date: string;
  start_time: string;
  end_time: string;
  kind: "free" | "busy";
};
// Busy time already converted to a Madrid day (see busyBlocksToRanges).
export type DayRange = { date: string; start: number; end: number };
// Busy block as returned by getBusyBlocks (UTC instants).
export type BusyBlock = { start: string; end: string };

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

type Interval = [number, number];

function mergeIntervals(intervals: Interval[]): Interval[] {
  const sortedIntervals = intervals
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);
  const merged: Interval[] = [];
  for (const [start, end] of sortedIntervals) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

// Slots (indices) in which a person is free on `date`:
// template for that weekday + "free" overrides, minus "busy" overrides and
// Google busy time. A slot counts as free only when fully covered by free
// time and not touched by any busy time.
export function freeSlotsForDay(
  date: string,
  data: {
    template: TemplateRange[];
    overrides: OverrideRange[];
    busy: DayRange[];
  },
): Set<number> {
  const weekday = weekdayOf(date);
  const free = mergeIntervals([
    ...data.template
      .filter((t) => t.weekday === weekday)
      .map((t): Interval => [timeToMinutes(t.start_time), timeToMinutes(t.end_time)]),
    ...data.overrides
      .filter((o) => o.date === date && o.kind === "free")
      .map((o): Interval => [timeToMinutes(o.start_time), timeToMinutes(o.end_time)]),
  ]);
  const busy: Interval[] = [
    ...data.overrides
      .filter((o) => o.date === date && o.kind === "busy")
      .map((o): Interval => [timeToMinutes(o.start_time), timeToMinutes(o.end_time)]),
    ...data.busy.filter((b) => b.date === date).map((b): Interval => [b.start, b.end]),
  ];

  const result = new Set<number>();
  for (let i = 0; i < SLOTS_PER_DAY; i++) {
    const start = slotStart(i);
    const end = start + SLOT_MINUTES;
    const covered = free.some(([fs, fe]) => fs <= start && fe >= end);
    const blocked = busy.some(([bs, be]) => bs < end && be > start);
    if (covered && !blocked) result.add(i);
  }
  return result;
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
      });
      cur = segEnd;
    }
  }
  return ranges;
}

// Free slot indices per person per date: { [person]: { [date]: number[] } }.
export type FreeByMember = Record<string, Record<string, number[]>>;

// How many of the selected people are free in each slot of each date.
export function teamCounts(
  perMember: FreeByMember,
  selected: string[],
  dates: string[],
): Record<string, number[]> {
  const counts: Record<string, number[]> = {};
  for (const date of dates) {
    const row = new Array<number>(SLOTS_PER_DAY).fill(0);
    for (const person of selected) {
      for (const index of perMember[person]?.[date] ?? []) row[index] += 1;
    }
    counts[date] = row;
  }
  return counts;
}

export type CommonRange = { date: string; start: string; end: string };

// Consecutive slots in which every selected person is free.
export function commonFreeRanges(
  perMember: FreeByMember,
  selected: string[],
  dates: string[],
): CommonRange[] {
  if (selected.length === 0) return [];
  const counts = teamCounts(perMember, selected, dates);
  const ranges: CommonRange[] = [];
  for (const date of dates) {
    let runStart: number | null = null;
    for (let i = 0; i <= SLOTS_PER_DAY; i++) {
      const all = i < SLOTS_PER_DAY && counts[date][i] === selected.length;
      if (all && runStart === null) runStart = i;
      if (!all && runStart !== null) {
        ranges.push({
          date,
          start: minutesToTime(slotStart(runStart)),
          end: minutesToTime(slotStart(i)),
        });
        runStart = null;
      }
    }
  }
  return ranges;
}

// Painted grid cells are "weekday:slot" keys.
export const cellKey = (weekday: number, slot: number) => `${weekday}:${slot}`;

export function cellsToTemplateRanges(cells: Set<string>): TemplateRange[] {
  const ranges: TemplateRange[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    let runStart: number | null = null;
    for (let i = 0; i <= SLOTS_PER_DAY; i++) {
      const on = i < SLOTS_PER_DAY && cells.has(cellKey(weekday, i));
      if (on && runStart === null) runStart = i;
      if (!on && runStart !== null) {
        ranges.push({
          weekday,
          start_time: minutesToTime(slotStart(runStart)),
          end_time: minutesToTime(slotStart(i)),
        });
        runStart = null;
      }
    }
  }
  return ranges;
}

export function templateToCells(ranges: TemplateRange[]): Set<string> {
  const cells = new Set<string>();
  for (const range of ranges) {
    const start = timeToMinutes(range.start_time);
    const end = timeToMinutes(range.end_time);
    for (let i = 0; i < SLOTS_PER_DAY; i++) {
      if (slotStart(i) >= start && slotStart(i) + SLOT_MINUTES <= end) {
        cells.add(cellKey(range.weekday, i));
      }
    }
  }
  return cells;
}
