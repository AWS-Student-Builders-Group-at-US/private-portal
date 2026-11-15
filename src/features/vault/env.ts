import { MAX_CUSTOM_FIELDS, MAX_FIELD_NAME, MAX_FIELD_VALUE, type VaultCustomField } from "./schema";

// `.env` import/export for "Secret / API key" vault items. Pure functions:
// values never leave the browser and are never logged.

export type EnvEntry = { name: string; value: string };

/** Shell-style variable name. */
export function isEnvName(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

const ESCAPES: Record<string, string> = { n: "\n", r: "\r", t: "\t", '"': '"', "\\": "\\" };

// Reads a double-quoted value starting after the opening quote. Returns the
// unescaped value, or null when the closing quote is missing.
function readDoubleQuoted(raw: string): string | null {
  let value = "";
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === '"') return value;
    if (char === "\\" && i + 1 < raw.length) {
      const next = raw[++i];
      value += ESCAPES[next] ?? `\\${next}`;
    } else {
      value += char;
    }
  }
  return null;
}

function parseValue(raw: string): string {
  const text = raw.trim();
  if (text.startsWith('"')) {
    const quoted = readDoubleQuoted(text.slice(1));
    if (quoted !== null) return quoted;
  } else if (text.startsWith("'")) {
    const end = text.indexOf("'", 1);
    if (end !== -1) return text.slice(1, end);
  }
  // Unquoted: a '#' preceded by whitespace starts a comment.
  return text.replace(/\s+#.*$/, "").trim();
}

/**
 * Parses `KEY=value` lines. Blank lines and `#` comments are ignored, an
 * `export ` prefix and matching quotes are stripped, and only the first `=`
 * splits. Duplicate keys keep the last value in the first position.
 * `invalid` lists the 1-based numbers of lines that could not be read.
 */
export function parseEnv(text: string): { entries: EnvEntry[]; invalid: number[] } {
  const values = new Map<string, string>();
  const invalid: number[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) return;
    const body = trimmed.replace(/^export\s+/, "");
    const eq = body.indexOf("=");
    const name = eq === -1 ? "" : body.slice(0, eq).trim();
    if (!isEnvName(name)) {
      invalid.push(index + 1);
      return;
    }
    values.set(name, parseValue(body.slice(eq + 1)));
  });
  return { entries: [...values].map(([name, value]) => ({ name, value })), invalid };
}

const PLAIN_VALUE = /^[A-Za-z0-9_./:@+,?&=%-]*$/;

function quote(value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
  return `"${escaped}"`;
}

/**
 * Writes entries as a `.env` file. Values that are not plain are
 * double-quoted and escaped so `parseEnv` reads them back unchanged.
 * Entries whose names are not valid variable names are skipped.
 */
export function serializeEnv(entries: EnvEntry[]): { text: string; skipped: string[] } {
  const skipped: string[] = [];
  const lines: string[] = [];
  for (const { name, value } of entries) {
    if (!isEnvName(name)) {
      skipped.push(name);
      continue;
    }
    lines.push(`${name}=${PLAIN_VALUE.test(value) ? value : quote(value)}`);
  }
  return { text: lines.map((line) => `${line}\n`).join(""), skipped };
}

/**
 * Merges imported variables into a vault item's custom fields: existing
 * names get the new value, new names are appended as secret fields.
 * Fails with a Spanish message when a vault limit would be exceeded.
 */
export function mergeEnvFields(
  existing: VaultCustomField[],
  entries: EnvEntry[],
): { ok: true; fields: VaultCustomField[] } | { ok: false; error: string } {
  for (const { name, value } of entries) {
    if (name.length > MAX_FIELD_NAME) {
      return {
        ok: false,
        error: `El nombre «${name.slice(0, 20)}…» supera los ${MAX_FIELD_NAME} caracteres.`,
      };
    }
    if (value.length > MAX_FIELD_VALUE) {
      return {
        ok: false,
        error: `El valor de ${name} supera los ${MAX_FIELD_VALUE} caracteres.`,
      };
    }
  }
  const fields = existing.map((field) => ({ ...field }));
  for (const { name, value } of entries) {
    const match = fields.find((field) => field.name === name);
    if (match) match.value = value;
    else fields.push({ name, value, secret: true });
  }
  if (fields.length > MAX_CUSTOM_FIELDS) {
    return {
      ok: false,
      error: `Se admiten como máximo ${MAX_CUSTOM_FIELDS} variables por elemento; la importación daría ${fields.length}.`,
    };
  }
  return { ok: true, fields };
}
