import { createPublicKey, generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createServiceAccountJwt } from "./jwt";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

const decode = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));

describe("createServiceAccountJwt", () => {
  const jwt = createServiceAccountJwt({
    clientEmail: "reader@example-project.iam.gserviceaccount.com",
    privateKey: pem,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    nowSeconds: 1_700_000_000,
  });
  const [header, payload, signature] = jwt.split(".");

  it("builds an RS256 header", () => {
    expect(decode(header)).toEqual({ alg: "RS256", typ: "JWT" });
  });

  it("sets the service account claims with a one-hour lifetime", () => {
    expect(decode(payload)).toEqual({
      iss: "reader@example-project.iam.gserviceaccount.com",
      scope: "https://www.googleapis.com/auth/drive.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: 1_700_000_000,
      exp: 1_700_003_600,
    });
  });

  it("produces a signature that verifies with the public key", () => {
    const ok = verify(
      "RSA-SHA256",
      Buffer.from(`${header}.${payload}`),
      createPublicKey(privateKey),
      Buffer.from(signature, "base64url"),
    );
    expect(ok).toBe(true);
  });

  it("throws on an invalid private key", () => {
    expect(() =>
      createServiceAccountJwt({ clientEmail: "a@b.c", privateKey: "nope", scope: "s", nowSeconds: 0 }),
    ).toThrow();
  });
});
