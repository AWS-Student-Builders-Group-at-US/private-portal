import {
  CalendarDays,
  Ellipsis,
  House,
  ListTodo,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Root of the member-only area.
export const PANEL_HOME = "/panel";

// Primary navigation: sidebar on desktop, bottom bar on mobile.
export const NAV_ITEMS: NavItem[] = [
  { href: PANEL_HOME, label: "Inicio", icon: House },
  { href: "/panel/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/panel/tareas", label: "Tareas", icon: ListTodo },
  { href: "/panel/eventos", label: "Eventos", icon: Megaphone },
  { href: "/panel/mas", label: "Más", icon: Ellipsis },
];

// Secondary sections, listed on /panel/mas.
export const MORE_ITEMS = [
  { href: "/panel/recursos", label: "Recursos" },
  { href: "/panel/sugerencias", label: "Sugerencias" },
  { href: "/panel/boveda", label: "Bóveda" },
  { href: "/panel/mas/formulario-qr", label: "Formulario QR" },
  { href: "/panel/ajustes", label: "Ajustes" },
];

const MORE_PATHS = ["/panel/mas", ...MORE_ITEMS.map((item) => item.href)];

export function isActive(href: string, pathname: string) {
  if (href === PANEL_HOME) return pathname === PANEL_HOME;
  if (href === "/panel/mas") {
    return MORE_PATHS.some((p) => pathname.startsWith(p));
  }
  return pathname.startsWith(href);
}
