import "server-only";
import { cacheLife } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { listBusyBlocks, type BusyBlockRow } from "@/features/calendars/busy";
import { isOutsideGoogleWindow } from "@/features/calendars/window";
import { madridLocalToUtcIso } from "@/features/events/time";
import { hideCommonAccount } from "@/features/members/common-account";
import { mergeRanges } from "@/features/calendar-entries/agenda";
import { listCalendarEntries } from "@/features/calendar-entries/queries";
import type { CalendarEntry } from "@/features/calendar-entries/types";
import {
  occupationForDay,
  onlineForDay,
  slotOccupationForDay,
  type ManualSlot,
  type OccupationByMember,
  type OnlineByMember,
} from "./occupation";
import { addDays, busyBlocksToRanges, weekDates } from "./slots";
import type { AvailabilityNote, MyWeek, TeamWeek } from "./types";

// All reads use the user's session; RLS only returns rows to members.
// getMyWeek and getTeamWeek are "use cache: private": cached per session in
// the browser only (never in a shared server cache), so the calendar can be
// prefetched and reopened instantly; every calendar Server Action calls
// revalidatePath, which clears that client cache for the member who changed
// something. Google feeds are refreshed by the page with
// refreshStaleFeedsAfterResponse (after() cannot run in a cached scope).
// Occupation comes from Google calendars, the member's calendar entries and
// their hand slot edits (which win, see occupation.ts); the legacy
// availability_template/availability_override tables are no longer read.

const NOTE_COLUMNS =
  "id, member_email, start_date, end_date, start_minute, end_minute, title, body";

function weekBounds(monday: string) {
  return {
    from: new Date(madridLocalToUtcIso(`${monday}T00:00`)),
    to: new Date(madridLocalToUtcIso(`${addDays(monday, 7)}T00:00`)),
  };
}

// Calendar entries as day ranges (`source` = entry id); each counts as busy.
function entryRanges(entries: CalendarEntry[]) {
  return busyBlocksToRanges(
    entries.map((e) => ({ start: e.starts_at, end: e.ends_at, weight: 1, feedId: e.id })),
  );
}

// Hand-edited slots of the week of `dates`, per member email, optionally only
// one member's.
async function getWeekManual(
  dates: string[],
  email?: string,
): Promise<Map<string, ManualSlot[]>> {
  const supabase = await createClient();
  let query = supabase
    .from("availability_manual")
    .select("member_email, date, start_minute, value, online_only")
    .gte("date", dates[0])
    .lte("date", dates[6]);
  if (email) query = query.eq("member_email", email);
  const { data, error } = await query;
  const byMember = new Map<string, ManualSlot[]>();
  // Without the hand edits the grid still works from Google alone (e.g. while
  // the availability_manual migration is not applied yet on a preview).
  if (error) return byMember;
  for (const row of data) {
    const slots = byMember.get(row.member_email) ?? [];
    slots.push({
      date: row.date,
      start: row.start_minute,
      value: row.value === null ? null : Number(row.value),
      onlineOnly: row.online_only === true,
    });
    byMember.set(row.member_email, slots);
  }
  return byMember;
}

// Notes overlapping the week of `dates`, optionally only one member's.
async function getWeekNotes(dates: string[], email?: string): Promise<AvailabilityNote[]> {
  const supabase = await createClient();
  let query = supabase
    .from("availability_notes")
    .select(NOTE_COLUMNS)
    .lte("start_date", dates[6])
    .gte("end_date", dates[0]);
  if (email) query = query.eq("member_email", email);
  const { data, error } = await query
    .order("start_date")
    .order("start_minute")
    .order("created_at");
  if (error) throw new Error("No se pudieron cargar las notas.");
  return data as AvailabilityNote[];
}

// The member's own occupation per slot for the week starting on `monday`,
// from their Google busy blocks (served from cache), their calendar entries
// and their hand edits (which replace both in the edited slots), plus their
// notes and entries.
export async function getMyWeek(email: string, monday: string): Promise<MyWeek> {
  "use cache: private";
  cacheLife("minutes");
  const dates = weekDates(monday);
  const { from, to } = weekBounds(monday);
  const [busyByMember, notes, manual, allEntries] = await Promise.all([
    listBusyBlocks(from, to, email).catch(() => new Map<string, BusyBlockRow[]>()),
    getWeekNotes(dates, email),
    getWeekManual(dates, email),
    listCalendarEntries(from, to),
  ]);
  const entries = allEntries.filter((entry) => entry.is_own);
  const data = {
    busy: busyBlocksToRanges(busyByMember.get(email.toLowerCase()) ?? []),
    manual: manual.get(email) ?? [],
    entries: entryRanges(entries),
  };
  return {
    dates,
    days: Object.fromEntries(dates.map((date) => [date, slotOccupationForDay(date, data)])),
    notes,
    entries,
    outsideGoogleWindow: isOutsideGoogleWindow(from, to),
  };
}

// Occupation (0, 0.5 or 1) of every member per slot for the week starting on
// `monday`, plus every member's notes, calendar entries and merged Google busy
// time for that week.
export async function getTeamWeek(monday: string): Promise<TeamWeek> {
  "use cache: private";
  cacheLife("minutes");
  const dates = weekDates(monday);
  const supabase = await createClient();
  const { from, to } = weekBounds(monday);
  // One round trip: every member's busy blocks come in a single read, in
  // parallel with the members list.
  const [membersResult, allNotes, manual, allEntries, busyByEmail] = await Promise.all([
    supabase.from("members").select("email, name, color").order("name"),
    getWeekNotes(dates),
    getWeekManual(dates),
    listCalendarEntries(from, to),
    listBusyBlocks(from, to).catch(() => new Map<string, BusyBlockRow[]>()),
  ]);
  if (membersResult.error) {
    throw new Error("No se pudo cargar la disponibilidad del equipo.");
  }
  // The group's common account is not a person: hide it and its notes.
  const members = { data: hideCommonAccount(membersResult.data) };
  const notes = hideCommonAccount(allNotes, (note) => note.member_email);
  const entries = hideCommonAccount(allEntries, (entry) => entry.member_email);

  const occupation: OccupationByMember = {};
  const online: OnlineByMember = {};
  const google: TeamWeek["google"] = {};
  members.data.forEach((member) => {
    const busy = busyBlocksToRanges(busyByEmail.get(member.email.toLowerCase()) ?? []);
    const data = {
      busy,
      manual: manual.get(member.email) ?? [],
      entries: entryRanges(entries.filter((e) => e.member_email === member.email)),
    };
    google[member.email] = mergeRanges(busy);
    occupation[member.email] = Object.fromEntries(
      dates.map((date) => [date, occupationForDay(date, data)]),
    );
    online[member.email] = Object.fromEntries(
      dates.map((date) => [date, onlineForDay(date, data)]),
    );
  });

  return {
    dates,
    members: members.data,
    occupation,
    online,
    notes,
    entries,
    google,
    outsideGoogleWindow: isOutsideGoogleWindow(from, to),
  };
}
