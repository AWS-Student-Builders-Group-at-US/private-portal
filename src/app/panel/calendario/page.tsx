import { headers } from "next/headers";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MyCalendars } from "@/features/calendars/components/my-calendars";
import { SharedCalendarLink } from "@/features/calendars/components/shared-calendar-link";
import { buildExportUrl, getMyExportToken, listMyFeeds } from "@/features/calendars/queries";
import { resolveSiteUrl } from "@/features/checkin/url";
import { MyWeekGrid } from "@/features/availability/components/my-week";
import { MyEntries } from "@/features/calendar-entries/components/my-entries";
import { GroupMeetings } from "@/features/calendar-entries/components/group-meetings";
import { TeamView } from "@/features/availability/components/team-view";
import { WeekNav } from "@/features/availability/components/week-nav";
import { isValidIsoDate, madridToday } from "@/features/availability/dates";
import { getMyWeek, getTeamWeek } from "@/features/availability/queries";
import { weekStart } from "@/features/availability/slots";
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
        <TeamSection monday={monday} thisMonday={thisMonday} today={today} />
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
  const [week, feeds] = await Promise.all([getMyWeek(member.email, monday), listMyFeeds()]);
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
        <WeekNav monday={monday} thisMonday={thisMonday} />
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
      <MyCalendars feeds={feeds} />
    </div>
  );
}

async function TeamSection({
  monday,
  thisMonday,
  today,
}: {
  monday: string;
  thisMonday: string;
  today: string;
}) {
  const [week, token, requestHeaders] = await Promise.all([
    getTeamWeek(monday),
    getMyExportToken(),
    headers(),
  ]);
  const exportUrl = buildExportUrl(resolveSiteUrl(requestHeaders), token);
  const meetings = week.entries.filter((entry) => entry.is_group_meeting);
  const authors = Object.fromEntries(week.members.map((m) => [m.email, m.name]));
  return (
    <div className="flex flex-col gap-4">
      <WeekNav monday={monday} thisMonday={thisMonday} />
      {week.outsideGoogleWindow && (
        <p className="text-sm text-muted-foreground" role="note">
          Los calendarios de Google solo se cargan de un mes atrás a un mes adelante; esta
          semana puede no incluir todos los eventos de Google del equipo.
        </p>
      )}
      {/* Meetings first so "Programar reunión" is visible without scrolling past the grid. */}
      <GroupMeetings
        key={`meetings-${monday}`}
        meetings={meetings}
        authors={authors}
        defaultDate={week.dates.includes(today) ? today : monday}
      />
      <TeamView key={monday} week={week} today={today} />
      <SharedCalendarLink url={exportUrl} />
    </div>
  );
}
