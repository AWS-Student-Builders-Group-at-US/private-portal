"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { moveTask } from "../actions";
import { groupByStatus } from "../filters";
import { TASK_STATUSES, TASK_STATUS_LABELS, type TaskStatus } from "../schema";
import type { TaskCardData } from "../types";
import { TaskMeta } from "./task-meta";

const fieldClass =
  "rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type Move = { id: string; status: TaskStatus };

// Three-column board. Cards move by dragging (pointer, touch or keyboard on
// the grip handle) or with the "Estado" select on each card.
export function TaskBoard({
  tasks,
  today,
}: {
  tasks: TaskCardData[];
  today: string;
}) {
  const [optimisticTasks, applyMove] = useOptimistic(
    tasks,
    (current: TaskCardData[], move: Move) =>
      current.map((task) =>
        task.id === move.id ? { ...task, status: move.status } : task,
      ),
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  function move(id: string, status: TaskStatus) {
    const task = optimisticTasks.find((t) => t.id === id);
    if (!task || task.status === status) return;
    setError(null);
    startTransition(async () => {
      applyMove({ id, status });
      const result = await moveTask(id, status);
      // On failure the optimistic state is dropped when the transition ends.
      if (!result.ok) setError(result.message);
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    move(String(active.id), over.id as TaskStatus);
  }

  const groups = groupByStatus(optimisticTasks);

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <DndContext
        sensors={sensors}
        onDragEnd={onDragEnd}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "Pulsa espacio o intro para coger la tarea, usa las flechas para moverla y pulsa espacio o intro de nuevo para soltarla. Escape cancela.",
          },
          announcements: {
            onDragStart: () => "Tarea cogida.",
            onDragOver: ({ over }) =>
              over
                ? `Sobre la columna ${TASK_STATUS_LABELS[over.id as TaskStatus]}.`
                : "Fuera de las columnas.",
            onDragEnd: ({ over }) =>
              over
                ? `Tarea movida a ${TASK_STATUS_LABELS[over.id as TaskStatus]}.`
                : "Tarea soltada fuera de las columnas.",
            onDragCancel: () => "Movimiento cancelado.",
          },
        }}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {TASK_STATUSES.map((status) => (
            <Column key={status} status={status} count={groups[status].length}>
              {groups[status].map((task) => (
                <TaskCard key={task.id} task={task} today={today} onMove={move} />
              ))}
            </Column>
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function Column({
  status,
  count,
  children,
}: {
  status: TaskStatus;
  count: number;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`column-${status}`}
      className={cn(
        "flex min-h-32 flex-col gap-2 rounded-lg border bg-muted/40 p-3 transition-colors",
        isOver && "border-ring bg-muted",
      )}
    >
      <h2 id={`column-${status}`} className="flex items-center justify-between text-sm font-semibold">
        {TASK_STATUS_LABELS[status]}
        <span className="text-xs font-normal text-muted-foreground">{count}</span>
      </h2>
      {count === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">Sin tareas</p>
      ) : (
        <ul className="flex flex-col gap-2">{children}</ul>
      )}
    </section>
  );
}

function TaskCard({
  task,
  today,
  onMove,
}: {
  task: TaskCardData;
  today: string;
  onMove: (id: string, status: TaskStatus) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });
  const selectId = `move-${task.id}`;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "flex gap-2 rounded-lg border bg-background p-3 shadow-xs",
        isDragging && "relative z-10 shadow-lg",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        aria-label={`Arrastrar «${task.title}»`}
        className="-ml-1 flex h-6 w-5 shrink-0 touch-none cursor-grab items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Link
          href={`/panel/tareas/${task.id}`}
          className="font-medium break-words hover:underline"
        >
          {task.title}
        </Link>
        <TaskMeta task={task} today={today} />
        <div className="flex items-center gap-2">
          <label htmlFor={selectId} className="text-xs text-muted-foreground">
            Estado
          </label>
          <select
            id={selectId}
            value={task.status}
            onChange={(e) => onMove(task.id, e.target.value as TaskStatus)}
            className={fieldClass}
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {TASK_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </li>
  );
}
