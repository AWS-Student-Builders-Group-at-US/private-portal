import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { resolveFolderPath, type FolderNode } from "./ancestry";
import { DriveError, getFolderNode, listFolderChildren, toDriveErrorCode } from "./client";
import { isDriveId } from "./config";
import type { Crumb, DriveErrorCode, DriveListing } from "./types";

// Cached Drive reads. Only folder ids are cache keys; the service account key
// is read from env inside the scope. Successful reads live 5 minutes under
// DRIVE_CACHE_TAG ("Actualizar" expires it); failures are cached only for
// seconds so a fixed sharing problem shows up quickly. Remote cache, because
// the in-memory one rarely hits on serverless.

export const DRIVE_CACHE_TAG = "drive";
const FIVE_MINUTES = { stale: 300, revalidate: 300, expire: 3600 };

type Result<T> = { ok: true; data: T } | { ok: false; code: DriveErrorCode };

function failure(error: unknown, scope: string): { ok: false; code: DriveErrorCode } {
  const code = toDriveErrorCode(error);
  // Log the code only: messages may echo upstream details.
  console.error(`drive ${scope} failed: ${code}`);
  return { ok: false, code };
}

async function cachedListing(folderId: string): Promise<Result<DriveListing>> {
  "use cache: remote";
  cacheTag(DRIVE_CACHE_TAG);
  try {
    const data = await listFolderChildren(folderId);
    cacheLife(FIVE_MINUTES);
    return { ok: true, data };
  } catch (error) {
    cacheLife("seconds");
    return failure(error, "list");
  }
}

async function cachedFolderNode(folderId: string): Promise<Result<FolderNode | null>> {
  "use cache: remote";
  cacheTag(DRIVE_CACHE_TAG);
  try {
    const data = await getFolderNode(folderId);
    cacheLife(FIVE_MINUTES);
    return { ok: true, data };
  } catch (error) {
    cacheLife("seconds");
    return failure(error, "folder");
  }
}

async function folderNode(folderId: string): Promise<FolderNode | null> {
  const result = await cachedFolderNode(folderId);
  if (!result.ok) throw new DriveError(result.code, "Drive folder lookup failed.");
  return result.data;
}

export type DriveView =
  | { status: "ok"; path: Crumb[]; listing: DriveListing }
  | { status: "not_found" }
  | { status: "error"; code: DriveErrorCode };

/**
 * Loads `folderId` (default: the root) after checking that it is the root or
 * a descendant of it. A root that Drive cannot see means the folder was not
 * shared with the service account.
 */
export async function loadDriveView(rootId: string, folderId?: string): Promise<DriveView> {
  const target = folderId ?? rootId;
  if (!isDriveId(target)) return { status: "not_found" };
  try {
    const root = await folderNode(rootId);
    if (!root) return { status: "error", code: "permission" };
    const path = await resolveFolderPath(target, rootId, folderNode);
    if (!path) return { status: "not_found" };
    const listing = await cachedListing(target);
    if (!listing.ok) return { status: "error", code: listing.code };
    return { status: "ok", path, listing: listing.data };
  } catch (error) {
    return { status: "error", code: toDriveErrorCode(error) };
  }
}

export type FolderCheck =
  | { status: "ok"; name: string }
  | { status: "error"; code: DriveErrorCode };

/** Checks that the service account can see `folderId` (used by Ajustes). */
export async function checkDriveFolder(folderId: string): Promise<FolderCheck> {
  const result = await cachedFolderNode(folderId);
  if (!result.ok) return { status: "error", code: result.code };
  if (!result.data) return { status: "error", code: "permission" };
  return { status: "ok", name: result.data.name };
}
