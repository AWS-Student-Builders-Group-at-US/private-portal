import { createSign } from "node:crypto";

// Minimal RS256 JWT for the Google OAuth 2.0 service account flow
// (https://developers.google.com/identity/protocols/oauth2/service-account).
// Signed locally with node:crypto to avoid pulling in google-auth-library.

export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const LIFETIME_SECONDS = 3600;

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");

export function createServiceAccountJwt(input: {
  clientEmail: string;
  privateKey: string;
  scope: string;
  nowSeconds: number;
}): string {
  const header = encode({ alg: "RS256", typ: "JWT" });
  const payload = encode({
    iss: input.clientEmail,
    scope: input.scope,
    aud: GOOGLE_TOKEN_URL,
    iat: input.nowSeconds,
    exp: input.nowSeconds + LIFETIME_SECONDS,
  });
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(input.privateKey).toString("base64url");
  return `${header}.${payload}.${signature}`;
}
