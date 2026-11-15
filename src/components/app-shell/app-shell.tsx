import type { ReactNode } from "react";
import { BuildBadge } from "@/components/build-badge";
import { BottomNav, SidebarNav } from "./nav-links";

// Member layout: sidebar on desktop (md and up), bottom bar on mobile.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 md:flex">
        <p className="px-3 text-lg font-semibold">Core Team</p>
        <SidebarNav />
        <BuildBadge className="mt-auto px-3" />
      </aside>
      <main className="flex-1 p-4 pb-24 md:p-8">{children}</main>
      <BottomNav />
    </div>
  );
}
