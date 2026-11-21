// Pure iCalendar (RFC 5545) writer for the shared "AWS US - Student Builder
// Group" subscription feed: the team events plus the members' calendar
// entries marked as group meetings (never their personal entries).

export const GROUP_CALENDAR_NAME = "AWS US - Student Builder Group";
export const GROUP_CALENDAR_FILENAME = "aws-us-student-builder-group.ics";

export type ExportEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  meetup_url: string | null;
};

// A calendar entry with is_group_meeting = true.
export type GroupMeeting = {
  id: string;
  title: string;
  notes: string | null;
  starts_at: string;
  ends_at: string;
};

// Events without an end time are shown as two hours long.
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;
const MAX_LINE_OCTETS = 75;

// TEXT value escaping: backslash, comma, semicolon and newlines.
export function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r\n|\r|\n/g, "\\n");
}

// Folds a content line at 75 octets (continuation lines start with a space),
// never splitting a UTF-8 character.
export function foldLine(line: string) {
  const chunks: string[] = [];
  let current = "";
  let octets = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char, "utf8");
    // Continuation lines spend one octet on the leading space.
    const limit = chunks.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    if (octets + size > limit) {
      chunks.push(current);
      current = "";
      octets = 0;
    }
    current += char;
    octets += size;
  }
  chunks.push(current);
  return chunks.join("\r\n ");
}

// 2026-07-15T17:05:09.123Z -> 20260715T170509Z
export function formatUtc(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildTeamCalendar(
  events: ExportEvent[],
  {
    now,
    domain,
    groupMeetings = [],
  }: { now: Date; domain: string; groupMeetings?: GroupMeeting[] },
) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AWS US Student Builder Group//Calendario//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(GROUP_CALENDAR_NAME)}`,
    "X-WR-TIMEZONE:Europe/Madrid",
  ];
  for (const event of events) {
    const start = new Date(event.starts_at);
    const end = event.ends_at
      ? new Date(event.ends_at)
      : new Date(start.getTime() + DEFAULT_DURATION_MS);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@${domain}`,
      `DTSTAMP:${formatUtc(now)}`,
      `DTSTART:${formatUtc(start)}`,
      `DTEND:${formatUtc(end)}`,
      `SUMMARY:${escapeText(event.title)}`,
    );
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    if (event.meetup_url) {
      lines.push(`DESCRIPTION:${escapeText(`Meetup: ${event.meetup_url}`)}`);
      lines.push(`URL:${event.meetup_url}`);
    }
    lines.push("END:VEVENT");
  }
  // Prefixed UIDs: entry ids never collide with event ids.
  for (const meeting of groupMeetings) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:entry-${meeting.id}@${domain}`,
      `DTSTAMP:${formatUtc(now)}`,
      `DTSTART:${formatUtc(new Date(meeting.starts_at))}`,
      `DTEND:${formatUtc(new Date(meeting.ends_at))}`,
      `SUMMARY:${escapeText(meeting.title)}`,
    );
    if (meeting.notes) lines.push(`DESCRIPTION:${escapeText(meeting.notes)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
