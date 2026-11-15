import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { submitCheckin } from "@/features/checkin/actions";
import { CheckinForm } from "@/features/checkin/components/checkin-form";
import { getCheckinFormForEvent } from "@/features/checkin/form-queries";
import { getCheckinEventByToken } from "@/features/checkin/queries";
import { formatMadridDateTime } from "@/features/events/time";
import { BrandStrip } from "@/features/site/components/brand-strip";

// Public page (outside the member gate; the proxy matcher skips /checkin/).
// It must not read the session. Unknown tokens get a generic 404.
export const metadata: Metadata = {
  title: "Registro de asistencia",
  robots: { index: false, follow: false },
};

export default function CheckinPage({ params }: PageProps<"/checkin/[token]">) {
  return (
    <main className="theme-light flex flex-1 justify-center bg-grid p-4 text-foreground sm:p-10">
      <div className="flex h-fit w-full max-w-md flex-col gap-6 border bg-card p-5 sm:p-8">
        <BrandStrip />
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
  const form = await getCheckinFormForEvent(event.checkin_form_id);

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{event.title}</h1>
        <p className="font-mono text-xs text-muted-foreground">
          {formatMadridDateTime(event.starts_at)}
          {event.location && ` · ${event.location}`}
        </p>
      </div>
      {event.checkin_open && form ? (
        <CheckinForm
          form={{
            id: form.id,
            form_id: form.form_id,
            version: form.version,
            title: form.title,
            intro: form.intro,
            fields: form.fields,
          }}
          action={submitCheckin.bind(null, token)}
        />
      ) : event.checkin_open ? (
        <p role="status" className="rounded-lg border bg-muted p-4 text-center">
          El registro de asistencia no está disponible en este momento.
        </p>
      ) : (
        <p role="status" className="rounded-lg border bg-muted p-4 text-center">
          El registro de asistencia está cerrado.
        </p>
      )}
    </>
  );
}
