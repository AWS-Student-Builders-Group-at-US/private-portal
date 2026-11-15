const TIME_ZONE = "Europe/Madrid";

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const timeFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

// Date and time lines for an event card, in Madrid time:
// { date: "Viernes, 20 de noviembre", time: "18:00 – 20:00" }.
export function eventSchedule(startsAt: string, endsAt: string | null) {
  const date = dateFormatter.format(new Date(startsAt));
  const start = timeFormatter.format(new Date(startsAt));
  const time = endsAt ? `${start} – ${timeFormatter.format(new Date(endsAt))}` : start;
  return { date: date.charAt(0).toUpperCase() + date.slice(1), time };
}

// Avatar initials: first letter of the first two words, e.g. "José María" -> "JM".
export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}
