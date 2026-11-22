import { beforeEach, describe, expect, it, vi } from "vitest";

// busy.ts is server-only and talks to Supabase; these mocks keep the test on
// its read (one query, grouped per member) and scheduling logic (refresh
// stale feeds after the response, never during it).
const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  refreshBusyBlocks: vi.fn(),
  listStaleFeedEmails: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("./refresh", () => ({
  refreshBusyBlocks: mocks.refreshBusyBlocks,
  listStaleFeedEmails: mocks.listStaleFeedEmails,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    const rows = {
      data: [
        {
          member_email: "Ana@Example.org",
          starts_at: "2026-11-23T09:00:00.000Z",
          ends_at: "2026-11-23T10:00:00.000Z",
          weight: 1,
          feed_id: "feed-1",
        },
      ],
      error: null,
    };
    const query = {
      select: () => query,
      eq: (...args: unknown[]) => {
        mocks.eq(...args);
        return query;
      },
      lt: () => query,
      gt: () => query,
      order: async () => rows,
    };
    return { from: () => query };
  },
}));

import { listBusyBlocks, refreshStaleFeedsAfterResponse } from "./busy";

const from = new Date("2026-11-23T00:00:00.000Z");
const to = new Date("2026-11-30T00:00:00.000Z");

describe("listBusyBlocks", () => {
  beforeEach(() => {
    mocks.after.mockReset();
    mocks.eq.mockReset();
  });

  it("returns the stored blocks per member without scheduling any work", async () => {
    const result = await listBusyBlocks(from, to);

    expect(result.get("ana@example.org")).toEqual([
      {
        start: new Date("2026-11-23T09:00:00.000Z"),
        end: new Date("2026-11-23T10:00:00.000Z"),
        weight: 1,
        feedId: "feed-1",
      },
    ]);
    expect(mocks.after).not.toHaveBeenCalled();
    expect(mocks.eq).not.toHaveBeenCalled();
  });

  it("filters by the lowercased email when one member is asked for", async () => {
    await listBusyBlocks(from, to, "Ana@Example.org");

    expect(mocks.eq).toHaveBeenCalledWith("member_email", "ana@example.org");
  });
});

describe("refreshStaleFeedsAfterResponse", () => {
  beforeEach(() => {
    mocks.after.mockReset();
    mocks.refreshBusyBlocks.mockReset();
    mocks.listStaleFeedEmails.mockReset();
    mocks.listStaleFeedEmails.mockResolvedValue(["ana@example.org"]);
    // A Google fetch that never settles: scheduling must not wait for it.
    mocks.refreshBusyBlocks.mockReturnValue(new Promise<void>(() => {}));
  });

  it("only schedules the work; the check and refresh run after the response", async () => {
    refreshStaleFeedsAfterResponse(["ana@example.org", "luis@example.org"]);

    expect(mocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.listStaleFeedEmails).not.toHaveBeenCalled();
    expect(mocks.refreshBusyBlocks).not.toHaveBeenCalled();

    const task = mocks.after.mock.calls[0][0] as () => Promise<unknown>;
    void task();
    await vi.waitFor(() =>
      expect(mocks.refreshBusyBlocks).toHaveBeenCalledWith("ana@example.org"),
    );
    expect(mocks.listStaleFeedEmails).toHaveBeenCalledWith([
      "ana@example.org",
      "luis@example.org",
    ]);
    expect(mocks.refreshBusyBlocks).toHaveBeenCalledTimes(1);
  });

  it("schedules nothing without emails", () => {
    refreshStaleFeedsAfterResponse([]);

    expect(mocks.after).not.toHaveBeenCalled();
  });
});
