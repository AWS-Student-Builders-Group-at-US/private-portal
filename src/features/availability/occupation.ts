import {
  SLOTS_PER_DAY,
  SLOT_MINUTES,
  minutesToTime,
  slotStart,
  type DayRange,
} from "./slots";

// Occupation model. Each member has, per 30-minute slot, a value in
// {0, 0.5, 1}: the MAX weight of the Google busy blocks that touch the slot
// (1 = can't move it, 0.5 = could move it), unless the member edited that slot
// by hand: a manual value replaces Google for that slot. The old weekly
// template and date overrides are no longer counted (their tables stay, unused).
// The team map shows availability: the number of selected members free in
// each slot (n … 0), i.e. n minus the sum of their occupation.

// A slot the member edited by hand (see availability_manual).
export type ManualSlot = { date: string; start: number; value: number };

export type MemberDayData = {
  busy: DayRange[];
  manual?: ManualSlot[];
};

export type GoogleHit = { source?: string; weight: number };
// `manual` is set when the member edited the slot; it is then the slot value.
export type SlotOccupation = { value: number; google: GoogleHit[]; manual?: number };

// Occupation per member per date: { [person]: { [date]: number[] } }.
export type OccupationByMember = Record<string, Record<string, number[]>>;

// Detailed occupation of one member on `date`, per slot of the grid.
export function slotOccupationForDay(date: string, data: MemberDayData): SlotOccupation[] {
  const google = data.busy.filter((b) => b.date === date);
  const manual = new Map(
    (data.manual ?? []).filter((m) => m.date === date).map((m) => [m.start, m.value]),
  );
  return Array.from({ length: SLOTS_PER_DAY }, (_, i) => {
    const from = slotStart(i);
    const to = from + SLOT_MINUTES;
    const hits: GoogleHit[] = google
      .filter((b) => b.start < to && b.end > from)
      .map((b) => (b.source ? { source: b.source, weight: b.weight } : { weight: b.weight }));
    const edited = manual.get(from);
    if (edited !== undefined) return { value: edited, google: hits, manual: edited };
    const value = Math.max(0, ...hits.map((h) => h.weight));
    return { value, google: hits };
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

// Number of selected members free per slot of each date (n … 0): n minus the
// team occupation, so n = everyone free and 0 = nobody free.
export function teamAvailability(
  perMember: OccupationByMember,
  selected: string[],
  dates: string[],
): Record<string, number[]> {
  const sums = teamOccupation(perMember, selected, dates);
  return Object.fromEntries(
    dates.map((date) => [date, sums[date].map((sum) => selected.length - sum)]),
  );
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
