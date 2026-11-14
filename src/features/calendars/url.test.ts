import { describe, expect, it } from "vitest";
import { googleIcalUrlSchema, maskIcsUrl, parseGoogleIcalUrl } from "./url";

const VALID =
  "https://calendar.google.com/calendar/ical/team.example%40gmail.com/private-0123456789abcdef/basic.ics";

describe("parseGoogleIcalUrl", () => {
  it("accepts a Google secret iCal address", () => {
    expect(parseGoogleIcalUrl(VALID)).toBe(VALID);
    expect(parseGoogleIcalUrl(`  ${VALID}  `)).toBe(VALID);
    expect(googleIcalUrlSchema.safeParse(VALID).success).toBe(true);
  });

  it.each([
    ["plain http", VALID.replace("https:", "http:")],
    ["another host", "https://evil.example.com/calendar/ical/x/private-y/basic.ics"],
    [
      "a lookalike host",
      "https://calendar.google.com.evil.com/calendar/ical/x/private-y/basic.ics",
    ],
    ["a subdomain", "https://www.calendar.google.com/calendar/ical/x/private-y/basic.ics"],
    [
      "userinfo pointing elsewhere",
      "https://calendar.google.com@evil.com/calendar/ical/x/private-y/basic.ics",
    ],
    [
      "userinfo on the right host",
      "https://user:pass@calendar.google.com/calendar/ical/x/private-y/basic.ics",
    ],
    ["an explicit port", "https://calendar.google.com:8443/calendar/ical/x/private-y/basic.ics"],
    ["a non-ical path", "https://calendar.google.com/calendar/embed?src=x"],
    ["a path escaping the prefix", "https://calendar.google.com/calendar/ical/../../admin.ics"],
    ["a path without .ics", "https://calendar.google.com/calendar/ical/x/private-y/basic"],
    ["garbage", "not a url"],
    ["a javascript URL", "javascript:alert(1)"],
  ])("rejects %s", (_label, value) => {
    expect(parseGoogleIcalUrl(value)).toBeNull();
    expect(googleIcalUrlSchema.safeParse(value).success).toBe(false);
  });
});

describe("maskIcsUrl", () => {
  it("hides the secret part of the address", () => {
    const masked = maskIcsUrl(VALID);
    expect(masked).not.toContain("private-0123456789abcdef");
    expect(masked).not.toContain("gmail.com");
    expect(masked.startsWith("https://calendar.google.com/calendar/ical/")).toBe(true);
  });
});
