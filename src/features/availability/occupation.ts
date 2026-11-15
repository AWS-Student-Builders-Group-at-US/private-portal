import {
  SLOTS_PER_DAY,
  SLOT_MINUTES,
  minutesToTime,
  slotStart,
  timeToMinutes,
  weekdayOf,
  type DayRange,
  type OverrideRange,
  type TemplateRange,
} from "./slots";

// Occupation model. Each member has, per 30-minute slot, a value in
// {0, 0.5, 1}: the MAX of everything that touches the slot.
// - Google busy block -> the weight of its feed (1 = can't move, 0.5 = could move).
// - "busy" date override -> 1.
// - Weekly template (only when the member painted one): slots not fully inside
//   that weekday's free windows -> 1. A "free" date override sets this manual
//   part to 0 for its range; Google weights still apply.
// The team map sums the occupation of the selected members (0 … n).

export type MemberDayData = {
  template: TemplateRange[];
  overrides: OverrideRange[];
  busy: DayRange[];
};

export type GoogleHit = { source?: string; weight: number };
export type SlotOccupation = { value: number; manual: number; google: GoogleHit[] };

// Occupation per member per date: { [person]: { [date]: number[] } }.
export type OccupationByMember = Record<string, Record<string, number[]>>;

type Interval = [number, number];

const toInterval = (start: string, end: string): Interval => [
  timeToMinutes(start),
  timeToMinutes(end),
];
const overlaps = ([start, end]: Interval, slotFrom: number, slotTo: number) =>
  start < slotTo && end > slotFrom;
const covers = ([start, end]: Interval, slotFrom: number, slotTo: number) =>
  start <= slotFrom && end >= slotTo;

// Detailed occupation of one member on `date`, per slot of the grid.
export function slotOccupationForDay(date: string, data: MemberDayData): SlotOccupation[] {
  const weekday = weekdayOf(date);
  const hasTemplate = data.template.length > 0;
  const freeWindows = data.template
    .filter((t) => t.weekday === weekday)
    .map((t) => toInterval(t.start_time, t.end_time));
  const dayOverrides = data.overrides.filter((o) => o.date === date);
  const freeOverrides = dayOverrides
    .filter((o) => o.kind === "free")
    .map((o) => toInterval(o.start_time, o.end_time));
  const busyOverrides = dayOverrides
    .filter((o) => o.kind === "busy")
    .map((o) => toInterval(o.start_time, o.end_time));
  const google = data.busy.filter((b) => b.date === date);

  return Array.from({ length: SLOTS_PER_DAY }, (_, i) => {
    const from = slotStart(i);
    const to = from + SLOT_MINUTES;
    let manual = 0;
    if (hasTemplate && !freeWindows.some((w) => covers(w, from, to))) manual = 1;
    if (freeOverrides.some((w) => covers(w, from, to))) manual = 0;
    if (busyOverrides.some((w) => overlaps(w, from, to))) manual = 1;
    const hits: GoogleHit[] = google
      .filter((b) => overlaps([b.start, b.end], from, to))
      .map((b) => (b.source ? { source: b.source, weight: b.weight } : { weight: b.weight }));
    const value = Math.max(manual, ...hits.map((h) => h.weight));
    return { value, manual, google: hits };
  });
}

export function occupationForDay(date: string, data: MemberDayData): number[] {
  return slotOccupationForDay(date, data).map((slot) => slot.value);
}

// Sum of the selected members' occupation per slot of each date (0 … n).
export function teamOccupation(
  perMember: OccupationByMember,
  selected: string[],
  dates: string[],
): Record<string, number[]> {
  const sums: Record<string, number[]> = {};
  for (const date of dates) {
    const row = new Array<number>(SLOTS_PER_DAY).fill(0);
    for (const person of selected) {
      perMember[person]?.[date]?.forEach((value, i) => (row[i] += value));
    }
    sums[date] = row;
  }
  return sums;
}

export type CommonRange = { date: string; start: string; end: string };

// Consecutive slots in which the team sum is 0 (everyone selected is free).
export function commonFreeRanges(
  perMember: OccupationByMember,
  selected: string[],
  dates: string[],
): CommonRange[] {
  if (selected.length === 0) return [];
  const sums = teamOccupation(perMember, selected, dates);
  const ranges: CommonRange[] = [];
  for (const date of dates) {
    let runStart: number | null = null;
    for (let i = 0; i <= SLOTS_PER_DAY; i++) {
      const free = i < SLOTS_PER_DAY && sums[date][i] === 0;
      if (free && runStart === null) runStart = i;
      if (!free && runStart !== null) {
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

// Position of `value` on the 0 … max scale, clamped to [0, 1]; 0 when max <= 0.
export function occupationRatio(value: number, max: number) {
  if (!(max > 0)) return 0;
  return Math.min(1, Math.max(0, value / max));
}

const GREEN_HUE = 145;
const RED_HUE = 25;

// Green (0) -> amber -> red (max). Fixed lightness/chroma so the cell reads
// on light and dark themes with dark text on top.
export function occupationColor(value: number, max: number) {
  const hue = GREEN_HUE + (RED_HUE - GREEN_HUE) * occupationRatio(value, max);
  return `oklch(0.8 0.14 ${Math.round(hue)})`;
}

// 1.5 -> "1,5".
export function formatOccupation(value: number) {
  return String(Math.round(value * 10) / 10).replace(".", ",");
}
