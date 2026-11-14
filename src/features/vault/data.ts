import { createClient } from "@/lib/supabase/client";
import {
  KDF_ITERATIONS,
  createVerifier,
  decrypt,
  deriveKey,
  encrypt,
  itemAad,
  randomSalt,
  type Sealed,
} from "./crypto";
import { vaultPayloadSchema, type VaultPayload } from "./schema";

// Browser-side vault data access. Everything sent to Supabase is already
// encrypted; RLS (public.is_member()) restricts access to members.

export type VaultMeta = {
  salt: string;
  kdf_iterations: number;
  verifier: Sealed;
};

type ItemRow = {
  id: string;
  label: string;
  category: string | null;
  iv: string;
  ciphertext: string;
  updated_at: string;
};

export type VaultItem = {
  id: string;
  label: string;
  category: string | null;
  updatedAt: string;
  // null when the row cannot be decrypted with the current key.
  payload: VaultPayload | null;
};

/** Error whose message is safe to show to the user (Spanish UI copy). */
export class VaultError extends Error {}

/** User-facing message for any error thrown by vault operations. */
export function errorMessage(error: unknown): string {
  return error instanceof VaultError ? error.message : GENERIC_ERROR;
}

const GENERIC_ERROR = "No se pudo completar la operación. Inténtalo de nuevo.";

export async function fetchMeta(): Promise<VaultMeta | null> {
  const { data, error } = await createClient()
    .from("vault_meta")
    .select("salt, kdf_iterations, verifier_iv, verifier_ciphertext")
    .maybeSingle();
  if (error) throw new VaultError("No se pudo cargar la bóveda.");
  if (!data) return null;
  return {
    salt: data.salt,
    kdf_iterations: data.kdf_iterations,
    verifier: { iv: data.verifier_iv, ciphertext: data.verifier_ciphertext },
  };
}

async function decryptRow(key: CryptoKey, row: ItemRow): Promise<VaultItem> {
  let payload: VaultPayload | null = null;
  try {
    const json = await decrypt(key, row, itemAad(row.id));
    payload = vaultPayloadSchema.parse(JSON.parse(json));
  } catch {
    payload = null; // Shown as "No se puede descifrar".
  }
  return {
    id: row.id,
    label: row.label,
    category: row.category,
    updatedAt: row.updated_at,
    payload,
  };
}

export async function fetchItems(key: CryptoKey): Promise<VaultItem[]> {
  const { data, error } = await createClient()
    .from("vault_items")
    .select("id, label, category, iv, ciphertext, updated_at")
    .order("label");
  if (error) throw new VaultError("No se pudieron cargar los elementos.");
  return Promise.all((data as ItemRow[]).map((row) => decryptRow(key, row)));
}

/** Creates the vault. Returns the derived key and the stored metadata. */
export async function createVault(passphrase: string) {
  const meta = { salt: randomSalt(), kdf_iterations: KDF_ITERATIONS };
  const key = await deriveKey(passphrase, meta.salt, meta.kdf_iterations);
  const verifier = await createVerifier(key);
  const { error } = await createClient().from("vault_meta").insert({
    ...meta,
    verifier_iv: verifier.iv,
    verifier_ciphertext: verifier.ciphertext,
  });
  // 23505: another member created the vault first.
  if (error) {
    throw new VaultError(
      error.code === "23505"
        ? "Otro miembro ya ha creado la bóveda. Recarga la página."
        : GENERIC_ERROR,
    );
  }
  return { key, meta: { ...meta, verifier } satisfies VaultMeta };
}

/** Inserts (no id) or updates (id) an item. */
export async function saveItem(
  key: CryptoKey,
  input: { id?: string; label: string; category: string | null; payload: VaultPayload },
): Promise<void> {
  const id = input.id ?? crypto.randomUUID();
  const sealed = await encrypt(key, JSON.stringify(input.payload), itemAad(id));
  const row = { label: input.label, category: input.category, ...sealed };
  const supabase = createClient();
  const { error } = input.id
    ? await supabase.from("vault_items").update(row).eq("id", id)
    : await supabase.from("vault_items").insert({ id, ...row });
  if (error) throw new VaultError(GENERIC_ERROR);
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await createClient().from("vault_items").delete().eq("id", id);
  if (error) throw new VaultError(GENERIC_ERROR);
}

/**
 * Re-encrypts the verifier and every item under a key derived from the new
 * passphrase and a new salt, then swaps everything atomically via rotate_vault.
 * `oldKey` must already be verified against the current passphrase.
 */
export async function rotateVault(oldKey: CryptoKey, newPassphrase: string) {
  const { data, error } = await createClient()
    .from("vault_items")
    .select("id, iv, ciphertext");
  if (error) throw new VaultError(GENERIC_ERROR);

  const meta = { salt: randomSalt(), kdf_iterations: KDF_ITERATIONS };
  const newKey = await deriveKey(newPassphrase, meta.salt, meta.kdf_iterations);
  const verifier = await createVerifier(newKey);

  const items = [];
  for (const row of data as Pick<ItemRow, "id" | "iv" | "ciphertext">[]) {
    let plaintext: string;
    try {
      plaintext = await decrypt(oldKey, row, itemAad(row.id));
    } catch {
      // Re-encrypting would lose this row; stop instead.
      throw new VaultError(
        "Hay elementos que no se pueden descifrar con la contraseña actual. Revísalos antes de cambiarla.",
      );
    }
    items.push({ id: row.id, ...(await encrypt(newKey, plaintext, itemAad(row.id))) });
  }

  const { error: rpcError } = await createClient().rpc("rotate_vault", {
    p_salt: meta.salt,
    p_iterations: meta.kdf_iterations,
    p_verifier_iv: verifier.iv,
    p_verifier_ciphertext: verifier.ciphertext,
    p_items: items,
  });
  if (rpcError) {
    throw new VaultError(
      rpcError.code === "40001"
        ? "Los elementos cambiaron mientras tanto. Vuelve a intentarlo."
        : GENERIC_ERROR,
    );
  }
  return { key: newKey, meta: { ...meta, verifier } satisfies VaultMeta };
}
