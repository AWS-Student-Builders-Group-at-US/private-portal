import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getBusyBlocks } from "@/features/calendars/busy";
import { isOutsideGoogleWindow } from "@/features/calendars/window";
import { madridLocalToUtcIso } from "@/features/events/time";
import { hideCommonAccount } from "@/features/members/common-account";
import {
  occupationForDay,
  slotOccupationForDay,
  type ManualSlot,
  type OccupationByMember,
} from "./occupation";
import { addDays, busyBlocksToRanges, weekDates } from "./slots";
import type { AvailabilityNote, MyWeek, TeamWeek } from "./types";

// All reads use the user's session; RLS only returns rows to members.
// Occupation comes from Google calendars and the member's hand edits; the legacy
// availability_template/availability_override tables are no longer read.

const NOTE_COLUMNS =
  "id, member_email, start_date, end_date, start_minute, end_minute, title, body";

function weekBounds(monday: string) {
  return {
    from: new Date(madridLocalToUtcIso(`${monday}T00:00`)),
    to: new Date(madridLocalToUtcIso(`${addDays(monday, 7)}T00:00`)),
  };
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
    .select("member_email, date, start_minute, value")
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
    slots.push({ date: row.date, start: row.start_minute, value: Number(row.value) });
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
// from their Google busy blocks (refreshed first when stale) and their hand
// edits (which replace Google in the edited slots), plus their notes.
export async function getMyWeek(email: string, monday: string): Promise<MyWeek> {
  const dates = weekDates(monday);
  const { from, to } = weekBounds(monday);
  const [blocks, notes, manual] = await Promise.all([
    getBusyBlocks(email, from, to).catch(() => []),
    getWeekNotes(dates, email),
    getWeekManual(dates, email),
  ]);
  const data = { busy: busyBlocksToRanges(blocks), manual: manual.get(email) ?? [] };
  return {
    dates,
    days: Object.fromEntries(dates.map((date) => [date, slotOccupationForDay(date, data)])),
    notes,
    outsideGoogleWindow: isOutsideGoogleWindow(from, to),
  };
}

// Occupation (0, 0.5 or 1) of every member per slot for the week starting on
// `monday`, plus every member's notes for that week.
export async function getTeamWeek(monday: string): Promise<TeamWeek> {
  const dates = weekDates(monday);
  const supabase = await createClient();
  const [membersResult, allNotes, manual] = await Promise.all([
    supabase.from("members").select("email, name").order("name"),
    getWeekNotes(dates),
    getWeekManual(dates),
  ]);
  if (membersResult.error) {
    throw new Error("No se pudo cargar la disponibilidad del equipo.");
  }
  // The group's common account is not a person: hide it and its notes.
  const members = { data: hideCommonAccount(membersResult.data) };
  const notes = hideCommonAccount(allNotes, (note) => note.member_email);

  const { from, to } = weekBounds(monday);
  const busyByMember = await Promise.all(
    members.data.map((m) => getBusyBlocks(m.email, from, to).catch(() => [])),
  );

  const occupation: OccupationByMember = {};
  members.data.forEach((member, i) => {
    const data = {
      busy: busyBlocksToRanges(busyByMember[i]),
      manual: manual.get(member.email) ?? [],
    };
    occupation[member.email] = Object.fromEntries(
      dates.map((date) => [date, occupationForDay(date, data)]),
    );
  });

  return {
    dates,
    members: members.data,
    occupation,
    notes,
    outsideGoogleWindow: isOutsideGoogleWindow(from, to),
  };
}
