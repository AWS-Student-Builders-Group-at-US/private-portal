import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PrivacyNotice } from "@/features/checkin-forms/components/privacy-notice";
import { parsePrivacyQuery } from "@/features/checkin-forms/privacy-query";
import {
  getCheckinFormByVersion,
  getCheckinFormForEvent,
  getLatestVersionOfForm,
} from "@/features/checkin/form-queries";
import { EVENT_TIME_ZONE } from "@/features/events/time";
import { BrandStrip } from "@/features/site/components/brand-strip";

export const metadata: Metadata = { title: "Política de privacidad" };

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: EVENT_TIME_ZONE,
  dateStyle: "long",
});

// Privacy notice for attendee data collected at /checkin/<token>. The text is
// edited and versioned per named form from the panel. No query: the default
// form's latest version; `?f=<form id>`: that form's latest version; `?v=N`:
// an exact (possibly older) version, which must belong to `f` when both are set.
export default function PrivacyPage({ searchParams }: PageProps<"/privacidad">) {
  return (
    <main className="theme-light flex flex-1 justify-center bg-grid p-4 text-foreground sm:p-10">
      <article className="flex h-fit w-full max-w-2xl flex-col gap-6 border bg-card p-5 sm:p-8">
        <div className="flex flex-col gap-5">
          <BrandStrip />
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
  const query = parsePrivacyQuery(await searchParams);
  if (!query.ok) notFound();

  const form =
    query.version !== null
      ? await getCheckinFormByVersion(query.version)
      : query.formId !== null
        ? await getLatestVersionOfForm(query.formId)
        : await getCheckinFormForEvent(null);
  if (!form || (query.formId !== null && form.form_id !== query.formId)) notFound();

  const latest = query.version !== null ? await getLatestVersionOfForm(form.form_id) : form;
  const isOlder = latest !== null && latest.id !== form.id;

  return (
    <>
      <p className="font-mono text-xs text-muted-foreground">
        Registro de asistencia a eventos · Versión {form.version} ·{" "}
        {dateFormatter.format(new Date(form.created_at))}
        {isOlder && " (versión anterior)"}
      </p>
      <PrivacyNotice text={form.privacy_notice} />
    </>
  );
}
