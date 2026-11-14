import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { submitCheckin } from "@/features/checkin/actions";
import { CheckinForm } from "@/features/checkin/components/checkin-form";
import { getCheckinEventByToken } from "@/features/checkin/queries";
import { formatMadridDateTime } from "@/features/events/time";

// Public page (outside the member gate; the proxy matcher skips /checkin/).
// It must not read the session. Unknown tokens get a generic 404.
export const metadata: Metadata = {
  title: "Registro de asistencia",
  robots: { index: false, follow: false },
};

export default function CheckinPage({ params }: PageProps<"/checkin/[token]">) {
  return (
    <main className="flex flex-1 justify-center p-4 sm:p-6">
      <div className="flex w-full max-w-md flex-col gap-6">
        <p className="text-sm font-medium text-muted-foreground">
          AWS Student Builder Group · Universidad de Sevilla
        </p>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
          <CheckinContent params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function CheckinContent({ params }: Pick<PageProps<"/checkin/[token]">, "params">) {
  const { token } = await params;
  const event = await getCheckinEventByToken(token);
  if (!event) notFound();

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{event.title}</h1>
        <p className="text-sm text-muted-foreground">
          {formatMadridDateTime(event.starts_at)}
          {event.location && ` · ${event.location}`}
        </p>
      </div>
      {event.checkin_open ? (
        <CheckinForm action={submitCheckin.bind(null, token)} />
      ) : (
        <p role="status" className="rounded-lg border bg-muted p-4 text-center">
          El registro de asistencia está cerrado.
        </p>
      )}
    </>
  );
}
