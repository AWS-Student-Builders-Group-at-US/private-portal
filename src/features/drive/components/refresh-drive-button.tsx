"use client";

import { useFormStatus } from "react-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshDrive } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      <RefreshCw className={pending ? "animate-spin" : undefined} />
      {pending ? "Actualizando…" : "Actualizar"}
    </Button>
  );
}

export function RefreshDriveButton() {
  return (
    <form action={refreshDrive}>
      <SubmitButton />
    </form>
  );
}
