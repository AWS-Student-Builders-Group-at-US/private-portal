import { headers } from "next/headers";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MyCalendars } from "@/features/calendars/components/my-calendars";
import { buildExportUrl, getMyExportToken, listMyFeeds } from "@/features/calendars/queries";
import { resolveSiteUrl } from "@/features/checkin/url";
import { MyWeekGrid } from "@/features/availability/components/my-week";
import { MyEntries } from "@/features/calendar-entries/components/my-entries";
import { TeamView } from "@/features/availability/components/team-view";
import { formatDay, isValidIsoDate, madridToday } from "@/features/availability/dates";
import { getMyWeek, getTeamWeek } from "@/features/availability/queries";
import { addDays, weekStart } from "@/features/availability/slots";
import { getCurrentMember } from "@/lib/auth/member";

export default async function CalendarPage({
  searchParams,
}: PageProps<"/panel/calendario">) {
  const { vista, semana } = await searchParams;
  const team = vista === "equipo";
  const today = madridToday();
  const monday = weekStart(
    typeof semana === "string" && isValidIsoDate(semana) ? semana : today,
  );
  const thisMonday = weekStart(today);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Calendario</h1>
      <nav className="flex gap-1 border-b" aria-label="Vistas del calendario">
        <Tab href="/panel/calendario" active={!team}>
          Mi disponibilidad
        </Tab>
        <Tab href="/panel/calendario?vista=equipo" active={team}>
          Equipo
        </Tab>
      </nav>
      {team ? (
        <TeamSection monday={monday} thisMonday={thisMonday} />
      ) : (
        <MySection monday={monday} thisMonday={thisMonday} today={today} />
      )}
    </div>
  );
}

function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "-mb-px border-b-2 px-3 py-2 text-sm",
        active
          ? "border-foreground font-medium"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

async function MySection({
  monday,
  thisMonday,
  today,
}: {
  monday: string;
  thisMonday: string;
  today: string;
}) {
  const member = await getCurrentMember();
  const [week, feeds, token, requestHeaders] = await Promise.all([
    getMyWeek(member.email, monday),
    listMyFeeds(),
    getMyExportToken(),
    headers(),
  ]);
  const exportUrl = buildExportUrl(resolveSiteUrl(requestHeaders), token);
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Tu semana</h2>
        <p className="text-sm text-muted-foreground">
          Cada franja muestra tu disponibilidad según tus calendarios de Google y las entradas
          que añades a tu calendario: 1 si estás libre, 0,5 si tienes algo que podrías mover, 0
          si no puedes moverlo. Con «Añadir al calendario» apuntas algo con título y decides si
          el equipo lo ve o solo ve que estás ocupado. Con «Editar disponibilidad» marcas un
          rango de franjas y cambias a mano cómo estás esos días (manda sobre Google y sobre
          tus entradas). Con «Añadir nota» dejas una nota que verá todo el equipo (por ejemplo,
          «No puedo presencial»).
        </p>
        <WeekNav
          monday={monday}
          thisMonday={thisMonday}
          weekHref={(date) => `/panel/calendario?semana=${date}`}
        />
        {week.outsideGoogleWindow && (
          <p className="text-sm text-muted-foreground" role="note">
            Los calendarios de Google solo se cargan de un mes atrás a un mes adelante; esta
            semana puede no incluir todos tus eventos de Google.
          </p>
        )}
        <MyWeekGrid key={monday} week={week} feeds={feeds} />
        <MyEntries
          key={`entries-${monday}`}
          entries={week.entries}
          defaultDate={week.dates.includes(today) ? today : monday}
        />
      </section>
      <MyCalendars feeds={feeds} exportUrl={exportUrl} />
    </div>
  );
}

function WeekNav({
  monday,
  thisMonday,
  weekHref,
}: {
  monday: string;
  thisMonday: string;
  weekHref: (date: string) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={weekHref(addDays(monday, -7))}
        className={buttonVariants({ variant: "outline", size: "icon" })}
        aria-label="Semana anterior"
      >
        <ChevronLeft />
      </Link>
      <span className="text-sm font-medium">
        {formatDay(monday)} – {formatDay(addDays(monday, 6))}
      </span>
      <Link
        href={weekHref(addDays(monday, 7))}
        className={buttonVariants({ variant: "outline", size: "icon" })}
        aria-label="Semana siguiente"
      >
        <ChevronRight />
      </Link>
      {monday !== thisMonday && (
        <Link
          href={weekHref(thisMonday)}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Esta semana
        </Link>
      )}
    </div>
  );
}

async function TeamSection({
  monday,
  thisMonday,
}: {
  monday: string;
  thisMonday: string;
}) {
  const week = await getTeamWeek(monday);
  return (
    <div className="flex flex-col gap-4">
      <WeekNav
        monday={monday}
        thisMonday={thisMonday}
        weekHref={(date) => `/panel/calendario?vista=equipo&semana=${date}`}
      />
      {week.outsideGoogleWindow && (
        <p className="text-sm text-muted-foreground" role="note">
          Los calendarios de Google solo se cargan de un mes atrás a un mes adelante; esta
          semana puede no incluir todos los eventos de Google del equipo.
        </p>
      )}
      <TeamView key={monday} week={week} />
    </div>
  );
}
