import { MembersSection } from "@/features/members/components/members-section";
import { DriveFolderSettings } from "@/features/settings/components/drive-folder-settings";
import { SettingsLinkCard } from "@/features/settings/components/settings-link-card";
import { VaultPasswordSettings } from "@/features/settings/components/vault-password-settings";
import { getCurrentMember } from "@/lib/auth/member";

// All panel settings in one place. Request-time data is covered by the
// Suspense boundary in the panel layout.
export default async function SettingsPage() {
  const me = await getCurrentMember();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Ajustes</h1>
      <MembersSection me={me.email} />
      <SettingsLinkCard
        id="calendarios"
        title="Calendarios de Google"
        description="Conecta tus calendarios de Google para que el equipo vea cuándo estás ocupado."
        href="/panel/calendario#calendarios"
        linkLabel="Gestionar mis calendarios"
      />
      <SettingsLinkCard
        id="formulario-qr"
        title="Formulario del QR"
        description="Edita las preguntas y el aviso de privacidad del formulario que rellenan los asistentes al escanear el QR."
        href="/panel/mas/formulario-qr"
        linkLabel="Editar el formulario"
      />
      <VaultPasswordSettings />
      <DriveFolderSettings />
    </div>
  );
}
