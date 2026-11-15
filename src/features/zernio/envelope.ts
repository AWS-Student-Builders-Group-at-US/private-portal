// Parses a Zernio webhook body. The per-event payload shape is not documented
// precisely, so the post id is looked up in the few places it may live; the
// post itself is always fetched again from the API (never trusted from here).

export type WebhookEnvelope = { eventId: string; event: string; postId: string | null };

const EVENT_ID = /^[A-Za-z0-9._:-]{1,200}$/;
const EVENT_NAME = /^[a-z0-9._-]{1,100}$/i;
// Zernio ids are Mongo-style hex strings; accept a slightly wider safe set.
export const ZERNIO_ID = /^[A-Za-z0-9_-]{1,64}$/;

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const asId = (value: unknown) => (typeof value === "string" && ZERNIO_ID.test(value) ? value : null);

function findPostId(body: Json): string | null {
  const scopes = [body, isObject(body.data) ? body.data : {}];
  for (const scope of scopes) {
    const post = isObject(scope.post) ? scope.post : null;
    const candidate = post ? (post._id ?? post.id) : scope.postId;
    if (candidate !== undefined) return asId(candidate);
  }
  return null;
}

export function parseWebhookEnvelope(raw: string, headerEventId: string | null): WebhookEnvelope | null {
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(body)) return null;
  const eventId = typeof body.id === "string" ? body.id : headerEventId;
  const event = body.event;
  if (!eventId || !EVENT_ID.test(eventId) || typeof event !== "string" || !EVENT_NAME.test(event)) {
    return null;
  }
  return { eventId, event, postId: event.startsWith("post.") ? findPostId(body) : null };
}
