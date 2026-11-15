import { isDriveId } from "./config";

/**
 * Accepts a Drive folder URL (https://drive.google.com/drive/[u/N/]folders/<id>)
 * or a bare folder id and returns the validated id, or null.
 */
export function parseDriveFolderInput(input: string): string | null {
  const value = input.trim();
  if (isDriveId(value)) return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "drive.google.com") return null;
  const match = url.pathname.match(/^\/drive\/(?:u\/\d+\/)?folders\/([^/]+)\/?$/);
  return match && isDriveId(match[1]) ? match[1] : null;
}
