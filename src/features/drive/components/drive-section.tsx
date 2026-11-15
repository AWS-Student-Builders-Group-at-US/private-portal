import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { driveErrorMessage } from "../messages";
import { loadDriveView } from "../queries";
import { getDriveFolderId, getServiceAccountEmail } from "../settings";
import type { DriveErrorCode } from "../types";
import { DriveBrowser } from "./drive-browser";
import { RefreshDriveButton } from "./refresh-drive-button";

// Drive folder browser for /panel/recursos. Request-time (session + search
// params): render it inside <Suspense>.
export async function DriveSection({ folder }: { folder?: string }) {
  const { folderId: rootId } = await getDriveFolderId();
  const view = rootId ? await loadDriveView(rootId, folder) : null;
  if (view?.status === "not_found") notFound();

  return (
    <section aria-labelledby="drive" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="drive" className="text-lg font-semibold">
          Carpeta de Drive
        </h2>
        {rootId && <RefreshDriveButton />}
      </div>
      {!view ? (
        <DriveError code="config" />
      ) : view.status === "error" ? (
        <DriveError code={view.code} />
      ) : (
        <>
          <nav aria-label="Ruta de carpetas">
            <ol className="flex flex-wrap items-center gap-1 text-sm">
              {view.path.map((crumb, index) => {
                const last = index === view.path.length - 1;
                const href =
                  index === 0
                    ? "/panel/recursos"
                    : `/panel/recursos?carpeta=${encodeURIComponent(crumb.id)}`;
                return (
                  <li key={crumb.id} className="flex items-center gap-1">
                    {index > 0 && <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />}
                    {last ? (
                      <span aria-current="page" className="font-medium">
                        {crumb.name}
                      </span>
                    ) : (
                      <Link href={href} className="text-muted-foreground hover:underline">
                        {crumb.name}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
          <DriveBrowser
            key={view.path.at(-1)?.id}
            items={view.listing.items}
            truncated={view.listing.truncated}
          />
          <p className="text-xs text-muted-foreground">
            Para abrir un archivo necesitas acceso a él con tu propia cuenta de Google Drive.
          </p>
        </>
      )}
    </section>
  );
}

function DriveError({ code }: { code: DriveErrorCode }) {
  const { title, detail } = driveErrorMessage(code, getServiceAccountEmail());
  return (
    <div role="alert" className="flex gap-3 rounded-lg border px-4 py-3 text-sm">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
      <div className="flex flex-col gap-0.5">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

export function DriveSectionSkeleton() {
  return <p className="text-sm text-muted-foreground">Cargando la carpeta de Drive…</p>;
}
