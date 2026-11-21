import { beforeEach, describe, expect, it, vi } from "vitest";

// getBusyBlocks is server-only and talks to Supabase; these mocks keep the
// test on its scheduling logic (serve cached blocks, refresh after the response).
const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  refreshBusyBlocks: vi.fn(),
  stale: true as boolean,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("./refresh", () => ({ refreshBusyBlocks: mocks.refreshBusyBlocks }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    const rows = {
      data: [
        {
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
      eq: () => query,
      lt: () => query,
      gt: () => query,
      order: async () => rows,
    };
    return {
      rpc: async () => ({ data: mocks.stale, error: null }),
      from: () => query,
    };
  },
}));

import { getBusyBlocks } from "./busy";

const from = new Date("2026-11-23T00:00:00.000Z");
const to = new Date("2026-11-30T00:00:00.000Z");

describe("getBusyBlocks", () => {
  beforeEach(() => {
    mocks.after.mockReset();
    mocks.refreshBusyBlocks.mockReset();
    // A Google fetch that never settles: getBusyBlocks must not wait for it.
    mocks.refreshBusyBlocks.mockReturnValue(new Promise<void>(() => {}));
    mocks.stale = true;
  });

  it("returns the cached blocks without waiting for a stale refresh", async () => {
    const result = await Promise.race([
      getBusyBlocks("Ana@Example.org", from, to),
      new Promise<"blocked">((resolve) => setTimeout(() => resolve("blocked"), 200)),
    ]);

    expect(result).not.toBe("blocked");
    expect(result).toEqual([
      {
        start: new Date("2026-11-23T09:00:00.000Z"),
        end: new Date("2026-11-23T10:00:00.000Z"),
        weight: 1,
        feedId: "feed-1",
      },
    ]);
  });

  it("schedules the refresh of stale feeds after the response", async () => {
    await getBusyBlocks("Ana@Example.org", from, to);

    expect(mocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.refreshBusyBlocks).not.toHaveBeenCalled();
    const task = mocks.after.mock.calls[0][0] as () => unknown;
    void task();
    expect(mocks.refreshBusyBlocks).toHaveBeenCalledWith("ana@example.org");
  });

  it("does not schedule a refresh when the feeds are fresh", async () => {
    mocks.stale = false;

    await getBusyBlocks("ana@example.org", from, to);

    expect(mocks.after).not.toHaveBeenCalled();
    expect(mocks.refreshBusyBlocks).not.toHaveBeenCalled();
  });
});
