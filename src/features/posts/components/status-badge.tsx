import { cn } from "@/lib/utils";
import { POST_STATUS_LABELS, type PostStatus } from "../schema";

const STYLES: Record<PostStatus, string> = {
  draft: "border-border text-muted-foreground",
  review: "border-[var(--aws-orange)] text-accent-foreground bg-accent",
  approved: "border-emerald-600/40 text-emerald-700 dark:text-emerald-400",
  published: "border-transparent bg-[var(--aws-squid)] text-white dark:bg-white/10",
};

export function PostStatusBadge({ status }: { status: PostStatus }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium", STYLES[status])}>
      {POST_STATUS_LABELS[status]}
    </span>
  );
}
