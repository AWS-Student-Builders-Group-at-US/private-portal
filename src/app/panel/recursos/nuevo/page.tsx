import { createLink } from "@/features/links/actions";
import { LinkForm } from "@/features/links/components/link-form";
import { linkCategories } from "@/features/links/filter";
import { listLinks } from "@/features/links/queries";

export default async function NewLinkPage() {
  const categories = linkCategories(await listLinks());
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Nuevo enlace</h1>
      <LinkForm action={createLink} categories={categories} submitLabel="Añadir enlace" />
    </div>
  );
}
