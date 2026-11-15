import "server-only";
import type { FolderNode } from "./ancestry";
import { DriveConfigError, isDriveId, readServiceAccountKey, type ServiceAccountKey } from "./config";
import { createServiceAccountJwt, GOOGLE_TOKEN_URL } from "./jwt";
import { FOLDER_MIME, toDriveItem } from "./mapping";
import type { DriveErrorCode, DriveFile, DriveListing } from "./types";

// Server-only Drive v3 REST client authenticated as the service account.
// The key never leaves the server.

const SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const API = "https://www.googleapis.com/drive/v3/files";
const TIMEOUT_MS = 8000;
const PAGE_SIZE = 200;
const MAX_ITEMS = 1000;
const LIST_FIELDS = "nextPageToken,files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink)";

export class DriveError extends Error {
  override name = "DriveError";
  constructor(readonly code: DriveErrorCode, message: string) {
    super(message);
  }
}

export function toDriveErrorCode(error: unknown): DriveErrorCode {
  if (error instanceof DriveConfigError) return "config";
  if (error instanceof DriveError) return error.code;
  return "unknown";
}

let cachedToken: { value: string; expiresAt: number; email: string } | null = null;

async function getAccessToken(key: ServiceAccountKey): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.email === key.clientEmail && cachedToken.expiresAt - 60_000 > now) {
    return cachedToken.value;
  }
  let assertion: string;
  try {
    assertion = createServiceAccountJwt({
      clientEmail: key.clientEmail,
      privateKey: key.privateKey,
      scope: SCOPE,
      nowSeconds: Math.floor(now / 1000),
    });
  } catch {
    throw new DriveConfigError("GOOGLE_SERVICE_ACCOUNT_KEY has an invalid private_key.");
  }
  const response = await request(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    // 400/401 here means a revoked or wrong key, not a sharing problem.
    throw new DriveConfigError(`Google rejected the service account key (${response.status}).`);
  }
  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new DriveError("unknown", "Token response without access_token.");
  cachedToken = {
    value: body.access_token,
    expiresAt: now + (body.expires_in ?? 3600) * 1000,
    email: key.clientEmail,
  };
  return body.access_token;
}

async function request(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new DriveError("timeout", "Google Drive did not answer in time.");
    }
    throw new DriveError("unknown", "Network error while calling Google Drive.");
  }
}

async function driveGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = readServiceAccountKey(process.env);
  const token = await getAccessToken(key);
  const query = new URLSearchParams({
    ...params,
    supportsAllDrives: "true",
  });
  const response = await request(`${API}${path}?${query}`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
  if (response.status === 401 || response.status === 403) {
    throw new DriveError("permission", `Drive answered ${response.status}.`);
  }
  if (response.status === 404) throw new DriveError("not_found", "Drive answered 404.");
  if (!response.ok) throw new DriveError("unknown", `Drive answered ${response.status}.`);
  return (await response.json()) as T;
}

/** Lists the direct children of a folder (folders first, by name), up to 1000. */
export async function listFolderChildren(folderId: string): Promise<DriveListing> {
  if (!isDriveId(folderId)) throw new DriveError("not_found", "Invalid folder id.");
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const page = await driveGet<{ files?: DriveFile[]; nextPageToken?: string }>("", {
      q: `'${folderId}' in parents and trashed = false`,
      fields: LIST_FIELDS,
      orderBy: "folder,name",
      pageSize: String(PAGE_SIZE),
      includeItemsFromAllDrives: "true",
      ...(pageToken ? { pageToken } : {}),
    });
    files.push(...(page.files ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken && files.length < MAX_ITEMS);
  return {
    items: files.slice(0, MAX_ITEMS).map(toDriveItem),
    truncated: Boolean(pageToken) || files.length > MAX_ITEMS,
  };
}

/** Folder metadata for the ancestry walk; null when missing or not a folder. */
export async function getFolderNode(folderId: string): Promise<FolderNode | null> {
  if (!isDriveId(folderId)) return null;
  try {
    const file = await driveGet<DriveFile>(`/${folderId}`, { fields: "id,name,mimeType,parents" });
    if (file.mimeType !== FOLDER_MIME) return null;
    return { id: file.id, name: file.name?.trim() || "(sin nombre)", parents: file.parents ?? [] };
  } catch (error) {
    if (error instanceof DriveError && error.code === "not_found") return null;
    throw error;
  }
}
