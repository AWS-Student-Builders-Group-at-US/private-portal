import { describe, expect, it } from "vitest";
import { drivePreviewUrl, isDriveFileId } from "./preview";

describe("isDriveFileId", () => {
  it("accepts Drive ids made of letters, digits, '_' and '-'", () => {
    expect(isDriveFileId("1AbC_d-EF9")).toBe(true);
  });

  it("rejects empty ids and anything that could alter the URL", () => {
    for (const id of ["", "abc/def", "abc?x=1", "abc#x", "../etc", "a b", "a.b", "ñ", "a%2F"]) {
      expect(isDriveFileId(id)).toBe(false);
    }
  });

  it("rejects absurdly long ids", () => {
    expect(isDriveFileId("a".repeat(201))).toBe(false);
    expect(isDriveFileId("a".repeat(200))).toBe(true);
  });
});

describe("drivePreviewUrl", () => {
  it("uses the Docs editors' preview for Google-native files", () => {
    expect(drivePreviewUrl("doc1", "application/vnd.google-apps.document")).toBe(
      "https://docs.google.com/document/d/doc1/preview",
    );
    expect(drivePreviewUrl("sheet1", "application/vnd.google-apps.spreadsheet")).toBe(
      "https://docs.google.com/spreadsheets/d/sheet1/preview",
    );
    expect(drivePreviewUrl("deck1", "application/vnd.google-apps.presentation")).toBe(
      "https://docs.google.com/presentation/d/deck1/preview",
    );
  });

  it("uses the Drive file preview for uploaded files", () => {
    expect(drivePreviewUrl("pdf1", "application/pdf")).toBe(
      "https://drive.google.com/file/d/pdf1/preview",
    );
    expect(drivePreviewUrl("img1", "image/png")).toBe(
      "https://drive.google.com/file/d/img1/preview",
    );
  });

  it("falls back to the Drive file preview for unknown or missing types", () => {
    expect(drivePreviewUrl("x1", "application/x-unknown")).toBe(
      "https://drive.google.com/file/d/x1/preview",
    );
    expect(drivePreviewUrl("x2", "application/vnd.google-apps.drawing")).toBe(
      "https://drive.google.com/file/d/x2/preview",
    );
    expect(drivePreviewUrl("x3", null)).toBe("https://drive.google.com/file/d/x3/preview");
  });

  it("returns null for folders and invalid ids", () => {
    expect(drivePreviewUrl("f1", "application/vnd.google-apps.folder")).toBeNull();
    expect(drivePreviewUrl("bad/id", "application/pdf")).toBeNull();
    expect(drivePreviewUrl("", "application/pdf")).toBeNull();
  });
});
