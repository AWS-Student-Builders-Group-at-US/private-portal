import type { NextRequest } from "next/server";
import {
  GROUP_CALENDAR_FILENAME,
  buildTeamCalendar,
  type ExportEvent,
  type GroupMeeting,
} from "@/features/calendars/ics-export";
import { createAdminClient } from "@/lib/supabase/admin";

// Shared "AWS US - Student Builder Group" iCal feed for Google Calendar
// "Desde URL" subscriptions: team events plus calendar entries marked as
// group meetings. Personal (non-group) entries are never read here.
// Public route (no session; excluded from the proxy): the per-member token in
// `?token=` is the only credential and is checked with the secret key.

const TOKEN_PATTERN = /^[0-9a-f]{32}$/;
const PAST_DAYS = 30;

const notFound = () => new Response("Not found", { status: 404 });

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!TOKEN_PATTERN.test(token)) return notFound();

  const admin = createAdminClient();
  const { data: owner } = await admin
    .from("calendar_export_tokens")
    .select("member_email")
    .eq("token", token)
    .maybeSingle();
  if (!owner) return notFound();

  const now = new Date();
  const since = new Date(now.getTime() - PAST_DAYS * 24 * 60 * 60 * 1000);
  const { data: events, error } = await admin
    .from("events")
    .select("id, title, starts_at, ends_at, location, meetup_url, created_at, updated_at")
    .gte("starts_at", since.toISOString())
    .order("starts_at", { ascending: true });
  if (error) return new Response("Service unavailable", { status: 503 });

  // Only group meetings, and only the columns the feed shows (no owner).
  // A failed read (e.g. before the calendar_entries migration runs) keeps
  // the feed working with the events alone.
  const { data: meetings } = await admin
    .from("calendar_entries")
    .select("id, title, notes, starts_at, ends_at, created_at, updated_at")
    .eq("is_group_meeting", true)
    .gte("starts_at", since.toISOString())
    .order("starts_at", { ascending: true });

  const body = buildTeamCalendar(events as ExportEvent[], {
    now,
    domain: request.nextUrl.hostname,
    groupMeetings: (meetings ?? []) as GroupMeeting[],
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${GROUP_CALENDAR_FILENAME}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
