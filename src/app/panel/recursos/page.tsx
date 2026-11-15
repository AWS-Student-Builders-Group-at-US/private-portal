import { Suspense } from "react";
import Form from "next/form";
import Link from "next/link";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { StatusBanner } from "@/components/status-banner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  NO_CATEGORY_PARAM,
  filterLinks,
  groupByCategory,
  linkCategories,
  parseLinkFilters,
} from "@/features/links/filter";
import { listLinks } from "@/features/links/queries";
import { DriveSection, DriveSectionSkeleton } from "@/features/drive/components/drive-section";

const fieldClass =
  "rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const MESSAGES = {
  creado: "Enlace añadido.",
  guardado: "Cambios guardados.",
  eliminado: "Enlace eliminado.",
};

export default async function ResourcesPage({ searchParams }: PageProps<"/panel/recursos">) {
  const [params, links] = await Promise.all([searchParams, listLinks()]);
  const filters = parseLinkFilters(params);
  const categories = linkCategories(links);
  const groups = groupByCategory(filterLinks(links, filters));
  const categoryParam =
    filters.category === "" ? NO_CATEGORY_PARAM : (filters.category ?? "");
  const folder = typeof params.carpeta === "string" ? params.carpeta : undefined;
  const folderQuery = folder ? `?carpeta=${encodeURIComponent(folder)}` : "";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Recursos</h1>
      <StatusBanner status={params.estado} messages={MESSAGES} />
      <Suspense fallback={<DriveSectionSkeleton />}>
        <DriveSection folder={folder} />
      </Suspense>

      <div className="flex items-center justify-between gap-2 border-t pt-6">
        <h2 className="text-xl font-semibold">Enlaces</h2>
        <Link href="/panel/recursos/nuevo" className={buttonVariants()}>
          <Plus />
          Nuevo enlace
        </Link>
      </div>
      <Form action="/panel/recursos" className="flex flex-wrap items-end gap-2" role="search">
        {folder && <input type="hidden" name="carpeta" value={folder} />}
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="q" className="text-xs text-muted-foreground">
            Buscar
          </label>
          <input id="q" name="q" type="search" defaultValue={filters.q} placeholder="Título, URL o notas" className={`${fieldClass} min-w-48`} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="categoria" className="text-xs text-muted-foreground">
            Categoría
          </label>
          <select id="categoria" name="categoria" defaultValue={categoryParam} className={fieldClass}>
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
            <option value={NO_CATEGORY_PARAM}>Sin categoría</option>
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {(filters.q || filters.category !== null) && (
          <Link href={`/panel/recursos${folderQuery}`} className={buttonVariants({ variant: "ghost" })}>
            Quitar filtros
          </Link>
        )}
      </Form>

      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay enlaces. Añade el primero con «Nuevo enlace».
        </p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ningún enlace coincide con la búsqueda.</p>
      ) : (
        groups.map(([category, items]) => (
          <section key={category ?? "-"} className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold">{category ?? "Sin categoría"}</h3>
            <ul className="divide-y rounded-lg border">
              {items.map((link) => (
                <li key={link.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-medium hover:underline"
                    >
                      <span className="truncate">{link.title}</span>
                      <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    </a>
                    <span className="truncate text-xs text-muted-foreground">{link.url}</span>
                    {link.notes && (
                      <p className="text-sm whitespace-pre-line text-muted-foreground">{link.notes}</p>
                    )}
                  </div>
                  <Link
                    href={`/panel/recursos/${link.id}`}
                    aria-label={`Editar «${link.title}»`}
                    className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                  >
                    <Pencil />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
