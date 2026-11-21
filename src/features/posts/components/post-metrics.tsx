import { formatMadridDateTime } from "@/features/events/time";
import {
  formatCount,
  formatRate,
  interactionsOf,
  summarizeMetrics,
  type PostMetricsValues,
} from "@/features/zernio/analytics";
import type { StoredPostMetrics } from "../metrics";

// Zernio insights for posts (stored in post_metrics by the server sync).

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  twitter: "X",
  tiktok: "TikTok",
  youtube: "YouTube",
  threads: "Threads",
};
const platformLabel = (p: string) => PLATFORM_LABELS[p] ?? p.charAt(0).toUpperCase() + p.slice(1);

const SYNC_NOTES: Record<StoredPostMetrics["sync_status"], string | null> = {
  synced: null,
  partial: "Algunas redes todavía no tienen métricas.",
  pending: "Zernio aún está recogiendo las métricas.",
  unavailable: "Zernio no puede leer métricas de esta publicación.",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/** Totals over the published Zernio posts that have insights. */
export function MetricsSummary({ metrics }: { metrics: PostMetricsValues[] }) {
  if (metrics.length === 0) return null;
  const s = summarizeMetrics(metrics);
  return (
    <section aria-labelledby="metrics-summary" className="flex flex-col gap-2">
      <h2 id="metrics-summary" className="text-sm font-medium">
        Rendimiento en redes{" "}
        <span className="font-normal text-muted-foreground">
          ({s.posts === 1 ? "1 publicación" : `${s.posts} publicaciones`} con métricas de Zernio)
        </span>
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Impresiones" value={formatCount(s.impressions)} />
        <Stat label="Alcance" value={formatCount(s.reach)} />
        <Stat label="Interacciones" value={formatCount(s.interactions)} />
        <Stat label="Interacción media" value={formatRate(s.engagementRate)} />
      </div>
    </section>
  );
}

/** One-line insights for a post in the list. */
export function PostMetricsInline({ metrics }: { metrics: StoredPostMetrics }) {
  const parts = [
    `${formatCount(metrics.impressions || metrics.views)} ${metrics.impressions ? "impresiones" : "vistas"}`,
    `${formatCount(interactionsOf(metrics))} interacciones`,
  ];
  if (metrics.engagement_rate !== null) parts.push(formatRate(metrics.engagement_rate));
  return <span className="text-xs text-muted-foreground tabular-nums">{parts.join(" · ")}</span>;
}

const ROWS: [keyof PostMetricsValues, string][] = [
  ["impressions", "Impresiones"],
  ["reach", "Alcance"],
  ["views", "Vistas"],
  ["likes", "Me gusta"],
  ["comments", "Comentarios"],
  ["shares", "Compartidos"],
  ["saves", "Guardados"],
  ["clicks", "Clics"],
];

/** Full insights for one post, with the per-network breakdown. */
export function PostMetricsPanel({ metrics, isPublished }: { metrics: StoredPostMetrics | null; isPublished: boolean }) {
  return (
    <section aria-labelledby="post-metrics" className="flex flex-col gap-3">
      <h2 id="post-metrics" className="text-lg font-semibold">Métricas</h2>
      {!metrics ? (
        <p className="text-sm text-muted-foreground">
          {isPublished
            ? "Todavía no hay métricas. Se actualizan a diario o con «Sincronizar ahora» en Ajustes."
            : "Las métricas aparecerán cuando se publique en redes."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Impresiones" value={formatCount(metrics.impressions)} />
            <Stat label="Alcance" value={formatCount(metrics.reach)} />
            <Stat label="Interacciones" value={formatCount(interactionsOf(metrics))} />
            <Stat label="Tasa de interacción" value={formatRate(metrics.engagement_rate)} />
          </div>
          {metrics.platforms.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <caption className="sr-only">Métricas por red</caption>
                <thead className="bg-muted text-left text-xs">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Métrica</th>
                    {metrics.platforms.map((p, i) => (
                      <th key={`${p.platform}-${i}`} scope="col" className="px-3 py-2 text-right font-medium">
                        {platformLabel(p.platform)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ROWS.filter(([key]) => metrics.platforms.some((p) => (p[key] ?? 0) > 0)).map(([key, label]) => (
                    <tr key={key}>
                      <th scope="row" className="px-3 py-1.5 text-left font-normal">{label}</th>
                      {metrics.platforms.map((p, i) => (
                        <td key={`${p.platform}-${i}`} className="px-3 py-1.5 text-right tabular-nums">
                          {formatCount(p[key] ?? 0)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className="px-3 py-1.5 text-left font-normal">Tasa de interacción</th>
                    {metrics.platforms.map((p, i) => (
                      <td key={`${p.platform}-${i}`} className="px-3 py-1.5 text-right tabular-nums">
                        {formatRate(p.engagement_rate ?? null)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {SYNC_NOTES[metrics.sync_status] && `${SYNC_NOTES[metrics.sync_status]} `}
            Datos de Zernio
            {metrics.metrics_updated_at && `, actualizados el ${formatMadridDateTime(metrics.metrics_updated_at)}`}. La
            tasa de interacción suma me gusta, comentarios, compartidos y guardados sobre las impresiones (o el alcance
            o las vistas si la red no da impresiones).
          </p>
        </>
      )}
    </section>
  );
}
