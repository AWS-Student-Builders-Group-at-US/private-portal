import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrivacyNotice } from "./components/privacy-notice";
import { parsePrivacyNotice } from "./privacy-render";

const text = [
  "## Responsable",
  "",
  "Primera línea",
  "segunda línea.",
  "",
  "- Uno",
  "- Dos",
  "Después de la lista.",
  "",
  "## Derechos",
  "Escribe a <script>alert(1)</script>.",
].join("\n");

describe("parsePrivacyNotice", () => {
  it("splits headings, paragraphs and lists", () => {
    expect(parsePrivacyNotice(text)).toEqual([
      { type: "heading", text: "Responsable" },
      { type: "paragraph", text: "Primera línea segunda línea." },
      { type: "list", items: ["Uno", "Dos"] },
      { type: "paragraph", text: "Después de la lista." },
      { type: "heading", text: "Derechos" },
      { type: "paragraph", text: "Escribe a <script>alert(1)</script>." },
    ]);
  });

  it("handles CRLF and empty input", () => {
    expect(parsePrivacyNotice("a\r\n\r\nb")).toEqual([
      { type: "paragraph", text: "a" },
      { type: "paragraph", text: "b" },
    ]);
    expect(parsePrivacyNotice("  \n ")).toEqual([]);
  });
});

describe("PrivacyNotice", () => {
  const html = renderToStaticMarkup(createElement(PrivacyNotice, { text }));

  it("renders headings and list items", () => {
    expect(html).toContain("<h2");
    expect(html).toContain(">Responsable</h2>");
    expect(html).toContain("<li>Uno</li><li>Dos</li>");
  });

  it("renders markup as text, never as HTML", () => {
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});
