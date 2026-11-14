import { describe, expect, it } from "vitest";
import { checkinFormSchema } from "./schema";

const valid = {
  name: "  Ana Pérez  ",
  email: "  Ana.Perez@Example.COM ",
  photo_consent: "on",
  email_consent: "on",
};

function issuePaths(input: Record<string, unknown>) {
  const result = checkinFormSchema.safeParse(input);
  expect(result.success).toBe(false);
  return result.error!.issues.map((issue) => issue.path.join("."));
}

describe("checkinFormSchema", () => {
  it("parses a valid check-in, trimming and lowercasing the email", () => {
    const result = checkinFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: "Ana Pérez",
      email: "ana.perez@example.com",
      photo_consent: true,
      email_consent: true,
    });
  });

  it("requires a name of 2 to 100 characters", () => {
    expect(issuePaths({ ...valid, name: undefined })).toContain("name");
    expect(issuePaths({ ...valid, name: "  A  " })).toContain("name");
    expect(issuePaths({ ...valid, name: "x".repeat(101) })).toContain("name");
  });

  it("rejects an invalid email", () => {
    expect(issuePaths({ ...valid, email: "not-an-email" })).toContain("email");
    expect(issuePaths({ ...valid, email: "" })).toContain("email");
  });

  it("defaults both consents to false when the checkboxes are absent", () => {
    const result = checkinFormSchema.safeParse({
      name: "Ana",
      email: "ana@example.com",
    });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      photo_consent: false,
      email_consent: false,
    });
  });

  it("maps checkbox values to booleans independently", () => {
    const result = checkinFormSchema.safeParse({
      name: "Ana",
      email: "ana@example.com",
      photo_consent: "on",
      email_consent: "off",
    });
    expect(result.data).toMatchObject({
      photo_consent: true,
      email_consent: false,
    });
  });
});
