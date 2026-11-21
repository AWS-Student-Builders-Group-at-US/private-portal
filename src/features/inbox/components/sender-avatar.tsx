import { cn } from "@/lib/utils";
import { AVATAR_TONE_COUNT, avatarTone, senderInitials } from "../logic";

// One soft background + strong text pair per tone (AA in light and dark).
const TONES: string[] = [
  "bg-sky-100 text-sky-900 dark:bg-sky-400/20 dark:text-sky-100",
  "bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-100",
  "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-100",
  "bg-violet-100 text-violet-900 dark:bg-violet-400/20 dark:text-violet-100",
  "bg-rose-100 text-rose-900 dark:bg-rose-400/20 dark:text-rose-100",
  "bg-slate-200 text-slate-900 dark:bg-slate-400/25 dark:text-slate-100",
];

if (TONES.length !== AVATAR_TONE_COUNT) {
  throw new Error("SenderAvatar: TONES must match AVATAR_TONE_COUNT");
}

export function SenderAvatar({
  name,
  address,
  size = "md",
}: {
  name: string | null | undefined;
  address: string | null | undefined;
  size?: "md" | "lg";
}) {
  const seed = address || name || "?";
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-mono font-semibold select-none",
        size === "lg" ? "size-11 text-sm" : "size-9 text-xs",
        TONES[avatarTone(seed)],
      )}
    >
      {senderInitials(name, address)}
    </span>
  );
}

// Visual hint only: based on the From domain, not a sender verification.
export function AwsBadge() {
  return (
    <span
      title="Remitente con dominio de Amazon/AWS"
      className="shrink-0 rounded-[4px] bg-[var(--aws-squid)] px-1 py-px font-mono text-[0.625rem] leading-4 font-semibold tracking-wide text-[var(--aws-orange)] dark:ring-1 dark:ring-white/15"
    >
      AWS
    </span>
  );
}
