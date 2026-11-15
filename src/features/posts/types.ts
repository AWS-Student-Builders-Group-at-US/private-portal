import type { PostStatus, PostTarget } from "./schema";

export type Post = {
  id: string;
  title: string;
  slug: string;
  body: string;
  image_path: string | null;
  targets: PostTarget[];
  status: PostStatus;
  scheduled_at: string | null;
  event_id: string | null;
  event_title: string | null;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  publish_error: string | null;
  created_at: string;
};

export type PostFormState = {
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  values?: Record<string, string | string[]>;
};
