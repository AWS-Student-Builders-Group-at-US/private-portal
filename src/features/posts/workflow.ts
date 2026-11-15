import type { PostStatus } from "./schema";

// Draft -> review -> approved (by someone other than the author) -> published.
// Mirrors the `posts_enforce_workflow` trigger in the database.

type WorkflowPost = { status: PostStatus; created_by: string };

const MOVES: Record<PostStatus, PostStatus[]> = {
  draft: ["review"],
  review: ["approved", "draft"],
  approved: ["published", "draft"],
  published: [],
};

// Returns an error message, or null when the move is allowed.
export function checkTransition(post: WorkflowPost, to: PostStatus, actor: string) {
  if (!MOVES[post.status].includes(to)) return "Ese cambio de estado no está permitido.";
  if (to === "approved" && post.created_by.toLowerCase() === actor.toLowerCase()) {
    return "La aprobación tiene que hacerla otra persona, no quien la creó.";
  }
  return null;
}

const ACTION_LABELS: Record<string, string> = {
  "draft>review": "Enviar a revisión",
  "review>approved": "Aprobar",
  "review>draft": "Volver a borrador",
  "approved>published": "Marcar como publicada",
  "approved>draft": "Retirar aprobación",
};

export function availableActions(post: WorkflowPost, actor: string) {
  return MOVES[post.status]
    .filter((to) => checkTransition(post, to, actor) === null)
    .map((to) => ({ to, label: ACTION_LABELS[`${post.status}>${to}`] }));
}
