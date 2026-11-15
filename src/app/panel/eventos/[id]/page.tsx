import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { listCheckinForms } from "@/features/checkin-forms/queries";
import { AttendanceSection } from "@/features/checkin/components/attendance-section";
import { EmailSection } from "@/features/emails/components/email-section";
import { DeleteEventButton } from "@/features/events/components/delete-event-button";
import { EventFiles } from "@/features/events/components/event-files";
import { StatusMessage } from "@/features/events/components/status-message";
import { getEvent, listEventFiles } from "@/features/events/queries";
import { formatMadridDateTime } from "@/features/events/time";
import { EventTasks } from "@/features/tasks/components/event-tasks";

export default async function EventDetailPage({
  params,
  searchParams,
}: PageProps<"/panel/eventos/[id]">) {
  const [{ id }, { estado }] = await Promise.all([params, searchParams]);
  const event = await getEvent(id);
  if (!event) notFound();
  const [files, forms] = await Promise.all([listEventFiles(event.id), listCheckinForms()]);
  // Same rule as the check-in page: its own form if it has a version, else the default.
  const ownForm = forms.find((form) => form.id === event.checkin_form_id);
  const defaultForm = forms.find((form) => form.is_default);
  const usedForm = ownForm?.latest_version != null ? ownForm : defaultForm;

  const details: [string, React.ReactNode][] = [
    ["Inicio", formatMadridDateTime(event.starts_at)],
    ["Fin", event.ends_at ? formatMadridDateTime(event.ends_at) : "—"],
    ["Lugar", event.location ?? "—"],
    [
      "Meetup",
      event.meetup_url ? (
        <a
          href={event.meetup_url}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all underline underline-offset-4"
        >
          {event.meetup_url}
        </a>
      ) : (
        "—"
      ),
    ],
    ["Asistentes previstos", event.expected_attendees ?? "—"],
    [
      "Formulario de registro",
      usedForm ? (
        <Link
          href={`/panel/eventos/formularios/${usedForm.id}`}
          className="underline underline-offset-4"
        >
          {usedForm === ownForm ? usedForm.name : `Por defecto (${usedForm.name})`}
        </Link>
      ) : (
        "—"
      ),
    ],
    ["Web pública", event.is_public ? "Visible" : "Oculto"],
    ["Creado por", event.created_by],
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/panel/eventos"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Eventos
      </Link>
      <StatusMessage status={estado} />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h1 className="text-2xl font-semibold">{event.title}</h1>
        <Link
          href={`/panel/eventos/${event.id}/editar`}
          className={buttonVariants({ variant: "outline" })}
        >
          <Pencil />
          Editar
        </Link>
      </div>
      {event.description && (
        <p className="whitespace-pre-line text-muted-foreground">
          {event.description}
        </p>
      )}
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
        {details.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-sm font-medium">{label}</dt>
            <dd className="text-sm text-muted-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Cargando asistencia…</p>}
      >
        <AttendanceSection eventId={event.id} />
      </Suspense>
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Cargando tareas…</p>}
      >
        <EventTasks eventId={event.id} />
      </Suspense>
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Cargando correo…</p>}
      >
        <EmailSection event={event} />
      </Suspense>
      <EventFiles eventId={event.id} files={files} />
      <DeleteEventButton eventId={event.id} />
    </div>
  );
}
