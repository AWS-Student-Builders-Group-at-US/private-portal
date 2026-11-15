import { Suspense } from "react";
import { headers } from "next/headers";
import { formatMadridDateTime } from "@/features/events/time";
import { resolveSiteUrl } from "@/features/checkin/url";
import { isZernioConfigured, listAccounts, type ZernioAccount } from "@/features/zernio/client";
import { SyncNowButton } from "@/features/zernio/components/sync-now-button";
import { createClient } from "@/lib/supabase/server";

const PLATFORM_LABELS: Record<string, string> = { instagram: "Instagram", linkedin: "LinkedIn" };

// Ajustes card: Zernio connection (never shows the key), connected accounts,
// last webhook event, the webhook URL to register and a manual sync.
export function ZernioSettings() {
  return (
    <section aria-labelledby="publicaciones-titulo" className="flex flex-col gap-3 rounded-lg border p-4">
      <h2 id="publicaciones-titulo" className="text-lg font-semibold">
        Publicaciones (Zernio)
      </h2>
      <p className="text-sm text-muted-foreground">
        Las publicaciones planificadas en Zernio para Instagram y LinkedIn se guardan aquí y, cuando se
        publican, aparecen en Noticias de la web con el enlace a la publicación.
      </p>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Comprobando Zernio…</p>}>
        <ZernioStatus />
      </Suspense>
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-muted-foreground">
        <li>En Zernio, conecta la cuenta profesional de Instagram y la página de LinkedIn.</li>
        <li>
          En Zernio → Webhooks, crea un webhook con la URL de abajo, el secreto compartido
          (ZERNIO_WEBHOOK_SECRET) y los eventos de publicaciones (post.*).
        </li>
        <li>Planifica la publicación en Zernio: aparecerá en Publicaciones y, al publicarse, en la web.</li>
      </ol>
    </section>
  );
}

async function ZernioStatus() {
  const configured = isZernioConfigured();
  const [requestHeaders, supabase] = await Promise.all([headers(), createClient()]);
  const webhookUrl = `${resolveSiteUrl(requestHeaders).replace(/\/+$/, "")}/api/webhooks/zernio`;
  const [{ data: lastEvent }, accounts] = await Promise.all([
    supabase
      .from("zernio_webhook_events")
      .select("event, received_at")
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    configured ? loadAccounts() : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-3">
      <dl className="grid gap-x-6 gap-y-2 rounded-lg bg-muted px-3 py-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="font-medium">Conexión</dt>
        <dd className={configured ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}>
          {configured ? "✓ Clave de API configurada" : "⚠ Falta ZERNIO_API_KEY en el servidor"}
        </dd>
        <dt className="font-medium">Cuentas</dt>
        <dd className="text-muted-foreground">
          {accounts === null
            ? "—"
            : "error" in accounts
              ? "No se pudieron cargar las cuentas de Zernio. Inténtalo más tarde."
              : accounts.list.length === 0
                ? "No hay cuentas conectadas en Zernio."
                : accounts.list.map((a) => `${PLATFORM_LABELS[a.platform] ?? a.platform}: ${a.name}`).join(" · ")}
        </dd>
        <dt className="font-medium">Último aviso</dt>
        <dd className="text-muted-foreground">
          {lastEvent
            ? `${formatMadridDateTime(lastEvent.received_at as string)} · ${lastEvent.event as string}`
            : "Todavía no se ha recibido ningún aviso de Zernio."}
        </dd>
        <dt className="font-medium">URL del webhook</dt>
        <dd className="break-all font-mono text-xs text-muted-foreground">{webhookUrl}</dd>
      </dl>
      <SyncNowButton disabled={!configured} />
    </div>
  );
}

async function loadAccounts(): Promise<{ list: ZernioAccount[] } | { error: true }> {
  try {
    return { list: await listAccounts() };
  } catch {
    return { error: true };
  }
}
