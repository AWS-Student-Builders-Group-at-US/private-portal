import { VaultApp } from "@/features/vault/components/vault-app";

// Shared team vault. Encryption and decryption happen only in the browser
// (src/features/vault/crypto.ts); the server never sees the vault passphrase.
export default function VaultPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Bóveda</h1>
      <VaultApp />
    </div>
  );
}
