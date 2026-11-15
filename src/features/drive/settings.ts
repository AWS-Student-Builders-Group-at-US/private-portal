import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isDriveId, readServiceAccountKey } from "./config";

export type FolderSource = "settings" | "env";

/**
 * The Drive folder shown in /panel/recursos: `app_settings.drive_folder_id`
 * (set from Ajustes) first, then env GOOGLE_DRIVE_FOLDER_ID. Read with the
 * member's session (RLS). Request-time: call it outside any cache scope.
 */
export async function getDriveFolderId(): Promise<{ folderId: string | null; source: FolderSource | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "drive_folder_id")
    .maybeSingle();
  // An error (e.g. table not migrated yet) falls back to env.
  if (!error && typeof data?.value === "string" && isDriveId(data.value)) {
    return { folderId: data.value, source: "settings" };
  }
  const fromEnv = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  if (fromEnv && isDriveId(fromEnv)) return { folderId: fromEnv, source: "env" };
  return { folderId: null, source: null };
}

/** The service account email (shown to members so they can share the folder), or null. */
export function getServiceAccountEmail(): string | null {
  try {
    return readServiceAccountKey(process.env).clientEmail;
  } catch {
    return null;
  }
}
