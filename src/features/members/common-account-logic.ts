// Pure helpers for the group's common account (see common-account.ts).

export function normalizeEmail(value: string | null | undefined): string | null {
  const email = value?.trim().toLowerCase();
  return email ? email : null;
}

// True only when both emails are present and equal after normalisation.
export function isSameEmail(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeEmail(a);
  return left !== null && left === normalizeEmail(b);
}

// Drops the rows that belong to `email` (the common account). No-op when it is null.
export function withoutEmail<T>(
  rows: T[],
  email: string | null,
  emailOf: (row: T) => string | null = (row) => (row as { email: string }).email,
): T[] {
  if (!normalizeEmail(email)) return rows;
  return rows.filter((row) => !isSameEmail(emailOf(row), email));
}

// Mirrors the guard in add_member/update_member/remove_member; the database
// stays the authority. Until the common account is configured anyone manages.
export function canManageMembers({
  commonEmail,
  me,
}: {
  commonEmail: string | null;
  me: string;
}): boolean {
  if (!normalizeEmail(commonEmail)) return true;
  return isSameEmail(commonEmail, me);
}
