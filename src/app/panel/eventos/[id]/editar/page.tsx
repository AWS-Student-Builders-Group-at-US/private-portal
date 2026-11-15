import { notFound } from "next/navigation";
import { updateEvent } from "@/features/events/actions";
import { EventForm } from "@/features/events/components/event-form";
import { getEventFormOptions } from "@/features/checkin-forms/queries";
import { getEvent } from "@/features/events/queries";
import { utcIsoToMadridLocal } from "@/features/events/time";

export default async function EditEventPage({
  params,
}: PageProps<"/panel/eventos/[id]/editar">) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();
  const formChoices = await getEventFormOptions(event.checkin_form_id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Editar evento</h1>
      <EventForm
        action={updateEvent.bind(null, event.id)}
        submitLabel="Guardar cambios"
        cancelHref={`/panel/eventos/${event.id}`}
        {...formChoices}
        initialValues={{
          title: event.title,
          description: event.description ?? "",
          starts_at: utcIsoToMadridLocal(event.starts_at),
          ends_at: event.ends_at ? utcIsoToMadridLocal(event.ends_at) : "",
          location: event.location ?? "",
          meetup_url: event.meetup_url ?? "",
          expected_attendees: event.expected_attendees?.toString() ?? "",
          is_public: event.is_public,
          checkin_form_id: event.checkin_form_id ?? "",
        }}
      />
    </div>
  );
}
