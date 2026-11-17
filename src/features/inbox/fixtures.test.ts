import { describe, expect, it } from "vitest";
import { findFixtureMessage, listFixtureMessages } from "./fixture-source";
import { buildFixtureMessages, type FixtureMessage } from "./fixtures";
import { PAGE_SIZE, isFixtureMode, maskCommonAccount } from "./logic";

const now = new Date("2026-11-17T12:00:00Z");

function generated(count: number): FixtureMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    uid: i + 1,
    subject: i % 2 === 0 ? `AWS aviso ${i + 1}` : `Boletín ${i + 1}`,
    from: [{ name: `Remitente ${i + 1}`, address: `sender${i + 1}@example.com` }],
    to: [],
    cc: [],
    date: new Date(now.getTime() - i * 60_000).toISOString(),
    text: "Hola",
    html: null,
    attachments: [],
    unread: i % 3 === 0,
  }));
}

describe("buildFixtureMessages", () => {
  const messages = buildFixtureMessages(now);

  it("has a varied, realistic sample with unique uids and example addresses only", () => {
    expect(messages.length).toBeGreaterThanOrEqual(10);
    expect(new Set(messages.map((m) => m.uid)).size).toBe(messages.length);
    expect(messages.some((m) => m.unread)).toBe(true);
    expect(messages.some((m) => !m.unread)).toBe(true);
    expect(messages.some((m) => m.html === null && m.text)).toBe(true);
    expect(messages.some((m) => m.attachments.length >= 2)).toBe(true);
    expect(messages.some((m) => m.html?.includes("<script>"))).toBe(true);
    for (const message of messages) {
      for (const address of [...message.from, ...message.to, ...message.cc]) {
        expect(address.address ?? "").toMatch(/(@example\.com|\.example)$/);
      }
    }
  });

  it("dates messages relative to now (today, yesterday and older)", () => {
    const days = new Set(messages.map((m) => m.date?.slice(0, 10)));
    expect(days.has("2026-11-17")).toBe(true);
    expect(days.has("2026-11-16")).toBe(true);
    expect([...days].some((day) => day! < "2026-01-01")).toBe(true);
  });
});

describe("listFixtureMessages", () => {
  it("pages newest first like the IMAP path and reports the total", () => {
    const messages = generated(30);
    const first = listFixtureMessages(messages, { page: 1, query: null });
    expect(first.messages).toHaveLength(PAGE_SIZE);
    expect(first.messages[0].uid).toBe(30);
    expect(first.hasOlder).toBe(true);
    expect(first.total).toBe(30);

    const second = listFixtureMessages(messages, { page: 2, query: null });
    expect(second.messages.map((m) => m.uid)).toEqual([5, 4, 3, 2, 1]);
    expect(second.hasOlder).toBe(false);
    expect(listFixtureMessages(messages, { page: 3, query: null }).messages).toEqual([]);
  });

  it("searches subject and sender case-insensitively, like IMAP SEARCH OR SUBJECT FROM", () => {
    const messages = generated(30);
    const bySubject = listFixtureMessages(messages, { page: 1, query: "  aws   AVISO " });
    expect(bySubject.total).toBe(15);
    expect(bySubject.messages.every((m) => m.subject.startsWith("AWS aviso"))).toBe(true);

    expect(listFixtureMessages(messages, { page: 1, query: "sender7@" }).messages.map((m) => m.uid)).toEqual([7]);
    expect(listFixtureMessages(messages, { page: 1, query: "remitente 12" }).messages.map((m) => m.uid)).toEqual([12]);
    expect(listFixtureMessages(messages, { page: 1, query: "nada" })).toEqual({
      messages: [],
      hasOlder: false,
      total: 0,
    });
  });

  it("maps messages to the same summary shape as the IMAP path", () => {
    const [summary] = listFixtureMessages(generated(1), { page: 1, query: null }).messages;
    expect(summary).toEqual({
      uid: 1,
      from: "Remitente 1",
      fromAddress: "sender1@example.com",
      subject: "AWS aviso 1",
      date: now.toISOString(),
      unread: true,
    });
  });
});

describe("findFixtureMessage", () => {
  it("returns the full message without the unread flag, or null", () => {
    const message = findFixtureMessage(generated(3), 2);
    expect(message?.uid).toBe(2);
    expect(message).not.toHaveProperty("unread");
    expect(findFixtureMessage(generated(3), 99)).toBeNull();
  });
});

describe("isFixtureMode", () => {
  it("is on only with INBOX_FIXTURES=1 outside production", () => {
    expect(isFixtureMode({ INBOX_FIXTURES: "1", NODE_ENV: "development" })).toBe(true);
    expect(isFixtureMode({ INBOX_FIXTURES: "1", NODE_ENV: "test", VERCEL_ENV: "preview" })).toBe(true);
  });

  it("is off without the flag or with any other value", () => {
    expect(isFixtureMode({ NODE_ENV: "development" })).toBe(false);
    expect(isFixtureMode({ INBOX_FIXTURES: "true", NODE_ENV: "development" })).toBe(false);
    expect(isFixtureMode({ INBOX_FIXTURES: "0", NODE_ENV: "development" })).toBe(false);
  });

  it("is never on in a production build or a Vercel production deployment", () => {
    expect(isFixtureMode({ INBOX_FIXTURES: "1", NODE_ENV: "production" })).toBe(false);
    expect(isFixtureMode({ INBOX_FIXTURES: "1", NODE_ENV: "development", VERCEL_ENV: "production" })).toBe(false);
  });
});

describe("maskCommonAccount", () => {
  it("replaces the common account with a label so its address never reaches the browser", () => {
    const list = [
      { name: "Grupo", address: "Common@Example.com" },
      { name: "Ana", address: "ana@example.com" },
    ];
    expect(maskCommonAccount(list, "common@example.com")).toEqual([
      { name: "Cuenta común" },
      { name: "Ana", address: "ana@example.com" },
    ]);
  });

  it("leaves the list untouched without an account", () => {
    const list = [{ address: "a@example.com" }];
    expect(maskCommonAccount(list, undefined)).toEqual(list);
  });
});
