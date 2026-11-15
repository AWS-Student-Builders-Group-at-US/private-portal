import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DEFAULT_CHECKIN_FIELDS } from "@/features/checkin-forms/definition";
import { FormEditor } from "@/features/checkin-forms/components/form-editor";
import { VersionsList } from "@/features/checkin-forms/components/versions-list";
import { listCheckinFormVersions } from "@/features/checkin-forms/queries";
import { formatMadridDateTimeShort } from "@/features/events/time";

// Member-only editor for the public check-in form and its privacy notice.
// Each publish creates a new immutable version.
export default async function CheckinFormEditorPage() {
  const versions = await listCheckinFormVersions();
  const active = versions.find((version) => version.is_active) ?? versions[0];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/panel/eventos"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Eventos
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Formularios de registro</h1>
        <p className="text-sm text-muted-foreground">
          Cada publicación crea una versión nueva. Cada asistente queda vinculado a la
          versión que aceptó.
        </p>
      </div>
      <FormEditor
        key={active?.id ?? "new"}
        initial={{
          title: active?.title ?? "Registro de asistencia",
          intro: active?.intro ?? "",
          fields: active?.fields ?? DEFAULT_CHECKIN_FIELDS,
          privacy_notice: active?.privacy_notice ?? "",
        }}
      />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Versiones</h2>
        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay versiones.</p>
        ) : (
          <VersionsList
            versions={versions.map((version) => ({
              id: version.id,
              version: version.version,
              date: formatMadridDateTimeShort(version.created_at),
              created_by: version.created_by,
              is_active: version.is_active,
            }))}
          />
        )}
      </section>
    </div>
  );
}
