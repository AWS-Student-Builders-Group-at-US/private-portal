import { describe, expect, it } from "vitest";
import { parsePrivacyQuery } from "./privacy-query";

const FORM_ID = "6f1c1d2e-3b4a-4c5d-8e9f-0a1b2c3d4e5f";

describe("parsePrivacyQuery", () => {
  it("defaults to the default form's latest version", () => {
    expect(parsePrivacyQuery({})).toEqual({ ok: true, version: null, formId: null });
  });

  it("reads a version number", () => {
    expect(parsePrivacyQuery({ v: "12" })).toEqual({ ok: true, version: 12, formId: null });
  });

  it("reads a form id, lowercased", () => {
    expect(parsePrivacyQuery({ f: FORM_ID.toUpperCase() })).toEqual({
      ok: true,
      version: null,
      formId: FORM_ID,
    });
  });

  it("reads both", () => {
    expect(parsePrivacyQuery({ f: FORM_ID, v: "3" })).toEqual({
      ok: true,
      version: 3,
      formId: FORM_ID,
    });
  });

  it("rejects malformed values", () => {
    expect(parsePrivacyQuery({ v: "0" }).ok).toBe(false);
    expect(parsePrivacyQuery({ v: "abc" }).ok).toBe(false);
    expect(parsePrivacyQuery({ v: "1234567890" }).ok).toBe(false);
    expect(parsePrivacyQuery({ v: ["1", "2"] }).ok).toBe(false);
    expect(parsePrivacyQuery({ f: "not-a-uuid" }).ok).toBe(false);
    expect(parsePrivacyQuery({ f: [FORM_ID] }).ok).toBe(false);
  });
});
