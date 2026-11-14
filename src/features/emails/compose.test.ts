import { describe, expect, it } from "vitest";
import {
  buildDefaultEmail,
  buildUnsubscribeUrls,
  campaignInputSchema,
  composeEmail,
  escapeHtml,
} from "./compose";

describe("campaignInputSchema", () => {
  it("trims and accepts valid input", () => {
    const parsed = campaignInputSchema.parse({ subject: "  Hola  ", body: " Texto " });
    expect(parsed).toEqual({ subject: "Hola", body: "Texto" });
  });

  it("rejects empty, too long and multi-line subjects", () => {
    expect(campaignInputSchema.safeParse({ subject: " ", body: "x" }).success).toBe(false);
    expect(
      campaignInputSchema.safeParse({ subject: "a".repeat(151), body: "x" }).success,
    ).toBe(false);
    expect(
      campaignInputSchema.safeParse({ subject: "a\r\nBcc: x@example.com", body: "x" })
        .success,
    ).toBe(false);
  });

  it("rejects empty or too long bodies", () => {
    expect(campaignInputSchema.safeParse({ subject: "a", body: "" }).success).toBe(false);
    expect(
      campaignInputSchema.safeParse({ subject: "a", body: "b".repeat(5001) }).success,
    ).toBe(false);
    expect(
      campaignInputSchema.safeParse({ subject: "a", body: "b".repeat(5000) }).success,
    ).toBe(true);
  });
});

describe("buildDefaultEmail", () => {
  const event = {
    title: "Taller de Lambda",
    starts_at: "2026-12-03T17:30:00Z",
    location: "Aula A1",
    meetup_url: "https://www.meetup.com/example/events/1",
  };

  it("prefills title, Madrid date/time, location and Meetup link", () => {
    const { subject, body } = buildDefaultEmail(event);
    expect(subject).toContain("Taller de Lambda");
    expect(body).toContain("Taller de Lambda");
    expect(body).toContain("18:30");
    expect(body).toContain("3 de diciembre de 2026");
    expect(body).toContain("Aula A1");
    expect(body).toContain("https://www.meetup.com/example/events/1");
    expect(campaignInputSchema.safeParse({ subject, body }).success).toBe(true);
  });

  it("omits missing location and Meetup link", () => {
    const { body } = buildDefaultEmail({ ...event, location: null, meetup_url: null });
    expect(body).not.toContain("Lugar");
    expect(body).not.toContain("Meetup");
  });
});

describe("buildUnsubscribeUrls", () => {
  it("builds the page and one-click URLs from the base URL", () => {
    const token = "ab".repeat(16);
    expect(buildUnsubscribeUrls("https://app.example.com/", token)).toEqual({
      page: `https://app.example.com/baja/${token}`,
      oneClick: `https://app.example.com/api/baja/${token}`,
    });
  });
});

describe("composeEmail", () => {
  const urls = buildUnsubscribeUrls("https://app.example.com", "0".repeat(32));
  const email = composeEmail({
    subject: "Nuevo evento",
    body: 'Hola <script>alert("x")</script> & bienvenida\nSegunda línea',
    unsubscribe: urls,
  });

  it("sets RFC 8058 one-click unsubscribe headers", () => {
    expect(email.headers).toEqual({
      "List-Unsubscribe": `<${urls.oneClick}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  it("adds a footer with the reason and the unsubscribe link", () => {
    expect(email.subject).toBe("Nuevo evento");
    expect(email.text).toContain("Segunda línea");
    expect(email.text).toContain("aceptaste recibir");
    expect(email.text).toContain(urls.page);
    expect(email.html).toContain(`href="${urls.page}"`);
  });

  it("escapes user text in the HTML version", () => {
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; bienvenida",
    );
    expect(email.html).toContain("<br>");
  });

  it("escapes the five HTML special characters", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });
});
