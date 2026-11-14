// Client-side encryption for the shared vault. Web Crypto API only.
//
// Zero-knowledge model: the vault passphrase and every plaintext stay in the
// browser. Supabase only stores the salt, iteration count, the verifier and
// per-item ciphertexts, all as base64 strings.
//
//   key        = PBKDF2-HMAC-SHA-256(NFC(passphrase), salt, iterations) -> AES-256-GCM
//   ciphertext = AES-GCM(key, random 12-byte IV, plaintext, AAD)
//
// AAD binds each ciphertext to its row ("vault-item:<id>"), so a ciphertext
// copied into another row fails to decrypt. GCM authenticates the data, so any
// tampering (or a wrong key) makes decrypt() throw.

/** PBKDF2 iterations for new vaults (OWASP 2023 guidance for SHA-256). */
export const KDF_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12; // 96-bit IV, the recommended size for AES-GCM.

/** Known plaintext encrypted with the vault key to check a passphrase. */
const VERIFIER_PLAINTEXT = "core-team-vault-verifier-v1";
const VERIFIER_AAD = "vault-verifier";

/** AAD for an item; the id is generated client-side before the insert. */
export function itemAad(itemId: string): string {
  return `vault-item:${itemId}`;
}

/** An encrypted value as stored in the database (both fields base64). */
export type Sealed = { iv: string; ciphertext: string };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Base64 via btoa/atob, which exist in browsers and in Node >= 16 (no Buffer).
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000; // Avoid call-stack limits of String.fromCharCode(...big).
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** New random salt (base64) for a vault or a passphrase change. */
export function randomSalt(): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
}

/**
 * Derives the vault key. The key is non-extractable: its raw bytes can never
 * be read back from the CryptoKey, only used to encrypt/decrypt.
 */
export async function deriveKey(
  passphrase: string,
  salt: string,
  iterations: number,
): Promise<CryptoKey> {
  // NFC so the same passphrase typed on different systems gives the same bytes.
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase.normalize("NFC")),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: base64ToBytes(salt), iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false, // extractable
    ["encrypt", "decrypt"],
  );
}

/** Encrypts text with a fresh random IV. Never reuse an IV with the same key. */
export async function encrypt(
  key: CryptoKey,
  plaintext: string,
  aad: string,
): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(aad) },
    key,
    encoder.encode(plaintext),
  );
  return { iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ciphertext)) };
}

/** Decrypts and authenticates. Throws on a wrong key, wrong AAD or tampering. */
export async function decrypt(key: CryptoKey, sealed: Sealed, aad: string): Promise<string> {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(sealed.iv), additionalData: encoder.encode(aad) },
    key,
    base64ToBytes(sealed.ciphertext),
  );
  return decoder.decode(plaintext);
}

/** Encrypts the known verifier text; stored in `vault_meta`. */
export function createVerifier(key: CryptoKey): Promise<Sealed> {
  return encrypt(key, VERIFIER_PLAINTEXT, VERIFIER_AAD);
}

/** True only if the key decrypts the verifier to the known text. */
export async function checkVerifier(key: CryptoKey, verifier: Sealed): Promise<boolean> {
  try {
    return (await decrypt(key, verifier, VERIFIER_AAD)) === VERIFIER_PLAINTEXT;
  } catch {
    return false; // Wrong passphrase (or corrupted verifier).
  }
}
