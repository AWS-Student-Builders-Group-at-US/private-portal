import { FOLDER_MIME } from "./mapping";

// Google's embeddable previews. The viewer's own Google session decides
// whether the file can be seen; the app never proxies file contents.

const GOOGLE = "application/vnd.google-apps.";

// Google-native files use the matching Docs editor preview.
const EDITOR_PREVIEW: Record<string, string> = {
  [`${GOOGLE}document`]: "https://docs.google.com/document/d/",
  [`${GOOGLE}spreadsheet`]: "https://docs.google.com/spreadsheets/d/",
  [`${GOOGLE}presentation`]: "https://docs.google.com/presentation/d/",
};

const DRIVE_PREVIEW = "https://drive.google.com/file/d/";

/** Drive ids only contain letters, digits, '_' and '-'. */
export function isDriveFileId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,200}$/.test(id);
}

/** Embeddable preview URL for a Drive file, or null for folders and invalid ids. */
export function drivePreviewUrl(id: string, mimeType: string | null): string | null {
  if (!isDriveFileId(id) || mimeType === FOLDER_MIME) return null;
  const base = (mimeType && EDITOR_PREVIEW[mimeType]) || DRIVE_PREVIEW;
  return `${base}${id}/preview`;
}
