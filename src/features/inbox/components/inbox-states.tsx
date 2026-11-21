import type { ReactNode } from "react";
import Link from "next/link";
import { Inbox, MailOpen, PlugZap, RotateCw, SearchX, Settings2, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InboxError } from "../types";

function InboxState({
  icon: Icon,
  title,
  children,
  action,
  tone = "muted",
  role,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  tone?: "muted" | "warning";
  role?: "alert" | "status";
  className?: string;
}) {
  return (
    <div
      role={role}
      className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-12 items-center justify-center rounded-2xl",
          tone === "warning"
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-6" />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="font-mono text-sm font-semibold">{title}</p>
        {children && <div className="text-sm text-muted-foreground">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function EmptyInbox() {
  return (
    <InboxState icon={Inbox} title="La bandeja está vacía">
      Cuando llegue un correo a la cuenta común aparecerá aquí.
    </InboxState>
  );
}

export function NoResults({ query }: { query: string }) {
  return (
    <InboxState
      icon={SearchX}
      title="Sin resultados"
      action={
        <Link href="/panel/correo" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Quitar búsqueda
        </Link>
      }
    >
      Ningún asunto ni remitente coincide con «{query}».
    </InboxState>
  );
}

export function EmptyReadingPane({ className }: { className?: string }) {
  return (
    <InboxState icon={MailOpen} title="Selecciona un correo" className={className}>
      Se mostrará aquí. Abrirlo no lo marca como leído en la cuenta común.
    </InboxState>
  );
}

export function InboxErrorState({ error, retryHref }: { error: InboxError; retryHref: string }) {
  if (error === "not_configured") {
    return (
      <InboxState icon={Settings2} title="Correo no configurado" role="status">
        <p>
          Faltan <code className="font-mono text-foreground">GMAIL_USER</code> y{" "}
          <code className="font-mono text-foreground">GMAIL_APP_PASSWORD</code> en el servidor.
        </p>
        <p className="mt-2">
          En local puedes usar correos de ejemplo con{" "}
          <code className="font-mono text-foreground">INBOX_FIXTURES=1</code>.
        </p>
      </InboxState>
    );
  }

  return (
    <InboxState
      icon={PlugZap}
      title="No se pudo conectar con el correo"
      tone="warning"
      role="alert"
      action={
        <Link href={retryHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <RotateCw />
          Reintentar
        </Link>
      }
    >
      El servidor de Gmail no respondió. Inténtalo de nuevo en unos minutos.
    </InboxState>
  );
}
