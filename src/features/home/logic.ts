// Pure helpers for the panel home (no Supabase, no DOM).

type Timed = { starts_at: string; ends_at: string | null };

// The earliest event that has not finished yet (an ongoing one counts).
export function pickNextMeeting<T extends Timed>(events: T[], now: Date): T | null {
  const nowMs = now.getTime();
  let next: T | null = null;
  for (const event of events) {
    const end = Date.parse(event.ends_at ?? event.starts_at);
    if (end < nowMs) continue;
    if (!next || Date.parse(event.starts_at) < Date.parse(next.starts_at)) next = event;
  }
  return next;
}

type HomePost = {
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
};

// Upcoming: not yet published and scheduled from now on, soonest first.
// Recent: published, newest first (publish date, else scheduled date, else creation).
export function splitHomePosts<T extends HomePost>(posts: T[], now: Date, limit: number) {
  const nowMs = now.getTime();
  const upcoming = posts
    .filter((p) => p.status !== "published" && p.scheduled_at && Date.parse(p.scheduled_at) >= nowMs)
    .sort((a, b) => Date.parse(a.scheduled_at!) - Date.parse(b.scheduled_at!))
    .slice(0, limit);
  const publishedAt = (p: T) => Date.parse(p.published_at ?? p.scheduled_at ?? p.created_at);
  const recent = posts
    .filter((p) => p.status === "published")
    .sort((a, b) => publishedAt(b) - publishedAt(a))
    .slice(0, limit);
  return { upcoming, recent };
}
