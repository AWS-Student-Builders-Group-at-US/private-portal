import { describe, expect, it } from "vitest";
import { parseDriveFolderInput } from "./folder-input";

const ID = "1AbC_d-EfGhIjKlMnOpQrStUv";

describe("parseDriveFolderInput", () => {
  it("accepts a bare id, trimming spaces", () => {
    expect(parseDriveFolderInput(`  ${ID} `)).toBe(ID);
  });

  it("extracts the id from a folder URL with query string", () => {
    expect(parseDriveFolderInput(`https://drive.google.com/drive/folders/${ID}?usp=sharing`)).toBe(ID);
  });

  it("extracts the id from account-scoped and trailing-slash URLs", () => {
    expect(parseDriveFolderInput(`https://drive.google.com/drive/u/1/folders/${ID}/`)).toBe(ID);
    expect(parseDriveFolderInput(`https://drive.google.com/drive/folders/${ID}#x`)).toBe(ID);
  });

  it("rejects other hosts and non-folder URLs", () => {
    expect(parseDriveFolderInput(`https://evil.example/drive/folders/${ID}`)).toBeNull();
    expect(parseDriveFolderInput(`http://drive.google.com/drive/folders/${ID}`)).toBeNull();
    expect(parseDriveFolderInput(`https://drive.google.com/file/d/${ID}/view`)).toBeNull();
  });

  it("rejects malformed ids", () => {
    expect(parseDriveFolderInput("")).toBeNull();
    expect(parseDriveFolderInput("short")).toBeNull();
    expect(parseDriveFolderInput("abc' or '1'='1")).toBeNull();
    expect(parseDriveFolderInput("a".repeat(101))).toBeNull();
  });
});
