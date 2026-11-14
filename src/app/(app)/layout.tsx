import { Suspense } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { getCurrentMember } from "@/lib/auth/member";

// Protected area: only Core Team members get past MemberGate.
// The session read is request-time data, so with Cache Components it must
// sit behind a Suspense boundary.
export default function AppLayout({ children }: LayoutProps<"/">) {
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
