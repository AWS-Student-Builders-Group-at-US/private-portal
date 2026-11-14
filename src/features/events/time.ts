// Europe/Madrid wall time <-> UTC conversion, without date libraries.
// `datetime-local` inputs hold Madrid wall time ("YYYY-MM-DDTHH:mm");
// the database stores UTC instants (timestamptz).

export const EVENT_TIME_ZONE = "Europe/Madrid";

const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: EVENT_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const displayFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: EVENT_TIME_ZONE,
  dateStyle: "full",
  timeStyle: "short",
});

const shortDisplayFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: EVENT_TIME_ZONE,
  dateStyle: "medium",
  timeStyle: "short",
});

type WallTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function madridWallTime(ms: number): WallTime & { second: number } {
  const values: Record<string, number> = {};
  for (const part of partsFormatter.formatToParts(new Date(ms))) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

// Madrid offset from UTC (in ms) at the given instant.
function madridOffsetMs(ms: number) {
  const wall = madridWallTime(ms);
  const wallAsUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second,
  );
  return wallAsUtc - (ms - (ms % 1000));
}

export function isValidMadridLocal(value: string) {
  const match = LOCAL_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day &&
    probe.getUTCHours() === hour &&
    probe.getUTCMinutes() === minute
  );
}

// "2026-07-15T19:00" (Madrid) -> "2026-07-15T17:00:00.000Z".
// Times inside the spring-forward gap resolve to the later offset; times in
// the autumn overlap resolve to one of the two valid instants.
export function madridLocalToUtcIso(local: string): string {
  if (!isValidMadridLocal(local)) {
    throw new Error(`Invalid local date-time: ${local}`);
  }
  const [year, month, day, hour, minute] = LOCAL_PATTERN.exec(local)!
    .slice(1)
    .map(Number);
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);

  // Two passes settle the offset when the first guess lands across a DST change.
  let utc = wallAsUtc - madridOffsetMs(wallAsUtc);
  utc = wallAsUtc - madridOffsetMs(utc);
  return new Date(utc).toISOString();
}

// UTC instant (ISO or Postgres timestamptz text) -> Madrid "YYYY-MM-DDTHH:mm".
export function utcIsoToMadridLocal(iso: string): string {
  const wall = madridWallTime(new Date(iso).getTime());
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${wall.year}-${pad(wall.month)}-${pad(wall.day)}T${pad(wall.hour)}:${pad(wall.minute)}`;
}

// "miércoles, 15 de julio de 2026, 19:00"
export function formatMadridDateTime(iso: string) {
  return displayFormatter.format(new Date(iso));
}

// "15 jul 2026, 19:00"
export function formatMadridDateTimeShort(iso: string) {
  return shortDisplayFormatter.format(new Date(iso));
}
