import { describe, expect, it } from "vitest";
import { entryFormSchema } from "./schema";

const base = {
  title: " Dentista ",
  date: "2026-11-16",
  start_time: "10:00",
  end_time: "11:30",
  notes: "",
  visibility: "details",
};

describe("entryFormSchema", () => {
  it("turns Madrid date and times into UTC instants", () => {
    const parsed = entryFormSchema.parse(base);
    expect(parsed).toEqual({
      title: "Dentista",
      notes: null,
      starts_at: "2026-11-16T09:00:00.000Z",
      ends_at: "2026-11-16T10:30:00.000Z",
      visibility: "details",
      is_group_meeting: false,
    });
  });

  it("forces 'details' on group meetings", () => {
    const parsed = entryFormSchema.parse({ ...base, visibility: "busy", is_group_meeting: "on" });
    expect(parsed.is_group_meeting).toBe(true);
    expect(parsed.visibility).toBe("details");
  });

  it("keeps busy-only visibility and notes", () => {
    const parsed = entryFormSchema.parse({ ...base, visibility: "busy", notes: " Privado " });
    expect(parsed.visibility).toBe("busy");
    expect(parsed.notes).toBe("Privado");
  });

  it("rejects an end before the start, bad dates and empty titles", () => {
    expect(entryFormSchema.safeParse({ ...base, end_time: "09:00" }).success).toBe(false);
    expect(entryFormSchema.safeParse({ ...base, date: "2026-02-30" }).success).toBe(false);
    expect(entryFormSchema.safeParse({ ...base, start_time: "25:00" }).success).toBe(false);
    expect(entryFormSchema.safeParse({ ...base, title: "  " }).success).toBe(false);
    expect(entryFormSchema.safeParse({ ...base, visibility: "public" }).success).toBe(false);
  });
});
