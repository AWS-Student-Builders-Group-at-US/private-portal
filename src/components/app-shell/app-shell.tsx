import type { ReactNode } from "react";
import { BuildBadge } from "@/components/build-badge";
import { BottomNav, SidebarNav } from "./nav-links";

// Member layout: sidebar on desktop (md and up), bottom bar on mobile.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 md:flex">
        <div className="flex items-center gap-2 px-3">
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-lg bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground"
          >
            SBG
          </span>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-white">Core Team</span>
            <span className="text-[0.7rem] text-sidebar-foreground/70">
              AWS Student Builder Group
            </span>
          </div>
        </div>
        <SidebarNav />
        <BuildBadge className="mt-auto px-3" />
      </aside>
      <main className="min-w-0 flex-1 p-4 pb-24 md:p-8">
        <div className="mx-auto max-w-6xl animate-rise-in">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
