import { CalendarPlus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { GROUP_CALENDAR_NAME } from "../ics-export";
import { ExportLink } from "./export-link";

export const SHARED_CALENDAR_ANCHOR = "calendario-compartido";

// The viewer's own subscription link to the shared group calendar (team
// events and group meetings), at the bottom of the "Equipo" tab. The feed is
// read-only: calendar apps only show it; changes are made in the portal.
export function SharedCalendarLink({ url }: { url: string }) {
  const webcalUrl = url.replace(/^https?:\/\//, "webcal://");
  return (
    <section
      id={SHARED_CALENDAR_ANCHOR}
      className="flex max-w-xl scroll-mt-4 flex-col gap-4 border-t pt-6"
    >
      <h2 className="text-lg font-semibold">Calendario compartido «{GROUP_CALENDAR_NAME}»</h2>
      <p className="text-sm text-muted-foreground">
        Añade este enlace a tu app de calendario para ver los eventos del equipo y las reuniones
        del grupo. Es de solo lectura: lo ves en tu calendario, pero las reuniones se programan,
        cambian o eliminan aquí, y los cambios llegan solos. Las entradas personales nunca
        aparecen. El enlace es personal: no lo compartas.
      </p>
      <ExportLink url={url} />
      <div>
        <a href={webcalUrl} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <CalendarPlus data-icon="inline-start" />
          Abrir en la app de calendario
        </a>
      </div>
      <div className="flex flex-col gap-3 text-sm">
        <div>
          <h3 className="font-medium">Google Calendar</h3>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>En el navegador, junto a «Otros calendarios», pulsa +.</li>
            <li>Elige «Desde URL», pega el enlace y pulsa «Añadir calendario».</li>
            <li>Google lo actualiza cada pocas horas; los cambios pueden tardar en verse.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-medium">Apple Calendar</h3>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>
              En Mac: Archivo → Nueva suscripción de calendario, pega el enlace y elige
              actualizar cada hora.
            </li>
            <li>
              En iPhone: Ajustes → Calendario → Cuentas → Añadir cuenta → Otra → Añadir
              calendario suscrito, y pega el enlace.
            </li>
          </ol>
        </div>
        <div>
          <h3 className="font-medium">Outlook</h3>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>En Outlook en la web, abre Calendario → Añadir calendario.</li>
            <li>Elige «Suscribirse desde la web», pega el enlace e importa.</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
