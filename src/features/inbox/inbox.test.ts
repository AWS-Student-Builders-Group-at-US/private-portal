import { describe, expect, it } from "vitest";
import {
  INBOX_CSP,
  PAGE_SIZE,
  buildSandboxedHtml,
  formatAddress,
  formatAddressList,
  formatBytes,
  normalizeSearch,
  pageOfUids,
  parsePage,
  parseUid,
} from "./logic";

describe("parseUid", () => {
  it("accepts positive integers only", () => {
    expect(parseUid("1")).toBe(1);
    expect(parseUid("4294967295")).toBe(4294967295);
  });

  it("rejects anything else", () => {
    for (const value of ["", "0", "-1", "1.5", "1e3", "abc", " 7", "07", "4294967296", undefined]) {
      expect(parseUid(value)).toBeNull();
    }
  });
});

describe("parsePage", () => {
  it("defaults to the first page", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-3")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage(["2", "3"])).toBe(2);
  });

  it("parses valid pages and caps absurd values", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage("999999")).toBe(1000);
  });
});

describe("pageOfUids", () => {
  const uids = Array.from({ length: 60 }, (_, i) => i + 1); // ascending, as IMAP returns them

  it("returns the newest uids first", () => {
    const page = pageOfUids(uids, 1);
    expect(page.uids).toHaveLength(PAGE_SIZE);
    expect(page.uids[0]).toBe(60);
    expect(page.uids.at(-1)).toBe(36);
    expect(page.hasOlder).toBe(true);
  });

  it("returns older pages and stops at the end", () => {
    expect(pageOfUids(uids, 2).uids[0]).toBe(35);
    const last = pageOfUids(uids, 3);
    expect(last.uids).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(last.hasOlder).toBe(false);
    expect(pageOfUids(uids, 4)).toEqual({ uids: [], hasOlder: false });
  });

  it("sorts unsorted input and handles empty mailboxes", () => {
    expect(pageOfUids([3, 1, 2], 1)).toEqual({ uids: [3, 2, 1], hasOlder: false });
    expect(pageOfUids([], 1)).toEqual({ uids: [], hasOlder: false });
  });
});

describe("normalizeSearch", () => {
  it("trims, collapses whitespace and caps the length", () => {
    expect(normalizeSearch("  aws   billing ")).toBe("aws billing");
    expect(normalizeSearch("x".repeat(200))).toHaveLength(100);
  });

  it("returns null for empty input", () => {
    expect(normalizeSearch(undefined)).toBeNull();
    expect(normalizeSearch("   ")).toBeNull();
    expect(normalizeSearch(["", "b"])).toBeNull();
  });
});

describe("formatAddress", () => {
  it("shows the name and the address", () => {
    expect(formatAddress({ name: "AWS", address: "no-reply@example.com" })).toBe(
      "AWS <no-reply@example.com>",
    );
  });

  it("falls back to whichever part exists", () => {
    expect(formatAddress({ address: "a@example.com" })).toBe("a@example.com");
    expect(formatAddress({ name: "Solo nombre", address: "" })).toBe("Solo nombre");
    expect(formatAddress({ name: "  ", address: undefined })).toBe("Desconocido");
    expect(formatAddress(undefined)).toBe("Desconocido");
  });

  it("joins lists", () => {
    expect(formatAddressList([{ address: "a@example.com" }, { name: "B", address: "b@example.com" }])).toBe(
      "a@example.com, B <b@example.com>",
    );
    expect(formatAddressList([])).toBe("");
    expect(formatAddressList(undefined)).toBe("");
  });
});

describe("formatBytes", () => {
  it("uses B, KB and MB", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(1536 * 1024)).toBe("1.5 MB");
    expect(formatBytes(undefined)).toBe("—");
  });
});

describe("buildSandboxedHtml", () => {
  it("injects the restrictive CSP as the first element of the document", () => {
    const html = buildSandboxedHtml("<html><head><title>x</title></head><body><p>Hola</p></body></html>");
    expect(INBOX_CSP).toBe("default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:");
    expect(html.startsWith(`<!doctype html><meta http-equiv="Content-Security-Policy" content="${INBOX_CSP}">`)).toBe(true);
    expect(html).toContain("<p>Hola</p>");
  });

  it("keeps the CSP first even when the email has its own head or meta tags", () => {
    const html = buildSandboxedHtml(
      `<meta http-equiv="Content-Security-Policy" content="default-src *"><script>alert(1)</script>`,
    );
    expect(html.indexOf(INBOX_CSP)).toBeLessThan(html.indexOf("default-src *"));
    // Scripts stay inert: the CSP forbids them and the iframe sandbox has no allow-scripts.
    expect(html).toContain("<script>alert(1)</script>");
  });

  it("handles fragments and empty bodies", () => {
    expect(buildSandboxedHtml("")).toContain(INBOX_CSP);
    expect(buildSandboxedHtml("<b>hi</b>")).toContain("<b>hi</b>");
  });
});
