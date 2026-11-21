import { cn } from "@/lib/utils";
import { listColumnClass, mailFrameClass, readingColumnClass } from "./mail-client";

const bar = "animate-pulse rounded-md bg-muted";
const WIDTHS = ["w-3/4", "w-2/3", "w-5/6", "w-1/2", "w-3/5", "w-4/5", "w-2/3", "w-3/4"];

function ListSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-2 border-b p-3">
        <div className={cn(bar, "h-9 w-full rounded-lg")} />
        <div className="flex justify-between">
          <div className={cn(bar, "h-4 w-24")} />
          <div className={cn(bar, "h-4 w-20")} />
        </div>
      </div>
      <ul className="divide-y divide-border/70">
        {WIDTHS.map((width, index) => (
          <li key={index} className="flex gap-3 px-4 py-3">
            <div className={cn(bar, "size-9 shrink-0 rounded-full")} />
            <div className="flex flex-1 flex-col gap-2 py-0.5">
              <div className="flex justify-between gap-4">
                <div className={cn(bar, "h-3.5 w-32")} />
                <div className={cn(bar, "h-3.5 w-10")} />
              </div>
              <div className={cn(bar, "h-3.5", width)} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function ReadingSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className={cn(bar, "h-7 w-2/3")} />
      <div className="flex items-center gap-3">
        <div className={cn(bar, "size-11 rounded-full")} />
        <div className="flex flex-1 flex-col gap-2">
          <div className={cn(bar, "h-4 w-48")} />
          <div className={cn(bar, "h-3 w-64 max-w-full")} />
        </div>
      </div>
      <div className={cn(bar, "h-[50vh] w-full rounded-xl")} />
    </div>
  );
}

// Loading state for /panel/correo (list) and /panel/correo/[uid] (reading).
export function InboxSkeleton({ reading = false }: { reading?: boolean }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Cargando correo">
      <div className={cn("flex items-center gap-3", reading && "max-lg:hidden")}>
        <div className={cn(bar, "size-10 rounded-xl")} />
        <div className="flex flex-col gap-2">
          <div className={cn(bar, "h-6 w-36")} />
          <div className={cn(bar, "h-4 w-60")} />
        </div>
      </div>
      <div className={mailFrameClass}>
        <div className={cn(listColumnClass, reading && "max-lg:hidden")}>
          <ListSkeleton />
        </div>
        <div className={cn(readingColumnClass, !reading && "max-lg:hidden")}>
          <ReadingSkeleton />
        </div>
      </div>
    </div>
  );
}
