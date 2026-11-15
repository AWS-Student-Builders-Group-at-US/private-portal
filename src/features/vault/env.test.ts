import { describe, expect, it } from "vitest";
import { isEnvName, mergeEnvFields, parseEnv, serializeEnv } from "./env";
import { MAX_CUSTOM_FIELDS, MAX_FIELD_VALUE } from "./schema";

describe("isEnvName", () => {
  it("accepts shell-style variable names", () => {
    for (const name of ["API_KEY", "_x", "a1", "NEXT_PUBLIC_URL"]) {
      expect(isEnvName(name)).toBe(true);
    }
  });

  it("rejects names a shell would not accept", () => {
    for (const name of ["", "1ABC", "A-B", "A B", "A.B", "Client ID", "ñ"]) {
      expect(isEnvName(name)).toBe(false);
    }
  });
});

describe("parseEnv", () => {
  it("parses KEY=value lines and ignores comments and blank lines", () => {
    const text = "# comment\n\nAPI_KEY=abc123\n  # indented comment\nREGION = eu-west-1 \n";
    expect(parseEnv(text)).toEqual({
      entries: [
        { name: "API_KEY", value: "abc123" },
        { name: "REGION", value: "eu-west-1" },
      ],
      invalid: [],
    });
  });

  it("strips the export prefix and matching quotes", () => {
    const text = [
      "export TOKEN=t0k",
      'DOUBLE="hello world"',
      "SINGLE='it is $HOME'",
      'MISMATCH="abc\'',
    ].join("\n");
    expect(parseEnv(text).entries).toEqual([
      { name: "TOKEN", value: "t0k" },
      { name: "DOUBLE", value: "hello world" },
      { name: "SINGLE", value: "it is $HOME" },
      { name: "MISMATCH", value: "\"abc'" },
    ]);
  });

  it("keeps '=' inside values and only splits on the first one", () => {
    expect(parseEnv("DSN=postgres://u:p@h/db?sslmode=require&x==y").entries).toEqual([
      { name: "DSN", value: "postgres://u:p@h/db?sslmode=require&x==y" },
    ]);
  });

  it("unescapes double-quoted values and drops trailing comments", () => {
    const text = 'MULTI="line1\\nline2 \\"q\\" \\\\"  # note\nPLAIN=value # note\nHASH=a#b';
    expect(parseEnv(text).entries).toEqual([
      { name: "MULTI", value: 'line1\nline2 "q" \\' },
      { name: "PLAIN", value: "value" },
      { name: "HASH", value: "a#b" },
    ]);
  });

  it("accepts empty values", () => {
    expect(parseEnv('EMPTY=\nQUOTED=""').entries).toEqual([
      { name: "EMPTY", value: "" },
      { name: "QUOTED", value: "" },
    ]);
  });

  it("keeps the last value of duplicate keys in the first position", () => {
    expect(parseEnv("A=1\nB=2\nA=3").entries).toEqual([
      { name: "A", value: "3" },
      { name: "B", value: "2" },
    ]);
  });

  it("reports invalid lines with their line numbers", () => {
    const text = "OK=1\nno equals here\n1BAD=x\nBAD-NAME=y\n=novalue\nexport\n";
    const result = parseEnv(text);
    expect(result.entries).toEqual([{ name: "OK", value: "1" }]);
    expect(result.invalid).toEqual([2, 3, 4, 5, 6]);
  });

  it("handles Windows line endings", () => {
    expect(parseEnv("A=1\r\nB=2\r\n").entries).toEqual([
      { name: "A", value: "1" },
      { name: "B", value: "2" },
    ]);
  });
});

describe("serializeEnv", () => {
  it("writes simple values unquoted and quotes the rest", () => {
    const result = serializeEnv([
      { name: "API_KEY", value: "abc123" },
      { name: "URL", value: "https://example.com/a?b=c" },
      { name: "SPACED", value: "hello world" },
      { name: "TRICKY", value: 'a "b" \\ #c\nd' },
      { name: "EMPTY", value: "" },
    ]);
    expect(result.text).toBe(
      [
        "API_KEY=abc123",
        "URL=https://example.com/a?b=c",
        'SPACED="hello world"',
        'TRICKY="a \\"b\\" \\\\ #c\\nd"',
        "EMPTY=",
        "",
      ].join("\n"),
    );
    expect(result.skipped).toEqual([]);
  });

  it("skips fields whose names are not valid variable names", () => {
    const result = serializeEnv([
      { name: "Client ID", value: "x" },
      { name: "OK", value: "y" },
    ]);
    expect(result.text).toBe("OK=y\n");
    expect(result.skipped).toEqual(["Client ID"]);
  });

  it("round-trips through parseEnv", () => {
    const entries = [
      { name: "A", value: "plain" },
      { name: "B", value: " leading and trailing " },
      { name: "C", value: "quotes ' and \" mixed" },
      { name: "D", value: "multi\nline\r\nvalue" },
      { name: "E", value: "back\\slash\\n literal" },
      { name: "F", value: "x=y=z" },
      { name: "G", value: "# not a comment" },
      { name: "H", value: "" },
    ];
    expect(parseEnv(serializeEnv(entries).text)).toEqual({ entries, invalid: [] });
  });
});

describe("mergeEnvFields", () => {
  const field = (name: string, value: string, secret = false) => ({ name, value, secret });

  it("appends new variables as secret fields and updates existing names", () => {
    const result = mergeEnvFields(
      [field("API_KEY", "old", true), field("Notas", "n")],
      [
        { name: "API_KEY", value: "new" },
        { name: "REGION", value: "eu" },
      ],
    );
    expect(result).toEqual({
      ok: true,
      fields: [field("API_KEY", "new", true), field("Notas", "n"), field("REGION", "eu", true)],
    });
  });

  it("refuses to exceed the custom field limit", () => {
    const existing = Array.from({ length: MAX_CUSTOM_FIELDS - 1 }, (_, i) => field(`F${i}`, "v"));
    const result = mergeEnvFields(existing, [
      { name: "A", value: "1" },
      { name: "B", value: "2" },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(String(MAX_CUSTOM_FIELDS));
  });

  it("refuses names or values over the field limits", () => {
    const longName = mergeEnvFields([], [{ name: "N".repeat(61), value: "x" }]);
    expect(longName.ok).toBe(false);
    const longValue = mergeEnvFields([], [{ name: "V", value: "v".repeat(MAX_FIELD_VALUE + 1) }]);
    expect(longValue.ok).toBe(false);
    if (!longValue.ok) expect(longValue.error).toMatch("V");
  });
});
