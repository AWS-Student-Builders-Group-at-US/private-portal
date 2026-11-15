import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getBusyBlocks } from "@/features/calendars/busy";
import { isOutsideGoogleWindow } from "@/features/calendars/window";
import { madridLocalToUtcIso } from "@/features/events/time";
import {
  occupationForDay,
  slotOccupationForDay,
  type OccupationByMember,
} from "./occupation";
import {
  addDays,
  busyBlocksToRanges,
  weekDates,
  type OverrideRange,
  type TemplateRange,
} from "./slots";
import type { MyAvailability, MyWeek, Override, TeamWeek } from "./types";

// All reads use the user's session; RLS only returns rows to members.

const hhmm = (time: string) => time.slice(0, 5);

function toTemplate(row: TemplateRange): TemplateRange {
  return { weekday: row.weekday, start_time: hhmm(row.start_time), end_time: hhmm(row.end_time) };
}

function toOverride(row: Override): Override {
  return { ...row, start_time: hhmm(row.start_time), end_time: hhmm(row.end_time) };
}

// The member's weekly template and their overrides from `fromDate` on.
export async function getMyAvailability(
  email: string,
  fromDate: string,
): Promise<MyAvailability> {
  const supabase = await createClient();
  const [template, overrides] = await Promise.all([
    supabase
      .from("availability_template")
      .select("weekday, start_time, end_time")
      .eq("member_email", email)
      .order("weekday")
      .order("start_time"),
    supabase
      .from("availability_override")
      .select("id, date, start_time, end_time, kind")
      .eq("member_email", email)
      .gte("date", fromDate)
      .order("date")
      .order("start_time"),
  ]);
  if (template.error || overrides.error) {
    throw new Error("No se pudo cargar tu disponibilidad.");
  }
  return {
    template: template.data.map(toTemplate),
    overrides: (overrides.data as Override[]).map(toOverride),
  };
}

function weekBounds(monday: string) {
  return {
    from: new Date(madridLocalToUtcIso(`${monday}T00:00`)),
    to: new Date(madridLocalToUtcIso(`${addDays(monday, 7)}T00:00`)),
  };
}

function toOverrideRange(o: OverrideRange): OverrideRange {
  return {
    date: o.date,
    start_time: hhmm(o.start_time),
    end_time: hhmm(o.end_time),
    kind: o.kind,
  };
}

// The member's own occupation per slot for the week starting on `monday`,
// including Google busy blocks (refreshed first when stale).
export async function getMyWeek(email: string, monday: string): Promise<MyWeek> {
  const dates = weekDates(monday);
  const supabase = await createClient();
  const { from, to } = weekBounds(monday);
  const [template, overrides, blocks] = await Promise.all([
    supabase
      .from("availability_template")
      .select("weekday, start_time, end_time")
      .eq("member_email", email),
    supabase
      .from("availability_override")
      .select("date, start_time, end_time, kind")
      .eq("member_email", email)
      .gte("date", monday)
      .lte("date", dates[6]),
    getBusyBlocks(email, from, to).catch(() => []),
  ]);
  if (template.error || overrides.error) {
    throw new Error("No se pudo cargar tu disponibilidad.");
  }
  const data = {
    template: template.data.map(toTemplate),
    overrides: (overrides.data as OverrideRange[]).map(toOverrideRange),
    busy: busyBlocksToRanges(blocks),
  };
  return {
    dates,
    days: Object.fromEntries(dates.map((date) => [date, slotOccupationForDay(date, data)])),
    outsideGoogleWindow: isOutsideGoogleWindow(from, to),
  };
}

// Occupation (0, 0.5 or 1) of every member per slot for the week starting on `monday`.
export async function getTeamWeek(monday: string): Promise<TeamWeek> {
  const dates = weekDates(monday);
  const sunday = dates[6];
  const supabase = await createClient();
  const [members, templates, overrides] = await Promise.all([
    supabase.from("members").select("email, name").order("name"),
    supabase
      .from("availability_template")
      .select("member_email, weekday, start_time, end_time"),
    supabase
      .from("availability_override")
      .select("member_email, date, start_time, end_time, kind")
      .gte("date", monday)
      .lte("date", sunday),
  ]);
  if (members.error || templates.error || overrides.error) {
    throw new Error("No se pudo cargar la disponibilidad del equipo.");
  }

  const { from, to } = weekBounds(monday);
  const busyByMember = await Promise.all(
    members.data.map((m) => getBusyBlocks(m.email, from, to).catch(() => [])),
  );

  const occupation: OccupationByMember = {};
  members.data.forEach((member, i) => {
    const template = templates.data
      .filter((t) => t.member_email === member.email)
      .map((t) => toTemplate(t as TemplateRange));
    const memberOverrides = overrides.data
      .filter((o) => o.member_email === member.email)
      .map((o) => toOverrideRange(o as OverrideRange));
    const busy = busyBlocksToRanges(busyByMember[i]);
    occupation[member.email] = Object.fromEntries(
      dates.map((date) => [
        date,
        occupationForDay(date, { template, overrides: memberOverrides, busy }),
      ]),
    );
  });

  return {
    dates,
    members: members.data,
    occupation,
    outsideGoogleWindow: isOutsideGoogleWindow(from, to),
  };
}
