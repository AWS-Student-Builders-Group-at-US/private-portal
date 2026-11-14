import { CalendarClock, Megaphone, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDueDate } from "../dates";
import { isOverdue } from "../filters";
import type { TaskCardData } from "../types";

// Assignee, due date and event of a task, shared by the board and event page.
export function TaskMeta({
  task,
  today,
  showEvent = true,
}: {
  task: TaskCardData;
  today: string;
  showEvent?: boolean;
}) {
  const overdue = isOverdue(task, today);
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <UserRound className="size-3.5" aria-hidden />
        {task.assignee_name ?? task.assignee_email ?? "Sin asignar"}
      </span>
      {task.due_date && (
        <span
          className={cn(
            "flex items-center gap-1",
            overdue && "font-medium text-destructive",
          )}
        >
          <CalendarClock className="size-3.5" aria-hidden />
          {overdue ? "Venció el " : ""}
          {formatDueDate(task.due_date)}
        </span>
      )}
      {showEvent && task.event_title && (
        <span className="flex min-w-0 items-center gap-1">
          <Megaphone className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{task.event_title}</span>
        </span>
      )}
    </div>
  );
}
