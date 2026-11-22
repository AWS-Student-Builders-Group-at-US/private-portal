"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { ArrowLeft, Menu, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BOTTOM_NAV_ITEMS,
  MENU_ITEMS,
  NAV_ITEMS,
  isActive,
  isMenuActive,
} from "./nav-items";
import { navPrefetch } from "./nav-prefetch";

// The navigation is part of the static shell. On routes with unknown dynamic
// params (e.g. /panel/tareas/[id]) usePathname() suspends while prerendering,
// so each bar renders without an active item until the pathname resolves.
function withPathname(View: (props: { pathname: string }) => React.ReactNode) {
  function Active() {
    return <View pathname={usePathname()} />;
  }
  return function Nav() {
    return (
      <Suspense fallback={<View pathname="" />}>
        <Active />
      </Suspense>
    );
  };
}

export const SidebarNav = withPathname(function SidebarNavView({ pathname }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Navegación principal">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          prefetch={navPrefetch(href)}
          aria-current={isActive(href, pathname) ? "page" : undefined}
          className={cn(
            "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isActive(href, pathname) &&
              "bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-sidebar-primary",
          )}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
});

// Link out of the panel to the public home page (/).
export function BackToSiteLink() {
  return (
    <Link
      href="/"
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      <ArrowLeft className="size-4" />
      Volver a la web
    </Link>
  );
}

const bottomItemClass =
  "flex flex-col items-center gap-1 py-2 text-xs text-muted-foreground transition-colors";
const bottomItemActiveClass =
  "font-medium text-foreground [&_svg]:text-[var(--aws-orange-strong)]";

export const BottomNav = withPathname(function BottomNavView({ pathname }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Navegación principal"
    >
      {BOTTOM_NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          prefetch={navPrefetch(href)}
          aria-current={isActive(href, pathname) ? "page" : undefined}
          className={cn(bottomItemClass, isActive(href, pathname) && bottomItemActiveClass)}
        >
          <Icon className="size-5" />
          {label}
        </Link>
      ))}
      <MenuDrawer pathname={pathname} />
    </nav>
  );
});

// Mobile drawer with the sections that do not fit in the bottom bar.
// Base UI's Dialog provides the dialog role, focus trap, Esc to close and
// focus return to the trigger.
function MenuDrawer({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const menuActive = isMenuActive(pathname);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className={cn(bottomItemClass, menuActive && bottomItemActiveClass)}
      >
        <Menu className="size-5" />
        Menú
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-20 bg-black/40 md:hidden" />
        <Dialog.Popup className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-4 rounded-t-xl border-t bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden">
          <div className="flex items-center justify-between gap-2">
            <Dialog.Title className="text-lg font-semibold">Menú</Dialog.Title>
            <Dialog.Close
              aria-label="Cerrar menú"
              className={buttonVariants({ variant: "ghost", size: "icon" })}
            >
              <X />
            </Dialog.Close>
          </div>
          <nav aria-label="Más secciones">
            <ul className="divide-y rounded-lg border">
              {MENU_ITEMS.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    prefetch={navPrefetch(href)}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(href, pathname) ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 hover:bg-muted",
                      isActive(href, pathname) && "font-medium",
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-muted"
                >
                  <ArrowLeft className="size-4" />
                  Volver a la web
                </Link>
              </li>
            </ul>
          </nav>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
