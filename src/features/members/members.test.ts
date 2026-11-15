import { describe, expect, it } from "vitest";
import { canRemoveMember, memberErrorMessage } from "./logic";
import { MEMBER_AREAS, memberFormSchema, memberUpdateSchema } from "./schema";

describe("memberFormSchema", () => {
  it("normalises the email to lowercase and trims the name", () => {
    expect(
      memberFormSchema.parse({ email: "  Ana.Lopez@Example.COM ", name: "  Ana López ", area: "tecnico" }),
    ).toEqual({ email: "ana.lopez@example.com", name: "Ana López", area: "tecnico" });
  });

  it("rejects invalid emails", () => {
    for (const email of ["", "ana", "ana@", "@example.com", "ana @example.com"]) {
      expect(memberFormSchema.safeParse({ email, name: "Ana", area: "otra" }).success).toBe(false);
    }
  });

  it("requires a name of at most 80 characters", () => {
    const base = { email: "ana@example.com", area: "otra" };
    expect(memberFormSchema.safeParse({ ...base, name: "   " }).success).toBe(false);
    expect(memberFormSchema.safeParse({ ...base, name: "a".repeat(81) }).success).toBe(false);
    expect(memberFormSchema.safeParse({ ...base, name: "a".repeat(80) }).success).toBe(true);
  });

  it("accepts only the known areas", () => {
    expect(MEMBER_AREAS).toEqual(["organizacion", "tecnico", "comunicacion", "logistica", "otra"]);
    const base = { email: "ana@example.com", name: "Ana" };
    for (const area of MEMBER_AREAS) {
      expect(memberFormSchema.safeParse({ ...base, area }).success).toBe(true);
    }
    expect(memberFormSchema.safeParse({ ...base, area: "marketing" }).success).toBe(false);
    expect(memberFormSchema.safeParse({ ...base, area: "" }).success).toBe(false);
  });

  it("update schema shares the same rules", () => {
    expect(memberUpdateSchema.parse({ email: "ANA@example.com", name: "Ana", area: "logistica" }).email).toBe(
      "ana@example.com",
    );
    expect(memberUpdateSchema.safeParse({ email: "ana@example.com", name: "", area: "otra" }).success).toBe(false);
  });
});

describe("canRemoveMember", () => {
  it("allows removing another member when more than one remains", () => {
    expect(canRemoveMember({ me: "ana@example.com", target: "luis@example.com", memberCount: 2 })).toEqual({
      ok: true,
    });
  });

  it("refuses removing yourself, case-insensitively", () => {
    expect(canRemoveMember({ me: "ana@example.com", target: "ANA@example.com", memberCount: 5 })).toEqual({
      ok: false,
      reason: "self",
    });
  });

  it("refuses removing the last member", () => {
    expect(canRemoveMember({ me: "ana@example.com", target: "luis@example.com", memberCount: 1 })).toEqual({
      ok: false,
      reason: "last",
    });
  });
});

describe("memberErrorMessage", () => {
  it("maps database error codes to Spanish messages", () => {
    expect(memberErrorMessage("member_exists")).toMatch(/ya tiene acceso/);
    expect(memberErrorMessage("cannot_remove_self")).toMatch(/ti mismo|tu propia/);
    expect(memberErrorMessage("last_member")).toMatch(/último/);
    expect(memberErrorMessage("member_not_found")).toMatch(/no existe|no encontr/i);
  });

  it("explains the common account rules", () => {
    expect(memberErrorMessage("not_common_account")).toBe(
      "Solo la cuenta común del grupo puede gestionar miembros.",
    );
    expect(memberErrorMessage("cannot_remove_common_account")).toMatch(/cuenta común/);
  });

  it("falls back to a generic message", () => {
    expect(memberErrorMessage("something else")).toBe("No se pudo completar la operación.");
    expect(memberErrorMessage(undefined)).toBe("No se pudo completar la operación.");
  });
});
