import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateFormButton, FormsList } from "@/features/checkin-forms/components/forms-list";
import { listCheckinForms } from "@/features/checkin-forms/queries";

// Member-only list of named check-in forms. Each event picks one; events
// without a form use the default one.
export default async function CheckinFormsPage() {
  const forms = await listCheckinForms();
  const active = forms.filter((form) => form.archived_at === null);
  const archived = forms.filter((form) => form.archived_at !== null);

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
          Cada evento usa la última versión de su formulario, o la del formulario por
          defecto si no elige ninguno. Cada asistente queda vinculado a la versión que
          aceptó.
        </p>
      </div>
      <CreateFormButton />
      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay formularios.</p>
      ) : (
        <FormsList forms={active} />
      )}
      {archived.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Archivados</h2>
          <p className="text-sm text-muted-foreground">
            No se ofrecen en eventos nuevos, pero siguen funcionando en los eventos que ya
            los usan.
          </p>
          <FormsList forms={archived} />
        </section>
      )}
    </div>
  );
}
