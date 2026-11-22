"use client";

import { Children, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// A list that shows its first `limit` children and a "Ver N más" toggle for
// the rest. Children are the list items (`<li>`); the toggle sits under the
// list and controls it through `aria-expanded` / `aria-controls`.
export function ShowMore({
  limit,
  children,
  className,
  toggleClassName,
  as: List = "ul",
  noun,
}: {
  limit: number;
  children: React.ReactNode;
  className?: string;
  toggleClassName?: string;
  as?: "ul" | "ol";
  // Optional plural noun for the toggle ("Ver 3 notas más").
  noun?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const items = Children.toArray(children);
  const hidden = items.length - limit;
  const visible = expanded || hidden <= 0 ? items : items.slice(0, limit);

  return (
    <div className="flex flex-col gap-2">
      <List id={id} className={className}>
        {visible}
      </List>
      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((open) => !open)}
          className={cn(
            "inline-flex w-fit items-center gap-1 rounded-md px-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
            toggleClassName,
          )}
        >
          <ChevronDown
            aria-hidden
            className={cn("size-4 transition-transform", expanded && "rotate-180")}
          />
          {expanded ? "Ver menos" : `Ver ${hidden}${noun ? ` ${noun}` : ""} más`}
        </button>
      )}
    </div>
  );
}
