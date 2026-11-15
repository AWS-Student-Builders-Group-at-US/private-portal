import { z } from "zod";

// Pure configuration parsing for the Drive integration (no I/O). The values
// come from server-only env vars; the folder id may also come from
// `app_settings.drive_folder_id` (see ./settings.ts).

export class DriveConfigError extends Error {
  override name = "DriveConfigError";
}

export type ServiceAccountKey = { clientEmail: string; privateKey: string };
export type DriveConfig = { folderId: string; key: ServiceAccountKey };

type Env = Record<string, string | undefined>;

// Drive file/folder ids: URL-safe base64 alphabet. Also enforced by the
// `set_app_setting` SQL function. Validating it keeps ids safe to embed in
// the Drive `q` query string.
const DRIVE_ID = /^[A-Za-z0-9_-]{10,100}$/;

export function isDriveId(value: string): boolean {
  return DRIVE_ID.test(value);
}

const keySchema = z.object({
  client_email: z.string().min(1),
  private_key: z.string().min(1),
});

/** Decodes `GOOGLE_SERVICE_ACCOUNT_KEY` (the JSON key, base64-encoded). */
export function parseServiceAccountKey(base64: string): ServiceAccountKey {
  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(base64.replace(/\s+/g, ""), "base64").toString("utf8"));
  } catch {
    throw new DriveConfigError(
      "GOOGLE_SERVICE_ACCOUNT_KEY must be the service account JSON key encoded in base64.",
    );
  }
  const parsed = keySchema.safeParse(json);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new DriveConfigError(
      `GOOGLE_SERVICE_ACCOUNT_KEY is missing or has invalid fields: ${missing}.`,
    );
  }
  return {
    clientEmail: parsed.data.client_email,
    // Some tools store the PEM with literal "\n" sequences.
    privateKey: parsed.data.private_key.replace(/\\n/g, "\n"),
  };
}

/** Reads the service account key from the environment. */
export function readServiceAccountKey(env: Env): ServiceAccountKey {
  const value = env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim();
  if (!value) throw new DriveConfigError("Missing environment variables: GOOGLE_SERVICE_ACCOUNT_KEY.");
  return parseServiceAccountKey(value);
}

/** Reads both variables from the environment (env-only configuration). */
export function readDriveConfig(env: Env): DriveConfig {
  const folderId = env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  const missing = [
    !folderId && "GOOGLE_DRIVE_FOLDER_ID",
    !env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim() && "GOOGLE_SERVICE_ACCOUNT_KEY",
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new DriveConfigError(`Missing environment variables: ${missing.join(", ")}.`);
  }
  if (!isDriveId(folderId!)) {
    throw new DriveConfigError("GOOGLE_DRIVE_FOLDER_ID is not a valid Drive folder id.");
  }
  return { folderId: folderId!, key: readServiceAccountKey(env) };
}
