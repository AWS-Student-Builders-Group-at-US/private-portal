"use client";

import { createContext, use, useCallback, useEffect, useRef, useState } from "react";
import { checkVerifier, deriveKey } from "../crypto";
import {
  createVault,
  deleteItem,
  fetchItems,
  fetchMeta,
  rotateVault,
  saveItem,
  type VaultItem,
  type VaultMeta,
  VaultError,
} from "../data";
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
  changePassphrase: (current: string, next: string) => Promise<void>;
};

const VaultContext = createContext<VaultContextValue | null>(null);

export function useVault() {
  const value = use(VaultContext);
  if (!value) throw new Error("useVault must be used inside VaultProvider");
  return value;
}

const WRONG_PASSPHRASE = "La contraseña de la bóveda no es correcta.";

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
    const key = await deriveKey(passphrase, meta.salt, meta.kdf_iterations);
    if (!(await checkVerifier(key, meta.verifier))) throw new VaultError(WRONG_PASSPHRASE);
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
      const key = requireKey();
      await saveItem(key, input);
      setItems(await fetchItems(key));
    },
    remove: async (id) => {
      await deleteItem(id);
      setItems(await fetchItems(requireKey()));
    },
    changePassphrase: async (current, next) => {
      const oldKey = await verify(current);
      const { key, meta } = await rotateVault(oldKey, next);
      metaRef.current = meta;
      await openWith(key);
    },
  };

  return <VaultContext value={value}>{children}</VaultContext>;
}
