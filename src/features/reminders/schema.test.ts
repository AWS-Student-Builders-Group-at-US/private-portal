import { describe, expect, it } from "vitest";
import { reminderFormSchema } from "./schema";

const TODAY = "2026-11-22";

describe("reminderFormSchema", () => {
  it("accepts a reminder for today or later and trims fields", () => {
    expect(
      reminderFormSchema(TODAY).parse({ title: "  Reservar aula ", remind_on: TODAY, note: " " }),
    ).toEqual({ title: "Reservar aula", remind_on: TODAY, note: null });
    expect(
      reminderFormSchema(TODAY).parse({ title: "X", remind_on: "2026-12-01", note: "Aula 2.1" }),
    ).toEqual({ title: "X", remind_on: "2026-12-01", note: "Aula 2.1" });
  });

  it("rejects a missing title, a past or invalid date and a long note", () => {
    const schema = reminderFormSchema(TODAY);
    expect(schema.safeParse({ title: " ", remind_on: TODAY }).success).toBe(false);
    expect(schema.safeParse({ title: "X", remind_on: "2026-11-21" }).success).toBe(false);
    expect(schema.safeParse({ title: "X", remind_on: "2026-02-30" }).success).toBe(false);
    expect(schema.safeParse({ title: "X", remind_on: TODAY, note: "a".repeat(2001) }).success).toBe(
      false,
    );
  });
});
