"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatDay } from "../dates";
import { addDays } from "../slots";

// Previous / next / this week links. They keep the other search params of the
// current URL (tab, team view mode), including ones changed on the client
// with history.replaceState.
export function WeekNav({ monday, thisMonday }: { monday: string; thisMonday: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const weekHref = (date: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("semana", date);
    return `${pathname}?${params}`;
  };

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
