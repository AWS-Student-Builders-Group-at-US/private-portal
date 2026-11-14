import { describe, expect, it } from "vitest";
import { selectRecipients } from "./recipients";

const at = (day: number) => `2026-11-${String(day).padStart(2, "0")}T18:00:00Z`;

describe("selectRecipients", () => {
  it("keeps consenting emails, distinct and sorted", () => {
    const result = selectRecipients(
      [
        { email: "b@example.com", email_consent: true, checked_in_at: at(1) },
        { email: "a@example.com", email_consent: true, checked_in_at: at(2) },
        { email: "b@example.com", email_consent: true, checked_in_at: at(3) },
      ],
      [],
    );
    expect(result).toEqual(["a@example.com", "b@example.com"]);
  });

  it("uses the latest check-in per email", () => {
    const rows = [
      { email: "a@example.com", email_consent: true, checked_in_at: at(1) },
      { email: "a@example.com", email_consent: false, checked_in_at: at(5) },
      { email: "c@example.com", email_consent: false, checked_in_at: at(1) },
      { email: "c@example.com", email_consent: true, checked_in_at: at(9) },
    ];
    expect(selectRecipients(rows, [])).toEqual(["c@example.com"]);
    // Input order does not matter.
    expect(selectRecipients([...rows].reverse(), [])).toEqual(["c@example.com"]);
  });

  it("drops emails without consent", () => {
    expect(
      selectRecipients(
        [{ email: "a@example.com", email_consent: false, checked_in_at: at(1) }],
        [],
      ),
    ).toEqual([]);
  });

  it("removes unsubscribed emails", () => {
    expect(
      selectRecipients(
        [
          { email: "a@example.com", email_consent: true, checked_in_at: at(1) },
          { email: "b@example.com", email_consent: true, checked_in_at: at(1) },
        ],
        ["B@Example.com"],
      ),
    ).toEqual(["a@example.com"]);
  });

  it("normalises emails (trim + lowercase) before grouping", () => {
    expect(
      selectRecipients(
        [
          { email: " A@Example.COM ", email_consent: true, checked_in_at: at(1) },
          { email: "a@example.com", email_consent: false, checked_in_at: at(2) },
          { email: "D@example.com", email_consent: true, checked_in_at: at(1) },
          { email: "  ", email_consent: true, checked_in_at: at(1) },
        ],
        [],
      ),
    ).toEqual(["d@example.com"]);
  });
});
