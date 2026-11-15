import type { ReactNode } from "react";
import { MembersSection } from "@/features/members/components/members-section";
import {
  AccountSettings,
  UpcomingSettings,
} from "@/features/settings/components/account-settings";
import { DriveFolderSettings } from "@/features/settings/components/drive-folder-settings";
import { SettingsSectionNav } from "@/features/settings/components/settings-section-nav";
import { ZernioSettings } from "@/features/settings/components/zernio-settings";
import { VaultPasswordSettings } from "@/features/settings/components/vault-password-settings";
import { getCurrentMember } from "@/lib/auth/member";

const SECTIONS = [
  { id: "cuenta", label: "Cuenta" },
  { id: "miembros", label: "Miembros" },
  { id: "ajustes-boveda", label: "Bóveda" },
  { id: "google-drive", label: "Google Drive" },
  { id: "web-publica", label: "Web pública" },
  { id: "publicaciones", label: "Publicaciones" },
];

// All panel settings in one place, split into anchored sections.
// Request-time data is covered by the Suspense boundary in the panel layout.
export default async function SettingsPage() {
  const me = await getCurrentMember();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Ajustes</h1>
      <div className="flex flex-col gap-6 md:grid md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8">
        <SettingsSectionNav sections={SECTIONS} />
        <div className="flex min-w-0 flex-col gap-8">
          <Anchor id="cuenta">
            <AccountSettings email={me.email} />
          </Anchor>
          <Anchor id="miembros">
            <MembersSection me={me.email} />
          </Anchor>
          <Anchor id="ajustes-boveda">
            <VaultPasswordSettings />
          </Anchor>
          <Anchor id="google-drive">
            <DriveFolderSettings />
          </Anchor>
          <Anchor id="web-publica">
            <UpcomingSettings
              id="web-publica-titulo"
              title="Web pública"
              description="Aquí podrás gestionar el contenido de la web pública de la comunidad."
            />
          </Anchor>
          <Anchor id="publicaciones">
            <ZernioSettings />
          </Anchor>
        </div>
      </div>
    </div>
  );
}

// Scroll target for the section nav.
function Anchor({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div id={id} className="scroll-mt-4 md:scroll-mt-8">
      {children}
    </div>
  );
}
