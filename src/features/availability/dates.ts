import { utcIsoToMadridLocal } from "@/features/events/time";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// "YYYY-MM-DD" that exists in the calendar.
export function isValidIsoDate(value: string) {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

// Today's calendar date in Madrid, "YYYY-MM-DD".
export function madridToday(now: Date = new Date()) {
  return utcIsoToMadridLocal(now.toISOString()).slice(0, 10);
}

const dayFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});

// "2026-11-20" -> "vie, 20 nov".
export function formatDay(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return dayFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}
