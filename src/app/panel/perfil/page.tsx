import { headers } from "next/headers";
import { resolveSiteUrl } from "@/features/checkin/url";
import {
  AddFeedForm,
  DeleteFeedButton,
  RefreshFeedsButton,
} from "@/features/calendars/components/calendar-feeds";
import { ExportLink } from "@/features/calendars/components/export-link";
import {
  MAX_FEEDS_PER_MEMBER,
  buildExportUrl,
  getMyExportToken,
  listMyFeeds,
} from "@/features/calendars/queries";
import { formatMadridDateTimeShort } from "@/features/events/time";

export default async function ProfilePage() {
  const [feeds, token, requestHeaders] = await Promise.all([
    listMyFeeds(),
    getMyExportToken(),
    headers(),
  ]);
  const exportUrl = buildExportUrl(resolveSiteUrl(requestHeaders), token);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Mi perfil</h1>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Mis calendarios de Google</h2>
          {feeds.length > 0 && <RefreshFeedsButton />}
        </div>
        <p className="text-sm text-muted-foreground">
          El equipo solo verá tus horas ocupadas, nunca los títulos ni los detalles de tus
          eventos. La dirección secreta solo la ves tú.
        </p>

        {feeds.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no has conectado ningún calendario.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-lg border">
            {feeds.map((feed) => (
              <li key={feed.id} className="flex items-start justify-between gap-4 p-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-medium">{feed.label}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {feed.masked_url}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {feed.last_fetched_at
                      ? `Actualizado: ${formatMadridDateTimeShort(feed.last_fetched_at)}`
                      : "Pendiente de actualizar"}
                  </p>
                  {feed.last_error && (
                    <p className="text-xs text-destructive">Error: {feed.last_error}</p>
                  )}
                </div>
                <DeleteFeedButton id={feed.id} />
              </li>
            ))}
          </ul>
        )}

        <details className="max-w-xl text-sm">
          <summary className="cursor-pointer font-medium">¿Dónde encuentro la dirección?</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Abre Google Calendar en el navegador.</li>
            <li>Junto al calendario, abre ⋮ → Configuración y uso compartido (Configuración del calendario).</li>
            <li>Ve a «Integrar el calendario».</li>
            <li>Copia la «Dirección secreta en formato iCal» y pégala aquí.</li>
          </ol>
        </details>

        {feeds.length >= MAX_FEEDS_PER_MEMBER ? (
          <p className="text-sm text-muted-foreground">
            Has alcanzado el máximo de {MAX_FEEDS_PER_MEMBER} calendarios.
          </p>
        ) : (
          <AddFeedForm />
        )}
      </section>

      <section className="flex max-w-xl flex-col gap-4">
        <h2 className="text-lg font-semibold">Suscribirse a los eventos del equipo</h2>
        <p className="text-sm text-muted-foreground">
          Añade este enlace a Google Calendar para ver los eventos del equipo. Es personal: no
          lo compartas.
        </p>
        <ExportLink url={exportUrl} />
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>En Google Calendar, junto a «Otros calendarios», pulsa +.</li>
          <li>Elige «Desde URL», pega el enlace y pulsa «Añadir calendario».</li>
          <li>Google lo actualiza cada pocas horas.</li>
        </ol>
      </section>
    </div>
  );
}
