import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PrivacyNotice } from "@/features/checkin-forms/components/privacy-notice";
import {
  getActiveCheckinForm,
  getCheckinFormByVersion,
} from "@/features/checkin/form-queries";
import { EVENT_TIME_ZONE } from "@/features/events/time";

export const metadata: Metadata = { title: "Política de privacidad" };

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: EVENT_TIME_ZONE,
  dateStyle: "long",
});

// Privacy notice for attendee data collected at /checkin/<token>. The text is
// edited and versioned from the panel; `?v=N` shows an older version.
export default function PrivacyPage({ searchParams }: PageProps<"/privacidad">) {
  return (
    <main className="flex flex-1 justify-center p-4 sm:p-6">
      <article className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-muted-foreground">
            AWS Student Builder Group · Universidad de Sevilla
          </p>
          <h1 className="text-2xl font-semibold">Política de privacidad</h1>
        </div>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
          <PrivacyContent searchParams={searchParams} />
        </Suspense>
      </article>
    </main>
  );
}

async function PrivacyContent({
  searchParams,
}: Pick<PageProps<"/privacidad">, "searchParams">) {
  const { v } = await searchParams;
  const requested = typeof v === "string" && /^\d{1,9}$/.test(v) ? Number(v) : null;
  if (v !== undefined && requested === null) notFound();

  const form = requested
    ? await getCheckinFormByVersion(requested)
    : await getActiveCheckinForm();
  if (!form) notFound();

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Registro de asistencia a eventos · Versión {form.version} ·{" "}
        {dateFormatter.format(new Date(form.created_at))}
        {!form.is_active && " (versión anterior)"}
      </p>
      <PrivacyNotice text={form.privacy_notice} />
    </>
  );
}
