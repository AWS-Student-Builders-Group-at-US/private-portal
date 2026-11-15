import { describe, expect, it } from "vitest";
import { vaultItemFormSchema, vaultPayloadSchema } from "./schema";

describe("vaultItemFormSchema", () => {
  it("accepts a label alone and fills optional fields", () => {
    const result = vaultItemFormSchema.parse({ label: "  Cuenta de Google  " });
    expect(result).toEqual({
      label: "Cuenta de Google",
      category: null,
      payload: { username: "", password: "", url: "", notes: "", fields: [] },
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
      fields: [],
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
      fields: [],
    });
  });

  it("rejects non-string fields", () => {
    expect(vaultPayloadSchema.safeParse({ password: 1 }).success).toBe(false);
  });
});

describe("custom fields", () => {
  const field = (overrides: Record<string, unknown> = {}) => ({
    name: "Client ID",
    value: "123.apps.googleusercontent.com",
    secret: false,
    ...overrides,
  });

  it("parses payloads saved before custom fields existed", () => {
    const legacy = { username: "u", password: "p", url: "", notes: "" };
    expect(vaultPayloadSchema.parse(legacy).fields).toEqual([]);
  });

  it("keeps the secret flag and defaults it to false", () => {
    const parsed = vaultPayloadSchema.parse({
      fields: [field({ name: "Client secret", value: "s", secret: true }), { name: "Proyecto", value: "x" }],
    });
    expect(parsed.fields).toEqual([
      { name: "Client secret", value: "s", secret: true },
      { name: "Proyecto", value: "x", secret: false },
    ]);
  });

  it("enforces name, value and count limits", () => {
    const ok = (fields: unknown[]) => vaultPayloadSchema.safeParse({ fields }).success;
    expect(ok([field({ name: "" })])).toBe(false);
    expect(ok([field({ name: "n".repeat(61) })])).toBe(false);
    expect(ok([field({ name: "n".repeat(60) })])).toBe(true);
    expect(ok([field({ value: "v".repeat(5001) })])).toBe(false);
    expect(ok([field({ value: "v".repeat(5000) })])).toBe(true);
    expect(ok(Array.from({ length: 20 }, () => field()))).toBe(true);
    expect(ok(Array.from({ length: 21 }, () => field()))).toBe(false);
    expect(ok([field({ secret: "yes" })])).toBe(false);
  });

  it("form schema trims names, keeps values verbatim and reports Spanish errors", () => {
    const result = vaultItemFormSchema.parse({
      label: "Google OAuth",
      fields: [field({ name: "  Client secret ", value: " s3cret ", secret: true })],
    });
    expect(result.payload.fields).toEqual([{ name: "Client secret", value: " s3cret ", secret: true }]);

    const empty = vaultItemFormSchema.safeParse({ label: "x", fields: [field({ name: "   " })] });
    expect(empty.success).toBe(false);
    expect(empty.error?.issues[0]?.message).toMatch(/campo/i);

    const tooMany = vaultItemFormSchema.safeParse({
      label: "x",
      fields: Array.from({ length: 21 }, () => field()),
    });
    expect(tooMany.success).toBe(false);
  });
});
