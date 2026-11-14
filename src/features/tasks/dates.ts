import { utcIsoToMadridLocal } from "@/features/events/time";

// Today's calendar date in Madrid, "YYYY-MM-DD".
export function madridToday(now: Date = new Date()) {
  return utcIsoToMadridLocal(now.toISOString()).slice(0, 10);
}

const dueFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

// "2026-11-20" -> "20 nov 2026" (a calendar date, no time zone shift).
export function formatDueDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return dueFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}
