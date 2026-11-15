import { describe, expect, it } from "vitest";
import {
  resolveCheckinFormVersion,
  selectableForms,
  summarizeForms,
  type FormRef,
} from "./resolve";

const forms: FormRef[] = [
  { id: "general", name: "General", is_default: true, archived_at: null },
  { id: "talk", name: "Charla", is_default: false, archived_at: null },
  { id: "old", name: "Antiguo", is_default: false, archived_at: "2026-11-01T00:00:00Z" },
  { id: "empty", name: "Vacío", is_default: false, archived_at: null },
];

const versions = [
  { id: "g1", form_id: "general", version: 1 },
  { id: "g3", form_id: "general", version: 3 },
  { id: "t2", form_id: "talk", version: 2 },
  { id: "t5", form_id: "talk", version: 5 },
  { id: "o4", form_id: "old", version: 4 },
];

describe("resolveCheckinFormVersion", () => {
  it("uses the latest version of the event's form", () => {
    expect(resolveCheckinFormVersion("talk", forms, versions)?.id).toBe("t5");
  });

  it("uses the default form when the event has no form", () => {
    expect(resolveCheckinFormVersion(null, forms, versions)?.id).toBe("g3");
  });

  it("keeps serving an archived form already chosen by the event", () => {
    expect(resolveCheckinFormVersion("old", forms, versions)?.id).toBe("o4");
  });

  it("falls back to the default form when the event's form has no versions", () => {
    expect(resolveCheckinFormVersion("empty", forms, versions)?.id).toBe("g3");
  });

  it("falls back to the default form when the event's form is unknown", () => {
    expect(resolveCheckinFormVersion("missing", forms, versions)?.id).toBe("g3");
  });

  it("returns null without a default form version", () => {
    expect(resolveCheckinFormVersion(null, forms.slice(1), versions)).toBeNull();
    expect(resolveCheckinFormVersion(null, forms, [])).toBeNull();
  });
});

describe("summarizeForms", () => {
  it("adds the latest version and version count, default first then by name", () => {
    const summary = summarizeForms(forms, versions);
    expect(summary.map((form) => form.id)).toEqual(["general", "old", "talk", "empty"]);
    expect(summary.find((form) => form.id === "talk")).toMatchObject({
      latest_version: 5,
      latest_version_id: "t5",
      version_count: 2,
    });
    expect(summary.find((form) => form.id === "empty")).toMatchObject({
      latest_version: null,
      latest_version_id: null,
      version_count: 0,
    });
  });
});

describe("selectableForms", () => {
  const summary = summarizeForms(forms, versions);

  it("offers active forms with at least one version", () => {
    expect(selectableForms(summary, null).map((form) => form.id)).toEqual([
      "general",
      "talk",
    ]);
  });

  it("keeps the event's current form even if it is archived", () => {
    expect(selectableForms(summary, "old").map((form) => form.id)).toEqual([
      "general",
      "old",
      "talk",
    ]);
  });
});
