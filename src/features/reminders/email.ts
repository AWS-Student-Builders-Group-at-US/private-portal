import { escapeHtml } from "@/features/emails/compose";

// Body of the daily reminder email (pure). User text is escaped in the HTML
// part and line breaks are stripped from the subject.

type TaskItem = { task_id: string; title: string; due_date: string };
type ReminderItem = { id: string; title: string; note: string | null; remind_on: string };

const oneLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

function subjectFor(tasks: TaskItem[], reminders: ReminderItem[]) {
  if (tasks.length + reminders.length === 1) {
    return `Recordatorio: ${oneLine((tasks[0] ?? reminders[0]).title)}`;
  }
  const parts = [
    tasks.length > 0 && plural(tasks.length, "tarea", "tareas"),
    reminders.length > 0 && plural(reminders.length, "recordatorio", "recordatorios"),
  ].filter(Boolean);
  return `Recordatorio: ${parts.join(" y ")}`;
}

export function composeReminderEmail({
  name,
  tasks,
  reminders,
  today,
  panelUrl,
}: {
  name: string;
  tasks: TaskItem[];
  reminders: ReminderItem[];
  today: string;
  panelUrl: string;
}) {
  const when = (task: TaskItem) =>
    task.due_date === today ? "vence hoy" : "vence mañana";
  const taskUrl = (task: TaskItem) => `${panelUrl}/tareas/${task.task_id}`;
  const footer =
    "Recibes este aviso porque lo activaste en el portal del Core Team. " +
    `Puedes cambiarlo en ${panelUrl}.`;

  const text: string[] = [`Hola, ${oneLine(name)}:`, ""];
  if (tasks.length > 0) {
    text.push("Tareas:");
    for (const task of tasks) {
      text.push(`- ${oneLine(task.title)} (${when(task)})`, `  ${taskUrl(task)}`);
    }
    text.push("");
  }
  if (reminders.length > 0) {
    text.push("Recordatorios:");
    for (const reminder of reminders) {
      text.push(`- ${oneLine(reminder.title)}`);
      if (reminder.note) text.push(`  ${reminder.note.replace(/\r?\n/g, "\n  ")}`);
    }
    text.push("");
  }
  text.push("--", footer);

  const html: string[] = [
    `<!doctype html><html lang="es"><body style="font-family:sans-serif;line-height:1.5;color:#111">`,
    `<p>Hola, ${escapeHtml(oneLine(name))}:</p>`,
  ];
  if (tasks.length > 0) {
    html.push("<h3>Tareas</h3><ul>");
    for (const task of tasks) {
      html.push(
        `<li><a href="${escapeHtml(taskUrl(task))}">${escapeHtml(oneLine(task.title))}</a> ` +
          `(${escapeHtml(when(task))})</li>`,
      );
    }
    html.push("</ul>");
  }
  if (reminders.length > 0) {
    html.push("<h3>Recordatorios</h3><ul>");
    for (const reminder of reminders) {
      const note = reminder.note
        ? `<br><span style="color:#555">${escapeHtml(reminder.note).replace(/\r?\n/g, "<br>")}</span>`
        : "";
      html.push(`<li>${escapeHtml(oneLine(reminder.title))}${note}</li>`);
    }
    html.push("</ul>");
  }
  html.push(
    `<hr style="border:none;border-top:1px solid #ddd;margin:24px 0">`,
    `<p style="font-size:12px;color:#555">${escapeHtml(footer)}</p></body></html>`,
  );

  return { subject: subjectFor(tasks, reminders), text: text.join("\n"), html: html.join("") };
}
