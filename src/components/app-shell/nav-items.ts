import {
  CalendarDays,
  FolderOpen,
  House,
  KeyRound,
  Lightbulb,
  ListTodo,
  Megaphone,
  Newspaper,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Root of the member-only area.
export const PANEL_HOME = "/panel";

// Sections pinned to the mobile bottom bar.
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { href: PANEL_HOME, label: "Inicio", icon: House },
  { href: "/panel/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/panel/tareas", label: "Tareas", icon: ListTodo },
  { href: "/panel/eventos", label: "Eventos", icon: Megaphone },
];

// Sections behind the "Menú" drawer on mobile.
export const MENU_ITEMS: NavItem[] = [
  { href: "/panel/publicaciones", label: "Publicaciones", icon: Newspaper },
  { href: "/panel/recursos", label: "Recursos", icon: FolderOpen },
  { href: "/panel/sugerencias", label: "Sugerencias", icon: Lightbulb },
  { href: "/panel/boveda", label: "Bóveda", icon: KeyRound },
  { href: "/panel/ajustes", label: "Ajustes", icon: Settings },
];

// Primary navigation: every section, shown in the desktop sidebar.
export const NAV_ITEMS: NavItem[] = [...BOTTOM_NAV_ITEMS, ...MENU_ITEMS];

export function isActive(href: string, pathname: string) {
  if (href === PANEL_HOME) return pathname === PANEL_HOME;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// True when the current page belongs to a section inside the mobile menu.
export function isMenuActive(pathname: string) {
  return MENU_ITEMS.some((item) => isActive(item.href, pathname));
}
