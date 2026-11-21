import { BuildBadge } from "@/components/build-badge";
import { SignOutButton } from "@/components/sign-out-button";

// Ajustes card: the signed-in member and sign-out.
export function AccountSettings({ email }: { email: string }) {
  return (
    <section aria-labelledby="cuenta-actual" className="flex flex-col gap-3 rounded-lg border p-4">
      <h2 id="cuenta-actual" className="text-lg font-semibold">
        Cuenta
      </h2>
      <p className="text-sm text-muted-foreground">
        Has iniciado sesión como <span className="font-medium text-foreground">{email}</span>.
      </p>
      <SignOutButton className="w-fit" />
      <div className="flex flex-col gap-1 border-t pt-3">
        <p className="text-sm font-medium">Versión desplegada</p>
        <BuildBadge />
      </div>
    </section>
  );
}
