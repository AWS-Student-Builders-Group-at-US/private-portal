import { describe, expect, it } from "vitest";
import { DriveConfigError, isDriveId, parseServiceAccountKey, readDriveConfig } from "./config";

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64");
const KEY = {
  type: "service_account",
  client_email: "reader@example-project.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
};

describe("parseServiceAccountKey", () => {
  it("decodes a base64 JSON key", () => {
    expect(parseServiceAccountKey(encode(KEY))).toEqual({
      clientEmail: KEY.client_email,
      privateKey: KEY.private_key,
    });
  });

  it("tolerates surrounding whitespace and line breaks in the base64 value", () => {
    const wrapped = encode(KEY).replace(/(.{40})/g, "$1\n");
    expect(parseServiceAccountKey(`  ${wrapped}\n`).clientEmail).toBe(KEY.client_email);
  });

  it("restores escaped newlines in the private key", () => {
    const key = { ...KEY, private_key: KEY.private_key.replace(/\n/g, "\\n") };
    expect(parseServiceAccountKey(encode(key)).privateKey).toBe(KEY.private_key);
  });

  it("rejects values that are not base64 JSON", () => {
    expect(() => parseServiceAccountKey("not json")).toThrow(DriveConfigError);
    expect(() => parseServiceAccountKey("not json")).toThrow(/base64/);
  });

  it("names the missing fields", () => {
    expect(() => parseServiceAccountKey(encode({ client_email: KEY.client_email }))).toThrow(
      /private_key/,
    );
    expect(() => parseServiceAccountKey(encode({ private_key: KEY.private_key }))).toThrow(
      /client_email/,
    );
  });
});

describe("isDriveId", () => {
  it("accepts Drive-shaped ids", () => {
    expect(isDriveId("1AbC_d-EfGhIjKlMnOpQrStUv")).toBe(true);
  });

  it("rejects ids that could break the query string", () => {
    expect(isDriveId("abc' or '1'='1")).toBe(false);
    expect(isDriveId("short")).toBe(false);
    expect(isDriveId("")).toBe(false);
  });
});

describe("readDriveConfig", () => {
  const folderId = "1AbC_d-EfGhIjKlMnOpQrStUv";

  it("returns the folder id and the parsed key", () => {
    const config = readDriveConfig({
      GOOGLE_DRIVE_FOLDER_ID: folderId,
      GOOGLE_SERVICE_ACCOUNT_KEY: encode(KEY),
    });
    expect(config.folderId).toBe(folderId);
    expect(config.key.clientEmail).toBe(KEY.client_email);
  });

  it("reports which variables are missing", () => {
    expect(() => readDriveConfig({})).toThrow(/GOOGLE_DRIVE_FOLDER_ID.*GOOGLE_SERVICE_ACCOUNT_KEY/);
    expect(() => readDriveConfig({ GOOGLE_DRIVE_FOLDER_ID: folderId })).toThrow(
      /GOOGLE_SERVICE_ACCOUNT_KEY/,
    );
  });

  it("rejects a malformed folder id", () => {
    expect(() =>
      readDriveConfig({ GOOGLE_DRIVE_FOLDER_ID: "bad id", GOOGLE_SERVICE_ACCOUNT_KEY: encode(KEY) }),
    ).toThrow(DriveConfigError);
  });
});
