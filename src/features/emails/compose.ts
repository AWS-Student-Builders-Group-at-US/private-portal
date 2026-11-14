import { z } from "zod";
import { formatMadridDateTime } from "@/features/events/time";

// Pure email composition: input schema, event template, unsubscribe links,
// and the final text/HTML message with its headers.

export const campaignInputSchema = z.object({
  subject: z
    .string("Indica el asunto.")
    .trim()
    .min(1, "Indica el asunto.")
    .max(150, "El asunto admite como máximo 150 caracteres.")
    .refine((value) => !/[\r\n]/.test(value), "El asunto debe ocupar una sola línea."),
  body: z
    .string("Escribe el mensaje.")
    .trim()
    .min(1, "Escribe el mensaje.")
    .max(5000, "El mensaje admite como máximo 5000 caracteres."),
});

export type CampaignInput = z.infer<typeof campaignInputSchema>;

export type EmailEvent = {
  title: string;
  starts_at: string;
  location: string | null;
  meetup_url: string | null;
};

export const SENDER_NAME = "AWS Student Builder Group · Universidad de Sevilla";

export function buildDefaultEmail(event: EmailEvent): CampaignInput {
  const lines = [
    "¡Hola!",
    "",
    `Te invitamos a nuestro próximo evento: ${event.title}.`,
    "",
    `Fecha y hora: ${formatMadridDateTime(event.starts_at)} (hora de Madrid)`,
  ];
  if (event.location) lines.push(`Lugar: ${event.location}`);
  if (event.meetup_url) lines.push(`Inscripción en Meetup: ${event.meetup_url}`);
  lines.push("", "¡Te esperamos!", "El equipo del AWS Student Builder Group");
  return {
    subject: `Próximo evento: ${event.title}`.slice(0, 150),
    body: lines.join("\n"),
  };
}

export type UnsubscribeUrls = { page: string; oneClick: string };

// `page` is the human confirmation page (footer link); `oneClick` receives
// the RFC 8058 POST from mail clients (List-Unsubscribe header).
export function buildUnsubscribeUrls(baseUrl: string, token: string): UnsubscribeUrls {
  const base = baseUrl.replace(/\/+$/, "");
  const safe = encodeURIComponent(token);
  return { page: `${base}/baja/${safe}`, oneClick: `${base}/api/baja/${safe}` };
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FOOTER_REASON =
  "Recibes este correo porque aceptaste recibir comunicaciones del " +
  "AWS Student Builder Group al registrar tu asistencia en uno de nuestros eventos.";

export function composeEmail({
  subject,
  body,
  unsubscribe,
}: CampaignInput & { unsubscribe: UnsubscribeUrls }) {
  const text = [
    body,
    "",
    "--",
    FOOTER_REASON,
    `Para dejar de recibir estos correos: ${unsubscribe.page}`,
  ].join("\n");

  const htmlBody = escapeHtml(body).replace(/\r?\n/g, "<br>");
  const html =
    `<!doctype html><html lang="es"><body style="font-family:sans-serif;line-height:1.5;color:#111">` +
    `<div>${htmlBody}</div>` +
    `<hr style="border:none;border-top:1px solid #ddd;margin:24px 0">` +
    `<p style="font-size:12px;color:#555">${escapeHtml(FOOTER_REASON)}<br>` +
    `<a href="${escapeHtml(unsubscribe.page)}">Darme de baja</a></p>` +
    `</body></html>`;

  return {
    subject,
    text,
    html,
    headers: {
      "List-Unsubscribe": `<${unsubscribe.oneClick}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
