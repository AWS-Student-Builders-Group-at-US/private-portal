import type { Metadata } from "next";
import { GoogleSignInButton } from "./google-sign-in-button";

export const metadata: Metadata = { title: "Iniciar sesión · Core Team" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Core Team</h1>
          <p className="text-sm text-muted-foreground">
            AWS Student Builder Group · Universidad de Sevilla
          </p>
        </div>
        <GoogleSignInButton />
      </div>
    </main>
  );
}
