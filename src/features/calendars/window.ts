// Google busy blocks are only fetched and stored for this many days before
// and after "now" (see refreshBusyBlocks).
export const GOOGLE_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export function googleWindow(now: Date = new Date()) {
  return {
    from: new Date(now.getTime() - GOOGLE_WINDOW_DAYS * DAY_MS),
    to: new Date(now.getTime() + GOOGLE_WINDOW_DAYS * DAY_MS),
  };
}

// True when any part of [from, to) falls outside the window, so Google data
// may be missing there.
export function isOutsideGoogleWindow(from: Date, to: Date, now: Date = new Date()) {
  const window = googleWindow(now);
  return from < window.from || to > window.to;
}
