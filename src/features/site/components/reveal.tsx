"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Fades and lifts its content in the first time it scrolls into view.
// Content is visible without JavaScript and with reduced motion.
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return; // already on screen
    setState("hidden");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("shown");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      style={{ transitionDelay: state === "shown" ? `${delay}ms` : undefined }}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
        state === "hidden" && "translate-y-6 opacity-0",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
