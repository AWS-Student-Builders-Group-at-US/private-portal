import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DEFAULT_CHECKIN_FIELDS } from "@/features/checkin-forms/definition";
import { FormEditor } from "@/features/checkin-forms/components/form-editor";
import { VersionsList } from "@/features/checkin-forms/components/versions-list";
import {
  getCheckinForm,
  getDefaultFormLatestVersion,
} from "@/features/checkin-forms/queries";
import { formatMadridDateTimeShort } from "@/features/events/time";

// Member-only editor for one named check-in form and its privacy notice.
// Each publish creates a new immutable version.
export default async function CheckinFormEditorPage({
  params,
}: PageProps<"/panel/eventos/formularios/[id]">) {
  const { id } = await params;
  const data = await getCheckinForm(id);
  if (!data) notFound();
  const { form, versions } = data;
  const archived = form.archived_at !== null;
  // A new form starts from the default form's latest version.
  const latest = versions[0] ?? (await getDefaultFormLatestVersion());

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/panel/eventos/formularios"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Formularios
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">
          {form.name}
          {form.is_default && " (por defecto)"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {archived
            ? "Formulario archivado: desarchívalo para publicar versiones nuevas."
            : "Cada publicación crea una versión nueva, que pasa a usarse en los eventos de este formulario."}
        </p>
      </div>
      <FormEditor
        key={latest?.id ?? "new"}
        formId={form.id}
        disabled={archived}
        initial={{
          title: latest?.title ?? "Registro de asistencia",
          intro: latest?.intro ?? "",
          fields: latest?.fields ?? DEFAULT_CHECKIN_FIELDS,
          privacy_notice: latest?.privacy_notice ?? "",
        }}
      />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Versiones</h2>
        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay versiones. Hasta que publiques una, los eventos con este
            formulario usan el formulario por defecto.
          </p>
        ) : (
          <VersionsList
            canRestore={!archived}
            versions={versions.map((version, index) => ({
              id: version.id,
              form_id: version.form_id,
              version: version.version,
              date: formatMadridDateTimeShort(version.created_at),
              created_by: version.created_by,
              is_current: index === 0,
            }))}
          />
        )}
      </section>
    </div>
  );
}
