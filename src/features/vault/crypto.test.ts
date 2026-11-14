import { describe, expect, it } from "vitest";
import {
  base64ToBytes,
  bytesToBase64,
  checkVerifier,
  createVerifier,
  decrypt,
  deriveKey,
  encrypt,
  itemAad,
  randomSalt,
} from "./crypto";

// Low iteration count keeps tests fast; production uses KDF_ITERATIONS.
const ITERATIONS = 1000;

describe("vault crypto", () => {
  it("round-trips unicode text", async () => {
    const key = await deriveKey("correct horse battery", randomSalt(), ITERATIONS);
    const text = "contraseña ñ ü 漢字 🔐";
    const sealed = await encrypt(key, text, itemAad("a"));
    expect(await decrypt(key, sealed, itemAad("a"))).toBe(text);
  });

  it("rejects a wrong passphrase through the verifier", async () => {
    const salt = randomSalt();
    const right = await deriveKey("correct horse battery", salt, ITERATIONS);
    const wrong = await deriveKey("wrong horse battery", salt, ITERATIONS);
    const verifier = await createVerifier(right);
    expect(await checkVerifier(right, verifier)).toBe(true);
    expect(await checkVerifier(wrong, verifier)).toBe(false);
  });

  it("fails on tampered ciphertext", async () => {
    const key = await deriveKey("correct horse battery", randomSalt(), ITERATIONS);
    const sealed = await encrypt(key, "secret", itemAad("a"));
    const bytes = base64ToBytes(sealed.ciphertext);
    bytes[0] ^= 0x01;
    await expect(
      decrypt(key, { ...sealed, ciphertext: bytesToBase64(bytes) }, itemAad("a")),
    ).rejects.toThrow();
  });

  it("fails when a ciphertext is moved to another item id", async () => {
    const key = await deriveKey("correct horse battery", randomSalt(), ITERATIONS);
    const sealed = await encrypt(key, "secret", itemAad("item-a"));
    await expect(decrypt(key, sealed, itemAad("item-b"))).rejects.toThrow();
  });

  it("uses a fresh IV for every encryption", async () => {
    const key = await deriveKey("correct horse battery", randomSalt(), ITERATIONS);
    const first = await encrypt(key, "same text", itemAad("a"));
    const second = await encrypt(key, "same text", itemAad("a"));
    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(base64ToBytes(first.iv)).toHaveLength(12);
  });

  it("round-trips arbitrary bytes through base64", () => {
    const bytes = new Uint8Array(70000);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
    expect(base64ToBytes(bytesToBase64(new Uint8Array()))).toEqual(new Uint8Array());
    expect(base64ToBytes(randomSalt())).toHaveLength(16);
  });

  it("derives a non-extractable AES-GCM key", async () => {
    const key = await deriveKey("correct horse battery", randomSalt(), ITERATIONS);
    expect(key.extractable).toBe(false);
    expect(key.algorithm).toMatchObject({ name: "AES-GCM", length: 256 });
    await expect(crypto.subtle.exportKey("raw", key)).rejects.toThrow();
  });
});
