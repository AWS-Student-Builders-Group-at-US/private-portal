import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { getCurrentMember } from "@/lib/auth/member";

// Member area: keep it out of search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Protected area: only Core Team members get past MemberGate.
// The session read is request-time data, so with Cache Components it must
// sit behind a Suspense boundary.
export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  return (
    <Suspense
      fallback={<p className="p-8 text-sm text-muted-foreground">Cargando…</p>}
    >
      <MemberGate>{children}</MemberGate>
    </Suspense>
  );
}

async function MemberGate({ children }: { children: React.ReactNode }) {
  await getCurrentMember();
  return <AppShell>{children}</AppShell>;
}
