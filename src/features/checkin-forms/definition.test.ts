import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHECKIN_FIELDS,
  MAX_FIELDS,
  checkinFormContentSchema,
  formFieldsSchema,
  latestFieldLabels,
  type FormField,
} from "./definition";

const extra = (overrides: Partial<FormField> = {}): FormField => ({
  key: "degree",
  type: "text",
  label: "Titulación",
  required: false,
  ...overrides,
});

function messages(fields: unknown) {
  const result = formFieldsSchema.safeParse(fields);
  expect(result.success).toBe(false);
  return result.error!.issues.map((issue) => issue.message).join(" | ");
}

describe("formFieldsSchema", () => {
  it("accepts the default form", () => {
    const result = formFieldsSchema.safeParse(DEFAULT_CHECKIN_FIELDS);
    expect(result.success).toBe(true);
    expect(result.data!.map((field) => field.key)).toEqual([
      "name",
      "email",
      "photo_consent",
      "email_consent",
    ]);
  });

  it("accepts extra fields of every type and strips options from non-select", () => {
    const result = formFieldsSchema.safeParse([
      ...DEFAULT_CHECKIN_FIELDS,
      extra({ options: ["x"] }),
      extra({ key: "course", type: "select", options: ["1º", "2º"], required: true }),
      extra({ key: "work_email", type: "email" }),
      extra({ key: "news", type: "checkbox", label: "Acepto el boletín" }),
    ]);
    expect(result.success).toBe(true);
    expect(result.data![4]).not.toHaveProperty("options");
    expect(result.data![5].options).toEqual(["1º", "2º"]);
  });

  it("rejects a missing fixed key", () => {
    const fields = DEFAULT_CHECKIN_FIELDS.filter((field) => field.key !== "email");
    expect(messages(fields)).toMatch(/email/);
  });

  it("rejects a retyped or re-required fixed key", () => {
    const retyped = DEFAULT_CHECKIN_FIELDS.map((field) =>
      field.key === "email" ? { ...field, type: "text" } : field,
    );
    expect(messages(retyped)).toMatch(/email/);
    const optionalName = DEFAULT_CHECKIN_FIELDS.map((field) =>
      field.key === "name" ? { ...field, required: false } : field,
    );
    expect(messages(optionalName)).toMatch(/name/);
  });

  it("rejects duplicate keys", () => {
    expect(messages([...DEFAULT_CHECKIN_FIELDS, extra(), extra()])).toMatch(
      /degree/,
    );
  });

  it("rejects keys that are not slugs", () => {
    for (const key of ["Degree", "1st", "a", "with-dash", "x".repeat(41)]) {
      expect(formFieldsSchema.safeParse([...DEFAULT_CHECKIN_FIELDS, extra({ key })]).success).toBe(false);
    }
  });

  it("requires 1-20 non-empty unique options for select", () => {
    expect(messages([...DEFAULT_CHECKIN_FIELDS, extra({ type: "select" })])).toBeTruthy();
    expect(
      messages([...DEFAULT_CHECKIN_FIELDS, extra({ type: "select", options: [] })]),
    ).toBeTruthy();
    expect(
      messages([...DEFAULT_CHECKIN_FIELDS, extra({ type: "select", options: ["a", "a"] })]),
    ).toBeTruthy();
    expect(
      messages([...DEFAULT_CHECKIN_FIELDS, extra({ type: "select", options: ["  "] })]),
    ).toBeTruthy();
  });

  it("rejects a required checkbox", () => {
    expect(
      messages([...DEFAULT_CHECKIN_FIELDS, extra({ type: "checkbox", required: true })]),
    ).toBeTruthy();
  });

  it(`rejects more than ${MAX_FIELDS} fields`, () => {
    const extras = Array.from({ length: MAX_FIELDS - 3 }, (_, i) =>
      extra({ key: `field_${i}` }),
    );
    expect(messages([...DEFAULT_CHECKIN_FIELDS, ...extras])).toBeTruthy();
    expect(
      formFieldsSchema.safeParse([...DEFAULT_CHECKIN_FIELDS, ...extras.slice(1)]).success,
    ).toBe(true);
  });

  it("rejects labels outside 1-200 characters", () => {
    expect(messages([...DEFAULT_CHECKIN_FIELDS, extra({ label: " " })])).toBeTruthy();
    expect(
      messages([...DEFAULT_CHECKIN_FIELDS, extra({ label: "x".repeat(201) })]),
    ).toBeTruthy();
  });
});

describe("checkinFormContentSchema", () => {
  const content = {
    title: "Registro",
    intro: "",
    fields: DEFAULT_CHECKIN_FIELDS,
    privacy_notice: "## Responsable\n\nTexto",
  };

  it("accepts valid content", () => {
    expect(checkinFormContentSchema.safeParse(content).success).toBe(true);
  });

  it("enforces title, intro and notice lengths", () => {
    for (const bad of [
      { title: "" },
      { title: "x".repeat(121) },
      { intro: "x".repeat(1001) },
      { privacy_notice: "" },
      { privacy_notice: "x".repeat(20001) },
    ]) {
      expect(checkinFormContentSchema.safeParse({ ...content, ...bad }).success).toBe(false);
    }
  });
});

describe("latestFieldLabels", () => {
  it("labels extra keys with the latest version that defines them", () => {
    const labels = latestFieldLabels([
      { version: 3, fields: [...DEFAULT_CHECKIN_FIELDS, extra({ label: "Grado" })] },
      {
        version: 1,
        fields: [...DEFAULT_CHECKIN_FIELDS, extra(), extra({ key: "old", label: "Antiguo" })],
      },
    ]);
    expect(labels).toEqual({ degree: "Grado", old: "Antiguo" });
  });
});
