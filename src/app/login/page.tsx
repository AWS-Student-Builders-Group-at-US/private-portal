import type { Metadata } from "next";
import Link from "next/link";
import { ChipMark } from "@/components/chip-mark";
import { GoogleSignInButton } from "./google-sign-in-button";

export const metadata: Metadata = { title: "Iniciar sesión · Core Team" };

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden bg-[var(--aws-squid)] p-6 text-white">
      {/* Soft orange glow; decorative only. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_153_0/0.28),transparent)]"
      />
      <div className="relative flex w-full max-w-sm animate-rise-in flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
        <div className="flex flex-col items-center gap-3">
          <ChipMark className="size-12 rounded-xl bg-[var(--aws-ink)]" />
          <h1 className="text-2xl font-semibold">Core Team</h1>
          <p className="text-sm text-white/70">
            AWS Student Builder Group · Universidad de Sevilla
          </p>
        </div>
        <GoogleSignInButton />
      </div>
      <Link
        href="/"
        className="relative text-sm text-white/70 underline-offset-4 hover:text-white hover:underline"
      >
        ← Volver a la web
      </Link>
    </main>
  );
}
