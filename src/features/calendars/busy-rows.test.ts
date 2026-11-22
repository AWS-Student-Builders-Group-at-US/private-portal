import { describe, expect, it } from "vitest";
import { groupBusyRows, staleFeedEmails } from "./busy-rows";

const from = new Date("2026-11-23T00:00:00.000Z");
const to = new Date("2026-11-30T00:00:00.000Z");

describe("groupBusyRows", () => {
  it("groups rows per lowercased member email, clipped to [from, to)", () => {
    const grouped = groupBusyRows(
      [
        {
          member_email: "Ana@Example.org",
          starts_at: "2026-11-22T23:00:00.000Z",
          ends_at: "2026-11-23T01:00:00.000Z",
          weight: 1,
          feed_id: "feed-1",
        },
        {
          member_email: "ana@example.org",
          starts_at: "2026-11-29T23:00:00.000Z",
          ends_at: "2026-11-30T02:00:00.000Z",
          weight: "0.5",
          feed_id: "feed-2",
        },
        {
          member_email: "luis@example.org",
          starts_at: "2026-11-24T09:00:00.000Z",
          ends_at: "2026-11-24T10:00:00.000Z",
          weight: 0.7,
          feed_id: "feed-3",
        },
      ],
      from,
      to,
    );

    expect(grouped.get("ana@example.org")).toEqual([
      { start: from, end: new Date("2026-11-23T01:00:00.000Z"), weight: 1, feedId: "feed-1" },
      {
        start: new Date("2026-11-29T23:00:00.000Z"),
        end: to,
        weight: 0.5,
        feedId: "feed-2",
      },
    ]);
    // Any weight other than 0.5 counts as "can't move".
    expect(grouped.get("luis@example.org")?.[0].weight).toBe(1);
  });

  it("returns an empty map for no rows", () => {
    expect(groupBusyRows([], from, to).size).toBe(0);
  });
});

describe("staleFeedEmails", () => {
  const now = new Date("2026-11-23T12:00:00.000Z");
  const maxAgeMs = 15 * 60 * 1000;

  it("returns each member with a never-fetched or old feed once, lowercased", () => {
    expect(
      staleFeedEmails(
        [
          { member_email: "Ana@Example.org", last_fetched_at: null },
          { member_email: "ana@example.org", last_fetched_at: "2026-11-23T11:00:00.000Z" },
          { member_email: "luis@example.org", last_fetched_at: "2026-11-23T11:50:00.000Z" },
          { member_email: "eva@example.org", last_fetched_at: "2026-11-23T11:44:59.000Z" },
        ],
        now,
        maxAgeMs,
      ),
    ).toEqual(["ana@example.org", "eva@example.org"]);
  });

  it("treats an unparsable timestamp as stale", () => {
    expect(
      staleFeedEmails([{ member_email: "ana@example.org", last_fetched_at: "nope" }], now, maxAgeMs),
    ).toEqual(["ana@example.org"]);
  });
});
