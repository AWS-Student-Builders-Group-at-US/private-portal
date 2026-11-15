import { describe, expect, it } from "vitest";
import {
  BOTTOM_NAV_ITEMS,
  MENU_ITEMS,
  NAV_ITEMS,
  PANEL_HOME,
  isActive,
  isMenuActive,
} from "./nav-items";

describe("navigation items", () => {
  it("lists every section in the primary navigation, without 'Más'", () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual([
      "Inicio",
      "Calendario",
      "Tareas",
      "Eventos",
      "Publicaciones",
      "Recursos",
      "Sugerencias",
      "Bóveda",
      "Ajustes",
    ]);
    expect(NAV_ITEMS.some((item) => item.href.startsWith("/panel/mas"))).toBe(false);
  });

  it("splits the mobile bar and the menu drawer without overlap", () => {
    expect(BOTTOM_NAV_ITEMS.map((item) => item.label)).toEqual([
      "Inicio",
      "Calendario",
      "Tareas",
      "Eventos",
    ]);
    expect(MENU_ITEMS.map((item) => item.label)).toEqual([
      "Publicaciones",
      "Recursos",
      "Sugerencias",
      "Bóveda",
      "Ajustes",
    ]);
  });
});

describe("isActive", () => {
  it("matches the home only exactly", () => {
    expect(isActive(PANEL_HOME, "/panel")).toBe(true);
    expect(isActive(PANEL_HOME, "/panel/tareas")).toBe(false);
  });

  it("matches a section and its nested pages", () => {
    expect(isActive("/panel/eventos", "/panel/eventos")).toBe(true);
    expect(isActive("/panel/eventos", "/panel/eventos/formularios")).toBe(true);
    expect(isActive("/panel/ajustes", "/panel/ajustes")).toBe(true);
  });

  it("does not match a different section sharing a prefix", () => {
    expect(isActive("/panel/tareas", "/panel/tareasx")).toBe(false);
    expect(isActive("/panel/eventos", "/panel/tareas")).toBe(false);
  });
});

describe("isMenuActive", () => {
  it("is true only for sections inside the mobile menu", () => {
    expect(isMenuActive("/panel/ajustes")).toBe(true);
    expect(isMenuActive("/panel/recursos/abc-1")).toBe(true);
    expect(isMenuActive("/panel/publicaciones/nueva")).toBe(true);
    expect(isMenuActive("/panel/eventos/formularios")).toBe(false);
    expect(isMenuActive("/panel")).toBe(false);
  });
});
