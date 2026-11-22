import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "./nav-items";
import { navPrefetch } from "./nav-prefetch";

describe("navPrefetch", () => {
  it("fully prefetches sections whose data is cached per session", () => {
    for (const href of [
      "/panel/calendario",
      "/panel/tareas",
      "/panel/eventos",
      "/panel/publicaciones",
      "/panel/recursos",
    ]) {
      expect(navPrefetch(href)).toBe(true);
    }
  });

  it("keeps the default App Shell prefetch for the mailbox (live IMAP) and other sections", () => {
    expect(navPrefetch("/panel/correo")).toBe("auto");
    expect(navPrefetch("/panel")).toBe("auto");
    expect(navPrefetch("/panel/ajustes")).toBe("auto");
  });

  it("only names sections that exist in the navigation", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);
    for (const href of hrefs.filter((h) => navPrefetch(h) === true)) {
      expect(hrefs).toContain(href);
    }
    expect(hrefs.filter((h) => navPrefetch(h) === true)).toHaveLength(5);
  });
});
