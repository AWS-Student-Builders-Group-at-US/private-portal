import { describe, expect, it } from "vitest";
import { vaultItemFormSchema, vaultPayloadSchema } from "./schema";

describe("vaultItemFormSchema", () => {
  it("accepts a label alone and fills optional fields", () => {
    const result = vaultItemFormSchema.parse({ label: "  Cuenta de Google  " });
    expect(result).toEqual({
      label: "Cuenta de Google",
      category: null,
      payload: { username: "", password: "", url: "", notes: "" },
    });
  });

  it("splits plaintext metadata from the encrypted payload", () => {
    const result = vaultItemFormSchema.parse({
      label: "Base de datos",
      category: " Infra ",
      username: "admin",
      password: "s3cret",
      url: "https://example.com",
      notes: "Rotar cada trimestre.",
    });
    expect(result.category).toBe("Infra");
    expect(result.payload).toEqual({
      username: "admin",
      password: "s3cret",
      url: "https://example.com",
      notes: "Rotar cada trimestre.",
    });
  });

  it("enforces the label length", () => {
    expect(vaultItemFormSchema.safeParse({ label: "   " }).success).toBe(false);
    expect(vaultItemFormSchema.safeParse({ label: "a".repeat(121) }).success).toBe(false);
    expect(vaultItemFormSchema.safeParse({ label: "a".repeat(120) }).success).toBe(true);
  });

  it("only accepts http(s) URLs", () => {
    expect(
      vaultItemFormSchema.safeParse({ label: "x", url: "javascript:alert(1)" }).success,
    ).toBe(false);
  });
});

describe("vaultPayloadSchema", () => {
  it("defaults missing fields of a decrypted payload", () => {
    expect(vaultPayloadSchema.parse({ password: "p" })).toEqual({
      username: "",
      password: "p",
      url: "",
      notes: "",
    });
  });

  it("rejects non-string fields", () => {
    expect(vaultPayloadSchema.safeParse({ password: 1 }).success).toBe(false);
  });
});
