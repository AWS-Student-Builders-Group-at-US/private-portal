import { attendeesToCsv } from "@/features/checkin/csv";
import { getFormVersionIndex } from "@/features/checkin-forms/queries";
import { memberClientOrNull, notFoundResponse } from "@/features/checkin/member-route";

// Member-only CSV export of an event's attendees (contains personal data).
export async function GET(
  _req: Request,
  ctx: RouteContext<"/panel/eventos/[id]/asistentes">,
) {
  const { id } = await ctx.params;
  const supabase = await memberClientOrNull();
  if (!supabase) return notFoundResponse();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!event) return notFoundResponse();

  const [{ data: attendees, error }, index] = await Promise.all([
    supabase
      .from("attendees")
      .select(
        "name, email, photo_consent, email_consent, checked_in_at, form_version_id, answers",
      )
      .eq("event_id", event.id)
      .order("checked_in_at", { ascending: true }),
    getFormVersionIndex(),
  ]);
  if (error || !index) return new Response("Error", { status: 500 });

  const rows = attendees.map((attendee) => ({
    ...attendee,
    form_version: index.versionById[attendee.form_version_id] ?? null,
  }));
  return new Response(attendeesToCsv(rows, index.labels), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="asistentes.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
