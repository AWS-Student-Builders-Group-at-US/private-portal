import { headers } from "next/headers";
import { ShowMore } from "@/components/show-more";
import { formatMadridDateTimeShort } from "@/features/events/time";
import { buttonVariants } from "@/components/ui/button";
import { getFormVersionIndex } from "@/features/checkin-forms/queries";
import { formatAnswer } from "../csv";
import { qrPngDataUrl } from "../qr";
import { getAttendance } from "../queries";
import { buildCheckinUrl, resolveSiteUrl } from "../url";
import {
  CheckinToggle,
  CopyUrlButton,
  DeleteAttendeeButton,
  RegenerateQrButton,
} from "./attendance-controls";

// Member-only attendance block for /panel/eventos/[id]: open/close check-in,
// QR, counts and the attendee list.
export async function AttendanceSection({ eventId }: { eventId: string }) {
  const [attendance, index] = await Promise.all([
    getAttendance(eventId),
    getFormVersionIndex(),
  ]);
  if (!attendance) {
    return (
      <p className="text-sm text-destructive">
        No se pudo cargar la asistencia.
      </p>
    );
  }
  const { attendees } = attendance;
  const url = buildCheckinUrl(
    resolveSiteUrl(await headers()),
    attendance.checkin_token,
  );
  const qr = await qrPngDataUrl(url);
  const base = `/panel/eventos/${eventId}`;

  const counts: [string, React.ReactNode][] = [
    ["Previstos", attendance.expected_attendees ?? "—"],
    ["Registrados", attendees.length],
    ["Aceptan fotos", attendees.filter((a) => a.photo_consent).length],
    ["Aceptan correos", attendees.filter((a) => a.email_consent).length],
  ];

  return (
    <section className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Asistencia</h2>
        <span className="text-sm text-muted-foreground">
          Registro {attendance.checkin_open ? "abierto" : "cerrado"}
        </span>
      </div>
      <CheckinToggle eventId={eventId} open={attendance.checkin_open} />

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {counts.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-muted p-2">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col items-start gap-3">
        {/* Data URL generated on the server; next/image adds nothing here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qr}
          alt="Código QR del registro de asistencia"
          width={192}
          height={192}
          className="rounded-lg border bg-white"
        />
        <p className="break-all text-sm text-muted-foreground">{url}</p>
        <div className="flex flex-wrap gap-2">
          <CopyUrlButton url={url} />
          <a
            href={`${base}/qr`}
            download
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Descargar QR (PNG)
          </a>
        </div>
        <RegenerateQrButton eventId={eventId} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">Asistentes</h3>
        <a
          href={`${base}/asistentes`}
          download
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Descargar CSV
        </a>
      </div>
      {attendees.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay asistentes registrados.
        </p>
      ) : (
        <ShowMore limit={10} noun="asistentes" className="flex flex-col divide-y">
          {attendees.map((attendee) => (
            <li
              key={attendee.id}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex flex-col text-sm">
                <span className="font-medium">{attendee.name}</span>
                <span className="break-all text-muted-foreground">
                  {attendee.email}
                </span>
                <span className="text-muted-foreground">
                  Fotos: {attendee.photo_consent ? "sí" : "no"} · Correos:{" "}
                  {attendee.email_consent ? "sí" : "no"} ·{" "}
                  {formatMadridDateTimeShort(attendee.checked_in_at)}
                  {attendee.form_version_id &&
                    index?.versionById[attendee.form_version_id] &&
                    ` · Formulario v${index.versionById[attendee.form_version_id]}`}
                </span>
                {Object.keys(attendee.answers ?? {}).length > 0 && (
                  <span className="text-muted-foreground">
                    {Object.entries(attendee.answers)
                      .map(
                        ([key, value]) =>
                          `${index?.labels[key] ?? key}: ${formatAnswer(value)}`,
                      )
                      .join(" · ")}
                  </span>
                )}
              </div>
              <DeleteAttendeeButton
                attendeeId={attendee.id}
                name={attendee.name}
              />
            </li>
          ))}
        </ShowMore>
      )}
    </section>
  );
}
