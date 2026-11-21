import type { ReactNode } from "react";
import { BuildBadge } from "@/components/build-badge";
import { ChipMark } from "@/components/chip-mark";
import { BackToSiteLink, BottomNav, SidebarNav } from "./nav-links";

// Member layout: sidebar on desktop (md and up), bottom bar on mobile.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 md:flex">
        <div className="flex items-center gap-3 px-3">
          <ChipMark className="size-8 rounded-lg bg-[var(--aws-ink)]" />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-white">Core Team</span>
            <span className="text-[0.7rem] text-sidebar-foreground/70">AWS SBG · US</span>
          </div>
        </div>
        <SidebarNav />
        <div className="mt-auto flex flex-col gap-3 border-t border-sidebar-border pt-3">
          <BackToSiteLink />
          {/* Muted foreground is too dark on the sidebar; use the sidebar text tone. */}
          <BuildBadge className="px-3 text-sidebar-foreground/70" />
        </div>
      </aside>
      <main className="min-w-0 flex-1 bg-grid-faint p-4 pb-24 md:p-8">
        <div className="mx-auto max-w-6xl animate-rise-in">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
