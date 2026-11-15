// Raw Drive v3 `files` resource (only the requested fields).
export type DriveFile = {
  id: string;
  name?: string;
  mimeType?: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
  parents?: string[];
};

export type DriveKind = "folder" | "doc" | "sheet" | "slides" | "pdf" | "image" | "other";

// Serializable view model passed to the client browser.
export type DriveItem = {
  id: string;
  name: string;
  kind: DriveKind;
  mimeType: string | null;
  modified: string | null;
  modifiedTime: string | null;
  size: string | null;
  webViewLink: string | null;
};

export type Crumb = { id: string; name: string };

export type DriveListing = { items: DriveItem[]; truncated: boolean };

// Error codes surfaced to the UI (mapped to Spanish copy).
export type DriveErrorCode =
  | "config"
  | "api_disabled"
  | "permission"
  | "not_found"
  | "timeout"
  | "unknown";
