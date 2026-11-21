import "server-only";
import type { ZernioPost } from "./mapping";

// Minimal Zernio REST client (https://docs.zernio.com). Server-only: reads
// ZERNIO_API_KEY and never logs it or returns it. Response shapes are only
// partially documented, so every reader is defensive.

const BASE_URL = "https://zernio.com/api/v1";
const TIMEOUT_MS = 8_000;

export class ZernioNotConfiguredError extends Error {
  constructor() {
    super("ZERNIO_API_KEY is not set");
    this.name = "ZernioNotConfiguredError";
  }
}

export class ZernioApiError extends Error {
  constructor(readonly status: number) {
    super(`Zernio API request failed (${status})`);
    this.name = "ZernioApiError";
  }
}

export const isZernioConfigured = () => !!process.env.ZERNIO_API_KEY?.trim();

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

async function request(path: string, query?: Record<string, string | undefined>): Promise<unknown> {
  const key = process.env.ZERNIO_API_KEY?.trim();
  if (!key) throw new ZernioNotConfiguredError();
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(query ?? {})) if (v) url.searchParams.set(k, v);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new ZernioApiError(response.status);
  return response.json();
}

export async function getPost(id: string): Promise<ZernioPost | null> {
  try {
    const data = await request(`/posts/${encodeURIComponent(id)}`);
    const post = isObject(data) && isObject(data.post) ? data.post : data;
    return isObject(post) ? (post as ZernioPost) : null;
  } catch (error) {
    if (error instanceof ZernioApiError && error.status === 404) return null;
    throw error;
  }
}

export type PostPage = { posts: ZernioPost[]; nextCursor: string | null };

export async function listPosts({
  updatedSince,
  limit = 50,
  cursor,
}: {
  updatedSince?: Date;
  limit?: number;
  cursor?: string | null;
}): Promise<PostPage> {
  const data = await request("/posts", {
    updatedSince: updatedSince?.toISOString(),
    limit: String(limit),
    cursor: cursor ?? undefined,
  });
  const list = Array.isArray(data) ? data : isObject(data) && Array.isArray(data.posts) ? data.posts : [];
  const pagination = isObject(data) && isObject(data.pagination) ? data.pagination : {};
  const next = (isObject(data) ? data.nextCursor : undefined) ?? pagination.nextCursor ?? pagination.cursor;
  return {
    posts: list.filter(isObject) as ZernioPost[],
    nextCursor: typeof next === "string" && next ? next : null,
  };
}

export type ZernioAccount = { id: string; platform: string; name: string };

export async function listAccounts(): Promise<ZernioAccount[]> {
  const data = await request("/accounts");
  const list = Array.isArray(data) ? data : isObject(data) && Array.isArray(data.accounts) ? data.accounts : [];
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  return list.filter(isObject).map((a) => ({
    id: text(a._id) || text(a.id),
    platform: text(a.platform),
    name: text(a.displayName) || text(a.username) || text(a.name) || "—",
  }));
}

export type AnalyticsPage = { items: unknown[]; hasMore: boolean };

/**
 * One page of `GET /v1/analytics` for posts created through Zernio
 * (`source=late`), newest first. Items stay raw: `mapPostAnalytics` reads them.
 * Throws `ZernioApiError(402)` when the plan lacks the Analytics add-on.
 */
export async function listPostAnalytics({
  fromDate,
  page = 1,
  limit = 50,
}: {
  fromDate: Date;
  page?: number;
  limit?: number;
}): Promise<AnalyticsPage> {
  const data = await request("/analytics", {
    source: "late",
    fromDate: fromDate.toISOString().slice(0, 10),
    sortBy: "date",
    order: "desc",
    view: "summary",
    page: String(page),
    limit: String(limit),
  });
  const items = isObject(data) && Array.isArray(data.posts) ? data.posts : [];
  const pagination = isObject(data) && isObject(data.pagination) ? data.pagination : {};
  const total = typeof pagination.total === "number" ? pagination.total : null;
  const hasMore = items.length === limit && (total === null || page * limit < total);
  return { items, hasMore };
}
