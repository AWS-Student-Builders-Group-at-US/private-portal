import { Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

// Group mark: a dark square with an orange chip. Decorative; pair it with text.
export function ChipMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-10 shrink-0 place-items-center bg-[var(--aws-squid)] text-[var(--aws-orange)] ring-1 ring-white/10",
        className,
      )}
    >
      <Cpu className="size-1/2" strokeWidth={1.75} />
    </span>
  );
}
