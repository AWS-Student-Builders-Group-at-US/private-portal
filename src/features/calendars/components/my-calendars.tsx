import Link from "next/link";
import { formatMadridDateTimeShort } from "@/features/events/time";
import { MAX_FEEDS_PER_MEMBER, type FeedSummary } from "../queries";
import {
  AddFeedForm,
  DeleteFeedButton,
  FeedWeightSelect,
  RefreshFeedsButton,
} from "./calendar-feeds";
import { SHARED_CALENDAR_ANCHOR } from "./shared-calendar-link";

// "Mis calendarios de Google", shown on "Mi disponibilidad", plus a pointer to
// the shared group calendar link (it lives at the bottom of "Equipo").
export function MyCalendars({ feeds }: { feeds: FeedSummary[] }) {
  return (
    <>
      <section id="calendarios" className="flex scroll-mt-4 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Mis calendarios de Google</h2>
          {feeds.length > 0 && <RefreshFeedsButton />}
        </div>
        <p className="text-sm text-muted-foreground">
          Tus eventos de Google cuentan como ocupado según su importancia: «No lo puedo mover»
          suma 1 y «Lo podría mover» suma 0,5. El equipo solo verá tus horas ocupadas, nunca los
          títulos ni los detalles de tus eventos. La dirección secreta solo la ves tú.
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
                  <FeedWeightSelect id={feed.id} weight={feed.weight} />
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
            <li>
              Junto al calendario, abre ⋮ → Configuración y uso compartido (Configuración del
              calendario).
            </li>
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

      <p className="max-w-xl text-sm text-muted-foreground">
        El enlace para suscribirte al calendario compartido del grupo (eventos y reuniones del
        grupo) está al final de la pestaña{" "}
        <Link
          href={`/panel/calendario?vista=equipo#${SHARED_CALENDAR_ANCHOR}`}
          className="font-medium text-foreground underline underline-offset-4"
        >
          Equipo
        </Link>
        .
      </p>
    </>
  );
}
