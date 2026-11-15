import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyZernioSignature } from "./signature";

const SECRET = "whsec-test-value";
const BODY = JSON.stringify({ id: "evt_1", event: "post.published", post: { _id: "abc" } });
const sign = (body: string, secret = SECRET) =>
  createHmac("sha256", secret).update(body, "utf8").digest("hex");

describe("verifyZernioSignature", () => {
  it("accepts the lowercase hex HMAC-SHA256 of the raw body", () => {
    expect(verifyZernioSignature(BODY, sign(BODY), SECRET)).toBe(true);
  });

  it("rejects a signature made with another secret", () => {
    expect(verifyZernioSignature(BODY, sign(BODY, "other-secret"), SECRET)).toBe(false);
  });

  it("rejects a signature of a modified body", () => {
    expect(verifyZernioSignature(`${BODY} `, sign(BODY), SECRET)).toBe(false);
  });

  it("rejects missing signatures and a missing secret", () => {
    expect(verifyZernioSignature(BODY, null, SECRET)).toBe(false);
    expect(verifyZernioSignature(BODY, "", SECRET)).toBe(false);
    expect(verifyZernioSignature(BODY, sign(BODY), undefined)).toBe(false);
    expect(verifyZernioSignature(BODY, sign(BODY, ""), "")).toBe(false);
  });

  it("rejects signatures of a different length without throwing", () => {
    expect(verifyZernioSignature(BODY, sign(BODY).slice(1), SECRET)).toBe(false);
    expect(verifyZernioSignature(BODY, `${sign(BODY)}00`, SECRET)).toBe(false);
  });

  it("rejects uppercase or prefixed signatures", () => {
    expect(verifyZernioSignature(BODY, sign(BODY).toUpperCase(), SECRET)).toBe(false);
    expect(verifyZernioSignature(BODY, `sha256=${sign(BODY)}`, SECRET)).toBe(false);
  });
});
