import type { Metadata } from "next";
import { createEvent } from "@/features/events/actions";
import { EventForm } from "@/features/events/components/event-form";

export const metadata: Metadata = { title: "Nuevo evento · Core Team" };

export default function NewEventPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Nuevo evento</h1>
      <EventForm
        action={createEvent}
        submitLabel="Crear evento"
        cancelHref="/panel/eventos"
      />
    </div>
  );
}
