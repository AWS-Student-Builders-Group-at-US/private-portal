import { notFound } from "next/navigation";
import { updateLink } from "@/features/links/actions";
import { DeleteLinkButton } from "@/features/links/components/delete-link-button";
import { LinkForm } from "@/features/links/components/link-form";
import { linkCategories } from "@/features/links/filter";
import { getLink, listLinks } from "@/features/links/queries";

export default async function EditLinkPage({ params }: PageProps<"/panel/recursos/[id]">) {
  const { id } = await params;
  const [link, links] = await Promise.all([getLink(id), listLinks()]);
  if (!link) notFound();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Editar enlace</h1>
      <LinkForm
        action={updateLink.bind(null, link.id)}
        initialValues={{
          title: link.title,
          url: link.url,
          category: link.category ?? "",
          notes: link.notes ?? "",
        }}
        categories={linkCategories(links)}
        submitLabel="Guardar cambios"
      />
      <DeleteLinkButton linkId={link.id} />
    </div>
  );
}
