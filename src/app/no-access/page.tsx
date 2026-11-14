import type { Metadata } from "next";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = { title: "Sin acceso · Core Team" };

export default function NoAccessPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Sin acceso</h1>
          <p className="text-sm text-muted-foreground">
            Esta cuenta no forma parte del Core Team. Si crees que es un error,
            pide a un miembro del equipo que añada tu correo y vuelve a entrar,
            o cierra sesión para usar otra cuenta.
          </p>
        </div>
        <SignOutButton />
      </div>
    </main>
  );
}
