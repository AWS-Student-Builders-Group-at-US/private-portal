import type { ReactNode } from "react";
import { BuildBadge } from "@/components/build-badge";
import { ChipMark } from "@/components/chip-mark";
import { BottomNav, SidebarNav } from "./nav-links";

// Member layout: sidebar on desktop (md and up), bottom bar on mobile.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1">
      <aside className="on-dark sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <div className="flex items-center gap-3 px-1">
          <ChipMark className="bg-[var(--aws-ink)]" />
          <div className="flex flex-col font-mono leading-tight">
            <span className="text-sm font-semibold text-white">Core Team</span>
            <span className="text-[0.7rem] text-sidebar-foreground/80">AWS SBG · US</span>
          </div>
        </div>
        <SidebarNav />
        <BuildBadge className="mt-auto px-3 font-mono text-[0.7rem] text-sidebar-foreground/70" />
      </aside>
      <main className="min-w-0 flex-1 bg-grid-faint p-4 pb-24 md:p-8">
        <div className="mx-auto max-w-6xl animate-rise-in">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
