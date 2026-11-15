import type { DriveErrorCode } from "./types";

const API_DISABLED_REASONS = new Set(["accessNotConfigured", "SERVICE_DISABLED"]);

/**
 * Turns a failed Drive v3 response into an error code. A 403 can mean either
 * "the folder is not shared with the service account" or "the Drive API is not
 * enabled in the Google Cloud project"; Google tells them apart in the body.
 */
export function classifyDriveFailure(
  status: number,
  bodyText: string,
): { code: DriveErrorCode; reason: string | null } {
  const reasons = extractReasons(bodyText);
  const disabled = reasons.find((reason) => API_DISABLED_REASONS.has(reason));
  if (status === 403 && disabled) return { code: "api_disabled", reason: disabled };
  const reason = reasons[0] ?? null;
  if (status === 401 || status === 403) return { code: "permission", reason };
  if (status === 404) return { code: "not_found", reason };
  return { code: "unknown", reason };
}

function extractReasons(bodyText: string): string[] {
  try {
    const parsed = JSON.parse(bodyText) as {
      error?: { errors?: { reason?: unknown }[]; details?: { reason?: unknown }[] };
    };
    const items = [...(parsed.error?.errors ?? []), ...(parsed.error?.details ?? [])];
    return items.map((item) => item.reason).filter((r): r is string => typeof r === "string");
  } catch {
    return [];
  }
}
