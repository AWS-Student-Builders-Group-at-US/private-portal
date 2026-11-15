import {
  KDF_ITERATIONS,
  checkVerifier,
  createVerifier,
  decrypt,
  deriveKey,
  encrypt,
  itemAad,
  randomSalt,
  type Sealed,
} from "./crypto";

// Pure (no Supabase) helpers for the vault passphrase: validation, checking a
// passphrase against the stored verifier, and re-encrypting everything for
// rotate_vault. data.ts does the I/O around them.

export const MIN_PASSPHRASE = 12;

export const ROTATION_ERRORS = {
  short: `La contraseña debe tener al menos ${MIN_PASSPHRASE} caracteres.`,
  mismatch: "Las contraseñas no coinciden.",
  unchanged: "La nueva contraseña debe ser distinta de la actual.",
  wrongCurrent: "La contraseña actual de la bóveda no es correcta.",
  undecryptable:
    "Hay elementos que no se pueden descifrar con la contraseña actual. Revísalos antes de cambiarla.",
} as const;

export type RotationMeta = { salt: string; kdf_iterations: number; verifier: Sealed };

/** A stored item ciphertext (id is also the AAD). */
export type SealedRow = Sealed & { id: string };

/** Returns an error for a new passphrase + confirmation, or null. */
export function newPassphraseError(passphrase: string, confirmation: string): string | null {
  if (passphrase.length < MIN_PASSPHRASE) return ROTATION_ERRORS.short;
  if (passphrase !== confirmation) return ROTATION_ERRORS.mismatch;
  return null;
}

/** Derives the key for `passphrase`; null unless it opens the stored verifier. */
export async function verifyPassphrase(
  passphrase: string,
  meta: RotationMeta,
): Promise<CryptoKey | null> {
  const key = await deriveKey(passphrase, meta.salt, meta.kdf_iterations);
  return (await checkVerifier(key, meta.verifier)) ? key : null;
}

export type Rotation =
  | { ok: true; key: CryptoKey; meta: RotationMeta; items: SealedRow[] }
  | { ok: false; error: string };

/**
 * Re-encrypts the verifier and every row under a key derived from
 * `newPassphrase` and a fresh salt. `oldKey` must already be verified.
 * Fails (instead of dropping data) if any row does not decrypt with `oldKey`.
 */
export async function reencryptVault(
  oldKey: CryptoKey,
  rows: SealedRow[],
  newPassphrase: string,
  iterations: number = KDF_ITERATIONS,
): Promise<Rotation> {
  const meta = { salt: randomSalt(), kdf_iterations: iterations };
  const key = await deriveKey(newPassphrase, meta.salt, meta.kdf_iterations);
  const verifier = await createVerifier(key);

  const items: SealedRow[] = [];
  for (const row of rows) {
    let plaintext: string;
    try {
      plaintext = await decrypt(oldKey, row, itemAad(row.id));
    } catch {
      return { ok: false, error: ROTATION_ERRORS.undecryptable };
    }
    items.push({ id: row.id, ...(await encrypt(key, plaintext, itemAad(row.id))) });
  }
  return { ok: true, key, meta: { ...meta, verifier }, items };
}

/**
 * Full passphrase change, minus the database write: validates the new
 * passphrase, verifies the current one against the stored verifier (before
 * touching any item), then re-encrypts everything.
 */
export async function prepareRotation(input: {
  meta: RotationMeta;
  rows: SealedRow[];
  current: string;
  next: string;
  confirmation: string;
  iterations?: number;
}): Promise<Rotation> {
  const problem = newPassphraseError(input.next, input.confirmation);
  if (problem) return { ok: false, error: problem };
  if (input.next === input.current) return { ok: false, error: ROTATION_ERRORS.unchanged };

  const oldKey = await verifyPassphrase(input.current, input.meta);
  if (!oldKey) return { ok: false, error: ROTATION_ERRORS.wrongCurrent };

  return reencryptVault(oldKey, input.rows, input.next, input.iterations);
}
