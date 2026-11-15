import { describe, expect, it } from "vitest";
import { availableActions, checkTransition } from "./workflow";

const AUTHOR = "autora@example.com";
const OTHER = "otro@example.com";
const post = (status: "draft" | "review" | "approved" | "published") => ({
  status,
  created_by: AUTHOR,
});

describe("checkTransition", () => {
  it("lets anyone send a draft to review and back", () => {
    expect(checkTransition(post("draft"), "review", AUTHOR)).toBeNull();
    expect(checkTransition(post("review"), "draft", OTHER)).toBeNull();
  });

  it("requires a different member to approve", () => {
    expect(checkTransition(post("review"), "approved", OTHER)).toBeNull();
    expect(checkTransition(post("review"), "approved", AUTHOR)).toMatch(/otra persona/);
    expect(checkTransition(post("review"), "approved", "AUTORA@example.com")).toMatch(
      /otra persona/,
    );
  });

  it("only publishes approved posts", () => {
    expect(checkTransition(post("approved"), "published", AUTHOR)).toBeNull();
    expect(checkTransition(post("review"), "published", OTHER)).not.toBeNull();
    expect(checkTransition(post("draft"), "approved", OTHER)).not.toBeNull();
  });

  it("can withdraw an approval back to draft", () => {
    expect(checkTransition(post("approved"), "draft", AUTHOR)).toBeNull();
  });

  it("rejects no-op and unknown moves", () => {
    expect(checkTransition(post("draft"), "draft", AUTHOR)).not.toBeNull();
    expect(checkTransition(post("published"), "draft", AUTHOR)).not.toBeNull();
  });
});

describe("availableActions", () => {
  it("offers approve only to someone else", () => {
    expect(availableActions(post("review"), AUTHOR).map((a) => a.to)).toEqual(["draft"]);
    expect(availableActions(post("review"), OTHER).map((a) => a.to)).toEqual([
      "approved",
      "draft",
    ]);
  });

  it("offers publish on approved posts", () => {
    expect(availableActions(post("approved"), AUTHOR).map((a) => a.to)).toEqual([
      "published",
      "draft",
    ]);
    expect(availableActions(post("published"), AUTHOR)).toEqual([]);
  });
});
