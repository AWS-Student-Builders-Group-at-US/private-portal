// Matches a signed-in member to their public Core Team card by first name, so
// the site can show their photo without keeping emails in the public config.

function firstName(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)[0];
}

// Tries each candidate (e.g. the `members` name, then the Google given name)
// in order; the first whose first name equals a team card's first name wins.
export function findTeamMember<T extends { name: string }>(
  candidates: (string | null | undefined)[],
  team: readonly T[],
): T | null {
  for (const candidate of candidates) {
    const wanted = candidate ? firstName(candidate) : "";
    if (!wanted) continue;
    const match = team.find((member) => firstName(member.name) === wanted);
    if (match) return match;
  }
  return null;
}
