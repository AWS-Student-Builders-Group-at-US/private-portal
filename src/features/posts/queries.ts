import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Post } from "./types";

// All reads use the user's session; RLS only returns rows to members.

const SELECT =
  "id, title, slug, body, image_path, targets, status, scheduled_at, event_id, created_by, approved_by, approved_at, published_at, publish_error, created_at, source, platform_urls, show_on_site, event:events(title)";

type Row = Omit<Post, "event_title"> & { event: { title: string } | null };

const toPost = ({ event, ...row }: Row): Post => ({ ...row, event_title: event?.title ?? null });

export async function listPosts(): Promise<Post[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(SELECT)
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error("No se pudieron cargar las publicaciones.");
  return (data as unknown as Row[]).map(toPost);
}

export async function getPost(id: string): Promise<Post | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error("No se pudo cargar la publicación.");
  return data ? toPost(data as unknown as Row) : null;
}
