// Post-action navigation helpers shared by panel features.

// Only same-site `/panel` paths (optional simple query) are accepted as a
// redirect target; anything else (external URLs, `//host`, `..`) falls back.
const PANEL_PATH = /^\/panel(\/[\w-]+)*\/?(\?[\w\-=&%.@]*)?$/;

export function safePanelPath(value: string | null | undefined, fallback: string) {
  return value && PANEL_PATH.test(value) ? value : fallback;
}

// Adds the `?estado=` flag read by StatusBanner after a redirect.
export function withStatus(path: string, status: string) {
  return `${path}${path.includes("?") ? "&" : "?"}estado=${status}`;
}
