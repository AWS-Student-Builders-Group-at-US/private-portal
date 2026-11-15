import { formatMadridDateTime } from "@/features/events/time";
import type { InboxMessage } from "../imap";
import { buildSandboxedHtml, formatAddressList, formatBytes } from "../logic";

export function MessageView({ message }: { message: InboxMessage }) {
  const headers = [
    { label: "De", value: formatAddressList(message.from) },
    { label: "Para", value: formatAddressList(message.to) },
    { label: "CC", value: formatAddressList(message.cc) },
    { label: "Fecha", value: message.date ? formatMadridDateTime(message.date) : "" },
  ].filter((header) => header.value);

  return (
    <article className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold break-words">{message.subject}</h1>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        {headers.map((header) => (
          <div key={header.label} className="contents">
            <dt className="text-muted-foreground">{header.label}</dt>
            <dd className="break-words">{header.value}</dd>
          </div>
        ))}
      </dl>

      {message.html ? (
        // Empty sandbox: no scripts, forms, popups or navigation; the CSP in
        // the document also blocks remote images (trackers) and requests.
        <iframe
          title="Contenido del correo"
          sandbox=""
          referrerPolicy="no-referrer"
          srcDoc={buildSandboxedHtml(message.html)}
          className="h-[70vh] w-full rounded-lg border bg-white"
        />
      ) : message.text ? (
        <pre className="rounded-lg border p-4 font-sans text-sm whitespace-pre-wrap break-words">
          {message.text}
        </pre>
      ) : (
        <p className="text-sm text-muted-foreground">Este correo no tiene texto.</p>
      )}

      {message.html && (
        <p className="text-xs text-muted-foreground">
          Las imágenes externas están bloqueadas para evitar rastreadores.
        </p>
      )}

      {message.attachments.length > 0 && (
        <section aria-labelledby="adjuntos" className="flex flex-col gap-2">
          <h2 id="adjuntos" className="text-sm font-semibold">
            Adjuntos
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            {message.attachments.map((attachment, index) => (
              <li key={`${attachment.filename}-${index}`} className="break-all">
                {attachment.filename}{" "}
                <span className="text-muted-foreground">({formatBytes(attachment.size)})</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
