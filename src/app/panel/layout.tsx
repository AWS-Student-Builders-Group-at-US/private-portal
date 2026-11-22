import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { getCurrentMember } from "@/lib/auth/member";

// Member area: keep it out of search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Protected area: only Core Team members get past MemberGate.
// The navigation shell holds no member data, so it stays outside the
// boundary and is part of the static shell (instant on every visit); only
// the page content waits for the session read, which with Cache Components
// must sit behind a Suspense boundary. Signed-out visitors never get here
// (src/lib/supabase/proxy.ts redirects them to /login).
export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  return (
    <AppShell>
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}
      >
        <MemberGate>{children}</MemberGate>
      </Suspense>
    </AppShell>
  );
}

async function MemberGate({ children }: { children: React.ReactNode }) {
  await getCurrentMember();
  return children;
}
