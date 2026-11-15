import { describe, expect, it } from "vitest";
import { driveKind, formatBytes, formatModified, toDriveItem } from "./mapping";

describe("driveKind", () => {
  it.each([
    ["application/vnd.google-apps.folder", "folder"],
    ["application/vnd.google-apps.document", "doc"],
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "doc"],
    ["application/vnd.google-apps.spreadsheet", "sheet"],
    ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "sheet"],
    ["text/csv", "sheet"],
    ["application/vnd.google-apps.presentation", "slides"],
    ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "slides"],
    ["application/pdf", "pdf"],
    ["image/png", "image"],
    ["application/vnd.google-apps.drawing", "image"],
    ["application/zip", "other"],
    ["", "other"],
  ])("%s -> %s", (mimeType, kind) => {
    expect(driveKind(mimeType)).toBe(kind);
  });
});

describe("formatBytes", () => {
  it("formats sizes with Spanish decimals", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1,5 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 MB");
    expect(formatBytes(1.25 * 1024 ** 3)).toBe("1,3 GB");
  });
});

describe("formatModified", () => {
  it("renders Europe/Madrid wall time in summer and winter", () => {
    expect(formatModified("2026-07-01T10:00:00.000Z")).toBe("01/07/2026 12:00");
    expect(formatModified("2026-01-15T23:30:00.000Z")).toBe("16/01/2026 00:30");
  });

  it("returns null for missing or invalid dates", () => {
    expect(formatModified(undefined)).toBeNull();
    expect(formatModified("garbage")).toBeNull();
  });
});

describe("toDriveItem", () => {
  it("maps a binary file with size and link", () => {
    expect(
      toDriveItem({
        id: "file1",
        name: "Acta.pdf",
        mimeType: "application/pdf",
        modifiedTime: "2026-07-01T10:00:00.000Z",
        size: "2048",
        webViewLink: "https://drive.google.com/file/d/file1/view",
      }),
    ).toEqual({
      id: "file1",
      name: "Acta.pdf",
      kind: "pdf",
      modified: "01/07/2026 12:00",
      modifiedTime: "2026-07-01T10:00:00.000Z",
      size: "2 KB",
      webViewLink: "https://drive.google.com/file/d/file1/view",
    });
  });

  it("omits size for Google-native files and folders", () => {
    const item = toDriveItem({
      id: "doc1",
      name: "Plan",
      mimeType: "application/vnd.google-apps.document",
    });
    expect(item.size).toBeNull();
    expect(item.modified).toBeNull();
  });

  it("drops links that are not https", () => {
    const item = toDriveItem({
      id: "x1",
      name: "Raro",
      mimeType: "application/pdf",
      webViewLink: "javascript:alert(1)",
    });
    expect(item.webViewLink).toBeNull();
  });

  it("falls back to a placeholder name", () => {
    expect(toDriveItem({ id: "x2", mimeType: "image/png" }).name).toBe("(sin nombre)");
  });
});
