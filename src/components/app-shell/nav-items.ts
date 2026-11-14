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

// Primary navigation: sidebar on desktop, bottom bar on mobile.
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/tareas", label: "Tareas", icon: ListTodo },
  { href: "/eventos", label: "Eventos", icon: Megaphone },
  { href: "/mas", label: "Más", icon: Ellipsis },
];

// Secondary sections, listed on /mas.
export const MORE_ITEMS = [
  { href: "/recursos", label: "Recursos" },
  { href: "/sugerencias", label: "Sugerencias" },
  { href: "/boveda", label: "Bóveda" },
  { href: "/perfil", label: "Mi perfil" },
];

const MORE_PATHS = ["/mas", ...MORE_ITEMS.map((item) => item.href)];

export function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  if (href === "/mas") return MORE_PATHS.some((p) => pathname.startsWith(p));
  return pathname.startsWith(href);
}
