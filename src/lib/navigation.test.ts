import { describe, expect, it } from "vitest";
import { safePanelPath, withStatus } from "./navigation";

describe("safePanelPath", () => {
  it("keeps same-site panel paths", () => {
    expect(safePanelPath("/panel/eventos/abc-1", "/panel")).toBe("/panel/eventos/abc-1");
    expect(safePanelPath("/panel/tareas?evento=abc", "/panel")).toBe("/panel/tareas?evento=abc");
  });

  it("falls back for anything else", () => {
    expect(safePanelPath(undefined, "/panel/tareas")).toBe("/panel/tareas");
    expect(safePanelPath("https://evil.example", "/panel")).toBe("/panel");
    expect(safePanelPath("//evil.example/panel", "/panel")).toBe("/panel");
    expect(safePanelPath("/login", "/panel")).toBe("/panel");
    expect(safePanelPath("/panel/../login", "/panel")).toBe("/panel");
  });
});

describe("withStatus", () => {
  it("appends ?estado= or &estado=", () => {
    expect(withStatus("/panel/tareas", "creada")).toBe("/panel/tareas?estado=creada");
    expect(withStatus("/panel/tareas?evento=x", "creada")).toBe(
      "/panel/tareas?evento=x&estado=creada",
    );
  });
});
