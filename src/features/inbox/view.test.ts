import { describe, expect, it } from "vitest";
import {
  AVATAR_TONE_COUNT,
  avatarTone,
  formatInboxDate,
  formatRange,
  inboxHref,
  isAwsSender,
  senderInitials,
  summarizeRecipients,
} from "./logic";

describe("formatInboxDate", () => {
  // 13:00 in Madrid (CET, UTC+1).
  const now = new Date("2026-11-17T12:00:00Z");

  it("shows only the time for messages from today (Madrid)", () => {
    expect(formatInboxDate("2026-11-17T13:32:00Z", now)).toBe("14:32");
    // 00:30 on the 17th in Madrid, still the 16th in UTC.
    expect(formatInboxDate("2026-11-16T23:30:00Z", now)).toBe("00:30");
  });

  it("shows day and short month for earlier days of this year", () => {
    expect(formatInboxDate("2026-11-12T10:00:00Z", now)).toBe("12 nov");
    expect(formatInboxDate("2026-11-16T22:59:00Z", now)).toBe("16 nov");
    expect(formatInboxDate("2026-09-03T10:00:00Z", now)).toBe("3 sep");
    // 00:30 on 1 January in Madrid, still 31 December in UTC.
    expect(formatInboxDate("2025-12-31T23:30:00Z", now)).toBe("1 ene");
  });

  it("shows the full numeric date for older years", () => {
    expect(formatInboxDate("2025-11-12T10:00:00Z", now)).toBe("12/11/2025");
    expect(formatInboxDate("2024-02-05T10:00:00Z", now)).toBe("05/02/2024");
  });

  it("returns an empty string for missing or invalid dates", () => {
    expect(formatInboxDate(null, now)).toBe("");
    expect(formatInboxDate("not a date", now)).toBe("");
  });
});

describe("senderInitials", () => {
  it("uses the first letters of the first two words of the name", () => {
    expect(senderInitials("Amazon Web Services")).toBe("AW");
    expect(senderInitials("álvaro pérez")).toBe("ÁP");
    expect(senderInitials('"Meetup" <info>')).toBe("MI");
  });

  it("uses a single letter for one-word names", () => {
    expect(senderInitials("Meetup")).toBe("M");
  });

  it("falls back to the local part of an address", () => {
    expect(senderInitials(null, "no-reply@aws.example")).toBe("NR");
    expect(senderInitials("", "team@example.com")).toBe("T");
    expect(senderInitials(undefined, undefined)).toBe("?");
  });
});

describe("avatarTone", () => {
  it("is deterministic and case-insensitive", () => {
    expect(avatarTone("no-reply@aws.example")).toBe(avatarTone("No-Reply@AWS.example"));
  });

  it("stays within the palette and spreads senders across it", () => {
    const seeds = ["a@example.com", "b@example.com", "c@example.com", "meetup", "google", "uni", "x", "y"];
    const tones = seeds.map((seed) => avatarTone(seed));
    for (const tone of tones) {
      expect(tone).toBeGreaterThanOrEqual(0);
      expect(tone).toBeLessThan(AVATAR_TONE_COUNT);
    }
    expect(new Set(tones).size).toBeGreaterThanOrEqual(3);
  });
});

describe("isAwsSender", () => {
  it("accepts Amazon and AWS domains and their subdomains", () => {
    for (const address of [
      "no-reply@aws.com",
      "billing@amazon.com",
      "alerts@sns.amazonaws.com",
      "marketing@email.aws.amazon.com",
      "Info@AMAZON.CO.UK",
      "no-reply@aws.example",
    ]) {
      expect(isAwsSender(address)).toBe(true);
    }
  });

  it("rejects look-alikes and other senders", () => {
    for (const address of [
      "aws@example.com",
      "x@notaws.com",
      "x@aws.evil.com",
      "x@amazon-security.com",
      "x@example.com",
      "",
      null,
      undefined,
      "no-at-sign",
    ]) {
      expect(isAwsSender(address)).toBe(false);
    }
  });
});

describe("summarizeRecipients", () => {
  const ana = { name: "Ana", address: "ana@example.com" };
  const luis = { address: "luis@example.com" };
  const more = [{ name: "C" }, { name: "D" }, { name: "E" }];

  it("lists up to the visible count and summarizes the rest", () => {
    expect(summarizeRecipients([ana])).toBe("Ana");
    expect(summarizeRecipients([ana, luis])).toBe("Ana, luis@example.com");
    expect(summarizeRecipients([ana, luis, more[0]])).toBe("Ana, luis@example.com y 1 más");
    expect(summarizeRecipients([ana, luis, ...more])).toBe("Ana, luis@example.com y 3 más");
    expect(summarizeRecipients([ana, luis, ...more], 1)).toBe("Ana y 4 más");
  });

  it("handles empty lists and unnamed entries", () => {
    expect(summarizeRecipients([])).toBe("");
    expect(summarizeRecipients(undefined)).toBe("");
    expect(summarizeRecipients([{}])).toBe("Desconocido");
  });
});

describe("formatRange", () => {
  it("shows the first and last position and the total", () => {
    expect(formatRange(1, 25, 60)).toBe("1–25 de 60");
    expect(formatRange(3, 10, 60)).toBe("51–60 de 60");
    expect(formatRange(1, 1, 1)).toBe("1–1 de 1");
  });

  it("is empty when nothing is shown", () => {
    expect(formatRange(1, 0, 0)).toBe("");
    expect(formatRange(4, 0, 60)).toBe("");
  });
});

describe("inboxHref", () => {
  it("keeps the search and page on list and message links", () => {
    expect(inboxHref({ page: 1, query: null })).toBe("/panel/correo");
    expect(inboxHref({ page: 2, query: "aws billing" })).toBe("/panel/correo?q=aws+billing&pagina=2");
    expect(inboxHref({ page: 1, query: "a&b", uid: 42 })).toBe("/panel/correo/42?q=a%26b");
    expect(inboxHref({ page: 3, query: null, uid: 7 })).toBe("/panel/correo/7?pagina=3");
  });
});
