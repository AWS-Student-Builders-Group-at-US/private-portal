import { Button } from "@/components/ui/button";
import { InboxErrorNotice } from "@/features/inbox/components/inbox-error";
import { InboxList } from "@/features/inbox/components/inbox-list";
import { listInbox } from "@/features/inbox/imap";
import { normalizeSearch, parsePage } from "@/features/inbox/logic";
import { getCurrentMember } from "@/lib/auth/member";

// Read-only inbox of the group's common account, visible to every member.
// Emails are read live over IMAP and never stored.
export default async function InboxPage({ searchParams }: PageProps<"/panel/correo">) {
  const [params] = await Promise.all([searchParams, getCurrentMember()]);
  const page = parsePage(params.pagina);
  const query = normalizeSearch(params.q);
  const result = await listInbox({ page, query });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Correo AWS</h1>
        <p className="text-sm text-muted-foreground">
          Bandeja de entrada de la cuenta común del grupo, solo lectura. Abrir un correo aquí no lo
          marca como leído.
        </p>
      </div>
      <form action="/panel/correo" role="search" className="flex flex-wrap gap-2">
        <label htmlFor="inbox-search" className="sr-only">
          Buscar por asunto o remitente
        </label>
        <input
          id="inbox-search"
          name="q"
          type="search"
          maxLength={100}
          defaultValue={query ?? ""}
          placeholder="Buscar por asunto o remitente"
          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>
      {result.ok ? (
        <InboxList inbox={result.data} page={page} query={query} />
      ) : (
        <InboxErrorNotice error={result.error} />
      )}
    </div>
  );
}
