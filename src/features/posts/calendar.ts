import { addDays, weekStart } from "@/features/availability/slots";

// Month view helpers. Months are "YYYY-MM"; days are "YYYY-MM-DD".

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function parseMonth(value: string | string[] | undefined, fallback: string) {
  return typeof value === "string" && MONTH_PATTERN.test(value) ? value : fallback;
}

export function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

// Monday-first weeks that cover the whole month.
export function monthGrid(month: string): string[][] {
  const first = `${month}-01`;
  const last = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const weeks: string[][] = [];
  for (let day = weekStart(first); day <= last; day = addDays(day, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(day, i)));
  }
  return weeks;
}

const monthFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

export function formatMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  return monthFormatter.format(new Date(Date.UTC(year, m - 1, 1)));
}
