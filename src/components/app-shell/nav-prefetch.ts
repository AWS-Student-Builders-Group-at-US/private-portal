// Prefetch policy for the panel navigation links.
//
// With Partial Prefetching (next.config.ts), a default <Link> prefetches the
// route's App Shell, which cannot include anything that depends on the URL
// (searchParams). These sections read searchParams and serve their data from
// per-session private caches, so `prefetch={true}` resolves the whole page
// before the click. The mailbox stays on the default: its data is a live IMAP
// read that should only run when a member opens it.
const FULL_PREFETCH = new Set([
  "/panel/calendario",
  "/panel/tareas",
  "/panel/eventos",
  "/panel/publicaciones",
  "/panel/recursos",
]);

export function navPrefetch(href: string): true | "auto" {
  return FULL_PREFETCH.has(href) ? true : "auto";
}
