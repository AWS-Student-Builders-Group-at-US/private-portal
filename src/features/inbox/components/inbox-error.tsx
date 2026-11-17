import type { InboxError } from "../types";

const MESSAGES: Record<InboxError, string> = {
  not_configured:
    "El correo de la cuenta común no está configurado en el servidor (GMAIL_USER y GMAIL_APP_PASSWORD).",
  unavailable: "No se pudo conectar con el correo de la cuenta común. Inténtalo de nuevo en unos minutos.",
};

export function InboxErrorNotice({ error }: { error: InboxError }) {
  return (
    <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
      {MESSAGES[error]}
    </p>
  );
}
