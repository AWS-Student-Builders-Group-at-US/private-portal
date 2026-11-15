import { Suspense } from "react";
import { DriveFolderForm } from "@/features/drive/components/drive-folder-form";
import { driveErrorMessage } from "@/features/drive/messages";
import { checkDriveFolder } from "@/features/drive/queries";
import { getDriveFolderId, getServiceAccountEmail } from "@/features/drive/settings";

// Ajustes card: which Drive folder /panel/recursos shows, and whether the
// service account can read it.
export function DriveFolderSettings() {
  return (
    <section aria-labelledby="carpeta-drive" className="flex flex-col gap-3 rounded-lg border p-4">
      <h2 id="carpeta-drive" className="text-lg font-semibold">
        Carpeta de Drive (Recursos)
      </h2>
      <p className="text-sm text-muted-foreground">
        La carpeta de Google Drive que se muestra en Recursos. Debe estar compartida como Lector con
        la cuenta de servicio de la aplicación.
      </p>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Comprobando la carpeta…</p>}>
        <CurrentFolder />
      </Suspense>
      <DriveFolderForm />
    </section>
  );
}

async function CurrentFolder() {
  const { folderId, source } = await getDriveFolderId();
  const email = getServiceAccountEmail();

  if (!email) {
    const { title, detail } = driveErrorMessage("config", null);
    return <Status ok={false} title={title} detail={detail} />;
  }
  if (!folderId) {
    return (
      <Status
        ok={false}
        title="Todavía no hay ninguna carpeta configurada"
        detail={`Comparte la carpeta con ${email} como Lector y pega aquí su enlace.`}
      />
    );
  }

  const check = await checkDriveFolder(folderId);
  const origin = source === "env" ? " (definida en GOOGLE_DRIVE_FOLDER_ID)" : "";
  if (check.status === "ok") {
    return (
      <Status
        ok
        title={`Carpeta actual: «${check.name}»${origin}`}
        detail={`Correcto: la cuenta de servicio ${email} puede leerla.`}
      />
    );
  }
  const { title, detail } = driveErrorMessage(check.code, email);
  return <Status ok={false} title={title} detail={`${detail} Identificador actual: ${folderId}${origin}.`} />;
}

function Status({ ok, title, detail }: { ok: boolean; title: string; detail: string }) {
  return (
    <div role="status" className="flex flex-col gap-0.5 rounded-lg bg-muted px-3 py-2 text-sm">
      <p className={`font-medium ${ok ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}>
        {ok ? "✓ " : "⚠ "}
        {title}
      </p>
      <p className="break-all text-muted-foreground">{detail}</p>
    </div>
  );
}
