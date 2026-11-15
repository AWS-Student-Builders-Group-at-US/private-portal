import { describe, expect, it } from "vitest";
import { isAuthorizedCron } from "./cron-auth";

const SECRET = "s3cr3t-value-for-tests";

describe("isAuthorizedCron", () => {
  it("accepts the exact Bearer header", () => {
    expect(isAuthorizedCron(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it("rejects a wrong secret of the same length", () => {
    const wrong = SECRET.slice(0, -1) + "X";
    expect(isAuthorizedCron(`Bearer ${wrong}`, SECRET)).toBe(false);
  });

  it("rejects secrets of a different length", () => {
    expect(isAuthorizedCron(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    expect(isAuthorizedCron(`Bearer ${SECRET.slice(1)}`, SECRET)).toBe(false);
  });

  it("rejects a missing or empty header", () => {
    expect(isAuthorizedCron(null, SECRET)).toBe(false);
    expect(isAuthorizedCron(undefined, SECRET)).toBe(false);
    expect(isAuthorizedCron("", SECRET)).toBe(false);
  });

  it("rejects everything when the env secret is missing or empty", () => {
    expect(isAuthorizedCron("Bearer ", "")).toBe(false);
    expect(isAuthorizedCron("Bearer undefined", undefined)).toBe(false);
    expect(isAuthorizedCron("Bearer ", undefined)).toBe(false);
  });

  it("requires the 'Bearer ' prefix exactly", () => {
    expect(isAuthorizedCron(SECRET, SECRET)).toBe(false);
    expect(isAuthorizedCron(`bearer ${SECRET}`, SECRET)).toBe(false);
    expect(isAuthorizedCron(`Bearer  ${SECRET}`, SECRET)).toBe(false);
    expect(isAuthorizedCron(`Basic ${SECRET}`, SECRET)).toBe(false);
  });
});
