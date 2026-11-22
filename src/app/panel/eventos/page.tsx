import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EventList, splitEvents } from "@/features/events/components/event-list";
import { StatusMessage } from "@/features/events/components/status-message";
import { listEvents } from "@/features/events/queries";

export default async function EventsPage({
  searchParams,
}: PageProps<"/panel/eventos">) {
  const [events, { estado }] = await Promise.all([listEvents(), searchParams]);
  const { upcoming, past } = splitEvents(events, new Date());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Eventos</h1>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/panel/eventos/formularios"
            className={buttonVariants({ variant: "outline" })}
          >
            <ClipboardList />
            Formularios
          </Link>
          <Link href="/panel/eventos/nuevo" className={buttonVariants()}>
            <Plus />
            Nuevo evento
          </Link>
        </div>
      </div>
      <StatusMessage status={estado} />
      <EventList
        title="Próximos"
        events={upcoming}
        emptyText="No hay eventos próximos."
      />
      <EventList
        title="Pasados"
        events={past}
        emptyText="No hay eventos pasados."
        limit={5}
      />
    </div>
  );
}
