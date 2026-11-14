// Who receives community emails. Pure logic so it can be unit-tested.
//
// Rule: for each (normalised) email, only the most recent check-in counts.
// It must carry `email_consent = true`; a later check-in without consent
// withdraws it. Unsubscribed emails are always removed.

export type ConsentCheckin = {
  email: string;
  email_consent: boolean;
  checked_in_at: string;
};

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

export function selectRecipients(
  checkins: ConsentCheckin[],
  unsubscribed: Iterable<string>,
): string[] {
  const latest = new Map<string, { at: number; consent: boolean }>();
  for (const row of checkins) {
    const email = normaliseEmail(row.email);
    if (!email) continue;
    const at = new Date(row.checked_in_at).getTime();
    const current = latest.get(email);
    if (!current || at > current.at) {
      latest.set(email, { at, consent: row.email_consent === true });
    }
  }

  const blocked = new Set(Array.from(unsubscribed, normaliseEmail));
  return [...latest]
    .filter(([email, { consent }]) => consent && !blocked.has(email))
    .map(([email]) => email)
    .sort();
}
