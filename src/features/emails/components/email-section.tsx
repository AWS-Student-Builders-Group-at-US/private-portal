import { getCurrentMember } from "@/lib/auth/member";
import { formatMadridDateTimeShort } from "@/features/events/time";
import { buildDefaultEmail, type EmailEvent } from "../compose";
import { getEmailOverview } from "../queries";
import { EmailComposer, ResumeCampaignButton } from "./email-composer";

const STATUS_LABEL = {
  sending: "Pendiente",
  partial: "Incompleto",
  sent: "Enviado",
  failed: "Fallido",
} as const;

// Member-only "Correo a la comunidad" block for /panel/eventos/[id].
export async function EmailSection({ event }: { event: EmailEvent & { id: string } }) {
  await getCurrentMember();
  const { recipientCount, campaigns } = await getEmailOverview(event.id);

  return (
    <section className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Correo a la comunidad</h2>
        <p className="text-sm text-muted-foreground">
          Se enviará un correo individual a {recipientCount}{" "}
          {recipientCount === 1 ? "persona" : "personas"} que aceptaron recibir
          correos al registrarse en algún evento y no se han dado de baja.
        </p>
      </div>
      <EmailComposer
        eventId={event.id}
        recipientCount={recipientCount}
        defaults={buildDefaultEmail(event)}
      />

      <h3 className="font-medium">Envíos anteriores</h3>
      {campaigns.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no se ha enviado ningún correo.</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {campaigns.map((campaign) => (
            <li key={campaign.id} className="flex flex-col gap-1 py-3 text-sm">
              <span className="font-medium">{campaign.subject}</span>
              <span className="text-muted-foreground">
                {formatMadridDateTimeShort(campaign.created_at)} · {campaign.sent_by}
              </span>
              <span className="text-muted-foreground">
                {STATUS_LABEL[campaign.status]} · Enviados: {campaign.sent_count} ·
                Fallidos: {campaign.failed_count} · Destinatarios: {campaign.recipient_count}
              </span>
              {(campaign.status === "sending" || campaign.status === "partial") && (
                <ResumeCampaignButton campaignId={campaign.id} />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
