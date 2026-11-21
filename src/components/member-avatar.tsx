import Image from "next/image";
import { cn } from "@/lib/utils";
import { initials } from "@/features/site/format";

// Square avatar: the member's public team photo, or their initials.
// Decorative: the surrounding link or label names the person.
export function MemberAvatar({
  name,
  photo,
  className,
}: {
  name: string;
  photo?: string | null;
  className?: string;
}) {
  if (photo) {
    return (
      <Image
        src={photo}
        alt=""
        width={72}
        height={72}
        className={cn("size-9 shrink-0 object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center bg-[var(--aws-squid)] font-mono text-xs font-semibold text-white",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
