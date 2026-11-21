import { describe, expect, it } from "vitest";
import { findTeamMember } from "./team-match";

const TEAM = [
  { name: "Guille", role: "Organizador general", photo: "/team/guille.webp" },
  { name: "Iván", role: "Talleres y charlas", photo: "/team/ivan.webp" },
  { name: "José", role: "Talleres y charlas" },
];

describe("findTeamMember", () => {
  it("matches the first name, ignoring case and accents", () => {
    expect(findTeamMember(["ivan sevillano"], TEAM)?.name).toBe("Iván");
    expect(findTeamMember(["JOSE"], TEAM)?.name).toBe("José");
    expect(findTeamMember(["  Guille  "], TEAM)?.name).toBe("Guille");
  });

  it("tries each candidate name in order and skips blanks", () => {
    expect(findTeamMember([null, "", "Guillermo", "Guille"], TEAM)?.name).toBe("Guille");
    expect(findTeamMember([undefined, "Iván"], TEAM)?.name).toBe("Iván");
  });

  it("does not match on a mere prefix", () => {
    expect(findTeamMember(["Guillermo"], TEAM)).toBeNull();
    expect(findTeamMember(["Josefa"], TEAM)).toBeNull();
  });

  it("returns null when nobody matches", () => {
    expect(findTeamMember(["Lucía"], TEAM)).toBeNull();
    expect(findTeamMember([], TEAM)).toBeNull();
  });
});
