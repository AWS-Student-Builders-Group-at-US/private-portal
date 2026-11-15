import { describe, expect, it } from "vitest";
import {
  canManageMembers,
  isSameEmail,
  normalizeEmail,
  withoutEmail,
} from "./common-account-logic";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Group.Account@Example.COM ")).toBe("group.account@example.com");
  });

  it("returns null for missing or blank values", () => {
    expect(normalizeEmail(undefined)).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail("   ")).toBeNull();
  });
});

describe("isSameEmail", () => {
  it("compares case- and whitespace-insensitively", () => {
    expect(isSameEmail("ANA@example.com ", "ana@example.com")).toBe(true);
    expect(isSameEmail("ana@example.com", "luis@example.com")).toBe(false);
  });

  it("is never true when either side is missing", () => {
    expect(isSameEmail(null, null)).toBe(false);
    expect(isSameEmail("", "")).toBe(false);
    expect(isSameEmail("ana@example.com", undefined)).toBe(false);
  });
});

describe("withoutEmail", () => {
  const people = [
    { email: "ana@example.com", name: "Ana" },
    { email: "group@example.com", name: "Cuenta común" },
    { email: "luis@example.com", name: "Luis" },
  ];

  it("removes the matching person, keeping order", () => {
    expect(withoutEmail(people, "GROUP@example.com").map((p) => p.name)).toEqual(["Ana", "Luis"]);
  });

  it("returns every person when no email is configured", () => {
    expect(withoutEmail(people, null)).toEqual(people);
  });

  it("works on rows keyed by another field", () => {
    const notes = [
      { member_email: "group@example.com", title: "a" },
      { member_email: "ana@example.com", title: "b" },
    ];
    expect(withoutEmail(notes, "group@example.com", (n) => n.member_email)).toEqual([
      { member_email: "ana@example.com", title: "b" },
    ]);
  });
});

describe("canManageMembers", () => {
  it("lets any member manage when the common account is not configured", () => {
    expect(canManageMembers({ commonEmail: null, me: "ana@example.com" })).toBe(true);
  });

  it("only lets the common account manage once configured", () => {
    expect(canManageMembers({ commonEmail: "group@example.com", me: "ana@example.com" })).toBe(false);
    expect(canManageMembers({ commonEmail: "group@example.com", me: "Group@Example.com" })).toBe(true);
  });
});
