import type { Metadata } from "next";
import Link from "next/link";
import { ChipMark } from "@/components/chip-mark";
import { GoogleSignInButton } from "./google-sign-in-button";

export const metadata: Metadata = { title: "Iniciar sesión · Core Team" };

export default function LoginPage() {
  return (
    <main className="theme-light flex flex-1 flex-col items-center justify-center gap-6 bg-grid p-4 text-foreground sm:p-6">
      <div className="on-dark flex w-full max-w-sm animate-rise-in flex-col gap-8 bg-[var(--aws-squid)] p-8 text-white">
        <div className="flex flex-col gap-4">
          <ChipMark className="size-12 bg-[var(--aws-ink)]" />
          <p className="font-mono text-xs tracking-[0.12em] text-white/70 uppercase">
            <span className="text-[var(--aws-orange)]">Acceso</span> / Miembros
          </p>
          <h1 className="text-3xl font-semibold">Core Team</h1>
          <p className="text-sm text-white/75">
            AWS Student Builder Group at Universidad de Sevilla
          </p>
        </div>
        <GoogleSignInButton />
      </div>
      <Link
        href="/"
        className="font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Volver a la web
      </Link>
    </main>
  );
}
