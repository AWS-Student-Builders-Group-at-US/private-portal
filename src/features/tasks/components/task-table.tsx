"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { Popover } from "@base-ui/react/popover";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
  Maximize2,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/features/events/types";
import { updateTaskAssignees, updateTaskField, type EditableTaskField } from "../actions";
import { isOverdue, sortTasksBy, type SortDir, type SortKey } from "../filters";
import {
  TASK_LINK_MAX,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "../schema";
import type { MemberOption, TaskCardData } from "../types";
import { EditableText } from "./editable-text";

const selectClass =
  "rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs outline-none hover:border-input focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const PRIORITY_CLASS: Record<TaskPriority, string> = {
  high: "border-destructive/40 bg-destructive/10 text-destructive",
  medium: "border-[var(--aws-orange)]/40 bg-[var(--aws-orange)]/10 text-foreground",
  low: "border-input text-muted-foreground",
};

// Row background per status: none for "Por hacer", then blue, yellow, green.
const STATUS_ROW_CLASS: Record<TaskStatus, string> = {
  todo: "hover:bg-muted/30",
  doing: "bg-sky-500/10 hover:bg-sky-500/15",
  review: "bg-amber-400/15 hover:bg-amber-400/20",
  done: "bg-emerald-500/10 hover:bg-emerald-500/15",
};

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "title", label: "Tarea" },
  { key: "assignees", label: "Responsable" },
  { key: "status", label: "Estado" },
  { key: "priority", label: "Prioridad" },
  { key: "due_date", label: "Deadline" },
  { key: "description", label: "Descripción" },
  { key: "link", label: "Enlace" },
];

type Patch = { id: string; changes: Partial<TaskCardData> };

// Tasks table. Every cell edits in place: text fields on click, selects for
// status and priority, a date picker for the deadline and a checklist for the
// assignees. Column headers sort (click again to reverse). Rows come already
// filtered and in the default order (status, then deadline).
export function TaskTable({
  tasks,
  members,
  today,
}: {
  tasks: TaskCardData[];
  members: MemberOption[];
  today: string;
}) {
  const [rows, applyPatch] = useOptimistic(tasks, (current: TaskCardData[], patch: Patch) =>
    current.map((task) => (task.id === patch.id ? { ...task, ...patch.changes } : task)),
  );
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);
  const [, startTransition] = useTransition();

  // Applies the change at once and saves it; on failure the optimistic state
  // is dropped when the transition ends and the error is shown.
  function save(patch: Patch, request: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      applyPatch(patch);
      const result = await request();
      if (!result.ok) setError(result.message);
    });
  }

  function saveField(task: TaskCardData, field: EditableTaskField, value: string) {
    const blank = value.trim() === "";
    const changes: Partial<TaskCardData> = {
      [field]: blank && field !== "title" ? null : value.trim(),
    };
    save({ id: task.id, changes }, () => updateTaskField(task.id, field, value));
  }

  function saveAssignees(task: TaskCardData, emails: string[]) {
    const names = new Map(members.map((m) => [m.email, m.name]));
    const assignees = emails.map((email) => ({ email, name: names.get(email) ?? email }));
    save({ id: task.id, changes: { assignees, assignee_emails: emails } }, () =>
      updateTaskAssignees(task.id, emails),
    );
  }

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current?.key !== key
        ? { key, dir: "asc" }
        : current.dir === "asc"
          ? { key, dir: "desc" }
          : null,
    );
  }

  const visible = sort ? sortTasksBy(rows, sort.key, sort.dir) : rows;

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[60rem] text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              {COLUMNS.map((column) => {
                const active = sort?.key === column.key;
                const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined
                    }
                    className="px-2 py-1.5 font-medium"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className={cn(
                        "flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground",
                        active && "text-foreground",
                      )}
                    >
                      {column.label}
                      <Icon className={cn("size-3", !active && "opacity-40")} aria-hidden />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y">
            {visible.map((task) => {
              const overdue = isOverdue(task, today);
              const done = task.status === "done";
              return (
                <tr key={task.id} className={cn("align-top", STATUS_ROW_CLASS[task.status])}>
                  <td className="w-60 max-w-60 px-2 py-1.5">
                    <div className="flex items-start gap-1">
                      <EditableText
                        label={`Título de «${task.title}»`}
                        value={task.title}
                        required
                        maxLength={200}
                        onSave={(value) => saveField(task, "title", value)}
                        className={cn("font-medium", done && "text-muted-foreground line-through")}
                      />
                      <Link
                        href={`/panel/tareas/${task.id}`}
                        aria-label={`Abrir «${task.title}»`}
                        title="Abrir la tarea"
                        className="mt-1 shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <Maximize2 className="size-3.5" />
                      </Link>
                    </div>
                  </td>
                  <td className="w-44 max-w-44 px-2 py-1.5">
                    <AssigneesCell
                      task={task}
                      members={members}
                      onChange={(emails) => saveAssignees(task, emails)}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      aria-label={`Estado de «${task.title}»`}
                      value={task.status}
                      onChange={(e) => saveField(task, "status", e.target.value)}
                      className={selectClass}
                    >
                      {TASK_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {TASK_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      aria-label={`Prioridad de «${task.title}»`}
                      value={task.priority ?? ""}
                      onChange={(e) => saveField(task, "priority", e.target.value)}
                      className={cn(
                        selectClass,
                        "rounded-full",
                        task.priority
                          ? cn("border", PRIORITY_CLASS[task.priority])
                          : "text-muted-foreground",
                      )}
                    >
                      <option value="">—</option>
                      {TASK_PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {TASK_PRIORITY_LABELS[priority]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="date"
                      aria-label={`Deadline de «${task.title}»`}
                      value={task.due_date ?? ""}
                      onChange={(e) => saveField(task, "due_date", e.target.value)}
                      className={cn(
                        selectClass,
                        "text-sm [color-scheme:light] dark:[color-scheme:dark]",
                        !task.due_date && "text-muted-foreground",
                        overdue && "font-medium text-destructive",
                      )}
                    />
                    {overdue && (
                      <span className="block px-1.5 text-xs text-destructive">Vencida</span>
                    )}
                  </td>
                  <td className="w-72 max-w-72 px-2 py-1.5">
                    <EditableText
                      label={`Descripción de «${task.title}»`}
                      value={task.description ?? ""}
                      multiline
                      placeholder="—"
                      onSave={(value) => saveField(task, "description", value)}
                      className="text-muted-foreground"
                      clamp
                    />
                  </td>
                  <td className="w-40 max-w-40 px-2 py-1.5">
                    <EditableText
                      label={`Enlace de «${task.title}»`}
                      value={task.link_url ?? ""}
                      type="url"
                      maxLength={TASK_LINK_MAX}
                      placeholder="—"
                      onSave={(value) => saveField(task, "link_url", value)}
                      display={
                        task.link_url ? (
                          <a
                            href={task.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={task.link_url}
                            className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                          >
                            Abrir
                            <ExternalLink className="size-3.5" aria-hidden />
                          </a>
                        ) : undefined
                      }
                      editIcon={<Pencil className="size-3" />}
                    />
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

// Assignee names; clicking opens a checklist of the team. Each tick saves.
function AssigneesCell({
  task,
  members,
  onChange,
}: {
  task: TaskCardData;
  members: MemberOption[];
  onChange: (emails: string[]) => void;
}) {
  const selected = task.assignees.map((a) => a.email);
  // Keep assignees who left the team visible so they can be unticked.
  const options = [
    ...members,
    ...task.assignees
      .filter((a) => !members.some((m) => m.email === a.email))
      .map((a) => ({ email: a.email, name: a.name })),
  ];

  function toggle(email: string) {
    onChange(
      selected.includes(email) ? selected.filter((e) => e !== email) : [...selected, email],
    );
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={`Responsables de «${task.title}»`}
        className="flex w-full items-start justify-between gap-1 rounded-md px-1.5 py-1 text-left hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className={cn(selected.length === 0 && "text-muted-foreground")}>
          {selected.length > 0
            ? task.assignees.map((a) => a.name).join(", ")
            : "Sin asignar"}
        </span>
        <ChevronDown className="mt-0.5 size-3.5 shrink-0 opacity-50" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={4} align="start" className="z-30">
          <Popover.Popup className="flex max-h-80 w-56 flex-col gap-0.5 overflow-y-auto rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-md outline-none">
            {options.map((member) => (
              <label
                key={member.email}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(member.email)}
                  onChange={() => toggle(member.email)}
                  className="size-3.5"
                />
                {member.name}
              </label>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
