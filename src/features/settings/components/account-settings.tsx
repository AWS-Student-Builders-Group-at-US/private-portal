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

// Ajustes card for a section that is not available yet.
export function UpcomingSettings({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={id} className="text-lg font-semibold">
          {title}
        </h2>
        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
          Próximamente
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </section>
  );
}
