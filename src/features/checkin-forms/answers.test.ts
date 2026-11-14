import { describe, expect, it } from "vitest";
import { buildAnswersSchema, readFormValues, toAttendeeColumns } from "./answers";
import { DEFAULT_CHECKIN_FIELDS, type FormField } from "./definition";

const fields: FormField[] = [
  ...DEFAULT_CHECKIN_FIELDS,
  { key: "degree", type: "text", label: "Titulación", required: true },
  { key: "work_email", type: "email", label: "Correo del trabajo", required: false },
  {
    key: "course",
    type: "select",
    label: "Curso",
    required: true,
    options: ["1º", "2º"],
  },
  { key: "newsletter", type: "checkbox", label: "Boletín", required: false },
];
const schema = buildAnswersSchema(fields);

const valid = {
  name: "  Ana Pérez  ",
  email: "  Ana.Perez@Example.COM ",
  photo_consent: "on",
  degree: " Informática ",
  course: "2º",
};

function issuePaths(input: Record<string, unknown>) {
  const result = schema.safeParse(input);
  expect(result.success).toBe(false);
  return result.error!.issues.map((issue) => issue.path.join("."));
}

describe("buildAnswersSchema", () => {
  it("parses valid answers, trimming and lowercasing emails", () => {
    const result = schema.safeParse({ ...valid, work_email: " Ana@Work.ES " });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: "Ana Pérez",
      email: "ana.perez@example.com",
      photo_consent: true,
      email_consent: false,
      degree: "Informática",
      work_email: "ana@work.es",
      course: "2º",
      newsletter: false,
    });
  });

  it("requires name (2-100), email and required text fields", () => {
    expect(issuePaths({ ...valid, name: " A " })).toContain("name");
    expect(issuePaths({ ...valid, name: undefined })).toContain("name");
    expect(issuePaths({ ...valid, email: "not-an-email" })).toContain("email");
    expect(issuePaths({ ...valid, email: "" })).toContain("email");
    expect(issuePaths({ ...valid, degree: "   " })).toContain("degree");
  });

  it("validates optional emails only when present", () => {
    expect(schema.safeParse({ ...valid, work_email: "" }).success).toBe(true);
    expect(issuePaths({ ...valid, work_email: "nope" })).toContain("work_email");
  });

  it("only accepts listed select options", () => {
    expect(issuePaths({ ...valid, course: "3º" })).toContain("course");
    expect(issuePaths({ ...valid, course: "" })).toContain("course");
  });

  it("maps checkbox values to booleans", () => {
    const result = schema.safeParse({ ...valid, newsletter: "on", photo_consent: "" });
    expect(result.data).toMatchObject({ newsletter: true, photo_consent: false });
  });

  it("drops unknown keys", () => {
    const result = schema.safeParse({ ...valid, is_admin: "true" });
    expect(result.data).not.toHaveProperty("is_admin");
  });
});

describe("readFormValues", () => {
  it("reads only defined keys, with checkboxes as on/empty", () => {
    const formData = new FormData();
    formData.set("name", "Ana");
    formData.set("newsletter", "on");
    formData.set("extra", "ignored");
    const values = readFormValues(fields, formData);
    expect(values).toMatchObject({ name: "Ana", newsletter: "on", photo_consent: "" });
    expect(values).not.toHaveProperty("extra");
  });
});

describe("toAttendeeColumns", () => {
  it("maps fixed keys to columns and the rest to answers", () => {
    const parsed = schema.parse({ ...valid, newsletter: "on" });
    expect(toAttendeeColumns(parsed)).toEqual({
      name: "Ana Pérez",
      email: "ana.perez@example.com",
      photo_consent: true,
      email_consent: false,
      answers: { degree: "Informática", course: "2º", newsletter: true },
    });
  });
});
