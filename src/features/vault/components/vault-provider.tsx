"use client";

import { createContext, use, useCallback, useEffect, useRef, useState } from "react";
import {
  createVault,
  deleteItem,
  fetchItems,
  fetchMeta,
  onPassphraseChanged,
  saveItem,
  type VaultItem,
  type VaultMeta,
  VaultError,
} from "../data";
import { verifyPassphrase } from "../rotation";
import type { VaultPayload } from "../schema";

const AUTO_LOCK_MS = 10 * 60 * 1000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

export type VaultStatus = "loading" | "error" | "setup" | "locked" | "unlocked";

type ItemInput = {
  id?: string;
  label: string;
  category: string | null;
  payload: VaultPayload;
};

type VaultContextValue = {
  status: VaultStatus;
  items: VaultItem[];
  create: (passphrase: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<void>;
  lock: () => void;
  save: (input: ItemInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const VaultContext = createContext<VaultContextValue | null>(null);

export function useVault() {
  const value = use(VaultContext);
  if (!value) throw new Error("useVault must be used inside VaultProvider");
  return value;
}

const WRONG_PASSPHRASE = "La contraseña de la bóveda no es correcta.";
const PASSPHRASE_CHANGED =
  "La contraseña de la bóveda ha cambiado. Desbloquéala con la nueva contraseña.";

// Holds the derived key in memory only (a ref, never persisted, never sent to
// the server). Locking drops the key and every decrypted item.
export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<VaultStatus>("loading");
  const [items, setItems] = useState<VaultItem[]>([]);
  const metaRef = useRef<VaultMeta | null>(null);
  const keyRef = useRef<CryptoKey | null>(null);

  useEffect(() => {
    let active = true;
    fetchMeta()
      .then((meta) => {
        if (!active) return;
        metaRef.current = meta;
        setStatus(meta ? "locked" : "setup");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, []);

  const lock = useCallback(() => {
    keyRef.current = null;
    setItems([]);
    setStatus(metaRef.current ? "locked" : "setup");
  }, []);

  // A passphrase change (Ajustes, possibly in another tab) invalidates the key.
  useEffect(
    () =>
      onPassphraseChanged(() => {
        fetchMeta()
          .then((meta) => {
            metaRef.current = meta;
          })
          .catch(() => {})
          .finally(lock);
      }),
    [lock],
  );

  // Auto-lock after AUTO_LOCK_MS without interaction while unlocked.
  useEffect(() => {
    if (status !== "unlocked") return;
    let timer = setTimeout(lock, AUTO_LOCK_MS);
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(lock, AUTO_LOCK_MS);
    };
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, reset, { passive: true });
    }
    return () => {
      clearTimeout(timer);
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, reset);
    };
  }, [status, lock]);

  const openWith = useCallback(async (key: CryptoKey) => {
    const loaded = await fetchItems(key);
    keyRef.current = key;
    setItems(loaded);
    setStatus("unlocked");
  }, []);

  const requireKey = () => {
    if (!keyRef.current) throw new VaultError("La bóveda está bloqueada.");
    return keyRef.current;
  };

  // Derives a key from the passphrase and checks it against the verifier.
  const verify = async (passphrase: string) => {
    // Re-read meta: another member may have changed the passphrase.
    const meta = await fetchMeta();
    if (!meta) throw new VaultError("La bóveda no existe.");
    metaRef.current = meta;
    const key = await verifyPassphrase(passphrase, meta);
    if (!key) throw new VaultError(WRONG_PASSPHRASE);
    return key;
  };

  // Before writing, make sure nobody changed the passphrase since unlocking
  // (e.g. another member in Ajustes); otherwise the item would be encrypted
  // with a stale key. Lock so the user re-unlocks with the new passphrase.
  const requireCurrentKey = async () => {
    const key = requireKey();
    const meta = await fetchMeta();
    if (!meta || meta.salt !== metaRef.current?.salt) {
      metaRef.current = meta;
      lock();
      throw new VaultError(PASSPHRASE_CHANGED);
    }
    return key;
  };

  const value: VaultContextValue = {
    status,
    items,
    lock,
    create: async (passphrase) => {
      const { key, meta } = await createVault(passphrase);
      metaRef.current = meta;
      await openWith(key);
    },
    unlock: async (passphrase) => openWith(await verify(passphrase)),
    save: async (input) => {
      const key = await requireCurrentKey();
      await saveItem(key, input);
      setItems(await fetchItems(key));
    },
    remove: async (id) => {
      await deleteItem(id);
      setItems(await fetchItems(requireKey()));
    },
  };

  return <VaultContext value={value}>{children}</VaultContext>;
}
