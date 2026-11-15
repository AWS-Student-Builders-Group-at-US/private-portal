import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getBusyBlocks } from "@/features/calendars/busy";
import { isOutsideGoogleWindow } from "@/features/calendars/window";
import { madridLocalToUtcIso } from "@/features/events/time";
import { hideCommonAccount } from "@/features/members/common-account";
import {
  occupationForDay,
  slotOccupationForDay,
  type OccupationByMember,
} from "./occupation";
import { addDays, busyBlocksToRanges, weekDates } from "./slots";
import type { AvailabilityNote, MyWeek, TeamWeek } from "./types";

// All reads use the user's session; RLS only returns rows to members.
// Occupation comes only from Google calendars; the legacy
// availability_template/availability_override tables are no longer read.

const NOTE_COLUMNS =
  "id, member_email, start_date, end_date, start_minute, end_minute, title, body";

function weekBounds(monday: string) {
  return {
    from: new Date(madridLocalToUtcIso(`${monday}T00:00`)),
    to: new Date(madridLocalToUtcIso(`${addDays(monday, 7)}T00:00`)),
  };
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
// from their Google busy blocks (refreshed first when stale), plus their notes.
export async function getMyWeek(email: string, monday: string): Promise<MyWeek> {
  const dates = weekDates(monday);
  const { from, to } = weekBounds(monday);
  const [blocks, notes] = await Promise.all([
    getBusyBlocks(email, from, to).catch(() => []),
    getWeekNotes(dates, email),
  ]);
  const data = { busy: busyBlocksToRanges(blocks) };
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
  const [membersResult, allNotes] = await Promise.all([
    supabase.from("members").select("email, name").order("name"),
    getWeekNotes(dates),
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
    const data = { busy: busyBlocksToRanges(busyByMember[i]) };
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
