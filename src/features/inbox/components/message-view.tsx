import {
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Paperclip,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { formatMadridDateTime } from "@/features/events/time";
import type { InboxMessage } from "../types";
import {
  type Address,
  buildSandboxedHtml,
  formatAddressList,
  formatBytes,
  isAwsSender,
  summarizeRecipients,
} from "../logic";
import { AwsBadge, SenderAvatar } from "./sender-avatar";

const FILE_ICONS: [RegExp, LucideIcon][] = [
  [/\.(pdf|docx?|odt|txt|md|rtf)$/i, FileText],
  [/\.(xlsx?|ods|csv)$/i, FileSpreadsheet],
  [/\.(png|jpe?g|gif|webp|svg|heic)$/i, FileImage],
  [/\.(zip|rar|7z|gz|tar)$/i, FileArchive],
];

const fileIcon = (filename: string) =>
  FILE_ICONS.find(([pattern]) => pattern.test(filename))?.[1] ?? File;

function Recipients({ to, cc }: { to: Address[]; cc: Address[] }) {
  if (to.length === 0 && cc.length === 0) return null;
  const summary = [
    to.length > 0 && `Para: ${summarizeRecipients(to)}`,
    cc.length > 0 && `CC: ${summarizeRecipients(cc)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  // Short lists are shown as they are; longer ones expand on demand.
  if (to.length <= 2 && cc.length === 0) {
    return <p className="truncate text-xs text-muted-foreground">{summary}</p>;
  }

  return (
    <details className="group text-xs text-muted-foreground">
      <summary className="w-fit max-w-full cursor-pointer list-none truncate rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        {summary}{" "}
        <span className="text-foreground/70 underline underline-offset-2 group-open:hidden">
          Ver todos
        </span>
      </summary>
      <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-lg border bg-muted/40 p-3">
        {to.length > 0 && (
          <>
            <dt className="font-medium">Para</dt>
            <dd className="break-words text-foreground">{formatAddressList(to)}</dd>
          </>
        )}
        {cc.length > 0 && (
          <>
            <dt className="font-medium">CC</dt>
            <dd className="break-words text-foreground">{formatAddressList(cc)}</dd>
          </>
        )}
      </dl>
    </details>
  );
}

export function MessageView({ message }: { message: InboxMessage }) {
  const sender = message.from[0];
  const senderName = sender?.name?.trim() || sender?.address || "Desconocido";

  return (
    <article className="flex min-h-full flex-col gap-5 p-4 sm:p-6" aria-labelledby="message-subject">
      <h2 id="message-subject" className="text-xl font-semibold break-words sm:text-2xl">
        {message.subject}
      </h2>

      <div className="flex items-start gap-3">
        <SenderAvatar name={sender?.name} address={sender?.address} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-semibold break-words">{senderName}</span>
            {isAwsSender(sender?.address) && <AwsBadge />}
            {sender?.address && sender.name?.trim() && (
              <span className="text-sm break-all text-muted-foreground">&lt;{sender.address}&gt;</span>
            )}
          </div>
          <Recipients to={message.to} cc={message.cc} />
        </div>
        {message.date && (
          <time
            dateTime={message.date}
            className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block sm:max-w-44"
          >
            {formatMadridDateTime(message.date)}
          </time>
        )}
      </div>
      {message.date && (
        <time dateTime={message.date} className="-mt-3 text-xs text-muted-foreground sm:hidden">
          {formatMadridDateTime(message.date)}
        </time>
      )}

      {message.attachments.length > 0 && (
        <section aria-labelledby="message-attachments" className="flex flex-col gap-2">
          <h3
            id="message-attachments"
            className="flex items-center gap-1.5 font-mono text-xs font-semibold text-muted-foreground"
          >
            <Paperclip aria-hidden className="size-3.5" />
            {message.attachments.length === 1 ? "1 adjunto" : `${message.attachments.length} adjuntos`}
          </h3>
          <ul className="flex flex-wrap gap-2">
            {message.attachments.map((attachment, index) => {
              const Icon = fileIcon(attachment.filename);
              return (
                <li
                  key={`${attachment.filename}-${index}`}
                  className="flex max-w-full items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-sm"
                >
                  <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 truncate">{attachment.filename}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {formatBytes(attachment.size)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {message.html ? (
        <div className="flex flex-1 flex-col gap-2">
          {/* White card: email HTML assumes a light background, also in dark mode. */}
          <div className="flex min-h-[60vh] flex-1 overflow-clip rounded-xl border bg-white shadow-xs">
            {/* Empty sandbox: no scripts, forms, popups or navigation; the CSP in
                the document also blocks remote images (trackers) and requests.
                Without allow-same-origin its height cannot be measured, so the
                frame fills the card and scrolls inside. */}
            <iframe
              title="Contenido del correo"
              sandbox=""
              referrerPolicy="no-referrer"
              srcDoc={buildSandboxedHtml(message.html)}
              className="block min-h-[60vh] w-full flex-1 bg-white"
            />
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck aria-hidden className="size-3.5" />
            Imágenes externas bloqueadas por seguridad
          </p>
        </div>
      ) : message.text ? (
        <div className="max-w-prose rounded-xl border bg-background p-5 text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.text}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Este correo no tiene texto.</p>
      )}
    </article>
  );
}
