import { describe, expect, it } from "vitest";
import { createVerifier, decrypt, deriveKey, encrypt, itemAad, randomSalt } from "./crypto";
import {
  ROTATION_ERRORS,
  newPassphraseError,
  prepareRotation,
  verifyPassphrase,
  type RotationMeta,
} from "./rotation";

// Low iteration count keeps tests fast; production uses KDF_ITERATIONS.
const ITERATIONS = 1000;
const CURRENT = "current team passphrase";
const NEXT = "brand new team passphrase";

async function setup() {
  const salt = randomSalt();
  const key = await deriveKey(CURRENT, salt, ITERATIONS);
  const meta: RotationMeta = {
    salt,
    kdf_iterations: ITERATIONS,
    verifier: await createVerifier(key),
  };
  const plaintexts = new Map([
    ["11111111-1111-4111-8111-111111111111", JSON.stringify({ password: "one" })],
    ["22222222-2222-4222-8222-222222222222", JSON.stringify({ password: "two", fields: [] })],
  ]);
  const rows = await Promise.all(
    [...plaintexts].map(async ([id, text]) => ({ id, ...(await encrypt(key, text, itemAad(id))) })),
  );
  return { key, meta, rows, plaintexts };
}

describe("newPassphraseError", () => {
  it("rejects short passphrases and mismatched confirmations", () => {
    expect(newPassphraseError("short", "short")).toMatch(/al menos 12/);
    expect(newPassphraseError(NEXT, `${NEXT}x`)).toMatch(/no coinciden/);
    expect(newPassphraseError(NEXT, NEXT)).toBeNull();
  });
});

describe("verifyPassphrase", () => {
  it("returns a key only for the passphrase that matches the verifier", async () => {
    const { meta } = await setup();
    expect(await verifyPassphrase("wrong passphrase!!", meta)).toBeNull();
    expect(await verifyPassphrase(CURRENT, meta)).not.toBeNull();
  });
});

describe("prepareRotation", () => {
  it("rejects a wrong current passphrase before re-encrypting", async () => {
    const { meta, rows } = await setup();
    const result = await prepareRotation({
      meta,
      rows,
      current: "not the passphrase",
      next: NEXT,
      confirmation: NEXT,
      iterations: ITERATIONS,
    });
    expect(result).toEqual({ ok: false, error: ROTATION_ERRORS.wrongCurrent });
  });

  it("rejects short, mismatched or unchanged new passphrases", async () => {
    const { meta, rows } = await setup();
    const base = { meta, rows, current: CURRENT, iterations: ITERATIONS };
    const short = await prepareRotation({ ...base, next: "short", confirmation: "short" });
    const mismatch = await prepareRotation({ ...base, next: NEXT, confirmation: "other value!!" });
    const same = await prepareRotation({ ...base, next: CURRENT, confirmation: CURRENT });
    expect(short.ok).toBe(false);
    expect(mismatch).toEqual({ ok: false, error: ROTATION_ERRORS.mismatch });
    expect(same).toEqual({ ok: false, error: ROTATION_ERRORS.unchanged });
  });

  it("stops when an item cannot be decrypted with the current key", async () => {
    const { meta, rows } = await setup();
    const other = await deriveKey("someone else entirely", randomSalt(), ITERATIONS);
    const id = "33333333-3333-4333-8333-333333333333";
    const broken = { id, ...(await encrypt(other, "{}", itemAad(id))) };
    const result = await prepareRotation({
      meta,
      rows: [...rows, broken],
      current: CURRENT,
      next: NEXT,
      confirmation: NEXT,
      iterations: ITERATIONS,
    });
    expect(result).toEqual({ ok: false, error: ROTATION_ERRORS.undecryptable });
  });

  it("re-encrypts every item and the verifier under a new salt", async () => {
    const { key: oldKey, meta, rows, plaintexts } = await setup();
    const result = await prepareRotation({
      meta,
      rows,
      current: CURRENT,
      next: NEXT,
      confirmation: NEXT,
      iterations: ITERATIONS,
    });
    if (!result.ok) throw new Error(result.error);

    expect(result.meta.salt).not.toBe(meta.salt);
    expect(result.meta.kdf_iterations).toBe(ITERATIONS);
    expect(await verifyPassphrase(NEXT, result.meta)).not.toBeNull();
    expect(await verifyPassphrase(CURRENT, result.meta)).toBeNull();

    const newKey = await deriveKey(NEXT, result.meta.salt, ITERATIONS);
    expect(result.items.map((item) => item.id).sort()).toEqual([...plaintexts.keys()].sort());
    for (const item of result.items) {
      expect(await decrypt(newKey, item, itemAad(item.id))).toBe(plaintexts.get(item.id));
      await expect(decrypt(oldKey, item, itemAad(item.id))).rejects.toThrow();
    }
  });
});
