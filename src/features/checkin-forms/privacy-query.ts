import { z } from "zod";

// `/privacidad` query: `v=N` (global version number) and/or `f=<form id>`.
// Missing values mean "default form, latest version"; malformed ones are 404s.
export type PrivacyQuery =
  | { ok: true; version: number | null; formId: string | null }
  | { ok: false };

const formIdSchema = z.uuid();

export function parsePrivacyQuery(params: {
  v?: string | string[];
  f?: string | string[];
}): PrivacyQuery {
  const { v, f } = params;
  let version: number | null = null;
  let formId: string | null = null;

  if (v !== undefined) {
    if (typeof v !== "string" || !/^\d{1,9}$/.test(v) || Number(v) < 1) {
      return { ok: false };
    }
    version = Number(v);
  }
  if (f !== undefined) {
    if (typeof f !== "string" || !formIdSchema.safeParse(f.toLowerCase()).success) {
      return { ok: false };
    }
    formId = f.toLowerCase();
  }
  return { ok: true, version, formId };
}
