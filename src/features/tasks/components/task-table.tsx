"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { moveTask } from "../actions";
import { formatDueDate } from "../dates";
import { isOverdue } from "../filters";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "../schema";
import type { TaskCardData } from "../types";

const selectClass =
  "rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const PRIORITY_CLASS: Record<TaskPriority, string> = {
  high: "border-destructive/40 bg-destructive/10 text-destructive",
  medium: "border-[var(--aws-orange)]/40 bg-[var(--aws-orange)]/10 text-foreground",
  low: "text-muted-foreground",
};

type Move = { id: string; status: TaskStatus };

// Tasks table: title (opens the task), assignees, status (changed in place),
// priority, deadline, description and the task's external link. Rows come
// already filtered and sorted.
export function TaskTable({ tasks, today }: { tasks: TaskCardData[]; today: string }) {
  const [rows, applyMove] = useOptimistic(tasks, (current: TaskCardData[], move: Move) =>
    current.map((task) => (task.id === move.id ? { ...task, status: move.status } : task)),
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function move(id: string, status: TaskStatus) {
    setError(null);
    startTransition(async () => {
      applyMove({ id, status });
      const result = await moveTask(id, status);
      // On failure the optimistic state is dropped when the transition ends.
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Tarea</th>
              <th scope="col" className="px-3 py-2 font-medium">Responsable</th>
              <th scope="col" className="px-3 py-2 font-medium">Estado</th>
              <th scope="col" className="px-3 py-2 font-medium">Prioridad</th>
              <th scope="col" className="px-3 py-2 font-medium">Deadline</th>
              <th scope="col" className="px-3 py-2 font-medium">Descripción</th>
              <th scope="col" className="px-3 py-2 font-medium">Enlace</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((task) => {
              const overdue = isOverdue(task, today);
              const done = task.status === "done";
              return (
                <tr key={task.id} className="align-top hover:bg-muted/30">
                  <td className="max-w-56 px-3 py-2">
                    <Link
                      href={`/panel/tareas/${task.id}`}
                      className={cn(
                        "font-medium break-words hover:underline",
                        done && "text-muted-foreground line-through",
                      )}
                    >
                      {task.title}
                    </Link>
                  </td>
                  <td className="max-w-44 px-3 py-2">
                    {task.assignees.length > 0 ? (
                      task.assignees.map((assignee) => assignee.name).join(", ")
                    ) : (
                      <span className="text-muted-foreground">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      aria-label={`Estado de «${task.title}»`}
                      value={task.status}
                      onChange={(e) => move(task.id, e.target.value as TaskStatus)}
                      className={selectClass}
                    >
                      {TASK_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {TASK_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    {task.priority ? (
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-xs whitespace-nowrap",
                          PRIORITY_CLASS[task.priority],
                        )}
                      >
                        {TASK_PRIORITY_LABELS[task.priority]}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 whitespace-nowrap",
                      overdue && "font-medium text-destructive",
                    )}
                  >
                    {task.due_date ? (
                      <>
                        {formatDueDate(task.due_date)}
                        {overdue && <span className="block text-xs">Vencida</span>}
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="max-w-72 px-3 py-2 text-muted-foreground">
                    {task.description ? (
                      <p className="line-clamp-2 break-words" title={task.description}>
                        {task.description}
                      </p>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {task.link_url ? (
                      <a
                        href={task.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 whitespace-nowrap underline-offset-4 hover:underline"
                        title={task.link_url}
                      >
                        Abrir
                        <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
