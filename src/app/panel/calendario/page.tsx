import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OverridesPanel } from "@/features/availability/components/overrides-panel";
import { TeamView } from "@/features/availability/components/team-view";
import { TemplatePainter } from "@/features/availability/components/template-painter";
import { formatDay, isValidIsoDate, madridToday } from "@/features/availability/dates";
import { getMyAvailability, getTeamWeek } from "@/features/availability/queries";
import { addDays, weekStart } from "@/features/availability/slots";
import { getCurrentMember } from "@/lib/auth/member";

export default async function CalendarPage({
  searchParams,
}: PageProps<"/panel/calendario">) {
  const { vista, semana } = await searchParams;
  const team = vista === "equipo";
  const today = madridToday();

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
        <TeamSection
          monday={weekStart(
            typeof semana === "string" && isValidIsoDate(semana) ? semana : today,
          )}
          thisMonday={weekStart(today)}
        />
      ) : (
        <MySection today={today} />
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

async function MySection({ today }: { today: string }) {
  const member = await getCurrentMember();
  const mine = await getMyAvailability(member.email, today);
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Semana habitual</h2>
        <TemplatePainter initial={mine.template} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Cambios por fecha</h2>
        <OverridesPanel overrides={mine.overrides} today={today} />
      </section>
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
  const weekHref = (date: string) => `/panel/calendario?vista=equipo&semana=${date}`;
  return (
    <div className="flex flex-col gap-4">
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
      <TeamView key={monday} week={week} />
    </div>
  );
}
