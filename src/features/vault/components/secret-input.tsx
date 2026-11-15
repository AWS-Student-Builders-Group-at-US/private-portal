"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

// Anti-autofill for every vault form.
//
// Browsers and password-manager extensions guess what to fill from an input's
// name/id/type and from the surrounding form. They once filled the vault item
// "password" field with the member's e-mail, so "Copiar contraseña" copied the
// e-mail. To prevent that:
// - input names/ids never contain "user", "pass", "login" or "email";
// - forms and inputs use autoComplete="off"; masked inputs use "new-password"
//   because browsers ignore "off" on type="password" and offer saved logins;
// - the opt-out attributes of 1Password, LastPass and Bitwarden, plus the
//   generic data-form-type hint used by Dashlane and others, are set.
export const NO_AUTOFILL = {
  autoComplete: "off",
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-bwignore": "true",
  "data-form-type": "other",
} as const;

/** Spread on vault <form> elements. */
export const NO_AUTOFILL_FORM = NO_AUTOFILL;

export const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type SecretInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "autoComplete" | "className"
> & { id: string };

/** Masked input with a show/hide toggle and no autofill. */
export function SecretInput(props: SecretInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex gap-2">
      <input
        {...props}
        {...NO_AUTOFILL}
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className={inputClass}
      />
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        className="shrink-0"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar" : "Mostrar"}
        aria-controls={props.id}
        aria-pressed={visible}
      >
        {visible ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
}

/** Labelled SecretInput for passphrase forms (read through FormData by name). */
export function PassphraseField({ id, label }: { id: string; label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <SecretInput id={id} name={id} required />
    </div>
  );
}
