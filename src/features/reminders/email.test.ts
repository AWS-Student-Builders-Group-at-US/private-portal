import { describe, expect, it } from "vitest";
import { composeReminderEmail } from "./email";

const base = {
  name: "Ana",
  today: "2026-11-22",
  panelUrl: "https://example.com/panel",
};

describe("composeReminderEmail", () => {
  it("lists tasks due tomorrow and today, and free reminders with their note", () => {
    const email = composeReminderEmail({
      ...base,
      tasks: [
        { task_id: "t1", title: "Preparar charla", due_date: "2026-11-23" },
        { task_id: "t2", title: "Enviar factura", due_date: "2026-11-22" },
      ],
      reminders: [{ id: "r1", title: "Reservar aula", note: "Aula 2.1", remind_on: "2026-11-22" }],
    });
    expect(email.subject).toBe("Recordatorio: 2 tareas y 1 recordatorio");
    expect(email.text).toContain("Hola, Ana:");
    expect(email.text).toContain("- Preparar charla (vence mañana)");
    expect(email.text).toContain("- Enviar factura (vence hoy)");
    expect(email.text).toContain("- Reservar aula\n  Aula 2.1");
    expect(email.text).toContain("https://example.com/panel/tareas/t1");
    expect(email.html).toContain('href="https://example.com/panel/tareas/t1"');
  });

  it("uses singular wording for a single item", () => {
    const email = composeReminderEmail({
      ...base,
      tasks: [],
      reminders: [{ id: "r1", title: "Reservar aula", note: null, remind_on: "2026-11-22" }],
    });
    expect(email.subject).toBe("Recordatorio: Reservar aula");
    expect(email.text).not.toContain("Tareas");
  });

  it("escapes user text in the HTML part", () => {
    const email = composeReminderEmail({
      ...base,
      name: "<b>Ana</b>",
      tasks: [{ task_id: "t1", title: "<script>x</script>", due_date: "2026-11-23" }],
      reminders: [{ id: "r1", title: "a & b", note: "<img src=x>", remind_on: "2026-11-22" }],
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<img");
    expect(email.html).not.toContain("<b>Ana");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("a &amp; b");
  });

  it("strips line breaks from the subject", () => {
    const email = composeReminderEmail({
      ...base,
      tasks: [{ task_id: "t1", title: "Línea\r\nBcc: x@example.com", due_date: "2026-11-23" }],
      reminders: [],
    });
    expect(email.subject).not.toMatch(/[\r\n]/);
  });
});
