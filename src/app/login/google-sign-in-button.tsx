"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function signIn() {
    setPending(true);
    setError(false);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(true);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        size="lg"
        onClick={signIn}
        disabled={pending}
        className="bg-[var(--aws-orange)] font-semibold text-[var(--aws-ink)] hover:bg-[var(--aws-orange-strong)]"
      >
        {pending ? "Redirigiendo…" : "Entrar con Google"}
      </Button>
      {error && (
        <p className="text-sm text-[#ffb4a8]" role="alert">
          No se pudo iniciar sesión. Inténtalo de nuevo.
        </p>
      )}
    </div>
  );
}
