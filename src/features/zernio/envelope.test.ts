import { describe, expect, it } from "vitest";
import { parseWebhookEnvelope } from "./envelope";

const parse = (body: unknown, headerId: string | null = null) =>
  parseWebhookEnvelope(JSON.stringify(body), headerId);

describe("parseWebhookEnvelope", () => {
  it("reads the event id, event name and post._id", () => {
    expect(parse({ id: "evt_1", event: "post.published", post: { _id: "65f1a2b3c4d5e6f7a8b9c0d1" } })).toEqual({
      eventId: "evt_1",
      event: "post.published",
      postId: "65f1a2b3c4d5e6f7a8b9c0d1",
    });
  });

  it("accepts post.id, postId and data.post shapes", () => {
    expect(parse({ id: "e", event: "post.failed", post: { id: "p1" } })?.postId).toBe("p1");
    expect(parse({ id: "e", event: "post.scheduled", postId: "p2" })?.postId).toBe("p2");
    expect(parse({ id: "e", event: "post.partial", data: { post: { _id: "p3" } } })?.postId).toBe("p3");
    expect(parse({ id: "e", event: "post.cancelled", data: { postId: "p4" } })?.postId).toBe("p4");
  });

  it("falls back to the event id header", () => {
    expect(parse({ event: "post.published", postId: "p" }, "evt_h")?.eventId).toBe("evt_h");
  });

  it("returns no post id for other events or unsafe ids", () => {
    expect(parse({ id: "e", event: "account.connected", post: { _id: "p" } })?.postId).toBeNull();
    expect(parse({ id: "e", event: "post.published", postId: "../../etc" })?.postId).toBeNull();
    expect(parse({ id: "e", event: "post.published", postId: 42 })?.postId).toBeNull();
  });

  it("rejects invalid JSON or envelopes without id or event", () => {
    expect(parseWebhookEnvelope("not json", "x")).toBeNull();
    expect(parse({ event: "post.published" })).toBeNull();
    expect(parse({ id: "e" })).toBeNull();
    expect(parse(["e"])).toBeNull();
    expect(parse({ id: "x".repeat(300), event: "post.published" })).toBeNull();
  });
});
