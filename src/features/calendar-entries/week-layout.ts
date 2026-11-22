import { DAY_END, DAY_START, timeToMinutes } from "@/features/availability/slots";

// Pure layout for the team week calendar: places a day's agenda items
// ("HH:MM" Madrid times) as blocks in side-by-side lanes when they overlap.

const DAY_MINUTES = 24 * 60;

type Timed = { start: string; end: string };

export type DayBlock<T extends Timed> = T & {
  startMinutes: number;
  endMinutes: number;
  // Lane of this block and number of lanes in its group of overlaps.
  lane: number;
  lanes: number;
};

function minutes({ start, end }: Timed) {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  // An item that crosses midnight (end <= start) runs to the end of its day.
  return { startMinutes, endMinutes: endMinutes > startMinutes ? endMinutes : DAY_MINUTES };
}

// Sorted by start (longer first). Items that overlap, directly or through a
// chain, form one group; inside it each item takes the first free lane and
// every item of the group shares the group's lane count. Touching items
// (one ends when the next starts) do not overlap.
export function layoutDay<T extends Timed>(items: T[]): DayBlock<T>[] {
  const sorted = items
    .map((item) => ({ ...item, ...minutes(item), lane: 0, lanes: 1 }))
    .sort((a, b) => a.startMinutes - b.startMinutes || b.endMinutes - a.endMinutes);

  let group: DayBlock<T>[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -1;
  const closeGroup = () => {
    for (const block of group) block.lanes = laneEnds.length;
    group = [];
    laneEnds = [];
  };

  for (const block of sorted) {
    if (block.startMinutes >= groupEnd) closeGroup();
    const free = laneEnds.findIndex((end) => end <= block.startMinutes);
    block.lane = free === -1 ? laneEnds.length : free;
    laneEnds[block.lane] = block.endMinutes;
    groupEnd = Math.max(groupEnd, block.endMinutes);
    group.push(block);
  }
  closeGroup();
  return sorted;
}

// Visible hours of the week grid in minutes: the usual 08:00–22:00, widened
// to whole hours so every item fits.
export function hourRange(items: Timed[]) {
  let from = DAY_START;
  let to = DAY_END;
  for (const item of items) {
    const { startMinutes, endMinutes } = minutes(item);
    from = Math.min(from, Math.floor(startMinutes / 60) * 60);
    to = Math.max(to, Math.ceil(endMinutes / 60) * 60);
  }
  return { from, to };
}
